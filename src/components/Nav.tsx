"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/", label: "Models" },
  { href: "/providers", label: "Providers" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Show border on scroll — rerender-dependencies: use primitive in effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    // Use passive listener for scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: scrolled ? "rgba(245, 244, 239, 0.92)" : "var(--color-bg)",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          borderBottom: scrolled ? "1px solid var(--color-border)" : "1px solid transparent",
          transition: "border-color 150ms ease, backdrop-filter 150ms ease",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 40px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="px-4 sm:px-6 lg:px-10"
        >
          {/* Wordmark */}
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.125rem",
              color: "var(--color-heading)",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            GDPR AI Directory
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden sm:flex" style={{ gap: "28px" }}>
            {NAV_LINKS.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    textDecoration: isActive ? "underline" : "none",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button
            className="sm:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              color: "var(--color-text-primary)",
            }}
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
        <div
          className="sm:hidden"
          style={{
            position: "fixed",
            top: "56px",
            right: 0,
            bottom: 0,
            width: "240px",
            backgroundColor: "var(--color-surface)",
            borderLeft: "1px solid var(--color-border)",
            padding: "24px",
            zIndex: 49,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.9375rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  textDecoration: "none",
                  padding: "10px 12px",
                  borderRadius: "4px",
                  backgroundColor: isActive ? "var(--color-surface-alt)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Mobile overlay */}
      {mobileOpen ? (
        <div
          className="sm:hidden"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            top: "56px",
            backgroundColor: "rgba(0,0,0,0.2)",
            zIndex: 48,
          }}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
