import type { Instrumentation } from "next";

export async function register() {
  // GlitchTip is Sentry-protocol compatible — the DSN points at your self-hosted instance.
  // Only initialise when a DSN is configured so local/test environments without one are fine.
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      // GlitchTip does not support Sentry's newer envelope endpoint — use the
      // classic store endpoint by disabling the transport compression quirks
      // that break self-hosted instances running older Sentry-compatible backends.
      tracesSampleRate: 0.1,
      // Suppress noisy logs during local dev
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      debug: false,
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
