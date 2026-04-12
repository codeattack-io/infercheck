/**
 * src/lib/sync/adapters/bedrock.ts
 *
 * Fetches Amazon Bedrock model catalog via the AWS SDK.
 * Combines ListFoundationModels + ListInferenceProfiles to produce
 * rows for all models accessible in the eu-central-1 region.
 *
 * Pricing and context windows are sourced from a static seed because the
 * Bedrock API does not expose them. Seed last verified 2026-04-12 against
 * https://aws.amazon.com/bedrock/pricing/ (Frankfurt / eu-central-1).
 * Prices marked ⚠ use a nearest-region proxy (ap-southeast-2) where Frankfurt
 * is not explicitly listed on the pricing page; update when AWS publishes them.
 */

import {
  BedrockClient,
  ListFoundationModelsCommand,
  ListInferenceProfilesCommand,
  type FoundationModelSummary,
  type InferenceProfileSummary,
} from "@aws-sdk/client-bedrock";
import type { ModelRow, BedrockPricingSeed } from "../types";
import { deriveCanonicalModelId } from "../utils";

// ─── Pricing / context seed ───────────────────────────────────────────────────
// Keyed by underlying foundation model ID (region prefix already stripped).

export const BEDROCK_PRICING: Record<string, BedrockPricingSeed> = {
  // Anthropic — eu-central-1 prices (same as US on-demand for these models)
  "anthropic.claude-3-sonnet-20240229-v1:0":    { i: 3.00,   o: 15.00,  ctx: 200_000 },
  "anthropic.claude-3-haiku-20240307-v1:0":     { i: 0.25,   o: 1.25,   ctx: 200_000 },
  "anthropic.claude-3-5-haiku-20241022-v1:0":   { i: 0.80,   o: 4.00,   ctx: 200_000 },
  "anthropic.claude-3-5-sonnet-20240620-v1:0":  { i: 6.00,   o: 30.00,  ctx: 200_000 },
  "anthropic.claude-3-5-sonnet-20241022-v2:0":  { i: 6.00,   o: 30.00,  ctx: 200_000 },
  "anthropic.claude-3-7-sonnet-20250219-v1:0":  { i: 3.00,   o: 15.00,  ctx: 200_000 },
  "anthropic.claude-haiku-4-5-20251001-v1:0":   { i: 0.80,   o: 4.00,   ctx: 200_000 },
  "anthropic.claude-sonnet-4-20250514-v1:0":    { i: 3.00,   o: 15.00,  ctx: 200_000 },
  "anthropic.claude-sonnet-4-5-20250929-v1:0":  { i: 3.00,   o: 15.00,  ctx: 200_000 },
  "anthropic.claude-sonnet-4-6":                { i: 3.00,   o: 15.00,  ctx: 200_000 },
  "anthropic.claude-opus-4-5-20251101-v1:0":    { i: 15.00,  o: 75.00,  ctx: 200_000 },
  "anthropic.claude-opus-4-6-v1":               { i: 15.00,  o: 75.00,  ctx: 200_000 },
  // Meta Llama — eu-central-1 cross-region inference profiles available
  "meta.llama3-2-1b-instruct-v1:0":             { i: 0.10,   o: 0.10,   ctx: 131_072 },
  "meta.llama3-2-3b-instruct-v1:0":             { i: 0.15,   o: 0.15,   ctx: 131_072 },
  // Mistral — eu-central-1 explicitly listed on pricing page
  "mistral.pixtral-large-2502-v1:0":            { i: 0.59,   o: 1.76,   ctx: 131_072 }, // multimodal
  "mistral.devstral-2-123b":                    { i: 0.48,   o: 2.40,   ctx: 131_072 },
  "mistral.mistral-large-3-675b-instruct":      { i: 0.59,   o: 1.76,   ctx: 131_072 },
  "mistral.magistral-small-2509":               { i: 0.59,   o: 1.76,   ctx: 128_000 },
  "mistral.ministral-3-3b-instruct":            { i: 0.12,   o: 0.12,   ctx: 131_072 },
  "mistral.ministral-3-8b-instruct":            { i: 0.18,   o: 0.18,   ctx: 131_072 },
  "mistral.ministral-3-14b-instruct":           { i: 0.24,   o: 0.24,   ctx: 131_072 },
  "mistral.voxtral-mini-3b-2507":               { i: 0.04,   o: 0.04,   ctx: 32_000  },
  // Cohere
  "cohere.embed-english-v3":                    { i: 0.10,   o: null,   ctx: 512     },
  "cohere.embed-multilingual-v3":               { i: 0.10,   o: null,   ctx: 512     },
  "cohere.embed-v4:0":                          { i: 0.10,   o: null,   ctx: 512     },
  "cohere.rerank-v3-5:0":                       { i: null,   o: null,   ctx: null    }, // per-query pricing
  // Qwen — ⚠ 235B/32B/Coder-30B use ap-southeast-2 proxy; Coder-Next is Frankfurt-explicit
  "qwen.qwen3-coder-next":                      { i: 0.60,   o: 1.44,   ctx: 1_000_000 },
  "qwen.qwen3-235b-a22b-2507-v1:0":            { i: 0.2266, o: 0.9064, ctx: 131_072 }, // ⚠ proxy
  "qwen.qwen3-32b-v1:0":                        { i: 0.1545, o: 0.6180, ctx: 131_072 }, // ⚠ proxy
  "qwen.qwen3-coder-30b-a3b-v1:0":             { i: 0.1545, o: 0.6180, ctx: 131_072 }, // ⚠ proxy
  // MiniMax — eu-central-1 explicitly listed
  "minimax.minimax-m2":                         { i: 0.35,   o: 1.41,   ctx: 1_000_000 },
  "minimax.minimax-m2.1":                       { i: 0.36,   o: 1.44,   ctx: 1_000_000 },
  "minimax.minimax-m2.5":                       { i: 0.36,   o: 1.44,   ctx: 1_000_000 },
  // NVIDIA — eu-central-1 explicitly listed
  "nvidia.nemotron-super-3-120b":               { i: 0.18,   o: 0.78,   ctx: 131_072 },
  "nvidia.nemotron-nano-3-30b":                 { i: 0.07,   o: 0.28,   ctx: 131_072 },
  "nvidia.nemotron-nano-12b-v2":                { i: 0.04,   o: 0.16,   ctx: 131_072 },
  // OpenAI gpt-oss — ⚠ ap-southeast-2 proxy; eu-central-1 confirmed supported
  "openai.gpt-oss-120b-1:0":                    { i: 0.1545, o: 0.6180, ctx: 128_000 }, // ⚠ proxy
  "openai.gpt-oss-20b-1:0":                     { i: 0.0721, o: 0.3090, ctx: 128_000 }, // ⚠ proxy
  // Z.AI — eu-central-1 explicitly listed
  "zai.glm-4.7-flash":                          { i: 0.08,   o: 0.48,   ctx: 131_072 },
  "zai.glm-5":                                  { i: 0.10,   o: 0.60,   ctx: 131_072 },
  "zai.glm-4.7":                                { i: 0.10,   o: 0.60,   ctx: 131_072 },
  // Amazon Nova — eu-central-1 cross-region inference profiles available
  "amazon.nova-micro-v1:0":                     { i: 0.035,  o: 0.14,   ctx: 128_000 },
  "amazon.nova-lite-v1:0":                      { i: 0.06,   o: 0.24,   ctx: 300_000 },
  "amazon.nova-pro-v1:0":                       { i: 0.80,   o: 3.20,   ctx: 300_000 },
  "amazon.nova-2-lite-v1:0":                    { i: 0.06,   o: 0.24,   ctx: 300_000 },
  // Amazon Titan
  "amazon.titan-embed-text-v1":                 { i: 0.10,   o: null,   ctx: 8_192   },
  "amazon.titan-embed-text-v2:0":               { i: 0.02,   o: null,   ctx: 8_192   },
  "amazon.titan-embed-image-v1":                { i: 0.10,   o: null,   ctx: 128     }, // text component
  "amazon.rerank-v1:0":                         { i: null,   o: null,   ctx: null    }, // per-query pricing
};

// ─── Adapter ──────────────────────────────────────────────────────────────────

export async function fetchBedrockModels(): Promise<ModelRow[]> {
  console.log("Fetching Amazon Bedrock model catalog…");
  const region = process.env.AWS_REGION ?? "eu-central-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.warn("  Bedrock adapter skipped: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set");
    return [];
  }

  try {
    const client = new BedrockClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Fetch both sources in parallel
    const [fmResp, profileResp] = await Promise.all([
      client.send(new ListFoundationModelsCommand({ byInferenceType: "ON_DEMAND" })),
      client.send(new ListInferenceProfilesCommand({ typeEquals: "SYSTEM_DEFINED" })),
    ]);

    const foundationModels: FoundationModelSummary[] = fmResp.modelSummaries ?? [];
    const profiles: InferenceProfileSummary[] = profileResp.inferenceProfileSummaries ?? [];

    const now = new Date();

    // Strip region prefix from inference profile ID to get the underlying model ID.
    // e.g. "eu.anthropic.claude-sonnet-4-20250514-v1:0" → "anthropic.claude-sonnet-4-20250514-v1:0"
    const stripPrefix = (id: string) => id.replace(/^(?:eu|us|ap|global)\./, "");

    // Build a map of underlying modelId → profile (prefer eu.* over global.*).
    // Profiles expose the same model via cross-region routing.
    const profileByModel = new Map<string, InferenceProfileSummary>();
    for (const p of profiles) {
      if (!p.inferenceProfileId || p.status !== "ACTIVE") continue;
      const isEu = p.inferenceProfileId.startsWith("eu.");
      const isGlobal = p.inferenceProfileId.startsWith("global.");
      if (!isEu && !isGlobal) continue; // skip US-only profiles

      const underlyingId = stripPrefix(p.inferenceProfileId);
      const existing = profileByModel.get(underlyingId);
      // eu.* takes priority over global.*
      if (!existing || isEu) {
        profileByModel.set(underlyingId, p);
      }
    }

    // Build a set of model IDs already covered by a profile
    const coveredByProfile = new Set(profileByModel.keys());

    // Derive modality from input modalities array
    const toModality = (mods: string[]) => {
      const hasImage = mods.includes("IMAGE");
      const hasText = mods.includes("TEXT");
      return hasImage ? "multimodal" : hasText ? "text" : "text";
    };

    // Derive provider name from model ID prefix (for foundation models that lack the field)
    const providerFromId = (id: string) => id.split(".")[0];

    const rows: ModelRow[] = [];

    // 1. Inference profiles — primary source for cross-region models (Claude, Nova, Llama, Pixtral…)
    for (const [underlyingId, profile] of profileByModel.entries()) {
      const seed = BEDROCK_PRICING[underlyingId];
      const fm = foundationModels.find((m) => m.modelId === underlyingId);
      const mods = fm?.inputModalities ?? ["TEXT"];
      const provider = providerFromId(underlyingId);

      rows.push({
        id: `bedrock/${profile.inferenceProfileId}`,
        providerSlug: "amazon-bedrock",
        canonicalModelId: deriveCanonicalModelId(`bedrock/${profile.inferenceProfileId}`),
        displayName: profile.inferenceProfileName ?? underlyingId,
        modality: toModality(mods),
        contextWindow: seed?.ctx ?? null,
        inputPricePerMTokens: seed?.i != null ? seed.i.toFixed(6) : null,
        outputPricePerMTokens: seed?.o != null ? seed.o.toFixed(6) : null,
        tokensPerSecond: null,
        syncSource: "provider_api",
        isActive: true,
        isNativeModel: provider === "amazon",
        lastSyncedAt: now,
      });
    }

    // 2. Foundation models NOT covered by any inference profile (embeddings, rerank, Qwen, etc.)
    for (const m of foundationModels) {
      const raw = m.modelId ?? "";
      if (coveredByProfile.has(raw)) continue; // already included via profile above

      const seed = BEDROCK_PRICING[raw];
      const mods = m.inputModalities ?? [];

      rows.push({
        id: `bedrock/${raw}`,
        providerSlug: "amazon-bedrock",
        canonicalModelId: deriveCanonicalModelId(`bedrock/${raw}`),
        displayName: m.modelName ?? raw,
        modality: toModality(mods),
        contextWindow: seed?.ctx ?? null,
        inputPricePerMTokens: seed?.i != null ? seed.i.toFixed(6) : null,
        outputPricePerMTokens: seed?.o != null ? seed.o.toFixed(6) : null,
        tokensPerSecond: null,
        syncSource: "provider_api",
        isActive: m.modelLifecycle?.status !== "LEGACY",
        isNativeModel: m.providerName === "Amazon",
        lastSyncedAt: now,
      });
    }

    console.log(`  Bedrock: ${rows.length} rows (${profileByModel.size} inference profiles + ${rows.length - profileByModel.size} foundation models)`);
    return rows;
  } catch (e) {
    console.warn(`  Bedrock adapter failed: ${e}`);
    return [];
  }
}
