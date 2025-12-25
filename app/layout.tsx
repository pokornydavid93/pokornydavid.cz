import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ViewportProvider } from "./components/Providers/ViewportProvider";
import { LeadFormModalProvider } from "./components/Providers/LeadFormModalProvider";

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
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "David Pokorný",
    jobTitle: "Finanční poradce",
    url: "https://pokornydavid.cz",
    sameAs: [],
  };

  return (
    <html lang="cs">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
        />
      </head>
      <body className={`${dmSans.className} antialiased`}>
        <ViewportProvider>
          <LeadFormModalProvider>{children}</LeadFormModalProvider>
        </ViewportProvider>
      </body>
    </html>
  );
}
