import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ArticlePublicationBlockedError,
  assertArticlePublishable,
  evaluateArticlePublication,
  getPublicArticle,
  getVerificationState,
  renderPublicArticleMarkdown,
} from "../../../../packages/article-editorial/src/index.mjs";

const contentDirectory = path.join(process.cwd(), "content", "blog");

function findArticleFiles(directory) {
  const files = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.name.endsWith(".article.json")) files.push(target);
    }
  }
  return files.sort();
}

function loadArticles() {
  return findArticleFiles(contentDirectory).map((filePath) => ({
    filePath,
    article: JSON.parse(fs.readFileSync(filePath, "utf8")),
  }));
}

function publishableFixture(status = "pending") {
  return {
    publication: { status: "ready" },
    editorial: {
      review: { status: "approved" },
      verificationItems: [
        {
          id: "current-law-check",
          title: "Aktuální právní stav",
          instruction: "Ověřit platné znění.",
          status,
          severity: "blocking",
          blocksPublish: true,
          visibility: "internal",
        },
      ],
    },
  };
}

test("public article projection excludes the complete editorial layer", () => {
  const [{ article }] = loadArticles();
  const projected = getPublicArticle(article);
  const serialized = JSON.stringify(projected);

  assert.equal("editorial" in projected, false);
  assert.equal("status" in projected.publication, false);
  assert.equal(serialized.includes("verificationItems"), false);
  assert.equal(serialized.includes("productionNotes"), false);
  assert.equal(serialized.includes("sourceBasis"), false);
});

test("public projection rejects an internal block instead of hiding it", () => {
  const [{ article }] = loadArticles();
  const invalid = structuredClone(article);
  invalid.sections[0].blocks.push({
    type: "sourceNote",
    title: "Internal",
    text: "Never public",
    needsVerification: true,
  });

  assert.throws(() => getPublicArticle(invalid), /not part of the public article contract/);
});

test("Markdown previews are generated from the same public projection", () => {
  for (const { article, filePath } of loadArticles()) {
    const previewPath = filePath.replace(/\.article\.json$/, ".preview.md");
    const preview = fs.readFileSync(previewPath, "utf8");
    assert.equal(preview, renderPublicArticleMarkdown(article), article.meta.slug);
    assert.doesNotMatch(preview, /vyžaduje ověření|před publikací|financialDelta|needsVerification|veřejný render/i);
    assert.doesNotMatch(preview, /undefined\s*→\s*undefined/u);
  }
});

test("pending blocking verification rejects publish at the domain boundary", () => {
  const article = publishableFixture("pending");
  const result = evaluateArticlePublication(article);

  assert.equal(result.allowed, false);
  assert.equal(result.blockingItems.length, 1);
  assert.throws(
    () => assertArticlePublishable(article),
    ArticlePublicationBlockedError,
  );
});

test("verified blocking verification unlocks publish", () => {
  const article = publishableFixture("verified");
  const result = assertArticlePublishable(article);
  assert.equal(result.allowed, true);
  assert.equal(result.blockingItems.length, 0);
});

test("republish gate requires an existing Offer and Audience provenance cohort", () => {
  const article = publishableFixture("verified");
  article.publication.status = "published";
  const missing = evaluateArticlePublication(article, {
    requireBusinessProvenance: true,
    businessContext: null,
  });
  assert.equal(missing.allowed, false);
  assert.equal(
    missing.issues.some((issue) => issue.code === "business_provenance"),
    true,
  );

  const verified = evaluateArticlePublication(article, {
    requireBusinessProvenance: true,
    businessContext: {
      schema_version: 1,
      business_graph_change_set_id: "11111111-1111-4111-8111-111111111111",
      base_graph_revision: 4,
      base_graph_digest: `sha256:${"a".repeat(64)}`,
      offer_refs: [{ object_id: "22222222-2222-4222-8222-222222222222", object_version: 1 }],
      audience_segment_refs: [{ object_id: "33333333-3333-4333-8333-333333333333", object_version: 1 }],
    },
  });
  assert.equal(verified.allowed, true);
});

test("expired verification becomes stale and blocks republish", () => {
  const article = publishableFixture("verified");
  article.publication.status = "published";
  article.editorial.verificationItems[0].expiresAt = "2025-01-01T00:00:00.000Z";

  assert.equal(
    getVerificationState(
      article.editorial.verificationItems[0],
      "2026-01-01T00:00:00.000Z",
    ),
    "stale",
  );
  assert.equal(
    evaluateArticlePublication(article, {
      now: "2026-01-01T00:00:00.000Z",
    }).allowed,
    false,
  );
});

test("all twelve articles pass a public projection smoke test", () => {
  const articles = loadArticles();
  assert.equal(articles.length, 12);

  for (const { article } of articles) {
    const projected = getPublicArticle(article);
    assert.equal(projected.sections.length, article.sections.length);
    assert.equal(projected.meta.slug, article.meta.slug);
    assert.equal(JSON.stringify(projected).includes("sourceNote"), false);
  }
});

test("structured studio blocks survive the public projection without editor chrome", () => {
  const [{ article }] = loadArticles();
  const structured = structuredClone(article);
  structured.sections[0].blocks = [
    {
      id: "studio-heading",
      type: "heading",
      level: 2,
      layout: "wide",
      content: {
        type: "doc",
        content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Důležitý kontext", marks: [{ type: "bold" }] }] }],
      },
    },
    {
      id: "studio-image",
      type: "image",
      layout: "full",
      asset: {
        assetId: "11111111-1111-4111-8111-111111111111",
        projectId: "22222222-2222-4222-8222-222222222222",
        url: "https://cdn.example.test/article.webp",
        mimeType: "image/webp",
        filename: "article.webp",
      },
      alt: "Poradce u pracovního stolu",
      caption: "Skutečný workspace asset",
    },
  ];

  const projected = getPublicArticle(structured);
  assert.deepEqual(projected.sections[0].blocks, structured.sections[0].blocks);
  const markdown = renderPublicArticleMarkdown(structured);
  assert.match(markdown, /## \*\*Důležitý kontext\*\*/u);
  assert.match(markdown, /!\[Poradce u pracovního stolu\]\(https:\/\/cdn\.example\.test\/article\.webp\)/u);
  assert.doesNotMatch(JSON.stringify(projected), /data-article|dragHandle|selected/u);
});
