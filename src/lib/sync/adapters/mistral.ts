/**
 * src/lib/sync/adapters/mistral.ts
 *
 * Fetches the models Mistral AI serves on its EU regional endpoint via their
 * native API, priced from a static seed of EU regional prices in USD.
 * EU-native provider — uses MISTRAL_API_KEY.
 */

import type { ModelRow } from "../types";
import { deriveCanonicalModelId, toPricePerMTokens } from "../utils";

/** USD per 1M tokens on api.eu.mistral.ai, keyed by the model id the API lists. */
export const MISTRAL_PRICING: Record<string, { i: number | null; o: number | null }> = {
  "mistral-large-4": { i: 0.77, o: 2.31 },
  "mistral-large-2512": { i: 0.55, o: 1.65 },
  "mistral-medium-3-5": { i: 1.65, o: 8.25 },
  "mistral-small-2603": { i: 0.165, o: 0.66 },
  "ministral-14b-2512": { i: 0.22, o: 0.22 },
  "ministral-8b-2512": { i: 0.165, o: 0.165 },
  "ministral-3b-2512": { i: 0.11, o: 0.11 },
  "codestral-2508": { i: 0.33, o: 0.99 },
  "codestral-embed": { i: 0.165, o: null },
  "codestral-embed-2505": { i: 0.165, o: null },
  "mistral-embed-2312": { i: 0.11, o: null },
  "mistral-moderation-2603": { i: 0, o: 0 },
};

export async function fetchMistralModels(): Promise<ModelRow[]> {
  console.log("Fetching Mistral model catalog…");
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.warn("  Mistral adapter skipped: MISTRAL_API_KEY not set");
    return [];
  }
  const res = await fetch("https://api.eu.mistral.ai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name: string; // canonical versioned model name; aliases have id !== name
      object: string;
      max_context_length: number | null;
      deprecation: string | null;
      capabilities: {
        vision?: boolean;
        audio?: boolean;
        audio_transcription?: boolean;
        audio_transcription_realtime?: boolean;
        audio_speech?: boolean;
        completion_chat?: boolean;
        fine_tuning?: boolean;
      };
    }>;
  };
  const now = new Date();
  return data.data
    .filter((m) => m.object === "model" && m.id === m.name) // deduplicate: skip aliases
    .map((m) => {
      const c = m.capabilities;
      const isAudio = c.audio || c.audio_transcription || c.audio_transcription_realtime || c.audio_speech;
      const isMultimodal = !isAudio && c.vision;
      const isEmbedding = !isAudio && !isMultimodal && !c.completion_chat && !c.fine_tuning;
      const modality = isAudio ? "audio" : isMultimodal ? "multimodal" : isEmbedding ? "embedding" : "text";
      const price = MISTRAL_PRICING[m.id];
      return {
        id: `mistralai/${m.id}`,
        providerSlug: "mistral",
        canonicalModelId: deriveCanonicalModelId(`mistralai/${m.id}`),
        displayName: m.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        modality,
        contextWindow: m.max_context_length ?? null,
        inputPricePerMTokens: toPricePerMTokens(price?.i),
        outputPricePerMTokens: toPricePerMTokens(price?.o),
        priceCurrency: "USD",
        tokensPerSecond: null,
        syncSource: "provider_api",
        isActive: m.deprecation === null, // deprecated models → inactive
        isNativeModel: true,
        lastSyncedAt: now,
      };
    });
}
