// ProviderCard — compact compliance summary card for the /providers listing page.
// Client component needed for hover interaction.

"use client";

import Link from "next/link";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { getComplianceTier, isFullProvider } from "@/lib/compliance";
import type { AnyProvider, ComplianceTier } from "@/lib/compliance";

const TIER_BORDER: Record<ComplianceTier, string> = {
  compliant: "var(--color-compliant)",
  partial: "var(--color-partial)",
  noncompliant: "var(--color-noncompliant)",
  unverified: "var(--color-unverified)",
};

const TIER_LABEL: Record<ComplianceTier, string> = {
  compliant: "EU Compliant",
  partial: "EU + SCCs",
  noncompliant: "Non-compliant",
  unverified: "Unverified",
};

interface ProviderCardProps {
  provider: AnyProvider;
  modelCount?: number;
}

export function ProviderCard({ provider, modelCount }: ProviderCardProps) {
  const tier = getComplianceTier(provider);
  const verified = isFullProvider(provider);

  return (
    <Link
      href={`/provider/${provider.slug}`}
      style={{
        display: "block",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${TIER_BORDER[tier]}`,
        borderRadius: "4px",
        padding: "16px 20px",
        textDecoration: "none",
        transition: "box-shadow 120ms ease, border-color 120ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
      }}
    >
      {/* Name + tier */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            lineHeight: 1.3,
          }}
        >
          {provider.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.6875rem",
            fontWeight: 500,
            color:
              tier === "compliant"
                ? "#15803d"
                : tier === "partial"
                ? "#92400e"
                : tier === "noncompliant"
                ? "#b91c1c"
                : "#6b7280",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {TIER_LABEL[tier]}
        </span>
      </div>

      {/* Badges */}
      {verified ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
          {provider.compliance.dataResidency.euOnly ? (
            <ComplianceBadge variant="eu-only" size="sm" />
          ) : provider.compliance.sccs ? (
            <ComplianceBadge variant="eu-sccs" size="sm" />
          ) : null}
          {provider.compliance.dpa.available ? (
            <ComplianceBadge variant="dpa" size="sm" />
          ) : null}
          {provider.compliance.dataUsage.trainsOnCustomerData ? (
            <ComplianceBadge variant="trains-on-data" size="sm" />
          ) : (
            <ComplianceBadge variant="no-training" size="sm" />
          )}
        </div>
      ) : (
        <div style={{ marginBottom: "10px" }}>
          <ComplianceBadge variant="unverified" size="sm" />
        </div>
      )}

      {/* Footer meta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
          }}
        >
          {provider.type.replace(/_/g, " ")}
          {modelCount !== undefined ? ` · ${modelCount} model${modelCount !== 1 ? "s" : ""}` : ""}
        </span>
        {provider.lastVerified ? (
          <time
            dateTime={provider.lastVerified}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              color: "var(--color-text-muted)",
            }}
          >
            {provider.lastVerified}
          </time>
        ) : null}
      </div>
    </Link>
  );
}
