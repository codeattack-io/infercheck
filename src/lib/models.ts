import { eq, and, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import type { CatalogModel, ProviderModel } from "@/components/types";

/** Cache tag for every read of the `models` table; invalidated after a model sync. */
export const MODELS_CACHE_TAG = "models";

/** Active models with the columns the home page table renders. */
export async function getCatalogModels(): Promise<CatalogModel[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  return db
    .select({
      id: models.id,
      providerSlug: models.providerSlug,
      displayName: models.displayName,
      canonicalModelId: models.canonicalModelId,
      inputPricePerMTokens: models.inputPricePerMTokens,
      outputPricePerMTokens: models.outputPricePerMTokens,
      priceCurrency: models.priceCurrency,
      isNativeModel: models.isNativeModel,
    })
    .from(models)
    .where(eq(models.isActive, true))
    .orderBy(models.displayName);
}

/** Active models of one provider, for /provider/[slug]. */
export async function getModelsByProvider(providerSlug: string): Promise<ProviderModel[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  return db
    .select({
      id: models.id,
      providerSlug: models.providerSlug,
      displayName: models.displayName,
      canonicalModelId: models.canonicalModelId,
      modality: models.modality,
      contextWindow: models.contextWindow,
      inputPricePerMTokens: models.inputPricePerMTokens,
      outputPricePerMTokens: models.outputPricePerMTokens,
      priceCurrency: models.priceCurrency,
      isNativeModel: models.isNativeModel,
    })
    .from(models)
    .where(and(eq(models.providerSlug, providerSlug), eq(models.isActive, true)))
    .orderBy(models.displayName);
}

/** Active rows of one canonical model across all providers, for /model/[id]. */
export async function getModelOffers(canonicalModelId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  return db
    .select({
      id: models.id,
      providerSlug: models.providerSlug,
      displayName: models.displayName,
      contextWindow: models.contextWindow,
      inputPricePerMTokens: models.inputPricePerMTokens,
      outputPricePerMTokens: models.outputPricePerMTokens,
      priceCurrency: models.priceCurrency,
      isNativeModel: models.isNativeModel,
    })
    .from(models)
    .where(and(eq(models.isActive, true), eq(models.canonicalModelId, canonicalModelId)))
    .orderBy(models.providerSlug);
}

/** Distinct canonical ids of all active models. */
export async function getCanonicalModelIds(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  const rows = await db
    .selectDistinct({ canonicalModelId: models.canonicalModelId })
    .from(models)
    .where(eq(models.isActive, true));
  return rows.flatMap((r) => (r.canonicalModelId ? [r.canonicalModelId] : []));
}

/** Number of active models per provider slug. */
export async function getModelCountsByProvider(): Promise<Record<string, number>> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  const rows = await db
    .select({
      providerSlug: models.providerSlug,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(models)
    .where(eq(models.isActive, true))
    .groupBy(models.providerSlug);
  return Object.fromEntries(rows.map((r) => [r.providerSlug, r.count]));
}
