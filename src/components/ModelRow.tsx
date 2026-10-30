"use client";

// ModelRow: a single row in the model table with inline expand.
// Inline expand per DESIGN.md — no modals, no navigation.
// Expand state is local; does not affect URL (only filter state does).
//
// Wrapped in React.memo so re-renders are skipped when item/dimmed/matches
// haven't changed — prevents every row re-rendering on each search keystroke.

import { useId, useState, memo, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { GatewayPill } from "@/components/GatewayPill";
import { BooleanList, BooleanRow } from "@/components/BooleanRow";
import { VerificationLabel } from "@/components/VerificationLabel";
import { getVerification } from "@/lib/verification";
import { formatPrice } from "@/lib/format";
import { buttonClass } from "@/lib/styles";
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
      <mark key={start} className="bg-accent-subtle text-accent rounded-[2px] px-px [font:inherit]">
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
  const panelId = useId();
  const t = useTranslations("ModelRow");
  const locale = useLocale();
  const tf = useTranslations("Format");
  const priceFormat = { locale, freeLabel: tf("free"), currency: model.priceCurrency };

  const tier = provider ? getComplianceTier(provider) : "unverified";
  const tierLine = TIER_CLASSES[tier].line;

  const providerName = provider?.name ?? model.providerSlug;
  const isVerified = provider ? isFullProvider(provider) : false;

  return (
    <>
      {/* Main row — opacity, borderLeft, backgroundColor are dynamic */}
      <tr
        className={`cursor-pointer border-l-3 ${tierLine}`}
        data-dimmed={dimmed ? "" : undefined}
        style={{
          backgroundColor: expanded || hovered ? "var(--color-row-hover)" : "var(--color-surface)",
        }}
        onClick={() => setExpanded((e) => !e)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Model column */}
        <td className="p-3 px-4 align-middle">
          {dimmed ? <span className="sr-only">{t("dimmed")}. </span> : null}
          <div className="flex items-center gap-[10px] flex-wrap">
            <span className="font-body text-[0.9375rem] font-semibold text-text-primary leading-[1.3]">
              {highlightText(model.displayName, matches, "model.displayName")}
            </span>
            {!model.isNativeModel ? <GatewayPill providerName={providerName} /> : null}
          </div>
          <div className="font-body text-[0.8125rem] text-text-secondary mt-0.5">
            {highlightText(providerName, matches, "provider.name")}
          </div>
        </td>

        {/* Compliance column */}
        <td className="p-3 px-4 align-middle hidden sm:table-cell">
          <ComplianceBadge
            tier={tier}
            compliance={provider !== null && isFullProvider(provider) ? provider.compliance : null}
          />
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
              <span className="text-[0.8125rem] tabular-nums text-text-secondary whitespace-nowrap">
                <span className="text-text-muted">{t("priceIn")}</span>
                {formatPrice(model.inputPricePerMTokens, priceFormat)}
              </span>
              <span className="text-[0.8125rem] tabular-nums text-text-secondary whitespace-nowrap">
                <span className="text-text-muted">{t("priceOut")}</span>
                {formatPrice(model.outputPricePerMTokens, priceFormat)}
              </span>
            </div>
          ) : (
            <span className="text-[0.8125rem] text-text-muted">—</span>
          )}
        </td>

        {/* Verification status column */}
        <td className="p-3 px-4 align-middle hidden xl:table-cell">
          {provider && getVerification(provider).kind !== "none" ? (
            <VerificationLabel provider={provider} className="text-13 text-text-muted whitespace-nowrap" />
          ) : (
            <span className="text-13 text-text-muted">—</span>
          )}
        </td>

        {/* Expand toggle column */}
        <td className="p-3 px-4 align-middle text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={t("toggleDetails", { name: model.displayName })}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border text-text-muted text-sm leading-none cursor-pointer p-0 transition-[background-color] duration-[120ms] ease-in-out"
            style={{ backgroundColor: expanded ? "var(--color-surface-alt)" : "transparent" }}
          >
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        </td>
      </tr>

      {/* Inline expand panel — per DESIGN.md, no modals */}
      {expanded ? (
        <tr id={panelId} className={`bg-surface-sunken border-l-3 ${tierLine}`}>
          <td colSpan={6} className="p-0">
            <div className="px-4 pt-3.5 pb-[18px] border-t border-border">
              {/* Header row: provider name + profile link prominently together */}
              <div className="flex items-center justify-between mb-3.5 gap-4 flex-wrap">
                <span className="text-17 font-semibold text-text-primary">{providerName}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {model.canonicalModelId ? (
                    <Link
                      href={`/model/${model.canonicalModelId}`}
                      onClick={(e) => e.stopPropagation()}
                      className={buttonClass("secondary")}
                    >
                      {t("allProviders")}
                    </Link>
                  ) : null}
                  <Link
                    href={`/provider/${model.providerSlug}`}
                    onClick={(e) => e.stopPropagation()}
                    className={buttonClass("primary")}
                  >
                    {t("fullProviderProfile")}
                  </Link>
                </div>
              </div>

              {/* Gateway notice — full width, shown before the compliance grid */}
              {!model.isNativeModel ? (
                <div className="rounded-button px-3.5 py-2.5 border border-border bg-surface text-14 text-text-secondary mb-4">
                  {t.rich("gatewayNotice", {
                    providerName,
                    strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                  })}
                </div>
              ) : null}

              {/* Compliance detail grid */}
              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                {isVerified && provider !== null && isFullProvider(provider) ? (
                  <>
                    <div>
                      <div className="text-13 font-semibold text-text-muted mb-2">{t("expandSections.compliance")}</div>
                      <BooleanList>
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
                      </BooleanList>
                    </div>

                    {provider.compliance.dataResidency.euRegionDetails ? (
                      <div className="col-span-2">
                        <div className="text-13 font-semibold text-text-muted mb-2">
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
