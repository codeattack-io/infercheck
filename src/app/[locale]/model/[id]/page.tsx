// Model detail page — /model/[id]
// Lists every provider offering this model with pricing, compliance, and links.
//
// Route params: `id` is the model suffix (e.g. "claude-sonnet-4-6").
// The same suffix can appear at multiple providers (anthropic, amazon-bedrock, etc.).
//
// Vercel rules:
//   - async-parallel: DB query + provider JSON load in parallel
//   - server-serialization: no non-serializable data passed to client components

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAllProviders } from "@/lib/providers";
import { getComplianceTier, isFullProvider } from "@/lib/compliance";
import type { AnyProvider } from "@/lib/compliance";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import type { ComplianceTier } from "@/lib/compliance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(val: string | null | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n === 0) return "free";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function formatContext(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

const TIER_STYLE: Record<ComplianceTier, { color: string; bg: string; border: string }> = {
  compliant: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  partial: { color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  noncompliant: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  unverified: { color: "#6b7280", bg: "#f8f8f7", border: "#e2e2de" },
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

// server-cache-react: wrap DB query so generateMetadata and the page body share
// a single request-scoped hit. React.cache() deduplicates by argument identity.
const getModelRows = cache(async (decoded: string) => {
  return db
    .select()
    .from(models)
    .where(and(eq(models.isActive, true), eq(models.canonicalModelId, decoded)))
    .orderBy(models.providerSlug);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  const rows = await getModelRows(decoded);
  const rawName =
    (rows.find((r) => r.isNativeModel === true) ??
     rows.find((r) => r.providerSlug !== "amazon-bedrock") ??
     rows[0])?.displayName ?? decoded;
  const name = rawName.replace(/^\w[\w\s]*:\s+/, "");

  return {
    title: `${name} — GDPR compliance by provider`,
    description: `Compare ${name} availability across providers: EU data residency, DPA status, training policy, and pricing. Find which providers pass your GDPR threshold.`,
    openGraph: {
      title: `${name} — GDPR Compliance by Provider`,
      description: `EU data residency, DPA, training opt-out, and pricing for ${name} across all providers offering it.`,
      type: "website",
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ModelDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const decoded = decodeURIComponent(id);

  // Parallel: cached DB query + provider JSON load (async-parallel rule).
  // getModelRows() is React.cache-wrapped — if generateMetadata already ran it,
  // this hits the request-scoped cache instead of the DB (server-cache-react rule).
  const [modelRows, allProviders] = await Promise.all([
    getModelRows(decoded),
    Promise.resolve(getAllProviders()),
  ]);

  if (modelRows.length === 0) {
    notFound();
  }

  const t = await getTranslations("ModelPage");

  const TIER_CONFIG: Record<ComplianceTier, { label: string; color: string; bg: string; border: string }> = {
    compliant: { label: t("tiers.compliant"), ...TIER_STYLE.compliant },
    partial: { label: t("tiers.partial"), ...TIER_STYLE.partial },
    noncompliant: { label: t("tiers.noncompliant"), ...TIER_STYLE.noncompliant },
    unverified: { label: t("tiers.unverified"), ...TIER_STYLE.unverified },
  };

  const providerMap = new Map<string, AnyProvider>(allProviders.map((p) => [p.slug, p]));

  // Prefer a non-gateway row's display name for the page heading so we get the
  // upstream model name (e.g. "Claude Sonnet 4.6") rather than a provider-specific
  // label like "EU Anthropic Claude Sonnet 4.6" (Bedrock) or "Anthropic: Claude
  // Sonnet 4.6" (OpenRouter). Fall back to the first row if no better option exists.
  const preferredRow =
    modelRows.find((r) => r.isNativeModel === true) ??
    modelRows.find((r) => r.providerSlug !== "amazon-bedrock") ??
    modelRows[0];
  // Strip the "Vendor: " prefix that OpenRouter injects (e.g. "Anthropic: Claude …").
  const modelName = preferredRow.displayName.replace(/^\w[\w\s]*:\s+/, "");

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": modelName,
    "applicationCategory": "AI Language Model",
    "offers": modelRows.map((row) => {
      const provider = providerMap.get(row.providerSlug);
      return {
        "@type": "Offer",
        "seller": { "@type": "Organization", "name": provider?.name ?? row.providerSlug },
        "price": row.inputPricePerMTokens ?? undefined,
        "priceCurrency": "USD",
      };
    }),
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
              <Link href="/" className="text-link no-underline">
                {t("breadcrumb.models")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-text-secondary">{modelName}</li>
          </ol>
        </nav>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-normal text-heading leading-[1.2] m-0 mb-2 tracking-[-0.02em]">
            {modelName}
          </h1>
          <p className="font-body text-[0.9375rem] text-text-secondary m-0">
            {modelRows.length === 1
              ? t("availableFrom1")
              : t("availableFromN", { count: modelRows.length })}
            {t("compareSubheading")}
          </p>
        </div>

        {/* Provider cards */}
        <div className="flex flex-col gap-4">
          {modelRows.map((row) => {
            const provider = providerMap.get(row.providerSlug) ?? null;
            const tier = provider ? getComplianceTier(provider) : "unverified";
            const tierCfg = TIER_CONFIG[tier];
            const verified = provider !== null && isFullProvider(provider);

            return (
              <div
                key={`${row.id}::${row.providerSlug}`}
                className="bg-surface border border-border rounded"
                // borderLeft is dynamic (tier color) — kept as style
                style={{
                  borderLeft: `3px solid ${
                    tier === "compliant"
                      ? "var(--color-compliant)"
                      : tier === "partial"
                      ? "var(--color-partial)"
                      : tier === "noncompliant"
                      ? "var(--color-noncompliant)"
                      : "var(--color-unverified)"
                  }`,
                  padding: "20px 24px",
                }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <div className="font-body text-base font-semibold text-text-primary mb-1">
                      {provider?.name ?? row.providerSlug}
                    </div>
                    {/* Tier pill — colors are dynamic from tierCfg */}
                    <div
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-body text-xs font-medium border"
                      style={{
                        backgroundColor: tierCfg.bg,
                        borderColor: tierCfg.border,
                        color: tierCfg.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: tierCfg.color }}
                        aria-hidden="true"
                      />
                      {tierCfg.label}
                    </div>
                  </div>

                  <Link
                    href={`/provider/${row.providerSlug}`}
                    className="font-body text-[0.8125rem] font-medium text-accent no-underline inline-flex items-center gap-1 px-[10px] py-1 border border-accent rounded bg-accent-subtle whitespace-nowrap shrink-0"
                  >
                    {t("fullProviderProfile")}
                  </Link>
                </div>

                {/* Detail grid */}
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
                >
                  {/* Pricing */}
                  <DetailSection title={t("sections.pricing")}>
                    <DetailRow label={t("pricing.input")} value={formatPrice(row.inputPricePerMTokens)} mono />
                    <DetailRow label={t("pricing.output")} value={formatPrice(row.outputPricePerMTokens)} mono />
                    <DetailRow label={t("pricing.context")} value={formatContext(row.contextWindow)} mono />
                  </DetailSection>

                  {/* Compliance summary */}
                  {verified && provider !== null && isFullProvider(provider) ? (
                    <DetailSection title={t("sections.gdprCompliance")}>
                      <BooleanRow
                        label={t("compliance.euDataResidency")}
                        value={provider.compliance.dataResidency.euOnly}
                      />
                      <BooleanRow
                        label={t("compliance.dpaAvailable")}
                        value={provider.compliance.dpa.available}
                        href={provider.compliance.dpa.url ?? undefined}
                      />
                      <BooleanRow
                        label={t("compliance.noTrainingOnData")}
                        value={provider.compliance.dataUsage.trainsOnCustomerData === null ? null : !provider.compliance.dataUsage.trainsOnCustomerData}
                      />
                      <BooleanRow
                        label={t("compliance.sccsInPlace")}
                        value={provider.compliance.sccs ?? false}
                      />
                    </DetailSection>
                  ) : (
                    <DetailSection title={t("sections.gdprCompliance")}>
                      <p className="font-body text-[0.8125rem] text-text-muted m-0 italic">
                        {t("compliance.notYetVerified")}
                      </p>
                    </DetailSection>
                  )}

                  {/* Data residency detail */}
                  {verified && provider !== null && isFullProvider(provider) ? (
                    <DetailSection title={t("sections.dataResidency")}>
                      <DetailRow
                        label={t("residency.regions")}
                        value={
                          provider.compliance.dataResidency.euOnly
                            ? t("residency.euOnly")
                            : provider.compliance.dataResidency.regions.join(", ")
                        }
                      />
                      {provider.compliance.dataResidency.euRegionDetails ? (
                        <p className="font-body text-[0.8125rem] text-text-secondary mt-1.5 leading-[1.5]">
                          {provider.compliance.dataResidency.euRegionDetails}
                        </p>
                      ) : null}
                    </DetailSection>
                  ) : null}

                  {/* Badges */}
                  {verified && provider !== null && isFullProvider(provider) ? (
                    <DetailSection title={t("sections.complianceBadges")}>
                      <div className="flex flex-wrap gap-1">
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
                      {provider.lastVerified ? (
                        <p className="font-mono text-xs text-text-muted mt-2">
                          {t("verifiedDate", { date: provider.lastVerified })}
                        </p>
                      ) : null}
                    </DetailSection>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back link */}
        <div className="mt-10">
          <Link href="/" className="font-body text-sm text-link no-underline">
            {t("backLink")}
          </Link>
        </div>
      </main>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-body text-[0.6875rem] font-semibold text-text-secondary uppercase tracking-[0.06em] mb-[10px]">
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-1">
      <span className="font-body text-[0.8125rem] text-text-secondary shrink-0">
        {label}
      </span>
      <span className={`text-[0.8125rem] text-text-primary text-right ${mono ? "font-mono" : "font-body"}`}>
        {value}
      </span>
    </div>
  );
}

function BooleanRow({
  label,
  value,
  href,
}: {
  label: string;
  value: boolean | null;
  href?: string;
}) {
  const positive = value === true;
  const symbol = positive ? "✓" : value === false ? "✗" : "?";
  const color = positive
    ? "var(--color-compliant)"
    : value === false
    ? "var(--color-noncompliant)"
    : "var(--color-text-muted)";

  return (
    <div className="flex items-center gap-2 mb-1">
      <span
        className="font-mono text-[0.8125rem] w-3.5 text-center shrink-0"
        style={{ color }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <span className="font-body text-[0.8125rem] text-text-secondary">
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
    </div>
  );
}
