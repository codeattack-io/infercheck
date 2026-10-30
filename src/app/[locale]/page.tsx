// Homepage: model-first search + compliance filter.
// React Server Component — prerendered from the cached model catalog; search,
// filters and sort run in the browser over the full list.
//
// Vercel rules applied:
//   - async-parallel: DB query + provider JSON load run in parallel via Promise.all
//   - server-hoist-static-io: getAllProviders() result is used once and indexed in Map
//   - server-serialization: only serializable data passed to client components

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ModelBrowser } from "@/components/ModelBrowser";
import { getCatalogModels } from "@/lib/models";
import { getAllProviders, getLocalizedProvider } from "@/lib/providers";
import type { ModelWithProvider } from "@/components/types";
import type { AnyProvider } from "@/lib/compliance";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}`,
      languages: {
        en: "https://infercheck.eu/en",
        de: "https://infercheck.eu/de",
        "x-default": "https://infercheck.eu/en",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "https://infercheck.eu",
    },
  };
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("HomePage");

  // Parallel fetch: DB + file system — async-parallel rule
  const [allModels, allProviders] = await Promise.all([getCatalogModels(), Promise.resolve(getAllProviders())]);

  // Build provider lookup map — js-index-maps rule
  const providerMap = new Map<string, AnyProvider>(allProviders.map((p) => [p.slug, getLocalizedProvider(p, locale)]));

  // Serialize: only pass what client components need — server-serialization rule
  const items: ModelWithProvider[] = allModels.map((model) => ({
    model,
    provider: providerMap.get(model.providerSlug) ?? null,
  }));

  // Homepage JSON-LD: Dataset schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "InferCheck",
    description:
      "Structured compliance metadata for AI inference providers — EU data residency, DPA availability, training policy, certifications, and EU AI Act status.",
    url: "https://infercheck.eu",
    license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    creator: {
      "@type": "Person",
      name: "Carlo Noelle",
    },
    keywords: ["GDPR AI", "EU AI compliance", "GDPR compliant LLM", "EU data residency AI", "AI inference GDPR"],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="page-width flex-1">
        <h1 className="m-0 pt-7 pb-5 max-md:pt-5 max-md:pb-3.5">{t("heading")}</h1>
        <ModelBrowser items={items} providerCount={allProviders.length} />
      </main>
    </>
  );
}
