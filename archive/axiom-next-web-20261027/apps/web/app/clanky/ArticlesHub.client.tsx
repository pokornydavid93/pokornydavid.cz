"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  CircleCheck,
  Clock,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import LiquidLinesBackdrop from "@/app/_components/effects/LiquidLinesBackdrop.client";
import flow from "@/app/_components/effects/liquidLines.module.css";
import {
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
} from "@/app/theme/design-primitives";
import type { BlogCategory } from "@/lib/blog";
import frame from "@/app/ui/media/editorialImageFrame.module.css";
import ArticleNavigationLink from "./ArticleNavigationLink.client";
import { articleVisuals } from "./articleVisuals";
import s from "./articles.module.css";

export type ArticleFilterValue = BlogCategory | "prijem";
export type ArticleArchiveFilterValue = ArticleFilterValue | "ostatni";

type DecisionNodeId =
  | "bydleni"
  | "ochrana"
  | "investovani";

export type ArticleLibraryItem = {
  slug: string;
  title: string;
  heroTitle?: string;
  heroTitleAccent?: string;
  excerpt: string;
  hubDescription?: string;
  hubBenefit?: string;
  heroCategoryLabel?: string;
  heroImage?: string;
  heroImageAlt?: string;
  author?: string;
  category: BlogCategory;
  categoryLabel: string;
  filterValue: ArticleFilterValue;
  date?: string;
  readingTime?: string;
  takeaway: string;
  keywords?: string[];
  featured: boolean;
  featuredPriority?: number;
  decisionNode?: DecisionNodeId;
  pathIds?: string[];
};

export type ArticleCategoryOption = {
  value: ArticleArchiveFilterValue;
  label: string;
};

type ArticlesHubProps = {
  articles: ArticleLibraryItem[];
  categories: ArticleCategoryOption[];
  initialQuery: string;
  initialTopic?: ArticleArchiveFilterValue;
};

const FORCED_COLORS_QUERY = "(forced-colors: active)";
const PRIMARY_ARTICLE_FILTERS = new Set<ArticleFilterValue>([
  "hypoteka",
  "pojisteni",
  "prijem",
  "investice",
]);

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("cs-CZ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatReadingTime(readingTime?: string) {
  if (!readingTime) return "Krátké čtení";
  return readingTime.includes("čtení")
    ? readingTime
    : `${readingTime} čtení`;
}

function renderTitleAccent(title: string, accent?: string) {
  const start = accent ? title.indexOf(accent) : -1;
  if (!accent || start < 0) return title;

  return (
    <>
      {title.slice(0, start)}
      <span className={s.heroFeaturedTitleAccent} data-articles-title-accent>
        {accent}
      </span>
      {title.slice(start + accent.length)}
    </>
  );
}

function selectFeaturedArticle(articles: ArticleLibraryItem[]) {
  return (
    articles
      .filter((article) => article.featured)
      .toSorted(
        (left, right) =>
          (left.featuredPriority ?? Number.MAX_SAFE_INTEGER) -
          (right.featuredPriority ?? Number.MAX_SAFE_INTEGER),
      )[0] ?? articles[0]
  );
}

function formatResultCount(count: number) {
  if (count === 1) return "1 výsledek";
  if (count >= 2 && count <= 4) return `${count} výsledky`;
  return `${count} výsledků`;
}

function syncArticleUrl(
  topic: ArticleArchiveFilterValue | undefined,
  query: string,
) {
  const params = new URLSearchParams(window.location.search);
  const trimmedQuery = query.trim();

  params.delete("category");

  if (topic) {
    params.set("topic", topic);
  } else {
    params.delete("topic");
  }

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  } else {
    params.delete("q");
  }

  const search = params.toString();
  const hash =
    window.location.hash === "#latest-articles-title"
      ? "#latest-articles-title"
      : "";

  window.history.replaceState(
    null,
    "",
    `/clanky/${search ? `?${search}` : ""}${hash}`,
  );
}

function ArticleCard({
  article,
  index,
}: {
  article: ArticleLibraryItem;
  index: number;
}) {
  const visual = article.heroImage
    ? { src: article.heroImage }
    : articleVisuals[article.slug];

  return (
    <ArticleNavigationLink
      className={`${s.articleCard} ${article.featured ? s.articleCardFeatured : ""}`}
      data-article-slug={article.slug}
      data-cursor="article"
      data-cursor-icon="external"
      data-cursor-label="OTEVŘÍT ČLÁNEK • ČÍST DÁL •"
      data-cursor-frame-target="[data-cursor-direction]"
      data-cursor-no-magnetic="true"
      href={`/clanky/${article.slug}/`}
    >
      <div
        className={`${s.cardVisual} ${frame.frame} ${visual ? "" : s.cardVisualGenerated}`.trim()}
        aria-hidden="true"
        data-editorial-image
        data-article-card-visual={visual ? "image" : "generated"}
        data-cursor-media
      >
        {visual ? (
          <Image
            className={s.cardVisualImage}
            src={visual.src}
            alt=""
            fill
            loading="lazy"
            sizes="(max-width: 760px) 92vw, (max-width: 1180px) 42vw, 680px"
          />
        ) : (
          <div className={s.cardVisualFallback}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{article.categoryLabel}</strong>
            <i />
          </div>
        )}
      </div>
      <div className={s.cardBody}>
        <div className={s.cardMeta}>
          <span className={s.category}>
            <ShieldCheck aria-hidden="true" />
            {article.categoryLabel}
          </span>
          {article.date ? (
            <span className={s.dateText}>{formatDate(article.date)}</span>
          ) : null}
        </div>
        <h3 className={s.cardTitle}>{article.title}</h3>
        <p className={s.cardExcerpt}>{article.excerpt}</p>
      </div>
      <div className={s.cardDecision}>
        <span className={s.cardIndex} aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className={s.cardTakeaway}>
          <CircleCheck aria-hidden="true" />
          <span className={s.cardTakeawayCopy}>
            <span className={s.cardTakeawayLabel}>Co si ověřit</span>
            {article.takeaway}
          </span>
        </p>
        <div className={s.cardFooter}>
          <span className={s.cardReadingTime}>
            <Clock aria-hidden="true" />
            {article.readingTime}
          </span>
          <span className={s.articleCardAction} data-cursor-direction>
            <span>Číst</span>
            <ArrowUpRight aria-hidden="true" />
          </span>
        </div>
      </div>
    </ArticleNavigationLink>
  );
}

export default function ArticlesHub({
  articles,
  categories,
  initialQuery,
  initialTopic,
}: ArticlesHubProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [activeTopic, setActiveTopic] = useState<
    ArticleArchiveFilterValue | undefined
  >(initialTopic);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;

    const reducedMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    const forcedColors = window.matchMedia(FORCED_COLORS_QUERY);
    const syncMotionState = () => {
      hero.dataset.articlesHeroMotion = reducedMotion.matches
        ? "reduced-motion"
        : forcedColors.matches ? "forced-colors" : "ready";
    };

    syncMotionState();
    reducedMotion.addEventListener("change", syncMotionState);
    forcedColors.addEventListener("change", syncMotionState);

    return () => {
      reducedMotion.removeEventListener("change", syncMotionState);
      forcedColors.removeEventListener("change", syncMotionState);
    };
  }, []);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return articles.filter((article) => {
      const matchesTopic =
        activeTopic === "ostatni"
          ? !PRIMARY_ARTICLE_FILTERS.has(article.filterValue)
          : activeTopic
            ? article.filterValue === activeTopic
            : true;
      if (!matchesTopic) return false;
      if (!normalizedQuery) return true;

      const haystack = normalizeSearch(
        [
          article.title,
          article.excerpt,
          article.hubDescription,
          article.hubBenefit,
          article.categoryLabel,
          article.category,
          article.filterValue,
          article.takeaway,
          article.keywords?.join(" "),
        ].join(" "),
      );

      return haystack.includes(normalizedQuery);
    });
  }, [activeTopic, articles, query]);

  const featuredArticle = useMemo(
    () => selectFeaturedArticle(articles),
    [articles],
  );
  const featuredVisual = featuredArticle
    ? featuredArticle.heroImage
      ? { src: featuredArticle.heroImage, alt: featuredArticle.heroImageAlt }
      : articleVisuals[featuredArticle.slug]
    : undefined;
  const featuredTitleLines = (
    featuredArticle?.heroTitle ?? featuredArticle?.title ?? ""
  )
    .split("\n")
    .filter(Boolean);
  const shouldShowFullLibrary = Boolean(activeTopic || query.trim());
  const displayedArticles = shouldShowFullLibrary || !featuredArticle
    ? filteredArticles
    : filteredArticles.filter((article) => article.slug !== featuredArticle.slug);
  const resultSetKey = `${activeTopic ?? "all"}:${normalizeSearch(query)}`;

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    syncArticleUrl(activeTopic, nextQuery);
  };

  const updateTopic = (nextTopic?: ArticleArchiveFilterValue) => {
    setActiveTopic(nextTopic);
    syncArticleUrl(nextTopic, query);
  };

  const clearFilters = () => {
    setQuery("");
    setActiveTopic(undefined);
    syncArticleUrl(undefined, "");
  };

  return (
    <>
      <section
        ref={heroRef}
        className={s.heroShell}
        aria-labelledby="articles-title"
        data-articles-hero
        data-cursor-surface="dark"
        data-nav-section="dark"
        data-nav-section-expand="top"
      >
        <LiquidLinesBackdrop />
        <div className={`${s.heroContent} ${flow.content}`}>
          <div
            className={s.heroRouteHeader}
            data-articles-hero-route
            data-route-hero-entry="0"
          >
            <p className={s.eyebrow}>Články z praxe</p>
            <Link className={s.heroIndexLink} href="#latest-articles-title">
              <span>Procházet všechny články</span>
              <ArrowDown aria-hidden="true" />
            </Link>
          </div>

          {featuredArticle && featuredVisual ? (
            <article
              className={s.heroFeaturedArticle}
              aria-labelledby="articles-title"
              data-articles-featured
            >
              <ArticleNavigationLink
                className={s.heroFeaturedVisual}
                data-articles-hero-visual
                data-route-hero-entry="1"
                data-route-hero-entry-kind="visual"
                data-cursor="article"
                data-cursor-icon="external"
                data-cursor-label="OTEVŘÍT ČLÁNEK • ČÍST DÁL •"
                data-cursor-no-magnetic="true"
                data-cursor-media
                href={`/clanky/${featuredArticle.slug}/`}
                aria-label={`Otevřít doporučený článek: ${featuredArticle.title}`}
              >
                <span
                  className={`${frame.frame} ${frame.fill}`}
                  data-editorial-image
                >
                  <Image
                    className={s.heroFeaturedImage}
                    src={featuredVisual.src}
                    alt={
                      featuredArticle.heroImageAlt ??
                      featuredVisual.alt ??
                      `Ilustrace k článku: ${featuredArticle.title}`
                    }
                    fill
                    priority
                    quality={90}
                    sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1120px) calc(100vw - 80px), 50vw"
                  />
                </span>
              </ArticleNavigationLink>

              <div className={s.heroFeaturedStory}>
                <span
                  className={s.heroFeaturedCategory}
                  data-articles-hero-part
                  data-articles-hero-category
                  data-route-hero-entry="1"
                >
                  <ShieldCheck aria-hidden="true" />
                  Doporučená kontrola ·{" "}
                  {featuredArticle.heroCategoryLabel ??
                    featuredArticle.categoryLabel}
                </span>
                <h1
                  id="articles-title"
                  className={s.heroFeaturedTitle}
                  data-articles-hero-part
                  data-articles-hero-title
                  data-route-hero-entry="2"
                >
                  {featuredTitleLines.map((line, index) => (
                    <span
                      className={`${s.heroFeaturedTitleLine} ${featuredTitleLines.length > 1
                        ? index === 0 ? s.heroFeaturedTitleIntro : s.heroFeaturedTitleEmphasis
                        : ""}`}
                      key={line}
                    >
                      {renderTitleAccent(line, featuredArticle.heroTitleAccent)}
                      {index < featuredTitleLines.length - 1 ? " " : null}
                    </span>
                  ))}
                </h1>
                <p
                  className={s.heroFeaturedDescription}
                  data-articles-hero-part
                  data-articles-hero-description
                  data-route-hero-entry="3"
                >
                  {featuredArticle.hubDescription ?? featuredArticle.excerpt}
                </p>
              </div>

              <p
                className={s.heroFeaturedCheck}
                data-articles-hero-part
                data-articles-hero-benefit
                data-route-hero-entry="4"
              >
                <CircleCheck aria-hidden="true" />
                <span className={s.heroFeaturedCheckCopy}>
                  <span className={s.heroFeaturedCheckLabel}>Co si v článku ověříte</span>
                  <span>{featuredArticle.hubBenefit ?? featuredArticle.takeaway}</span>
                </span>
              </p>

              <footer
                className={s.heroFeaturedFooter}
                data-articles-hero-footer
              >
                <div
                  className={s.heroFeaturedMeta}
                  data-articles-hero-part
                  data-route-hero-entry="5"
                >
                  <span>{featuredArticle.author ?? "David Pokorný"}</span>
                  <span>
                    <Clock aria-hidden="true" />
                    {formatReadingTime(featuredArticle.readingTime)}
                  </span>
                </div>
                <ArticleNavigationLink
                  className={s.heroFeaturedRead}
                  data-articles-hero-part
                  data-route-hero-entry="6"
                  href={`/clanky/${featuredArticle.slug}/`}
                  aria-label={`Číst článek: ${featuredArticle.title}`}
                >
                  Číst článek
                  <span className={s.heroFeaturedReadIcon} aria-hidden="true">
                    <ArrowUpRight />
                  </span>
                </ArticleNavigationLink>
              </footer>
            </article>
          ) : null}
        </div>
      </section>

      <section
        className={s.gridSection}
        aria-labelledby="latest-articles-title"
        data-cursor-surface="light"
        data-nav-theme="light"
      >
        <div className={s.articleIndexShell}>
          <header
            className={s.articleGridHeader}
            data-article-archive-intro
          >
            <span className={s.articleGridKicker}>Všechny články</span>
            <h2 id="latest-articles-title" className={s.articleGridTitle}>
              Co si ověřit, než se rozhodnete.
            </h2>
            <p className={s.articleGridLead}>
              Praktické články podle situace, kterou právě řešíte.
            </p>
          </header>

          <div
            className={s.articleArchiveToolbar}
            data-article-toolbar
            data-header-motion-sticky
          >
            <div
              className={s.filterRow}
              role="group"
              aria-label="Filtrovat články podle tématu"
              data-article-filter-row
              data-header-motion-sticky
            >
              <button
                className={`${s.filterPill} ${!activeTopic ? s.filterPillActive : ""}`}
                type="button"
                aria-pressed={!activeTopic}
                onClick={() => updateTopic(undefined)}
              >
                Všechny
              </button>
              {categories.map((category) => (
                <button
                  className={`${s.filterPill} ${
                    activeTopic === category.value ? s.filterPillActive : ""
                  }`}
                  type="button"
                  aria-pressed={activeTopic === category.value}
                  onClick={() => updateTopic(category.value)}
                  key={category.value}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <span className={s.articleResultCount} aria-live="polite">
              {formatResultCount(displayedArticles.length)}
            </span>

            <label
              className={s.librarySearchField}
              htmlFor="article-library-search"
            >
              <span className={s.visuallyHidden}>Hledat v článcích</span>
              <Search aria-hidden="true" />
              <input
                autoComplete="off"
                id="article-library-search"
                name="article-query"
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Hledat téma nebo situaci…"
                aria-controls="article-results"
                spellCheck={false}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => updateQuery("")}
                  aria-label="Vymazat hledání"
                >
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </label>
          </div>

          {displayedArticles.length > 0 ? (
            <div
              className={`${s.articleGrid} ${s.articleResultsTransition}`}
              id="article-results"
              aria-label="Seznam článků"
              key={resultSetKey}
            >
              {displayedArticles.map((article, index) => (
                <ArticleCard
                  key={article.slug}
                  article={article}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div
              className={`${s.emptyState} ${s.articleResultsTransition}`}
              id="article-results"
              key={resultSetKey}
            >
              <p role="status">
                Pro zadané téma tu není žádný článek.
              </p>
              <p>
                Zkuste jiný výraz nebo zobrazte všechny články.
              </p>
              <button
                type="button"
                className={s.emptyStateButton}
                onClick={clearFilters}
              >
                Zobrazit všechny
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
