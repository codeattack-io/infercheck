// Privacy Policy (Datenschutzerklärung) page.
// The German version is legally binding (Gerichtsstand Köln).
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
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/privacy`,
      languages: {
        "en": "https://infercheck.eu/en/privacy",
        "de": "https://infercheck.eu/de/privacy",
        "x-default": "https://infercheck.eu/de/privacy",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PrivacyPage");

  // next-intl returns raw arrays from JSON — cast for iteration
  const rightsList = t.raw("rightsList") as string[];

  return (
    <>
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 pb-24">
        {/* ── Page heading ── */}
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)] font-normal text-heading leading-[1.15] mb-3 tracking-[-0.02em]">
          {t("heading")}
        </h1>

        <p className="font-body text-[0.8125rem] text-text-muted leading-[1.5] mb-2">
          {t("lastUpdated")}
        </p>

        {/* ── Legal binding note ── */}
        <p className="font-body text-[0.9375rem] text-text-secondary leading-[1.65] mb-10">
          {t.rich("legalNote", {
            german: (chunks) =>
              locale === "en" ? (
                <Link
                  href="/privacy"
                  locale="de"
                  className="text-link underline underline-offset-[3px]"
                >
                  {chunks}
                </Link>
              ) : (
                <strong className="text-heading font-semibold">{chunks}</strong>
              ),
          })}
        </p>

        {/* ── Divider ── */}
        <hr className="border-none border-t border-border mb-10" />

        {/* ── 1. Overview ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("introHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("introText")}
          </p>
        </section>

        {/* ── 2. Controller ── */}
        <section className="mb-10 bg-surface border border-border rounded-lg px-8 py-7">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("controllerHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-secondary leading-[1.65] mb-4">
            {t("controllerText")}
          </p>
          <address className="not-italic font-body text-[0.9375rem] text-text-primary leading-[1.9]">
            <span className="font-semibold text-heading">{t("controllerName")}</span>
            <br />
            {t("controllerAddress")}
            <br />
            <a
              href={`mailto:${t("controllerEmail")}`}
              className="text-link underline underline-offset-[3px]"
            >
              {t("controllerEmail")}
            </a>
          </address>
        </section>

        {/* ── 3. Hosting ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("hostingHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t.rich("hostingText", {
              link: (chunks) => (
                <a
                  href={`https://${chunks}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link underline underline-offset-[3px] break-all"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        {/* ── 4. Analytics ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("analyticsHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("analyticsText")}
          </p>
        </section>

        {/* ── 5. Database ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("databaseHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t.rich("databaseText", {
              link: (chunks) => (
                <a
                  href={`https://${chunks}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link underline underline-offset-[3px] break-all"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        {/* ── 6. GitHub ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("githubHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t.rich("githubText", {
              link: (chunks) => (
                <a
                  href={`https://${chunks}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link underline underline-offset-[3px] break-all"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        {/* ── 7. Error Tracking (GlitchTip) ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("errorTrackingHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t.rich("errorTrackingText", {
              link: (chunks) => (
                <a
                  href={`https://${chunks}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link underline underline-offset-[3px] break-all"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        {/* ── 8. Your rights ── */}
        <section className="mb-10 bg-surface border border-border rounded-lg px-8 py-7">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("rightsHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75] mb-4">
            {t("rightsText")}
          </p>
          <ul className="font-body text-[0.9375rem] text-text-primary leading-[1.75] pl-5 flex flex-col gap-1 mb-5 list-disc">
            {rightsList.map((right, i) => (
              <li key={i}>{right}</li>
            ))}
          </ul>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75] mb-3">
            {t("rightsContact")}
          </p>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("supervisoryAuthority")},{" "}
            <a
              href={`https://${t("supervisoryLink")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link underline underline-offset-[3px]"
            >
              {t("supervisoryLink")}
            </a>
          </p>
        </section>

        {/* ── 9. Cookies ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("cookiesHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("cookiesText")}
          </p>
        </section>

        {/* ── 10. Changes ── */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("changesHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("changesText")}
          </p>
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
