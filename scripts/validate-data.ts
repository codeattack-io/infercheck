/**
 * scripts/validate-data.ts
 *
 * Validates all JSON files in data/providers/ against the schema.
 * Stubs (verifiedBy: "stub") are validated against ProviderStubSchema.
 * Full profiles are validated against ProviderSchema.
 *
 * Exits with code 1 if any file fails validation — suitable for CI.
 *
 * Usage: bun run validate
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { ProviderSchema, ProviderStubSchema } from "../data/schema";
import type { ZodError } from "zod";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DATA_DIR = join(ROOT, "data", "providers");

const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatZodError(err: ZodError): string {
  return err.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  let files: string[];
  try {
    files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`data/providers/ directory not found. Run "bun run import" first.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No provider JSON files found. Run "bun run import" first.');
    process.exit(0);
  }

  console.log(`Validating ${files.length} provider files...\n`);

  let valid = 0;
  let invalid = 0;

  const errors: { file: string; message: string }[] = [];

  for (const file of files.sort()) {
    const filePath = join(DATA_DIR, file);
    let raw: unknown;

    try {
      raw = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch (e) {
      errors.push({ file, message: `JSON parse error: ${e}` });
      invalid++;
      continue;
    }

    // Determine which schema to validate against
    const isStub = raw !== null && typeof raw === "object" && (raw as Record<string, unknown>).verifiedBy === "stub";

    const schema = isStub ? ProviderStubSchema : ProviderSchema;
    const result = schema.safeParse(raw);

    if (result.success) {
      if (VERBOSE) {
        console.log(`  [OK]  ${file}`);
      }
      valid++;
    } else {
      const message = formatZodError(result.error);
      errors.push({ file, message });
      invalid++;
    }
  }

  // ── Summary ──
  if (errors.length > 0) {
    console.error(`Validation errors:\n`);
    for (const { file, message } of errors) {
      console.error(`[FAIL] ${file}`);
      console.error(message);
      console.error("");
    }
  }

  console.log(`Results: ${valid} valid, ${invalid} invalid (${files.length} total)`);

  if (invalid > 0) {
    process.exit(1);
  } else {
    console.log("All files valid.");
  }
}

main();
