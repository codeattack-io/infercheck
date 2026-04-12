/**
 * src/lib/sync/db.ts
 *
 * Database client and upsert logic for the sync pipeline.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, notInArray, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { ModelRow } from "./types";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is required");
  return drizzle(neon(url), { schema });
}

export async function upsertModels(
  db: ReturnType<typeof getDb>,
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
