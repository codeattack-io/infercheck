/**
 * src/lib/sync/adapters/openrouter.ts
 *
 * Fetches the OpenRouter model catalog and maps known provider prefixes
 * to their canonical provider slugs.
 */

import type { ModelRow } from "../types";
import { normaliseModality, deriveCanonicalModelId } from "../utils";

// OpenRouter provider prefix → our provider slug
export const OPENROUTER_PREFIX_TO_SLUG: Record<string, string> = {
  anthropic: "anthropic",
  openai: "openai",
  google: "vertex",
  "meta-llama": "together-ai",
  mistralai: "mistral",
  cohere: "cohere",
  deepseek: "deepseek",
  "x-ai": "xai",
  perplexity: "perplexity",
  // amazon: removed — Bedrock adapter owns all amazon-bedrock rows via ListFoundationModels
  nvidia: "nvidia",
  moonshotai: "moonshot-ai",
  minimax: "minimax-minimax-io",
  inception: "inception",
  upstage: "upstage",
  "z-ai": "z-ai",
  xiaomi: "xiaomi",
  stepfun: "stepfun",
  morph: "morph",
  qwen: "alibaba",
  alibaba: "alibaba",
  microsoft: "github-models",
  // bytedance / bytedance-seed: Volcengine Ark API is China-only — not accessible to EU users
  // bytedance: "bytedance",  // no international endpoint
  // "bytedance-seed": "bytedance",
};

export async function fetchOpenRouterModels(): Promise<ModelRow[]> {
  console.log("Fetching OpenRouter model catalog…");

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      "HTTP-Referer": "https://infercheck.eu",
      "X-Title": "InferCheck",
    },
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name: string;
      context_length: number | null;
      architecture?: { modality?: string };
      pricing?: { prompt?: string; completion?: string };
    }>;
  };

  const rows: ModelRow[] = [];
  const now = new Date();

  for (const m of data.data) {
    const [prefix] = m.id.split("/");
    const providerSlug = OPENROUTER_PREFIX_TO_SLUG[prefix];
    if (!providerSlug) continue;

    const inputRaw = m.pricing?.prompt ? parseFloat(m.pricing.prompt) : null;
    const outputRaw = m.pricing?.completion ? parseFloat(m.pricing.completion) : null;

    rows.push({
      id: m.id,
      providerSlug,
      canonicalModelId: deriveCanonicalModelId(m.id),
      displayName: m.name,
      modality: normaliseModality(m.architecture?.modality),
      contextWindow: m.context_length ?? null,
      inputPricePerMTokens: inputRaw != null ? (inputRaw * 1_000_000).toFixed(6) : null,
      outputPricePerMTokens: outputRaw != null ? (outputRaw * 1_000_000).toFixed(6) : null,
      tokensPerSecond: null,
      syncSource: "openrouter",
      isActive: true,
      isNativeModel: true,
      lastSyncedAt: now,
    });
  }

  console.log(`  OpenRouter: ${rows.length} rows mapped to known providers`);
  return rows;
}
