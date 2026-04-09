"use client";

// ModelRow: a single row in the model table with inline expand.
// Inline expand per DESIGN.md — no modals, no navigation.
// Expand state is local; does not affect URL (only filter state does).
//
// Wrapped in React.memo so re-renders are skipped when item/dimmed/matches
// haven't changed — prevents every row re-rendering on each search keystroke.

import { useState, memo, type ReactNode } from "react";
import Link from "next/link";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { isFullProvider, getComplianceTier } from "@/lib/compliance";
import type { ModelWithProvider } from "@/components/types";
import type { FuseResultMatch } from "fuse.js";

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

// Renders `text` with character ranges in `indices` wrapped in <mark>.
// `fuseKey` is the Fuse field key to look for in `matches`, e.g. "model.displayName".
//
// Guards:
//  - Skips match entries whose stored `value` doesn't match the actual `text`
//    (Fuse can return stale index values from internal tokenisation passes).
//  - Skips index pairs that span fewer than 2 characters (single-char matches
//    from aggressive tokenisation are almost always noise).
function highlightText(
  text: string,
  matches: readonly FuseResultMatch[] | undefined,
  fuseKey: string,
): ReactNode {
  if (!matches || matches.length === 0) return text;

  // Find the match entry for this specific field key whose stored value
  // corresponds to the text we're about to render.
  const fieldMatch = matches.find(
    (m) => m.key === fuseKey && m.value === text,
  );
  if (!fieldMatch || !fieldMatch.indices || fieldMatch.indices.length === 0) return text;

  // Filter out single-character spans — too noisy to highlight.
  const meaningful = fieldMatch.indices.filter(([start, end]) => end - start >= 1);
  if (meaningful.length === 0) return text;

  // Merge overlapping/adjacent index pairs and sort
  const sorted = [...meaningful].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    if (merged.length > 0 && start <= merged[merged.length - 1][1] + 1) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
    } else {
      merged.push([start, end]);
    }
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }
    nodes.push(
      <mark
        key={start}
        style={{
          backgroundColor: "var(--color-accent-subtle)",
          color: "var(--color-accent)",
          borderRadius: "2px",
          padding: "0 1px",
          fontWeight: 700,
          // inherit surrounding font so mark doesn't reset sizing
          font: "inherit",
        }}
      >
        {text.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return <>{nodes}</>;
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
  /** Fuse.js match data from the parent — used to highlight matched characters */
  matches?: readonly FuseResultMatch[];
}

function ModelRowInner({ item, dimmed = false, matches }: ModelRowProps) {
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
              {highlightText(model.displayName, matches, "model.displayName")}
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
            {highlightText(providerName, matches, "provider.name")}
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

        {/* Expand toggle column */}
        <td
          style={{
            padding: "12px 16px",
            verticalAlign: "middle",
            textAlign: "right",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: `1px solid var(--color-border)`,
              backgroundColor: expanded ? "var(--color-surface-alt)" : "transparent",
              color: "var(--color-text-muted)",
              fontSize: "14px",
              lineHeight: 1,
              transition: "background-color 120ms ease",
            }}
            aria-hidden="true"
          >
            {expanded ? "−" : "+"}
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
                padding: "14px 16px 18px",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {/* Header row: provider name + profile link prominently together */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {providerName}
                </span>
                <Link
                  href={`/provider/${model.providerSlug}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "var(--color-accent)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "4px",
                    backgroundColor: "var(--color-accent-subtle)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Full provider profile →
                </Link>
              </div>

              {/* Compliance detail grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
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
                          label={provider.compliance.dataUsage.trainsOnCustomerData ? "Trains on customer data" : "No training on customer data"}
                          value={!provider.compliance.dataUsage.trainsOnCustomerData}
                        />
                        <ComplianceField label="SCCs in place" value={provider.compliance.sccs ?? false} />
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
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

// React.memo: skip re-render when item reference, dimmed flag, and matches
// array reference haven't changed. This is the common case during filter-only
// updates — only rows whose data actually changed need to re-render.
export const ModelRow = memo(ModelRowInner, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.dimmed === next.dimmed &&
    prev.matches === next.matches
  );
});

// ─── ComplianceField helper ───────────────────────────────────────────────────

function ComplianceField({
  label,
  value,
  href,
}: {
  label: string;
  value: boolean | null;
  href?: string;
}) {
  const positive = value === true;
  const negative = value === false;

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
