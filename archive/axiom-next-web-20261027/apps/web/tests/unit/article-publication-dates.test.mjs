import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  assertArticlePublicRevisionV1,
  projectPublicArticleDocumentV2,
} from "@axiom-dp/contracts/article";
import {
  APPROVED_ARTICLE_PUBLICATION_DATE,
  APPROVED_ARTICLE_PUBLICATION_SLUGS,
  resolveArticlePublication,
} from "../../lib/article-publication-dates.ts";
import { articleDocumentToBlogPost } from "../../lib/article-document-adapter.ts";
import { parseArticleDocumentV2 } from "../../lib/article-document-v2.ts";
import { createControlApiArticleRuntimeProvider } from "../../lib/article-runtime-provider.ts";

process.env.NEXT_PUBLIC_SITE_URL = "https://pokornydavid.cz";
process.env.NEXT_PUBLIC_SITE_INDEXING = "true";

const { createArticleJsonLd } = await import("../../lib/article-seo.ts");
const { createSiteSitemap } = await import("../../lib/site-sitemap.ts");

const approvedDate = "2026-10-08";
const approvedSlugs = [
  "mate-financni-produkty-ale-mate-skutecne-financni-plan",
  "v-jakem-poradi-resit-osobni-finance",
  "kolik-ma-mit-domacnost-v-rezerve",
  "banka-vam-pujci-vic-nez-si-muzete-dovolit",
  "urokova-sazba-neni-cena-hypoteky",
  "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku",
  "cestovko-zdarma-od-karty-vas-nemusi-zachranit",
  "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou",
];
const familySlug = approvedSlugs.at(-1);
const originalDates = new Map([
  ["konec-fixace-hypoteky", "2026-06-25"],
  ["zdrazilo-vam-pojisteni", "2026-06-24"],
  ["mate-pojisteni-prijmu-nebo-jen-pocit", "2026-06-23"],
  ["chcete-investovat-zacnete-planem", "2026-06-22"],
]);
const originalUpdatedAt = "2026-08-12";
const base = "https://pokornydavid.cz/";
const workspaceId = "11111111-1111-4111-8111-111111111111";

function readSourceDocuments() {
  const directory = fileURLToPath(new URL("../../content/blog/", import.meta.url));
  const files = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.name.endsWith(".article.json")) files.push(target);
    }
  }
  return files.sort().map((file) =>
    parseArticleDocumentV2(JSON.parse(fs.readFileSync(file, "utf8")), file),
  );
}

function expectedDates(slug) {
  if (approvedSlugs.includes(slug)) {
    return { publishedAt: approvedDate, updatedAt: approvedDate };
  }
  assert.ok(originalDates.has(slug), `Unexpected article in the approved cohort: ${slug}`);
  return { publishedAt: originalDates.get(slug), updatedAt: originalUpdatedAt };
}

function assertPublicationDates(publication, slug) {
  const expected = expectedDates(slug);
  assert.equal(publication.publishedAt, expected.publishedAt, `${slug}: publication`);
  assert.equal(publication.updatedAt, expected.updatedAt, `${slug}: update`);
}

function assertProjectedDates(posts) {
  const sitemap = createSiteSitemap(posts);
  assert.equal(posts.length, 12);
  assert.equal(sitemap.length, 23);
  for (const post of posts) {
    const expected = expectedDates(post.slug);
    assert.equal(post.date, expected.publishedAt, `${post.slug}: rendered date source`);
    assert.equal(post.updatedAt, expected.updatedAt, `${post.slug}: rendered update source`);
    const article = createArticleJsonLd(post)["@graph"].find((node) => node["@type"] === "BlogPosting");
    assert.equal(article.datePublished, expected.publishedAt, `${post.slug}: JSON-LD publication`);
    assert.equal(article.dateModified, expected.updatedAt, `${post.slug}: JSON-LD update`);
    const entry = sitemap.find((item) => item.url === `${base}clanky/${post.slug}/`);
    assert.ok(entry, `${post.slug}: sitemap URL`);
    assert.equal(entry.lastModified, expected.updatedAt, `${post.slug}: sitemap lastmod`);
  }
  assert.equal(sitemap.find((item) => item.url === `${base}clanky/`).lastModified, approvedDate);
}

// Reproduce the publication metadata read from the live public collection on
// 2026-10-08 without depending on a network request or a mutable .tmp snapshot.
// The family article already had an older update timestamp, but no publishedAt.
function previousPublicRevisions() {
  return readSourceDocuments().map((source, index) => {
    const document = structuredClone(projectPublicArticleDocumentV2(source));
    if (approvedSlugs.includes(document.meta.slug)) {
      document.publication = { author: "David Pokorný" };
      if (document.meta.slug === familySlug) {
        document.publication.updatedAt = "2026-09-13T07:25:34.755Z";
      }
    }
    return assertArticlePublicRevisionV1({
      schema_version: 1,
      article_id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
      revision: document.meta.slug === familySlug ? 3 : 1,
      digest: `sha256:${"a".repeat(64)}`,
      document,
    });
  });
}

describe("owner-approved article publication dates", () => {
  it("limits the dated cohort to the eight authorized articles and preserves the other four sources", () => {
    assert.equal(APPROVED_ARTICLE_PUBLICATION_DATE, approvedDate);
    assert.deepEqual([...APPROVED_ARTICLE_PUBLICATION_SLUGS].sort(), [...approvedSlugs].sort());
    const documents = readSourceDocuments();
    assert.equal(documents.length, 12);
    assert.equal(documents.filter((document) => approvedSlugs.includes(document.meta.slug)).length, 8);
    for (const document of documents) {
      assertPublicationDates(document.publication, document.meta.slug);
    }
  });

  it("keeps generated dashboard publication metadata identical to the twelve source documents", () => {
    const registry = JSON.parse(fs.readFileSync(new URL(
      "../../../../packages/article-editorial/generated/dashboard-articles.json",
      import.meta.url,
    ), "utf8"));
    const documents = readSourceDocuments();
    assert.equal(registry.length, documents.length);
    for (const document of documents) {
      const entry = registry.find((item) => item.meta.slug === document.meta.slug);
      assert.ok(entry, `${document.meta.slug}: dashboard entry`);
      assert.deepEqual(entry.publication, document.publication, document.meta.slug);
      assertPublicationDates(entry.publication, document.meta.slug);
    }
  });

  it("projects repository dates consistently into the render model, JSON-LD and sitemap", () => {
    const documents = readSourceDocuments().map(projectPublicArticleDocumentV2);
    assertProjectedDates(documents.map((document) => articleDocumentToBlogPost(document, documents)));
  });

  it("projects older frozen published revisions without changing their documents, revision numbers or digests", () => {
    const revisions = previousPublicRevisions();
    const original = JSON.stringify(revisions);
    const documents = revisions.map((revision) => revision.document);
    assert.ok(revisions.every((revision) => Object.isFrozen(revision.document.publication)));
    assertProjectedDates(documents.map((document) => articleDocumentToBlogPost(document, documents)));
    assert.equal(JSON.stringify(revisions), original);
    const family = revisions.find((revision) => revision.document.meta.slug === familySlug);
    assert.equal(family.document.publication.publishedAt, undefined);
    assert.equal(family.document.publication.updatedAt, "2026-09-13T07:25:34.755Z");
    assert.equal(family.revision, 3);
  });

  it("uses the same approved dates through public collection and detail API providers", async () => {
    const revisions = previousPublicRevisions();
    const original = JSON.stringify(revisions);
    const collectionUrl = `https://control.example.test/public/content/workspaces/${workspaceId}/articles`;
    const requests = [];
    const provider = createControlApiArticleRuntimeProvider({
      baseUrl: "https://control.example.test",
      workspaceId,
      fetchImplementation: async (url, options) => {
        requests.push({ url, method: options.method });
        assert.equal(options.method, "GET");
        const value = url === collectionUrl
          ? { schema_version: 1, items: revisions }
          : revisions.find((revision) => `${collectionUrl}/${revision.document.meta.slug}` === url);
        assert.ok(value, `Unexpected API request: ${url}`);
        return new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
      },
    });
    const posts = await provider.listPublishedArticles();
    assertProjectedDates(posts);
    for (const post of posts) {
      const detail = await provider.getPublishedArticle(post.slug);
      assert.equal(detail.date, post.date, `${post.slug}: detail publication`);
      assert.equal(detail.updatedAt, post.updatedAt, `${post.slug}: detail update`);
    }
    assert.equal(requests.length, 13);
    assert.equal(JSON.stringify(revisions), original);
  });

  it("preserves existing authored dates, including a later publication without an update", () => {
    for (const publication of [
      { author: "David Pokorný", publishedAt: "2026-09-01", updatedAt: "2026-09-13" },
      { author: "David Pokorný", publishedAt: "2026-11-01", updatedAt: "2026-11-02" },
      { author: "David Pokorný", publishedAt: "2026-11-01" },
    ]) {
      Object.freeze(publication);
      assert.strictEqual(resolveArticlePublication(approvedSlugs[0], publication), publication);
    }
  });

  it("preserves future CMS updates while assigning the approved missing publication date", () => {
    const publication = Object.freeze({ author: "David Pokorný", updatedAt: "2026-11-02T13:20:00.000Z" });
    assert.deepEqual(resolveArticlePublication(familySlug, publication), {
      author: "David Pokorný",
      publishedAt: approvedDate,
      updatedAt: publication.updatedAt,
    });
    assert.equal(publication.publishedAt, undefined);
  });

  it("does not assign dates to unknown articles, the four dated slugs if later undated, or guest authors", () => {
    const undated = Object.freeze({ author: "David Pokorný" });
    for (const slug of ["novy-nedatovany-clanek", ...originalDates.keys()]) {
      assert.strictEqual(resolveArticlePublication(slug, undated), undated);
    }
    const guest = Object.freeze({ author: "Hostující autor" });
    assert.strictEqual(resolveArticlePublication(approvedSlugs[0], guest), guest);
  });
});
