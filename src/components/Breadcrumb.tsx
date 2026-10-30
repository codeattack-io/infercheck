import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface BreadcrumbProps {
  /** Links to the pages above the current one. */
  trail: { href: string; label: string }[];
  current: string;
}

export function Breadcrumb({ trail, current }: BreadcrumbProps) {
  const t = useTranslations("Breadcrumb");

  return (
    <nav aria-label={t("label")}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-14 text-text-muted">
        {trail.map((item) => (
          <Fragment key={item.href}>
            <li>
              <Link
                href={item.href}
                className="text-text-muted underline underline-offset-[0.15em] transition-colors duration-100 ease-out hover:text-text-primary"
              >
                {item.label}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
          </Fragment>
        ))}
        <li aria-current="page" className="min-w-0 [overflow-wrap:anywhere]">
          {current}
        </li>
      </ol>
    </nav>
  );
}
