// Dynamic sitemap — generates URLs for all static + dynamic pages, per locale.
// Next.js App Router convention: export default function from app/[locale]/sitemap.ts
// Returns MetadataRoute.Sitemap with hreflang alternates for all supported locales.
//
// Dynamic routes covered:
//   - /[locale]/provider/[slug]   — one per provider JSON file (111 providers)
//   - /[locale]/model/[id]        — one per unique model suffix in the DB

import type { MetadataRoute } from "next";
import { getAllProviders } from "@/lib/providers";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://gdpr-ai.directory";
const LOCALES = routing.locales;

/** Build alternates object for hreflang — one entry per locale. */
function alternates(path: string): Record<string, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, `${BASE_URL}/${l}${path}`]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Static pages — one entry per locale with hreflang alternates
  const staticPages: MetadataRoute.Sitemap = LOCALES.flatMap((locale) => [
    {
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1.0,
      alternates: { languages: alternates("") },
    },
    {
      url: `${BASE_URL}/${locale}/providers`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
      alternates: { languages: alternates("/providers") },
    },
  ]);

  // Provider pages — one per locale per JSON file
  const allProviders = getAllProviders();
  const providerPages: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    allProviders.map((p) => ({
      url: `${BASE_URL}/${locale}/provider/${p.slug}`,
      lastModified: p.lastVerified ? new Date(p.lastVerified).toISOString() : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: alternates(`/provider/${p.slug}`) },
    })),
  );

  // Model pages — deduplicate by model suffix (strip provider prefix)
  const activeModels = await db
    .selectDistinct({ id: models.id, displayName: models.displayName })
    .from(models)
    .where(eq(models.isActive, true));

  const modelSuffixes = new Set<string>();
  const modelPages: MetadataRoute.Sitemap = [];

  for (const m of activeModels) {
    const suffix = m.id.includes("/") ? m.id.split("/").pop()! : m.id;
    if (!modelSuffixes.has(suffix)) {
      modelSuffixes.add(suffix);
      const encoded = encodeURIComponent(suffix);
      LOCALES.forEach((locale) => {
        modelPages.push({
          url: `${BASE_URL}/${locale}/model/${encoded}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
          alternates: { languages: alternates(`/model/${encoded}`) },
        });
      });
    }
  }

  return [...staticPages, ...providerPages, ...modelPages];
}

