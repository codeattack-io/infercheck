import "server-only";
import fs from "fs";
import path from "path";
import { ProviderSchema, ProviderStubSchema } from "@/../data/schema";
import type { Provider, ProviderStub, AnyProvider } from "@/../data/schema";
import { isFullProvider } from "@/lib/compliance";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { Provider, ProviderStub, AnyProvider };

// Re-export types that client components need from compliance.ts
export type { ComplianceTier, ComplianceFilter, FilterProfile } from "@/lib/compliance";

// ─── File loading ─────────────────────────────────────────────────────────────

const PROVIDERS_DIR = path.join(process.cwd(), "data", "providers");

/**
 * Load and parse a single provider JSON file by slug.
 * Returns null if the file does not exist or fails to parse.
 */
export function getProvider(slug: string): AnyProvider | null {
  const filePath = path.join(PROVIDERS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }

  // Try full schema first, then stub
  const full = ProviderSchema.safeParse(raw);
  if (full.success) return full.data;

  const stub = ProviderStubSchema.safeParse(raw);
  if (stub.success) return stub.data;

  return null;
}

/**
 * Load all provider JSON files from data/providers/.
 * Returns only entries that pass validation (full or stub).
 * Skips malformed files silently in production.
 */
export function getAllProviders(): AnyProvider[] {
  const files = fs.readdirSync(PROVIDERS_DIR).filter((f) => f.endsWith(".json"));
  return files.flatMap((f) => {
    const slug = f.replace(".json", "");
    const p = getProvider(slug);
    return p ? [p] : [];
  });
}

/**
 * Get only fully verified providers (those that pass the full ProviderSchema).
 */
export function getFullProviders(): Provider[] {
  return getAllProviders().filter(isFullProvider);
}
