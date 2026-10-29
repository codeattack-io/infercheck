import "server-only";
import fs from "fs";
import path from "path";
import { ProviderSchema, ProviderStubSchema } from "@/../data/schema";
import type { Provider, ProviderStub, AnyProvider } from "@/../data/schema";
import { isFullProvider } from "@/lib/compliance";

export type { Provider, ProviderStub, AnyProvider };

// Re-export types that client components need from compliance.ts
export type { ComplianceTier, ComplianceFilter, FilterProfile } from "@/lib/compliance";

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
 * Return a provider with locale-specific text fields overlaid from `translations[locale]`
 * and without the `translations` map itself.
 * Falls back to English (the canonical base) for any field not yet translated.
 */
export function getLocalizedProvider(provider: AnyProvider, locale: string): AnyProvider {
  const t = provider.translations?.[locale];
  if (locale === "en" || !t || !isFullProvider(provider)) return { ...provider, translations: undefined };

  return {
    ...provider,
    translations: undefined,
    notes: t.notes ?? provider.notes,
    compliance: {
      ...provider.compliance,
      dataResidency: {
        ...provider.compliance.dataResidency,
        euRegionDetails: t.dataResidency?.euRegionDetails ?? provider.compliance.dataResidency.euRegionDetails,
      },
      dataUsage: {
        ...provider.compliance.dataUsage,
        retentionPolicy: t.dataUsage?.retentionPolicy ?? provider.compliance.dataUsage.retentionPolicy,
        details: t.dataUsage?.details ?? provider.compliance.dataUsage.details,
      },
      euAiAct: {
        ...provider.compliance.euAiAct,
        details: t.euAiAct?.details ?? provider.compliance.euAiAct.details,
      },
    },
  };
}
