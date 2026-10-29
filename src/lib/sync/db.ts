/**
 * src/lib/sync/db.ts
 *
 * Database client and upsert logic for the sync pipeline.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, ne, and, notInArray, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { ModelRow } from "./types";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is required");
  return drizzle(neon(url), { schema });
}

/**
 * OpenRouter rows and provider-adapter rows of the same provider are owned
 * separately: each side only deactivates its own rows.
 */
function ownedRows(syncSource: string) {
  return syncSource === "openrouter"
    ? eq(schema.models.syncSource, "openrouter")
    : ne(schema.models.syncSource, "openrouter");
}

/**
 * Upserts one adapter's rows for one provider. On an (id, provider_slug)
 * conflict a provider-adapter row is never overwritten by an OpenRouter row.
 */
export async function upsertModels(
  db: ReturnType<typeof getDb>,
  rows: ModelRow[],
  providerSlug: string
): Promise<{ upserted: number; deactivated: number; failed: Array<{ id: string; error: unknown }> }> {
  if (rows.length === 0) return { upserted: 0, deactivated: 0, failed: [] };

  const upsert = (values: ModelRow[]) =>
    db
      .insert(schema.models)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.models.id, schema.models.providerSlug],
        set: {
          canonicalModelId: sql`excluded.canonical_model_id`,
          displayName: sql`excluded.display_name`,
          modality: sql`excluded.modality`,
          contextWindow: sql`excluded.context_window`,
          inputPricePerMTokens: sql`excluded.input_price_per_m_tokens`,
          outputPricePerMTokens: sql`excluded.output_price_per_m_tokens`,
          tokensPerSecond: sql`excluded.tokens_per_second`,
          syncSource: sql`excluded.sync_source`,
          isActive: sql`excluded.is_active`,
          isNativeModel: sql`excluded.is_native_model`,
          lastSyncedAt: sql`excluded.last_synced_at`,
        },
        setWhere: sql`excluded.sync_source <> 'openrouter' or ${schema.models.syncSource} = 'openrouter'`,
      });

  const BATCH = 100;
  let upserted = 0;
  const failed: Array<{ id: string; error: unknown }> = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    try {
      await upsert(batch);
      upserted += batch.length;
    } catch {
      for (const row of batch) {
        try {
          await upsert([row]);
          upserted++;
        } catch (error) {
          failed.push({ id: row.id, error });
        }
      }
    }
  }

  const listedIds = rows.map((r) => r.id);
  const result = await db
    .update(schema.models)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.models.providerSlug, providerSlug),
        ownedRows(rows[0].syncSource),
        notInArray(schema.models.id, listedIds),
        eq(schema.models.isActive, true)
      )
    );

  return { upserted, deactivated: result.rowCount ?? 0, failed };
}

/**
 * Deactivates active rows from `syncSource` whose provider slug is not in
 * `providerSlugs`, so providers an adapter stops emitting leave the catalog.
 */
export async function deactivateUnlistedProviders(
  db: ReturnType<typeof getDb>,
  syncSource: string,
  providerSlugs: string[]
): Promise<number> {
  if (providerSlugs.length === 0) return 0;

  const result = await db
    .update(schema.models)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.models.syncSource, syncSource),
        notInArray(schema.models.providerSlug, providerSlugs),
        eq(schema.models.isActive, true)
      )
    );

  return result.rowCount ?? 0;
}
