"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ModelRow } from "@/components/ModelRow";
import type { ModelWithProvider } from "@/components/types";
import type { ComplianceFilter } from "@/lib/compliance";
import {
  createModelSearch,
  filterFromKey,
  filterKey,
  nextSort,
  partitionByFilter,
  rowKey,
  searchModels,
  parseSort,
  sortModels,
  type MatchMap,
  type ModelList,
  type PrimaryColumn,
  type SortKey,
  type SortState,
} from "@/lib/model-list";
import { buttonClass, TABLE_CLASS, TH_CLASS } from "@/lib/styles";
import { writeSearchParams } from "@/lib/url-state";

export const PAGE_SIZE = 50;

const NO_MATCHES: MatchMap = new Map();

interface ModelListOptions {
  query?: string;
  filter: ComplianceFilter | null;
  sort: SortState;
  primary?: PrimaryColumn;
}

/**
 * Searches, sorts and partitions `items` in the browser. A search narrows the rows; the
 * compliance filter only moves non-matching rows behind the matching ones. Without an
 * explicit sort, search results keep their relevance order.
 */
export function useModelList(
  items: ModelWithProvider[],
  { query = "", filter, sort, primary = "model" }: ModelListOptions
): ModelList {
  const locale = useLocale();
  const fuse = useMemo(() => createModelSearch(items), [items]);
  const trimmed = query.trim();
  const key = filterKey(filter);
  const { key: sortKey, dir: sortDir } = sort;

  return useMemo(() => {
    const searched = trimmed === "" ? { items, matches: NO_MATCHES } : searchModels(fuse, trimmed);
    const sorted = sortModels(searched.items, { key: sortKey, dir: sortDir }, locale, primary);
    return { ...partitionByFilter(sorted, filterFromKey(key)), matches: searched.matches };
  }, [items, fuse, trimmed, key, sortKey, sortDir, locale, primary]);
}

/** Sort state from the `sort` and `dir` URL parameters, written back without a server request. */
export function useUrlSort(searchParams: URLSearchParams) {
  const sortParam = searchParams.get("sort");
  const dirParam = searchParams.get("dir");
  const sort = useMemo(() => parseSort(sortParam, dirParam), [sortParam, dirParam]);

  const onSort = useCallback(
    (key: SortKey) => {
      const next = nextSort(sort, key);
      const params = new URLSearchParams(window.location.search);
      if (next.key === null) {
        params.delete("sort");
        params.delete("dir");
      } else {
        params.set("sort", next.key);
        params.set("dir", next.dir);
      }
      writeSearchParams(params, "replace");
    },
    [sort]
  );

  return { sort, onSort };
}

export interface ModelTableProps extends ModelList {
  sort: SortState;
  onSort: (key: SortKey) => void;
  /** The search text, quoted in the empty state. */
  query?: string;
  /** Shows a "Reset filters" button in the empty state. */
  onReset?: () => void;
  /** Rows rendered first and added per "Load more"; null renders every row and no "more" row. */
  pageSize?: number | null;
  primary?: PrimaryColumn;
  /** Accessible name of the table. */
  label?: string;
  className?: string;
}

/**
 * Matching rows come first, dimmed rows after them, and "Load more" reveals that combined
 * order in steps of `pageSize`, so dimmed rows appear only once every matching row is shown.
 * A new search, filter or sort starts again at one page. After "Load more", focus moves to
 * the first newly shown row.
 */
export function ModelTable({
  matching,
  dimmed,
  matches,
  sort,
  onSort,
  query = "",
  onReset,
  pageSize = PAGE_SIZE,
  primary = "model",
  label,
  className,
}: ModelTableProps) {
  const t = useTranslations("ModelTable");
  const total = matching.length + dimmed.length;

  const [limit, setLimit] = useState(pageSize ?? total);
  const [listFor, setListFor] = useState({ matching, dimmed });
  if (listFor.matching !== matching || listFor.dimmed !== dimmed) {
    setListFor({ matching, dimmed });
    setLimit(pageSize ?? total);
  }
  const shown = pageSize === null ? total : Math.min(limit, total);
  const remaining = total - shown;

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const focusRow = useRef<number | null>(null);
  useEffect(() => {
    if (focusRow.current === null) return;
    tbodyRef.current?.querySelectorAll<HTMLElement>("[data-row-button]")[focusRow.current]?.focus();
    focusRow.current = null;
  }, [limit]);

  const loadMore = () => {
    focusRow.current = shown;
    setLimit(shown + (pageSize ?? total));
  };

  const rows = [];
  for (let i = 0; i < shown; i++) {
    const isDimmed = i >= matching.length;
    const item = isDimmed ? dimmed[i - matching.length] : matching[i];
    rows.push(
      <ModelRow
        key={rowKey(item)}
        item={item}
        dimmed={isDimmed}
        matches={matches.get(rowKey(item))}
        primary={primary}
      />
    );
  }

  return (
    <div className={`${TABLE_CLASS} ${className ?? ""}`}>
      <table
        className="-mb-px w-full border-separate border-spacing-0 max-md:block"
        aria-label={label ?? t("tableAriaLabel")}
      >
        <colgroup className="max-md:hidden">
          <col className="w-[42%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
          <col className="w-[20%]" />
          <col className="w-11" />
        </colgroup>
        <thead className="max-md:hidden">
          <tr>
            <SortHeader
              column="model"
              label={primary === "model" ? t("columns.model") : t("columns.provider")}
              sort={sort}
              onSort={onSort}
              className="pl-5"
            />
            <SortHeader column="compliance" label={t("columns.compliance")} sort={sort} onSort={onSort} />
            <th scope="col" className={TH_CLASS}>
              {t("columns.residency")}
            </th>
            <SortHeader
              column="price"
              label={t("columns.price")}
              sub={t("columns.priceSub")}
              sort={sort}
              onSort={onSort}
              className="text-right"
            />
            <th scope="col" className={TH_CLASS}>
              <span className="sr-only">{t("columns.details")}</span>
            </th>
          </tr>
        </thead>
        <tbody ref={tbodyRef} className="max-md:block">
          {rows}
          {remaining > 0 ? (
            <tr className="max-md:block">
              <td
                colSpan={5}
                className="border-b border-border px-5 py-3.5 text-15 text-text-muted max-md:block max-md:p-3.5"
              >
                {t("moreCount", { count: remaining })}
                <button type="button" onClick={loadMore} className={`ml-3 ${buttonClass("secondary")}`}>
                  {t("loadMore")}
                </button>
              </td>
            </tr>
          ) : null}
          {total === 0 ? (
            <tr className="max-md:block">
              <td
                colSpan={5}
                className="border-b border-border px-4 py-12 text-center text-15 text-text-muted max-md:block"
              >
                <p className="m-0">{query.trim() ? t("noModelsFound", { query: query.trim() }) : t("noModels")}</p>
                {onReset ? (
                  <button type="button" onClick={onReset} className={`mt-3 ${buttonClass("secondary")}`}>
                    {t("resetFilters")}
                  </button>
                ) : null}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

interface SortHeaderProps {
  column: SortKey;
  label: string;
  sub?: string;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({ column, label, sub, sort, onSort, className }: SortHeaderProps) {
  const t = useTranslations("ModelTable");
  const active = sort.key === column;
  const descending = active && sort.dir === "desc";

  return (
    <th
      scope="col"
      aria-sort={active ? (descending ? "descending" : "ascending") : "none"}
      className={`${TH_CLASS} ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={t("sortBy", { label })}
        className="group relative cursor-pointer uppercase tracking-[inherit]"
      >
        {label}
        <svg
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`absolute top-1/2 left-full ml-1 size-2.5 -translate-y-1/2 ${descending ? "rotate-180" : ""} ${active ? "" : "opacity-0 group-hover:opacity-35 group-focus-visible:opacity-35"}`}
        >
          <path d="M5 8.5v-7M2 4.5l3-3 3 3" />
        </svg>
      </button>
      {sub ? <span className="block text-13 font-medium tracking-normal normal-case">{sub}</span> : null}
    </th>
  );
}
