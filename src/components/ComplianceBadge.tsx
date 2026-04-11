// Server component — no "use client" needed.
// Renders a single compliance property badge.
//
// Uses useTranslations (sync) so it can be rendered from both server and
// client component trees (async server components cannot be children of
// client components).

import { useTranslations } from "next-intl";

export type BadgeVariant =
  | "eu-only"
  | "dpa"
  | "eu-sccs"
  | "no-training"
  | "trains-on-data"
  | "us-only"
  | "unverified";

interface ComplianceBadgeProps {
  variant: BadgeVariant;
  size?: "sm" | "md";
}

const BADGE_STYLE: Record<BadgeVariant, { classes: string; dotClasses: string }> = {
  "eu-only": {
    classes: "bg-compliant-bg border-[#bbf7d0] text-[#15803d]",
    dotClasses: "bg-compliant",
  },
  dpa: {
    classes: "bg-compliant-bg border-[#bbf7d0] text-[#15803d]",
    dotClasses: "bg-compliant",
  },
  "eu-sccs": {
    classes: "bg-partial-bg border-[#fde68a] text-[#92400e]",
    dotClasses: "bg-partial",
  },
  "no-training": {
    classes: "bg-compliant-bg border-[#bbf7d0] text-[#15803d]",
    dotClasses: "bg-compliant",
  },
  "trains-on-data": {
    classes: "bg-noncompliant-bg border-[#fecaca] text-[#b91c1c]",
    dotClasses: "bg-noncompliant",
  },
  "us-only": {
    classes: "bg-noncompliant-bg border-[#fecaca] text-[#b91c1c]",
    dotClasses: "bg-noncompliant",
  },
  unverified: {
    classes: "bg-unverified-bg border-[#e2e2de] text-[#6b7280]",
    dotClasses: "bg-unverified",
  },
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
    "us-only": t("usOnly"),
    unverified: t("unverified"),
  };

  const style = BADGE_STYLE[variant];
  const sz = SIZE_CLASSES[size];

  return (
    <span
      className={[
        "inline-flex items-center gap-[5px] border rounded font-medium font-body whitespace-nowrap leading-[1.4]",
        style.classes,
        sz.badge,
      ].join(" ")}
    >
      <span
        className={["rounded-full shrink-0", style.dotClasses, sz.dot].join(" ")}
        aria-hidden="true"
      />
      {LABEL_MAP[variant]}
    </span>
  );
}
