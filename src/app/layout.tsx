// TODO(i18n): When adding next-intl, wrap this layout with NextIntlClientProvider,
// move it under src/app/[locale]/layout.tsx, and set lang={locale} dynamically.
// All UI strings should be extracted to messages/{locale}.json at that point.

import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// next/font/google: fonts are self-hosted at build time — no external requests,
// no layout shift, automatic font-display:swap.
const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s — GDPR AI Directory",
    default: "GDPR AI Directory — EU-compliant AI inference providers",
  },
  description:
    "A neutral, sourced directory of AI inference providers tagged by GDPR compliance status. Filter by EU data residency, DPA availability, training opt-out, and more.",
  metadataBase: new URL("https://gdpr-ai.directory"),
  openGraph: {
    siteName: "GDPR AI Directory",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
