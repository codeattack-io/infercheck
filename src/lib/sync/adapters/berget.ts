/**
 * src/lib/sync/adapters/berget.ts
 *
 * Fetches Berget AI's model catalog via their public API.
 * EU-native provider (Sweden).
 */

import type { ModelRow } from "../types";
import { deriveCanonicalModelId, toPricePerMTokens } from "../utils";

const PER_M_TOKENS_UNIT = "€ / M Token";

export async function fetchBergetModels(): Promise<ModelRow[]> {
  console.log("Fetching Berget AI model catalog…");
  const res = await fetch("https://api.berget.ai/v1/models");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name?: string;
      model_type?: string;
      capabilities?: { vision?: boolean; embeddings?: boolean };
      pricing?: { input?: number; output?: number; unit?: string };
    }>;
  };
  const now = new Date();
  return data.data.map((m) => {
    const isEmbedding = m.capabilities?.embeddings === true;
    const isVision = m.capabilities?.vision === true;
    const modality = isEmbedding ? "embedding" : isVision ? "multimodal" : "text";
    const perMTokens = m.pricing?.unit === PER_M_TOKENS_UNIT;
    return {
      id: `berget/${m.id}`,
      providerSlug: "berget-ai",
      canonicalModelId: deriveCanonicalModelId(`berget/${m.id}`),
      displayName: m.name ?? m.id,
      modality,
      contextWindow: null,
      inputPricePerMTokens: perMTokens ? toPricePerMTokens(m.pricing?.input) : null,
      outputPricePerMTokens: perMTokens ? toPricePerMTokens(m.pricing?.output) : null,
      tokensPerSecond: null,
      syncSource: "provider_api",
      isActive: true,
      isNativeModel: true,
      lastSyncedAt: now,
    };
  });
}
