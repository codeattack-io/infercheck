import { useTranslations } from "next-intl";
import { TIER_CLASSES, getComplianceProperties, type Compliance, type ComplianceTier } from "@/lib/compliance";

interface ComplianceBadgeProps {
  tier: ComplianceTier;
  label?: "short" | "long";
  compliance?: Compliance | null;
  className?: string;
}

export function ComplianceBadge({ tier, label = "short", compliance, className }: ComplianceBadgeProps) {
  const t = useTranslations("ComplianceBadge");
  const classes = TIER_CLASSES[tier];
  const title = [
    t(`long.${tier}`),
    ...(compliance ? getComplianceProperties(compliance) : []).map((p) => t(`properties.${p}`)),
  ].join(" · ");

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-2 text-13 font-semibold whitespace-nowrap cursor-help",
        classes.text,
        classes.bg,
        className ?? "",
      ].join(" ")}
    >
      <TierIcon tier={tier} />
      {t(`${label}.${tier}`)}
    </span>
  );
}

export function TierIcon({
  tier,
  className = "size-3 shrink-0",
  size,
}: {
  tier: ComplianceTier;
  className?: string;
  size?: number;
}) {
  switch (tier) {
    case "compliant":
      return (
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          width={size}
          height={size}
          aria-hidden="true"
        >
          <path d="m2 6.5 2.6 2.5L10 3.5" />
        </svg>
      );
    case "partial":
      return (
        <svg viewBox="0 0 12 12" className={className} width={size} height={size} aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 1.5a4.5 4.5 0 0 1 0 9z" fill="currentColor" />
        </svg>
      );
    case "noncompliant":
      return (
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={className}
          width={size}
          height={size}
          aria-hidden="true"
        >
          <path d="m3 3 6 6M9 3 3 9" />
        </svg>
      );
    case "unverified":
      return (
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={className}
          width={size}
          height={size}
          aria-hidden="true"
        >
          <path d="M4.2 4.6a1.9 1.9 0 1 1 2.6 1.8c-.5.3-.8.7-.8 1.2" />
          <circle cx="6" cy="9.6" r=".6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
