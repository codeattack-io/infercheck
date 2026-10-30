"use client";

// The page is prerendered without query state. On a full page load of a shared link, an
// inline script hides this block before first paint until the client has rendered the
// URL's search, filter and sort state.

import { useLayoutEffect, useRef, type ReactNode } from "react";

const PENDING_ATTRIBUTE = "data-url-pending";

function pendingScript(params: readonly string[]) {
  return `(function(){var s=new URLSearchParams(location.search);if(${JSON.stringify(params)}.some(function(k){return s.has(k)}))document.currentScript.parentElement.setAttribute("${PENDING_ATTRIBUTE}","")})()`;
}

interface UrlStateBlockProps {
  /** Query parameters that change what the block renders. */
  params: readonly string[];
  /** The query parameters the client has rendered. */
  searchParams: URLSearchParams;
  children: ReactNode;
}

export function UrlStateBlock({ params, searchParams, children }: UrlStateBlockProps) {
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
        dangerouslySetInnerHTML={{ __html: pendingScript(params) }}
      />
      {children}
    </div>
  );
}
