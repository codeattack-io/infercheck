/**
 * src/lib/sync/adapters/stackit.ts
 *
 * Fetches STACKIT AI Model Serving catalog.
 * EU-native provider (Germany).
 *
 * When STACKIT_API_KEY is set, hits the live endpoint:
 *   GET https://model-serving.api.stackit.cloud/v1/regions/eu01/models
 * Otherwise falls back to a doc-derived seed.
 *
 * Source: https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/
 * (last checked 2026-10-30)
 */

import type { ModelRow } from "../types";
import { deriveCanonicalModelId, toPricePerMTokens } from "../utils";

// Doc-derived seed — kept in sync with the STACKIT docs page and the EUR price
// table on the STACKIT AI Model Serving product page.
// Full Name = the model ID served by the API.
const SEED: Array<{
  id: string;
  name: string;
  ctx: number;
  modality: string;
  active: boolean;
  i: number | null;
  o: number | null;
}> = [
  {
    id: "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
    name: "Qwen3-VL 235B",
    ctx: 200_000,
    modality: "multimodal",
    active: true,
    i: 1.5,
    o: 1.75,
  },
  { id: "Qwen/Qwen3.8-27B", name: "Qwen3.8 27B", ctx: 262_144, modality: "multimodal", active: true, i: 0.45, o: 0.65 },
  {
    id: "Qwen/Qwen3.6-27B",
    name: "Qwen3.6 27B",
    ctx: 262_144,
    modality: "multimodal",
    active: false,
    i: 0.45,
    o: 0.65,
  },
  {
    id: "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic",
    name: "Llama 3.3 70B",
    ctx: 128_000,
    modality: "text",
    active: true,
    i: 0.45,
    o: 0.65,
  },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", ctx: 131_072, modality: "text", active: true, i: 0.45, o: 0.65 },
  {
    id: "google/gemma-4-31B-it",
    name: "Gemma 4 31B",
    ctx: 256_000,
    modality: "multimodal",
    active: true,
    i: 0.45,
    o: 0.65,
  },
  { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", ctx: 131_072, modality: "text", active: true, i: 0.15, o: 0.25 },
  {
    id: "intfloat/e5-mistral-7b-instruct",
    name: "E5 Mistral 7B",
    ctx: 4096,
    modality: "embedding",
    active: true,
    i: 0.02,
    o: null,
  },
  {
    id: "Qwen/Qwen3-VL-Embedding-8B",
    name: "Qwen3 VL Embedding 8B",
    ctx: 32000,
    modality: "embedding",
    active: true,
    i: 0.08,
    o: null,
  },
];

const SEED_BY_ID = new Map(SEED.map((m) => [m.id, m]));

export async function fetchStackitModels(): Promise<ModelRow[]> {
  const apiKey = process.env.STACKIT_API_KEY;

  if (apiKey) {
    console.log("Fetching Stackit model catalog (live API)…");
    try {
      const res = await fetch("https://model-serving.api.stackit.cloud/v1/regions/eu01/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as {
        data: Array<{ id: string; object?: string }>;
      };
      const now = new Date();
      return data.data
        .filter((m) => !m.object || m.object === "model")
        .map((m) => {
          const seed = SEED_BY_ID.get(m.id);
          return {
            id: `stackit/${m.id}`,
            providerSlug: "stackit",
            canonicalModelId: deriveCanonicalModelId(`stackit/${m.id}`),
            displayName: seed?.name ?? m.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            modality: seed?.modality ?? "text",
            contextWindow: seed?.ctx ?? null,
            inputPricePerMTokens: toPricePerMTokens(seed?.i),
            outputPricePerMTokens: toPricePerMTokens(seed?.o),
            priceCurrency: "EUR",
            tokensPerSecond: null,
            syncSource: "provider_api",
            isActive: true,
            isNativeModel: true,
            lastSyncedAt: now,
          };
        });
    } catch (e) {
      console.warn(`  Stackit live API failed, falling back to seed: ${e}`);
      // fall through to seed below
    }
  } else {
    console.log("Stackit: no STACKIT_API_KEY — using doc-derived seed");
  }

  const now = new Date();
  return SEED.map((m) => ({
    id: `stackit/${m.id}`,
    providerSlug: "stackit",
    canonicalModelId: deriveCanonicalModelId(`stackit/${m.id}`),
    displayName: m.name,
    modality: m.modality,
    contextWindow: m.ctx,
    inputPricePerMTokens: toPricePerMTokens(m.i),
    outputPricePerMTokens: toPricePerMTokens(m.o),
    priceCurrency: "EUR",
    tokensPerSecond: null,
    syncSource: "manual",
    isActive: m.active,
    isNativeModel: true,
    lastSyncedAt: now,
  }));
}
