/**
 * src/lib/sync/adapters/mistral.ts
 *
 * Fetches Mistral AI's model catalog via their native API.
 * EU-native provider — uses MISTRAL_API_KEY.
 */

import type { ModelRow } from "../types";

export async function fetchMistralModels(): Promise<ModelRow[]> {
  console.log("Fetching Mistral model catalog…");
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.warn("  Mistral adapter skipped: MISTRAL_API_KEY not set");
    return [];
  }
  try {
    const res = await fetch("https://api.mistral.ai/v1/models", {
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
        const isAudio =
          c.audio || c.audio_transcription || c.audio_transcription_realtime || c.audio_speech;
        const isMultimodal = !isAudio && c.vision;
        const isEmbedding = !isAudio && !isMultimodal && !c.completion_chat && !c.fine_tuning;
        const modality = isAudio
          ? "audio"
          : isMultimodal
            ? "multimodal"
            : isEmbedding
              ? "embedding"
              : "text";
        return {
          id: `mistralai/${m.id}`,
          providerSlug: "mistral",
          displayName: m.id
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          modality,
          contextWindow: m.max_context_length ?? null,
          inputPricePerMTokens: null,
          outputPricePerMTokens: null,
          tokensPerSecond: null,
          syncSource: "provider_api",
          isActive: m.deprecation === null, // deprecated models → inactive
          isNativeModel: true,
          lastSyncedAt: now,
        };
      });
  } catch (e) {
    console.warn(`  Mistral adapter failed: ${e}`);
    return [];
  }
}
