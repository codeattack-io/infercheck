import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],
  async rewrites() {
    return [
      {
        source: "/stats/:match*",
        destination: "https://analytics.codeattack.io/:match*",
      },
    ];
  },
};

const withIntl = withNextIntl(nextConfig);

// withSentryConfig wires up the Sentry webpack plugin for source-map upload.
// sentryUrl points at the self-hosted GlitchTip instance (Sentry-protocol compatible).
// All three vars (authToken, org, project) must be set for upload to run;
// when any is absent the plugin silently skips upload (safe for local dev).
export default withSentryConfig(withIntl, {
  sentryUrl: process.env.SENTRY_URL,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Suppress the Sentry CLI/webpack plugin build output.
  silent: true,
  // Disable Sentry telemetry sent back to sentry.io during builds.
  telemetry: false,
});
