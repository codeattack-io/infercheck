/**
 * src/lib/sync/adapters/bedrock.ts
 *
 * Fetches Amazon Bedrock model catalog via the AWS SDK.
 * Combines ListFoundationModels + ListInferenceProfiles to produce
 * rows for all models accessible in the eu-central-1 region.
 *
 * Pricing and context windows are sourced from a static seed because the
 * Bedrock API does not expose them. Seed prices last verified 2026-10-29
 * against the AWS Price List offers AmazonBedrock and AmazonBedrockFoundationModels
 * for eu-central-1 (https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json),
 * on-demand standard tier. eu.* profiles use the regional price, global.* profiles
 * the global price. Models without a listed per-token price stay null.
 */

import {
  BedrockClient,
  ListFoundationModelsCommand,
  ListInferenceProfilesCommand,
  type FoundationModelSummary,
  type InferenceProfileSummary,
} from "@aws-sdk/client-bedrock";
import type { ModelRow, BedrockPricingSeed } from "../types";
import { deriveCanonicalModelId, toPricePerMTokens } from "../utils";

// ─── Pricing / context seed ───────────────────────────────────────────────────
// Keyed by the inference profile ID or foundation model ID the adapter emits.

export const BEDROCK_PRICING: Record<string, BedrockPricingSeed> = {
  // Anthropic
  "eu.anthropic.claude-3-sonnet-20240229-v1:0": { i: 3.0, o: 15.0, ctx: 200_000 },
  "eu.anthropic.claude-3-haiku-20240307-v1:0": { i: 0.25, o: 1.25, ctx: 200_000 },
  "eu.anthropic.claude-haiku-4-5-20251001-v1:0": { i: 1.1, o: 5.5, ctx: 200_000 },
  "eu.anthropic.claude-sonnet-4-5-20250929-v1:0": { i: 3.3, o: 16.5, ctx: 200_000 },
  "eu.anthropic.claude-sonnet-4-6": { i: 3.3, o: 16.5, ctx: 200_000 },
  "eu.anthropic.claude-opus-4-5-20251101-v1:0": { i: 5.5, o: 27.5, ctx: 200_000 },
  "eu.anthropic.claude-opus-4-6-v1": { i: 5.5, o: 27.5, ctx: 200_000 },
  "eu.anthropic.claude-opus-4-7": { i: 5.5, o: 27.5, ctx: null },
  "eu.anthropic.claude-opus-4-8": { i: 5.5, o: 27.5, ctx: null },
  "eu.anthropic.claude-sonnet-5": { i: 2.2, o: 11.0, ctx: null },
  "eu.anthropic.claude-opus-5": { i: 5.5, o: 27.5, ctx: null },
  "eu.anthropic.claude-haiku-5-5": { i: 0.11, o: 0.55, ctx: null },
  "eu.anthropic.claude-sonnet-5-5": { i: 2.2, o: 11.0, ctx: null },
  "eu.anthropic.claude-opus-5-5": { i: 4.4, o: 22.0, ctx: null },
  "global.anthropic.claude-fable-5": { i: 10.0, o: 50.0, ctx: null },
  "global.anthropic.claude-fable-5-1": { i: 10.0, o: 50.0, ctx: null },
  // Meta Llama
  "eu.meta.llama3-2-1b-instruct-v1:0": { i: 0.13, o: 0.13, ctx: 131_072 },
  "eu.meta.llama3-2-3b-instruct-v1:0": { i: 0.19, o: 0.19, ctx: 131_072 },
  // Mistral
  "eu.mistral.pixtral-large-2502-v1:0": { i: 2.0, o: 6.0, ctx: 131_072 }, // multimodal
  "mistral.devstral-2-123b": { i: 0.48, o: 2.4, ctx: 131_072 },
  // Cohere
  "eu.cohere.embed-v4:0": { i: 0.12, o: null, ctx: 512 },
  "cohere.embed-english-v3": { i: 0.1, o: null, ctx: 512 },
  "cohere.embed-multilingual-v3": { i: 0.1, o: null, ctx: 512 },
  "cohere.rerank-v3-5:0": { i: null, o: null, ctx: null }, // per-search-unit pricing
  // TwelveLabs — input priced per video second
  "eu.twelvelabs.pegasus-1-2-v1:0": { i: null, o: 7.5, ctx: null },
  "global.twelvelabs.pegasus-1-5-v1:0": { i: null, o: 7.5, ctx: null },
  // OpenAI
  "global.openai.gpt-6-astra": { i: 10.0, o: 50.0, ctx: null },
  "openai.gpt-oss-120b-1:0": { i: 0.2, o: 0.79, ctx: 128_000 },
  "openai.gpt-oss-20b-1:0": { i: 0.09, o: 0.4, ctx: 128_000 },
  // xAI
  "global.xai.grok-4.6": { i: 2.0, o: 6.0, ctx: null },
  "global.xai.grok-4.7": { i: 2.0, o: 6.0, ctx: null },
  // Moonshot AI
  "global.moonshotai.kimi-k3": { i: 3.0, o: 15.0, ctx: null },
  // Qwen
  "qwen.qwen3-235b-a22b-2507-v1:0": { i: 0.29, o: 1.16, ctx: 131_072 },
  "qwen.qwen3-32b-v1:0": { i: 0.2, o: 0.79, ctx: 131_072 },
  "qwen.qwen3-coder-30b-a3b-v1:0": { i: 0.2, o: 0.79, ctx: 131_072 },
  // MiniMax
  "minimax.minimax-m2.1": { i: 0.36, o: 1.44, ctx: 1_000_000 },
  "minimax.minimax-m2.5": { i: 0.36, o: 1.44, ctx: 1_000_000 },
  // NVIDIA
  "nvidia.nemotron-super-3-120b": { i: 0.18, o: 0.78, ctx: 131_072 },
  // Z.AI
  "zai.glm-4.7-flash": { i: 0.08, o: 0.48, ctx: 131_072 },
  // Amazon Nova
  "eu.amazon.nova-micro-v1:0": { i: 0.046, o: 0.184, ctx: 128_000 },
  "eu.amazon.nova-lite-v1:0": { i: 0.078, o: 0.312, ctx: 300_000 },
  "eu.amazon.nova-pro-v1:0": { i: 1.05, o: 4.2, ctx: 300_000 },
  "eu.amazon.nova-2-lite-v1:0": { i: 0.429, o: 3.597, ctx: 300_000 },
  // Amazon Titan
  "amazon.titan-embed-text-v1": { i: 0.2, o: null, ctx: 8_192 },
  "amazon.titan-embed-text-v2:0": { i: 0.2, o: null, ctx: 8_192 },
  "amazon.titan-embed-image-v1": { i: 1.0, o: null, ctx: 128 }, // text component
  "amazon.rerank-v1:0": { i: null, o: null, ctx: null }, // per-search-unit pricing
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
    const seed = BEDROCK_PRICING[profile.inferenceProfileId!];
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
      inputPricePerMTokens: toPricePerMTokens(seed?.i),
      outputPricePerMTokens: toPricePerMTokens(seed?.o),
      priceCurrency: "USD",
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
      inputPricePerMTokens: toPricePerMTokens(seed?.i),
      outputPricePerMTokens: toPricePerMTokens(seed?.o),
      priceCurrency: "USD",
      tokensPerSecond: null,
      syncSource: "provider_api",
      isActive: m.modelLifecycle?.status !== "LEGACY",
      isNativeModel: m.providerName === "Amazon",
      lastSyncedAt: now,
    });
  }

  console.log(
    `  Bedrock: ${rows.length} rows (${profileByModel.size} inference profiles + ${rows.length - profileByModel.size} foundation models)`
  );
  return rows;
}
