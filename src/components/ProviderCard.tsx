// ProviderCard — compact compliance summary card for the /providers listing page.
// Server component — hover handled via CSS class (no JS event handlers needed).

import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ComplianceBadge, ComplianceBadgeList } from "@/components/ComplianceBadge";
import { VerificationLabel } from "@/components/VerificationLabel";
import { getComplianceTier, isFullProvider, TIER_CLASSES } from "@/lib/compliance";
import type { AnyProvider, ComplianceTier } from "@/lib/compliance";

interface ProviderCardProps {
  provider: AnyProvider;
  modelCount?: number;
}

export async function ProviderCard({ provider, modelCount }: ProviderCardProps) {
  const tier = getComplianceTier(provider);
  const verified = isFullProvider(provider);
  const t = await getTranslations("ProviderCard");
  const tType = await getTranslations("ProviderType");

  const tierLabel: Record<ComplianceTier, string> = {
    compliant: t("tiers.compliant"),
    partial: t("tiers.partial"),
    noncompliant: t("tiers.noncompliant"),
    unverified: t("tiers.unverified"),
  };

  return (
    // provider-card class provides the :hover box-shadow via globals.css —
    // no JS event handlers needed, no "use client" required.
    <Link
      href={`/provider/${provider.slug}`}
      className={`provider-card block bg-surface border border-border border-l-[3px] ${TIER_CLASSES[tier].accentBorder} rounded text-inherit no-underline transition-shadow duration-[120ms] ease-in-out px-5 py-4`}
    >
      {/* Name + tier */}
      <div className="flex items-start justify-between gap-2 mb-[10px]">
        <span className="font-body text-[0.9375rem] font-semibold text-text-primary leading-[1.3]">
          {provider.name}
        </span>
        <span
          className={`font-body text-[0.6875rem] font-medium whitespace-nowrap shrink-0 ${TIER_CLASSES[tier].text}`}
        >
          {tierLabel[tier]}
        </span>
      </div>

      {/* Badges */}
      {verified ? (
        <ComplianceBadgeList compliance={provider.compliance} size="sm" className="flex flex-wrap gap-1 mb-[10px]" />
      ) : (
        <div className="mb-[10px]">
          <ComplianceBadge variant="unverified" size="sm" />
        </div>
      )}

      {/* Footer meta */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-body text-xs text-text-muted">
          {tType(provider.type)}
          {modelCount !== undefined
            ? ` · ${modelCount !== 1 ? t("modelCountPlural", { count: modelCount }) : t("modelCount", { count: modelCount })}`
            : ""}
        </span>
        <VerificationLabel provider={provider} className="font-mono text-[0.6875rem] text-text-muted" />
      </div>
    </Link>
  );
}
