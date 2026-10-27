import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ARTICLE_PUBLIC_RUNTIME_MAX_ITEMS,
  ARTICLE_PUBLIC_RUNTIME_MAX_RESPONSE_BYTES,
  ArticleRuntimeProviderError,
  createControlApiArticleRuntimeProvider,
} from "../../lib/article-runtime-provider.ts";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const articleIds = [
  "22222222-2222-4222-8222-222222222221",
  "22222222-2222-4222-8222-222222222222",
];
const digest = `sha256:${"a".repeat(64)}`;

function publicDocument({
  slug = "financni-plan",
  title = "Finanční plán",
  publishedAt = "2026-08-25",
  relatedTopics = [],
} = {}) {
  return {
    schemaVersion: 2,
    publication: {
      author: "David Pokorný",
      publishedAt,
      updatedAt: publishedAt,
    },
    meta: {
      slug,
      topic: "Finanční plán",
      category: "Plánování",
      primaryIntent: "Vysvětlit rozhodovací postup",
      audience: "České domácnosti",
      estimatedReadTime: 7,
    },
    seo: {
      title: `${title} | David Pokorný`,
      description: "Srozumitelný postup pro rozhodování o osobních financích.",
    },
    hero: {
      category: "Plánování",
      eyebrow: "Průvodce",
      title,
      subtitle: "Nejdřív cíle, až potom produkty.",
      excerpt: "Srozumitelný postup pro rozhodování o osobních financích.",
      estimatedReadTime: "7 minut čtení",
      heroSummary: ["Rezerva", "Ochrana", "Dlouhodobé cíle"],
    },
    sections: [
      {
        id: "proc-plan",
        eyebrow: "Začněte kontextem",
        title: "Proč plán předchází produktu",
        rail: null,
        blocks: [
          {
            type: "lead",
            text: "Produkt bez cíle nelze správně posoudit.",
          },
        ],
      },
    ],
    conclusion: {
      title: "Plán vytváří pořadí",
      paragraphs: ["Dobrý plán pomáhá poznat, co řešit teď."],
    },
    relatedTopics,
  };
}

function publicRevision(document, articleId = articleIds[0], revision = 1) {
  return {
    schema_version: 1,
    article_id: articleId,
    revision,
    digest,
    document,
  };
}

function jsonResponse(value, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": contentType },
  });
}

function provider(fetchImplementation, overrides = {}) {
  return createControlApiArticleRuntimeProvider({
    baseUrl: "https://control.example.test/",
    workspaceId,
    fetchImplementation,
    ...overrides,
  });
}

function assertProviderError(code) {
  return (error) => {
    assert.ok(error instanceof ArticleRuntimeProviderError);
    assert.equal(error.code, code);
    return true;
  };
}

function assertReactSerializableObjectGraph(value, path = "projection") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertReactSerializableObjectGraph(item, `${path}[${index}]`),
    );
    return;
  }
  if (typeof value !== "object" || value === null) return;

  assert.equal(
    Object.getPrototypeOf(value),
    Object.prototype,
    `${path} must use Object.prototype at the RSC boundary`,
  );
  for (const [key, child] of Object.entries(value)) {
    assertReactSerializableObjectGraph(child, `${path}.${key}`);
  }
}

describe("control-api article runtime provider", () => {
  it("maps the leak-safe collection in API order and resolves cohort relations", async () => {
    const calls = [];
    const abort = new AbortController();
    const first = publicDocument({
      slug: "financni-plan",
      title: "Finanční plán",
      relatedTopics: [
        {
          topic: "Finanční rezerva",
          reason: "Rezerva je první vrstva plánu.",
        },
      ],
    });
    const second = publicDocument({
      slug: "financni-rezerva",
      title: "Finanční rezerva",
      publishedAt: "2026-08-26",
    });
    const runtime = provider(async (...args) => {
      calls.push(args);
      return jsonResponse({
        schema_version: 1,
        items: [
          publicRevision(second, articleIds[1]),
          publicRevision(first, articleIds[0]),
        ],
      });
    });

    const posts = await runtime.listPublishedArticles({ signal: abort.signal });

    assert.deepEqual(posts.map((post) => post.slug), [
      "financni-rezerva",
      "financni-plan",
    ]);
    assert.equal(posts[0].title, "Finanční rezerva");
    assert.deepEqual(posts[1].relatedArticles, [
      {
        slug: "financni-rezerva",
        reason: "Rezerva je první vrstva plánu.",
      },
    ]);
    assertReactSerializableObjectGraph(posts);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0][0],
      `https://control.example.test/public/content/workspaces/${workspaceId}/articles`,
    );
    assert.deepEqual(calls[0][1].headers, { Accept: "application/json" });
    assert.equal(calls[0][1].method, "GET");
    assert.equal(calls[0][1].credentials, "omit");
    assert.equal(calls[0][1].redirect, "error");
    assert.equal(calls[0][1].cache, "no-store");
    assert.equal(calls[0][1].signal, abort.signal);
  });

  it("accepts a canonical empty collection", async () => {
    const runtime = provider(async () =>
      jsonResponse({ schema_version: 1, items: [] }),
    );

    assert.deepEqual(await runtime.listPublishedArticles(), []);
  });

  it("maps a detail and maps 404 to null without parsing its body", async () => {
    const calls = [];
    const document = publicDocument();
    const runtime = provider(async (url) => {
      calls.push(url);
      return calls.length === 1
        ? jsonResponse(publicRevision(document))
        : new Response("private error body", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          });
    });

    const article = await runtime.getPublishedArticle("financni-plan");
    assert.equal(article?.slug, "financni-plan");
    assert.equal(article?.seoTitle, "Finanční plán | David Pokorný");
    assert.equal(
      calls[0],
      `https://control.example.test/public/content/workspaces/${workspaceId}/articles/financni-plan`,
    );
    assert.equal(await runtime.getPublishedArticle("chybi"), null);
  });

  it("rejects authoring, publication-status and internal revision leaks", async () => {
    const safeDocument = publicDocument();
    const unsafeRevisions = [
      publicRevision({
        ...safeDocument,
        editorial: { contentStatus: "internal" },
      }),
      publicRevision({
        ...safeDocument,
        publication: {
          ...safeDocument.publication,
          status: "published",
        },
      }),
      {
        ...publicRevision(safeDocument),
        created_by: "33333333-3333-4333-8333-333333333333",
      },
      {
        ...publicRevision(safeDocument),
        business_context: { schema_version: 1 },
      },
    ];

    for (const revision of unsafeRevisions) {
      const runtime = provider(async () =>
        jsonResponse({ schema_version: 1, items: [revision] }),
      );
      await assert.rejects(
        () => runtime.listPublishedArticles(),
        assertProviderError("invalid_response"),
      );
    }
  });

  it("rejects malformed envelopes, duplicate identities and slug drift", async () => {
    const document = publicDocument();
    const invalidCollections = [
      null,
      [],
      { schema_version: 1 },
      { schema_version: 2, items: [] },
      { schema_version: 1, items: {}, extra: false },
      { schema_version: 1, items: [], internal: true },
      { schema_version: 1, items: [{}] },
      {
        schema_version: 1,
        items: [publicRevision(document), publicRevision(document)],
      },
    ];

    for (const envelope of invalidCollections) {
      const runtime = provider(async () => jsonResponse(envelope));
      await assert.rejects(
        () => runtime.listPublishedArticles(),
        assertProviderError("invalid_response"),
      );
    }

    const runtime = provider(async () =>
      jsonResponse(
        publicRevision(
          publicDocument({ slug: "jiny-clanek", title: "Jiný článek" }),
        ),
      ),
    );
    await assert.rejects(
      () => runtime.getPublishedArticle("financni-plan"),
      assertProviderError("invalid_response"),
    );
  });

  it("fails closed on status, media type, malformed JSON and transport errors", async () => {
    const cases = [
      async () => new Response(null, { status: 204 }),
      async () => jsonResponse({ schema_version: 1, items: [] }, 200, "text/json"),
      async () =>
        new Response("not-json", {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
      async () => {
        throw new Error("connection refused");
      },
    ];

    for (const fetchImplementation of cases) {
      const runtime = provider(fetchImplementation);
      await assert.rejects(() => runtime.listPublishedArticles());
    }
  });

  it("rejects oversized declared and streamed bodies plus invalid UTF-8", async () => {
    const oversizedDeclared = provider(async () =>
      new Response('{"schema_version":1,"items":[]}', {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(
            ARTICLE_PUBLIC_RUNTIME_MAX_RESPONSE_BYTES + 1,
          ),
        },
      }),
    );
    await assert.rejects(
      () => oversizedDeclared.listPublishedArticles(),
      assertProviderError("invalid_response"),
    );

    const oversizedStreamed = provider(async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new Uint8Array(ARTICLE_PUBLIC_RUNTIME_MAX_RESPONSE_BYTES + 1),
            );
            controller.close();
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    await assert.rejects(
      () => oversizedStreamed.listPublishedArticles(),
      assertProviderError("invalid_response"),
    );

    const invalidUtf8 = provider(async () =>
      new Response(new Uint8Array([0xff]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await assert.rejects(
      () => invalidUtf8.listPublishedArticles(),
      assertProviderError("invalid_response"),
    );
  });

  it("rejects duplicate decoded JSON keys before contract validation", async () => {
    const runtime = provider(async () =>
      new Response(
        '{"schema_version":1,"items":[],"items":[{"internal":true}]}',
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await assert.rejects(
      () => runtime.listPublishedArticles(),
      assertProviderError("invalid_response"),
    );
  });

  it("caps a public collection at the backend maximum of 100 items", async () => {
    const items = Array.from(
      { length: ARTICLE_PUBLIC_RUNTIME_MAX_ITEMS + 1 },
      (_, index) => {
        const suffix = String(index + 1).padStart(12, "0");
        return publicRevision(
          publicDocument({
            slug: `clanek-${index + 1}`,
            title: `Článek ${index + 1}`,
          }),
          `22222222-2222-4222-8222-${suffix}`,
        );
      },
    );
    const runtime = provider(async () =>
      jsonResponse({ schema_version: 1, items }),
    );

    await assert.rejects(
      () => runtime.listPublishedArticles(),
      assertProviderError("invalid_response"),
    );
  });

  it("validates explicit configuration and request slugs without env fallback", async () => {
    for (const overrides of [
      { baseUrl: "/relative" },
      { baseUrl: "ftp://control.example.test" },
      { baseUrl: "https://user@control.example.test" },
      { baseUrl: "https://control.example.test?private=1" },
      { workspaceId: "not-a-workspace" },
    ]) {
      assert.throws(
        () => provider(async () => new Response(), overrides),
        assertProviderError("invalid_configuration"),
      );
    }

    const runtime = provider(async () => jsonResponse(publicRevision(publicDocument())));
    await assert.rejects(
      () => runtime.getPublishedArticle("../private"),
      assertProviderError("invalid_request"),
    );
  });
});
