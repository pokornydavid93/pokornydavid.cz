import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_SITE_URL = "https://pokornydavid.cz";
process.env.NEXT_PUBLIC_SITE_INDEXING = "true";

const {
  createPageMetadata,
  createSiteJsonLd,
  getCanonicalUrl,
  getSiteAssetUrl,
  resolveCanonicalUrl,
  serializeJsonLd,
} = await import("../../lib/seo.ts");
const { createPageRobotsMetadata } = await import("../../lib/site-indexing.ts");
const { createArticleJsonLd } = await import("../../lib/article-seo.ts");
const { createSiteSitemap } = await import("../../lib/site-sitemap.ts");

const base = "https://pokornydavid.cz/";
const post = {
  slug: "konec-fixace-hypoteky",
  title: "Končí vám fixace hypotéky?",
  excerpt: "Co si ověřit před rozhodnutím.",
  category: "hypoteka",
  author: "David Pokorný",
};

describe("public SEO metadata", () => {
  it("applies the layout brand once to ordinary and already branded titles", () => {
    const input = { description: "Praktické články", path: "/clanky/" };
    const plain = createPageMetadata({ ...input, title: "Články z praxe" });
    const branded = createPageMetadata({ ...input, title: "Články z praxe | David Pokorný" });
    assert.equal(plain.title, "Články z praxe");
    assert.deepEqual(branded.title, { absolute: "Články z praxe | David Pokorný" });
    assert.equal(plain.openGraph.title, branded.openGraph.title);
    assert.equal(plain.alternates.canonical, `${base}clanky/`);
  });

  it("keeps image URLs as files and rejects non-web image protocols", () => {
    assert.equal(getSiteAssetUrl("/og.jpg"), `${base}og.jpg`);
    assert.equal(getSiteAssetUrl("/articles/cover.avif?v=2"), `${base}articles/cover.avif?v=2`);
    assert.equal(getSiteAssetUrl("javascript:alert(1)"), undefined);
    const metadata = createPageMetadata({ title: "Články", description: "Popis", path: "/clanky/" });
    assert.equal(metadata.openGraph.images[0].url, `${base}og-logo-silk.jpg`);
    assert.equal(metadata.twitter.images[0], `${base}og-logo-silk.jpg`);
    const custom = createPageMetadata({ title: "Článek", description: "Popis", path: "/clanky/test/", socialImage: "/cover.avif" });
    assert.equal(custom.openGraph.images[0].url, `${base}cover.avif`);
    assert.equal(custom.openGraph.images[0].width, undefined, "Do not invent custom image dimensions");
  });

  it("normalizes local canonicals consistently and validates overrides", () => {
    assert.equal(getCanonicalUrl("/clanky"), `${base}clanky/`);
    assert.equal(resolveCanonicalUrl("/clanky/test?view=full#heading", "/"), `${base}clanky/test/?view=full`);
    assert.equal(resolveCanonicalUrl(`${base}clanky/test`, "/"), `${base}clanky/test/`);
    assert.equal(resolveCanonicalUrl("https://example.com/original", "/"), "https://example.com/original");
    assert.equal(resolveCanonicalUrl("javascript:alert(1)", "/clanky/test/"), `${base}clanky/test/`);
  });

  it("retains preview permissions while respecting article and staging noindex", () => {
    const indexable = createPageRobotsMetadata({ index: true, follow: true }, true);
    assert.equal(indexable.googleBot["max-image-preview"], "large");
    assert.equal(indexable.googleBot["max-snippet"], -1);
    const privatePage = createPageRobotsMetadata({ index: false, follow: true }, true);
    assert.equal(privatePage.index, false);
    assert.equal(privatePage.googleBot.index, false);
    assert.equal(privatePage.googleBot.follow, true);
    const staging = createPageRobotsMetadata({ index: true, follow: true }, false);
    assert.equal(staging.index, false);
    assert.equal(staging.googleBot.follow, false);
  });
});

describe("article entity graph", () => {
  it("links the visible author, publisher, page, website and breadcrumb", () => {
    const site = createSiteJsonLd("https://example.com/official-registration");
    const graph = createArticleJsonLd(post, "/cover.avif")["@graph"];
    const article = graph.find((node) => node["@type"] === "BlogPosting");
    const page = graph.find((node) => node["@type"] === "WebPage");
    const breadcrumb = graph.find((node) => node["@type"] === "BreadcrumbList");
    const person = site["@graph"].find((node) => node["@type"] === "Person");
    assert.equal(article.author["@id"], person["@id"]);
    assert.equal(article.publisher["@id"], person["@id"]);
    assert.equal(article.author.url, person.url);
    assert.equal(article.mainEntityOfPage["@id"], page["@id"]);
    assert.equal(page.mainEntity["@id"], article["@id"]);
    assert.equal(page.isPartOf["@id"], `${base}#website`);
    assert.equal(page.breadcrumb["@id"], breadcrumb["@id"]);
    assert.deepEqual(breadcrumb.itemListElement.map((item) => item.item), [`${base}clanky/`, article.url]);
    assert.equal(article.image, `${base}cover.avif`);
  });

  it("does not fabricate dates or attach a guest writer to David's entity", () => {
    const article = createArticleJsonLd({ ...post, author: "Hostující autor" })["@graph"][0];
    assert.equal(article.datePublished, undefined);
    assert.equal(article.dateModified, undefined);
    assert.equal(article.author["@id"], undefined);
    const dated = createArticleJsonLd({ ...post, date: "2026-06-25", updatedAt: "2026-08-12" })["@graph"][0];
    assert.equal(dated.datePublished, "2026-06-25");
    assert.equal(dated.dateModified, "2026-08-12");
  });

  it("keeps structured data in one script even when published text contains HTML", () => {
    const payload = { headline: "</script><script>alert('article')</script>", text: "České znaky" };
    const serialized = serializeJsonLd(payload);
    assert.equal(serialized.includes("<"), false);
    assert.deepEqual(JSON.parse(serialized), payload);
  });
});

describe("content-derived sitemap", () => {
  it("includes only canonical indexable articles and leaves conversion routes out", () => {
    const sitemap = createSiteSitemap([
      post,
      { ...post, slug: "private", seoIndex: false },
      { ...post, slug: "syndicated", seoCanonical: "https://example.com/original/" },
      { ...post, slug: "alias", seoCanonical: `/clanky/${post.slug}/` },
    ]);
    assert.equal(sitemap.filter((item) => item.url.includes("/clanky/")).length, 2);
    assert.equal(sitemap.some((item) => item.url.includes("ziskat-prehled")), false);
    assert.equal(sitemap.some((item) => item.url.includes("design-language")), false);
    assert.equal(new Set(sitemap.map((item) => item.url)).size, sitemap.length);
  });

  it("uses editorial dates without generating timestamps on deployment", () => {
    const sitemap = createSiteSitemap([
      { ...post, date: "2026-06-25", updatedAt: "2026-08-12" },
      { ...post, slug: "older", date: "2026-04-01" },
    ]);
    assert.equal(sitemap.find((item) => item.url === `${base}clanky/`).lastModified, "2026-08-12");
    assert.equal(sitemap.find((item) => item.url === `${base}clanky/${post.slug}/`).lastModified, "2026-08-12");
    assert.equal(sitemap.find((item) => item.url === base).lastModified, undefined);
    assert.equal(sitemap.some((item) => "priority" in item || "changeFrequency" in item), false);
    assert.deepEqual(sitemap, createSiteSitemap([
      { ...post, date: "2026-06-25", updatedAt: "2026-08-12" },
      { ...post, slug: "older", date: "2026-04-01" },
    ]));
  });

  it("omits uncertain archive and article dates instead of inventing freshness", () => {
    const sitemap = createSiteSitemap([
      { ...post, date: "2026-06-25" },
      { ...post, slug: "undated" },
      { ...post, slug: "invalid-date", updatedAt: "not-a-date" },
    ]);
    for (const suffix of ["clanky/", "clanky/undated/", "clanky/invalid-date/"]) {
      assert.equal(sitemap.find((item) => item.url === `${base}${suffix}`).lastModified, undefined);
    }
  });
});
