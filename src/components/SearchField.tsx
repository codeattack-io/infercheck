"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { writeSearchParams } from "@/lib/url-state";

const SEARCH_URL_DEBOUNCE_MS = 300;

export type SearchQuery = ReturnType<typeof useSearchQuery>;

/**
 * The search field's text. Filtering follows every keystroke; the `q` URL parameter follows
 * once typing pauses. A URL change from elsewhere (hydration, back/forward) resets the text.
 */
export function useSearchQuery(searchParams: URLSearchParams) {
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

interface SearchFieldProps {
  id: string;
  search: SearchQuery;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  placeholder: string;
  clearLabel: string;
}

/** Search row of the finder: magnifier, borderless search input and a clear button while it has text. */
export function SearchField({ id, search, inputRef, label, placeholder, clearLabel }: SearchFieldProps) {
  return (
    <div className="relative flex items-center">
      <label htmlFor={id} className="sr-only">
        {label}
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
        id={id}
        type="search"
        value={search.value}
        onChange={search.onChange}
        placeholder={placeholder}
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
          aria-label={clearLabel}
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
  );
}
