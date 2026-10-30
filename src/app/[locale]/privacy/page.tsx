// Privacy Policy (Datenschutzerklärung) page.
// The German version is legally binding (Gerichtsstand Köln).
// React Server Component — no client-side data needed.

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/privacy`,
      languages: {
        en: "https://infercheck.eu/en/privacy",
        de: "https://infercheck.eu/de/privacy",
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

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PrivacyPage");

  // next-intl returns raw arrays from JSON — cast for iteration
  const rightsList = t.raw("rightsList") as string[];

  return (
    <>
      <main className="page-width flex-1 pt-14 pb-24">
        <h1 className="mb-3">{t("heading")}</h1>

        <p className="font-body text-[0.8125rem] text-text-muted leading-[1.5] mb-2">{t("lastUpdated")}</p>

        <p className="font-body text-[0.9375rem] text-text-secondary leading-[1.65] mb-10">
          {t.rich("legalNote", {
            german: (chunks) =>
              locale === "en" ? (
                <Link href="/privacy" locale="de" className="text-link underline underline-offset-[3px]">
                  {chunks}
                </Link>
              ) : (
                <strong className="text-heading font-semibold">{chunks}</strong>
              ),
          })}
        </p>

        <hr className="border-none border-t border-border mb-10" />

        <section className="mb-10">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("introHeading")}</h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">{t("introText")}</p>
        </section>

        <section className="mb-10 bg-surface border border-border rounded-card px-8 py-7">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("controllerHeading")}</h2>
          <p className="font-body text-[0.9375rem] text-text-secondary leading-[1.65] mb-4">{t("controllerText")}</p>
          <address className="not-italic font-body text-[0.9375rem] text-text-primary leading-[1.9]">
            <span className="font-semibold text-heading">{t("controllerName")}</span>
            <br />
            {t("controllerAddress")}
            <br />
            <a href={`mailto:${t("controllerEmail")}`} className="text-link underline underline-offset-[3px]">
              {t("controllerEmail")}
            </a>
          </address>
        </section>

        <section className="mb-10">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("hostingHeading")}</h2>
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

        <section className="mb-10">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("analyticsHeading")}</h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">{t("analyticsText")}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("databaseHeading")}</h2>
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

        <section className="mb-10">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("githubHeading")}</h2>
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

        <section className="mb-10">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("errorTrackingHeading")}</h2>
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

        <section className="mb-10 bg-surface border border-border rounded-card px-8 py-7">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("rightsHeading")}</h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75] mb-4">{t("rightsText")}</p>
          <ul className="font-body text-[0.9375rem] text-text-primary leading-[1.75] pl-5 flex flex-col gap-1 mb-5 list-disc">
            {rightsList.map((right, i) => (
              <li key={i}>{right}</li>
            ))}
          </ul>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75] mb-3">{t("rightsContact")}</p>
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

        <section className="mb-10">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("cookiesHeading")}</h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">{t("cookiesText")}</p>
        </section>

        <section className="mb-12">
          <h2 className="text-20 font-semibold text-text-primary mb-4">{t("changesHeading")}</h2>
          <p className="font-body text-[0.9375rem] text-text-primary leading-[1.75]">{t("changesText")}</p>
        </section>

        <div className="pt-2">
          <Link href="/" className="font-body text-sm font-medium text-link underline underline-offset-[3px]">
            {t("backLink")}
          </Link>
        </div>
      </main>
    </>
  );
}
