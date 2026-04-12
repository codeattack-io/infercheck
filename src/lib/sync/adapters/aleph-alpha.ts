/**
 * src/lib/sync/adapters/aleph-alpha.ts
 *
 * Aleph Alpha adapter — intentionally returns [] because the public inference
 * API has been retired. The provider pivoted to bespoke enterprise/government
 * SLLMs (PhariaAI) in 2024; /models_available is deprecated and unreachable.
 * The provider JSON (data/providers/aleph-alpha.json) documents this.
 * Returning [] ensures the upsert skips aleph-alpha without deactivating rows.
 */

import type { ModelRow } from "../types";

export async function fetchAlephAlphaModels(): Promise<ModelRow[]> {
  console.log("Aleph Alpha: public inference API retired — skipping");
  return [];
}
