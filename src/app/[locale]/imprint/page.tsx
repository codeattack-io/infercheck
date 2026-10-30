import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LongformPage, LongformSection, LONGFORM_LINK_CLASS } from "@/components/Longform";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ImprintPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://infercheck.eu/${locale}/imprint`,
      languages: {
        en: "https://infercheck.eu/en/imprint",
        de: "https://infercheck.eu/de/imprint",
        "x-default": "https://infercheck.eu/de/imprint",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

export default async function ImprintPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ImprintPage");

  return (
    <LongformPage heading={t("heading")}>
      <p>
        {t.rich("legalNote", {
          german: (chunks) =>
            locale === "en" ? (
              <Link href="/imprint" locale="de" className={LONGFORM_LINK_CLASS}>
                {chunks}
              </Link>
            ) : (
              <strong className="font-semibold text-text-primary">{chunks}</strong>
            ),
        })}
      </p>

      <LongformSection heading={t("operatorHeading")}>
        <address className="not-italic">
          <span className="font-semibold text-text-primary">{t("name")}</span>
          <br />
          {t("address")}
          <br />
          {t("city")}
        </address>
      </LongformSection>

      <LongformSection heading={t("contactHeading")}>
        <p>
          {t("emailLabel")}:{" "}
          <a href={`mailto:${t("email")}`} className={LONGFORM_LINK_CLASS}>
            {t("email")}
          </a>
        </p>
      </LongformSection>

      <LongformSection heading={t("responsibleHeading")}>
        <p>{t("responsibleText")}</p>
      </LongformSection>

      <LongformSection heading={t("disputeHeading")}>
        <p>
          {t.rich("disputeText", {
            link: (chunks) => (
              <a
                href={String(chunks)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${LONGFORM_LINK_CLASS} wrap-anywhere`}
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </LongformSection>

      <LongformSection heading={t("liabilityContentHeading")}>
        <p>{t("liabilityContentText")}</p>
      </LongformSection>

      <LongformSection heading={t("liabilityLinksHeading")}>
        <p>{t("liabilityLinksText")}</p>
      </LongformSection>

      <LongformSection heading={t("copyrightHeading")}>
        <p>{t("copyrightText")}</p>
      </LongformSection>
    </LongformPage>
  );
}
