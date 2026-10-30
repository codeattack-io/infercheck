import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LongformPage, LongformSection, LONGFORM_LINK_CLASS } from "@/components/Longform";

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
  const rightsList = t.raw("rightsList") as string[];
  const domainLink = (chunks: ReactNode) => (
    <a
      href={`https://${chunks}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${LONGFORM_LINK_CLASS} wrap-anywhere`}
    >
      {chunks}
    </a>
  );

  return (
    <LongformPage heading={t("heading")}>
      <p className="text-14 text-text-muted">{t("lastUpdated")}</p>

      <p>
        {t.rich("legalNote", {
          german: (chunks) =>
            locale === "en" ? (
              <Link href="/privacy" locale="de" className={LONGFORM_LINK_CLASS}>
                {chunks}
              </Link>
            ) : (
              <strong className="font-semibold text-text-primary">{chunks}</strong>
            ),
        })}
      </p>

      <LongformSection heading={t("introHeading")}>
        <p>{t("introText")}</p>
      </LongformSection>

      <LongformSection heading={t("controllerHeading")}>
        <p>{t("controllerText")}</p>
        <address className="not-italic">
          <span className="font-semibold text-text-primary">{t("controllerName")}</span>
          <br />
          {t("controllerAddress")}
          <br />
          <a href={`mailto:${t("controllerEmail")}`} className={LONGFORM_LINK_CLASS}>
            {t("controllerEmail")}
          </a>
        </address>
      </LongformSection>

      <LongformSection heading={t("hostingHeading")}>
        <p>{t.rich("hostingText", { link: domainLink })}</p>
      </LongformSection>

      <LongformSection heading={t("analyticsHeading")}>
        <p>{t("analyticsText")}</p>
      </LongformSection>

      <LongformSection heading={t("databaseHeading")}>
        <p>{t.rich("databaseText", { link: domainLink })}</p>
      </LongformSection>

      <LongformSection heading={t("githubHeading")}>
        <p>{t.rich("githubText", { link: domainLink })}</p>
      </LongformSection>

      <LongformSection heading={t("errorTrackingHeading")}>
        <p>{t.rich("errorTrackingText", { link: domainLink })}</p>
      </LongformSection>

      <LongformSection heading={t("rightsHeading")}>
        <p>{t("rightsText")}</p>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
          {rightsList.map((right) => (
            <li key={right}>{right}</li>
          ))}
        </ul>
        <p>{t("rightsContact")}</p>
        <p>
          {t("supervisoryAuthority")},{" "}
          <a
            href={`https://${t("supervisoryLink")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={LONGFORM_LINK_CLASS}
          >
            {t("supervisoryLink")}
          </a>
        </p>
      </LongformSection>

      <LongformSection heading={t("cookiesHeading")}>
        <p>{t("cookiesText")}</p>
      </LongformSection>

      <LongformSection heading={t("changesHeading")}>
        <p>{t("changesText")}</p>
      </LongformSection>
    </LongformPage>
  );
}
