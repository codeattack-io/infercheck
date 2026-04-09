"use client";

// ModelTable: client component that handles search input, applies compliance
// filters, and renders the model rows.
//
// Data is fetched server-side and passed as props — no client-side fetch.
// Filter state lives entirely in URL params (shareable links requirement).
// Vercel rules applied:
//   - rerender-derived-state-no-effect: filtered list derived during render
//   - rerender-functional-setstate: stable search callback
//   - js-index-maps: provider lookup by slug via Map
//   - rendering-conditional-render: ternary not &&

import { useMemo, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ModelRow } from "@/components/ModelRow";
import { providerMatchesFilter } from "@/lib/compliance";
import { filterStateFromSearchParams } from "@/components/FilterBar";
import type { ModelWithProvider } from "@/components/types";
import type { AnyProvider } from "@/lib/compliance";

// ─── Component ────────────────────────────────────────────────────────────────

interface ModelTableProps {
  items: ModelWithProvider[];
  searchQuery: string;
}

export function ModelTable({ items, searchQuery }: ModelTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Derive filter state from URL params during render — no useEffect
  const filterState = useMemo(
    () => filterStateFromSearchParams(searchParams),
    [searchParams],
  );

  // Build active filter from profile or custom
  const activeFilter = useMemo(() => {
    if (!filterState.profile || filterState.profile === null) return null;
    if (filterState.profile === "custom") return filterState.custom;
    const profileFilters: Record<string, ReturnType<typeof filterStateFromSearchParams>["custom"]> = {
      "strict-eu": { euOnly: true, dpa: true, noTraining: true },
      "eu-sccs": { dpa: true, sccs: true, noTraining: true },
      "no-training": { noTraining: true },
    };
    return profileFilters[filterState.profile] ?? null;
  }, [filterState]);

  // Search: update URL param, debounce not needed (client-side filter)
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (q) {
        params.set("q", q);
      } else {
        params.delete("q");
      }
      startTransition(() =>
        router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
      );
    },
    [searchParams, pathname, router],
  );

  // Filter + search — derived during render (rerender-derived-state-no-effect)
  const { matching, nonMatching } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const matching: ModelWithProvider[] = [];
    const nonMatching: ModelWithProvider[] = [];

    for (const item of items) {
      // Text search
      const matchesSearch =
        q === "" ||
        item.model.displayName.toLowerCase().includes(q) ||
        item.model.id.toLowerCase().includes(q) ||
        (item.provider?.name ?? "").toLowerCase().includes(q);

      if (!matchesSearch) continue; // Hide non-matching search results entirely

      // Compliance filter — dim, not remove (per DESIGN.md)
      const matchesFilter =
        activeFilter === null ||
        (item.provider !== null && providerMatchesFilter(item.provider, activeFilter));

      if (matchesFilter) {
        matching.push(item);
      } else {
        nonMatching.push(item);
      }
    }

    return { matching, nonMatching };
  }, [items, searchQuery, activeFilter]);

  const totalVisible = matching.length + nonMatching.length;
  const hasFilter = activeFilter !== null;

  return (
    <div>
      {/* Search input */}
      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="model-search" className="sr-only">
          Search models or providers
        </label>
        <div style={{ position: "relative" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
              pointerEvents: "none",
            }}
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          <input
            id="model-search"
            type="search"
            defaultValue={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search models or providers…"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-subtle)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Results summary */}
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--color-text-muted)",
          marginBottom: "12px",
        }}
      >
        {hasFilter
          ? `${matching.length} of ${totalVisible} models match the active filter`
          : `${totalVisible} models`}
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "var(--color-surface)",
            }}
            aria-label="AI models with GDPR compliance data"
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--color-surface-alt)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <th
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: "25%",
                  }}
                >
                  Model
                </th>
                <th
                  className="hidden sm:table-cell"
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: "30%",
                  }}
                >
                  Compliance
                </th>
                <th
                  className="hidden md:table-cell"
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: "15%",
                  }}
                >
                  Residency
                </th>
                <th
                  className="hidden lg:table-cell"
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: "15%",
                  }}
                >
                  Price / 1M tokens
                </th>
                <th
                  className="hidden xl:table-cell"
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: "10%",
                  }}
                >
                  Verified
                </th>
                <th style={{ width: "5%" }} aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {matching.map((item) => (
                <ModelRow
                  key={`${item.model.id}-${item.model.providerSlug}`}
                  item={item}
                  dimmed={false}
                />
              ))}
              {nonMatching.map((item) => (
                <ModelRow
                  key={`${item.model.id}-${item.model.providerSlug}`}
                  item={item}
                  dimmed={true}
                />
              ))}
              {totalVisible === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "48px 16px",
                      textAlign: "center",
                      fontFamily: "var(--font-body)",
                      fontSize: "0.9375rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    No models found for &ldquo;{searchQuery}&rdquo;
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
