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

import { Nav } from "@/components/Nav";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
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
      <Nav />

      {/* Disclaimer — below nav per DESIGN.md */}
      <DisclaimerBanner />

      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 40px",
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
        className="px-4 sm:px-6 lg:px-10"
      >
        {/* Page heading */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.5rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              lineHeight: 1.15,
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            AI inference providers,<br />
            filtered by GDPR compliance.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-secondary)",
              margin: 0,
              maxWidth: "55ch",
              lineHeight: 1.6,
            }}
          >
            {items.length > 0
              ? `${allModels.length} models across ${providerMap.size} providers. Filter by compliance profile to find what passes your threshold.`
              : "Browse providers and their compliance posture. Filter by data residency, DPA availability, and training policy."}
          </p>
        </div>

        {/* Filter bar — client component, gets initial state from server */}
        <div style={{ marginBottom: "24px" }}>
          <Suspense fallback={null}>
            <FilterBar filterState={filterState} />
          </Suspense>
        </div>

        {/* Model table — client component, data from server */}
        <Suspense
          fallback={
            <div
              style={{
                padding: "64px 0",
                textAlign: "center",
                fontFamily: "var(--font-body)",
                fontSize: "0.9375rem",
                color: "var(--color-text-muted)",
              }}
            >
              Loading models…
            </div>
          }
        >
          <ModelTable items={items} searchQuery={searchQuery} />
        </Suspense>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "24px 40px",
          marginTop: "auto",
        }}
        className="px-4 sm:px-6 lg:px-10"
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Data licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-link)" }}
            >
              CC BY-NC-SA 4.0
            </a>
            . Code under{" "}
            <a
              href="https://github.com/carlonoelle/gdpr-ai-directory/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-link)" }}
            >
              MIT
            </a>
            .
          </p>
          <a
            href="https://github.com/carlonoelle/gdpr-ai-directory"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
            }}
          >
            GitHub →
          </a>
        </div>
      </footer>
    </>
  );
}
