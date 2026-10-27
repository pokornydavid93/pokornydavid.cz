import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  PublicSiteFooter,
  PublicSiteHeader,
} from "@/app/_components/PublicSiteChrome";
import Container from "@/app/ui/container/Container";
import frame from "@/app/ui/media/editorialImageFrame.module.css";
import ArticleContextRail from "../ArticleContextRail.client";
import ArticleAuthorNote from "../ArticleAuthorNote";
import ArticleEditorialRenderer from "../ArticleEditorialRenderer";
import ArticleNavigationLink from "../ArticleNavigationLink.client";
import ArticleRelatedStories from "../ArticleRelatedStories";
import ArticleStickyRail from "../ArticleStickyRail.client";
import { getArticleVisual } from "../articleVisuals";
import { getArticleConversionContext } from "../articleLeadContext";
import {
  categoryLabels,
  type BlogQuickCheck,
  type BlogArticleSection,
  type BlogPostMeta,
} from "@/lib/blog";
import {
  getArticleBySlug,
  getArticlePageProjection,
  getArticleStaticParams,
} from "@/lib/article-content.server";
import { getLeadTopic } from "@/lib/article-document-adapter";
import { createPageMetadata, getCanonicalUrl, getSiteAssetUrl, serializeJsonLd, SITE_NAME } from "@/lib/seo";
import { createArticleJsonLd } from "@/lib/article-seo";
import s from "../articles.module.css";
import e from "../articleRenderer.module.css";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

const defaultQuickCheck: BlogQuickCheck = {
  title: "CO SI OVĚŘÍTE",
  intro: "Než uděláte další krok, projděte si hlavní souvislosti rozhodnutí.",
  items: [
    "co je pro vaši situaci opravdu podstatné",
    "jaký dopad může mít další krok na domácnost",
    "kde má smysl udělat kontrolu před podpisem",
  ],
  ctaLabel: "Přejít na kontrolu ↗",
  ctaHref: "#kontrola",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatHeroReadingTime(readingTime?: string) {
  if (!readingTime) return "krátké čtení";
  return readingTime.includes("čtení") ? readingTime : `${readingTime} čtení`;
}

function getArticleImageUrl(post: BlogPostMeta) {
  const image = post.socialImage ?? post.heroImage ?? getArticleVisual(post.slug)?.src;
  return getSiteAssetUrl(image);
}

function ArticleHero({
  post,
  visualSrc,
}: {
  post: BlogPostMeta;
  visualSrc?: string;
}) {
  const heroTitle = (post.heroTitle ?? post.title)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return (
    <header
      className={`${s.articleDetailHero} ${e.heroScene}`}
      data-nav-section="light"
      data-nav-section-expand="top"
    >
      <Container
        className={`${s.detailHeroInner} ${e.heroSceneInner}`}
        maxWidth={1240}
      >
        <nav
          className={`${s.breadcrumbs} ${e.heroBreadcrumbs}`}
          aria-label="Drobečková navigace"
        >
          <ArticleNavigationLink
            className={`${s.textLink} ${s.backLink}`}
            href="/clanky/"
          >
            Články
          </ArticleNavigationLink>
          <span aria-hidden="true">/</span>
          <span>{categoryLabels[post.category]}</span>
        </nav>

        <div className={e.heroStage}>
          <div className={e.heroHeadline} data-article-hero-headline>
            <h1 className={`${s.detailTitle} ${e.heroTitle}`} id="article-title">
              {heroTitle}
            </h1>
          </div>

          <div className={e.heroIntro} data-article-hero-intro>
            <p className={s.detailLead}>{post.heroExcerpt ?? post.excerpt}</p>
            <div className={`${s.detailMeta} ${e.heroMeta}`}>
              <ArticleNavigationLink className={e.heroAuthor} href="/kdo-jsem/" rel="author">
                {post.author ?? "David Pokorný"}
              </ArticleNavigationLink>
              {post.updatedAt && post.updatedAt !== post.date ? (
                <span className={e.heroMetaItem}>
                  <span>Aktualizováno <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></span>
                </span>
              ) : post.date ? (
                <span className={e.heroMetaItem}>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </span>
              ) : null}
              {post.readingTime ? (
                <span className={`${e.heroMetaItem} ${e.heroReadTime}`}>
                  <span>{formatHeroReadingTime(post.readingTime)}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className={e.heroVisual} data-article-hero-visual>
            <div
              className={`${e.heroVisualImage} ${frame.frame}`}
              aria-hidden="true"
              data-editorial-image
            >
              {visualSrc ? (
                <Image
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1279px) calc(100vw - 40px), 1240px"
                  src={visualSrc}
                />
              ) : (
                <div
                  className={e.heroVisualFallback}
                  data-article-hero-visual-fallback
                >
                  <strong>{post.heroCategoryLabel ?? categoryLabels[post.category]}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}

function ArticleReadingIndex({
  quickCheck,
  sections,
}: {
  quickCheck: BlogQuickCheck;
  sections?: BlogArticleSection[];
}) {
  const mapSections = sections ?? [];
  const count = mapSections.length || quickCheck.items.length;

  return (
    <nav
      aria-label="Mapa čtení článku"
      className={e.articleReadingIndex}
      data-article-hero-summary
      data-article-reading-index
    >
      <details>
        <summary>
          <span>Obsah článku</span>
          <span>{count} částí</span>
        </summary>
        <ol>
          {mapSections.length > 0
            ? mapSections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {section.title}
                  </a>
                </li>
              ))
            : quickCheck.items.map((item, index) => (
                <li key={item}>
                  <span>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {item}
                  </span>
                </li>
              ))}
        </ol>
      </details>
    </nav>
  );
}

export async function generateStaticParams() {
  return getArticleStaticParams();
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticleBySlug(slug);

  if (!post) notFound();

  return createPageMetadata({
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    path: `/clanky/${post.slug}/`,
    canonical: post.seoCanonical,
    socialTitle: post.socialTitle,
    socialDescription: post.socialDescription,
    socialImage: getArticleImageUrl(post),
    robots: {
      index: post.seoIndex !== false,
      follow: post.seoFollow !== false,
    },
    openGraphType: "article",
    article: {
      ...(post.date ? { publishedTime: post.date } : {}),
      ...(post.updatedAt || post.date
        ? { modifiedTime: post.updatedAt ?? post.date }
        : {}),
      authors: (post.author ?? SITE_NAME) === SITE_NAME
        ? [getCanonicalUrl("/kdo-jsem/")]
        : undefined,
    },
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const { post, relatedPosts } = await getArticlePageProjection(slug);

  if (!post) notFound();

  const articleAside = post.aside?.type === "screeningRail" ? post.aside : null;
  const quickCheck = post.quickCheck ?? defaultQuickCheck;
  const articleVisual = getArticleVisual(post.slug);
  const finalAction = post.sections?.at(-1)?.blocks.find(
    (block) => block.type === "nextAction",
  );
  const finalActionInAuthorNote =
    (post.author ?? "David Pokorný") === "David Pokorný" && Boolean(finalAction);

  return (
    <>
      <PublicSiteHeader
        className={e.editorialSiteHeader}
        currentPath="/clanky/"
        initialTheme="light"
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={`${s.articlePage} ${s.articleDetailPage}`}
        data-page-theme="article-detail-editorial"
        data-surface-tone="light"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(createArticleJsonLd(post, getArticleImageUrl(post))),
          }}
        />
        <ArticleHero
          post={post}
          visualSrc={post.heroImage ?? articleVisual?.src}
        />

        <section
          className={`${s.articleDetailContent} ${s.articleDetailContentLight} ${e.editorialContent}`}
          data-article-layout="canonical"
          data-has-sections={post.sections?.length ? "true" : "false"}
          data-nav-section="light"
        >
          <Container className={s.detailContentInner} maxWidth={1240}>
            <ArticleReadingIndex
              quickCheck={quickCheck}
              sections={post.sections}
            />
            <div
              className={
                post.sections?.length
                  ? e.semanticShell
                  : `${s.articleShell} ${
                      articleAside ? "" : s.articleShellWithoutAside
                    } ${s.editorialArticleShell}`.trim()
              }
            >
              <article
                aria-labelledby="article-title"
                className={`${s.articleBody} ${
                  post.sections?.length ? e.semanticBody : ""
                }`.trim()}
                data-article-renderer="canonical"
              >
                <ArticleEditorialRenderer
                  aside={articleAside}
                  blocks={post.articleBlocks}
                  content={post.content}
                  finalActionInAuthorNote={finalActionInAuthorNote}
                  flow={post.articleFlow}
                  post={post}
                  sections={post.sections}
                />
              </article>

              {post.sections?.length ? (
                <ArticleContextRail sections={post.sections} />
              ) : articleAside ? (
                <ArticleStickyRail aside={articleAside} />
              ) : null}
            </div>

            <ArticleAuthorNote
              author={post.author}
              finalAction={finalActionInAuthorNote ? finalAction : undefined}
              leadContext={getArticleConversionContext(post)}
              leadTopic={getLeadTopic(post.category)}
            />
            <ArticleRelatedStories relatedPosts={relatedPosts} />

          </Container>
        </section>
      </main>
      <PublicSiteFooter />
    </>
  );
}
