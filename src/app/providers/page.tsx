// /providers — browsable list of all providers, grouped by compliance tier.
// React Server Component — data loaded at request time via file-system + DB.

import type { Metadata } from "next";
import { cache } from "react";
import { Nav } from "@/components/Nav";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { ProviderCard } from "@/components/ProviderCard";
import { getAllProviders } from "@/lib/providers";
import { getComplianceTier } from "@/lib/compliance";
import type { AnyProvider, ComplianceTier } from "@/lib/compliance";
import { db } from "@/lib/db";
import { models } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import Link from "next/link";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "AI Inference Providers — GDPR Compliance Directory",
  description:
    "Browse 100+ AI inference providers by GDPR compliance tier. Filter by EU data residency, DPA availability, training policy, and more.",
  openGraph: {
    title: "AI Inference Providers — GDPR Compliance Directory",
    description:
      "Compare AI inference providers by GDPR compliance: EU-only data residency, DPA, training opt-out, and certifications.",
    type: "website",
  },
};

// ─── Data fetching ────────────────────────────────────────────────────────────

const getModelCountsByProvider = cache(async (): Promise<Map<string, number>> => {
  const rows = await db
    .select({
      providerSlug: models.providerSlug,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(models)
    .where(eq(models.isActive, true))
    .groupBy(models.providerSlug);

  return new Map(rows.map((r) => [r.providerSlug, r.count]));
});

// ─── Tier grouping config ──────────────────────────────────────────────────────

const TIER_ORDER: ComplianceTier[] = ["compliant", "partial", "noncompliant", "unverified"];

const TIER_META: Record<ComplianceTier, { label: string; description: string; color: string }> = {
  compliant: {
    label: "EU Compliant",
    description: "EU-only data residency, DPA available, no training on customer data",
    color: "var(--color-compliant)",
  },
  partial: {
    label: "Partial (EU + SCCs)",
    description: "DPA available and SCCs in place, but not EU-only",
    color: "var(--color-partial)",
  },
  noncompliant: {
    label: "Non-compliant",
    description: "No DPA or trains on customer data without opt-out",
    color: "var(--color-noncompliant)",
  },
  unverified: {
    label: "Unverified",
    description: "Compliance data not yet verified",
    color: "var(--color-unverified)",
  },
};

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(allProviders: AnyProvider[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "GDPR AI Directory — Provider Compliance Dataset",
    "description":
      "Structured compliance metadata for AI inference providers. Fields include EU data residency, DPA availability, training policy, certifications, and EU AI Act status.",
    "url": "https://gdpr-ai.directory/providers",
    "license": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "creator": {
      "@type": "Person",
      "name": "Carlo Noelle",
      "url": "https://gdpr-ai.directory",
    },
    "hasPart": allProviders.slice(0, 50).map((p) => ({
      "@type": "Organization",
      "name": p.name,
      "url": p.website,
    })),
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ProvidersPage() {
  const [allProviders, modelCounts] = await Promise.all([
    Promise.resolve(getAllProviders()),
    getModelCountsByProvider(),
  ]);

  // Group by tier
  const grouped = new Map<ComplianceTier, AnyProvider[]>();
  for (const tier of TIER_ORDER) {
    grouped.set(tier, []);
  }
  for (const p of allProviders) {
    const tier = getComplianceTier(p);
    grouped.get(tier)!.push(p);
  }

  // Sort each group alphabetically
  for (const [, group] of grouped) {
    group.sort((a, b) => a.name.localeCompare(b.name));
  }

  const totalVerified = allProviders.filter(
    (p) => p.verifiedBy !== "stub" && p.compliance !== null,
  ).length;

  const jsonLd = buildJsonLd(allProviders);

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
        {/* Heading */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.5rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              lineHeight: 1.15,
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            AI inference providers,<br />
            by GDPR compliance tier.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-secondary)",
              margin: 0,
              maxWidth: "55ch",
              lineHeight: 1.6,
            }}
          >
            {allProviders.length} providers indexed. {totalVerified} with verified compliance data.
            Click any provider for the full profile.
          </p>
        </div>

        {/* Tier sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
          {TIER_ORDER.map((tier) => {
            const group = grouped.get(tier)!;
            if (group.length === 0) return null;
            const meta = TIER_META[tier];

            return (
              <section key={tier} aria-labelledby={`tier-${tier}`}>
                {/* Tier header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "12px",
                    marginBottom: "16px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: meta.color,
                      flexShrink: 0,
                      position: "relative",
                      top: "-1px",
                    }}
                    aria-hidden="true"
                  />
                  <h2
                    id={`tier-${tier}`}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      margin: 0,
                    }}
                  >
                    {meta.label}
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.875rem",
                        fontWeight: 400,
                        color: "var(--color-text-muted)",
                        marginLeft: "8px",
                      }}
                    >
                      ({group.length})
                    </span>
                  </h2>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {meta.description}
                  </span>
                </div>

                {/* Provider grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {group.map((p) => (
                    <ProviderCard
                      key={p.slug}
                      provider={p}
                      modelCount={modelCounts.get(p.slug)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
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
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
              margin: 0,
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
          </p>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
              textDecoration: "none",
            }}
          >
            ← Browse models
          </Link>
        </div>
      </footer>
    </>
  );
}
