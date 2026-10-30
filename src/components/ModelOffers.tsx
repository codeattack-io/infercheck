"use client";

import { useTranslations } from "next-intl";
import { FilterBar } from "@/components/FilterBar";
import { ModelTable, useModelList, useUrlSort } from "@/components/ModelTable";
import { UrlStateBlock } from "@/components/UrlStateBlock";
import { activeFilterFromSearchParams, FILTER_PARAMS } from "@/lib/model-list";
import { FINDER_CLASS } from "@/lib/styles";
import { useUrlSearchParams } from "@/lib/url-state";
import type { ModelWithProvider } from "@/components/types";

const URL_PARAMS = ["sort", ...FILTER_PARAMS];

interface ModelOffersProps {
  /** One row per provider offering the model. */
  items: ModelWithProvider[];
  modelName: string;
}

/** Refine row and the table of providers offering one model, driven by the URL query. */
export function ModelOffers({ items, modelName }: ModelOffersProps) {
  const t = useTranslations("ModelPage");
  const searchParams = useUrlSearchParams();
  const filter = activeFilterFromSearchParams(searchParams);
  const { sort, onSort } = useUrlSort(searchParams);
  const list = useModelList(items, { filter, sort, primary: "provider" });

  const count =
    filter === null
      ? t("countAll", { count: items.length })
      : t("countFiltered", { matching: list.matching.length, total: items.length });

  return (
    <UrlStateBlock params={URL_PARAMS} searchParams={searchParams}>
      <section aria-label={t("filtersLabel")} className={FINDER_CLASS}>
        <FilterBar searchParams={searchParams} count={count} />
      </section>
      <ModelTable
        {...list}
        sort={sort}
        onSort={onSort}
        pageSize={null}
        primary="provider"
        label={t("tableLabel", { modelName })}
        className="mt-5 max-md:mt-4"
      />
    </UrlStateBlock>
  );
}
