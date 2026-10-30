"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import Fuse from "fuse.js";
import { FilterBar } from "@/components/FilterBar";
import { ProviderRow } from "@/components/ProviderRow";
import { SearchField, useSearchQuery } from "@/components/SearchField";
import { UrlStateBlock } from "@/components/UrlStateBlock";
import {
  activeFilterFromSearchParams,
  buildFuseQuery,
  FILTER_PARAMS,
  filterFromKey,
  filterKey,
  partitionByFilter,
} from "@/lib/model-list";
import { buttonClass, FINDER_CLASS, TABLE_CLASS, TH_CLASS } from "@/lib/styles";
import { useUrlSearchParams } from "@/lib/url-state";
import type { AnyProvider } from "@/lib/compliance";

export interface ProviderListItem {
  provider: AnyProvider;
  modelCount: number;
}

const URL_PARAMS = ["q", ...FILTER_PARAMS];
const SEARCH_KEYS = ["provider.name"];

const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<ProviderListItem>>[1] = {
  keys: SEARCH_KEYS,
  threshold: 0.2,
  ignoreLocation: true,
  useExtendedSearch: true,
  minMatchCharLength: 2,
};

/**
 * Finder and providers table, driven by the URL query. A search narrows the rows to the
 * matching providers in relevance order; a compliance filter dims non-matching rows.
 */
export function ProviderBrowser({ items }: { items: ProviderListItem[] }) {
  const t = useTranslations("ProvidersPage");
  const tFinder = useTranslations("Finder");
  const searchParams = useUrlSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useSearchQuery(searchParams);
  const filter = activeFilterFromSearchParams(searchParams);
  const query = search.value.trim();
  const key = filterKey(filter);
  const fuse = useMemo(() => new Fuse(items, FUSE_OPTIONS), [items]);

  const { matching, dimmed } = useMemo(() => {
    const searched = query === "" ? items : fuse.search(buildFuseQuery(query, SEARCH_KEYS)).map((r) => r.item);
    return partitionByFilter(searched, filterFromKey(key));
  }, [items, fuse, query, key]);

  const count =
    query !== "" || filter !== null
      ? t("countFiltered", { matching: matching.length, total: items.length })
      : t("countAll", { count: items.length });

  const reset = () => {
    const params = new URLSearchParams(window.location.search);
    for (const param of URL_PARAMS) params.delete(param);
    search.clear(params);
    inputRef.current?.focus();
  };

  return (
    <UrlStateBlock params={URL_PARAMS} searchParams={searchParams}>
      <section aria-label={tFinder("label")} className={FINDER_CLASS}>
        <SearchField
          id="provider-search"
          search={search}
          inputRef={inputRef}
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          clearLabel={tFinder("clearSearch")}
        />
        <FilterBar searchParams={searchParams} count={count} />
      </section>
      <div className={`${TABLE_CLASS} mt-5 max-md:mt-4`}>
        <table className="w-full border-separate border-spacing-0 max-md:block" aria-label={t("tableLabel")}>
          <colgroup className="max-md:hidden">
            <col className="w-[40%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-11" />
          </colgroup>
          <thead className="max-md:hidden">
            <tr>
              <th scope="col" className={`${TH_CLASS} pl-5`}>
                {t("columns.provider")}
              </th>
              <th scope="col" className={TH_CLASS}>
                {t("columns.compliance")}
              </th>
              <th scope="col" className={TH_CLASS}>
                {t("columns.residency")}
              </th>
              <th scope="col" className={`${TH_CLASS} text-right`}>
                {t("columns.models")}
              </th>
              <th scope="col" className={TH_CLASS}>
                <span className="sr-only">{t("columns.profile")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            {matching.map((item) => (
              <ProviderRow key={item.provider.slug} provider={item.provider} modelCount={item.modelCount} />
            ))}
            {dimmed.map((item) => (
              <ProviderRow key={item.provider.slug} provider={item.provider} modelCount={item.modelCount} dimmed />
            ))}
            {matching.length + dimmed.length === 0 ? (
              <tr className="max-md:block">
                <td colSpan={5} className="px-4 py-12 text-center text-15 text-text-muted max-md:block">
                  <p className="m-0">{t("noProvidersFound", { query })}</p>
                  <button type="button" onClick={reset} className={`mt-3 ${buttonClass("secondary")}`}>
                    {t("resetFilters")}
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </UrlStateBlock>
  );
}
