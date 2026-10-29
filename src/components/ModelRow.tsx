"use client";

// ModelRow: a single row in the model table with inline expand.
// Inline expand per DESIGN.md — no modals, no navigation.
// Expand state is local; does not affect URL (only filter state does).
//
// Wrapped in React.memo so re-renders are skipped when item/dimmed/matches
// haven't changed — prevents every row re-rendering on each search keystroke.

import { useState, memo, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ComplianceBadge, ComplianceBadgeList } from "@/components/ComplianceBadge";
import { GatewayPill } from "@/components/GatewayPill";
import { BooleanRow } from "@/components/BooleanRow";
import { VerificationLabel } from "@/components/VerificationLabel";
import { getVerification } from "@/lib/verification";
import { formatPrice } from "@/lib/format";
import { isFullProvider, getComplianceTier, TIER_CLASSES } from "@/lib/compliance";
import type { ModelWithProvider } from "@/components/types";
import type { FuseResultMatch } from "fuse.js";

// Renders `text` with character ranges in `indices` wrapped in <mark>.
// `fuseKey` is the Fuse field key to look for in `matches`, e.g. "model.displayName".
//
// Guards:
//  - Skips match entries whose stored `value` doesn't match the actual `text`
//    (Fuse can return stale index values from internal tokenisation passes).
//  - Skips index pairs that span fewer than 2 characters (single-char matches
//    from aggressive tokenisation are almost always noise).
function highlightText(text: string, matches: readonly FuseResultMatch[] | undefined, fuseKey: string): ReactNode {
  if (!matches || matches.length === 0) return text;

  // Find the match entry for this specific field key whose stored value
  // corresponds to the text we're about to render.
  const fieldMatch = matches.find((m) => m.key === fuseKey && m.value === text);
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
      </mark>
    );
    cursor = end + 1;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return <>{nodes}</>;
}

interface ModelRowProps {
  item: ModelWithProvider;
  dimmed?: boolean;
  /** Fuse.js match data from the parent — used to highlight matched characters */
  matches?: readonly FuseResultMatch[];
}

function ModelRowInner({ item, dimmed = false, matches }: ModelRowProps) {
  const { model, provider } = item;
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const t = useTranslations("ModelRow");

  const tier = provider ? getComplianceTier(provider) : "unverified";
  const accentBorder = TIER_CLASSES[tier].accentBorder;

  const providerName = provider?.name ?? model.providerSlug;
  const isVerified = provider ? isFullProvider(provider) : false;

  return (
    <>
      {/* Main row — opacity, borderLeft, backgroundColor are dynamic */}
      <tr
        className={`cursor-pointer transition-opacity duration-150 ease-in-out border-l-2 ${accentBorder}`}
        style={{
          opacity: dimmed ? 0.35 : 1,
          backgroundColor: expanded
            ? "var(--color-surface-alt)"
            : hovered
              ? "color-mix(in srgb, var(--color-surface-alt) 60%, var(--color-surface))"
              : "var(--color-surface)",
        }}
        onClick={() => setExpanded((e) => !e)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-expanded={expanded}
      >
        {/* Model column */}
        <td className="p-3 px-4 align-middle">
          <div className="flex items-center gap-[10px] flex-wrap">
            <span className="font-body text-[0.9375rem] font-semibold text-text-primary leading-[1.3]">
              {highlightText(model.displayName, matches, "model.displayName")}
            </span>
            {!model.isNativeModel ? (
              <GatewayPill title={`This model is made by a third party and hosted via ${providerName}`} />
            ) : null}
          </div>
          <div className="font-body text-[0.8125rem] text-text-secondary mt-0.5">
            {highlightText(providerName, matches, "provider.name")}
          </div>
        </td>

        {/* Compliance column */}
        <td className="p-3 px-4 align-middle hidden sm:table-cell">
          {isVerified && provider !== null && isFullProvider(provider) ? (
            <ComplianceBadgeList compliance={provider.compliance} size="sm" />
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

        {/* Verification status column */}
        <td className="p-3 px-4 align-middle hidden xl:table-cell">
          {provider && getVerification(provider).kind !== "none" ? (
            <VerificationLabel provider={provider} className="font-mono text-xs text-text-muted whitespace-nowrap" />
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
        <tr className={`bg-surface-alt border-l-2 ${accentBorder}`}>
          <td colSpan={6} className="p-0">
            <div className="px-4 pt-3.5 pb-[18px] border-t border-border">
              {/* Header row: provider name + profile link prominently together */}
              <div className="flex items-center justify-between mb-3.5 gap-4 flex-wrap">
                <span className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em]">
                  {providerName}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {model.canonicalModelId ? (
                    <Link
                      href={`/model/${model.canonicalModelId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-body text-[0.8125rem] font-medium text-text-secondary no-underline inline-flex items-center gap-1 px-[10px] py-1 border border-border rounded bg-surface-alt whitespace-nowrap"
                    >
                      {t("allProviders")}
                    </Link>
                  ) : null}
                  <Link
                    href={`/provider/${model.providerSlug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-body text-[0.8125rem] font-medium text-accent no-underline inline-flex items-center gap-1 px-[10px] py-1 border border-accent rounded bg-accent-subtle whitespace-nowrap"
                  >
                    {t("fullProviderProfile")}
                  </Link>
                </div>
              </div>

              {/* Gateway notice — full width, shown before the compliance grid */}
              {!model.isNativeModel ? (
                <div className="rounded px-3.5 py-2.5 border font-body text-[0.8125rem] leading-[1.5] mb-4 text-partial border-partial bg-[color-mix(in_srgb,var(--color-partial)_6%,transparent)]">
                  <span className="font-semibold">Third-party model hosted via {providerName}.</span> This model is made
                  by another company but served through {providerName}&apos;s infrastructure. The compliance properties
                  shown here reflect <span className="font-semibold">{providerName}</span>&apos;s data handling — not
                  the original model creator&apos;s.
                </div>
              ) : null}

              {/* Compliance detail grid */}
              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                {isVerified && provider !== null && isFullProvider(provider) ? (
                  <>
                    <div>
                      <div className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] mb-2">
                        {t("expandSections.compliance")}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <BooleanRow
                          label={t("complianceFields.euDataResidency")}
                          value={provider.compliance.dataResidency.euOnly}
                        />
                        <BooleanRow
                          label={t("complianceFields.dpaAvailable")}
                          value={provider.compliance.dpa.available}
                          href={provider.compliance.dpa.url ?? undefined}
                        />
                        <BooleanRow
                          label={
                            provider.compliance.dataUsage.trainsOnCustomerData === true
                              ? t("complianceFields.trainsOnCustomerData")
                              : t("complianceFields.noTrainingOnCustomerData")
                          }
                          value={
                            provider.compliance.dataUsage.trainsOnCustomerData === null
                              ? null
                              : !provider.compliance.dataUsage.trainsOnCustomerData
                          }
                        />
                        <BooleanRow
                          label={t("complianceFields.sccsInPlace")}
                          value={provider.compliance.sccs ?? false}
                        />
                      </div>
                    </div>

                    {provider.compliance.dataResidency.euRegionDetails ? (
                      <div className="col-span-2">
                        <div className="font-body text-xs font-semibold text-text-secondary uppercase tracking-[0.06em] mb-2">
                          {t("expandSections.euRouting")}
                        </div>
                        <p className="font-body text-[0.8125rem] text-text-secondary m-0 leading-[1.5]">
                          {provider.compliance.dataResidency.euRegionDetails}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="font-body text-[0.875rem] text-text-muted m-0">{t("unverifiedNotice")}</p>
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
  return prev.item === next.item && prev.dimmed === next.dimmed && prev.matches === next.matches;
});
