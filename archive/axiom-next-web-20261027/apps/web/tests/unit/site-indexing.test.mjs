import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  createSiteRobotsMetadata,
  createSiteRobotsRoute,
  resolveSiteIndexingEnabled,
  SITE_INDEXING_ENV,
} = await import("../../lib/site-indexing.ts");

describe("site indexing release policy", () => {
  it("enables indexing only for the exact build-time value true", () => {
    assert.equal(SITE_INDEXING_ENV, "NEXT_PUBLIC_SITE_INDEXING");
    assert.equal(resolveSiteIndexingEnabled("true"), true);

    for (const value of [undefined, "", "false", "TRUE", "1", " true"]) {
      assert.equal(resolveSiteIndexingEnabled(value), false);
    }
  });

  it("fails closed consistently in page metadata and robots.txt", () => {
    assert.deepEqual(createSiteRobotsMetadata(false), {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
    assert.deepEqual(createSiteRobotsRoute("https://pokornydavid.syllcode.com", false), {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    });
  });

  it("preserves the public production policy after explicit enablement", () => {
    assert.deepEqual(createSiteRobotsMetadata(true), {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    });
    assert.deepEqual(createSiteRobotsRoute("https://pokornydavid.syllcode.com", true), {
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
      sitemap: "https://pokornydavid.syllcode.com/sitemap.xml",
    });
  });
});
