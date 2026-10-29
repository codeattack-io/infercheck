/**
 * src/lib/sync/adapters/openrouter.ts
 *
 * Fetches the OpenRouter model catalog and attributes models to the author's
 * own first-party API. The OpenRouter prefix names the model author, and the
 * list price may come from any host serving that model.
 */

import type { ModelRow } from "../types";
import { normaliseModality, deriveCanonicalModelId, toPricePerMTokens } from "../utils";

/**
 * OpenRouter author prefix → provider slug, limited to authors whose own API
 * serves their OpenRouter-listed models at the OpenRouter list price.
 */
export const OPENROUTER_PREFIX_TO_SLUG: Record<string, string> = {
  anthropic: "anthropic",
  openai: "openai",
  google: "google",
  mistralai: "mistral",
  cohere: "cohere",
  "x-ai": "xai",
  perplexity: "perplexity",
  minimax: "minimax-minimax-io",
  inception: "inception",
  upstage: "upstage",
  morph: "morph",
};

/**
 * Models under a mapped prefix whose list price is not the author's: open
 * weights priced by third-party hosts, and OpenRouter variants such as
 * `:free` and `:batch`.
 */
const NOT_AUTHOR_PRICED_MODELS = [
  /:/,
  /^openai\/gpt-oss-/,
  /^google\/gemma-/,
  /^mistralai\/mistral-nemo$/,
  /^mistralai\/mistral-small-.*24b-instruct/,
  /^minimax\/minimax-m1$/,
];

/** OpenRouter lists zero for models it prices per request, image or audio. */
function perTokenPrice(raw: string | undefined): string | null {
  const perToken = raw ? parseFloat(raw) : NaN;
  return perToken > 0 ? toPricePerMTokens(perToken * 1_000_000) : null;
}

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
    if (NOT_AUTHOR_PRICED_MODELS.some((pattern) => pattern.test(m.id))) continue;

    rows.push({
      id: m.id,
      providerSlug,
      canonicalModelId: deriveCanonicalModelId(m.id),
      displayName: m.name,
      modality: normaliseModality(m.architecture?.modality),
      contextWindow: m.context_length ?? null,
      inputPricePerMTokens: perTokenPrice(m.pricing?.prompt),
      outputPricePerMTokens: perTokenPrice(m.pricing?.completion),
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
