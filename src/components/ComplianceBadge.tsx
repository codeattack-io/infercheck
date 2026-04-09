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
  { label: string; dotColor: string; bg: string; border: string; textColor: string }
> = {
  "eu-only": {
    label: "EU Only",
    dotColor: "var(--color-compliant)",
    bg: "var(--color-compliant-bg)",
    border: "#bbf7d0",
    textColor: "#15803d",
  },
  dpa: {
    label: "DPA",
    dotColor: "var(--color-compliant)",
    bg: "var(--color-compliant-bg)",
    border: "#bbf7d0",
    textColor: "#15803d",
  },
  "eu-sccs": {
    label: "EU + SCCs",
    dotColor: "var(--color-partial)",
    bg: "var(--color-partial-bg)",
    border: "#fde68a",
    textColor: "#92400e",
  },
  "no-training": {
    label: "No Training",
    dotColor: "var(--color-compliant)",
    bg: "var(--color-compliant-bg)",
    border: "#bbf7d0",
    textColor: "#15803d",
  },
  "trains-on-data": {
    label: "Trains on Data",
    dotColor: "var(--color-noncompliant)",
    bg: "var(--color-noncompliant-bg)",
    border: "#fecaca",
    textColor: "#b91c1c",
  },
  "us-only": {
    label: "US Only",
    dotColor: "var(--color-noncompliant)",
    bg: "var(--color-noncompliant-bg)",
    border: "#fecaca",
    textColor: "#b91c1c",
  },
  unverified: {
    label: "Unverified",
    dotColor: "var(--color-unverified)",
    bg: "var(--color-unverified-bg)",
    border: "#e2e2de",
    textColor: "#6b7280",
  },
};

export function ComplianceBadge({ variant, size = "md" }: ComplianceBadgeProps) {
  const cfg = BADGE_CONFIG[variant];
  const dotSize = size === "sm" ? "5px" : "6px";
  const fontSize = size === "sm" ? "0.6875rem" : "0.75rem";
  const padding = size === "sm" ? "1px 6px" : "2px 8px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: "4px",
        padding,
        fontSize,
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        color: cfg.textColor,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          backgroundColor: cfg.dotColor,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}
