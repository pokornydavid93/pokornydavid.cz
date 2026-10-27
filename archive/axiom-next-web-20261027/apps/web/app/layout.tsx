import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import "./theme/color-palette.css";
import "./theme/design-primitives.css";
import "./ui/animations/routeHeroEntry.css";
import LenisProvider from "./components/Providers/LenisProvider";
import { ViewportProvider } from "./components/Providers/ViewportProvider";
import { LeadFormModalProvider } from "./components/Providers/LeadFormModalProvider";
import LegalScrollRestoreProvider from "./components/Providers/LegalScrollRestoreProvider";
import RouteTransitionProvider from "./components/route-transition/RouteTransitionProvider";
import AnalyticsLoader from "@/src/app/ui/privacy/AnalyticsLoader.client";
import CookieBanner from "@/src/app/ui/privacy/CookieBanner.client";
import CookieSettingsButton from "@/src/app/ui/privacy/CookieSettingsButton.client";
import SkipLink from "@/app/ui/site/SkipLink";
import PublicAnalytics from "@/app/_components/PublicAnalytics.client";
import { HOMEPAGE_INTRO_BOOTSTRAP_SCRIPT } from "@/app/_components/homepage/HomepageIntro.bootstrap";
import CursorProvider from "@/app/components/cursor/CursorProvider.client";
import UnifiedRevealEngine from "@/app/ui/animations/UnifiedRevealEngine.client";
import RouteHeroEntry from "@/app/ui/animations/RouteHeroEntry.client";
import { getSiteBase } from "@/lib/site";
import { createSiteRobotsMetadata } from "@/lib/site-indexing";
import {
  createSiteJsonLd,
  serializeJsonLd,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_TITLE,
  SITE_NAME,
} from "@/lib/seo";
import {
  DEFAULT_SITE_THEME_ID,
  getSiteTheme,
  SITE_THEME_BOOTSTRAP_SCRIPT,
} from "@/app/theme/site-themes";
import { SITE_HEADER_THEME_BOOTSTRAP_SCRIPT } from "@/app/ui/site/siteHeaderTheme";
import { cnbRegistryUrl } from "./content/multipage";
import { getWebPrivacyConfiguration } from "@/lib/privacy/webPrivacyRuntime.server";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-base",
  display: "swap",
});

const BASE = getSiteBase();
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(BASE),

  title: {
    default: DEFAULT_TITLE,
    template: "%s | David Pokorný",
  },

  description: DEFAULT_DESCRIPTION,

  applicationName: SITE_NAME,

  icons: {
    icon: [
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: BASE,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: DEFAULT_OG_IMAGE_ALT,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },

  robots: createSiteRobotsMetadata(),

  ...(GOOGLE_SITE_VERIFICATION
    ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: getSiteTheme(DEFAULT_SITE_THEME_ID).browserThemeColor,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const privacyConfiguration = await getWebPrivacyConfiguration();
  const schemaLd = createSiteJsonLd(cnbRegistryUrl);

  return (
    <html
      lang="cs"
      data-color-theme={DEFAULT_SITE_THEME_ID}
      suppressHydrationWarning
    >
      <head>
        <script
          data-site-theme-bootstrap="true"
          dangerouslySetInnerHTML={{ __html: SITE_THEME_BOOTSTRAP_SCRIPT }}
        />

        <script
          data-site-header-theme-bootstrap="true"
          dangerouslySetInnerHTML={{
            __html: SITE_HEADER_THEME_BOOTSTRAP_SCRIPT,
          }}
        />

        <script
          data-home-intro-runtime="true"
          dangerouslySetInnerHTML={{
            __html: HOMEPAGE_INTRO_BOOTSTRAP_SCRIPT,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemaLd) }}
        />
      </head>

      <body className={`${dmSans.variable} antialiased`}>
        <SkipLink />
        <LenisProvider>
          <ViewportProvider>
            <LeadFormModalProvider>
              <RouteTransitionProvider>
                <LegalScrollRestoreProvider>
                  {children}
                </LegalScrollRestoreProvider>
                <UnifiedRevealEngine />
                <RouteHeroEntry />
                <CursorProvider />
              </RouteTransitionProvider>
            </LeadFormModalProvider>
          </ViewportProvider>
        </LenisProvider>

        {/* až úplně dolů */}
      
        <AnalyticsLoader configuration={privacyConfiguration} />
        <PublicAnalytics configuration={privacyConfiguration} />
        <CookieBanner configuration={privacyConfiguration} />
        <CookieSettingsButton configuration={privacyConfiguration} />
      </body>
    </html>
  );
}
