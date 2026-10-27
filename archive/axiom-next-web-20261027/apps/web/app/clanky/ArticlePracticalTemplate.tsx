import type {
  BlogArticleCaseStudy,
  BlogArticleChecklist,
  BlogArticleComparison,
  BlogArticleFlow,
  BlogArticleIntroBlock,
  BlogArticleScenarioSection,
  BlogArticleScreeningRailAside,
  BlogArticleSummary,
  BlogArticleTextSection,
  BlogPostMeta,
} from "@/lib/blog";
import ArticleConversionRail from "./ArticleConversionRail";
import ArticleLeadButton from "./ArticleLeadButton.client";
import ArticleScreeningEmbed from "./ArticleScreeningEmbed.client";
import { getArticleConversionBlock } from "./articleConversionBlocks";
import { getArticleScreeningConfig } from "./articleScreeningConfigs";
import s from "./articles.module.css";

type ArticlePracticalTemplateProps = {
  aside?: BlogArticleScreeningRailAside | null;
  flow: BlogArticleFlow;
  post: BlogPostMeta;
};

function ArticleIntro({ intro }: { intro: BlogArticleIntroBlock }) {
  return (
    <section className={s.articleIntro} data-article-block={intro.type}>
      {intro.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

function ArticleTextSection({ section }: { section: BlogArticleTextSection }) {
  return (
    <section className={s.articleSection} data-article-block="section">
      {section.title ? <h2>{section.title}</h2> : null}
      {section.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

function ArticleChecklist({ checklist }: { checklist: BlogArticleChecklist }) {
  return (
    <section className={s.articleChecklist} id={checklist.id}>
      {checklist.kicker ? (
        <span className={s.articleBlockKicker}>{checklist.kicker}</span>
      ) : null}
      <h3>{checklist.title}</h3>
      <ul>
        {checklist.items.map((item) => (
          <li key={item}>
            <span aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleComparisonTable({
  comparison,
}: {
  comparison: BlogArticleComparison;
}) {
  return (
    <>
      <h2>{comparison.title}</h2>
      <div className={s.articleComparisonTable} role="table">
        <div
          className={`${s.articleComparisonRow} ${s.articleComparisonHead}`}
          role="row"
        >
          <span role="columnheader">Co porovnat</span>
          <span role="columnheader">Proč na tom záleží</span>
        </div>
        {comparison.rows.map((row) => (
          <div className={s.articleComparisonRow} role="row" key={row.label}>
            <strong role="cell">{row.label}</strong>
            <p role="cell">{row.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function ArticleScreening({
  flow,
  post,
}: ArticlePracticalTemplateProps) {
  if (!flow.screening) return null;

  const config = getArticleScreeningConfig(flow.screening.type);
  if (!config) return null;

  return (
    <ArticleScreeningEmbed
      articleSlug={post.slug}
      config={config}
      id="screening"
    />
  );
}

function ArticleScenarioCards({
  scenarios,
}: {
  scenarios: BlogArticleScenarioSection;
}) {
  return (
    <>
      <h2>{scenarios.title}</h2>
      <div className={s.articleScenarioGrid}>
        {scenarios.items.map((card, index) => (
          <article className={s.articleScenarioCard} key={card.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function ArticleCaseCard({ caseStudy }: { caseStudy: BlogArticleCaseStudy }) {
  return (
    <>
      <h2>{caseStudy.title}</h2>
      <aside className={s.articleCaseCard}>
        <div className={s.articleCaseMetrics}>
          {caseStudy.metrics.map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
        <p>{caseStudy.text}</p>
      </aside>
    </>
  );
}

function ArticleSummary({ summary }: { summary: BlogArticleSummary }) {
  return (
    <aside className={s.articleSummaryCard}>
      <h3>{summary.title}</h3>
      <ul>
        {summary.items.map((item) => (
          <li key={item}>
            <span aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ArticleFinalCTA({ flow }: { flow: BlogArticleFlow }) {
  const conversionId = flow.finalCta?.conversionId ?? flow.screening?.conversionId;
  const block = getArticleConversionBlock(conversionId);

  return (
    <aside className={s.finalArticleCta} data-surface-tone="action">
      <span className={s.inlineCtaLabel}>Další krok</span>
      <h3>{block.finalCta.title}</h3>
      {block.finalCta.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <ArticleLeadButton
        cta="article-final"
        conversionId={conversionId}
        className={s.articleCtaButton}
        label={block.finalCta.buttonLabel}
        topic={block.leadTopic}
      />
    </aside>
  );
}

export default function ArticlePracticalTemplate({
  aside,
  flow,
  post,
}: ArticlePracticalTemplateProps) {
  return (
    <>
      <ArticleIntro intro={flow.intro} />

      {aside ? (
        <div className={s.articleMobileRail}>
          <ArticleConversionRail
            aside={aside}
            headingId="article-mobile-conversion-rail-title"
          />
        </div>
      ) : null}

      <ArticleTextSection section={flow.problem} />
      <ArticleChecklist checklist={flow.checklist} />
      <ArticleComparisonTable comparison={flow.comparison} />
      <ArticleScreening flow={flow} post={post} />
      <ArticleScenarioCards scenarios={flow.scenarios} />
      <ArticleCaseCard caseStudy={flow.caseStudy} />
      <ArticleTextSection section={flow.closing} />
      <ArticleSummary summary={flow.summary} />
      <ArticleFinalCTA flow={flow} />
    </>
  );
}
