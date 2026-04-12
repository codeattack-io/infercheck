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
 * (last checked 2026-04-09)
 */

import type { ModelRow } from "../types";

// Doc-derived seed — kept in sync with the STACKIT docs page.
// Full Name = the model ID served by the API.
const SEED: Array<{ id: string; name: string; ctx: number; modality: string; active: boolean }> = [
  // Text / multimodal models
  { id: "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",         name: "Qwen3-VL 235B",         ctx: 218000, modality: "multimodal", active: true  },
  { id: "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic",    name: "Llama 3.3 70B",         ctx: 131072, modality: "text",      active: true  },
  { id: "openai/gpt-oss-120b",                           name: "GPT-OSS 120B",          ctx: 131072, modality: "text",      active: true  },
  { id: "google/gemma-3-27b-it",                         name: "Gemma 3 27B",           ctx: 37000,  modality: "multimodal", active: true  },
  { id: "openai/gpt-oss-20b",                            name: "GPT-OSS 20B",           ctx: 131072, modality: "text",      active: true  },
  { id: "neuralmagic/Mistral-Nemo-Instruct-2407-FP8",    name: "Mistral Nemo",          ctx: 128000, modality: "text",      active: false }, // deprecated
  { id: "neuralmagic/Meta-Llama-3.1-8B-Instruct-FP8",   name: "Llama 3.1 8B",          ctx: 128000, modality: "text",      active: false }, // deprecated
  // Embedding models
  { id: "intfloat/e5-mistral-7b-instruct",               name: "E5 Mistral 7B",         ctx: 4096,   modality: "embedding", active: true  },
  { id: "Qwen/Qwen3-VL-Embedding-8B",                    name: "Qwen3 VL Embedding 8B", ctx: 32000,  modality: "embedding", active: true  },
];

export async function fetchStackitModels(): Promise<ModelRow[]> {
  const apiKey = process.env.STACKIT_API_KEY;

  if (apiKey) {
    console.log("Fetching Stackit model catalog (live API)…");
    try {
      const res = await fetch(
        "https://model-serving.api.stackit.cloud/v1/regions/eu01/models",
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as {
        data: Array<{ id: string; object?: string }>;
      };
      const now = new Date();
      return data.data
        .filter((m) => !m.object || m.object === "model")
        .map((m) => ({
          id: `stackit/${m.id}`,
          providerSlug: "stackit",
          displayName: m.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          modality: "text",
          contextWindow: null,
          inputPricePerMTokens: null,
          outputPricePerMTokens: null,
          tokensPerSecond: null,
          syncSource: "provider_api",
          isActive: true,
          isNativeModel: true,
          lastSyncedAt: now,
        }));
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
    displayName: m.name,
    modality: m.modality,
    contextWindow: m.ctx,
    inputPricePerMTokens: null,
    outputPricePerMTokens: null,
    tokensPerSecond: null,
    syncSource: "manual",
    isActive: m.active,
    isNativeModel: true,
    lastSyncedAt: now,
  }));
}
