import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { codeAttackLinks } from "@/lib/codeattack";

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#";

const LINK_CLASS = "text-text-muted underline underline-offset-[0.15em] hover:text-text-secondary";

function Separator({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className}>
      ·
    </span>
  );
}

export async function Footer() {
  const t = await getTranslations("Footer");
  const codeAttack = codeAttackLinks(await getLocale());

  return (
    <footer className="page-width mt-auto pt-9 pb-10 text-15 text-text-muted md:pt-12 md:text-14">
      <p role="note" className="m-0 mb-3 max-w-[72ch] text-pretty">
        {t("disclaimer")}
      </p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="max-md:w-full">
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
        <Separator className="max-md:hidden" />
        <span className="max-md:w-full">
          {t("codeLicense")}{" "}
          <a href={`${GITHUB_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {t("codeLicenseName")}
          </a>
        </span>
        <Separator className="max-md:hidden" />
        <span className="max-md:w-full">
          {t.rich("projectBy", {
            link: (chunks) => (
              <a href={codeAttack.home} target="_blank" rel="noopener" className={LINK_CLASS}>
                {chunks}
              </a>
            ),
          })}
        </span>
        <Separator className="max-lg:hidden" />
        <nav aria-label={t("navLabel")} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 max-lg:w-full">
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
