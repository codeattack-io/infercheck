/**
 * app/src/lib/sync/run.ts
 *
 * Core sync logic for the model catalog.
 * Called from:
 *   - /api/cron/sync-models (Vercel Cron)
 *   - scripts/sync-models.ts (CLI / one-off)
 *
 * Sources:
 *   1. OpenRouter /api/v1/models  — covers 300+ models across major providers
 *   2. Per-provider adapters      — EU-native providers not on OpenRouter
 *      (Scaleway, Aleph Alpha, Berget AI, Stackit, OVHcloud, Mistral)
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, notInArray } from "drizzle-orm";
import * as schema from "@/db/schema";

// ─── DB client (lazily initialised) ──────────────────────────────────────────

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is required");
  return drizzle(neon(url), { schema });
}

// ─── OpenRouter provider prefix → our provider slug ──────────────────────────

const OPENROUTER_PREFIX_TO_SLUG: Record<string, string> = {
  anthropic: "anthropic",
  openai: "openai",
  google: "vertex",
  "meta-llama": "together-ai",
  mistralai: "mistral",
  cohere: "cohere",
  deepseek: "deepseek",
  "x-ai": "xai",
  perplexity: "perplexity",
  amazon: "amazon-bedrock",
  nvidia: "nvidia",
  moonshotai: "moonshot-ai",
  minimax: "minimax-minimax-io",
  inception: "inception",
  upstage: "upstage",
  "z-ai": "z-ai",
  xiaomi: "xiaomi",
  stepfun: "stepfun",
  morph: "morph",
  qwen: "alibaba",
  microsoft: "github-models",
  bytedance: "deepseek",
  "bytedance-seed": "deepseek",
};

// ─── Modality normalisation ───────────────────────────────────────────────────

function normaliseModality(raw: string | undefined): string {
  if (!raw) return "text";
  if (raw.includes("image") || raw.includes("audio")) {
    if (raw.includes("image") && raw.includes("audio")) return "multimodal";
    if (raw.includes("image")) return "multimodal";
    return "audio";
  }
  if (raw.includes("embed")) return "embedding";
  return "text";
}

// ─── Shared row type ──────────────────────────────────────────────────────────

interface ModelRow {
  id: string;
  providerSlug: string;
  displayName: string;
  modality: string;
  contextWindow: number | null;
  inputPricePerMTokens: string | null;
  outputPricePerMTokens: string | null;
  tokensPerSecond: string | null;
  syncSource: string;
  isActive: boolean;
  lastSyncedAt: Date;
}

// ─── Source 1: OpenRouter ─────────────────────────────────────────────────────

async function fetchOpenRouterModels(): Promise<ModelRow[]> {
  console.log("Fetching OpenRouter model catalog…");

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      "HTTP-Referer": "https://gdpr-ai.directory",
      "X-Title": "GDPR AI Directory",
    },
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name: string;
      context_length: number | null;
      architecture?: { modality?: string };
      pricing?: { prompt?: string; completion?: string };
    }>;
  };

  const rows: ModelRow[] = [];
  const now = new Date();

  for (const m of data.data) {
    const [prefix] = m.id.split("/");
    const providerSlug = OPENROUTER_PREFIX_TO_SLUG[prefix];
    if (!providerSlug) continue;

    const inputRaw = m.pricing?.prompt ? parseFloat(m.pricing.prompt) : null;
    const outputRaw = m.pricing?.completion ? parseFloat(m.pricing.completion) : null;

    rows.push({
      id: m.id,
      providerSlug,
      displayName: m.name,
      modality: normaliseModality(m.architecture?.modality),
      contextWindow: m.context_length ?? null,
      inputPricePerMTokens: inputRaw != null ? (inputRaw * 1_000_000).toFixed(6) : null,
      outputPricePerMTokens: outputRaw != null ? (outputRaw * 1_000_000).toFixed(6) : null,
      tokensPerSecond: null,
      syncSource: "openrouter",
      isActive: true,
      lastSyncedAt: now,
    });
  }

  console.log(`  OpenRouter: ${rows.length} rows mapped to known providers`);
  return rows;
}

// ─── Source 2: EU-native provider adapters ────────────────────────────────────

async function fetchMistralModels(): Promise<ModelRow[]> {
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
          lastSyncedAt: now,
        };
      });
  } catch (e) {
    console.warn(`  Mistral adapter failed: ${e}`);
    return [];
  }
}

async function fetchScalewayModels(): Promise<ModelRow[]> {
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
          lastSyncedAt: now,
        };
      });
  } catch (e) {
    console.warn(`  Scaleway adapter failed: ${e}`);
    return [];
  }
}

async function fetchOVHcloudModels(): Promise<ModelRow[]> {
  console.log("OVHcloud: no public pricing API — using manual seed");
  const now = new Date();
  // Source: https://endpoints.ai.cloud.ovh.net/
  const SEED = [
    { id: "meta-llama__Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct", i: 0.06, o: 0.06, ctx: 131072 },
    { id: "meta-llama__Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B Instruct", i: 0.59, o: 0.59, ctx: 131072 },
    { id: "meta-llama__Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct", i: 0.59, o: 0.59, ctx: 131072 },
    { id: "mistralai__Mistral-7B-Instruct-v0.3", name: "Mistral 7B Instruct", i: 0.06, o: 0.06, ctx: 32768 },
    { id: "mistralai__Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B Instruct", i: 0.59, o: 0.59, ctx: 32768 },
    { id: "mistralai__Mixtral-8x22B-Instruct-v0.1", name: "Mixtral 8x22B Instruct", i: 1.19, o: 1.19, ctx: 65536 },
    { id: "deepseek-ai__DeepSeek-R1", name: "DeepSeek R1", i: 1.98, o: 7.92, ctx: 65536 },
  ];
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
    lastSyncedAt: now,
  }));
}

async function fetchBergetModels(): Promise<ModelRow[]> {
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
        displayName: m.name ?? m.id,
        modality,
        contextWindow: null,
        inputPricePerMTokens: inputRaw != null ? (inputRaw * 1_000_000).toFixed(6) : null,
        outputPricePerMTokens: outputRaw != null ? (outputRaw * 1_000_000).toFixed(6) : null,
        tokensPerSecond: null,
        syncSource: "provider_api",
        isActive: true,
        lastSyncedAt: now,
      };
    });
  } catch (e) {
    console.warn(`  Berget AI adapter failed: ${e}`);
    return [];
  }
}

async function fetchStackitModels(): Promise<ModelRow[]> {
  console.log("Fetching Stackit model catalog…");
  const apiKey = process.env.STACKIT_API_KEY;
  if (!apiKey) {
    console.warn("  Stackit adapter skipped: STACKIT_API_KEY not set");
    return [];
  }
  try {
    const res = await fetch(
      "https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1/models",
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
        lastSyncedAt: now,
      }));
  } catch (e) {
    console.warn(`  Stackit adapter failed: ${e}`);
    return [];
  }
}

async function fetchAlephAlphaModels(): Promise<ModelRow[]> {
  console.log("Aleph Alpha: no public pricing API — using manual seed");
  const now = new Date();
  // Source: https://docs.aleph-alpha.com/  Prices: https://aleph-alpha.com/pricing/
  const SEED = [
    { id: "luminous-supreme-control", name: "Luminous Supreme Control", i: 87.5, o: 87.5, ctx: 2048 },
    { id: "luminous-supreme", name: "Luminous Supreme", i: 52.5, o: 52.5, ctx: 2048 },
    { id: "luminous-extended-control", name: "Luminous Extended Control", i: 27.5, o: 27.5, ctx: 2048 },
    { id: "luminous-extended", name: "Luminous Extended", i: 17.5, o: 17.5, ctx: 2048 },
    { id: "luminous-base-control", name: "Luminous Base Control", i: 10.5, o: 10.5, ctx: 2048 },
    { id: "luminous-base", name: "Luminous Base", i: 7.0, o: 7.0, ctx: 2048 },
  ];
  return SEED.map((m) => ({
    id: `aleph-alpha/${m.id}`,
    providerSlug: "aleph-alpha",
    displayName: m.name,
    modality: "text",
    contextWindow: m.ctx,
    inputPricePerMTokens: m.i.toFixed(6),
    outputPricePerMTokens: m.o.toFixed(6),
    tokensPerSecond: null,
    syncSource: "manual",
    isActive: true,
    lastSyncedAt: now,
  }));
}

// ─── Adapter registry ─────────────────────────────────────────────────────────

export const PROVIDER_ADAPTERS: Record<string, () => Promise<ModelRow[]>> = {
  openrouter: fetchOpenRouterModels,
  mistral: fetchMistralModels,
  scaleway: fetchScalewayModels,
  "ovhcloud-ai-endpoints": fetchOVHcloudModels,
  "berget-ai": fetchBergetModels,
  stackit: fetchStackitModels,
  "aleph-alpha": fetchAlephAlphaModels,
};

// ─── Upsert ───────────────────────────────────────────────────────────────────

async function upsertModels(
  db: ReturnType<typeof drizzle>,
  rows: ModelRow[],
  providerSlug: string,
): Promise<{ upserted: number; deactivated: number }> {
  if (rows.length === 0) return { upserted: 0, deactivated: 0 };

  const BATCH = 100;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db
      .insert(schema.models)
      .values(batch)
      .onConflictDoUpdate({
        target: [schema.models.id, schema.models.providerSlug],
        set: {
          displayName: schema.models.displayName,
          modality: schema.models.modality,
          contextWindow: schema.models.contextWindow,
          inputPricePerMTokens: schema.models.inputPricePerMTokens,
          outputPricePerMTokens: schema.models.outputPricePerMTokens,
          tokensPerSecond: schema.models.tokensPerSecond,
          syncSource: schema.models.syncSource,
          isActive: schema.models.isActive,
          lastSyncedAt: schema.models.lastSyncedAt,
        },
      });
    upserted += batch.length;
  }

  const activeIds = rows.map((r) => r.id);
  let deactivated = 0;

  if (activeIds.length > 0) {
    const result = await db
      .update(schema.models)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.models.providerSlug, providerSlug),
          notInArray(schema.models.id, activeIds),
          eq(schema.models.isActive, true),
        ),
      );
    deactivated = result.rowCount ?? 0;
  }

  return { upserted, deactivated };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface SyncOptions {
  /** Only sync this adapter key (e.g. "scaleway") */
  targetProvider?: string;
  /** Log what would happen without writing to DB */
  dryRun?: boolean;
}

export async function runSync(options: SyncOptions = {}): Promise<void> {
  const { targetProvider, dryRun = false } = options;

  if (targetProvider && !PROVIDER_ADAPTERS[targetProvider]) {
    throw new Error(
      `Unknown provider: "${targetProvider}". Available: ${Object.keys(PROVIDER_ADAPTERS).join(", ")}`,
    );
  }

  const adapters = targetProvider
    ? { [targetProvider]: PROVIDER_ADAPTERS[targetProvider] }
    : PROVIDER_ADAPTERS;

  const db = getDb();

  console.log(`Starting model sync${dryRun ? " (DRY RUN — no DB writes)" : ""}…`);

  for (const [adapterKey, fetchFn] of Object.entries(adapters)) {
    const startedAt = new Date();
    let modelsUpserted = 0;
    let modelsDeactivated = 0;
    let error: string | null = null;

    try {
      const rows = await fetchFn();

      if (dryRun) {
        console.log(`  [dry-run] ${adapterKey}: would upsert ${rows.length} rows`);
        for (const r of rows.slice(0, 3)) {
          console.log(`    ${r.id} (${r.providerSlug}) — $${r.inputPricePerMTokens ?? "?"}/$${r.outputPricePerMTokens ?? "?"} per 1M`);
        }
        if (rows.length > 3) console.log(`    … and ${rows.length - 3} more`);
        continue;
      }

      const byProvider = new Map<string, ModelRow[]>();
      for (const row of rows) {
        const list = byProvider.get(row.providerSlug) ?? [];
        list.push(row);
        byProvider.set(row.providerSlug, list);
      }

      for (const [slug, providerRows] of byProvider.entries()) {
        const { upserted, deactivated } = await upsertModels(db, providerRows, slug);
        modelsUpserted += upserted;
        modelsDeactivated += deactivated;
      }

      console.log(`  ${adapterKey}: upserted ${modelsUpserted}, deactivated ${modelsDeactivated}`);
    } catch (e) {
      error = String(e);
      console.error(`  ${adapterKey}: ERROR — ${error}`);
    }

    if (!dryRun) {
      await db.insert(schema.syncLog).values({
        syncedAt: startedAt,
        providerSlug: adapterKey,
        modelsUpserted,
        modelsDeactivated,
        error,
      });
    }
  }

  console.log("Sync complete.");
}
