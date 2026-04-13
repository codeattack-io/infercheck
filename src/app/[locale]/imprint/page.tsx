// Imprint (Impressum) page — legally required for German-operated websites (§ 5 TMG).
// The German version is legally binding; English is a convenience translation.
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
  const t = await getTranslations({ locale, namespace: "ImprintPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/imprint`,
      languages: {
        "en": "https://infercheck.eu/en/imprint",
        "de": "https://infercheck.eu/de/imprint",
        "x-default": "https://infercheck.eu/de/imprint",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ImprintPage");

  return (
    <>
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 pb-24">
        {/* ── Page heading ── */}
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)] font-normal text-heading leading-[1.15] mb-3 tracking-[-0.02em]">
          {t("heading")}
        </h1>

        {/* ── Legal binding note ── */}
        <p className="font-body text-[0.9375rem] text-text-secondary leading-[1.65] mb-10">
          {t.rich("legalNote", {
            german: (chunks) =>
              locale === "en" ? (
                <Link
                  href="/imprint"
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

        {/* ── Operator ── */}
        <section className="mb-10 bg-surface border border-border rounded-lg px-8 py-7">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("operatorHeading")}
          </h2>
          <address className="not-italic font-body text-[0.9375rem] text-text-primary leading-[1.9]">
            <span className="font-semibold text-heading">{t("name")}</span>
            <br />
            {t("address")}
            <br />
            {t("city")}
          </address>
        </section>

        {/* ── Contact ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("contactHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("emailLabel")}:{" "}
            <a
              href={`mailto:${t("email")}`}
              className="text-link underline underline-offset-[3px]"
            >
              {t("email")}
            </a>
          </p>
        </section>

        {/* ── Responsible for content ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("responsibleHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("responsibleText")}
          </p>
        </section>

        {/* ── EU Dispute resolution ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("disputeHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t.rich("disputeText", {
              link: (chunks) => (
                <a
                  href={String(chunks)}
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

        {/* ── Liability for content ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("liabilityContentHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("liabilityContentText")}
          </p>
        </section>

        {/* ── Liability for links ── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("liabilityLinksHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("liabilityLinksText")}
          </p>
        </section>

        {/* ── Copyright ── */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-normal text-heading mb-4 tracking-[-0.01em]">
            {t("copyrightHeading")}
          </h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">
            {t("copyrightText")}
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
