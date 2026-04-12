import * as Sentry from "@sentry/nextjs";

// Only initialise when a DSN is configured.
// NEXT_PUBLIC_SENTRY_DSN must be exposed at build time for the browser bundle.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Replay is disabled — GlitchTip does not support the Session Replay endpoint.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    debug: false,
  });
}

export function onRouterTransitionStart(url: string) {
  if (dsn) {
    Sentry.addBreadcrumb({
      category: "navigation",
      message: `Navigated to ${url}`,
      level: "info",
    });
  }
}
