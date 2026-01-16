import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import LenisProvider from "./components/Providers/LenisProvider";
import { ViewportProvider } from "./components/Providers/ViewportProvider";
import { LeadFormModalProvider } from "./components/Providers/LeadFormModalProvider";
import LegalScrollRestoreProvider from "./components/Providers/LegalScrollRestoreProvider";
import { GoogleAnalytics } from "@next/third-parties/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const BASE = "https://pokornydavid.cz/";
const OG_IMAGE = "/og.jpg"; // 1200x630 (doporučuju vyrobit)

export const metadata: Metadata = {
  metadataBase: new URL(BASE),

  title: {
    default: "Finanční plánování bez nátlaku (Olomouc) | David Pokorný",
    template: "%s | David Pokorný",
  },

  description:
    "Finanční plánování bez nátlaku (Olomouc). Investice, hypotéky a ochrana příjmu. Jasný plán krok za krokem. Nezávazná konzultace.",

  applicationName: "David Pokorný",

  alternates: {
    canonical: BASE,
  },

  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: BASE,
    siteName: "David Pokorný",
    title: "Finanční plánování bez nátlaku (Olomouc) | David Pokorný",
    description:
      "Srozumitelné finanční plánování bez nátlaku. Investice, hypotéky a ochrana příjmu. První krok: nezávazná konzultace.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Finanční plánování bez nátlaku | David Pokorný",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Finanční plánování bez nátlaku (Olomouc) | David Pokorný",
    description:
      "Srozumitelné finanční plánování bez nátlaku. Investice, hypotéky a ochrana příjmu. Nezávazná konzultace.",
    images: [OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemaLd = {
    "@context": "https://schema.org",
    "@graph": [
      // 1) Person
      {
        "@type": "Person",
        "@id": `${BASE}#person`,
        name: "David Pokorný",
        jobTitle: "Finanční plánování",
        url: BASE,
        sameAs: [],
        email: "info@pokornydavid.cz",
        telephone: "+420731830897",
      },

      // 2) WebSite (+ SearchAction)
      {
        "@type": "WebSite",
        "@id": `${BASE}#website`,
        url: BASE,
        name: "David Pokorný – Finanční plánování",
        inLanguage: "cs-CZ",
        publisher: { "@id": `${BASE}#person` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${BASE}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },

      // 3) WebPage (homepage)
      {
        "@type": "WebPage",
        "@id": `${BASE}#webpage`,
        url: BASE,
        name: "Finanční plánování bez nátlaku (Olomouc)",
        isPartOf: { "@id": `${BASE}#website` },
        about: { "@id": `${BASE}#person` },
        inLanguage: "cs-CZ",
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${BASE.replace(/\/$/, "")}${OG_IMAGE}`,
        },
      },

      // 4) Business entity
      {
        "@type": ["FinancialService", "LocalBusiness"],
        "@id": `${BASE}#business`,
        name: "David Pokorný – Finanční plánování",
        url: BASE,
        inLanguage: "cs-CZ",
        provider: { "@id": `${BASE}#person` },
        image: `${BASE.replace(/\/$/, "")}${OG_IMAGE}`,
        email: "info@pokornydavid.cz",
        telephone: "+420731830897",
        priceRange: "$$",
        areaServed: {
          "@type": "Country",
          name: "Czechia",
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: "Tovární 1197/42a",
          addressLocality: "Olomouc",
          postalCode: "779 00",
          addressCountry: "CZ",
        },
      },
    ],
  };

  return (
    <html lang="cs">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaLd) }}
        />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="supported-color-schemes" content="light" />
      </head>

      <body className={`${dmSans.className} antialiased`}>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />

        <LenisProvider minWidth={1024}>
          <ViewportProvider>
            <LeadFormModalProvider>
              <LegalScrollRestoreProvider>{children}</LegalScrollRestoreProvider>
            </LeadFormModalProvider>
          </ViewportProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
