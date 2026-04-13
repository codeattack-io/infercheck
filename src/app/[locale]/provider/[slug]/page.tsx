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
import { getComplianceTier, isFullProvider } from "@/lib/compliance";
import type { ComplianceTier } from "@/lib/compliance";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { ProviderModelRow } from "@/components/ProviderModelRow";

// ─── Static params (prerender all known providers × locales) ──────────────────

export async function generateStaticParams() {
  const providers = getAllProviders();
  return providers.map((p) => ({ slug: p.slug }));
}

// server-cache-react: wrap the synchronous fs read so generateMetadata and the
// page body share one parse result within the same request context.
const getCachedProvider = cache((slug: string) => getProvider(slug));

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const provider = getCachedProvider(slug);
  if (!provider) return {};

  const t = await getTranslations({ locale, namespace: "ProviderPage" });

  const title = t("title", { providerName: provider.name });
  const description = isFullProvider(provider)
    ? t("descriptionVerified", {
        providerName: provider.name,
        euOnly: provider.compliance.dataResidency.euOnly ? "✓" : "✗",
        dpa: provider.compliance.dpa.available ? "available" : "not available",
        training:
          provider.compliance.dataUsage.trainsOnCustomerData === null
            ? "unknown"
            : provider.compliance.dataUsage.trainsOnCustomerData
            ? "yes"
            : "no",
        date: provider.lastVerified ?? "",
      })
    : t("descriptionUnverified", { providerName: provider.name });

  return {
    title,
    description,
    alternates: {
      canonical: `https://infercheck.eu/${locale}/provider/${slug}`,
      languages: {
        "en": `https://infercheck.eu/en/provider/${slug}`,
        "de": `https://infercheck.eu/de/provider/${slug}`,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_STYLE: Record<ComplianceTier, { color: string; bg: string; border: string }> = {
  compliant: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  partial: { color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  noncompliant: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  unverified: { color: "#6b7280", bg: "#f8f8f7", border: "#e2e2de" },
};

const TIER_BORDER: Record<ComplianceTier, string> = {
  compliant: "var(--color-compliant)",
  partial: "var(--color-partial)",
  noncompliant: "var(--color-noncompliant)",
  unverified: "var(--color-unverified)",
};

function formatPrice(val: string | null | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n === 0) return "free";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

// EU AI Act status pill — color depends on status string at runtime
function euAiActStyle(status: string): { color: string; bg: string; border: string } {
  if (status === "compliant") return { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
  if (status === "monitoring") return { color: "#92400e", bg: "#fffbeb", border: "#fde68a" };
  return { color: "#6b7280", bg: "#f8f8f7", border: "#e2e2de" };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

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

  const TIER_CONFIG: Record<ComplianceTier, { label: string; color: string; bg: string; border: string }> = {
    compliant: { label: t("tiers.compliant"), ...TIER_STYLE.compliant },
    partial: { label: t("tiers.partial"), ...TIER_STYLE.partial },
    noncompliant: { label: t("tiers.noncompliant"), ...TIER_STYLE.noncompliant },
    unverified: { label: t("tiers.unverified"), ...TIER_STYLE.unverified },
  };

  const tier = getComplianceTier(provider);
  const tierCfg = TIER_CONFIG[tier];
  const tierBorder = TIER_BORDER[tier];
  const verified = isFullProvider(provider);

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
    "name": provider.name,
    "url": provider.website,
    ...(verified
      ? {
          "description": `AI inference provider. GDPR compliance tier: ${tier}. DPA: ${provider.compliance.dpa.available ? "available" : "not available"}.`,
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-[1200px] mx-auto flex-1 w-full box-border px-4 sm:px-6 lg:px-10 py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 list-none p-0 m-0 font-body text-[0.8125rem] text-text-muted">
            <li>
              <Link href="/" className="text-link no-underline">{t("breadcrumb.models")}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/providers" className="text-link no-underline">{t("breadcrumb.providers")}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-text-secondary">{provider.name}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display text-[2rem] font-normal text-heading leading-[1.2] m-0 mb-[10px] tracking-[-0.02em]">
              {provider.name}
            </h1>
            <div className="flex items-center gap-[10px] flex-wrap">
              {/* Tier pill — colors are dynamic from tierCfg */}
              <span
                className="inline-flex items-center gap-1.5 px-[10px] py-[3px] rounded font-body text-[0.8125rem] font-medium border"
                style={{ backgroundColor: tierCfg.bg, borderColor: tierCfg.border, color: tierCfg.color }}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={{ backgroundColor: tierCfg.color }}
                  aria-hidden="true"
                />
                {tierCfg.label}
              </span>

              {/* Provider type */}
              <span className="font-body text-[0.8125rem] text-text-muted bg-surface-alt border border-border rounded px-2 py-[3px]">
                {provider.type.replace(/_/g, " ")}
              </span>

              {/* Website link */}
              {provider.website ? (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-[0.8125rem] text-link no-underline"
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
                className="inline-flex items-center gap-1 px-3.5 py-1.5 font-body text-[0.8125rem] font-medium text-text-secondary border border-border rounded bg-surface no-underline whitespace-nowrap"
              >
                {t("actions.apiDocs")}
              </a>
            ) : null}
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 font-body text-[0.8125rem] font-medium text-accent border border-accent rounded bg-accent-subtle no-underline whitespace-nowrap"
            >
              {t("actions.reportChange")}
            </a>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Compliance card ── */}
          {verified ? (
            <section
              className="bg-surface border border-border rounded px-6 py-5"
              style={{ borderLeft: `3px solid ${tierBorder}` }}
              aria-labelledby="compliance-heading"
            >
              <h2
                id="compliance-heading"
                className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] m-0 mb-4"
              >
                {t("sections.gdprCompliance")}
              </h2>

              <div className="flex flex-col gap-[10px]">
                <ComplianceRow
                  label={t("compliance.euOnlyResidency")}
                  value={provider.compliance.dataResidency.euOnly}
                />
                <ComplianceRow
                  label={t("compliance.inferenceStaysInEu")}
                  value={
                    provider.compliance.dataResidency.dataLeavesEuAtInference === null
                      ? null
                      : !provider.compliance.dataResidency.dataLeavesEuAtInference
                  }
                  note={provider.compliance.dataResidency.dataLeavesEuAtInference === null ? "unknown" : undefined}
                />
                <ComplianceRow
                  label={t("compliance.dpa")}
                  value={provider.compliance.dpa.available}
                  href={provider.compliance.dpa.url ?? undefined}
                  secondary={
                    provider.compliance.dpa.signedVia !== "not_available"
                      ? provider.compliance.dpa.signedVia.replace(/_/g, " ")
                      : undefined
                  }
                />
                <ComplianceRow
                  label={t("compliance.noTraining")}
                  value={provider.compliance.dataUsage.trainsOnCustomerData === null ? null : !provider.compliance.dataUsage.trainsOnCustomerData}
                />
                <ComplianceRow
                  label={t("compliance.optOut")}
                  value={provider.compliance.dataUsage.optOutAvailable}
                />
                <ComplianceRow
                  label={t("compliance.sccs")}
                  value={provider.compliance.sccs}
                />
                <ComplianceRow
                  label={t("compliance.adequacy")}
                  value={provider.compliance.adequacyDecision}
                />
              </div>

              {/* Compliance badges */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {provider.compliance.dataResidency.euOnly ? (
                    <ComplianceBadge variant="eu-only" />
                  ) : provider.compliance.sccs ? (
                    <ComplianceBadge variant="eu-sccs" />
                  ) : null}
                  {provider.compliance.dpa.available ? (
                    <ComplianceBadge variant="dpa" />
                  ) : null}
                  {provider.compliance.dataUsage.trainsOnCustomerData === true ? (
                    <ComplianceBadge variant="trains-on-data" />
                  ) : provider.compliance.dataUsage.trainsOnCustomerData === false ? (
                    <ComplianceBadge variant="no-training" />
                  ) : (
                    <ComplianceBadge variant="training-unknown" />
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section
              className="bg-surface border border-border rounded px-6 py-5"
              style={{ borderLeft: `3px solid ${tierBorder}` }}
            >
              <h2 className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] m-0 mb-3">
                {t("sections.gdprCompliance")}
              </h2>
              <p className="font-body text-[0.875rem] text-text-muted m-0 italic">
                {t("unverifiedNotice")}
              </p>
            </section>
          )}

          {verified ? (
            <section
              className="bg-surface border border-border rounded px-6 py-5"
              aria-labelledby="data-handling-heading"
            >
              <h2
                id="data-handling-heading"
                className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] m-0 mb-4"
              >
                {t("sections.dataHandling")}
              </h2>

              <div className="flex flex-col gap-3.5">
                {/* Data residency detail */}
                <div>
                  <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-1">
                    {t("dataHandlingLabels.regions")}
                  </div>
                  <div className="font-mono text-[0.8125rem] text-text-primary">
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
                        <span className="text-compliant">✓</span>
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
                        <span className="text-noncompliant">✗</span>
                        {t("subProcessors.notDisclosed")}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* ── Certifications + EU AI Act ── */}
          {verified ? (
            <section
              className="bg-surface border border-border rounded px-6 py-5"
              aria-labelledby="certs-heading"
            >
              <h2
                id="certs-heading"
                className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] m-0 mb-4"
              >
                {t("sections.certsAndEuAiAct")}
              </h2>

              {provider.compliance.certifications.length > 0 ? (
                <div className="mb-4">
                  <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-2">
                    {t("certs.certifications")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.compliance.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="font-mono text-xs font-medium text-text-secondary bg-surface-alt border border-border rounded-[3px] px-2 py-0.5"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="font-body text-[0.8125rem] text-text-muted m-0 mb-4 italic">
                  {t("certs.noCerts")}
                </p>
              )}

              <div>
                <div className="font-body text-[0.8125rem] font-medium text-text-secondary mb-1.5">
                  {t("certs.euAiActStatus")}
                </div>
                {/* EU AI Act status pill — color depends on status string — kept as style */}
                <span
                  className="inline-block font-body text-[0.8125rem] font-medium rounded px-2 py-0.5 mb-1.5 border"
                  style={(() => {
                    const s = euAiActStyle(provider.compliance.euAiAct.status);
                    return { color: s.color, backgroundColor: s.bg, borderColor: s.border };
                  })()}
                >
                  {provider.compliance.euAiAct.status.replace(/_/g, " ")}
                </span>
                {provider.compliance.euAiAct.details ? (
                  <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.6]">
                    {provider.compliance.euAiAct.details}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* ── Verification metadata ── */}
          <section
            className="bg-surface border border-border rounded px-6 py-5"
            aria-labelledby="verification-heading"
          >
            <h2
              id="verification-heading"
              className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] m-0 mb-4"
            >
              {t("sections.verification")}
            </h2>

            <div className="flex flex-col gap-[10px]">
              <MetaRow label={t("verification.lastVerified")} value={provider.lastVerified ?? t("verification.notVerified")} mono />
              <MetaRow
                label={t("verification.verifiedBy")}
                value={
                  provider.verifiedBy === "stub"
                    ? t("verification.notYetVerified")
                    : provider.verifiedBy === "ai_draft"
                    ? t("verification.aiDraft")
                    : provider.verifiedBy
                }
              />
              <MetaRow
                label={t("verification.pricingTier")}
                value={
                  provider.pricingTier
                    ? provider.pricingTier.replace(/_/g, " ")
                    : t("verification.unknown")
                }
              />
            </div>

            {/* Source URLs */}
            {provider.sourceUrls && provider.sourceUrls.length > 0 ? (
              <div className="mt-4">
                <div className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] mb-2">
                  {t("verification.sources")}
                </div>
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
                <div className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] mb-2">
                  {t("verification.notes")}
                </div>
                <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.6]">
                  {provider.notes}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        {/* ── Models offered section ── */}
        {providerModels.length > 0 ? (
          <section className="mt-8" aria-labelledby="models-heading">
            <h2
              id="models-heading"
              className="font-body text-base font-semibold text-text-primary m-0 mb-4"
            >
              {t("models.heading", { count: providerModels.length })}
            </h2>

            {/* Native models */}
            {nativeModels.length > 0 ? (
              <div className={gatewayModels.length > 0 ? "mb-8" : ""}>
                {gatewayModels.length > 0 ? (
                  <div className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] mb-3">
                    {t("models.nativeHeading")}
                  </div>
                ) : null}
                <ModelsTable models={nativeModels} providerSlug={slug} t={t} />
              </div>
            ) : null}

            {/* Gateway / third-party models */}
            {gatewayModels.length > 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
                    {t("models.gatewayHeading")}
                  </span>
                  <span
                    className="inline-flex items-center gap-[5px] px-[7px] py-px font-body text-[0.6875rem] font-medium rounded border whitespace-nowrap"
                    style={{
                      color: "var(--color-partial)",
                      borderColor: "var(--color-partial)",
                      backgroundColor: "color-mix(in srgb, var(--color-partial) 8%, transparent)",
                    }}
                  >
                    via gateway
                  </span>
                </div>
                <p className="font-body text-[0.8125rem] text-text-secondary mt-0 mb-3 leading-[1.5]">
                  {t("models.gatewayNote", { providerName: provider.name })}
                </p>
                <ModelsTable models={gatewayModels} providerSlug={slug} t={t} gateway />
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

// ─── Small helper components ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ModelsTable({ models: rows, providerSlug, t, gateway = false }: { models: import("@/db/schema").Model[]; providerSlug: string; t: any; gateway?: boolean }) {
  return (
    <div
      className="border border-border rounded overflow-hidden"
      style={gateway ? { borderColor: "color-mix(in srgb, var(--color-partial) 35%, var(--color-border))" } : undefined}
    >
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
                  className="px-4 py-2 text-left font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.05em] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <ProviderModelRow key={`${m.id}::${m.providerSlug}`} model={m} gateway={gateway} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceRow({
  label,
  value,
  href,
  secondary,
  note,
}: {
  label: string;
  value: boolean | null;
  href?: string;
  secondary?: string;
  note?: string;
}) {
  const positive = value === true;
  const symbol = positive ? "✓" : value === false ? "✗" : "?";
  const color = positive
    ? "var(--color-compliant)"
    : value === false
    ? "var(--color-noncompliant)"
    : "var(--color-text-muted)";

  return (
    <div className="flex items-start gap-[10px]">
      <span
        className="font-mono text-[0.875rem] w-3.5 text-center shrink-0 mt-px"
        style={{ color }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <div>
        <span className="font-body text-[0.875rem] text-text-secondary">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link no-underline"
            >
              {label} ↗
            </a>
          ) : (
            label
          )}
        </span>
        {secondary ? (
          <span className="font-body text-xs text-text-muted ml-1.5">
            ({secondary})
          </span>
        ) : null}
        {note ? (
          <span className="font-body text-xs text-text-muted italic ml-1.5">
            {note}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 flex-wrap">
      <span className="font-body text-[0.8125rem] text-text-secondary">
        {label}
      </span>
      <span className={`text-[0.8125rem] text-text-primary font-medium ${mono ? "font-mono" : "font-body"}`}>
        {value}
      </span>
    </div>
  );
}
