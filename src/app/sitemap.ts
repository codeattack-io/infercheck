// Dynamic sitemap — generates URLs for all static + dynamic pages with hreflang alternates.
// Served at /sitemap.xml (root) as expected by search engines.
//
// Dynamic routes covered:
//   - /[locale]/provider/[slug]   — one per provider JSON file
//   - /[locale]/model/[id]        — one per unique canonicalModelId in the DB

import type { MetadataRoute } from "next";
import { getAllProviders } from "@/lib/providers";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://infercheck.eu";
const LOCALES = routing.locales;

/** Build alternates object for hreflang — one entry per locale. */
function alternates(path: string): Record<string, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, `${BASE_URL}/${l}${path}`]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Static pages — one entry per path with hreflang alternates for all locales
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/${LOCALES[0]}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1.0,
      alternates: { languages: alternates("") },
    },
    {
      url: `${BASE_URL}/${LOCALES[0]}/providers`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
      alternates: { languages: alternates("/providers") },
    },
  ];

  // Provider pages — one entry per provider with hreflang alternates
  const allProviders = getAllProviders();
  const providerPages: MetadataRoute.Sitemap = allProviders.map((p) => ({
    url: `${BASE_URL}/${LOCALES[0]}/provider/${p.slug}`,
    lastModified: p.lastVerified ? new Date(p.lastVerified).toISOString() : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: { languages: alternates(`/provider/${p.slug}`) },
  }));

  // Model pages — one entry per canonicalModelId with hreflang alternates
  const activeModels = await db
    .selectDistinct({ canonicalModelId: models.canonicalModelId })
    .from(models)
    .where(eq(models.isActive, true));

  const modelPages: MetadataRoute.Sitemap = activeModels
    .filter((m) => m.canonicalModelId)
    .map((m) => {
      const encoded = encodeURIComponent(m.canonicalModelId!);
      return {
        url: `${BASE_URL}/${LOCALES[0]}/model/${encoded}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: { languages: alternates(`/model/${encoded}`) },
      };
    });

  return [...staticPages, ...providerPages, ...modelPages];
}
