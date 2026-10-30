"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { filterStateFromSearchParams, type ComplianceFilter, type FilterProfile } from "@/lib/compliance";
import { FILTER_FLAGS, FILTER_PARAMS } from "@/lib/model-list";
import { CHIP_CLASS } from "@/lib/styles";
import { writeSearchParams } from "@/lib/url-state";

const PRESETS = [
  { id: "strict-eu", label: "strictEu" },
  { id: "eu-sccs", label: "euSccs" },
  { id: "no-training", label: "noTraining" },
] as const;

function writeFilter(profile: FilterProfile, custom: ComplianceFilter = {}) {
  const params = new URLSearchParams(window.location.search);
  for (const key of FILTER_PARAMS) params.delete(key);
  if (profile !== null) params.set("profile", profile);
  if (profile === "custom") {
    for (const flag of FILTER_FLAGS) if (custom[flag]) params.set(flag, "true");
  }
  writeSearchParams(params, "replace");
}

interface FilterBarProps {
  searchParams: URLSearchParams;
  /** Right-aligned result count, announced politely. */
  count: string;
}

/**
 * Refine row of the finder: preset chips, the custom panel and the count. At most one chip
 * is pressed; pressing it again clears the filter. "Custom" keeps its panel open while
 * pressed, even with no box checked.
 */
export function FilterBar({ searchParams, count }: FilterBarProps) {
  const t = useTranslations("FilterBar");
  const panelId = useId();
  const { profile, custom } = filterStateFromSearchParams(searchParams);
  const customOpen = profile === "custom";

  const toggleFlag = (flag: keyof ComplianceFilter) => writeFilter("custom", { ...custom, [flag]: !custom[flag] });

  return (
    <>
      <div
        role="group"
        aria-label={t("ariaPresets")}
        className="flex flex-wrap items-center gap-2 border-t border-border px-3 pt-2.5 pb-3 first:border-t-0 max-md:gap-1.5 max-md:px-2.5"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={profile === preset.id}
            onClick={() => writeFilter(profile === preset.id ? null : preset.id)}
            className={CHIP_CLASS}
          >
            {t(`presets.${preset.label}`)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={customOpen}
          aria-expanded={customOpen}
          aria-controls={panelId}
          onClick={() => writeFilter(customOpen ? null : "custom", custom)}
          className={`${CHIP_CLASS} gap-1.5`}
        >
          {t("custom")}
          <svg
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
            className={`size-2.5 shrink-0 transition-transform duration-150 ease-out ${customOpen ? "rotate-180" : ""}`}
          >
            <path d="m2 3.5 3 3 3-3" />
          </svg>
        </button>
        <output
          aria-live="polite"
          className="ml-auto pr-1.5 text-15 whitespace-nowrap text-text-muted tabular-nums max-md:order-last max-md:ml-0 max-md:w-full max-md:px-1 max-md:pt-1 max-md:pb-0"
        >
          {count}
        </output>
      </div>
      <div
        id={panelId}
        role="group"
        aria-label={t("ariaCustomPanel")}
        hidden={!customOpen}
        className="flex flex-wrap gap-x-5 gap-y-2 border-t border-dashed border-border px-3.5 pt-1 pb-3.5 [&[hidden]]:hidden"
      >
        {FILTER_FLAGS.map((flag) => (
          <label key={flag} className="inline-flex cursor-pointer items-center gap-2 text-15 text-text-primary">
            <input
              type="checkbox"
              checked={!!custom[flag]}
              onChange={() => toggleFlag(flag)}
              className="m-0 size-[18px] cursor-pointer accent-accent"
            />
            {t(`toggles.${flag}`)}
          </label>
        ))}
      </div>
    </>
  );
}
