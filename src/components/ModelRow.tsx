"use client";

// ModelRow: a single row in the model table with inline expand.
// Inline expand per DESIGN.md — no modals, no navigation.
// Expand state is local; does not affect URL (only filter state does).

import { useState } from "react";
import Link from "next/link";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { isFullProvider, getComplianceTier } from "@/lib/compliance";
import type { ModelWithProvider } from "@/components/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(val: string | null | undefined): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n === 0) return "free";
  // Show up to 4 significant figures
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

// ─── Tier color map ───────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  compliant: "var(--color-compliant)",
  partial: "var(--color-partial)",
  noncompliant: "var(--color-noncompliant)",
  unverified: "var(--color-unverified)",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ModelRowProps {
  item: ModelWithProvider;
  dimmed?: boolean;
}

export function ModelRow({ item, dimmed = false }: ModelRowProps) {
  const { model, provider } = item;
  const [expanded, setExpanded] = useState(false);

  const tier = provider ? getComplianceTier(provider) : "unverified";
  const tierColor = TIER_COLOR[tier];

  const providerName = provider?.name ?? model.providerSlug;
  const isVerified = provider ? isFullProvider(provider) : false;

  return (
    <>
      {/* Main row */}
      <tr
        style={{
          opacity: dimmed ? 0.35 : 1,
          transition: "opacity 150ms ease",
          borderLeft: `2px solid ${tierColor}`,
          cursor: "pointer",
          backgroundColor: expanded ? "var(--color-surface-alt)" : "var(--color-surface)",
        }}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {/* Model column */}
        <td
          style={{
            padding: "12px 16px",
            verticalAlign: "middle",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                lineHeight: 1.3,
              }}
            >
              {model.displayName}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary)",
              marginTop: "2px",
            }}
          >
            {providerName}
          </div>
        </td>

        {/* Compliance column */}
        <td
          style={{
            padding: "12px 16px",
            verticalAlign: "middle",
          }}
          className="hidden sm:table-cell"
        >
          {isVerified && provider !== null && isFullProvider(provider) ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
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
            <ComplianceBadge variant="unverified" size="sm" />
          )}
        </td>

        {/* Data residency column */}
        <td
          style={{
            padding: "12px 16px",
            verticalAlign: "middle",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary)",
          }}
          className="hidden md:table-cell"
        >
          {isVerified && provider !== null && isFullProvider(provider)
            ? provider.compliance.dataResidency.euOnly
              ? "EU"
              : provider.compliance.dataResidency.regions.join(", ")
            : "—"}
        </td>

        {/* Pricing column */}
        <td
          style={{
            padding: "12px 16px",
            verticalAlign: "middle",
          }}
          className="hidden lg:table-cell"
        >
          {model.inputPricePerMTokens !== null || model.outputPricePerMTokens !== null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  color: "var(--color-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>in </span>
                {formatPrice(model.inputPricePerMTokens)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  color: "var(--color-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>out </span>
                {formatPrice(model.outputPricePerMTokens)}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
              }}
            >
              —
            </span>
          )}
        </td>

        {/* Last verified column */}
        <td
          style={{
            padding: "12px 16px",
            verticalAlign: "middle",
          }}
          className="hidden xl:table-cell"
        >
          {provider?.lastVerified ? (
            <time
              dateTime={provider.lastVerified}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
              }}
            >
              {provider.lastVerified}
            </time>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
              }}
            >
              —
            </span>
          )}
        </td>

        {/* Link column */}
        <td
          style={{
            padding: "12px 16px",
            verticalAlign: "middle",
            textAlign: "right",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-link)",
            }}
            aria-hidden="true"
          >
            {expanded ? "↑" : "→"}
          </span>
        </td>
      </tr>

      {/* Inline expand panel — per DESIGN.md, no modals */}
      {expanded ? (
        <tr
          style={{
            backgroundColor: "var(--color-surface-alt)",
            borderLeft: `2px solid ${tierColor}`,
          }}
        >
          <td
            colSpan={6}
            style={{
              padding: "0",
            }}
          >
            <div
              style={{
                padding: "16px 16px 20px",
                borderTop: "1px solid var(--color-border)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {/* Quick compliance snapshot */}
              {isVerified && provider !== null && isFullProvider(provider) ? (
                <>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "8px",
                      }}
                    >
                      Compliance
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <ComplianceField
                        label="EU data residency"
                        value={provider.compliance.dataResidency.euOnly}
                      />
                      <ComplianceField
                        label="DPA available"
                        value={provider.compliance.dpa.available}
                        href={provider.compliance.dpa.url ?? undefined}
                      />
                      <ComplianceField
                        label="Trains on data"
                        value={provider.compliance.dataUsage.trainsOnCustomerData}
                        invert
                      />
                      <ComplianceField label="SCCs" value={provider.compliance.sccs ?? false} />
                    </div>
                  </div>

                  {provider.compliance.dataResidency.euRegionDetails ? (
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--color-text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "8px",
                        }}
                      >
                        EU Routing
                      </div>
                      <p
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8125rem",
                          color: "var(--color-text-secondary)",
                          margin: 0,
                          lineHeight: 1.5,
                          maxWidth: "40ch",
                        }}
                      >
                        {provider.compliance.dataResidency.euRegionDetails}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.875rem",
                    color: "var(--color-text-muted)",
                    margin: 0,
                  }}
                >
                  Compliance data not yet verified for this provider.
                </p>
              )}

              {/* Full profile link */}
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Link
                  href={`/provider/${model.providerSlug}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.875rem",
                    color: "var(--color-link)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Full provider profile →
                </Link>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ─── ComplianceField helper ───────────────────────────────────────────────────

function ComplianceField({
  label,
  value,
  href,
  invert = false,
}: {
  label: string;
  value: boolean | null;
  href?: string;
  invert?: boolean;
}) {
  // invert: for fields where true = bad (e.g. trains on data)
  const positive = invert ? value === false : value === true;
  const negative = invert ? value === true : value === false;

  const symbol = positive ? "✓" : negative ? "✗" : "?";
  const color = positive
    ? "var(--color-compliant)"
    : negative
      ? "var(--color-noncompliant)"
      : "var(--color-text-muted)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          color,
          width: "14px",
          textAlign: "center",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--color-text-secondary)",
        }}
      >
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "var(--color-link)", textDecoration: "none" }}
          >
            {label} ↗
          </a>
        ) : (
          label
        )}
      </span>
    </div>
  );
}
