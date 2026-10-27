import type { Metadata, MetadataRoute } from "next";

export const SITE_INDEXING_ENV = "NEXT_PUBLIC_SITE_INDEXING";

export function resolveSiteIndexingEnabled(rawValue: string | undefined): boolean {
  return rawValue === "true";
}

export const SITE_INDEXING_ENABLED = resolveSiteIndexingEnabled(
  process.env.NEXT_PUBLIC_SITE_INDEXING,
);

export function createSiteRobotsMetadata(
  indexingEnabled = SITE_INDEXING_ENABLED,
): NonNullable<Metadata["robots"]> {
  if (!indexingEnabled) {
    return {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  };
}

export function createPageRobotsMetadata(
  overrides?: Metadata["robots"],
  indexingEnabled = SITE_INDEXING_ENABLED,
): NonNullable<Metadata["robots"]> {
  const defaults = createSiteRobotsMetadata(indexingEnabled);
  if (!indexingEnabled || !overrides) return defaults;
  if (typeof overrides === "string" || typeof defaults === "string") return overrides;

  // Next replaces nested metadata, so a per-article index/follow setting would
  // otherwise discard the site's image/snippet preview policy.
  const googleBotDefaults = typeof defaults.googleBot === "object"
    ? defaults.googleBot
    : {};
  return {
    ...defaults,
    ...overrides,
    googleBot: overrides.googleBot ?? {
      ...googleBotDefaults,
      index: overrides.index ?? defaults.index,
      follow: overrides.follow ?? defaults.follow,
    },
  };
}

export function createSiteRobotsRoute(
  siteOrigin: string,
  indexingEnabled = SITE_INDEXING_ENABLED,
): MetadataRoute.Robots {
  if (!indexingEnabled) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/runtime/preview/",
          "/runtime-data/",
          "/funnels/mortgage-income-drop-check/",
        ],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
