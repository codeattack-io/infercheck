/**
 * src/lib/sync/run.ts
 *
 * Orchestrates the model catalog sync.
 * Called from:
 *   - /api/cron/sync-models (Vercel Cron)
 *   - scripts/sync-models.ts (CLI / one-off)
 *
 * Sources:
 *   1. OpenRouter /api/v1/models  — covers 300+ models across major providers
 *   2. Per-provider adapters      — EU-native providers not on OpenRouter
 *      (Scaleway, Aleph Alpha, Berget AI, Stackit, OVHcloud, Mistral, Amazon Bedrock)
 */

import { getDb, upsertModels } from "./db";
import type { ModelRow, SyncOptions } from "./types";
import { fetchOpenRouterModels } from "./adapters/openrouter";
import { fetchMistralModels } from "./adapters/mistral";
import { fetchScalewayModels } from "./adapters/scaleway";
import { fetchOVHcloudModels } from "./adapters/ovhcloud";
import { fetchBergetModels } from "./adapters/berget";
import { fetchStackitModels } from "./adapters/stackit";
import { fetchBedrockModels } from "./adapters/bedrock";
import { fetchAlephAlphaModels } from "./adapters/aleph-alpha";
import * as schema from "@/db/schema";

export type { SyncOptions };

// ─── Adapter registry ─────────────────────────────────────────────────────────

export const PROVIDER_ADAPTERS: Record<string, () => Promise<ModelRow[]>> = {
  openrouter: fetchOpenRouterModels,
  mistral: fetchMistralModels,
  scaleway: fetchScalewayModels,
  "ovhcloud-ai-endpoints": fetchOVHcloudModels,
  "berget-ai": fetchBergetModels,
  stackit: fetchStackitModels,
  "amazon-bedrock": fetchBedrockModels,
  "aleph-alpha": fetchAlephAlphaModels,
};

// ─── Main export ──────────────────────────────────────────────────────────────

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
