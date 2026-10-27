import type { BlogPost, BlogPostMeta } from "./blog";

export type ArticleCollectionLoader = () => Promise<readonly BlogPost[]>;

export type ArticlePageProjection = Readonly<{
  post: BlogPost | null;
  relatedPosts: readonly BlogPost[];
}>;

export function findArticleInCollection(
  posts: readonly BlogPost[],
  slug: string,
): BlogPost | null {
  return posts.find((post) => post.slug === slug) ?? null;
}

export function relatedArticlesFromCollection(
  posts: readonly BlogPost[],
  post: BlogPostMeta,
  limit = 3,
): BlogPost[] {
  const explicitOrder = new Map(
    post.relatedArticles?.map((article, index) => [article.slug, index]),
  );

  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .toSorted((left, right) => {
      const explicitLeft = explicitOrder.get(left.slug);
      const explicitRight = explicitOrder.get(right.slug);

      if (explicitLeft !== undefined || explicitRight !== undefined) {
        return (
          (explicitLeft ?? Number.MAX_SAFE_INTEGER) -
          (explicitRight ?? Number.MAX_SAFE_INTEGER)
        );
      }

      const categoryScore =
        Number(right.category === post.category) -
        Number(left.category === post.category);
      if (categoryScore !== 0) return categoryScore;
      return (
        (right.date ? Date.parse(right.date) : 0) -
        (left.date ? Date.parse(left.date) : 0)
      );
    })
    .slice(0, limit);
}

export async function projectArticleBySlug(
  loadCollection: ArticleCollectionLoader,
  slug: string,
): Promise<BlogPost | null> {
  return findArticleInCollection(await loadCollection(), slug);
}

export async function projectArticlePage(
  loadCollection: ArticleCollectionLoader,
  slug: string,
  relatedLimit = 3,
): Promise<ArticlePageProjection> {
  const posts = await loadCollection();
  const post = findArticleInCollection(posts, slug);

  return Object.freeze({
    post,
    relatedPosts: post
      ? relatedArticlesFromCollection(posts, post, relatedLimit)
      : [],
  });
}

export async function projectArticleStaticParams(
  loadCollection: ArticleCollectionLoader,
) {
  return (await loadCollection()).map((post) => ({ slug: post.slug }));
}
