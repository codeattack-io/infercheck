/**
 * scripts/sync-models.ts
 *
 * CLI entry point for the model catalog sync.
 * The sync logic lives in src/lib/sync/run.ts — this file is a thin wrapper
 * that handles CLI args and calls runSync().
 *
 * Usage:
 *   DATABASE_URL=... bun run scripts/sync-models.ts
 *   DATABASE_URL=... bun run scripts/sync-models.ts --provider=scaleway
 *   DATABASE_URL=... bun run scripts/sync-models.ts --dry-run
 */

import { runSync } from "../src/lib/sync/run";

const dryRun = process.argv.includes("--dry-run");
const targetProvider = process.argv.find((a) => a.startsWith("--provider="))?.split("=")[1];

runSync({ targetProvider, dryRun })
  .then(({ failures }) => {
    if (failures.length > 0) {
      console.error(`Failed adapters: ${failures.map((f) => f.adapter).join(", ")}`);
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
