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
import Link from "next/link";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAllProviders } from "@/lib/providers";
import { getComplianceTier, isFullProvider } from "@/lib/compliance";
import type { AnyProvider } from "@/lib/compliance";
import { Nav } from "@/components/Nav";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
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

const TIER_CONFIG: Record<ComplianceTier, { label: string; color: string; bg: string; border: string }> = {
  compliant: { label: "EU Compliant", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  partial: { label: "Partial (EU + SCCs)", color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  noncompliant: { label: "Non-compliant", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  unverified: { label: "Unverified", color: "#6b7280", bg: "#f8f8f7", border: "#e2e2de" },
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  const rows = await db
    .select({ displayName: models.displayName })
    .from(models)
    .where(and(eq(models.isActive, true), sql`${models.id} LIKE ${"%" + decoded}`))
    .limit(1);

  const name = rows[0]?.displayName ?? decoded;

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
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  // Parallel: DB + provider map
  const [modelRows, allProviders] = await Promise.all([
    db
      .select()
      .from(models)
      .where(and(eq(models.isActive, true), sql`${models.id} LIKE ${"%" + decoded}`))
      .orderBy(models.providerSlug),
    Promise.resolve(getAllProviders()),
  ]);

  if (modelRows.length === 0) {
    notFound();
  }

  const providerMap = new Map<string, AnyProvider>(allProviders.map((p) => [p.slug, p]));

  const modelName = modelRows[0].displayName;

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
      <Nav />
      <DisclaimerBanner />

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
            <li style={{ color: "var(--color-text-secondary)" }}>{modelName}</li>
          </ol>
        </nav>

        {/* Heading */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              lineHeight: 1.2,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            {modelName}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            {modelRows.length === 1
              ? "Available from 1 provider"
              : `Available from ${modelRows.length} providers`}
            {" — compare compliance, pricing, and data residency below."}
          </p>
        </div>

        {/* Provider cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {modelRows.map((row) => {
            const provider = providerMap.get(row.providerSlug) ?? null;
            const tier = provider ? getComplianceTier(provider) : "unverified";
            const tierCfg = TIER_CONFIG[tier];
            const verified = provider !== null && isFullProvider(provider);

            return (
              <div
                key={`${row.id}::${row.providerSlug}`}
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderLeft: `3px solid ${
                    tier === "compliant"
                      ? "var(--color-compliant)"
                      : tier === "partial"
                      ? "var(--color-partial)"
                      : tier === "noncompliant"
                      ? "var(--color-noncompliant)"
                      : "var(--color-unverified)"
                  }`,
                  borderRadius: "4px",
                  padding: "20px 24px",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      {provider?.name ?? row.providerSlug}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "2px 8px",
                        backgroundColor: tierCfg.bg,
                        border: `1px solid ${tierCfg.border}`,
                        borderRadius: "4px",
                        fontFamily: "var(--font-body)",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: tierCfg.color,
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: tierCfg.color,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                      {tierCfg.label}
                    </div>
                  </div>

                  <Link
                    href={`/provider/${row.providerSlug}`}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "var(--color-accent)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      border: "1px solid var(--color-accent)",
                      borderRadius: "4px",
                      backgroundColor: "var(--color-accent-subtle)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Full provider profile →
                  </Link>
                </div>

                {/* Detail grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {/* Pricing */}
                  <DetailSection title="Pricing (per 1M tokens)">
                    <DetailRow label="Input" value={formatPrice(row.inputPricePerMTokens)} mono />
                    <DetailRow label="Output" value={formatPrice(row.outputPricePerMTokens)} mono />
                    <DetailRow label="Context" value={formatContext(row.contextWindow)} mono />
                  </DetailSection>

                  {/* Compliance summary */}
                  {verified && provider !== null && isFullProvider(provider) ? (
                    <DetailSection title="GDPR Compliance">
                      <BooleanRow
                        label="EU data residency"
                        value={provider.compliance.dataResidency.euOnly}
                      />
                      <BooleanRow
                        label="DPA available"
                        value={provider.compliance.dpa.available}
                        href={provider.compliance.dpa.url ?? undefined}
                      />
                      <BooleanRow
                        label="No training on data"
                        value={!provider.compliance.dataUsage.trainsOnCustomerData}
                      />
                      <BooleanRow
                        label="SCCs in place"
                        value={provider.compliance.sccs ?? false}
                      />
                    </DetailSection>
                  ) : (
                    <DetailSection title="GDPR Compliance">
                      <p
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8125rem",
                          color: "var(--color-text-muted)",
                          margin: 0,
                          fontStyle: "italic",
                        }}
                      >
                        Not yet verified
                      </p>
                    </DetailSection>
                  )}

                  {/* Data residency detail */}
                  {verified && provider !== null && isFullProvider(provider) ? (
                    <DetailSection title="Data Residency">
                      <DetailRow
                        label="Regions"
                        value={
                          provider.compliance.dataResidency.euOnly
                            ? "EU only"
                            : provider.compliance.dataResidency.regions.join(", ")
                        }
                      />
                      {provider.compliance.dataResidency.euRegionDetails ? (
                        <p
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                            margin: "6px 0 0",
                            lineHeight: 1.5,
                          }}
                        >
                          {provider.compliance.dataResidency.euRegionDetails}
                        </p>
                      ) : null}
                    </DetailSection>
                  ) : null}

                  {/* Badges */}
                  {verified && provider !== null && isFullProvider(provider) ? (
                    <DetailSection title="Compliance Badges">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
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
                      {provider.lastVerified ? (
                        <p
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.75rem",
                            color: "var(--color-text-muted)",
                            margin: "8px 0 0",
                          }}
                        >
                          Verified {provider.lastVerified}
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
        <div style={{ marginTop: "40px" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-link)",
              textDecoration: "none",
            }}
          >
            ← Back to all models
          </Link>
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "24px 40px",
          marginTop: "auto",
        }}
        className="px-4 sm:px-6 lg:px-10"
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            fontFamily: "var(--font-body)",
            fontSize: "0.8125rem",
            color: "var(--color-text-muted)",
          }}
        >
          Data licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-link)" }}
          >
            CC BY-NC-SA 4.0
          </a>
          . Not legal advice.
        </div>
      </footer>
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
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "10px",
        }}
      >
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
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "8px",
        marginBottom: "4px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--color-text-secondary)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--color-text-primary)",
          textAlign: "right",
        }}
      >
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "4px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          color,
          width: "14px",
          textAlign: "center",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
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
    </div>
  );
}
