/**
 * src/lib/sync/adapters/openrouter.ts
 *
 * Fetches the OpenRouter model catalog, then each model's endpoints, and
 * emits one row per model and serving host that maps to one of our providers.
 * Prices come from the selected endpoint, not from the catalog list price.
 */

import PQueue from "p-queue";
import type { ModelRow } from "../types";
import { normaliseModality, deriveCanonicalModelId, toPricePerMTokens } from "../utils";

interface OpenRouterHost {
  slug: string;
  /** OpenRouter author prefixes whose models this host serves as their own */
  authors?: string[];
  /** Provider slug per author prefix where we list the host's offer for that author separately */
  slugByAuthor?: Record<string, string>;
  /** Only these author prefixes, where the host's other OpenRouter offers are not on its own price list */
  servesAuthors?: string[];
}

/**
 * OpenRouter endpoint tag prefix → provider, limited to hosts whose OpenRouter
 * prices match their own price list.
 */
export const OPENROUTER_HOSTS: Record<string, OpenRouterHost> = {
  anthropic: { slug: "anthropic", authors: ["anthropic"] },
  openai: { slug: "openai", authors: ["openai"] },
  "google-ai-studio": { slug: "google", authors: ["google"] },
  "google-vertex": { slug: "vertex", authors: ["google"], slugByAuthor: { anthropic: "vertex-anthropic" } },
  azure: { slug: "azure", servesAuthors: ["openai"] },
  baseten: { slug: "baseten" },
  cerebras: { slug: "cerebras" },
  chutes: { slug: "chutes" },
  cloudflare: { slug: "cloudflare-workers-ai" },
  cohere: { slug: "cohere", authors: ["cohere"], servesAuthors: ["cohere"] },
  deepinfra: { slug: "deep-infra" },
  deepseek: { slug: "deepseek", authors: ["deepseek"] },
  fireworks: { slug: "fireworks-ai" },
  friendli: { slug: "friendli" },
  groq: { slug: "groq" },
  inception: { slug: "inception", authors: ["inception"] },
  minimax: { slug: "minimax-minimax-io", authors: ["minimax"] },
  moonshotai: { slug: "moonshot-ai", authors: ["moonshotai"] },
  morph: { slug: "morph", authors: ["morph"], servesAuthors: ["morph"] },
  nebius: { slug: "nebius-token-factory" },
  novita: { slug: "novitaai" },
  nvidia: { slug: "nvidia", authors: ["nvidia"] },
  perplexity: { slug: "perplexity", authors: ["perplexity"] },
  siliconflow: { slug: "siliconflow" },
  stepfun: { slug: "stepfun", authors: ["stepfun"] },
  together: { slug: "together-ai" },
  upstage: { slug: "upstage", authors: ["upstage"] },
  xai: { slug: "xai", authors: ["x-ai"] },
  xiaomi: { slug: "xiaomi", authors: ["xiaomi"] },
  "z-ai": { slug: "z-ai", authors: ["z-ai"] },
};

const QUANTISATIONS = new Set(["fp4", "fp8", "fp16", "fp32", "bf16", "int4", "int8", "mxfp4", "nvfp4"]);
const NON_STANDARD_TIERS = new Set([
  "fast",
  "flex",
  "highspeed",
  "prime",
  "priority",
  "spot",
  "turbo",
  "ultrafast",
  "zdr",
]);
const EU_REGIONS =
  /^(eu|europe|eu-(west|central|north|south)-\d|swedencentral|westeurope|northeurope|francecentral|germanywestcentral|italynorth|polandcentral|spaincentral)$/;

const CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;
/** Share of per-model endpoint requests that may fail before the adapter fails */
const MAX_FAILED_SHARE = 0.05;

const HEADERS = { "HTTP-Referer": "https://infercheck.eu", "X-Title": "InferCheck" };

interface CatalogModel {
  id: string;
  name: string;
  context_length: number | null;
  architecture?: { modality?: string };
}

interface Endpoint {
  tag: string;
  quantization?: string | null;
  service_tier?: string | null;
  context_length?: number | null;
  pricing?: { prompt?: string; completion?: string };
}

/** OpenRouter lists zero for endpoints it prices per request, image or audio. */
function perTokenPrice(raw: string | undefined): string | null {
  const perToken = raw ? parseFloat(raw) : NaN;
  return perToken > 0 ? toPricePerMTokens(perToken * 1_000_000) : null;
}

/** 0 for an EU endpoint, 1 for a global or unscoped one, null for other regions and non-standard tiers. */
function regionRank(endpoint: Endpoint): number | null {
  if (endpoint.service_tier) return null;
  let rank = 1;
  for (const segment of endpoint.tag.split("/").slice(1)) {
    if (QUANTISATIONS.has(segment) || segment === "default" || segment === "global") continue;
    if (NON_STANDARD_TIERS.has(segment) || !EU_REGIONS.test(segment)) return null;
    rank = 0;
  }
  return rank;
}

async function fetchJson<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS }).catch((error: unknown) => error);
    if (res instanceof Response && res.ok) return (await res.json()) as T;

    const retryable = !(res instanceof Response) || res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw res instanceof Response ? new Error(`${url}: ${res.status} ${res.statusText}`) : res;
    }
    const retryAfterSeconds = res instanceof Response ? Number(res.headers.get("retry-after")) : 0;
    const delayMs = retryAfterSeconds > 0 ? Math.min(retryAfterSeconds * 1000, 10_000) : 500 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export async function fetchOpenRouterModels(): Promise<ModelRow[]> {
  console.log("Fetching OpenRouter model catalog…");

  const catalog = await fetchJson<{ data: CatalogModel[] }>("https://openrouter.ai/api/v1/models");
  const models = catalog.data.filter((m) => !m.id.includes(":") && !m.id.startsWith("~"));

  const endpointsByModel = new Map<string, Endpoint[]>();
  const failed: Array<{ id: string; error: unknown }> = [];
  const queue = new PQueue({ concurrency: CONCURRENCY });
  for (const m of models) {
    queue.add(async () => {
      try {
        const res = await fetchJson<{ data: { endpoints: Endpoint[] } }>(
          `https://openrouter.ai/api/v1/models/${m.id}/endpoints`
        );
        endpointsByModel.set(m.id, res.data.endpoints);
      } catch (error) {
        failed.push({ id: m.id, error });
      }
    });
  }
  await queue.onIdle();

  if (failed.length > 0) {
    const summary = `OpenRouter endpoints failed for ${failed.length} of ${models.length} models: ${failed.map((f) => f.id).join(", ")}`;
    if (failed.length > models.length * MAX_FAILED_SHARE) throw new Error(summary, { cause: failed[0].error });
    console.warn(`  ${summary}`);
  }

  const quantisationUsage = new Map<string, number>();
  for (const endpoints of endpointsByModel.values()) {
    for (const e of endpoints) {
      const key = `${e.tag.split("/")[0]}|${e.quantization ?? ""}`;
      quantisationUsage.set(key, (quantisationUsage.get(key) ?? 0) + 1);
    }
  }

  const rows: ModelRow[] = [];
  const now = new Date();

  for (const m of models) {
    const author = m.id.split("/")[0];
    const candidatesByHost = new Map<string, Array<{ endpoint: Endpoint; rank: number }>>();

    for (const endpoint of endpointsByModel.get(m.id) ?? []) {
      const hostKey = endpoint.tag.split("/")[0];
      const rank = regionRank(endpoint);
      if (!Object.hasOwn(OPENROUTER_HOSTS, hostKey) || rank === null) continue;
      const candidates = candidatesByHost.get(hostKey) ?? [];
      candidates.push({ endpoint, rank });
      candidatesByHost.set(hostKey, candidates);
    }

    for (const [hostKey, candidates] of candidatesByHost) {
      const host = OPENROUTER_HOSTS[hostKey];
      if (host.servesAuthors && !host.servesAuthors.includes(author)) continue;
      const usage = (e: Endpoint) => quantisationUsage.get(`${hostKey}|${e.quantization ?? ""}`) ?? 0;
      const inputPrice = (e: Endpoint) => parseFloat(e.pricing?.prompt ?? "") || Infinity;
      const [{ endpoint }] = candidates.sort(
        (a, b) =>
          a.rank - b.rank ||
          usage(b.endpoint) - usage(a.endpoint) ||
          inputPrice(a.endpoint) - inputPrice(b.endpoint) ||
          a.endpoint.tag.localeCompare(b.endpoint.tag)
      );

      rows.push({
        id: m.id,
        providerSlug: host.slugByAuthor?.[author] ?? host.slug,
        canonicalModelId: deriveCanonicalModelId(m.id),
        displayName: m.name,
        modality: normaliseModality(m.architecture?.modality),
        contextWindow: endpoint.context_length ?? m.context_length ?? null,
        inputPricePerMTokens: perTokenPrice(endpoint.pricing?.prompt),
        outputPricePerMTokens: perTokenPrice(endpoint.pricing?.completion),
        priceCurrency: "USD",
        tokensPerSecond: null,
        syncSource: "openrouter",
        isActive: true,
        isNativeModel: host.authors?.includes(author) ?? false,
        lastSyncedAt: now,
      });
    }
  }

  console.log(`  OpenRouter: ${rows.length} rows from the endpoints of ${endpointsByModel.size} models`);
  return rows;
}
