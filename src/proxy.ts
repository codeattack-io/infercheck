import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Locale routing middleware.
 * Note: Next.js 16 renamed middleware.ts → proxy.ts.
 *
 * Detection priority (first match wins):
 *   1. Locale prefix in URL (/en/..., /de/...)
 *   2. NEXT_LOCALE cookie (from prior visit)
 *   3. Accept-Language header
 *   4. defaultLocale ("en")
 */
export default createMiddleware(routing);

export const config = {
  // Match all pathnames except:
  //   - /api/* and /trpc/* (API routes)
  //   - /_next/* and /_vercel/* (Next.js internals)
  //   - anything containing a dot (static files: .svg, .ico, .png, etc.)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
