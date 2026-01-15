import type { MetadataRoute } from "next";

const BASE = "https://pokornydavid.cz";

const routes = [
  "/",
  "/cookies-a-mereni",
  "/pravni-informace",
  "/zasady-zpracovani-osobnich-udaju",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.2,
  }));
}
