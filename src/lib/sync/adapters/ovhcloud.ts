/**
 * src/lib/sync/adapters/ovhcloud.ts
 *
 * OVHcloud AI Endpoints model catalog.
 * Uses a manually maintained seed.
 * Source: https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/
 */

import type { ModelRow } from "../types";
import { deriveCanonicalModelId, toPricePerMTokens } from "../utils";

const SEED = [
  { id: "meta-llama__Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct", i: 0.67, o: 0.67, ctx: 131072 },
];

export async function fetchOVHcloudModels(): Promise<ModelRow[]> {
  console.log("OVHcloud: using manual seed");
  const now = new Date();
  return SEED.map((m) => ({
    id: `ovhcloud/${m.id}`,
    providerSlug: "ovhcloud-ai-endpoints",
    canonicalModelId: deriveCanonicalModelId(`ovhcloud/${m.id}`),
    displayName: m.name,
    modality: "text",
    contextWindow: m.ctx,
    inputPricePerMTokens: toPricePerMTokens(m.i),
    outputPricePerMTokens: toPricePerMTokens(m.o),
    priceCurrency: "EUR",
    tokensPerSecond: null,
    syncSource: "manual",
    isActive: true,
    isNativeModel: true,
    lastSyncedAt: now,
  }));
}
