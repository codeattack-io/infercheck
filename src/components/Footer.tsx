// Shared site footer — rendered in root layout so every page gets it.
// Server Component (no interactivity needed).
//
// Links use NEXT_PUBLIC_GITHUB_REPO_URL so the repo URL is configurable
// without a code change (e.g. forks, staging environments).

import Link from "next/link";

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        padding: "24px 40px",
        marginTop: "auto",
      }}
      className="px-4 sm:px-6 lg:px-10"
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* ── Top row: license + nav links ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left: licensing */}
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Data licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-link)" }}
            >
              CC BY-NC-SA 4.0
            </a>
            . Code under{" "}
            <a
              href={`${GITHUB_REPO}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-link)" }}
            >
              MIT
            </a>
            .
          </p>

          {/* Right: nav links */}
          <nav
            aria-label="Footer navigation"
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <Link
              href="/about"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
                textDecoration: "none",
              }}
            >
              About
            </Link>
            {/* Imprint and Privacy will be added here when those pages exist */}
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
                textDecoration: "none",
              }}
            >
              GitHub →
            </a>
          </nav>
        </div>

        {/* ── Disclaimer ── */}
        <p
          role="note"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            margin: "16px 0 0",
            lineHeight: 1.5,
            borderTop: "1px solid var(--color-border)",
            paddingTop: "16px",
          }}
        >
          This directory provides sourced information about AI providers&apos; data
          practices. It is not legal advice. Always verify directly with the provider
          and consult legal counsel for compliance decisions.
        </p>
      </div>
    </footer>
  );
}
