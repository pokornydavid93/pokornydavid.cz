import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import LenisProvider from "./components/Providers/LenisProvider";
import { ViewportProvider } from "./components/Providers/ViewportProvider";
import { LeadFormModalProvider } from "./components/Providers/LeadFormModalProvider";
import { GoogleAnalytics } from "@next/third-parties/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "David Pokorný – finanční plánování bez nátlaku",
    template: "%s | David Pokorný",
  },
  description:
    "Finanční plánování, investice a ochrana příjmu. Srozumitelně, bez nátlaku a s dlouhodobým plánem. První krok je nezávazná konzultace.",
  applicationName: "David Pokorný",
  metadataBase: new URL("https://pokornydavid.cz"),

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
  },

  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: "https://pokornydavid.cz",
    title: "David Pokorný – finanční plánování bez nátlaku",
    description:
      "Pomáhám lidem mít jasno ve financích. Bez tlaku, bez produktových triků. Finanční plán, který dává smysl.",
    siteName: "David Pokorný",
    images: [
      {
        url: "/about.jpg",
        width: 1200,
        height: 630,
        alt: "David Pokorný – finanční plánování",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "David Pokorný – finanční plánování bez nátlaku",
    description:
      "Finanční plánování bez nátlaku. Jasně, srozumitelně a dlouhodobě.",
    images: ["/about.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const BASE = "https://pokornydavid.cz";

  // ✅ SAFE JSON-LD:
  // - žádné review/rating schema (danger zone)
  // - žádné zásahy do textů referencí
  // - jasné propojení entit přes @id
  const schemaLd = {
    "@context": "https://schema.org",
    "@graph": [
      // 1) Person
      {
        "@type": "Person",
        "@id": `${BASE}/#person`,
        name: "David Pokorný",
        jobTitle: "Finanční poradce",
        url: BASE,
        sameAs: [],
        email: "info@pokornydavid.cz",
        telephone: "+420731830897",
      },

      // 2) WebSite
      {
        "@type": "WebSite",
        "@id": `${BASE}/#website`,
        url: BASE,
        name: "David Pokorný – Finanční plánování",
        inLanguage: "cs-CZ",
        publisher: { "@id": `${BASE}/#person` },
      },

      // 3) WebPage (homepage)
      {
        "@type": "WebPage",
        "@id": `${BASE}/#webpage`,
        url: BASE,
        name: "David Pokorný – finanční plánování bez nátlaku",
        isPartOf: { "@id": `${BASE}/#website` },
        about: { "@id": `${BASE}/#person` },
        inLanguage: "cs-CZ",
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${BASE}/about.jpg`,
        },
      },

      // 4) Business entity (FinancialService + LocalBusiness)
      {
        "@type": ["FinancialService", "LocalBusiness"],
        "@id": `${BASE}/#business`,
        name: "David Pokorný – Finanční plánování",
        url: BASE,
        areaServed: "CZ",
        inLanguage: "cs-CZ",
        provider: { "@id": `${BASE}/#person` },
        image: `${BASE}/about.jpg`,
        email: "info@pokornydavid.cz",
        telephone: "+420731830897",
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
            <LeadFormModalProvider>{children}</LeadFormModalProvider>
          </ViewportProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
