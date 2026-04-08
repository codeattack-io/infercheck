import { eq, ilike, and, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import type { Model } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A model row enriched with its provider's compliance data (joined in-app). */
export type ModelWithProvider = Model & {
  // Provider compliance fields are loaded separately from JSON files
  // and joined in application code — see getModelsForDisplay().
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Search for models by display name or model ID.
 * Returns all active rows matching the query, across all providers.
 * Used for the main search box.
 */
export async function searchModels(query: string): Promise<Model[]> {
  const term = `%${query}%`;
  return db
    .select()
    .from(models)
    .where(
      and(
        eq(models.isActive, true),
        ilike(models.displayName, term),
      ),
    )
    .orderBy(models.displayName)
    .limit(50);
}

/**
 * Get all active providers offering a specific model ID.
 * Used for the /model/[id] detail page to show "available from these providers".
 *
 * Model IDs include the provider prefix (e.g. "anthropic/claude-sonnet-4-6"),
 * so we match by the model portion after the slash for cross-provider lookup.
 *
 * Example: searching for "claude-sonnet-4-6" should return rows from both
 * "anthropic" (anthropic/claude-sonnet-4-6) and "amazon-bedrock"
 * (anthropic/claude-sonnet-4-6 hosted on Bedrock).
 */
export async function getProvidersByModelSuffix(modelSuffix: string): Promise<Model[]> {
  return db
    .select()
    .from(models)
    .where(
      and(
        eq(models.isActive, true),
        sql`${models.id} LIKE ${"%" + modelSuffix}`,
      ),
    )
    .orderBy(models.providerSlug);
}

/**
 * Get all active models for a specific provider.
 * Used on the /provider/[slug] detail page.
 */
export async function getModelsByProvider(providerSlug: string): Promise<Model[]> {
  return db
    .select()
    .from(models)
    .where(
      and(
        eq(models.providerSlug, providerSlug),
        eq(models.isActive, true),
      ),
    )
    .orderBy(models.displayName);
}

/**
 * Get all unique active model display names for autocomplete suggestions.
 * Returns deduplicated names (since the same model appears at multiple providers).
 */
export async function getAllModelSuggestions(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ displayName: models.displayName })
    .from(models)
    .where(eq(models.isActive, true))
    .orderBy(models.displayName)
    .limit(500);
  return rows.map((r) => r.displayName);
}

/**
 * Get the last successful sync timestamp for a provider.
 * Useful for showing data freshness on the UI.
 */
export async function getLastSyncedAt(providerSlug: string): Promise<Date | null> {
  const rows = await db
    .select({ lastSyncedAt: models.lastSyncedAt })
    .from(models)
    .where(
      and(
        eq(models.providerSlug, providerSlug),
        eq(models.isActive, true),
        isNotNull(models.lastSyncedAt),
      ),
    )
    .orderBy(sql`${models.lastSyncedAt} DESC`)
    .limit(1);
  return rows[0]?.lastSyncedAt ?? null;
}
