import type { MetadataRoute } from "next";
import { getArticleCollection } from "@/lib/article-content.server";
import { createSiteSitemap } from "@/lib/site-sitemap";

// Match the published article collection's freshness window so editorial
// publications do not require a web deployment to enter the sitemap.
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return createSiteSitemap(await getArticleCollection());
}
