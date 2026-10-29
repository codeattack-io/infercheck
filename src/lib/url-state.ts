import { useMemo, useSyncExternalStore } from "react";

const URL_CHANGE_EVENT = "infercheck:urlchange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_CHANGE_EVENT, onChange);
  };
}

/**
 * Current query parameters, kept in sync with history navigation and
 * `writeSearchParams`. Empty while prerendering and hydrating, so the
 * prerendered page stays static and hydration matches it.
 */
export function useUrlSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => ""
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** Updates the query string through the History API, without a server request. */
export function writeSearchParams(params: URLSearchParams, mode: "push" | "replace") {
  const qs = params.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  if (mode === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
  window.dispatchEvent(new Event(URL_CHANGE_EVENT));
}
