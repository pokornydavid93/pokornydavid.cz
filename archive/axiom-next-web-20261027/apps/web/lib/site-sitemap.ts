import type { MetadataRoute } from "next";
import type { BlogPostMeta } from "./blog.ts";
import { getArticleCanonicalUrl } from "./article-seo.ts";
import { getCanonicalUrl } from "./seo.ts";

// These are the public indexable pages. Conversion receipts, internal previews
// and permanently moved aliases are deliberately absent. Static page dates are
// omitted until an editorial revision date can be backed by content history.
export const INDEXABLE_SITE_PATHS = [
  "/",
  "/jak-pracuji/",
  "/kdo-jsem/",
  "/osvedceni-a-certifikace/",
  "/sluzby/",
  "/reference/",
  "/refixace-hypoteky/",
  "/pravni-informace/",
  "/zasady-zpracovani-osobnich-udaju/",
  "/cookies-a-mereni/",
] as const;

function articleLastModified(post: BlogPostMeta): string | undefined {
  const value = post.updatedAt ?? post.date;
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return value;
}

export function createSiteSitemap(posts: readonly BlogPostMeta[]): MetadataRoute.Sitemap {
  const indexablePosts = posts.filter((post) =>
    post.seoIndex !== false &&
    getArticleCanonicalUrl(post) === getCanonicalUrl(`/clanky/${post.slug}/`),
  );
  const articleRoutes = indexablePosts.map((post) => {
    const lastModified = articleLastModified(post);
    return {
      url: getArticleCanonicalUrl(post),
      ...(lastModified ? { lastModified } : {}),
    };
  });
  // An undated article may be newer than all dated entries. Do not make a
  // historical claim about the archive from an incomplete date collection.
  const dates = posts.map(articleLastModified);
  const archiveLastModified = dates.length > 0 && dates.every((date) => date !== undefined)
    ? dates.reduce((latest, date) => Date.parse(date) > Date.parse(latest) ? date : latest)
    : undefined;

  return [
    ...INDEXABLE_SITE_PATHS.map((path) => ({ url: getCanonicalUrl(path) })),
    {
      url: getCanonicalUrl("/clanky/"),
      ...(archiveLastModified ? { lastModified: archiveLastModified } : {}),
    },
    ...articleRoutes,
  ];
}
