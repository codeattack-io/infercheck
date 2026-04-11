import { defineRouting } from "next-intl/routing";

/**
 * Central routing config — shared by proxy.ts, request.ts, and navigation.ts.
 * Add new locales here; nothing else needs to change for the routing layer.
 */
export const routing = defineRouting({
  locales: ["en", "de"],
  defaultLocale: "en",
  // Both /en/ and /de/ are always explicit in the URL — best for SEO + shareable links.
  localePrefix: "always",
});
