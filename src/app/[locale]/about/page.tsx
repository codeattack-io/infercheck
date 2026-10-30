import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LongformPage, LongformSection, LONGFORM_LINK_CLASS } from "@/components/Longform";
import { buttonClass } from "@/lib/styles";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/about`,
      languages: {
        en: "https://infercheck.eu/en/about",
        de: "https://infercheck.eu/de/about",
        "x-default": "https://infercheck.eu/en/about",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#";
const NEW_ISSUE_URL = `${GITHUB_REPO}/issues/new?template=report-change.yml`;

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AboutPage");
  const strong = (chunks: ReactNode) => <strong className="font-semibold text-text-primary">{chunks}</strong>;

  return (
    <LongformPage heading={t("heading")}>
      <p>{t("subtitle")}</p>

      <LongformSection heading={t("whyExistsHeading")}>
        <p>{t("whyExistsPara1")}</p>
        <p>{t("whyExistsPara2")}</p>
        <p>{t("whyExistsPara3")}</p>
      </LongformSection>

      <LongformSection heading={t("whoBuiltHeading")}>
        <p>{t.rich("whoBuiltPara1", { strong })}</p>
        <p>{t("whoBuiltPara2")}</p>
      </LongformSection>

      <LongformSection heading={t("dataMaintenanceHeading")}>
        <p>{t("dataMaintenancePara1")}</p>
        <p>{t("dataMaintenancePara2")}</p>
      </LongformSection>

      <LongformSection heading={t("seenChangeHeading")}>
        <p>{t("seenChangePara")}</p>
        <p>
          <a href={NEW_ISSUE_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {t("openIssueBtn")}
          </a>
        </p>
        <p>
          {t("githubNote")}{" "}
          <a href={`${GITHUB_REPO}/issues`} target="_blank" rel="noopener noreferrer" className={LONGFORM_LINK_CLASS}>
            {t("openIssues")}
          </a>{" "}
          {t("or")}{" "}
          <a
            href={`${GITHUB_REPO}/tree/main/data/providers`}
            target="_blank"
            rel="noopener noreferrer"
            className={LONGFORM_LINK_CLASS}
          >
            {t("providerDataFiles")}
          </a>{" "}
          {t("directly")}
        </p>
      </LongformSection>

      <LongformSection heading={t("whatIsNotHeading")}>
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
          <li>
            {strong(t("notLegalAdviceTitle"))} {t("notLegalAdviceBody")}
          </li>
          <li>
            {strong(t("notPaidTitle"))} {t("notPaidBody")}
          </li>
          <li>
            {strong(t("notCurrentTitle"))} {t("notCurrentBody")}
          </li>
        </ul>
      </LongformSection>
    </LongformPage>
  );
}
