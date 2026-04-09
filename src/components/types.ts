// Types shared between ModelRow and ModelTable.
// Defined here to avoid circular imports (bundle-barrel-imports rule).

import type { Model } from "@/db/schema";
import type { AnyProvider } from "@/lib/compliance";

/** A model row enriched with its provider's compliance data. */
export interface ModelWithProvider {
  model: Model;
  provider: AnyProvider | null;
}
