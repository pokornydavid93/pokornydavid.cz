import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  assertArticleDocumentV2,
  projectPublicArticleDocumentV2,
} from "@axiom-dp/contracts/article";
import { getPublicArticle as projectEditorialArticle } from "../../../../packages/article-editorial/src/index.mjs";
import {
  getPublicArticle,
  parseArticleDocumentV2,
} from "../../lib/article-document-v2.ts";
import { articleDocumentToBlogPost } from "../../lib/article-document-adapter.ts";

const contentDirectory = path.join(process.cwd(), "content", "blog");

function findArticleFiles(directory) {
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
  return files.sort();
}

test("all twelve ArticleDocumentV2 files cross the shared JSON boundary", () => {
  const files = findArticleFiles(contentDirectory);
  assert.equal(files.length, 12);

  for (const filePath of files) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const parsed = parseArticleDocumentV2(
      raw,
      path.relative(contentDirectory, filePath),
    );
    const shared = assertArticleDocumentV2(parsed);
    assert.equal(shared.meta.slug, raw.meta.slug);
    const document = getPublicArticle(parsed);
    const post = articleDocumentToBlogPost(document, [document]);
    assert.equal(
      post.heroTitle,
      raw.hero.displayTitle ?? raw.hero.title,
      `Preserve authored title breaks without inventing them: ${raw.meta.slug}`,
    );
  }
});

test("financial delta supports a single measured value without accepting mixed shapes", () => {
  const filePath = findArticleFiles(contentDirectory).find((candidate) =>
    candidate.endsWith("09-konec-fixace-hypoteky.article.json"),
  );
  assert.ok(filePath);

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const block = raw.sections
    .find((section) => section.id === "priklad-z-praxe")
    .blocks.find((item) => item.type === "financialDelta");
  assertArticleDocumentV2(parseArticleDocumentV2(raw, filePath));

  block.items[0].from = "26 600 Kč";
  block.items[0].to = "35 900 Kč";
  assert.throws(
    () => parseArticleDocumentV2(raw, filePath),
    /shared contract integrity failure/u,
  );
});

test("authored interactive tool copy survives the shared article projection", () => {
  let toolCount = 0;

  for (const filePath of findArticleFiles(contentDirectory)) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const document = getPublicArticle(parseArticleDocumentV2(raw, filePath));
    const post = articleDocumentToBlogPost(document, [document]);

    for (const section of document.sections) {
      const renderedSection = post.sections.find((item) => item.id === section.id);
      for (const sourceTool of section.blocks.filter((block) => block.type === "interactiveTool")) {
        const renderedTool = renderedSection.blocks.find(
          (block) => block.type === "interactiveTool" && block.id === sourceTool.id,
        );
        assert.ok(renderedTool, `${document.meta.slug}: interactive tool missing`);
        assert.equal(renderedTool.title, sourceTool.title, `${document.meta.slug}: tool title`);
        assert.equal(renderedTool.text, sourceTool.text, `${document.meta.slug}: tool text`);
        toolCount += 1;
      }
    }
  }

  assert.equal(toolCount, 3);
});

test("shared and existing public projections are exactly equivalent", () => {
  for (const filePath of findArticleFiles(contentDirectory)) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const parsed = parseArticleDocumentV2(
      raw,
      path.relative(contentDirectory, filePath),
    );
    const sharedProjection = projectPublicArticleDocumentV2(parsed);
    const editorialProjection = projectEditorialArticle(parsed);

    assert.deepEqual(sharedProjection, editorialProjection, parsed.meta.slug);
    assert.deepEqual(getPublicArticle(parsed), editorialProjection);
    assert.equal("editorial" in sharedProjection, false);
    assert.equal("status" in sharedProjection.publication, false);
  }
});

test("semantic block composition survives the public article adapter", () => {
  const filePath = findArticleFiles(contentDirectory).find((candidate) =>
    candidate.endsWith("10-zdrazilo-vam-pojisteni.article.json"),
  );
  assert.ok(filePath);

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const sourceBlocks = raw.sections[0].blocks;
  // Keep the three-layout fixture independent of the article's CTA placement.
  sourceBlocks.push(structuredClone(
    raw.sections.at(-1).blocks.find((block) => block.type === "nextAction"),
  ));
  const hints = [
    { layout: "left-breakout", align: "center", spacing: "compact" },
    { layout: "wide", align: "right", spacing: "generous" },
    { layout: "full", align: "left", spacing: "normal" },
  ];
  assert.deepEqual(sourceBlocks.map((block) => block.type), [
    "lead",
    "explanation",
    "nextAction",
  ]);
  sourceBlocks.forEach((block, index) => Object.assign(block, hints[index]));

  const document = getPublicArticle(parseArticleDocumentV2(raw, filePath));
  const post = articleDocumentToBlogPost(document, [document]);
  assert.deepEqual(
    post.sections[0].blocks
      .map(({ layout, align, spacing }) => ({ layout, align, spacing })),
    hints,
  );
  assert.equal("layout" in post.sections[1].blocks[0], false);
  assert.equal("align" in post.sections[1].blocks[0], false);
  assert.equal("spacing" in post.sections[1].blocks[0], false);
});

test("authored conversion topics take priority over the category for both CTA shapes", () => {
  const filePath = findArticleFiles(contentDirectory).find((candidate) =>
    candidate.endsWith("10-zdrazilo-vam-pojisteni.article.json"),
  );
  assert.ok(filePath);
  const source = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const cases = [
    ["zajisteni-prijmu", "Zajištění příjmu"],
    ["fixace-hypoteky", "Hypotéka & bydlení"],
    ["investicni-chaos", "Investice a spoření"],
    ["zdrazovani-pojisteni", "Ochrana majetku"],
    [undefined, undefined],
    ["unknown-conversion", undefined],
  ];

  for (const [category, fallbackTopic] of [
    [source.meta.category, "Ochrana majetku"],
    ["Finanční plánování", "Finanční plán"],
  ]) {
    for (const [conversionId, conversionTopic] of cases) {
      const raw = structuredClone(source);
      raw.meta.category = category;
      const expectedTopic = conversionTopic ?? fallbackTopic;
      const action = { label: "Domluvit si kontrolu", ...(conversionId ? { conversionId } : {}) };
      raw.sections[0].blocks = [
        { type: "checklist", items: [{ title: "Smlouva" }], action },
        {
          type: "nextAction",
          title: "Projděme vaši situaci",
          paragraphs: ["Domluvíme se na potřebných podkladech."],
          action: { ...action, intent: "article-consultation" },
        },
      ];
      const document = getPublicArticle(parseArticleDocumentV2(raw, filePath));
      const post = articleDocumentToBlogPost(document, [document]);
      assert.equal(post.sections[0].blocks[0].action.leadTopic, expectedTopic, `checklist: ${category}/${conversionId}`);
      assert.equal(post.sections[0].blocks[1].leadTopic, expectedTopic, `nextAction: ${category}/${conversionId}`);
    }
  }
});

test("stable related references survive renamed titles and skip missing, self and duplicate links", () => {
  const files = findArticleFiles(contentDirectory);
  const documents = files.slice(0, 3).map((filePath) =>
    getPublicArticle(parseArticleDocumentV2(JSON.parse(fs.readFileSync(filePath, "utf8")), filePath)),
  );
  const [source, target, legacy] = documents.map((document) => structuredClone(document));
  const oldTitle = target.hero.title;
  target.hero.title = "Nový redakční nadpis";
  source.relatedTopics = [
    { topic: oldTitle, reason: "Stabilní odkaz", slug: target.meta.slug },
    { topic: legacy.hero.title, reason: "Chybějící explicitní odkaz", slug: "missing-related-article" },
    { topic: source.hero.title, reason: "Vlastní článek", slug: source.meta.slug },
    { topic: target.hero.title, reason: "Duplicitní starší odkaz" },
    { topic: legacy.hero.title, reason: "Starší odkaz podle nadpisu" },
    { topic: oldTitle, reason: "Duplicitní explicitní odkaz", slug: target.meta.slug },
  ];
  const post = articleDocumentToBlogPost(source, [source, target, legacy]);
  assert.deepEqual(post.relatedArticles, [
    { slug: target.meta.slug, reason: "Stabilní odkaz" },
    { slug: legacy.meta.slug, reason: "Starší odkaz podle nadpisu" },
  ]);
});

test("related slugs cross both public projections while invalid slugs fail the contract", () => {
  const filePath = findArticleFiles(contentDirectory)[0];
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  raw.relatedTopics = [{ topic: "Navazující téma", reason: "Důvod návaznosti", slug: "navazujici-clanek" }];

  const parsed = parseArticleDocumentV2(raw, filePath);
  const shared = projectPublicArticleDocumentV2(parsed);
  const editorial = projectEditorialArticle(parsed);
  const publicArticle = getPublicArticle(parsed);
  assert.deepEqual(shared, editorial);
  assert.deepEqual(shared, publicArticle);
  assert.equal(publicArticle.relatedTopics[0].slug, "navazujici-clanek");
  assert.equal("editorial" in publicArticle, false);
  assert.equal("status" in publicArticle.publication, false);

  for (const slug of ["../escape", "https://example.com", "", "Invalid Slug"]) {
    const invalid = structuredClone(raw);
    invalid.relatedTopics[0].slug = slug;
    assert.throws(() => assertArticleDocumentV2(invalid));
    assert.throws(() => parseArticleDocumentV2(invalid, filePath));
  }
});
