"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("Nav");

  const NAV_LINKS = [
    { href: "/", label: t("links.models") },
    { href: "/providers", label: t("links.providers") },
    { href: "/about", label: t("links.about") },
  ];

  // Show border on scroll — rerender-dependencies: use primitive in effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    // Use passive listener for scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change.
  // Synchronising component state to an external system (the router) is a
  // valid effect use-case; the lint rule is suppressed intentionally here.
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMobileOpen(false);
    }
  }, [pathname]);

  return (
    <>
      {/* backgroundColor and backdropFilter depend on scroll state — kept as style */}
      <header
        className="sticky top-0 z-50 transition-[border-color,backdrop-filter] duration-150 ease-in-out border-b"
        style={{
          backgroundColor: scrolled ? "rgba(245, 244, 239, 0.92)" : "var(--color-bg)",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          borderBottomColor: scrolled ? "var(--color-border)" : "transparent",
        }}
      >
        <div className="max-w-[1200px] mx-auto h-14 flex items-center justify-between px-4 sm:px-6 lg:px-10">
          {/* Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2 no-underline"
            aria-label={t("wordmark")}
          >
            {/* Favicon icon — 24 px, matches the favicon.svg design */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              width="24"
              height="24"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="0" y="0" width="32" height="32" rx="7" ry="7" fill="#1d4ed8" />
              <circle cx="13" cy="13" r="8" fill="none" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="19" y1="19" x2="25" y2="25" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              <polyline
                points="9,13 12,17 18,8"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* "Infer" in heading colour, "Check" in accent blue */}
            <span className="font-body text-[1.0625rem] font-semibold tracking-[-0.02em] leading-none">
              <span style={{ color: "var(--color-text-primary)" }}>Infer</span>
              <span style={{ color: "#1d4ed8" }}>Check</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-7">
            {NAV_LINKS.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-body text-sm font-medium"
                  style={{
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    textDecoration: isActive ? "underline" : "none",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <LanguageSwitcher />
          </nav>

          {/* Mobile menu button */}
          <button
            className="sm:hidden bg-transparent border-none cursor-pointer p-2 text-text-primary"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? t("menuClose") : t("menuOpen")}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 5H16M2 9H16M2 13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="sm:hidden fixed top-14 right-0 bottom-0 w-60 bg-surface border-l border-border p-6 z-[49] flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-[0.9375rem] no-underline px-3 py-[10px] rounded"
                style={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  backgroundColor: isActive ? "var(--color-surface-alt)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="mt-auto pt-4 border-t border-border">
            <LanguageSwitcher />
          </div>
        </div>
      ) : null}

      {/* Mobile overlay */}
      {mobileOpen ? (
        <div
          className="sm:hidden fixed inset-0 top-14 bg-black/20 z-[48]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
