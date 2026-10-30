// Provider profile page — /[locale]/provider/[slug]
// Full compliance deep-dive for a single provider.
// All data from the provider JSON file — no DB query needed.
//
// Vercel rules:
//   - server-cache-react: getProvider wrapped in React.cache() so generateMetadata
//     and the page body share a single fs.readFileSync per request
//   - async-parallel: provider JSON load + DB model query run in parallel
//   - server-serialization: no non-serializable data passed to client

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProvider, getAllProviders, getLocalizedProvider } from "@/lib/providers";
import { getModelsByProvider } from "@/lib/models";
import { getComplianceTier, isFullProvider, TIER_CLASSES } from "@/lib/compliance";
import { getVerification } from "@/lib/verification";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { GatewayPill } from "@/components/GatewayPill";
import { BooleanList, BooleanRow } from "@/components/BooleanRow";
import { NeutralPill } from "@/components/NeutralPill";
import { buttonClass } from "@/lib/styles";
import { ProviderModelRow } from "@/components/ProviderModelRow";
import type { ProviderModel } from "@/components/types";

export async function generateStaticParams() {
  const providers = getAllProviders();
  return providers.map((p) => ({ slug: p.slug }));
}

// server-cache-react: wrap the synchronous fs read so generateMetadata and the
// page body share one parse result within the same request context.
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

  // async-parallel: start model DB query immediately, while provider JSON is
  // read synchronously from the React.cache. Both complete in parallel.
  const modelsPromise = getModelsByProvider(slug);
  const rawProvider = getCachedProvider(slug);

  if (!rawProvider) notFound();

  const provider = getLocalizedProvider(rawProvider, locale);

  const t = await getTranslations("ProviderPage");
  const tType = await getTranslations("ProviderType");
  const tBadge = await getTranslations("ComplianceBadge");

  const tier = getComplianceTier(provider);
  const tierClasses = TIER_CLASSES[tier];
  const verified = isFullProvider(provider);
  const verification = getVerification(provider);

  // Await the model fetch started earlier
  const providerModels = await modelsPromise;

  // Split native vs gateway-hosted models for display
  const nativeModels = providerModels.filter((m) => m.isNativeModel);
  const gatewayModels = providerModels.filter((m) => !m.isNativeModel);

  // Report-a-change URL (GitHub Issue Form with provider pre-filled)
  const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/codeattack-io/infercheck";
  const reportUrl = `${repoUrl}/issues/new?template=report-change.yml&title=%5BReport%5D+${encodeURIComponent(provider.name)}%3A+&provider=${encodeURIComponent(slug)}`;

  // JSON-LD for this provider
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: provider.name,
    url: provider.website,
    ...(verified
      ? {
          description: t("jsonLdDescription", {
            tier: tBadge(`long.${tier}`),
            dpa: provider.compliance.dpa.available ? t("meta.available") : t("meta.notAvailable"),
          }),
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="page-width flex-1 py-10">
        {/* Breadcrumb */}
        <nav aria-label={t("breadcrumb.ariaLabel")} className="mb-6">
          <ol className="flex items-center gap-2 list-none p-0 m-0 font-body text-[0.8125rem] text-text-muted">
            <li>
              <Link href="/" className="text-link no-underline">
                {t("breadcrumb.models")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/providers" className="text-link no-underline">
                {t("breadcrumb.providers")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-text-secondary">{provider.name}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="m-0 mb-[10px]">{provider.name}</h1>
            <div className="flex items-center gap-[10px] flex-wrap">
              <ComplianceBadge
                tier={tier}
                label="long"
                compliance={isFullProvider(provider) ? provider.compliance : null}
              />
              <span className="text-15 text-text-muted">{tType(provider.type)}</span>

              {/* Website link */}
              {provider.website ? (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-15 text-link no-underline hover:underline"
                >
                  {provider.website.replace(/^https?:\/\//, "")} ↗
                </a>
              ) : null}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
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
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {verified ? (
            <section
              className={`bg-surface border border-border border-l-3 ${tierClasses.line} rounded-card px-6 py-5`}
              aria-labelledby="compliance-heading"
            >
              <h2 id="compliance-heading" className="text-17 font-semibold text-text-primary m-0 mb-3">
                {t("sections.gdprCompliance")}
              </h2>

              <BooleanList>
                <BooleanRow label={t("compliance.euOnlyResidency")} value={provider.compliance.dataResidency.euOnly} />
                <BooleanRow
                  label={t("compliance.inferenceStaysInEu")}
                  value={
                    provider.compliance.dataResidency.dataLeavesEuAtInference === null
                      ? null
                      : !provider.compliance.dataResidency.dataLeavesEuAtInference
                  }
                />
                <BooleanRow
                  label={t("compliance.dpa")}
                  value={provider.compliance.dpa.available}
                  href={provider.compliance.dpa.url ?? undefined}
                  valueText={
                    provider.compliance.dpa.signedVia !== "not_available"
                      ? `${provider.compliance.dpa.available ? t("meta.yes") : t("meta.no")}, ${t(`dpaSignedVia.${provider.compliance.dpa.signedVia}`)}`
                      : undefined
                  }
                />
                <BooleanRow
                  label={t("compliance.noTraining")}
                  value={
                    provider.compliance.dataUsage.trainsOnCustomerData === null
                      ? null
                      : !provider.compliance.dataUsage.trainsOnCustomerData
                  }
                />
                <BooleanRow label={t("compliance.optOut")} value={provider.compliance.dataUsage.optOutAvailable} />
                <BooleanRow label={t("compliance.sccs")} value={provider.compliance.sccs} />
                <BooleanRow label={t("compliance.adequacy")} value={provider.compliance.adequacyDecision} />
              </BooleanList>
            </section>
          ) : (
            <section
              className={`bg-surface border border-border border-l-3 ${tierClasses.line} rounded-card px-6 py-5`}
            >
              <h2 className="text-17 font-semibold text-text-primary m-0 mb-3">{t("sections.gdprCompliance")}</h2>
              <p className="text-15 text-text-muted m-0">{t("unverifiedNotice")}</p>
            </section>
          )}

          {verified ? (
            <section
              className="bg-surface border border-border rounded-card px-6 py-5"
              aria-labelledby="data-handling-heading"
            >
              <h2 id="data-handling-heading" className="text-17 font-semibold text-text-primary m-0 mb-3">
                {t("sections.dataHandling")}
              </h2>

              <div className="flex flex-col gap-3.5">
                {/* Data residency detail */}
                <div>
                  <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-1">
                    {t("dataHandlingLabels.regions")}
                  </div>
                  <div className="text-[0.8125rem] text-text-primary">
                    {provider.compliance.dataResidency.euOnly
                      ? t("dataHandlingLabels.euOnly")
                      : provider.compliance.dataResidency.regions.join(", ") || "—"}
                  </div>
                  {provider.compliance.dataResidency.euRegionDetails ? (
                    <p className="font-body text-[0.8125rem] text-text-secondary mt-1.5 leading-[1.6]">
                      {provider.compliance.dataResidency.euRegionDetails}
                    </p>
                  ) : null}
                </div>

                {/* Retention policy */}
                {provider.compliance.dataUsage.retentionPolicy ? (
                  <div>
                    <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-1">
                      {t("dataHandlingLabels.retentionPolicy")}
                    </div>
                    <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.6]">
                      {provider.compliance.dataUsage.retentionPolicy}
                    </p>
                  </div>
                ) : null}

                {/* Additional details */}
                {provider.compliance.dataUsage.details ? (
                  <div>
                    <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-1">
                      {t("dataHandlingLabels.additionalDetails")}
                    </div>
                    <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.6]">
                      {provider.compliance.dataUsage.details}
                    </p>
                  </div>
                ) : null}

                {/* Sub-processors */}
                <div>
                  <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-1">
                    {t("dataHandlingLabels.subProcessors")}
                  </div>
                  <div className="flex items-center gap-2 font-body text-[0.8125rem] text-text-secondary">
                    {provider.compliance.subProcessors.disclosed ? (
                      <>
                        <span className="text-compliant-text" aria-hidden="true">
                          ✓
                        </span>
                        {provider.compliance.subProcessors.url ? (
                          <a
                            href={provider.compliance.subProcessors.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link no-underline"
                          >
                            {t("subProcessors.disclosedLink")}
                          </a>
                        ) : (
                          t("subProcessors.disclosed")
                        )}
                        {provider.compliance.subProcessors.includesEuEntities === true
                          ? t("subProcessors.includesEu")
                          : provider.compliance.subProcessors.includesEuEntities === false
                            ? t("subProcessors.noEu")
                            : null}
                      </>
                    ) : (
                      <>
                        <span className="text-noncompliant-text" aria-hidden="true">
                          ✗
                        </span>
                        {t("subProcessors.notDisclosed")}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {verified ? (
            <section className="bg-surface border border-border rounded-card px-6 py-5" aria-labelledby="certs-heading">
              <h2 id="certs-heading" className="text-17 font-semibold text-text-primary m-0 mb-3">
                {t("sections.certsAndEuAiAct")}
              </h2>

              {provider.compliance.certifications.length > 0 ? (
                <div className="mb-4">
                  <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-2">
                    {t("certs.certifications")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.compliance.certifications.map((cert) => (
                      <NeutralPill key={cert} surface="alt">
                        {cert}
                      </NeutralPill>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[0.8125rem] text-text-muted m-0 mb-4">{t("certs.noCerts")}</p>
              )}

              <div>
                <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-1.5">
                  {t("certs.euAiActStatus")}
                </div>
                <NeutralPill surface="alt" className="mb-1.5">
                  {t(`euAiActStatus.${provider.compliance.euAiAct.status}`)}
                </NeutralPill>
                {provider.compliance.euAiAct.details ? (
                  <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.6]">
                    {provider.compliance.euAiAct.details}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section
            className="bg-surface border border-border rounded-card px-6 py-5"
            aria-labelledby="verification-heading"
          >
            <h2 id="verification-heading" className="text-17 font-semibold text-text-primary m-0 mb-3">
              {t("sections.verification")}
            </h2>

            <div className="flex flex-col gap-[10px]">
              <MetaRow
                label={t("verification.status")}
                value={
                  verification.kind === "none"
                    ? t("verification.statusNone")
                    : verification.kind === "ai_draft"
                      ? t("verification.statusAiDraft")
                      : t("verification.statusHuman", { name: provider.verifiedBy })
                }
              />
              {verification.date ? (
                <MetaRow
                  label={verification.kind === "ai_draft" ? t("verification.dateAiDraft") : t("verification.dateHuman")}
                  value={verification.date}
                  numeric
                />
              ) : null}
              <MetaRow
                label={t("verification.pricingTier")}
                value={provider.pricingTier ? t(`pricingTiers.${provider.pricingTier}`) : t("verification.unknown")}
              />
            </div>

            {verification.kind === "ai_draft" ? (
              <p className="font-body text-[0.8125rem] text-text-secondary leading-relaxed mt-4 mb-0">
                {t("verification.aiDraftNote")}
              </p>
            ) : null}

            {/* Source URLs */}
            {provider.sourceUrls && provider.sourceUrls.length > 0 ? (
              <div className="mt-4">
                <div className="text-13 font-semibold text-text-muted mb-2">{t("verification.sources")}</div>
                <ul className="list-none p-0 m-0 flex flex-col gap-1">
                  {provider.sourceUrls.map((url, i) => (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-[0.8125rem] text-link no-underline break-all"
                      >
                        {url} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Notes */}
            {provider.notes ? (
              <div className="mt-4">
                <div className="text-13 font-semibold text-text-muted mb-2">{t("verification.notes")}</div>
                <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.6]">{provider.notes}</p>
              </div>
            ) : null}
          </section>
        </div>

        {providerModels.length > 0 ? (
          <section className="mt-8" aria-labelledby="models-heading">
            <h2 id="models-heading" className="text-20 font-semibold text-text-primary m-0 mb-4">
              {t("models.heading", { count: providerModels.length })}
            </h2>

            {/* Native models */}
            {nativeModels.length > 0 ? (
              <div className={gatewayModels.length > 0 ? "mb-8" : ""}>
                {gatewayModels.length > 0 ? (
                  <div className="text-13 font-semibold text-text-muted mb-3">{t("models.nativeHeading")}</div>
                ) : null}
                <ModelsTable models={nativeModels} t={t} />
              </div>
            ) : null}

            {/* Gateway / third-party models */}
            {gatewayModels.length > 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-13 font-semibold text-text-muted">{t("models.gatewayHeading")}</span>
                  <GatewayPill providerName={provider.name} />
                </div>
                <p className="font-body text-[0.8125rem] text-text-secondary mt-0 mb-3 leading-[1.5]">
                  {t("models.gatewayNote", { providerName: provider.name })}
                </p>
                <ModelsTable models={gatewayModels} t={t} gatewayProviderName={provider.name} />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Back link */}
        <div className="mt-10">
          <Link href="/providers" className="font-body text-sm text-link no-underline">
            {t("backLink")}
          </Link>
        </div>
      </main>
    </>
  );
}

function ModelsTable({
  models: rows,
  t,
  gatewayProviderName,
}: {
  models: ProviderModel[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  gatewayProviderName?: string;
}) {
  return (
    <div className="border border-border rounded-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-surface">
          <thead>
            <tr className="bg-surface-alt border-b border-border">
              {[
                t("models.columns.model"),
                t("models.columns.modality"),
                t("models.columns.context"),
                t("models.columns.input"),
                t("models.columns.output"),
              ].map((h: string) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-13 font-semibold text-text-muted uppercase tracking-[0.04em] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <ProviderModelRow
                key={`${m.id}::${m.providerSlug}`}
                model={m}
                gatewayProviderName={gatewayProviderName}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetaRow({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex justify-between gap-4 flex-wrap">
      <span className="font-body text-[0.8125rem] text-text-secondary">{label}</span>
      <span className={`text-[0.8125rem] text-text-primary font-medium ${numeric ? "tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
