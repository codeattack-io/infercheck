/**
 * src/lib/sync/adapters/scaleway.ts
 *
 * Fetches Scaleway AI (Generative APIs) model catalog.
 * EU-native provider — uses SCW_SECRET_KEY.
 */

import type { ModelRow } from "../types";

export async function fetchScalewayModels(): Promise<ModelRow[]> {
  console.log("Fetching Scaleway model catalog…");
  const apiKey = process.env.SCW_SECRET_KEY;
  if (!apiKey) {
    console.warn("  Scaleway adapter skipped: SCW_SECRET_KEY not set");
    return [];
  }
  try {
    const res = await fetch("https://api.scaleway.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    // Response: OpenAI-compat { object: "list", data: [{ id, object, created, owned_by }] }
    const data = (await res.json()) as {
      data: Array<{ id: string; object?: string }>;
    };
    const now = new Date();
    return data.data
      .filter((m) => !m.object || m.object === "model")
      .map((m) => {
        const id = m.id;
        const isAudio = id.includes("whisper") || id.includes("voxtral");
        const isMultimodal = !isAudio && (id.includes("pixtral") || id.includes("vision"));
        const isEmbedding = !isAudio && !isMultimodal && (id.includes("embed") || id.includes("bge"));
        const modality = isAudio ? "audio" : isMultimodal ? "multimodal" : isEmbedding ? "embedding" : "text";
        return {
          id: `scaleway/${id}`,
          providerSlug: "scaleway",
          displayName: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          modality,
          contextWindow: null,
          inputPricePerMTokens: null,
          outputPricePerMTokens: null,
          tokensPerSecond: null,
          syncSource: "provider_api",
          isActive: true,
          isNativeModel: true,
          lastSyncedAt: now,
        };
      });
  } catch (e) {
    console.warn(`  Scaleway adapter failed: ${e}`);
    return [];
  }
}
