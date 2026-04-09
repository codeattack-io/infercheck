// Server component.
// Renders a cluster of compliance badges for a provider.

import { ComplianceBadge } from "@/components/ComplianceBadge";
import type { Provider } from "@/lib/compliance";

interface ComplianceBadgesProps {
  provider: Provider;
  size?: "sm" | "md";
  /** Max badges to show before collapsing. 0 = show all. */
  maxVisible?: number;
}

export function ComplianceBadges({ provider, size = "md", maxVisible = 0 }: ComplianceBadgesProps) {
  const c = provider.compliance;
  const badges: React.ReactNode[] = [];

  // EU data residency
  if (c.dataResidency.euOnly) {
    badges.push(<ComplianceBadge key="eu-only" variant="eu-only" size={size} />);
  } else if (!c.dataResidency.euOnly && c.headquarters !== "US") {
    // Non-EU HQ but not EU-only — no positive residency badge
  } else {
    badges.push(<ComplianceBadge key="us-only" variant="us-only" size={size} />);
  }

  // DPA
  if (c.dpa.available) {
    badges.push(<ComplianceBadge key="dpa" variant="dpa" size={size} />);
  }

  // Training
  if (!c.dataUsage.trainsOnCustomerData) {
    badges.push(<ComplianceBadge key="no-training" variant="no-training" size={size} />);
  } else {
    badges.push(<ComplianceBadge key="trains-on-data" variant="trains-on-data" size={size} />);
  }

  // SCCs (only show if not EU-only, since SCCs are needed for cross-border transfers)
  if (!c.dataResidency.euOnly && c.sccs) {
    badges.push(<ComplianceBadge key="eu-sccs" variant="eu-sccs" size={size} />);
  }

  const visible = maxVisible > 0 ? badges.slice(0, maxVisible) : badges;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
      {visible}
      {maxVisible > 0 && badges.length > maxVisible ? (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          +{badges.length - maxVisible}
        </span>
      ) : null}
    </div>
  );
}
