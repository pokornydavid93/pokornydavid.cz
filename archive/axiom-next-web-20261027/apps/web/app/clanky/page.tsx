import type { Metadata } from "next";
import {
  PublicSiteFooter,
  PublicSiteHeader,
} from "@/app/_components/PublicSiteChrome";
import {
  categoryLabels,
  type BlogCategory,
  type BlogPostMeta,
} from "@/lib/blog";
import { getArticleCollection } from "@/lib/article-content.server";
import { createPageMetadata } from "@/lib/seo";
import ArticlesHub, {
  type ArticleArchiveFilterValue,
  type ArticleCategoryOption,
  type ArticleFilterValue,
  type ArticleLibraryItem,
} from "./ArticlesHub.client";
import s from "./articles.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Články z praxe",
  description:
    "Praktické články o hypotékách, pojištění, investicích a ochraně příjmu. Co si ověřit dřív, než uděláte finanční rozhodnutí.",
  path: "/clanky/",
});

type ArticlesPageProps = {
  searchParams?: Promise<{ category?: string; topic?: string; q?: string }>;
};

const categoryValues = Object.keys(categoryLabels) as BlogCategory[];
const articleFilterValues: ArticleFilterValue[] = [
  ...categoryValues,
  "prijem",
];

const articleCategoryLabels: Record<ArticleFilterValue, string> = {
  prehled: "Kde začít",
  hypoteka: "Hypotéky",
  pojisteni: "Pojištění",
  rezerva: "Rezerva a rozpočet",
  investice: "Investice",
  uvery: "Úvěry a refinancování",
  rodina: "Finance v páru",
  prijem: "Příjem",
};

const articleFilterOptions: ArticleCategoryOption[] = [
  { value: "hypoteka", label: articleCategoryLabels.hypoteka },
  { value: "pojisteni", label: articleCategoryLabels.pojisteni },
  { value: "prijem", label: articleCategoryLabels.prijem },
  { value: "investice", label: articleCategoryLabels.investice },
  { value: "ostatni", label: "Ostatní" },
];

const articleSpecificCategoryLabels: Record<string, string> = {
  "zdrazilo-vam-pojisteni": "Pojištění majetku",
  "mate-pojisteni-prijmu-nebo-jen-pocit": "Ochrana příjmu",
};

const articleCardTitles: Record<string, string> = {
  "konec-fixace-hypoteky":
    "Končí vám fixace? Neberte první nabídku automaticky.",
  "zdrazilo-vam-pojisteni":
    "Zdražilo vám pojištění? Neplaťte automaticky víc.",
  "chcete-investovat-zacnete-planem":
    "Chcete investovat? Začněte plánem, ne produktem.",
};

// Visual emphasis for the hub cover; the article title itself stays unchanged.
const articleHeroTitleAccents: Record<string, string> = {
  "cestovko-zdarma-od-karty-vas-nemusi-zachranit": "vás nemusí zachránit",
};

const articleTakeaways: Record<string, string> = {
  "konec-fixace-hypoteky":
    "nabídka banky vs. reálná splátka",
  "zdrazilo-vam-pojisteni":
    "krytí vs. setrvačnost",
  "mate-pojisteni-prijmu-nebo-jen-pocit":
    "skutečný výpadek příjmu",
  "chcete-investovat-zacnete-planem":
    "plán místo produktu",
};

function isArticleFilterValue(
  value: unknown,
): value is ArticleArchiveFilterValue {
  return (
    typeof value === "string" &&
    (value === "ostatni" ||
      articleFilterValues.includes(value as ArticleFilterValue))
  );
}

function getArticleCategoryLabel(category: ArticleFilterValue) {
  return articleCategoryLabels[category];
}

function getArticleCardCategoryLabel(post: BlogPostMeta) {
  return (
    articleSpecificCategoryLabels[post.slug] ??
    post.heroCategoryLabel ??
    getArticleCategoryLabel(post.category)
  );
}

function getArticleCardTitle(post: BlogPostMeta) {
  return articleCardTitles[post.slug] ?? post.title;
}

function getArticleFilterValue(post: BlogPostMeta): ArticleFilterValue {
  if (post.slug === "mate-pojisteni-prijmu-nebo-jen-pocit") {
    return "prijem";
  }

  return post.category;
}

function getTakeaway(post: BlogPostMeta) {
  return (
    articleTakeaways[post.slug] ??
    post.hubBenefit ??
    "jednu souvislost, podle které se dá rozhodovat klidněji."
  );
}

function createArticleLibraryItem(post: BlogPostMeta): ArticleLibraryItem {
  return {
    slug: post.slug,
    title: getArticleCardTitle(post),
    heroTitle: post.heroTitle,
    heroTitleAccent: articleHeroTitleAccents[post.slug],
    excerpt: post.excerpt,
    hubDescription: post.hubDescription,
    hubBenefit: post.hubBenefit,
    heroCategoryLabel: post.heroCategoryLabel,
    heroImage: post.heroImage,
    heroImageAlt: post.heroImageAlt,
    author: post.author,
    category: post.category,
    categoryLabel: getArticleCardCategoryLabel(post),
    filterValue: getArticleFilterValue(post),
    date: post.date,
    readingTime: post.readingTime,
    takeaway: getTakeaway(post),
    keywords: post.relatedServices,
    featured: Boolean(post.featured),
    featuredPriority: post.featuredPriority,
  };
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const topicParam = params?.topic ?? params?.category;
  const initialTopic = isArticleFilterValue(topicParam) ? topicParam : undefined;
  const initialQuery = typeof params?.q === "string" ? params.q : "";
  const posts = await getArticleCollection();
  const availableFilters = new Set(posts.map(getArticleFilterValue));
  const categories = articleFilterOptions.filter((category) =>
    category.value === "ostatni" ||
    availableFilters.has(category.value as ArticleFilterValue),
  );
  const articles = posts.map(createArticleLibraryItem);

  return (
    <>
      <PublicSiteHeader
        className={s.articlesHeader}
        currentPath="/clanky/"
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={`${s.articlePage} ${s.articleIndexPage}`}
        data-page-theme="articles-editorial"
        data-surface-tone="dark"
      >
        <ArticlesHub
          articles={articles}
          categories={categories}
          key={`${initialTopic ?? "all"}:${initialQuery}`}
          initialQuery={initialQuery}
          initialTopic={initialTopic}
        />
      </main>
      <PublicSiteFooter className={s.articlesFooter} />
    </>
  );
}
