"use client";

// ModelTable: client component that handles search input, applies compliance
// filters, and renders the model rows.
//
// Data is fetched server-side and passed as props — no client-side fetch.
// Filter state lives entirely in URL params (shareable links requirement).
// Search uses Fuse.js with token search for fuzzy multi-word matching.
// Vercel rules applied:
//   - rerender-derived-state-no-effect: filtered list derived during render
//   - rerender-functional-setstate: stable search callback
//   - js-index-maps: provider lookup by slug via Map
//   - rendering-conditional-render: ternary not &&

import { useMemo, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Fuse, { type FuseResultMatch } from "fuse.js";
import { ModelRow } from "@/components/ModelRow";
import { providerMatchesFilter, filterStateFromSearchParams } from "@/lib/compliance";
import type { ModelWithProvider } from "@/components/types";
import type { AnyProvider } from "@/lib/compliance";

// ─── Fuse config ──────────────────────────────────────────────────────────────

// Keys searched; displayName weighted highest since it's what users type.
// useTokenSearch splits "claude 4.6" into ["claude", "4.6"] and fuzzy-matches
// each token independently, then merges scores — fixes the multi-word gap.
const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<ModelWithProvider>>[1] = {
  keys: [
    { name: "model.displayName", weight: 2 },
    { name: "provider.name", weight: 1 },
    { name: "model.id", weight: 0.5 },
  ],
  threshold: 0.35,       // 0 = exact, 1 = match anything — 0.35 is permissive but still relevant
  distance: 200,         // allow matches further into long model-id strings
  useExtendedSearch: false,
  useTokenSearch: true,  // multi-word: "claude 4.6" matches "Claude Sonnet 4.6"
  includeMatches: true,  // gives us character-level indices for highlighting
  minMatchCharLength: 1,
  ignoreLocation: true,  // don't penalise matches that occur deep in the string
};

// Per-row match data keyed by `${model.id}::${model.providerSlug}`
export type MatchMap = Map<string, readonly FuseResultMatch[]>;

function rowKey(item: ModelWithProvider): string {
  return `${item.model.id}::${item.model.providerSlug}`;
}

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

  // Build Fuse index once per items change — O(n) on data, not on each keystroke
  const fuse = useMemo(
    () => new Fuse(items, FUSE_OPTIONS),
    [items],
  );

  // Search: update URL param — client-side filtering means no debounce needed
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

  // Clear search — writes empty state to URL
  const handleClear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    startTransition(() =>
      router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
    );
  }, [searchParams, pathname, router]);

  // Search + filter — derived during render (rerender-derived-state-no-effect)
  //
  // When a query is present: use Fuse results (ranked by score), build a
  // matchMap of highlight data keyed by rowKey.
  // When empty: show all items in original DB order (no Fuse overhead).
  const { matching, nonMatching, matchMap } = useMemo(() => {
    const q = searchQuery.trim();
    const matchMap: MatchMap = new Map();

    // Determine which items pass the text search, and collect match data
    let searchPassed: Set<ModelWithProvider> | null = null; // null = all pass

    if (q !== "") {
      const fuseResults = fuse.search(q);
      searchPassed = new Set();
      for (const result of fuseResults) {
        searchPassed.add(result.item);
        if (result.matches && result.matches.length > 0) {
          matchMap.set(rowKey(result.item), result.matches);
        }
      }
    }

    const matching: ModelWithProvider[] = [];
    const nonMatching: ModelWithProvider[] = [];

    const source = searchPassed !== null
      ? Array.from(searchPassed)  // Fuse-ranked order preserved
      : items;                     // original DB order when no query

    for (const item of source) {
      // Compliance filter — dim, not remove (per design intent)
      const matchesFilter =
        activeFilter === null ||
        (item.provider !== null && providerMatchesFilter(item.provider, activeFilter));

      if (matchesFilter) {
        matching.push(item);
      } else {
        nonMatching.push(item);
      }
    }

    return { matching, nonMatching, matchMap };
  }, [items, searchQuery, activeFilter, fuse]);

  const totalVisible = matching.length + nonMatching.length;
  const hasFilter = activeFilter !== null;
  const hasQuery = searchQuery.trim() !== "";

  return (
    <div>
      {/* Search input */}
      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="model-search" className="sr-only">
          Search models or providers
        </label>
        <div style={{ position: "relative" }}>
          {/* Search icon */}
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
            key={searchQuery} // reset controlled value when URL changes externally
            defaultValue={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search models or providers…"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              padding: hasQuery ? "9px 36px 9px 36px" : "9px 12px 9px 36px",
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

          {/* Clear button — only visible when there's a query */}
          {hasQuery ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "var(--color-text-muted)",
                color: "var(--color-surface)",
                cursor: "pointer",
                padding: 0,
                fontSize: "14px",
                lineHeight: 1,
                opacity: 0.65,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.65"; }}
            >
              ×
            </button>
          ) : null}
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
        {hasQuery && totalVisible === 0
          ? `No models found for "${searchQuery}"`
          : hasFilter
          ? `${matching.length} of ${totalVisible} models match the active filter`
          : hasQuery
          ? `${totalVisible} of ${items.length} models`
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
                  key={rowKey(item)}
                  item={item}
                  dimmed={false}
                  matches={matchMap.get(rowKey(item))}
                />
              ))}
              {nonMatching.map((item) => (
                <ModelRow
                  key={rowKey(item)}
                  item={item}
                  dimmed={true}
                  matches={matchMap.get(rowKey(item))}
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
