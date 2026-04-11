// ProviderCard — compact compliance summary card for the /providers listing page.
// Server component — hover handled via CSS class (no JS event handlers needed).

import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { getComplianceTier, isFullProvider } from "@/lib/compliance";
import type { AnyProvider, ComplianceTier } from "@/lib/compliance";

const TIER_BORDER: Record<ComplianceTier, string> = {
  compliant: "var(--color-compliant)",
  partial: "var(--color-partial)",
  noncompliant: "var(--color-noncompliant)",
  unverified: "var(--color-unverified)",
};

const TIER_TEXT_CLASS: Record<ComplianceTier, string> = {
  compliant: "text-[#15803d]",
  partial: "text-[#92400e]",
  noncompliant: "text-[#b91c1c]",
  unverified: "text-[#6b7280]",
};

interface ProviderCardProps {
  provider: AnyProvider;
  modelCount?: number;
}

export async function ProviderCard({ provider, modelCount }: ProviderCardProps) {
  const tier = getComplianceTier(provider);
  const verified = isFullProvider(provider);
  const t = await getTranslations("ProviderCard");

  const tierLabel: Record<ComplianceTier, string> = {
    compliant: t("tiers.compliant"),
    partial: t("tiers.partial"),
    noncompliant: t("tiers.noncompliant"),
    unverified: t("tiers.unverified"),
  };

  return (
    // provider-card class provides the :hover box-shadow via globals.css —
    // no JS event handlers needed, no "use client" required.
    // borderLeft uses style because it's a dynamic value from TIER_BORDER map.
    <Link
      href={`/provider/${provider.slug}`}
      className="provider-card block bg-surface border border-border rounded text-inherit no-underline transition-shadow duration-[120ms] ease-in-out px-5 py-4"
      style={{ borderLeft: `3px solid ${TIER_BORDER[tier]}` }}
    >
      {/* Name + tier */}
      <div className="flex items-start justify-between gap-2 mb-[10px]">
        <span className="font-body text-[0.9375rem] font-semibold text-text-primary leading-[1.3]">
          {provider.name}
        </span>
        <span className={`font-body text-[0.6875rem] font-medium whitespace-nowrap shrink-0 ${TIER_TEXT_CLASS[tier]}`}>
          {tierLabel[tier]}
        </span>
      </div>

      {/* Badges */}
      {verified ? (
        <div className="flex flex-wrap gap-1 mb-[10px]">
          {provider.compliance.dataResidency.euOnly ? (
            <ComplianceBadge variant="eu-only" size="sm" />
          ) : provider.compliance.sccs ? (
            <ComplianceBadge variant="eu-sccs" size="sm" />
          ) : null}
          {provider.compliance.dpa.available ? (
            <ComplianceBadge variant="dpa" size="sm" />
          ) : null}
          {provider.compliance.dataUsage.trainsOnCustomerData === true ? (
            <ComplianceBadge variant="trains-on-data" size="sm" />
          ) : provider.compliance.dataUsage.trainsOnCustomerData === false ? (
            <ComplianceBadge variant="no-training" size="sm" />
          ) : (
            <ComplianceBadge variant="training-unknown" size="sm" />
          )}
        </div>
      ) : (
        <div className="mb-[10px]">
          <ComplianceBadge variant="unverified" size="sm" />
        </div>
      )}

      {/* Footer meta */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-body text-xs text-text-muted">
          {provider.type.replace(/_/g, " ")}
          {modelCount !== undefined
            ? ` · ${modelCount !== 1 ? t("modelCountPlural", { count: modelCount }) : t("modelCount", { count: modelCount })}`
            : ""}
        </span>
        {provider.lastVerified ? (
          <time
            dateTime={provider.lastVerified}
            className="font-mono text-[0.6875rem] text-text-muted"
          >
            {provider.lastVerified}
          </time>
        ) : null}
      </div>
    </Link>
  );
}
