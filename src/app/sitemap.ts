// Dynamic sitemap — generates URLs for all static + dynamic pages.
// Next.js App Router convention: export default function from app/sitemap.ts
// Returns MetadataRoute.Sitemap (array of SitemapEntry objects).
//
// Dynamic routes covered:
//   - /provider/[slug]   — one per provider JSON file (111 providers)
//   - /model/[id]        — one per unique model suffix in the DB

import type { MetadataRoute } from "next";
import { getAllProviders } from "@/lib/providers";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://gdpr-ai.directory";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/providers`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  // Provider pages — one per JSON file
  const allProviders = getAllProviders();
  const providerPages: MetadataRoute.Sitemap = allProviders.map((p) => ({
    url: `${BASE_URL}/provider/${p.slug}`,
    lastModified: p.lastVerified ? new Date(p.lastVerified).toISOString() : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Model pages — deduplicate by model suffix (strip provider prefix)
  const activeModels = await db
    .selectDistinct({ id: models.id, displayName: models.displayName })
    .from(models)
    .where(eq(models.isActive, true));

  const modelSuffixes = new Set<string>();
  const modelPages: MetadataRoute.Sitemap = [];

  for (const m of activeModels) {
    // Strip provider prefix — "anthropic/claude-sonnet-4-6" → "claude-sonnet-4-6"
    const suffix = m.id.includes("/") ? m.id.split("/").pop()! : m.id;
    if (!modelSuffixes.has(suffix)) {
      modelSuffixes.add(suffix);
      modelPages.push({
        url: `${BASE_URL}/model/${encodeURIComponent(suffix)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
  }

  return [...staticPages, ...providerPages, ...modelPages];
}
