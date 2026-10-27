import type { BlogPostMeta } from "./blog.ts";
import { getSiteBase } from "./site.ts";
import { getCanonicalUrl, getSiteAssetUrl, resolveCanonicalUrl, SITE_NAME } from "./seo.ts";

export function getArticleCanonicalUrl(post: Pick<BlogPostMeta, "slug" | "seoCanonical">) {
  return resolveCanonicalUrl(post.seoCanonical, `/clanky/${post.slug}/`);
}

export function createArticleJsonLd(post: BlogPostMeta, image?: string) {
  const base = getSiteBase();
  const url = getArticleCanonicalUrl(post);
  const authorName = post.author ?? SITE_NAME;
  const author = {
    "@type": "Person",
    name: authorName,
    ...(authorName === SITE_NAME
      ? { "@id": `${base}#person`, url: getCanonicalUrl("/kdo-jsem/") }
      : {}),
  };
  const imageUrl = getSiteAssetUrl(image);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.seoDescription ?? post.excerpt,
        ...(post.date ? { datePublished: post.date } : {}),
        ...(post.updatedAt || post.date
          ? { dateModified: post.updatedAt ?? post.date }
          : {}),
        inLanguage: "cs-CZ",
        mainEntityOfPage: { "@id": `${url}#webpage` },
        url,
        author,
        publisher: { "@id": `${base}#person` },
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(post.sections?.length
          ? { articleSection: post.sections.map((section) => section.title) }
          : {}),
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: post.title,
        isPartOf: { "@id": `${base}#website` },
        mainEntity: { "@id": `${url}#article` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        inLanguage: "cs-CZ",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Články",
            item: getCanonicalUrl("/clanky/"),
          },
          { "@type": "ListItem", position: 2, name: post.title, item: url },
        ],
      },
    ],
  };
}
