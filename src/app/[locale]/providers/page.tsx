// /providers — browsable list of all providers, grouped by compliance tier.
// React Server Component — data loaded at request time via file-system + DB.

import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProviderCard } from "@/components/ProviderCard";
import { getAllProviders, getLocalizedProvider } from "@/lib/providers";
import { getComplianceTier } from "@/lib/compliance";
import type { AnyProvider, ComplianceTier } from "@/lib/compliance";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProvidersPage" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const getModelCountsByProvider = cache(async (): Promise<Map<string, number>> => {
  const rows = await db
    .select({
      providerSlug: models.providerSlug,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(models)
    .where(eq(models.isActive, true))
    .groupBy(models.providerSlug);

  return new Map(rows.map((r) => [r.providerSlug, r.count]));
});

// ─── Tier grouping config ──────────────────────────────────────────────────────

const TIER_ORDER: ComplianceTier[] = ["compliant", "partial", "noncompliant", "unverified"];

const TIER_COLOR: Record<ComplianceTier, string> = {
  compliant: "var(--color-compliant)",
  partial: "var(--color-partial)",
  noncompliant: "var(--color-noncompliant)",
  unverified: "var(--color-unverified)",
};

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(allProviders: AnyProvider[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "InferCheck — Provider Compliance Dataset",
    "description":
      "Structured compliance metadata for AI inference providers. Fields include EU data residency, DPA availability, training policy, certifications, and EU AI Act status.",
    "url": "https://infercheck.eu/providers",
    "license": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "creator": {
      "@type": "Person",
      "name": "Carlo Noelle",
      "url": "https://infercheck.eu",
    },
    "hasPart": allProviders.slice(0, 50).map((p) => ({
      "@type": "Organization",
      "name": p.name,
      "url": p.website,
    })),
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProvidersPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [allProviders, modelCounts] = await Promise.all([
    Promise.resolve(getAllProviders()),
    getModelCountsByProvider(),
  ]);
  const localizedProviders = allProviders.map((p) => getLocalizedProvider(p, locale));
  const t = await getTranslations("ProvidersPage");

  // Group by tier
  const grouped = new Map<ComplianceTier, AnyProvider[]>();
  for (const tier of TIER_ORDER) {
    grouped.set(tier, []);
  }
  for (const p of localizedProviders) {
    const tier = getComplianceTier(p);
    grouped.get(tier)!.push(p);
  }

  // Sort each group alphabetically
  for (const [, group] of grouped) {
    group.sort((a, b) => a.name.localeCompare(b.name));
  }

  const totalVerified = allProviders.filter(
    (p) => p.verifiedBy !== "stub" && p.compliance !== null,
  ).length;

  const jsonLd = buildJsonLd(allProviders);

  // Build tier meta with translated strings
  const TIER_META: Record<ComplianceTier, { label: string; description: string; color: string }> = {
    compliant: { label: t("tiers.compliant.label"), description: t("tiers.compliant.description"), color: TIER_COLOR.compliant },
    partial: { label: t("tiers.partial.label"), description: t("tiers.partial.description"), color: TIER_COLOR.partial },
    noncompliant: { label: t("tiers.noncompliant.label"), description: t("tiers.noncompliant.description"), color: TIER_COLOR.noncompliant },
    unverified: { label: t("tiers.unverified.label"), description: t("tiers.unverified.description"), color: TIER_COLOR.unverified },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-[1200px] mx-auto flex-1 w-full box-border px-4 sm:px-6 lg:px-10 py-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-display text-[2.5rem] font-normal text-heading leading-[1.15] m-0 mb-3 tracking-[-0.02em]">
            {t("heading1")}<br />
            {t("heading2")}
          </h1>
          <p className="font-body text-[0.9375rem] text-text-secondary m-0 max-w-[55ch] leading-[1.6]">
            {t("subheading", { providerCount: allProviders.length, verifiedCount: totalVerified })}
          </p>
        </div>

        {/* Tier sections */}
        <div className="flex flex-col gap-12">
          {TIER_ORDER.map((tier) => {
            const group = grouped.get(tier)!;
            if (group.length === 0) return null;
            const meta = TIER_META[tier];

            return (
              <section key={tier} aria-labelledby={`tier-${tier}`}>
                {/* Tier header */}
                <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-border">
                  {/* Dot color is dynamic from meta.color — kept as style */}
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0 relative top-[-1px]"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden="true"
                  />
                  <h2
                    id={`tier-${tier}`}
                    className="font-body text-base font-semibold text-text-primary m-0"
                  >
                    {meta.label}
                    <span className="font-body text-sm font-normal text-text-muted ml-2">
                      ({group.length})
                    </span>
                  </h2>
                  <span className="font-body text-[0.8125rem] text-text-muted">
                    {meta.description}
                  </span>
                </div>

                {/* Provider grid */}
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
                >
                  {group.map((p) => (
                    <ProviderCard
                      key={p.slug}
                      provider={p}
                      modelCount={modelCounts.get(p.slug)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
