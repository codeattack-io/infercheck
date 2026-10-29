import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import type { Model } from "@/db/schema";

/**
 * Get all active models for a specific provider.
 * Used on the /provider/[slug] detail page.
 */
export async function getModelsByProvider(providerSlug: string): Promise<Model[]> {
  return db
    .select()
    .from(models)
    .where(and(eq(models.providerSlug, providerSlug), eq(models.isActive, true)))
    .orderBy(models.displayName);
}
