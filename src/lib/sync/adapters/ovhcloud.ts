/**
 * src/lib/sync/adapters/ovhcloud.ts
 *
 * OVHcloud AI Endpoints model catalog.
 * No public pricing API — uses a manually maintained seed.
 * Source: https://endpoints.ai.cloud.ovh.net/
 */

import type { ModelRow } from "../types";

const SEED = [
  { id: "meta-llama__Meta-Llama-3.1-8B-Instruct",  name: "Llama 3.1 8B Instruct",  i: 0.06, o: 0.06, ctx: 131072 },
  { id: "meta-llama__Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B Instruct", i: 0.59, o: 0.59, ctx: 131072 },
  { id: "meta-llama__Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct", i: 0.59, o: 0.59, ctx: 131072 },
  { id: "mistralai__Mistral-7B-Instruct-v0.3",     name: "Mistral 7B Instruct",    i: 0.06, o: 0.06, ctx: 32768  },
  { id: "mistralai__Mixtral-8x7B-Instruct-v0.1",   name: "Mixtral 8x7B Instruct",  i: 0.59, o: 0.59, ctx: 32768  },
  { id: "mistralai__Mixtral-8x22B-Instruct-v0.1",  name: "Mixtral 8x22B Instruct", i: 1.19, o: 1.19, ctx: 65536  },
  { id: "deepseek-ai__DeepSeek-R1",               name: "DeepSeek R1",            i: 1.98, o: 7.92, ctx: 65536  },
];

export async function fetchOVHcloudModels(): Promise<ModelRow[]> {
  console.log("OVHcloud: no public pricing API — using manual seed");
  const now = new Date();
  return SEED.map((m) => ({
    id: `ovhcloud/${m.id}`,
    providerSlug: "ovhcloud-ai-endpoints",
    displayName: m.name,
    modality: "text",
    contextWindow: m.ctx,
    inputPricePerMTokens: m.i.toFixed(6),
    outputPricePerMTokens: m.o.toFixed(6),
    tokensPerSecond: null,
    syncSource: "manual",
    isActive: true,
    isNativeModel: true,
    lastSyncedAt: now,
  }));
}
