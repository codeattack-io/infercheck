"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useUrlSearchParams } from "@/lib/url-state";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useUrlSearchParams();
  const t = useTranslations("LanguageSwitcher");

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`} role="group" aria-label={t("ariaLabel")}>
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={{ pathname, query: Object.fromEntries(searchParams) }}
          locale={l}
          hrefLang={l}
          replace
          aria-current={l === locale ? "true" : undefined}
          className="rounded-tab border border-transparent px-2 py-1 text-13 text-text-muted no-underline transition-colors duration-100 ease-out hover:text-text-primary aria-[current=true]:border-border aria-[current=true]:bg-surface-alt aria-[current=true]:text-text-primary"
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
