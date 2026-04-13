import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import Script from "next/script";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Layout" });

  return {
    title: {
      template: t("titleTemplate"),
      default: t("titleDefault"),
    },
    description: t("description"),
    metadataBase: new URL("https://infercheck.eu"),
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
    },
    openGraph: {
      siteName: "InferCheck",
      type: "website",
      images: [
        {
          url: `/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/${locale}/opengraph-image`],
    },
  };
}

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
        <Script
          defer
          async
          src="/stats/script.js"
          data-website-id="45d43a7e-5487-4432-aa71-ddc00d51f9bc"
          data-domains="infercheck.eu"
        />
      </body>
    </html>
  );
}
