/**
 * scripts/promote-to-prod.ts
 *
 * Promotes dev DB data to production:
 *   1. Runs Drizzle migrations against prod DB
 *   2. pg_dump from dev DB → pg_restore into prod DB (data-only, all tables)
 *
 * Requires pg_dump / pg_restore on PATH (comes with PostgreSQL client tools).
 * On macOS: brew install libpq && brew link --force libpq
 * On Debian/Ubuntu: apt install postgresql-client
 *
 * Usage:
 *   bun run scripts/promote-to-prod.ts
 *   bun run scripts/promote-to-prod.ts --skip-migrate   (skip Drizzle migrate step)
 *   bun run scripts/promote-to-prod.ts --skip-data      (only run migrations)
 *   bun run scripts/promote-to-prod.ts --dry-run        (print commands, execute nothing)
 *   bun run scripts/promote-to-prod.ts --yes            (skip confirmation prompt, for CI)
 *
 * Env vars (from .env.local):
 *   DATABASE_URL       — dev (source) Neon connection string
 *   DATABASE_URL_PROD  — prod (target) Neon connection string
 */

import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import { spawnSync } from "child_process";
import { readSync } from "fs";

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------

expand(config({ path: path.resolve(process.cwd(), ".env.local") }));
expand(config({ path: path.resolve(process.cwd(), ".env") }));

// ---------------------------------------------------------------------------
// Parse flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipMigrate = args.includes("--skip-migrate");
const skipData = args.includes("--skip-data");
const yes = args.includes("--yes") || process.env.CI === "true";

// ---------------------------------------------------------------------------
// Validate env
// ---------------------------------------------------------------------------

const devUrl = process.env.DATABASE_URL;
const prodUrl = process.env.DATABASE_URL_PROD;

if (!devUrl) {
  console.error("ERROR: DATABASE_URL not set (dev DB source)");
  process.exit(1);
}

if (!prodUrl) {
  console.error("ERROR: DATABASE_URL_PROD not set (prod DB target)");
  process.exit(1);
}

if (devUrl === prodUrl) {
  console.error("ERROR: DATABASE_URL and DATABASE_URL_PROD are identical — aborting to prevent self-overwrite");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(label: string, cmd: string, args: string[], env?: Record<string, string>): void {
  console.log(`\n▶ ${label}`);
  if (dryRun) {
    console.log(`  [dry-run] ${cmd} ${args.join(" ")}`);
    return;
  }

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

  if (result.error) {
    console.error(`ERROR: failed to spawn '${cmd}': ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`ERROR: '${cmd}' exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

function checkTool(name: string): void {
  const result = spawnSync("which", [name], { stdio: "pipe" });
  if (result.status !== 0) {
    console.error(
      `ERROR: '${name}' not found on PATH.\n` +
        `  macOS: brew install libpq && brew link --force libpq\n` +
        `  Linux: apt install postgresql-client`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Confirmation gate (non-dry-run only)
// ---------------------------------------------------------------------------

if (!dryRun && !yes) {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║              PROMOTE DEV  →  PROD                       ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  This will OVERWRITE all data in the prod database.      ║");
  console.log("║  Existing prod rows will be deleted and replaced with     ║");
  console.log("║  a full copy of the dev database.                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  DEV  (source): ${devUrl.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`  PROD (target): ${prodUrl.replace(/:[^:@]+@/, ":***@")}`);
  console.log('\nType "promote" to confirm, anything else to abort:');

  // Read synchronous stdin line via Bun
  const buf = Buffer.alloc(256);
  const bytesRead = readSync(0, buf, 0, buf.length, null);
  const answer = buf.subarray(0, bytesRead).toString().trim();
  if (answer !== "promote") {
    console.log("Aborted.");
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Step 1: Drizzle migrate against prod
// ---------------------------------------------------------------------------

if (!skipMigrate) {
  run(
    "Running Drizzle migrations against prod DB",
    "bun",
    ["run", "db:migrate"],
    { DATABASE_URL: prodUrl }
  );
  console.log("✓ Migrations applied");
} else {
  console.log("⏭  Skipping migrations (--skip-migrate)");
}

// ---------------------------------------------------------------------------
// Step 2: pg_dump dev → pg_restore prod
// ---------------------------------------------------------------------------

if (!skipData) {
  if (!dryRun && !yes) {
    checkTool("psql");
    checkTool("pg_dump");
    checkTool("pg_restore");
  }

  // Use custom format (-Fc) for pipe + compression
  // --data-only: skip DDL — schema already handled by migrations
  // --no-owner / --no-privileges: Neon role names differ across projects
  // --disable-triggers: avoid FK constraint errors during restore order
  // Truncate prod tables first so the data-only restore starts clean.
  // (avoids --truncate flag which requires pg17, and --clean which is
  //  incompatible with --data-only)

  run("Truncating prod tables before restore", "psql", [
    prodUrl,
    "-c",
    "TRUNCATE TABLE models, sync_log RESTART IDENTITY CASCADE;",
  ]);

  run("Dumping dev DB and restoring into prod DB (data-only)", "sh", [
    "-c",
    `pg_dump --data-only --no-owner --no-privileges --disable-triggers --exclude-table=__drizzle_migrations -Fc "${devUrl}" | pg_restore --data-only --no-owner --no-privileges --disable-triggers -d "${prodUrl}"`,
  ]);

  console.log("✓ Data promoted to prod");
} else {
  console.log("⏭  Skipping data copy (--skip-data)");
}

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log("\n✅ Promotion complete.");
if (dryRun) console.log("   (dry-run — no changes were made)");
