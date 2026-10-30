// /providers — browsable list of all providers, grouped by compliance tier.
// React Server Component — provider JSON plus cached model counts from the DB.

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProviderCard } from "@/components/ProviderCard";
import { getAllProviders, getLocalizedProvider } from "@/lib/providers";
import { getComplianceTier, TIER_CLASSES } from "@/lib/compliance";
import { TierIcon } from "@/components/ComplianceBadge";
import type { AnyProvider, ComplianceTier } from "@/lib/compliance";
import { getModelCountsByProvider } from "@/lib/models";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProvidersPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/providers`,
      languages: {
        en: "https://infercheck.eu/en/providers",
        de: "https://infercheck.eu/de/providers",
        "x-default": "https://infercheck.eu/en/providers",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

const TIER_ORDER: ComplianceTier[] = ["compliant", "partial", "noncompliant", "unverified"];

function buildJsonLd(allProviders: AnyProvider[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "InferCheck — Provider Compliance Dataset",
    description:
      "Structured compliance metadata for AI inference providers. Fields include EU data residency, DPA availability, training policy, certifications, and EU AI Act status.",
    url: "https://infercheck.eu/providers",
    license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    creator: {
      "@type": "Person",
      name: "Carlo Noelle",
      url: "https://infercheck.eu",
    },
    hasPart: allProviders.slice(0, 50).map((p) => ({
      "@type": "Organization",
      name: p.name,
      url: p.website,
    })),
  };
}

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

  const totalVerified = allProviders.filter((p) => p.verifiedBy !== "stub" && p.compliance !== null).length;

  const jsonLd = buildJsonLd(allProviders);

  // Build tier meta with translated strings
  const TIER_META: Record<ComplianceTier, { label: string; description: string }> = {
    compliant: { label: t("tiers.compliant.label"), description: t("tiers.compliant.description") },
    partial: { label: t("tiers.partial.label"), description: t("tiers.partial.description") },
    noncompliant: { label: t("tiers.noncompliant.label"), description: t("tiers.noncompliant.description") },
    unverified: { label: t("tiers.unverified.label"), description: t("tiers.unverified.description") },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="page-width flex-1 py-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="m-0 mb-3">
            {t("heading1")}
            <br />
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
                  <TierIcon tier={tier} className={`size-3 shrink-0 ${TIER_CLASSES[tier].text}`} />
                  <h2 id={`tier-${tier}`} className="font-body text-base font-semibold text-text-primary m-0">
                    {meta.label}
                    <span className="font-body text-sm font-normal text-text-muted ml-2">({group.length})</span>
                  </h2>
                  <span className="font-body text-[0.8125rem] text-text-muted">{meta.description}</span>
                </div>

                {/* Provider grid */}
                <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                  {group.map((p) => (
                    <ProviderCard key={p.slug} provider={p} modelCount={modelCounts[p.slug]} />
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
