import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  createControlApiArticleRuntimeProvider,
} from "./article-runtime-provider";
import {
  loadConfiguredArticleSource,
  resolveArticleSourceConfig,
  type ArticleSourceConfig,
} from "./article-source";
import {
  projectArticleBySlug,
  projectArticlePage,
  projectArticleStaticParams,
} from "./article-projections";
import type { BlogPost } from "./blog";

export class PublishedArticleSourceError extends Error {
  constructor(options?: ErrorOptions) {
    super("Published article source is unavailable.", options);
    this.name = "PublishedArticleSourceError";
  }
}

async function loadRepositoryArticles(): Promise<readonly BlogPost[]> {
  const { getAllPosts } = await import("./blog");
  return getAllPosts();
}

async function fetchPublishedArticles(
  config: Extract<ArticleSourceConfig, { mode: "published" }>,
): Promise<readonly BlogPost[]> {
  const provider = createControlApiArticleRuntimeProvider({
    baseUrl: config.origin,
    workspaceId: config.workspaceId,
  });

  try {
    return await provider.listPublishedArticles({
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (cause) {
    throw new PublishedArticleSourceError({ cause });
  }
}

// A public article collection is immutable between editorial publications and
// the Control API already advertises a 60-second public freshness window.
// Persisting that same window in Next prevents build workers and concurrent
// requests from downloading and parsing the complete collection once per
// route, while keeping dashboard changes visible without a redeploy.
const loadPublishedArticlesCached = unstable_cache(
  async (origin: string, workspaceId: string, timeoutMs: number) =>
    fetchPublishedArticles({
      mode: "published",
      origin,
      workspaceId,
      timeoutMs,
    }),
  ["axiom-published-article-collection-v2-publication-dates"],
  { revalidate: 60, tags: ["axiom-published-articles"] },
);

function loadPublishedArticles(
  config: Extract<ArticleSourceConfig, { mode: "published" }>,
) {
  return loadPublishedArticlesCached(
    config.origin,
    config.workspaceId,
    config.timeoutMs,
  );
}

const loadArticleCollection = cache(async (): Promise<readonly BlogPost[]> => {
  const config = resolveArticleSourceConfig(process.env);
  return loadConfiguredArticleSource(config, {
    repository: loadRepositoryArticles,
    published: loadPublishedArticles,
  });
});

export function getArticleCollection() {
  return loadArticleCollection();
}

export function getArticleBySlug(slug: string) {
  return projectArticleBySlug(loadArticleCollection, slug);
}

export function getArticlePageProjection(slug: string) {
  return projectArticlePage(loadArticleCollection, slug);
}

export function getArticleStaticParams() {
  return projectArticleStaticParams(loadArticleCollection);
}
