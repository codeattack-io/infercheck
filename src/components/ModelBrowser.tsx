"use client";

// The page is prerendered without query state. On a full page load of a shared link, an
// inline script hides this block before first paint until the client has rendered the
// URL's search, filter and sort state.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { FilterBar } from "@/components/FilterBar";
import { ModelTable, useModelList, useUrlSort } from "@/components/ModelTable";
import { activeFilterFromSearchParams, FILTER_PARAMS } from "@/lib/model-list";
import { useUrlSearchParams, writeSearchParams } from "@/lib/url-state";
import type { ModelWithProvider } from "@/components/types";

const TABLE_URL_PARAMS = ["q", "sort", ...FILTER_PARAMS];
const PENDING_ATTRIBUTE = "data-url-pending";
const PENDING_SCRIPT = `(function(){var s=new URLSearchParams(location.search);if(${JSON.stringify(TABLE_URL_PARAMS)}.some(function(k){return s.has(k)}))document.currentScript.parentElement.setAttribute("${PENDING_ATTRIBUTE}","")})()`;
const SEARCH_URL_DEBOUNCE_MS = 300;

interface ModelBrowserProps {
  items: ModelWithProvider[];
  providerCount: number;
}

export function ModelBrowser({ items, providerCount }: ModelBrowserProps) {
  const t = useTranslations("Finder");
  const searchParams = useUrlSearchParams();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (searchParams.toString() === new URLSearchParams(window.location.search).toString()) {
      ref.current?.removeAttribute(PENDING_ATTRIBUTE);
    }
  }, [searchParams]);

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
    <div ref={ref} suppressHydrationWarning>
      {/* NOTE: client renders must not emit an executable script; React warns and never runs it. */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: PENDING_SCRIPT }}
      />
      <section
        aria-label={t("label")}
        className="rounded-card border border-border bg-surface shadow-finder focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-subtle)]"
      >
        <div className="relative flex items-center">
          <label htmlFor="model-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-[18px] size-[22px] text-text-muted max-md:left-4 max-md:size-5"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            id="model-search"
            type="search"
            value={search.value}
            onChange={search.onChange}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className="h-[60px] w-full rounded-t-card border-0 bg-transparent pr-12 pl-[54px] text-18 text-text-primary outline-none placeholder:text-placeholder max-md:h-[54px] max-md:pl-12 max-md:text-16 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {search.value !== "" ? (
            <button
              type="button"
              onClick={() => {
                search.clear();
                inputRef.current?.focus();
              }}
              aria-label={t("clearSearch")}
              className="absolute right-3.5 flex size-6 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors duration-100 ease-out hover:text-text-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="size-[18px]"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          ) : null}
        </div>
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
    </div>
  );
}

/**
 * The search field's text. Filtering follows every keystroke; the `q` URL parameter follows
 * once typing pauses. A URL change from elsewhere (hydration, back/forward) resets the text.
 */
function useSearchQuery(searchParams: URLSearchParams) {
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setValue(urlQuery);
  }

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const write = useCallback((q: string, params = new URLSearchParams(window.location.search)) => {
    window.clearTimeout(timer.current);
    setSyncedQuery(q);
    if (q) params.set("q", q);
    else params.delete("q");
    writeSearchParams(params, "replace");
  }, []);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const q = event.target.value;
      setValue(q);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => write(q), SEARCH_URL_DEBOUNCE_MS);
    },
    [write]
  );

  const clear = useCallback(
    (params?: URLSearchParams) => {
      setValue("");
      write("", params);
    },
    [write]
  );

  return { value, onChange, clear };
}
