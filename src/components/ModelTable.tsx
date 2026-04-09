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

import { useMemo, useCallback, useTransition, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Fuse, { type FuseResultMatch, type Expression } from "fuse.js";
import { ModelRow } from "@/components/ModelRow";
import { providerMatchesFilter, filterStateFromSearchParams, getComplianceTier } from "@/lib/compliance";
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

// Split the query into tokens on whitespace.
// Each token becomes an $or across all keys, and the full query is an $and —
// every token must be present somewhere.
//
// Token matching strategy (Fuse extended search operators):
//
//  - Purely numeric/version tokens (only digits, dots, hyphens): use the
//    include-match operator "'" (e.g. "'5", "'4.6") which requires a literal
//    substring match with no fuzzy tolerance. This prevents "5" from fuzzy-
//    matching "12" inside "gpt-oss-120b".
//
//  - All other tokens (alphabetic, mixed): plain fuzzy matching so typos
//    like "claud" → "Claude", "gpt" → "GPT-5" still work. No length cutoff —
//    short alphabetic tokens like "gpt" need fuzzy, not exact, because Fuse's
//    "=" operator is a full-field match (whole field must equal the pattern),
//    not a substring match.
//
// Examples:
//   "gpt"       → fuzzy  "gpt"   → matches "OpenAI: GPT-5", "GPT-OSS-120b"
//   "gpt 5"     → fuzzy  "gpt"  AND include "'5"  → only models with literal "5"
//   "claude 4.6"→ fuzzy  "claude" AND include "'4.6"
//   "claud"     → fuzzy  "claud"  → typo-tolerant, finds Claude models
function isVersionToken(token: string): boolean {
  // Only digits, dots, and hyphens — version numbers and numeric model suffixes
  return /^[\d.\-]+$/.test(token);
}

function buildFuseQuery(raw: string): string | Expression {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 1);

  if (tokens.length === 0) return raw.trim();

  // Single token: version → include-match, alphabetic → fuzzy
  if (tokens.length === 1) {
    return isVersionToken(tokens[0]) ? `'${tokens[0]}` : tokens[0];
  }

  // Multi-token: every token must match at least one field.
  // Cast each leaf to Record<string,string> to satisfy Fuse's Expression index sig.
  return {
    $and: tokens.map((token) => {
      const t = isVersionToken(token) ? `'${token}` : token;
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

// ─── Sort ──────────────────────────────────────────────────────────────────────

export type SortKey = "compliance" | "price" | "provider" | "default";
export type SortDir = "asc" | "desc";

const TIER_RANK: Record<string, number> = {
  compliant: 0,
  partial: 1,
  noncompliant: 2,
  unverified: 3,
};

function sortItems(
  items: ModelWithProvider[],
  key: SortKey,
  dir: SortDir,
): ModelWithProvider[] {
  if (key === "default") return items;

  const multiplier = dir === "asc" ? 1 : -1;

  // js-tosorted-immutable: toSorted() creates a new array without mutating props
  return items.toSorted((a, b) => {
    if (key === "compliance") {
      const ra = TIER_RANK[getComplianceTier(a.provider as AnyProvider)] ?? 3;
      const rb = TIER_RANK[getComplianceTier(b.provider as AnyProvider)] ?? 3;
      return (ra - rb) * multiplier;
    }
    if (key === "price") {
      const pa = a.model.inputPricePerMTokens !== null ? parseFloat(a.model.inputPricePerMTokens) : Infinity;
      const pb = b.model.inputPricePerMTokens !== null ? parseFloat(b.model.inputPricePerMTokens) : Infinity;
      return (pa - pb) * multiplier;
    }
    if (key === "provider") {
      const na = (a.provider?.name ?? a.model.providerSlug).toLowerCase();
      const nb = (b.provider?.name ?? b.model.providerSlug).toLowerCase();
      return na < nb ? -1 * multiplier : na > nb ? 1 * multiplier : 0;
    }
    return 0;
  });
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
  const [inputValue, setInputValue] = useState(initialQuery);

  // Sort state — persisted in URL
  const sortKey = (searchParams.get("sort") as SortKey) ?? "default";
  const sortDir = (searchParams.get("dir") as SortDir) ?? "asc";

  const handleSort = useCallback(
    (key: SortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sortKey === key) {
        // Toggle direction if same key
        if (sortDir === "asc") {
          params.set("dir", "desc");
        } else {
          // Third click: reset sort
          params.delete("sort");
          params.delete("dir");
        }
      } else {
        params.set("sort", key);
        params.set("dir", "asc");
      }
      startTransition(() =>
        router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
      );
    },
    [searchParams, pathname, router, sortKey, sortDir],
  );

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

    // Apply sort — only when no active search query (Fuse rank is more useful then)
    const shouldSort = sortKey !== "default" && q === "";
    return {
      matching: shouldSort ? sortItems(matching, sortKey, sortDir) : matching,
      nonMatching: shouldSort ? sortItems(nonMatching, sortKey, sortDir) : nonMatching,
      matchMap,
    };
  }, [items, inputValue, activeFilter, fuse, sortKey, sortDir]);

  const totalVisible = matching.length + nonMatching.length;
  const hasFilter = activeFilter !== null;
  const hasQuery = inputValue.trim() !== "";

  return (
    <div>
      {/* Search input */}
      <div className="mb-4">
        <label htmlFor="model-search" className="sr-only">
          Search models or providers
        </label>
        <div className="relative">
          {/* Search icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>

          {/* search-input class provides :focus ring via globals.css */}
          <input
            id="model-search"
            type="text"
            value={inputValue}
            onChange={handleSearchChange}
            placeholder="Search models or providers…"
            autoComplete="off"
            spellCheck={false}
            className="search-input w-full bg-surface border border-border rounded font-body text-[0.9375rem] text-text-primary outline-none box-border pl-9 py-[9px]"
            style={{ paddingRight: hasQuery ? "36px" : "12px" }}
          />

          {/* Clear button — only visible when there's a query */}
          {hasQuery ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="search-clear-btn absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-none bg-text-muted text-surface cursor-pointer p-0 text-sm leading-none opacity-65"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {/* Results summary */}
      <div className="font-body text-[0.8125rem] text-text-muted mb-3">
        {hasQuery && totalVisible === 0
          ? `No models found for "${inputValue}"`
          : hasFilter
          ? `${matching.length} of ${totalVisible} models match the active filter`
          : hasQuery
          ? `${totalVisible} of ${items.length} models`
          : `${totalVisible} models`}
      </div>

      {/* Table */}
      <div className="border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse bg-surface"
            aria-label="AI models with GDPR compliance data"
          >
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                <SortableTh
                  label="Model"
                  sortKey="default"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  style={{ width: "25%" }}
                />
                <SortableTh
                  label="Compliance"
                  sortKey="compliance"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                  style={{ width: "30%" }}
                />
                <SortableTh
                  label="Residency"
                  sortKey="default"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden md:table-cell"
                  style={{ width: "15%" }}
                  nonSortable
                />
                <SortableTh
                  label="Price / 1M tokens"
                  sortKey="price"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden lg:table-cell"
                  style={{ width: "15%" }}
                />
                <SortableTh
                  label="Verified"
                  sortKey="default"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden xl:table-cell"
                  style={{ width: "10%" }}
                  nonSortable
                />
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
                    className="py-12 px-4 text-center font-body text-[0.9375rem] text-text-muted"
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

// ─── SortableTh ───────────────────────────────────────────────────────────────

interface SortableThProps {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  style?: React.CSSProperties;
  nonSortable?: boolean;
}

function SortableTh({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  className,
  style,
  nonSortable = false,
}: SortableThProps) {
  const isActive = !nonSortable && activeSortKey === sortKey;

  return (
    <th
      className={[
        "px-4 py-[10px] text-left font-body text-xs font-semibold uppercase tracking-[0.05em] select-none",
        isActive ? "text-text-primary" : "text-text-secondary",
        className,
      ].filter(Boolean).join(" ")}
      style={style}
    >
      {nonSortable ? (
        label
      ) : (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="bg-transparent border-none p-0 cursor-pointer font-[inherit] text-[inherit] [text-transform:inherit] [letter-spacing:inherit] inline-flex items-center gap-1"
          aria-label={`Sort by ${label}`}
        >
          {label}
          <span
            className="text-[10px] leading-none"
            style={{ opacity: isActive ? 1 : 0.35 }}
            aria-hidden="true"
          >
            {isActive && sortDir === "desc" ? "↓" : "↑"}
          </span>
        </button>
      )}
    </th>
  );
}
