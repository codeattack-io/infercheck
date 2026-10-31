import Fuse, { type Expression, type FuseResultMatch } from "fuse.js";
import {
  PRESET_FILTERS,
  filterStateFromSearchParams,
  getComplianceTier,
  providerMatchesFilter,
  type AnyProvider,
  type ComplianceFilter,
  type ComplianceTier,
} from "@/lib/compliance";
import { modelDisplayName } from "@/lib/format";
import type { ModelWithProvider } from "@/components/types";

export type SortKey = "model" | "compliance" | "price";
export type SortDir = "asc" | "desc";
export interface SortState {
  key: SortKey | null;
  dir: SortDir;
}

/** Which name a row leads with: the model (home page) or the provider (model page). */
export type PrimaryColumn = "model" | "provider";

export type MatchMap = Map<string, readonly FuseResultMatch[]>;

export interface ModelList {
  /** Rows that pass the compliance filter, in display order. */
  matching: ModelWithProvider[];
  /** Rows that fail the compliance filter; shown dimmed after `matching`. */
  dimmed: ModelWithProvider[];
  /** Search match ranges per row key, for highlighting. */
  matches: MatchMap;
}

export const SORT_KEYS: readonly SortKey[] = ["model", "compliance", "price"];
export const FILTER_FLAGS = [
  "euOnly",
  "dpa",
  "noTraining",
  "sccs",
] as const satisfies readonly (keyof ComplianceFilter)[];
export const FILTER_PARAMS = ["profile", ...FILTER_FLAGS] as const;

const TIER_RANK: Record<ComplianceTier, number> = { compliant: 0, partial: 1, noncompliant: 2, unverified: 3 };

const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<ModelWithProvider>>[1] = {
  keys: [
    { name: "model.displayName", weight: 2 },
    { name: "provider.name", weight: 1 },
    { name: "model.id", weight: 0.5 },
  ],
  threshold: 0.2,
  distance: 200,
  ignoreLocation: true,
  useExtendedSearch: true,
  includeMatches: true,
  minMatchCharLength: 2,
};

export function rowKey(item: ModelWithProvider): string {
  return `${item.model.id}::${item.model.providerSlug}`;
}

export function providerName(item: ModelWithProvider): string {
  return item.provider?.name ?? item.model.providerSlug;
}

export function createModelSearch(items: ModelWithProvider[]): Fuse<ModelWithProvider> {
  return new Fuse(items, FUSE_OPTIONS);
}

const SEARCH_KEYS = ["model.displayName", "provider.name", "model.id"];

// Version-like tokens ("4.6", "120") match literally; words match fuzzily. Every token must match.
export function buildFuseQuery(query: string, keys: readonly string[]): Expression {
  const tokens = query.trim().split(/\s+/);
  return {
    $and: tokens.map((token) => {
      const pattern = /^[\d.-]+$/.test(token) ? `'${token}` : token;
      return { $or: keys.map((key): Expression => ({ [key]: pattern })) };
    }),
  };
}

export function searchModels(fuse: Fuse<ModelWithProvider>, query: string) {
  const items: ModelWithProvider[] = [];
  const matches: MatchMap = new Map();
  for (const result of fuse.search(buildFuseQuery(query, SEARCH_KEYS))) {
    items.push(result.item);
    if (result.matches?.length) matches.set(rowKey(result.item), result.matches);
  }
  return { items, matches };
}

function primaryName(item: ModelWithProvider, primary: PrimaryColumn): string {
  return primary === "model" ? modelDisplayName(item.model.displayName) : providerName(item);
}

export function sortModels(
  items: ModelWithProvider[],
  sort: SortState,
  locale: string,
  primary: PrimaryColumn = "model"
): ModelWithProvider[] {
  if (sort.key === null) return items;
  const sign = sort.dir === "asc" ? 1 : -1;
  const byName = (a: ModelWithProvider, b: ModelWithProvider) =>
    primaryName(a, primary).localeCompare(primaryName(b, primary), locale, { sensitivity: "base" }) ||
    providerName(a).localeCompare(providerName(b), locale, { sensitivity: "base" });

  return items.toSorted((a, b) => {
    switch (sort.key) {
      case "compliance":
        return (tierRank(a) - tierRank(b)) * sign;
      case "price": {
        const pa = priceOf(a);
        const pb = priceOf(b);
        if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? 1 : -1;
        return (pa - pb) * sign;
      }
      default:
        return byName(a, b) * sign;
    }
  });
}

function tierRank(item: ModelWithProvider): number {
  return item.provider ? TIER_RANK[getComplianceTier(item.provider)] : TIER_RANK.unverified;
}

function priceOf(item: ModelWithProvider): number | null {
  const value = item.model.inputPricePerMTokens;
  if (value === null) return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

/** Splits rows into those that pass the filter and those that are shown dimmed, keeping their order. */
export function partitionByFilter<T extends { provider: AnyProvider | null }>(
  items: T[],
  filter: ComplianceFilter | null
): { matching: T[]; dimmed: T[] } {
  if (filter === null) return { matching: items, dimmed: [] };
  const matching: T[] = [];
  const dimmed: T[] = [];
  for (const item of items) {
    (item.provider !== null && providerMatchesFilter(item.provider, filter) ? matching : dimmed).push(item);
  }
  return { matching, dimmed };
}

/** The compliance filter in effect for the URL, or null when no preset or custom flag is set. */
export function activeFilterFromSearchParams(params: URLSearchParams): ComplianceFilter | null {
  const { profile, custom } = filterStateFromSearchParams(params);
  if (profile === null) return null;
  if (profile !== "custom") return PRESET_FILTERS[profile];
  return Object.keys(custom).length > 0 ? custom : null;
}

/** A stable string for a filter, so memoised lists survive URL writes that leave the filter unchanged. */
export function filterKey(filter: ComplianceFilter | null): string {
  if (filter === null) return "";
  const flags = Object.keys(filter) as (keyof ComplianceFilter)[];
  return flags
    .filter((flag) => filter[flag])
    .sort()
    .join(",");
}

export function filterFromKey(key: string): ComplianceFilter | null {
  if (key === "") return null;
  return Object.fromEntries(key.split(",").map((flag) => [flag, true]));
}

/** Sort state from the `sort` and `dir` URL parameters. */
export function parseSort(sort: string | null, dir: string | null): SortState {
  return {
    key: SORT_KEYS.find((key) => key === sort) ?? null,
    dir: dir === "desc" ? "desc" : "asc",
  };
}

/** Ascending, then descending, then back to the default order. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : { key: null, dir: "asc" };
}
