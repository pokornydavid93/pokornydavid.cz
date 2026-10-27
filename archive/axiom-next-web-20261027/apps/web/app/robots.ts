import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site";
import { createSiteRobotsRoute } from "@/lib/site-indexing";

export default function robots(): MetadataRoute.Robots {
  return createSiteRobotsRoute(getSiteOrigin());
}
