import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

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
    template: "%s — InferCheck",
    default: "InferCheck — Find GDPR-compliant AI inference providers",
  },
  description:
    "A neutral, sourced directory of AI inference providers tagged by GDPR compliance status. Filter by EU data residency, DPA availability, training opt-out, and more.",
  metadataBase: new URL("https://infercheck.eu"),
  openGraph: {
    siteName: "InferCheck",
    type: "website",
  },
};

// Required for static rendering with next-intl v4:
// tells Next.js which locale segments exist at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // params is a Promise in Next.js 16
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Guard against invalid locale segments (e.g. /xx/page)
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // setRequestLocale must be called before any next-intl hooks — enables static rendering.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${instrumentSerif.variable} ${dmSans.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body
        className="min-h-full flex flex-col antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <Nav />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
