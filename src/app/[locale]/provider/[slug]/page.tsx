import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { getProvider, getAllProviders, getLocalizedProvider } from "@/lib/providers";
import { getModelsByProvider } from "@/lib/models";
import { getComplianceTier, isFullProvider } from "@/lib/compliance";
import { getVerification } from "@/lib/verification";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { ComplianceFields } from "@/components/ComplianceFields";
import { NeutralPill } from "@/components/NeutralPill";
import { ProviderModelRow } from "@/components/ProviderModelRow";
import { VerificationLabel } from "@/components/VerificationLabel";
import { buttonClass, TABLE_CLASS, TH_CLASS } from "@/lib/styles";
import type { ProviderModel } from "@/components/types";

export async function generateStaticParams() {
  const providers = getAllProviders();
  return providers.map((p) => ({ slug: p.slug }));
}

const getCachedProvider = cache((slug: string) => getProvider(slug));

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const provider = getCachedProvider(slug);
  if (!provider) return {};

  const t = await getTranslations({ locale, namespace: "ProviderPage" });

  const title = t("title", { providerName: provider.name });
  const tv = await getTranslations({ locale, namespace: "Verification" });
  const { kind, date } = getVerification(provider);
  const verificationStatus =
    kind === "ai_draft"
      ? tv.markup("aiDraft", { date: date ?? "", abbr: (chunks) => chunks })
      : tv("verified", { date: date ?? "" });
  const trains = isFullProvider(provider) ? provider.compliance.dataUsage.trainsOnCustomerData : null;
  const description = isFullProvider(provider)
    ? t("descriptionFull", {
        providerName: provider.name,
        euOnly: provider.compliance.dataResidency.euOnly ? t("meta.yes") : t("meta.no"),
        dpa: provider.compliance.dpa.available ? t("meta.available") : t("meta.notAvailable"),
        training: trains === null ? t("meta.unknown") : trains ? t("meta.yes") : t("meta.no"),
        status: verificationStatus,
      })
    : t("descriptionUnverified", { providerName: provider.name });

  return {
    title,
    description,
    alternates: {
      canonical: `https://infercheck.eu/${locale}/provider/${slug}`,
      languages: {
        en: `https://infercheck.eu/en/provider/${slug}`,
        de: `https://infercheck.eu/de/provider/${slug}`,
        "x-default": `https://infercheck.eu/en/provider/${slug}`,
      },
    },
    openGraph: {
      title: t("ogTitle", { providerName: provider.name }),
      description,
      type: "website",
    },
  };
}

export default async function ProviderProfilePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const modelsPromise = getModelsByProvider(slug);
  const rawProvider = getCachedProvider(slug);

  if (!rawProvider) notFound();

  const provider = getLocalizedProvider(rawProvider, locale);

  const t = await getTranslations("ProviderPage");
  const tb = await getTranslations("Breadcrumb");
  const tType = await getTranslations("ProviderType");
  const tBadge = await getTranslations("ComplianceBadge");
  const tFields = await getTranslations("ComplianceFields");

  const tier = getComplianceTier(provider);
  const compliance = isFullProvider(provider) ? provider.compliance : null;

  const providerModels = await modelsPromise;
  const nativeModels = providerModels.filter((m) => m.isNativeModel);
  const gatewayModels = providerModels.filter((m) => !m.isNativeModel);

  const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/codeattack-io/infercheck";
  const reportUrl = `${repoUrl}/issues/new?template=report-change.yml&title=%5BReport%5D+${encodeURIComponent(provider.name)}%3A+&provider=${encodeURIComponent(slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: provider.name,
    url: provider.website,
    ...(compliance
      ? {
          description: t("jsonLdDescription", {
            tier: tBadge(`long.${tier}`),
            dpa: compliance.dpa.available ? t("meta.available") : t("meta.notAvailable"),
          }),
        }
      : {}),
  };

  const answer = (value: boolean | null) =>
    value === null ? tFields("unknownNotStated") : value ? tFields("yes") : tFields("no");
  const dataHandling = compliance
    ? [
        {
          label: t("dataHandling.regions"),
          text: compliance.dataResidency.euOnly
            ? t("dataHandling.euOnly")
            : compliance.dataResidency.regions.join(", ") || "—",
        },
        { label: t("dataHandling.euRouting"), text: compliance.dataResidency.euRegionDetails },
        { label: t("dataHandling.retention"), text: compliance.dataUsage.retentionPolicy },
        { label: t("dataHandling.optOut"), text: answer(compliance.dataUsage.optOutAvailable) },
        { label: t("dataHandling.details"), text: compliance.dataUsage.details },
      ].filter((item): item is { label: string; text: string } => Boolean(item.text))
    : [];
  const sources = provider.sourceUrls ?? [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="page-width flex-1 pt-7 max-md:pt-5">
        <Breadcrumb
          trail={[
            { href: "/", label: tb("models") },
            { href: "/providers", label: tb("providers") },
          ]}
          current={provider.name}
        />

        <div className="mt-5 grid grid-cols-1 gap-y-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-6">
          <h1 className="m-0">{provider.name}</h1>
          <div className="flex flex-wrap gap-2 max-md:order-last max-md:mt-1.5 md:col-start-2 md:row-start-1">
            {provider.apiDocsUrl ? (
              <a
                href={provider.apiDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary")}
              >
                {t("actions.apiDocs")}
              </a>
            ) : null}
            <a href={reportUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              {t("actions.reportChange")}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <ComplianceBadge tier={tier} label="long" compliance={compliance} />
            <span className="text-15 text-text-muted">{tType(provider.type)}</span>
            {provider.website ? (
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-15 text-link hover:text-link-hover"
              >
                {provider.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
              </a>
            ) : null}
          </div>
        </div>

        {compliance === null ? <p className="m-0 mt-7 text-15 text-text-muted">{t("noComplianceData")}</p> : null}

        <div className="mt-7 grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          {compliance ? (
            <>
              <Card id="compliance-heading" title={t("sections.gdprCompliance")}>
                <ComplianceFields compliance={compliance} />
              </Card>

              <Card id="data-handling-heading" title={t("sections.dataHandling")}>
                <div className="flex flex-col gap-3.5">
                  {dataHandling.map((item) => (
                    <div key={item.label}>
                      <h3 className={LABEL_CLASS}>{item.label}</h3>
                      <p className={TEXT_CLASS}>{item.text}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card id="certs-heading" title={t("sections.certsAndEuAiAct")}>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <h3 className={LABEL_CLASS}>{t("certs.certifications")}</h3>
                    {compliance.certifications.length > 0 ? (
                      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                        {compliance.certifications.map((cert) => (
                          <li key={cert}>
                            <NeutralPill surface="alt">{cert}</NeutralPill>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={TEXT_CLASS}>{t("certs.none")}</p>
                    )}
                  </div>
                  <div>
                    <h3 className={LABEL_CLASS}>{t("certs.euAiAct")}</h3>
                    <NeutralPill surface="alt">{tFields(`euAiActStatus.${compliance.euAiAct.status}`)}</NeutralPill>
                    {compliance.euAiAct.details ? (
                      <p className={`${TEXT_CLASS} mt-2`}>{compliance.euAiAct.details}</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          <Card id="status-heading" title={t("sections.status")}>
            <div className="flex flex-col gap-3.5">
              {compliance ? (
                <div>
                  <h3 className={LABEL_CLASS}>{t("status.status")}</h3>
                  <VerificationLabel provider={provider} className={TEXT_CLASS} />
                </div>
              ) : null}
              {provider.pricingTier ? (
                <div>
                  <h3 className={LABEL_CLASS}>{t("status.pricingTier")}</h3>
                  <p className={TEXT_CLASS}>{t(`pricingTiers.${provider.pricingTier}`)}</p>
                </div>
              ) : null}
              {sources.length > 0 ? (
                <div>
                  <h3 className={LABEL_CLASS}>{t("status.sources")}</h3>
                  <ul className="m-0 list-none p-0">
                    {sources.map((url) => (
                      <li key={url} className="text-14 [overflow-wrap:anywhere]">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">
                          {url.replace(/^https?:\/\//, "")}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {provider.notes ? (
                <div>
                  <h3 className={LABEL_CLASS}>{t("status.notes")}</h3>
                  <p className={TEXT_CLASS}>{provider.notes}</p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        {providerModels.length > 0 ? (
          <section className="mt-10" aria-labelledby="models-heading">
            <h2 id="models-heading" className="m-0 text-20 font-semibold text-text-primary">
              {t("models.heading", { count: providerModels.length })}
            </h2>
            {gatewayModels.length === 0 ? (
              <ModelsTable
                models={nativeModels}
                label={t("models.tableLabel", { providerName: provider.name })}
                className="mt-4"
              />
            ) : (
              <>
                {nativeModels.length > 0 ? (
                  <>
                    <h3 className={SUBHEADING_CLASS}>{t("models.nativeHeading")}</h3>
                    <ModelsTable models={nativeModels} label={t("models.nativeHeading")} className="mt-3" />
                  </>
                ) : null}
                <h3 className={SUBHEADING_CLASS}>{t("models.gatewayHeading")}</h3>
                <p className="m-0 mt-1 max-w-[72ch] text-15 text-text-muted">
                  {t("models.gatewayNote", { providerName: provider.name })}
                </p>
                <ModelsTable
                  models={gatewayModels}
                  label={t("models.gatewayHeading")}
                  gatewayProviderName={provider.name}
                  className="mt-3"
                />
              </>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}

const LABEL_CLASS = "m-0 mb-2 text-13 font-semibold text-text-muted";
const TEXT_CLASS = "m-0 text-15 text-pretty text-text-secondary";
const SUBHEADING_CLASS = "m-0 mt-6 text-17 font-semibold text-text-primary";

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-card border border-border bg-surface px-6 py-5">
      <h2 id={id} className="m-0 mb-3 text-17 font-semibold text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

interface ModelsTableProps {
  models: ProviderModel[];
  label: string;
  gatewayProviderName?: string;
  className?: string;
}

function ModelsTable({ models, label, gatewayProviderName, className }: ModelsTableProps) {
  const t = useTranslations("ProviderPage.models");

  return (
    <div className={`${TABLE_CLASS} ${className ?? ""}`}>
      <table className="-mb-px w-full border-separate border-spacing-0 max-md:block" aria-label={label}>
        <colgroup className="max-md:hidden">
          <col className="w-[46%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[22%]" />
          <col className="w-11" />
        </colgroup>
        <thead className="max-md:hidden">
          <tr>
            <th scope="col" className={`${TH_CLASS} pl-5`}>
              {t("columns.model")}
            </th>
            <th scope="col" className={TH_CLASS}>
              {t("columns.modality")}
            </th>
            <th scope="col" className={`${TH_CLASS} text-right`}>
              {t("columns.context")}
            </th>
            <th scope="col" className={`${TH_CLASS} text-right`}>
              {t("columns.price")}
              <span className="block text-13 font-medium tracking-normal normal-case">{t("columns.priceSub")}</span>
            </th>
            <th scope="col" className={TH_CLASS}>
              <span className="sr-only">{t("columns.details")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="max-md:block">
          {models.map((m) => (
            <ProviderModelRow key={`${m.id}::${m.providerSlug}`} model={m} gatewayProviderName={gatewayProviderName} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
