import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import frame from "@/app/ui/media/editorialImageFrame.module.css";
import ArticleNavigationLink from "../../clanky/ArticleNavigationLink.client";
import s from "../../homepage.module.css";

export type HomeEditorialArticle = {
  slug: string;
  title: string;
  excerpt: string;
  categoryLabel: string;
  readingTime: string;
  imageSrc: string;
  imageAlt: string;
  landingRole: "primary" | "secondary";
  landingOrder: number;
};

type HomeArticlesEditorialProps = {
  articles: [
    HomeEditorialArticle,
    HomeEditorialArticle,
    HomeEditorialArticle,
  ];
};

function getAccessibleTitle(title: string) {
  return title.replace(/\s+/gu, " ").trim();
}

function ArticleMeta({ article }: { article: HomeEditorialArticle }) {
  return (
    <p className={s.insightsArticleMeta} data-home-article-meta>
      <ArticleIndex article={article} />
      <span className={s.insightsArticleCategory}>{article.categoryLabel}</span>
      <span
        aria-hidden="true"
        className={s.insightsMetaDivider}
        data-home-article-meta-divider
      />
      <span className={s.insightsArticleTime}>{article.readingTime}</span>
    </p>
  );
}

function ArticleIndex({ article }: { article: HomeEditorialArticle }) {
  return (
    <span
      aria-hidden="true"
      className={s.insightsArticleIndex}
      data-home-article-index
    >
      {String(article.landingOrder + 1).padStart(2, "0")}
    </span>
  );
}

function ArticleTitle({ title }: { title: string }) {
  const lines = title
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <h3 aria-label={getAccessibleTitle(title)} data-home-article-title>
      {lines.map((line, lineIndex) => (
        <span
          aria-hidden="true"
          className={
            lineIndex === lines.length - 1
              ? s.insightsArticleTitlePayoff
              : s.insightsArticleTitleLine
          }
          data-home-article-title-line={lineIndex + 1}
          key={`${line}-${lineIndex}`}
        >
          {line}
        </span>
      ))}
    </h3>
  );
}

function FeaturedArticle({ article }: { article: HomeEditorialArticle }) {
  const accessibleTitle = getAccessibleTitle(article.title);

  return (
    <article
      className={s.insightsFeatured}
      data-home-article={article.slug}
      data-home-article-featured="true"
      data-home-article-reveal="primary"
      data-home-article-role="primary"
    >
      <ArticleNavigationLink
        aria-label={`Přečíst článek: ${accessibleTitle}`}
        className={s.insightsArticleLink}
        data-cursor="article"
        data-cursor-icon="external"
        data-cursor-label="OTEVŘÍT ČLÁNEK • ČÍST DÁL •"
        data-cursor-no-frame="true"
        data-cursor-no-magnetic="true"
        href={`/clanky/${article.slug}/`}
        variant="text"
      >
        <figure
          className={s.insightsMedia}
          data-cursor-media
          data-home-article-media={article.slug}
          data-home-article-media-reveal="primary"
        >
          <div className={`${frame.frame} ${frame.fill}`} data-editorial-image>
            <Image
              alt={article.imageAlt}
              className={s.insightsImage}
              fill
              loading="lazy"
              sizes="(max-width: 720px) calc(100vw - 2.5rem), (max-width: 1050px) calc(100vw - 5rem), (min-width: 1850px) 920px, 61vw"
              src={article.imageSrc}
            />
          </div>
        </figure>

        <div
          className={s.insightsArticleCopy}
          data-home-article-copy-reveal="primary"
        >
          <div className={s.insightsFeaturedHeading}>
            <ArticleMeta article={article} />
            <ArticleTitle title={article.title} />
          </div>
          <div className={s.insightsFeaturedDetails}>
            <p className={s.insightsExcerpt}>{article.excerpt}</p>
            <span
              aria-hidden="true"
              className={s.insightsArticleAction}
              data-cursor="article"
              data-cursor-direction
              data-cursor-icon="external"
              data-cursor-magnetic="true"
              data-home-article-action
            >
              <span className={s.insightsArticleActionLabel}>Číst článek</span>
              <span className={s.insightsArticleActionIcon}>
                <ArrowUpRight aria-hidden="true" />
              </span>
            </span>
          </div>
        </div>
      </ArticleNavigationLink>
    </article>
  );
}

function SupportingArticle({ article }: { article: HomeEditorialArticle }) {
  const accessibleTitle = getAccessibleTitle(article.title);

  return (
    <article
      className={s.insightsSupportingArticle}
      data-home-article={article.slug}
      data-home-article-reveal="secondary"
      data-home-article-role="secondary"
    >
      <ArticleNavigationLink
        aria-label={`Přečíst článek: ${accessibleTitle}`}
        className={s.insightsArticleLink}
        data-cursor="article"
        data-cursor-icon="external"
        data-cursor-label="OTEVŘÍT ČLÁNEK • ČÍST DÁL •"
        data-cursor-no-frame="true"
        data-cursor-no-magnetic="true"
        href={`/clanky/${article.slug}/`}
        variant="text"
      >
        <figure
          className={s.insightsMedia}
          data-cursor-media
          data-home-article-media={article.slug}
          data-home-article-media-reveal="secondary"
        >
          <div
            className={`${frame.frame} ${frame.compact} ${frame.fill}`}
            data-editorial-image
          >
            <Image
              alt={article.imageAlt}
              className={s.insightsImage}
              fill
              loading="lazy"
              sizes="(max-width: 520px) calc(100vw - 2.5rem), (max-width: 1050px) 46vw, (min-width: 1850px) 560px, 34vw"
              src={article.imageSrc}
            />
          </div>
        </figure>

        <div
          className={s.insightsArticleCopy}
          data-home-article-copy-reveal="secondary"
        >
          <ArticleMeta article={article} />
          <ArticleTitle title={article.title} />
          <div className={s.insightsSupportingFooter}>
            <p className={s.insightsExcerpt}>{article.excerpt}</p>
            <span
              aria-hidden="true"
              className={s.insightsArticleAction}
              data-cursor="article"
              data-cursor-direction
              data-cursor-icon="external"
              data-cursor-magnetic="true"
              data-home-article-action
            >
              <span className={s.insightsArticleActionLabel}>Číst článek</span>
              <span className={s.insightsArticleActionIcon}>
                <ArrowUpRight aria-hidden="true" />
              </span>
            </span>
          </div>
        </div>
      </ArticleNavigationLink>
    </article>
  );
}

export default function HomeArticlesEditorial({
  articles,
}: HomeArticlesEditorialProps) {
  const orderedArticles = articles.toSorted(
    (left, right) => left.landingOrder - right.landingOrder,
  );
  const featuredArticle = orderedArticles.find(
    ({ landingRole }) => landingRole === "primary",
  ) ?? orderedArticles[0];
  const supportingArticles = orderedArticles.filter(
    ({ slug }) => slug !== featuredArticle.slug,
  );

  return (
    <div
      className={s.insightsLayout}
      data-home-articles-layout
      data-home-articles-stage
    >
      <FeaturedArticle article={featuredArticle} />
      <div className={s.insightsSupporting} data-home-articles-supporting>
        {supportingArticles.map((article) => (
          <SupportingArticle article={article} key={article.slug} />
        ))}
      </div>
    </div>
  );
}
