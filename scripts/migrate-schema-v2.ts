/**
 * scripts/migrate-schema-v2.ts
 *
 * One-time migration:
 *   1. Removes the `models` field from all provider JSON files.
 *   2. Adds `dataLeavesEuAtInference: null` to dataResidency in all provider
 *      JSON files that have a non-null compliance block.
 *
 * Usage:
 *   bun run scripts/migrate-schema-v2.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DATA_DIR = join(ROOT, "data", "providers");

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

let modified = 0;
let skipped = 0;

for (const file of files) {
  const path = join(DATA_DIR, file);
  const raw = readFileSync(path, "utf-8");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = JSON.parse(raw);

  let changed = false;

  // 1. Remove models field
  if ("models" in data) {
    delete data.models;
    changed = true;
  }

  // 2. Add dataLeavesEuAtInference to dataResidency if compliance exists
  if (data.compliance && data.compliance.dataResidency) {
    if (!("dataLeavesEuAtInference" in data.compliance.dataResidency)) {
      // Insert after euOnly for logical ordering
      const dr = data.compliance.dataResidency;
      const reordered: Record<string, unknown> = {};
      for (const key of Object.keys(dr)) {
        reordered[key] = dr[key];
        if (key === "euOnly") {
          reordered["dataLeavesEuAtInference"] = null;
        }
      }
      data.compliance.dataResidency = reordered;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
    modified++;
  } else {
    skipped++;
  }
}

console.log(`Done. Modified: ${modified}, Skipped (already up-to-date): ${skipped}`);
