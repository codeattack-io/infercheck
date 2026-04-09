// Server component — no "use client" needed.
// Renders a single compliance property badge.

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

const BADGE_CONFIG: Record<
  BadgeVariant,
  { label: string; classes: string; dotClasses: string }
> = {
  "eu-only": {
    label: "EU Only",
    classes: "bg-compliant-bg border-[#bbf7d0] text-[#15803d]",
    dotClasses: "bg-compliant",
  },
  dpa: {
    label: "DPA",
    classes: "bg-compliant-bg border-[#bbf7d0] text-[#15803d]",
    dotClasses: "bg-compliant",
  },
  "eu-sccs": {
    label: "EU + SCCs",
    classes: "bg-partial-bg border-[#fde68a] text-[#92400e]",
    dotClasses: "bg-partial",
  },
  "no-training": {
    label: "No Training",
    classes: "bg-compliant-bg border-[#bbf7d0] text-[#15803d]",
    dotClasses: "bg-compliant",
  },
  "trains-on-data": {
    label: "Trains on Data",
    classes: "bg-noncompliant-bg border-[#fecaca] text-[#b91c1c]",
    dotClasses: "bg-noncompliant",
  },
  "us-only": {
    label: "US Only",
    classes: "bg-noncompliant-bg border-[#fecaca] text-[#b91c1c]",
    dotClasses: "bg-noncompliant",
  },
  unverified: {
    label: "Unverified",
    classes: "bg-unverified-bg border-[#e2e2de] text-[#6b7280]",
    dotClasses: "bg-unverified",
  },
};

const SIZE_CLASSES = {
  sm: { badge: "text-[0.6875rem] px-1.5 py-px", dot: "size-[5px]" },
  md: { badge: "text-xs px-2 py-0.5", dot: "size-[6px]" },
};

export function ComplianceBadge({ variant, size = "md" }: ComplianceBadgeProps) {
  const cfg = BADGE_CONFIG[variant];
  const sz = SIZE_CLASSES[size];

  return (
    <span
      className={[
        "inline-flex items-center gap-[5px] border rounded font-medium font-body whitespace-nowrap leading-[1.4]",
        cfg.classes,
        sz.badge,
      ].join(" ")}
    >
      <span
        className={["rounded-full shrink-0", cfg.dotClasses, sz.dot].join(" ")}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}
