// Homepage: model-first search + compliance filter.
// React Server Component — data fetched at request time, no client-side loading.
//
// Vercel rules applied:
//   - async-parallel: DB query + provider JSON load run in parallel via Promise.all
//   - server-hoist-static-io: getAllProviders() result is used once and indexed in Map
//   - server-serialization: only serializable data passed to client components
//   - server-cache-react: React.cache wraps DB calls to deduplicate within the request

import { Suspense } from "react";
import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations } from "next-intl/server";

import { FilterBar } from "@/components/FilterBar";
import { filterStateFromSearchParams } from "@/lib/compliance";
import { ModelTable } from "@/components/ModelTable";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAllProviders } from "@/lib/providers";
import type { ModelWithProvider } from "@/components/types";
import type { AnyProvider } from "@/lib/compliance";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "GDPR AI Directory — EU-compliant AI inference providers",
  description:
    "Filter AI inference providers by GDPR compliance status. Compare EU data residency, DPA availability, training policies, and pricing across 100+ providers.",
  openGraph: {
    title: "GDPR AI Directory — EU-compliant AI inference providers",
    description:
      "Filter AI inference providers by GDPR compliance. Compare EU data residency, DPA, training opt-out, and pricing across 100+ providers.",
    type: "website",
    url: "https://gdpr-ai.directory",
  },
};

// ─── Data fetching (React.cache for per-request deduplication) ────────────────

const getActiveModels = cache(async () => {
  return db.select().from(models).where(and(eq(models.isActive, true))).orderBy(models.displayName);
});

// ─── Page ──────────────────────────────────────────────────────────────────────

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const searchQuery = typeof params.q === "string" ? params.q : "";
  const t = await getTranslations("HomePage");

  // Parallel fetch: DB + file system — async-parallel rule
  const [allModels, allProviders] = await Promise.all([
    getActiveModels(),
    Promise.resolve(getAllProviders()),
  ]);

  // Build provider lookup map — js-index-maps rule
  const providerMap = new Map<string, AnyProvider>(
    allProviders.map((p) => [p.slug, p]),
  );

  // Serialize: only pass what client components need — server-serialization rule
  const items: ModelWithProvider[] = allModels.map((model) => ({
    model,
    provider: providerMap.get(model.providerSlug) ?? null,
  }));

  // Reconstruct URLSearchParams for FilterBar initial state
  const urlSearchParams = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [k, v as string]),
  );
  const filterState = filterStateFromSearchParams(urlSearchParams);

  // Homepage JSON-LD: Dataset schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "GDPR AI Directory",
    "description":
      "Structured compliance metadata for AI inference providers — EU data residency, DPA availability, training policy, certifications, and EU AI Act status.",
    "url": "https://gdpr-ai.directory",
    "license": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "creator": {
      "@type": "Person",
      "name": "Carlo Noelle",
    },
    "keywords": [
      "GDPR AI",
      "EU AI compliance",
      "GDPR compliant LLM",
      "EU data residency AI",
      "AI inference GDPR",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-[1200px] mx-auto flex-1 w-full box-border px-4 sm:px-6 lg:px-10 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="font-display text-[2.5rem] font-normal text-heading leading-[1.15] m-0 mb-3 tracking-[-0.02em]">
            {t("heading1")}<br />
            {t("heading2")}
          </h1>
          <p className="font-body text-[0.9375rem] text-text-secondary m-0 max-w-[55ch] leading-[1.6]">
            {items.length > 0
              ? t("subheadingWithData", { modelCount: allModels.length, providerCount: providerMap.size })
              : t("subheadingEmpty")}
          </p>
        </div>

        {/* Filter bar — client component, gets initial state from server */}
        <div className="mb-6">
          <Suspense fallback={null}>
            <FilterBar filterState={filterState} />
          </Suspense>
        </div>

        {/* Model table — client component, data from server */}
        <Suspense
          fallback={
            <div className="py-16 text-center font-body text-[0.9375rem] text-text-muted">
              {t("loadingModels")}
            </div>
          }
        >
          <ModelTable items={items} searchQuery={searchQuery} />
        </Suspense>
      </main>
    </>
  );
}
