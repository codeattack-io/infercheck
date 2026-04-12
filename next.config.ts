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

// withSentryConfig wraps the final config to wire up the Sentry webpack plugin.
// Source-map upload is disabled because we're using a self-hosted GlitchTip backend
// (no Sentry auth token, no org/project slug needed).
export default withSentryConfig(withIntl, {
  // Disable source map upload — GlitchTip doesn't need Sentry's build-time upload.
  sourcemaps: {
    disable: true,
  },
  // Suppress the Sentry CLI/webpack plugin build output.
  silent: true,
  // Disable Sentry telemetry sent back to sentry.io during builds.
  telemetry: false,
});
