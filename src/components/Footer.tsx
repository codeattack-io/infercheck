import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#";

const LINK_CLASS = "text-text-muted underline underline-offset-[0.15em] hover:text-text-secondary";

function Separator() {
  return <span aria-hidden="true">·</span>;
}

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="page-width mt-auto pt-9 pb-10 text-15 text-text-muted md:pt-12 md:text-14">
      <p role="note" className="m-0 mb-3 max-w-[72ch] text-pretty">
        {t("disclaimer")}
      </p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span>
          {t("license")}{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {t("licenseName")}
          </a>
        </span>
        <Separator />
        <span>
          {t("codeLicense")}{" "}
          <a href={`${GITHUB_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {t("codeLicenseName")}
          </a>
        </span>
        <Separator />
        <nav aria-label={t("navLabel")} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Link href="/about" className={LINK_CLASS}>
            {t("nav.about")}
          </Link>
          <Separator />
          <Link href="/imprint" className={LINK_CLASS}>
            {t("nav.imprint")}
          </Link>
          <Separator />
          <Link href="/privacy" className={LINK_CLASS}>
            {t("nav.privacy")}
          </Link>
          <Separator />
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {t("nav.github")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
