"use client";

// ModelTable: client component that handles search input, applies compliance
// filters, and renders the model rows.
//
// Data is fetched server-side and passed as props — no client-side fetch.
// Filter state lives entirely in URL params (shareable links requirement).
// Search uses Fuse.js with a manual multi-token $and logical query so that
// "claude 4.6" matches "Claude Sonnet 4.6" without spuriously matching any
// model that happens to contain a standalone "4" or "6" elsewhere.
//
// Input state is LOCAL (useState) — never re-derived from the URL prop.
// This prevents the input from remounting and losing focus on every keystroke.
// The URL is written on change (for shareability) but never read back into the
// input value after mount.
//
// Vercel rules applied:
//   - rerender-derived-state-no-effect: filtered list derived during render
//   - rerender-functional-setstate: stable search callback
//   - js-index-maps: provider lookup by slug via Map
//   - rendering-conditional-render: ternary not &&

import { useMemo, useCallback, useTransition, useState, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Fuse, { type FuseResultMatch, type Expression } from "fuse.js";
import { ModelRow } from "@/components/ModelRow";
import { providerMatchesFilter, filterStateFromSearchParams } from "@/lib/compliance";
import type { ModelWithProvider } from "@/components/types";
import type { AnyProvider } from "@/lib/compliance";

// ─── Fuse config ──────────────────────────────────────────────────────────────

// Keys searched; displayName weighted highest since it's what users type.
// We do NOT use useTokenSearch — it splits on whitespace and matches each
// token independently, so "4" matches any model with a 4 anywhere.
// Instead we build a manual $and logical query in buildFuseQuery() below.
const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<ModelWithProvider>>[1] = {
  keys: [
    { name: "model.displayName", weight: 2 },
    { name: "provider.name", weight: 1 },
    { name: "model.id", weight: 0.5 },
  ],
  threshold: 0.2,            // tight: only close matches; 0 = exact, 1 = anything
  distance: 200,             // allow matches further into long model-id strings
  ignoreLocation: true,      // don't penalise matches that occur deep in the string
  useExtendedSearch: true,   // required for $and / $or logical queries
  useTokenSearch: false,     // off — we build the token split manually below
  includeMatches: true,      // character-level indices for highlighting
  minMatchCharLength: 2,     // never match single characters
};

// Split the query into tokens on whitespace, drop empties and single chars.
// Each token becomes an $or across all keys (any field may match it), and the
// full query is an $and of all tokens — every word must be present somewhere.
//
// "claude 4.6" → $and: [ {$or fuzzy "claude"}, {$or exact "=4.6"} ]
// "gpt 5"      → $and: [ {$or fuzzy "gpt"},    {$or exact "=5"}   ]
//
// Short/numeric tokens use Fuse extended-search exact-match prefix ("=token")
// so they can ONLY match literally — this prevents "5" fuzzy-matching "12" in
// a model like "gpt-oss-120b". Long alphabetic tokens stay fuzzy so typos
// like "claud" still work.
//
// A token is treated as exact when it is:
//  - purely numeric (e.g. "5", "4.6", "120b")
//  - 3 chars or fewer (short enough that fuzzy has too many false positives)
function isExactToken(token: string): boolean {
  // Numeric-ish: only digits, dots, hyphens — version numbers, model suffixes
  if (/^[\d.\-]+$/.test(token)) return true;
  // Short: 3 chars or fewer
  if (token.length <= 3) return true;
  return false;
}

function buildFuseQuery(raw: string): string | Expression {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 1);

  if (tokens.length === 0) return raw.trim();

  // For a single token: if it needs exact matching, prefix with =; else fuzzy.
  if (tokens.length === 1) {
    return isExactToken(tokens[0]) ? `=${tokens[0]}` : tokens[0];
  }

  // Multi-token: every token must match at least one field.
  // Cast each leaf to Record<string,string> to satisfy Fuse's Expression index sig.
  return {
    $and: tokens.map((token) => {
      const t = isExactToken(token) ? `=${token}` : token;
      return {
        $or: [
          { "model.displayName": t } as Record<string, string>,
          { "provider.name": t } as Record<string, string>,
          { "model.id": t } as Record<string, string>,
        ],
      };
    }),
  } as Expression;
}

// Per-row match data keyed by `${model.id}::${model.providerSlug}`
export type MatchMap = Map<string, readonly FuseResultMatch[]>;

function rowKey(item: ModelWithProvider): string {
  return `${item.model.id}::${item.model.providerSlug}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ModelTableProps {
  items: ModelWithProvider[];
  /** Initial search query from URL — used only at mount, never synced back */
  searchQuery: string;
}

export function ModelTable({ items, searchQuery: initialQuery }: ModelTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // LOCAL input state — decoupled from URL after mount.
  // This is the key fix for focus loss: the input value never causes the input
  // to remount because we don't use key= or re-derive from a changing prop.
  const [inputValue, setInputValue] = useState(initialQuery);

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

  // Build Fuse index once per items change — O(n) cost paid on data change, not per keystroke
  const fuse = useMemo(
    () => new Fuse(items, FUSE_OPTIONS),
    [items],
  );

  // Search: update local state immediately (keeps input responsive), push URL
  // in a transition so the RSC navigation doesn't block typing.
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setInputValue(q);
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

  // Clear search
  const handleClear = useCallback(() => {
    setInputValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    startTransition(() =>
      router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
    );
  }, [searchParams, pathname, router]);

  // Search + filter — derived during render (rerender-derived-state-no-effect)
  //
  // inputValue drives filtering (local, instant), not the server-prop query.
  const { matching, nonMatching, matchMap } = useMemo(() => {
    const q = inputValue.trim();
    const matchMap: MatchMap = new Map();

    let searchPassed: Set<ModelWithProvider> | null = null;

    if (q !== "") {
      const query = buildFuseQuery(q);
      // Fuse search accepts string | Expression — cast needed because the
      // TypeScript overloads don't unify the two signatures cleanly.
      const fuseResults = fuse.search(query as string);
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
      ? Array.from(searchPassed)  // Fuse-ranked order
      : items;                     // original DB order when no query

    for (const item of source) {
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
  }, [items, inputValue, activeFilter, fuse]);

  const totalVisible = matching.length + nonMatching.length;
  const hasFilter = activeFilter !== null;
  const hasQuery = inputValue.trim() !== "";

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
            value={inputValue}
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
          ? `No models found for "${inputValue}"`
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
                    No models found for &ldquo;{inputValue}&rdquo;
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
