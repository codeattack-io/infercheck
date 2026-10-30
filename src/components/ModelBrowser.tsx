"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { FilterBar } from "@/components/FilterBar";
import { ModelTable, useModelList, useUrlSort } from "@/components/ModelTable";
import { SearchField, useSearchQuery } from "@/components/SearchField";
import { UrlStateBlock } from "@/components/UrlStateBlock";
import { activeFilterFromSearchParams, FILTER_PARAMS } from "@/lib/model-list";
import { FINDER_CLASS } from "@/lib/styles";
import { useUrlSearchParams } from "@/lib/url-state";
import type { ModelWithProvider } from "@/components/types";

const URL_PARAMS = ["q", "sort", ...FILTER_PARAMS];

interface ModelBrowserProps {
  items: ModelWithProvider[];
  providerCount: number;
}

export function ModelBrowser({ items, providerCount }: ModelBrowserProps) {
  const t = useTranslations("Finder");
  const searchParams = useUrlSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useSearchQuery(searchParams);
  const filter = activeFilterFromSearchParams(searchParams);
  const { sort, onSort } = useUrlSort(searchParams);
  const list = useModelList(items, { query: search.value, filter, sort });

  const narrowed = search.value.trim() !== "" || filter !== null;
  const count = narrowed
    ? t("countFiltered", { matching: list.matching.length, total: items.length })
    : t("countAll", { models: items.length, providers: providerCount });

  const reset = () => {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["q", ...FILTER_PARAMS]) params.delete(key);
    search.clear(params);
    inputRef.current?.focus();
  };

  return (
    <UrlStateBlock params={URL_PARAMS} searchParams={searchParams}>
      <section aria-label={t("label")} className={FINDER_CLASS}>
        <SearchField
          id="model-search"
          search={search}
          inputRef={inputRef}
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          clearLabel={t("clearSearch")}
        />
        <FilterBar searchParams={searchParams} count={count} />
      </section>
      <ModelTable
        {...list}
        sort={sort}
        onSort={onSort}
        query={search.value}
        onReset={reset}
        className="mt-5 max-md:mt-4"
      />
    </UrlStateBlock>
  );
}
