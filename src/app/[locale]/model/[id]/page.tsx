import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ModelOffers } from "@/components/ModelOffers";
import { getCanonicalModelIds, getModelOffers } from "@/lib/models";
import { getAllProviders, getLocalizedProvider } from "@/lib/providers";
import type { AnyProvider } from "@/lib/compliance";
import { modelDisplayName } from "@/lib/format";
import type { CatalogModel, ModelWithProvider } from "@/components/types";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

/** The upstream model name ("Claude Sonnet 4.6") rather than a label such as "EU Anthropic Claude Sonnet 4.6" (Bedrock). */
function preferredName(rows: CatalogModel[]): string {
  const row =
    rows.find((r) => r.isNativeModel === true) ?? rows.find((r) => r.providerSlug !== "amazon-bedrock") ?? rows[0];
  return modelDisplayName(row.displayName);
}

export async function generateStaticParams() {
  const ids = await getCanonicalModelIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const decoded = decodeURIComponent(id);

  const rows = await getModelOffers(decoded);
  const name = rows.length > 0 ? preferredName(rows) : decoded;

  const t = await getTranslations({ locale, namespace: "ModelPage" });

  return {
    title: t("title", { modelName: name }),
    description: t("description", { modelName: name }),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/model/${id}`,
      languages: {
        en: `https://infercheck.eu/en/model/${id}`,
        de: `https://infercheck.eu/de/model/${id}`,
        "x-default": `https://infercheck.eu/en/model/${id}`,
      },
    },
    openGraph: {
      title: t("ogTitle", { modelName: name }),
      description: t("ogDescription", { modelName: name }),
      type: "website",
    },
  };
}

export default async function ModelDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const decoded = decodeURIComponent(id);

  const [modelRows, allProviders] = await Promise.all([getModelOffers(decoded), Promise.resolve(getAllProviders())]);

  if (modelRows.length === 0) {
    notFound();
  }

  const t = await getTranslations("ModelPage");
  const tb = await getTranslations("Breadcrumb");

  const providerMap = new Map<string, AnyProvider>(allProviders.map((p) => [p.slug, getLocalizedProvider(p, locale)]));

  const modelName = preferredName(modelRows);

  const items: ModelWithProvider[] = modelRows.map((model) => ({
    model,
    provider: providerMap.get(model.providerSlug) ?? null,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: modelName,
    applicationCategory: "AI Language Model",
    offers: modelRows.map((row) => {
      const provider = providerMap.get(row.providerSlug);
      return {
        "@type": "Offer",
        seller: { "@type": "Organization", name: provider?.name ?? row.providerSlug },
        price: row.inputPricePerMTokens ?? undefined,
        priceCurrency: row.priceCurrency,
      };
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="page-width flex-1 pt-7 max-md:pt-5">
        <Breadcrumb trail={[{ href: "/", label: tb("models") }]} current={modelName} />
        <h1 className="m-0 mt-5">{modelName}</h1>
        <p className="m-0 mt-1.5 mb-5 text-15 text-text-muted max-md:mb-3.5">
          {t("availableFrom", { count: modelRows.length })}
        </p>
        <ModelOffers items={items} modelName={modelName} />
      </main>
    </>
  );
}
