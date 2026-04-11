"use client";

// ModelRow: a single row in the model table with inline expand.
// Inline expand per DESIGN.md — no modals, no navigation.
// Expand state is local; does not affect URL (only filter state does).
//
// Wrapped in React.memo so re-renders are skipped when item/dimmed/matches
// haven't changed — prevents every row re-rendering on each search keystroke.

import { useState, memo, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
        className="bg-accent-subtle text-accent rounded-[2px] px-px font-bold"
        style={{ font: "inherit" }}
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
  const t = useTranslations("ModelRow");

  const tier = provider ? getComplianceTier(provider) : "unverified";
  const tierColor = TIER_COLOR[tier];

  const providerName = provider?.name ?? model.providerSlug;
  const isVerified = provider ? isFullProvider(provider) : false;

  return (
    <>
      {/* Main row — opacity, borderLeft, backgroundColor are dynamic */}
      <tr
        className="cursor-pointer transition-opacity duration-150 ease-in-out"
        style={{
          opacity: dimmed ? 0.35 : 1,
          borderLeft: `2px solid ${tierColor}`,
          backgroundColor: expanded ? "var(--color-surface-alt)" : "var(--color-surface)",
        }}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {/* Model column */}
        <td className="p-3 px-4 align-middle">
          <div className="flex items-center gap-[10px]">
            <span className="font-body text-[0.9375rem] font-semibold text-text-primary leading-[1.3]">
              {highlightText(model.displayName, matches, "model.displayName")}
            </span>
          </div>
          <div className="font-body text-[0.8125rem] text-text-secondary mt-0.5">
            {highlightText(providerName, matches, "provider.name")}
          </div>
        </td>

        {/* Compliance column */}
        <td className="p-3 px-4 align-middle hidden sm:table-cell">
          {isVerified && provider !== null && isFullProvider(provider) ? (
            <div className="flex flex-wrap gap-1">
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
        <td className="p-3 px-4 align-middle font-body text-[0.875rem] text-text-secondary hidden md:table-cell">
          {isVerified && provider !== null && isFullProvider(provider)
            ? provider.compliance.dataResidency.euOnly
              ? t("euResidencyValue")
              : provider.compliance.dataResidency.regions.join(", ")
            : "—"}
        </td>

        {/* Pricing column */}
        <td className="p-3 px-4 align-middle hidden lg:table-cell">
          {model.inputPricePerMTokens !== null || model.outputPricePerMTokens !== null ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[0.8125rem] text-text-secondary whitespace-nowrap">
                <span className="text-text-muted text-xs">{t("priceIn")}</span>
                {formatPrice(model.inputPricePerMTokens)}
              </span>
              <span className="font-mono text-[0.8125rem] text-text-secondary whitespace-nowrap">
                <span className="text-text-muted text-xs">{t("priceOut")}</span>
                {formatPrice(model.outputPricePerMTokens)}
              </span>
            </div>
          ) : (
            <span className="font-mono text-[0.8125rem] text-text-muted">—</span>
          )}
        </td>

        {/* Last verified column */}
        <td className="p-3 px-4 align-middle hidden xl:table-cell">
          {provider?.lastVerified ? (
            <time
              dateTime={provider.lastVerified}
              className="font-mono text-xs text-text-muted"
            >
              {provider.lastVerified}
            </time>
          ) : (
            <span className="font-mono text-xs text-text-muted">—</span>
          )}
        </td>

        {/* Expand toggle column */}
        <td className="p-3 px-4 align-middle text-right">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border text-text-muted text-sm leading-none transition-[background-color] duration-[120ms] ease-in-out"
            style={{ backgroundColor: expanded ? "var(--color-surface-alt)" : "transparent" }}
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
          <td colSpan={6} className="p-0">
            <div className="px-4 pt-3.5 pb-[18px] border-t border-border">
              {/* Header row: provider name + profile link prominently together */}
              <div className="flex items-center justify-between mb-3.5 gap-4 flex-wrap">
                <span className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
                  {providerName}
                </span>
                <Link
                  href={`/provider/${model.providerSlug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-body text-[0.8125rem] font-medium text-accent no-underline inline-flex items-center gap-1 px-[10px] py-1 border border-accent rounded bg-accent-subtle whitespace-nowrap"
                >
                  {t("fullProviderProfile")}
                </Link>
              </div>

              {/* Compliance detail grid */}
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {isVerified && provider !== null && isFullProvider(provider) ? (
                  <>
                    <div>
                      <div className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] mb-2">
                        {t("expandSections.compliance")}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <ComplianceField
                          label={t("complianceFields.euDataResidency")}
                          value={provider.compliance.dataResidency.euOnly}
                        />
                        <ComplianceField
                          label={t("complianceFields.dpaAvailable")}
                          value={provider.compliance.dpa.available}
                          href={provider.compliance.dpa.url ?? undefined}
                        />
                        <ComplianceField
                          label={provider.compliance.dataUsage.trainsOnCustomerData ? t("complianceFields.trainsOnCustomerData") : t("complianceFields.noTrainingOnCustomerData")}
                          value={!provider.compliance.dataUsage.trainsOnCustomerData}
                        />
                        <ComplianceField label={t("complianceFields.sccsInPlace")} value={provider.compliance.sccs ?? false} />
                      </div>
                    </div>

                    {provider.compliance.dataResidency.euRegionDetails ? (
                      <div>
                        <div className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] mb-2">
                          {t("expandSections.euRouting")}
                        </div>
                        <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.5] max-w-[40ch]">
                          {provider.compliance.dataResidency.euRegionDetails}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="font-body text-[0.875rem] text-text-muted m-0">
                    {t("unverifiedNotice")}
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
    <div className="flex items-center gap-2">
      <span
        className="font-mono text-[0.8125rem] w-3.5 text-center shrink-0"
        style={{ color }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <span className="font-body text-[0.8125rem] text-text-secondary">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-link no-underline"
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
