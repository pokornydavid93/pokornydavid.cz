import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  projectArticleBySlug,
  projectArticlePage,
  projectArticleStaticParams,
} from "../../lib/article-projections.ts";

function article({
  slug,
  category = "prehled",
  date = "2026-01-01",
  relatedArticles,
}) {
  return {
    title: slug,
    slug,
    excerpt: `${slug} excerpt`,
    category,
    date,
    content: `${slug} content`,
    relatedArticles,
  };
}

describe("async article projections", () => {
  it("loads one collection for detail and resolves related articles from that cohort", async () => {
    let collectionLoads = 0;
    const posts = [
      article({
        slug: "main",
        category: "hypoteka",
        relatedArticles: [
          { slug: "explicit-second", reason: "Second relation" },
          { slug: "explicit-first", reason: "First relation" },
        ],
      }),
      article({ slug: "same-category", category: "hypoteka", date: "2026-04-01" }),
      article({ slug: "explicit-first", category: "investice", date: "2026-02-01" }),
      article({ slug: "explicit-second", category: "pojisteni", date: "2026-03-01" }),
      article({ slug: "other", category: "investice", date: "2026-05-01" }),
    ];
    const loadCollection = async () => {
      collectionLoads += 1;
      return posts;
    };

    const projection = await projectArticlePage(loadCollection, "main");

    assert.equal(collectionLoads, 1);
    assert.equal(projection.post?.slug, "main");
    assert.deepEqual(
      projection.relatedPosts.map((post) => post.slug),
      ["explicit-second", "explicit-first", "same-category"],
    );
  });

  it("projects missing detail and static params without a detail data source", async () => {
    const posts = [article({ slug: "alpha" }), article({ slug: "beta" })];
    let detailLoads = 0;
    const missing = await projectArticlePage(async () => {
      detailLoads += 1;
      return posts;
    }, "missing");

    assert.equal(detailLoads, 1);
    assert.equal(missing.post, null);
    assert.deepEqual(missing.relatedPosts, []);
    assert.equal(
      (await projectArticleBySlug(async () => posts, "beta"))?.slug,
      "beta",
    );
    assert.deepEqual(await projectArticleStaticParams(async () => posts), [
      { slug: "alpha" },
      { slug: "beta" },
    ]);
  });
});
