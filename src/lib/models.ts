import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { modelDisplayName } from "@/lib/format";
import type { CatalogModel, ProviderModel } from "@/components/types";

function byDisplayName<T extends { displayName: string }>(rows: T[]): T[] {
  return rows.toSorted((a, b) =>
    modelDisplayName(a.displayName).localeCompare(modelDisplayName(b.displayName), "en", { sensitivity: "base" })
  );
}

function toCatalogModel(row: ProviderModel): CatalogModel {
  return {
    id: row.id,
    providerSlug: row.providerSlug,
    displayName: row.displayName,
    canonicalModelId: row.canonicalModelId,
    inputPricePerMTokens: row.inputPricePerMTokens,
    outputPricePerMTokens: row.outputPricePerMTokens,
    priceCurrency: row.priceCurrency,
    isNativeModel: row.isNativeModel,
  };
}

/** Cache tag for every read of the `models` table; invalidated after a model sync. */
export const MODELS_CACHE_TAG = "models";

/**
 * Every active model row, read from Postgres once and kept in the shared remote cache until
 * tag `models` is revalidated; all reads below derive from it.
 */
async function getActiveModels(): Promise<ProviderModel[]> {
  "use cache: remote";
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
    .where(eq(models.isActive, true))
    .orderBy(models.displayName, models.providerSlug);
}

/** Active models with the columns the home page table renders. */
export async function getCatalogModels(): Promise<CatalogModel[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  return byDisplayName((await getActiveModels()).map(toCatalogModel));
}

/** Active models of one provider, for /provider/[slug]. */
export async function getModelsByProvider(providerSlug: string): Promise<ProviderModel[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  return byDisplayName((await getActiveModels()).filter((row) => row.providerSlug === providerSlug));
}

/** Active rows of one canonical model across all providers, ordered by provider slug, for /model/[id]. */
export async function getModelOffers(canonicalModelId: string): Promise<CatalogModel[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  return (await getActiveModels())
    .filter((row) => row.canonicalModelId === canonicalModelId)
    .toSorted((a, b) => (a.providerSlug < b.providerSlug ? -1 : a.providerSlug > b.providerSlug ? 1 : 0))
    .map(toCatalogModel);
}

/** Distinct canonical ids of all active models. */
export async function getCanonicalModelIds(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  const ids = new Set((await getActiveModels()).flatMap((row) => (row.canonicalModelId ? [row.canonicalModelId] : [])));
  return [...ids].toSorted();
}

/** Number of active models per provider slug. */
export async function getModelCountsByProvider(): Promise<Record<string, number>> {
  "use cache";
  cacheLife("hours");
  cacheTag(MODELS_CACHE_TAG);

  const counts: Record<string, number> = {};
  for (const row of await getActiveModels()) counts[row.providerSlug] = (counts[row.providerSlug] ?? 0) + 1;
  return counts;
}
