"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function Nav() {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 8,
    () => false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("Nav");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  const NAV_LINKS = [
    { href: "/", label: t("links.models"), section: "/model/" },
    { href: "/providers", label: t("links.providers"), section: "/provider/" },
    { href: "/about", label: t("links.about"), section: "/about" },
  ];
  const isCurrent = (link: (typeof NAV_LINKS)[number]) =>
    pathname === link.href || pathname.startsWith(link.section) || pathname.startsWith(`${link.href}/`);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) {
      if (wasOpen.current) toggleRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const background = document.querySelectorAll<HTMLElement>("main, footer");
    background.forEach((el) => (el.inert = true));
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 48rem)");
    const handleDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleDesktop);
    return () => {
      background.forEach((el) => (el.inert = false));
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleDesktop);
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        data-scrolled={scrolled ? "" : undefined}
        className="sticky top-0 z-50 h-14 border-b border-transparent transition-[background-color,border-color] duration-150 ease-out data-scrolled:border-border data-scrolled:bg-bg/85 data-scrolled:backdrop-blur-sm md:h-15"
      >
        <div className="page-width flex h-full items-center justify-between">
          <Link
            href="/"
            aria-label={t("wordmark")}
            className="inline-flex items-center gap-2.5 text-18 font-semibold text-text-primary no-underline"
          >
            <Image
              src="/logos/infercheck/icon-color.svg"
              alt=""
              width={26}
              height={26}
              loading="eager"
              className="block size-[26px]"
            />
            <span aria-hidden="true">
              Infer<span className="text-accent">Check</span>
            </span>
          </Link>

          <div className="hidden items-center md:flex">
            <nav aria-label={t("mainNavigation")} className="flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent(link) ? "page" : undefined}
                  className="text-15 leading-[1.4] text-text-secondary no-underline hover:text-text-primary aria-[current=page]:text-text-primary aria-[current=page]:underline aria-[current=page]:underline-offset-[0.35em]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <LanguageSwitcher className="ml-3" />
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="-mr-2 cursor-pointer rounded-button border-none bg-transparent p-2 text-text-primary md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? t("menuClose") : t("menuOpen")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="block size-6"
              aria-hidden="true"
            >
              <path d={mobileOpen ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <nav
          id="mobile-drawer"
          ref={drawerRef}
          aria-label={t("mobileNavigation")}
          className="fixed top-14 right-0 bottom-0 z-[49] flex w-64 flex-col gap-1 border-l border-border bg-surface p-4 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link) ? "page" : undefined}
              className="rounded-tab px-3 py-2.5 text-16 text-text-secondary no-underline aria-[current=page]:bg-surface-alt aria-[current=page]:font-medium aria-[current=page]:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-auto border-t border-border pt-4">
            <LanguageSwitcher />
          </div>
        </nav>
      ) : null}

      {mobileOpen ? (
        <div
          className="fixed inset-0 top-14 z-[48] bg-text-primary/20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
