"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  filterStateFromSearchParams,
  type FilterProfile,
  type FilterState,
  type ComplianceFilter,
} from "@/lib/compliance";

// Re-export so existing imports of FilterState/filterStateFromSearchParams from
// this file keep working during the transition. The canonical source is now
// compliance.ts (no "use client" boundary).
export type { FilterState };
export { filterStateFromSearchParams };

// Preset profile definitions (matches PLAN.md)
const PRESETS: { id: Exclude<FilterProfile, "custom" | null>; label: string; filter: ComplianceFilter }[] = [
  {
    id: "strict-eu",
    label: "Strict EU",
    filter: { euOnly: true, dpa: true, noTraining: true },
  },
  {
    id: "eu-sccs",
    label: "EU + SCCs",
    filter: { dpa: true, sccs: true, noTraining: true },
  },
  {
    id: "no-training",
    label: "No Training",
    filter: { noTraining: true },
  },
];

const CUSTOM_TOGGLES: { key: keyof ComplianceFilter; label: string }[] = [
  { key: "euOnly", label: "Data stays in EU" },
  { key: "dpa", label: "DPA available" },
  { key: "noTraining", label: "No training on data" },
  { key: "sccs", label: "SCCs in place" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  /** Active filter state — derived from URL params by parent */
  filterState: FilterState;
}

export function FilterBar({ filterState }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(
    filterState.profile === "custom" || Object.keys(filterState.custom).length > 0,
  );

  // Build new URL — all filter state lives in the URL (shareable links requirement)
  const buildUrl = useCallback(
    (profile: FilterProfile, custom: ComplianceFilter) => {
      const params = new URLSearchParams(searchParams.toString());

      // Preserve search query if present
      const q = params.get("q");
      params.delete("profile");
      params.delete("euOnly");
      params.delete("dpa");
      params.delete("noTraining");
      params.delete("sccs");
      if (q) params.set("q", q);

      if (profile && profile !== "custom") {
        params.set("profile", profile);
      } else if (profile === "custom") {
        params.set("profile", "custom");
        if (custom.euOnly) params.set("euOnly", "true");
        if (custom.dpa) params.set("dpa", "true");
        if (custom.noTraining) params.set("noTraining", "true");
        if (custom.sccs) params.set("sccs", "true");
      }

      const qs = params.toString();
      return `${pathname}${qs ? `?${qs}` : ""}`;
    },
    [pathname, searchParams],
  );

  const setProfile = useCallback(
    (profile: FilterProfile) => {
      if (profile === filterState.profile) {
        // Toggle off
        startTransition(() => router.push(buildUrl(null, {})));
        return;
      }
      if (profile === "custom") {
        setCustomOpen(true);
        startTransition(() => router.push(buildUrl("custom", filterState.custom)));
      } else if (profile !== null) {
        setCustomOpen(false);
        const preset = PRESETS.find((p) => p.id === profile);
        startTransition(() => router.push(buildUrl(profile, preset?.filter ?? {})));
      }
    },
    [filterState.profile, filterState.custom, buildUrl, router],
  );

  const toggleCustom = useCallback(
    (key: keyof ComplianceFilter) => {
      const newCustom = { ...filterState.custom };
      if (newCustom[key]) {
        delete newCustom[key];
      } else {
        newCustom[key] = true;
      }
      const hasAny = Object.keys(newCustom).length > 0;
      startTransition(() =>
        router.push(buildUrl(hasAny ? "custom" : null, newCustom)),
      );
    },
    [filterState.custom, buildUrl, router],
  );

  const toggleCustomPanel = () => {
    if (customOpen) {
      // Close and clear custom filters
      setCustomOpen(false);
      if (filterState.profile === "custom") {
        startTransition(() => router.push(buildUrl(null, {})));
      }
    } else {
      setCustomOpen(true);
      setProfile("custom");
    }
  };

  return (
    <div>
      {/* Label + preset buttons row */}
      <div
        className="flex flex-wrap gap-2 items-center"
        role="group"
        aria-label="Compliance filter presets"
      >
        <span className="font-body text-[0.8125rem] font-medium text-text-muted mr-1 whitespace-nowrap">
          Filter:
        </span>

        {PRESETS.map((preset) => {
          const isActive = filterState.profile === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setProfile(preset.id)}
              aria-pressed={isActive}
              className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded font-body text-[0.8125rem] font-medium cursor-pointer transition-[border-color,background-color,color] duration-[120ms] ease-in-out whitespace-nowrap"
              style={{
                border: `1px solid ${isActive ? "var(--color-accent)" : "#b8b5ac"}`,
                backgroundColor: isActive ? "var(--color-accent-subtle)" : "var(--color-surface)",
                color: isActive ? "var(--color-accent)" : "var(--color-text-primary)",
                boxShadow: isActive ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              {/* Filter funnel icon */}
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
                style={{ opacity: isActive ? 1 : 0.5 }}
              >
                <path
                  d="M1 2h9l-3.5 4v3l-2-1V6L1 2z"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                  fill={isActive ? "currentColor" : "none"}
                />
              </svg>
              {preset.label}
            </button>
          );
        })}

        {/* Custom button */}
        <button
          onClick={toggleCustomPanel}
          aria-pressed={customOpen}
          aria-expanded={customOpen}
          className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded font-body text-[0.8125rem] font-medium cursor-pointer transition-[border-color,background-color,color] duration-[120ms] ease-in-out"
          style={{
            border: `1px solid ${customOpen ? "var(--color-accent)" : "#b8b5ac"}`,
            backgroundColor: customOpen ? "var(--color-accent-subtle)" : "var(--color-surface)",
            color: customOpen ? "var(--color-accent)" : "var(--color-text-primary)",
            boxShadow: customOpen ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
            style={{ opacity: customOpen ? 1 : 0.5 }}
          >
            <path
              d="M1 2h9l-3.5 4v3l-2-1V6L1 2z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
              fill={customOpen ? "currentColor" : "none"}
            />
          </svg>
          Custom
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            className="opacity-60 transition-transform duration-150 ease-in-out"
            style={{ transform: customOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Custom panel */}
      {customOpen ? (
        <div
          className="mt-2 p-4 bg-surface border border-border rounded flex flex-col gap-3"
          role="group"
          aria-label="Custom compliance filters"
        >
          {CUSTOM_TOGGLES.map(({ key, label }) => {
            const isOn = !!filterState.custom[key];
            return (
              <label
                key={key}
                className="flex items-center justify-between cursor-pointer gap-4"
              >
                <span className="font-body text-[0.875rem] text-text-primary">
                  {label}
                </span>
                {/* Toggle track — bg depends on isOn state */}
                <button
                  role="switch"
                  aria-checked={isOn}
                  onClick={() => toggleCustom(key)}
                  className="w-8 h-[18px] rounded-[9px] border-none cursor-pointer relative transition-[background-color] duration-150 ease-in-out shrink-0 p-0"
                  style={{ backgroundColor: isOn ? "var(--color-accent)" : "var(--color-border)" }}
                >
                  {/* Toggle thumb — left position depends on isOn state */}
                  <span
                    className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-[left] duration-150 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                    style={{ left: isOn ? "16px" : "2px" }}
                    aria-hidden="true"
                  />
                </button>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
