/**
 * src/lib/sync/adapters/berget.ts
 *
 * Fetches Berget AI's model catalog via their public API.
 * EU-native provider (Sweden).
 */

import type { ModelRow } from "../types";
import { deriveCanonicalModelId } from "../utils";

export async function fetchBergetModels(): Promise<ModelRow[]> {
  console.log("Fetching Berget AI model catalog…");
  try {
    const res = await fetch("https://api.berget.ai/v1/models");
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = (await res.json()) as {
      data: Array<{
        id: string;
        name?: string;
        model_type?: string;
        capabilities?: { vision?: boolean; embeddings?: boolean };
        pricing?: { input?: number; output?: number };
      }>;
    };
    const now = new Date();
    return data.data.map((m) => {
      const isEmbedding = m.capabilities?.embeddings === true;
      const isVision = m.capabilities?.vision === true;
      const modality = isEmbedding ? "embedding" : isVision ? "multimodal" : "text";
      const inputRaw = m.pricing?.input ?? null;
      const outputRaw = m.pricing?.output ?? null;
      return {
        id: `berget/${m.id}`,
        providerSlug: "berget-ai",
        canonicalModelId: deriveCanonicalModelId(`berget/${m.id}`),
        displayName: m.name ?? m.id,
        modality,
        contextWindow: null,
        inputPricePerMTokens: inputRaw != null ? (inputRaw * 1_000_000).toFixed(6) : null,
        outputPricePerMTokens: outputRaw != null ? (outputRaw * 1_000_000).toFixed(6) : null,
        tokensPerSecond: null,
        syncSource: "provider_api",
        isActive: true,
        isNativeModel: true,
        lastSyncedAt: now,
      };
    });
  } catch (e) {
    console.warn(`  Berget AI adapter failed: ${e}`);
    return [];
  }
}
