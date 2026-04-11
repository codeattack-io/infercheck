"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("LanguageSwitcher");

  const handleChange = (next: string) => {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("ariaLabel")}>
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          aria-current={l === locale ? "true" : undefined}
          className="font-body text-xs font-medium px-2 py-1 rounded transition-colors"
          style={{
            color: l === locale ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            backgroundColor: l === locale ? "var(--color-surface-alt)" : "transparent",
            border: "1px solid",
            borderColor: l === locale ? "var(--color-border)" : "transparent",
            cursor: l === locale ? "default" : "pointer",
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
