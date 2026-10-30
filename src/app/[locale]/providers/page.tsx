import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProviderBrowser } from "@/components/ProviderBrowser";
import { getAllProviders, getListProvider, getLocalizedProvider } from "@/lib/providers";
import { getComplianceTier } from "@/lib/compliance";
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

function sortByTier(providers: AnyProvider[], locale: string): AnyProvider[] {
  const rank = new Map(providers.map((p) => [p.slug, TIER_ORDER.indexOf(getComplianceTier(p))]));
  return [...providers].sort(
    (a, b) => rank.get(a.slug)! - rank.get(b.slug)! || a.name.localeCompare(b.name, locale, { sensitivity: "base" })
  );
}

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

  const allProviders = getAllProviders();
  const modelCounts = await getModelCountsByProvider();
  const providers = sortByTier(
    allProviders.map((p) => getListProvider(getLocalizedProvider(p, locale))),
    locale
  );

  const t = await getTranslations("ProvidersPage");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(allProviders)) }}
      />
      <main className="page-width flex-1">
        <h1 className="m-0 pt-5 pb-3.5 md:pt-7 md:pb-5">{t("heading")}</h1>
        <ProviderBrowser
          items={providers.map((provider) => ({ provider, modelCount: modelCounts[provider.slug] ?? 0 }))}
        />
      </main>
    </>
  );
}
