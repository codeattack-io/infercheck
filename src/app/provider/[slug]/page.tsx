// Provider profile page — /provider/[slug]
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
import Link from "next/link";
import { cache } from "react";
import { getProvider, getAllProviders } from "@/lib/providers";
import { getModelsByProvider } from "@/lib/models";
import { getComplianceTier, isFullProvider } from "@/lib/compliance";
import type { ComplianceTier } from "@/lib/compliance";
import { ComplianceBadge } from "@/components/ComplianceBadge";

// ─── Static params (prerender all known providers) ────────────────────────────

export async function generateStaticParams() {
  const providers = getAllProviders();
  return providers.map((p) => ({ slug: p.slug }));
}

// server-cache-react: wrap the synchronous fs read so generateMetadata and the
// page body share one parse result within the same request context.
// React.cache() deduplicates by argument identity (slug string = stable key).
const getCachedProvider = cache((slug: string) => getProvider(slug));

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = getCachedProvider(slug);
  if (!provider) return {};

  const title = `${provider.name} — GDPR Compliance Profile`;
  const description = isFullProvider(provider)
    ? `${provider.name} GDPR compliance: EU data residency ${provider.compliance.dataResidency.euOnly ? "✓" : "✗"}, DPA ${provider.compliance.dpa.available ? "available" : "not available"}, training on customer data ${provider.compliance.dataUsage.trainsOnCustomerData ? "yes" : "no"}. Verified ${provider.lastVerified}.`
    : `${provider.name} GDPR compliance profile. Compliance data pending verification.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<ComplianceTier, { label: string; color: string; bg: string; border: string }> = {
  compliant: { label: "EU Compliant", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  partial: { label: "Partial (EU + SCCs)", color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  noncompliant: { label: "Non-compliant", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  unverified: { label: "Unverified", color: "#6b7280", bg: "#f8f8f7", border: "#e2e2de" },
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ProviderProfilePage({ params }: PageProps) {
  const { slug } = await params;

  // async-parallel: start model DB query immediately, while provider JSON is
  // read synchronously from the React.cache. Both complete in parallel.
  const modelsPromise = getModelsByProvider(slug);
  const provider = getCachedProvider(slug);

  if (!provider) notFound();

  const tier = getComplianceTier(provider);
  const tierCfg = TIER_CONFIG[tier];
  const tierBorder = TIER_BORDER[tier];
  const verified = isFullProvider(provider);

  // Await the model fetch started earlier
  const providerModels = await modelsPromise;

  // Report-a-change URL (GitHub Issue Form with provider pre-filled)
  const reportUrl = `https://github.com/carlonoelle/gdpr-ai-directory/issues/new?template=report-change.yml&title=%5BReport%5D+${encodeURIComponent(provider.name)}%3A+&provider=${encodeURIComponent(slug)}`;

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
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: "24px" }}>
          <ol
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
            }}
          >
            <li>
              <Link href="/" style={{ color: "var(--color-link)", textDecoration: "none" }}>
                Models
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/providers" style={{ color: "var(--color-link)", textDecoration: "none" }}>
                Providers
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li style={{ color: "var(--color-text-secondary)" }}>{provider.name}</li>
          </ol>
        </nav>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2rem",
                fontWeight: 400,
                color: "var(--color-heading)",
                lineHeight: 1.2,
                margin: "0 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              {provider.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Tier pill */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 10px",
                  backgroundColor: tierCfg.bg,
                  border: `1px solid ${tierCfg.border}`,
                  borderRadius: "4px",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: tierCfg.color,
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: tierCfg.color,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                {tierCfg.label}
              </span>

              {/* Provider type */}
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8125rem",
                  color: "var(--color-text-muted)",
                  backgroundColor: "var(--color-surface-alt)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "3px 8px",
                }}
              >
                {provider.type.replace(/_/g, " ")}
              </span>

              {/* Website link */}
              {provider.website ? (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    color: "var(--color-link)",
                    textDecoration: "none",
                  }}
                >
                  {provider.website.replace(/^https?:\/\//, "")} ↗
                </a>
              ) : null}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {provider.apiDocsUrl ? (
              <a
                href={provider.apiDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 14px",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  backgroundColor: "var(--color-surface)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                API Docs ↗
              </a>
            ) : null}
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 14px",
                fontFamily: "var(--font-body)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent)",
                borderRadius: "4px",
                backgroundColor: "var(--color-accent-subtle)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Report a change
            </a>
          </div>
        </div>

        {/* Main content grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "24px",
          }}
          className="lg:grid-cols-2"
        >
          {/* ── Compliance card ── */}
          {verified ? (
            <section
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderLeft: `3px solid ${tierBorder}`,
                borderRadius: "4px",
                padding: "20px 24px",
              }}
              aria-labelledby="compliance-heading"
            >
              <h2
                id="compliance-heading"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 16px",
                }}
              >
                GDPR Compliance
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <ComplianceRow
                  label="EU-only data residency"
                  value={provider.compliance.dataResidency.euOnly}
                />
                <ComplianceRow
                  label="Inference stays in EU"
                  value={
                    provider.compliance.dataResidency.dataLeavesEuAtInference === null
                      ? null
                      : !provider.compliance.dataResidency.dataLeavesEuAtInference
                  }
                  note={provider.compliance.dataResidency.dataLeavesEuAtInference === null ? "unknown" : undefined}
                />
                <ComplianceRow
                  label="Data Processing Agreement"
                  value={provider.compliance.dpa.available}
                  href={provider.compliance.dpa.url ?? undefined}
                  secondary={
                    provider.compliance.dpa.signedVia !== "not_available"
                      ? provider.compliance.dpa.signedVia.replace(/_/g, " ")
                      : undefined
                  }
                />
                <ComplianceRow
                  label="No training on customer data"
                  value={!provider.compliance.dataUsage.trainsOnCustomerData}
                />
                <ComplianceRow
                  label="Opt-out available"
                  value={provider.compliance.dataUsage.optOutAvailable}
                />
                <ComplianceRow
                  label="Standard Contractual Clauses"
                  value={provider.compliance.sccs}
                />
                <ComplianceRow
                  label="Adequacy decision (HQ country)"
                  value={provider.compliance.adequacyDecision}
                />
              </div>

              {/* Compliance badges */}
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {provider.compliance.dataResidency.euOnly ? (
                    <ComplianceBadge variant="eu-only" />
                  ) : provider.compliance.sccs ? (
                    <ComplianceBadge variant="eu-sccs" />
                  ) : null}
                  {provider.compliance.dpa.available ? (
                    <ComplianceBadge variant="dpa" />
                  ) : null}
                  {provider.compliance.dataUsage.trainsOnCustomerData ? (
                    <ComplianceBadge variant="trains-on-data" />
                  ) : (
                    <ComplianceBadge variant="no-training" />
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderLeft: `3px solid ${tierBorder}`,
                borderRadius: "4px",
                padding: "20px 24px",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 12px",
                }}
              >
                GDPR Compliance
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: "var(--color-text-muted)",
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                Compliance data not yet verified for this provider. If you have information, please use &ldquo;Report a change&rdquo; above.
              </p>
            </section>
          )}

          {/* ── Data handling card ── */}
          {verified ? (
            <section
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                padding: "20px 24px",
              }}
              aria-labelledby="data-handling-heading"
            >
              <h2
                id="data-handling-heading"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 16px",
                }}
              >
                Data Handling
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Data residency detail */}
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    Regions
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {provider.compliance.dataResidency.euOnly
                      ? "EU only"
                      : provider.compliance.dataResidency.regions.join(", ") || "—"}
                  </div>
                  {provider.compliance.dataResidency.euRegionDetails ? (
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.8125rem",
                        color: "var(--color-text-secondary)",
                        margin: "6px 0 0",
                        lineHeight: 1.6,
                      }}
                    >
                      {provider.compliance.dataResidency.euRegionDetails}
                    </p>
                  ) : null}
                </div>

                {/* Retention policy */}
                {provider.compliance.dataUsage.retentionPolicy ? (
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Retention Policy
                    </div>
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.8125rem",
                        color: "var(--color-text-secondary)",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {provider.compliance.dataUsage.retentionPolicy}
                    </p>
                  </div>
                ) : null}

                {/* Additional details */}
                {provider.compliance.dataUsage.details ? (
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Additional Details
                    </div>
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.8125rem",
                        color: "var(--color-text-secondary)",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {provider.compliance.dataUsage.details}
                    </p>
                  </div>
                ) : null}

                {/* Sub-processors */}
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    Sub-processors
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {provider.compliance.subProcessors.disclosed ? (
                      <>
                        <span style={{ color: "var(--color-compliant)" }}>✓</span>
                        {provider.compliance.subProcessors.url ? (
                          <a
                            href={provider.compliance.subProcessors.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--color-link)", textDecoration: "none" }}
                          >
                            Disclosed ↗
                          </a>
                        ) : (
                          "Disclosed"
                        )}
                        {provider.compliance.subProcessors.includesEuEntities === true
                          ? " (includes EU entities)"
                          : provider.compliance.subProcessors.includesEuEntities === false
                          ? " (no EU entities)"
                          : null}
                      </>
                    ) : (
                      <>
                        <span style={{ color: "var(--color-noncompliant)" }}>✗</span>
                        Not disclosed
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
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                padding: "20px 24px",
              }}
              aria-labelledby="certs-heading"
            >
              <h2
                id="certs-heading"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 16px",
                }}
              >
                Certifications & EU AI Act
              </h2>

              {provider.compliance.certifications.length > 0 ? (
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      marginBottom: "8px",
                    }}
                  >
                    Certifications
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {provider.compliance.certifications.map((cert) => (
                      <span
                        key={cert}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "var(--color-text-secondary)",
                          backgroundColor: "var(--color-surface-alt)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "3px",
                          padding: "2px 8px",
                        }}
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    color: "var(--color-text-muted)",
                    margin: "0 0 16px",
                    fontStyle: "italic",
                  }}
                >
                  No certifications disclosed.
                </p>
              )}

              <div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  EU AI Act Status
                </div>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color:
                      provider.compliance.euAiAct.status === "compliant"
                        ? "#15803d"
                        : provider.compliance.euAiAct.status === "monitoring"
                        ? "#92400e"
                        : "#6b7280",
                    backgroundColor:
                      provider.compliance.euAiAct.status === "compliant"
                        ? "#f0fdf4"
                        : provider.compliance.euAiAct.status === "monitoring"
                        ? "#fffbeb"
                        : "#f8f8f7",
                    border: `1px solid ${
                      provider.compliance.euAiAct.status === "compliant"
                        ? "#bbf7d0"
                        : provider.compliance.euAiAct.status === "monitoring"
                        ? "#fde68a"
                        : "#e2e2de"
                    }`,
                    borderRadius: "4px",
                    padding: "2px 8px",
                    marginBottom: "6px",
                  }}
                >
                  {provider.compliance.euAiAct.status.replace(/_/g, " ")}
                </span>
                {provider.compliance.euAiAct.details ? (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-secondary)",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {provider.compliance.euAiAct.details}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* ── Verification metadata ── */}
          <section
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              padding: "20px 24px",
            }}
            aria-labelledby="verification-heading"
          >
            <h2
              id="verification-heading"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 16px",
              }}
            >
              Verification
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <MetaRow label="Last verified" value={provider.lastVerified ?? "Not verified"} mono />
              <MetaRow
                label="Verified by"
                value={
                  provider.verifiedBy === "stub"
                    ? "Not yet verified"
                    : provider.verifiedBy === "ai_draft"
                    ? "AI-assisted draft (pending review)"
                    : provider.verifiedBy
                }
              />
              <MetaRow
                label="Pricing tier"
                value={
                  provider.pricingTier
                    ? provider.pricingTier.replace(/_/g, " ")
                    : "Unknown"
                }
              />
            </div>

            {/* Source URLs */}
            {provider.sourceUrls && provider.sourceUrls.length > 0 ? (
              <div style={{ marginTop: "16px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "8px",
                  }}
                >
                  Sources
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {provider.sourceUrls.map((url, i) => (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8125rem",
                          color: "var(--color-link)",
                          textDecoration: "none",
                          wordBreak: "break-all",
                        }}
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
              <div style={{ marginTop: "16px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "8px",
                  }}
                >
                  Notes
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {provider.notes}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        {/* ── Models offered section ── */}
        {providerModels.length > 0 ? (
          <section style={{ marginTop: "32px" }} aria-labelledby="models-heading">
            <h2
              id="models-heading"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                margin: "0 0 16px",
              }}
            >
              Models ({providerModels.length})
            </h2>

            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    backgroundColor: "var(--color-surface)",
                  }}
                  aria-label={`Models offered by ${provider.name}`}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "var(--color-surface-alt)",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      {["Model", "Modality", "Context", "Input", "Output"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 16px",
                            textAlign: "left",
                            fontFamily: "var(--font-body)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {providerModels.map((m) => (
                      <tr
                        key={`${m.id}::${m.providerSlug}`}
                        style={{ borderBottom: "1px solid var(--color-border)" }}
                      >
                        <td style={{ padding: "10px 16px" }}>
                          <Link
                            href={`/model/${encodeURIComponent(m.id.split("/").pop() ?? m.id)}`}
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              color: "var(--color-text-primary)",
                              textDecoration: "none",
                            }}
                          >
                            {m.displayName}
                          </Link>
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.75rem",
                              color: "var(--color-text-muted)",
                              marginTop: "2px",
                            }}
                          >
                            {m.id}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontFamily: "var(--font-body)",
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {m.modality}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {m.contextWindow
                            ? m.contextWindow >= 1_000_000
                              ? `${(m.contextWindow / 1_000_000).toFixed(1)}M`
                              : m.contextWindow >= 1_000
                              ? `${(m.contextWindow / 1_000).toFixed(0)}K`
                              : `${m.contextWindow}`
                            : "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {formatPrice(m.inputPricePerMTokens)}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {formatPrice(m.outputPricePerMTokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {/* Back link */}
        <div style={{ marginTop: "40px" }}>
          <Link
            href="/providers"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-link)",
              textDecoration: "none",
            }}
          >
            ← Back to all providers
          </Link>
        </div>
      </main>
    </>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

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
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.875rem",
          color,
          width: "14px",
          textAlign: "center",
          flexShrink: 0,
          marginTop: "1px",
        }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <div>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary)",
          }}
        >
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-link)", textDecoration: "none" }}
            >
              {label} ↗
            </a>
          ) : (
            label
          )}
        </span>
        {secondary ? (
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
              marginLeft: "6px",
            }}
          >
            ({secondary})
          </span>
        ) : null}
        {note ? (
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
              marginLeft: "6px",
            }}
          >
            {note}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--color-text-secondary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--color-text-primary)",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
