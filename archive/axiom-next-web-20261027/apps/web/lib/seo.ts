import type { Metadata } from "next";
import { getSiteBase, getSiteUrl } from "./site.ts";
import { createPageRobotsMetadata } from "./site-indexing.ts";

export const SITE_NAME = "David Pokorný";
export const DEFAULT_TITLE =
  "David Pokorný | Finanční poradce – hypotéky, pojištění a investice";
export const DEFAULT_DESCRIPTION =
  "Srozumitelné finanční plánování pro klienty z celé ČR. Hypotéky, pojištění, rezervy a investice online i osobně v Olomouci.";
export const STRUCTURED_DATA_DESCRIPTION =
  "Pomohu vám propojit hypotéku, pojištění, rezervy a investice do srozumitelného finančního plánu — online po celé ČR i osobně v Olomouci.";
export const DEFAULT_OG_IMAGE = "/og-logo-silk.jpg";
export const DEFAULT_OG_IMAGE_ALT =
  "Limetkové logo Davida Pokorného na hlubokém zeleném hedvábí";

export function normalizeSitePath(path: string) {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  if (withLeadingSlash === "/") return "/";
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function getCanonicalUrl(path: string) {
  const normalizedPath = normalizeSitePath(path);
  return normalizedPath === "/" ? getSiteBase() : getSiteUrl(normalizedPath);
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  openGraphType?: "website" | "article";
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
  };
  robots?: Metadata["robots"];
  canonical?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImage?: string;
};

export function resolveCanonicalUrl(value: string | undefined, fallbackPath: string) {
  if (!value) return getCanonicalUrl(fallbackPath);
  try {
    const parsed = value.startsWith("/")
      ? new URL(value, getSiteBase())
      : new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return getCanonicalUrl(fallbackPath);
    }
    if (parsed.origin === new URL(getSiteBase()).origin) {
      parsed.pathname = normalizeSitePath(parsed.pathname);
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return getCanonicalUrl(fallbackPath);
  }
}

// Asset URLs must not use the page canonicalizer: /og.jpg/ is a different,
// nonexistent resource from /og.jpg on the production static host.
export function getSiteAssetUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, getSiteBase());
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function createPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  openGraphType = "website",
  article,
  robots,
  canonical,
  socialTitle: socialTitleOverride,
  socialDescription,
  socialImage,
}: PageMetadataInput): Metadata {
  const url = resolveCanonicalUrl(canonical, path);
  const socialTitle = socialTitleOverride ?? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`);
  const socialCopy = socialDescription ?? description;
  const socialImageUrl = getSiteAssetUrl(socialImage) ?? getSiteAssetUrl(DEFAULT_OG_IMAGE)!;
  const pageRobots = createPageRobotsMetadata(robots);
  const commonOpenGraph = {
    locale: "cs_CZ",
    url,
    siteName: SITE_NAME,
    title: socialTitle,
    description: socialCopy,
    images: [
      {
        url: socialImageUrl,
        ...(socialImageUrl === getSiteAssetUrl(DEFAULT_OG_IMAGE)
          ? { width: 1200, height: 630 }
          : {}),
        alt: socialImageUrl === getSiteAssetUrl(DEFAULT_OG_IMAGE)
          ? DEFAULT_OG_IMAGE_ALT
          : socialTitle,
      },
    ],
  };

  return {
    title: absoluteTitle || title.includes(SITE_NAME) ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph:
      openGraphType === "article"
        ? {
            ...commonOpenGraph,
            type: "article",
            publishedTime: article?.publishedTime,
            modifiedTime: article?.modifiedTime,
            authors: article?.authors,
          }
        : {
            ...commonOpenGraph,
            type: "website",
          },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialCopy,
      images: [socialImageUrl],
    },
    robots: pageRobots,
  };
}

export function createSiteJsonLd(identityUrl: string) {
  const base = getSiteBase();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${base}#person`,
        name: SITE_NAME,
        url: getCanonicalUrl("/kdo-jsem/"),
        jobTitle: "Finanční poradce",
        sameAs: [identityUrl],
        email: "info@pokornydavid.cz",
        telephone: "+420731830897",
      },
      {
        "@type": "WebSite",
        "@id": `${base}#website`,
        url: base,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        inLanguage: "cs-CZ",
        publisher: { "@id": `${base}#person` },
      },
    ],
  };
}

export function createHomepageWebPageJsonLd({
  description = STRUCTURED_DATA_DESCRIPTION,
  name = "Finanční poradce online i v Olomouci",
}: {
  description?: string;
  name?: string;
} = {}) {
  const base = getSiteBase();

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${base}#webpage`,
    url: base,
    name,
    description,
    isPartOf: { "@id": `${base}#website` },
    about: { "@id": `${base}#person` },
    inLanguage: "cs-CZ",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${base.replace(/\/$/, "")}${DEFAULT_OG_IMAGE}`,
    },
  };
}
