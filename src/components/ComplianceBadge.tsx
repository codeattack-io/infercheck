// Server component — no "use client" needed.
// Renders a single compliance property badge.
//
// Uses useTranslations (sync) so it can be rendered from both server and
// client component trees (async server components cannot be children of
// client components).

import { useTranslations } from "next-intl";
import { TIER_CLASSES, type ComplianceTier } from "@/lib/compliance";
import type { Compliance } from "@/../data/schema";

export type BadgeVariant =
  "eu-only" | "dpa" | "eu-sccs" | "no-training" | "trains-on-data" | "training-unknown" | "us-only" | "unverified";

interface ComplianceBadgeProps {
  variant: BadgeVariant;
  size?: "sm" | "md";
}

const BADGE_TIER: Record<BadgeVariant, ComplianceTier> = {
  "eu-only": "compliant",
  dpa: "compliant",
  "eu-sccs": "partial",
  "no-training": "compliant",
  "trains-on-data": "noncompliant",
  "training-unknown": "unverified",
  "us-only": "noncompliant",
  unverified: "unverified",
};

const SIZE_CLASSES = {
  sm: { badge: "text-[0.6875rem] px-1.5 py-px", dot: "size-[5px]" },
  md: { badge: "text-xs px-2 py-0.5", dot: "size-[6px]" },
};

export function ComplianceBadge({ variant, size = "md" }: ComplianceBadgeProps) {
  const t = useTranslations("ComplianceBadge");

  const LABEL_MAP: Record<BadgeVariant, string> = {
    "eu-only": t("euOnly"),
    dpa: t("dpa"),
    "eu-sccs": t("euSccs"),
    "no-training": t("noTraining"),
    "trains-on-data": t("trainsOnData"),
    "training-unknown": t("trainingUnknown"),
    "us-only": t("usOnly"),
    unverified: t("unverified"),
  };

  const tier = TIER_CLASSES[BADGE_TIER[variant]];
  const sz = SIZE_CLASSES[size];

  return (
    <span
      className={[
        "inline-flex items-center gap-[5px] border rounded font-medium font-body whitespace-nowrap leading-[1.4]",
        tier.bg,
        tier.border,
        tier.text,
        sz.badge,
      ].join(" ")}
    >
      <span className={["rounded-full shrink-0", tier.dot, sz.dot].join(" ")} aria-hidden="true" />
      {LABEL_MAP[variant]}
    </span>
  );
}

export function getBadgeVariants(compliance: Compliance): BadgeVariant[] {
  const variants: BadgeVariant[] = [];
  if (compliance.dataResidency.euOnly) {
    variants.push("eu-only");
  } else if (compliance.sccs) {
    variants.push("eu-sccs");
  }
  if (compliance.dpa.available) variants.push("dpa");
  const trains = compliance.dataUsage.trainsOnCustomerData;
  variants.push(trains === true ? "trains-on-data" : trains === false ? "no-training" : "training-unknown");
  return variants;
}

interface ComplianceBadgeListProps {
  compliance: Compliance;
  size?: "sm" | "md";
  className?: string;
}

export function ComplianceBadgeList({
  compliance,
  size,
  className = "flex flex-wrap gap-1",
}: ComplianceBadgeListProps) {
  return (
    <div className={className}>
      {getBadgeVariants(compliance).map((variant) => (
        <ComplianceBadge key={variant} variant={variant} size={size} />
      ))}
    </div>
  );
}
