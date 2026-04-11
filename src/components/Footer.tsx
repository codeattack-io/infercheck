// Shared site footer — rendered in root layout so every page gets it.
// Server Component (no interactivity needed).
//
// Links use NEXT_PUBLIC_GITHUB_REPO_URL so the repo URL is configurable
// without a code change (e.g. forks, staging environments).

import Link from "next/link";
import { getTranslations } from "next-intl/server";

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t border-border mt-auto px-4 sm:px-6 lg:px-10 py-6">
      <div className="max-w-[1200px] mx-auto">
        {/* ── Top row: license + nav links ── */}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          {/* Left: licensing */}
          <p className="font-body text-[0.8125rem] text-text-muted m-0">
            {t("license")}{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {t("licenseName")}
            </a>
            . {t("codeLicense")}{" "}
            <a
              href={`${GITHUB_REPO}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {t("codeLicenseName")}
            </a>
            .
          </p>

          {/* Right: nav links */}
          <nav aria-label="Footer navigation" className="flex gap-5 items-center">
            <Link
              href="/about"
              className="font-body text-[0.8125rem] text-text-muted no-underline"
            >
              {t("nav.about")}
            </Link>
            {/* Imprint and Privacy will be added here when those pages exist */}
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[0.8125rem] text-text-muted no-underline"
            >
              {t("nav.github")}
            </a>
          </nav>
        </div>

        {/* ── Disclaimer ── */}
        <p
          role="note"
          className="font-body text-xs text-text-muted mt-4 leading-[1.5] border-t border-border pt-4"
        >
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}
