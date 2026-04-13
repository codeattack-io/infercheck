// About page — why this directory exists, who built it, and how to contribute.
// React Server Component — no client-side data needed.

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ locale: string }>;
}

// ─── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/about`,
      languages: {
        "en": "https://infercheck.eu/en/about",
        "de": "https://infercheck.eu/de/about",
        "x-default": "https://infercheck.eu/en/about",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#";
const NEW_ISSUE_URL = `${GITHUB_REPO}/issues/new?template=report-change.yml`;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AboutPage");

  return (
    <>
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 pb-24">
        {/* ── Page heading ── */}
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)] font-normal text-heading leading-[1.15] mb-3 tracking-[-0.02em]">
          {t("heading")}
        </h1>

        <p className="font-body text-[1.0625rem] text-text-secondary leading-[1.65] mb-12">
          {t("subtitle")}
        </p>

        {/* ── Divider ── */}
        <hr className="border-none border-t border-border mb-12" />

        {/* ── Why this exists ── */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("whyExistsHeading")}
          </h2>
          <div className="font-body text-[0.9375rem] text-text-primary leading-[1.75] flex flex-col gap-4">
            <p>{t("whyExistsPara1")}</p>
            <p>{t("whyExistsPara2")}</p>
            <p>{t("whyExistsPara3")}</p>
          </div>
        </section>

        {/* ── Who built it ── */}
        <section className="mb-12 bg-surface border border-border rounded-lg px-8 py-7">
          <h2 className="font-display text-2xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("whoBuiltHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75] mb-4">
            {t.rich("whoBuiltPara1", {
              strong: (chunks) => (
                <strong className="text-heading font-semibold">{chunks}</strong>
              ),
            })}
          </p>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("whoBuiltPara2")}
          </p>
        </section>

        {/* ── How data is maintained ── */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("dataMaintenanceHeading")}
          </h2>
          <div className="font-body text-[0.9375rem] text-text-primary leading-[1.75] flex flex-col gap-4">
            <p>{t("dataMaintenancePara1")}</p>
            <p>{t("dataMaintenancePara2")}</p>
          </div>
        </section>

        {/* ── Report a change CTA ── */}
        <section className="mb-12 bg-accent-subtle border border-[#bfdbfe] rounded-lg px-8 py-7">
          <h2 className="font-display text-[1.375rem] font-normal text-heading mb-2.5 tracking-[-0.01em]">
            {t("seenChangeHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.7] mb-5">
            {t("seenChangePara")}
          </p>
          <a
            href={NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="about-gh-btn"
          >
            {/* GitHub mark icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {t("openIssueBtn")}
          </a>

          <p className="font-body text-[0.8125rem] text-text-secondary mt-3 leading-[1.5]">
            {t("githubNote")}{" "}
            <a
              href={`${GITHUB_REPO}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {t("openIssues")}
            </a>{" "}
            {t("or")}{" "}
            <a
              href={`${GITHUB_REPO}/tree/main/data/providers`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {t("providerDataFiles")}
            </a>{" "}
            {t("directly")}
          </p>
        </section>

        {/* ── What this is not ── */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("whatIsNotHeading")}
          </h2>
          <ul className="font-body text-[0.9375rem] text-text-primary leading-[1.75] pl-5 flex flex-col gap-2">
            <li>
              <strong className="font-semibold">{t("notLegalAdviceTitle")}</strong>{" "}
              {t("notLegalAdviceBody")}
            </li>
            <li>
              <strong className="font-semibold">{t("notPaidTitle")}</strong>{" "}
              {t("notPaidBody")}
            </li>
            <li>
              <strong className="font-semibold">{t("notCurrentTitle")}</strong>{" "}
              {t("notCurrentBody")}
            </li>
          </ul>
        </section>

        {/* ── Back link ── */}
        <div className="pt-2">
          <Link
            href="/"
            className="font-body text-sm font-medium text-link underline underline-offset-[3px]"
          >
            {t("backLink")}
          </Link>
        </div>
      </main>
    </>
  );
}
