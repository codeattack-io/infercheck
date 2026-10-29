"use client";

// ModelBrowser: the filter bar and model table, driven by the URL query string.
//
// The page is prerendered without query state. On a full page load of a shared
// link, an inline script hides this block before first paint until the client
// has rendered the URL's search, filter and sort state.

import { useLayoutEffect, useRef } from "react";
import { FilterBar } from "@/components/FilterBar";
import { ModelTable } from "@/components/ModelTable";
import { useUrlSearchParams } from "@/lib/url-state";
import type { ModelWithProvider } from "@/components/types";

const TABLE_URL_PARAMS = ["q", "profile", "sort", "euOnly", "dpa", "noTraining", "sccs"];
const PENDING_ATTRIBUTE = "data-url-pending";
const PENDING_SCRIPT = `(function(){var s=new URLSearchParams(location.search);if(${JSON.stringify(TABLE_URL_PARAMS)}.some(function(k){return s.has(k)}))document.currentScript.parentElement.setAttribute("${PENDING_ATTRIBUTE}","")})()`;

export function ModelBrowser({ items }: { items: ModelWithProvider[] }) {
  const searchParams = useUrlSearchParams();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (searchParams.toString() === new URLSearchParams(window.location.search).toString()) {
      ref.current?.removeAttribute(PENDING_ATTRIBUTE);
    }
  }, [searchParams]);

  return (
    <div ref={ref} suppressHydrationWarning>
      {/* NOTE: client renders must not emit an executable script; React warns and never runs it. */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: PENDING_SCRIPT }}
      />
      <div className="mb-6">
        <FilterBar searchParams={searchParams} />
      </div>
      <ModelTable items={items} searchParams={searchParams} />
    </div>
  );
}
