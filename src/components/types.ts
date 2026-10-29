// Types shared between ModelRow and ModelTable.
// Defined here to avoid circular imports (bundle-barrel-imports rule).

import type { Model } from "@/db/schema";
import type { AnyProvider } from "@/lib/compliance";

/** The model columns the home page table renders. */
export type CatalogModel = Pick<
  Model,
  | "id"
  | "providerSlug"
  | "displayName"
  | "canonicalModelId"
  | "inputPricePerMTokens"
  | "outputPricePerMTokens"
  | "isNativeModel"
>;

/** The model columns the provider page table renders. */
export type ProviderModel = CatalogModel & Pick<Model, "modality" | "contextWindow">;

/** A model row enriched with its provider's compliance data. */
export interface ModelWithProvider {
  model: CatalogModel;
  provider: AnyProvider | null;
}
