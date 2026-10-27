/* eslint-disable @next/next/no-img-element -- Article media sources are dynamic canonical workspace assets. */
import type {
  BlogArticleBlock,
  BlogArticleConversionMarkerBlock,
  BlogArticleFlow,
  BlogArticleSemanticComparisonBlock,
  BlogArticleSection,
  BlogArticleScreeningRailAside,
  BlogSemanticArticleBlock,
  BlogPostMeta,
} from "@/lib/blog";
import { getLeadTopic } from "@/lib/article-document-adapter";
import dynamic from "next/dynamic";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";
import type { ArticleRichTextNode, ArticleStudioBlock } from "@axiom-dp/contracts/article";
import ArticleConversionRail from "./ArticleConversionRail";
import ArticleLeadButton from "./ArticleLeadButton.client";
import { getArticleConversionBlock } from "./articleConversionBlocks";
import { getArticleConversionContext } from "./articleLeadContext";
import { createArticleMdxComponents } from "./articleMdxComponents";
import { getArticleScreeningConfig } from "./articleScreeningConfigs";
import s from "./articles.module.css";
import e from "./articleRenderer.module.css";

const ArticleScreeningEmbed = dynamic(
  () => import("./ArticleScreeningEmbed.client"),
  {
    loading: () => (
      <div className={e.toolLoading} aria-hidden="true">
        Připravuji rychlou kontrolu…
      </div>
    ),
  },
);

type ArticleEditorialRendererProps = {
  aside?: BlogArticleScreeningRailAside | null;
  blocks?: BlogArticleBlock[];
  content: string;
  finalActionInAuthorNote?: boolean;
  flow?: BlogArticleFlow;
  post: BlogPostMeta;
  sections?: BlogArticleSection[];
};

type ComparisonItem = NonNullable<BlogArticleSemanticComparisonBlock["items"]>[number];

function getAlignedComparisonRows(items: ComparisonItem[]) {
  if (
    items.length !== 2 ||
    items[0].points.length < 2 ||
    items[0].points.length !== items[1].points.length
  ) {
    return null;
  }

  const rows = items[0].points.map((point, index) => {
    const firstSeparator = point.indexOf(": ");
    const secondPoint = items[1].points[index];
    const secondSeparator = secondPoint.indexOf(": ");

    if (
      firstSeparator < 2 ||
      firstSeparator > 40 ||
      secondSeparator !== firstSeparator
    ) return null;

    const criterion = point.slice(0, firstSeparator);
    if (criterion !== secondPoint.slice(0, secondSeparator)) return null;

    const first = point.slice(firstSeparator + 2).trim();
    const second = secondPoint.slice(secondSeparator + 2).trim();
    return first && second ? { criterion, first, second } : null;
  });

  return rows.every((row) => row !== null) ? rows : null;
}

function SemanticScreening({
  block,
  post,
}: {
  block: Extract<BlogSemanticArticleBlock, { type: "interactiveTool" }>;
  post: BlogPostMeta;
}) {
  if (block.tool !== "screening") return null;

  const config = getArticleScreeningConfig(block.screeningType);
  if (!config) return null;

  return (
    <div className={e.tool} data-article-semantic-block="interactiveTool">
      <ArticleScreeningEmbed
        articleSlug={post.slug}
        config={{
          ...config,
          title: block.title ?? config.title,
          text: block.text ?? config.text,
        }}
        id={block.id ?? "screening"}
      />
    </div>
  );
}

function SemanticNextAction({
  block,
  post,
}: {
  block: Extract<BlogSemanticArticleBlock, { type: "nextAction" }>;
  post: BlogPostMeta;
}) {
  const categoryTopic = getLeadTopic(post.category);

  return (
    <aside
      className={e.nextAction}
      data-article-semantic-block="nextAction"
      data-suppress-sticky-cta
    >
      <span>{block.eyebrow ?? "Další krok"}</span>
      <h3>{block.title}</h3>
      {block.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <ArticleLeadButton
        cta="article-inline"
        className={e.nextActionButton}
        docked
        label={block.buttonLabel}
        topic={block.leadTopic !== categoryTopic ? block.leadTopic : undefined}
        fallbackTopic={categoryTopic}
        conversionId={block.conversionId}
        inheritedContext={getArticleConversionContext(post)}
      />
    </aside>
  );
}

function safeArticleHref(value: string): string | null {
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function RichTextNodeView({ node, nodeKey }: { node: ArticleRichTextNode; nodeKey: string }) {
  if (node.type === "text") {
    let content: ReactNode = node.text ?? "";
    for (const [index, mark] of (node.marks ?? []).entries()) {
      const key = `${nodeKey}-mark-${index}`;
      if (mark.type === "bold") content = <strong key={key}>{content}</strong>;
      else if (mark.type === "italic") content = <em key={key}>{content}</em>;
      else if (mark.type === "underline") content = <u key={key}>{content}</u>;
      else if (mark.type === "code") content = <code key={key}>{content}</code>;
      else if (mark.type === "highlight") content = <mark key={key}>{content}</mark>;
      else if (mark.type === "link") {
        const href = safeArticleHref(mark.attrs?.href ?? "");
        content = href ? <a href={href} key={key} rel={mark.attrs?.rel}>{content}</a> : content;
      }
    }
    return <>{content}</>;
  }
  if (node.type === "hardBreak") return <br />;
  const children = (node.content ?? []).map((child, index) => (
    <RichTextNodeView key={`${nodeKey}-${index}`} node={child} nodeKey={`${nodeKey}-${index}`} />
  ));
  if (node.type === "paragraph") return <p>{children}</p>;
  if (node.type === "heading") return node.attrs?.level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
  if (node.type === "bulletList") return <ul>{children}</ul>;
  if (node.type === "orderedList") return <ol start={node.attrs?.start}>{children}</ol>;
  if (node.type === "listItem") return <li>{children}</li>;
  if (node.type === "blockquote") return <blockquote>{children}</blockquote>;
  if (node.type === "codeBlock") return <pre><code>{children}</code></pre>;
  return <>{children}</>;
}

function RichTextView({ document }: { document: ArticleRichTextNode }) {
  return <>{(document.content ?? []).map((node, index) => (
    <RichTextNodeView key={`rich-${index}`} node={node} nodeKey={`rich-${index}`} />
  ))}</>;
}

function supportedEmbedURL(value: string, provider?: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (provider === "youtube" || url.hostname.endsWith("youtube.com") || url.hostname === "youtu.be") {
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.split("/").at(-1);
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (provider === "vimeo" || url.hostname.endsWith("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).at(-1);
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
    }
    if (provider === "spotify" && url.hostname.endsWith("spotify.com")) {
      return `https://open.spotify.com/embed${url.pathname}`;
    }
  } catch {
    return null;
  }
  return null;
}

function FinancialValue({ value }: { value: string }) {
  const measuredValue = value.match(
    /^((?:≈\s*)?\d[\d\s.,]*(?:mil\.\s*)?(?:Kč|%))(.*)$/u,
  );

  if (!measuredValue) return <>{value}</>;

  return (
    <>
      <span className={e.financialAmount}>
        {measuredValue[1].replace(/\s+/gu, "\u00a0")}
      </span>
      {measuredValue[2]}
    </>
  );
}

function isMeasuredValue(value: string) {
  return /^(?:≈\s*)?\d/u.test(value);
}

function StudioArticleBlock({ block }: { block: ArticleStudioBlock }) {
  const className = `${e.studioBlock} ${e[`studioLayout_${block.layout ?? "normal"}`] ?? ""}`;
  if (block.type === "paragraph" || block.type === "richText" || block.type === "heading" || block.type === "list") {
    return <div className={className}><RichTextView document={block.content} /></div>;
  }
  if (block.type === "quote") return <blockquote className={`${className} ${e.studioQuote}`}><RichTextView document={block.content} />{block.attribution ? <cite>{block.attribution}</cite> : null}</blockquote>;
  if (block.type === "divider") return <hr className={`${className} ${e.studioDivider}`} />;
  if (block.type === "table") return <figure className={className}>{block.caption ? <figcaption>{block.caption}</figcaption> : null}<div className={e.studioTableScroll}><table><tbody>{block.rows.map((row, rowIndex) => { const Cell = block.hasHeader && rowIndex === 0 ? "th" : "td"; return <tr key={`${block.id}-${rowIndex}`}>{row.map((cell, cellIndex) => <Cell key={`${block.id}-${rowIndex}-${cellIndex}`}>{cell}</Cell>)}</tr>; })}</tbody></table></div></figure>;
  if (block.type === "image") return <figure className={className}>{block.link && safeArticleHref(block.link) ? <a href={safeArticleHref(block.link) ?? undefined}><img alt={block.alt} loading="lazy" src={block.asset.url} style={{ aspectRatio: block.aspectRatio, objectFit: block.fit, objectPosition: block.focalPoint ? `${block.focalPoint.x * 100}% ${block.focalPoint.y * 100}%` : undefined }} /></a> : <img alt={block.alt} loading="lazy" src={block.asset.url} style={{ aspectRatio: block.aspectRatio, objectFit: block.fit, objectPosition: block.focalPoint ? `${block.focalPoint.x * 100}% ${block.focalPoint.y * 100}%` : undefined }} />}{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
  if (block.type === "gallery") return <figure className={className}><div className={e.studioGallery}>{block.images.map((image) => <figure key={image.asset.assetId}><img alt={image.alt} loading="lazy" src={image.asset.url} />{image.caption ? <figcaption>{image.caption}</figcaption> : null}</figure>)}</div>{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
  if (block.type === "video") {
    const url = block.source.url ?? block.source.asset?.url ?? "";
    const embed = block.source.kind === "asset" ? null : supportedEmbedURL(url, block.source.kind);
    return <figure className={className}>{embed ? <iframe allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" src={embed} title={block.caption ?? "Video"} /> : <video autoPlay={block.autoplay} controls={block.controls !== false} muted={block.muted} playsInline poster={block.poster?.url} preload="metadata" src={url} />}{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
  }
  if (block.type === "audio") return <figure className={className}><figcaption><strong>{block.title}</strong>{block.description ? <span>{block.description}</span> : null}</figcaption><audio controls preload="metadata" src={block.asset.url} /></figure>;
  if (block.type === "file") return <a className={`${className} ${e.studioFile}`} download href={block.asset.url}><span>{block.title}</span><small>{block.description ?? block.asset.filename}</small></a>;
  if (block.type === "embed") { const embed = supportedEmbedURL(block.url, block.provider); return embed ? <iframe className={className} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" src={embed} title={block.title ?? "Vložený obsah"} /> : <a className={`${className} ${e.studioFile}`} href={safeArticleHref(block.url) ?? "#"}>{block.title ?? "Otevřít vložený obsah"}</a>; }
  if (block.type === "callout" || block.type === "keyTakeaway") return <aside className={`${className} ${e.studioCallout}`} data-tone={block.tone ?? "neutral"}>{block.title ? <h3>{block.title}</h3> : null}<RichTextView document={block.content} /></aside>;
  if (block.type === "statistic") return <figure className={`${className} ${e.studioStatistic}`}><strong>{block.value}</strong><figcaption>{block.label}{block.source ? <small>{block.source}</small> : null}</figcaption></figure>;
  if (block.type === "timeline") return <ol className={`${className} ${e.studioTimeline}`}>{block.items.map((item, index) => <li key={`${block.id}-${index}`}><span>{item.date ?? String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><p>{item.description}</p></div></li>)}</ol>;
  if (block.type === "cta") return <aside className={`${className} ${e.studioCta}`}><h3>{block.title}</h3>{block.text ? <p>{block.text}</p> : null}<a href={safeArticleHref(block.action.href) ?? "#"}>{block.action.label}</a></aside>;
  return null;
}

function SemanticArticleBlock({
  block,
  post,
}: {
  block: BlogSemanticArticleBlock;
  post: BlogPostMeta;
}) {
  if (block.type === "lead" || block.type === "explanation") {
    return (
      <div
        className={block.type === "lead" ? e.lead : e.explanation}
        data-article-semantic-block={block.type}
      >
        {block.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    );
  }

  if (block.type === "subsections") {
    return (
      <div className={e.subsections} data-article-semantic-block={block.type}>
        {block.items.map((item) => (
          <section key={item.title}>
            <h3>{item.title}</h3>
            {item.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    );
  }

  if (block.type === "keyInsight") {
    return (
      <div
        className={`${e.keyInsight} ${block.title ? "" : e.keyInsightSolo}`.trim()}
        data-article-semantic-block={block.type}
      >
        {block.label ? <span>{block.label}</span> : null}
        {block.title ? <h3>{block.title}</h3> : null}
        <p>{block.body}</p>
      </div>
    );
  }

  if (block.type === "expertNote") {
    return (
      <aside className={e.expertNote} data-article-semantic-block={block.type}>
        <h3>{block.title}</h3>
        {block.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </aside>
    );
  }

  if (block.type === "definition") {
    return (
      <dl className={e.definition} data-article-semantic-block={block.type}>
        <dt>{block.term}</dt>
        <dd>{block.definition}</dd>
        {block.detail ? <dd className={e.definitionDetail}>{block.detail}</dd> : null}
        {block.example ? (
          <dd className={e.definitionExample}>
            <strong>Příklad</strong>
            {block.example}
          </dd>
        ) : null}
      </dl>
    );
  }

  if (block.type === "decision") {
    const entries = block.branches ?? block.options ?? [];
    const checks = entries.flatMap((entry) =>
      "check" in entry ? [entry.check] : [],
    );
    const sharedCheck =
      checks.length === entries.length &&
      checks.length > 1 &&
      checks.every((check) => check === checks[0])
        ? checks[0]
        : null;

    return (
      <div className={e.decision} data-article-semantic-block={block.type}>
        {block.title ? <h3>{block.title}</h3> : null}
        {block.intro ? <p>{block.intro}</p> : null}
        <ul role="list">
          {entries.map((entry) => {
            const isBranch = "condition" in entry;
            const title = isBranch ? entry.condition : entry.title;
            const body = isBranch ? entry.action : entry.text;

            return (
              <li key={title}>
                <div>
                  {block.title ? (
                    <h4 className={e.decisionEntryTitle}>{title}</h4>
                  ) : (
                    <h3 className={e.decisionEntryTitle}>{title}</h3>
                  )}
                  {body ? <p>{body}</p> : null}
                  {isBranch && !sharedCheck ? (
                    <p className={e.decisionCheck}>{entry.check}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {sharedCheck ? <p className={e.decisionSharedCheck}>{sharedCheck}</p> : null}
      </div>
    );
  }

  if (block.type === "comparison") {
    if (block.items?.length) {
      const items = block.items;
      const alignedRows = getAlignedComparisonRows(items);
      const ItemHeading = block.title ? "h4" : "h3";

      if (alignedRows) {
        return (
          <div className={`${e.comparison} ${e.comparisonMatrix}`} data-article-semantic-block={block.type}>
            {block.title ? <h3>{block.title}</h3> : null}
            <div className={e.comparisonScroller}>
              <table aria-label={block.title ?? "Srovnání možností"}>
                <thead>
                  <tr>
                    <th scope="col">Hledisko</th>
                    {items.map((item) => (
                      <th key={item.label} scope="col">{item.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alignedRows.map((row) => (
                    <tr key={row.criterion}>
                      <th scope="row">{row.criterion}</th>
                      <td data-column={items[0].label}>{row.first}</td>
                      <td data-column={items[1].label}>{row.second}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {block.takeaway ? <p className={e.comparisonTakeaway}>{block.takeaway}</p> : null}
          </div>
        );
      }

      return (
        <div className={e.comparison} data-article-semantic-block={block.type}>
          {block.title ? <h3>{block.title}</h3> : null}
          <div className={e.comparisonCards} data-comparison-layout={items.length > 2 ? "list" : "columns"}>
            {items.map((item) => (
              <section key={item.label}>
                <ItemHeading>{item.label}</ItemHeading>
                <p>{item.summary}</p>
                <ul role="list">
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {block.takeaway ? (
            <p className={e.comparisonTakeaway}>{block.takeaway}</p>
          ) : null}
        </div>
      );
    }

    const columns = block.columns;
    const rows = block.rows;

    if (!columns || !rows) return null;

    return (
      <div className={e.comparison} data-article-semantic-block={block.type}>
        {block.title ? <h3>{block.title}</h3> : null}
        <div className={e.comparisonScroller}>
          <table aria-label={block.title ?? "Srovnání možností"}>
            <thead>
              <tr>
                <th scope="col">Co sledujete</th>
                <th scope="col">{columns[0]}</th>
                <th scope="col">{columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.criterion}>
                  <th scope="row">{row.criterion}</th>
                  <td data-column={columns[0]}>{row.first}</td>
                  <td data-column={columns[1]}>{row.second}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (block.type === "checklist") {
    const categoryTopic = getLeadTopic(post.category);
    const describedItems = block.items.filter(
      (item) => typeof item !== "string" && Boolean(item.description),
    ).length;
    const variant = describedItems === 0
      ? "compact"
      : block.items.length <= 3 && describedItems === block.items.length
        ? "tiles"
        : "rows";

    return (
      <div className={e.checklist} data-article-semantic-block={block.type} data-variant={variant}>
        {block.title ? <h3>{block.title}</h3> : null}
        <ul role="list">
          {block.items.map((item, index) => {
            const title = typeof item === "string" ? item : item.title;
            const description = typeof item === "string" ? undefined : item.description;

            return (
            <li key={title}>
              <span className={e.checklistIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{title}</strong>
                {description ? <p>{description}</p> : null}
              </div>
            </li>
            );
          })}
        </ul>
        {block.action ? (
          <ArticleLeadButton
            cta="article-inline"
            className={e.checklistAction}
            docked
            label={block.action.label}
            topic={block.action.leadTopic !== categoryTopic ? block.action.leadTopic : undefined}
            fallbackTopic={categoryTopic}
            conversionId={block.action.conversionId}
            inheritedContext={getArticleConversionContext(post)}
          />
        ) : null}
      </div>
    );
  }

  if (block.type === "process") {
    const StepHeading = block.title ? "h4" : "h3";
    return (
      <div className={e.process} data-article-semantic-block={block.type}>
        {block.title ? <h3>{block.title}</h3> : null}
        <ol>
          {block.steps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <StepHeading>{step.title}</StepHeading>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block.type === "financialDelta") {
    const variant = block.items.every((item) => item.value && !item.from && !item.to)
      ? "single"
      : "comparison";
    return (
      <figure className={e.financialDelta} data-article-semantic-block={block.type} data-variant={variant}>
        <figcaption>{block.title}</figcaption>
        <div className={e.financialDeltaItems}>
          {block.items.map((item) => (
            <div className={e.financialDeltaItem} data-tone={item.tone ?? "base"} key={item.label}>
              <span>{item.label}</span>
              {item.from && item.to ? (
                <div
                  className={e.financialDeltaChange}
                  data-value-kind={isMeasuredValue(item.from) && isMeasuredValue(item.to) ? "measured" : "statement"}
                >
                  <strong><FinancialValue value={item.from} /></strong>
                  <span className={e.financialDeltaDirection}>
                    <span aria-hidden="true">→</span>
                    <span className={e.screenReaderOnly}>na</span>
                  </span>
                  <strong><FinancialValue value={item.to} /></strong>
                </div>
              ) : (
                <strong className={e.financialDeltaSingleValue}>
                  {item.value ? <FinancialValue value={item.value} /> : null}
                </strong>
              )}
              {item.context ? <small>{item.context}</small> : null}
            </div>
          ))}
        </div>
        <p>{block.summary}</p>
      </figure>
    );
  }

  if (block.type === "metric") {
    return (
      <figure className={`${e.metric} ${!block.layout ? e.editorialBreakout : ""}`} data-article-semantic-block={block.type}>
        <figcaption>{block.label}</figcaption>
        <strong><FinancialValue value={block.value} /></strong>
        {block.context ? <p>{block.context}</p> : null}
      </figure>
    );
  }

  if (block.type === "caseStudy") {
    const structuredGroups = [
      { title: "Výchozí stav", items: block.initialState },
      { title: "V čem byl problém", items: block.problem },
      { title: "Rozbor", text: block.analysis },
      { title: "Co se změnilo", items: block.whatChanged },
      { title: "Výsledek", items: block.result },
    ].filter((group) => group.items?.length || group.text);
    const GroupHeading = block.title ? "h4" : "h3";

    return (
      <div className={e.caseStudy} data-article-semantic-block={block.type}>
        {block.title ? <h3>{block.title}</h3> : null}
        {block.context ? <p className={e.caseStudyContext}>{block.context}</p> : null}
        {block.body?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {structuredGroups.length > 0 ? (
          <div className={e.caseStudyGroups}>
            {structuredGroups.map((group) => (
              <section key={group.title}>
                <GroupHeading className={e.caseStudyGroupTitle}>{group.title}</GroupHeading>
                {group.text ? <p>{group.text}</p> : (
                  <ul>
                    {group.items?.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ) : null}
        {block.takeaway ? (
          <p className={e.caseStudyTakeaway}>{block.takeaway}</p>
        ) : null}
      </div>
    );
  }

  if (block.type === "clientEvidence") {
    return (
      <blockquote
        className={`${e.clientEvidence} ${!block.layout ? e.editorialBreakout : ""}`}
        data-article-semantic-block={block.type}
      >
        <span>Zkušenost klienta</span>
        <p>„{block.quote}“</p>
        {block.attribution || block.context ? (
          <footer>
            {block.attribution ? <cite>{block.attribution}</cite> : null}
            {block.context ? <small>{block.context}</small> : null}
          </footer>
        ) : null}
      </blockquote>
    );
  }

  if (block.type === "videoExplanation") {
    return (
      <figure className={e.video} data-article-semantic-block={block.type}>
        <video
          aria-label={block.title}
          controls
          poster={block.poster}
          preload="none"
          src={block.src}
        />
        <figcaption>
          <strong>{block.title}</strong>
          {block.caption ? <span>{block.caption}</span> : null}
        </figcaption>
      </figure>
    );
  }

  if (block.type === "interactiveTool") {
    return <SemanticScreening block={block} post={post} />;
  }

  if (block.type === "nextAction") {
    return <SemanticNextAction block={block} post={post} />;
  }

  if (block.type === "studio") {
    return <StudioArticleBlock block={block.block} />;
  }

  return (
    <div className={e.divider} data-article-semantic-block="divider">
      {block.label ? <span>{block.label}</span> : null}
    </div>
  );
}

function SemanticArticleSections({
  post,
  sections,
  finalActionInAuthorNote = false,
}: {
  post: BlogPostMeta;
  sections: BlogArticleSection[];
  finalActionInAuthorNote?: boolean;
}) {
  return (
    <div className={e.article} data-semantic-article>
      {sections.map((section, sectionIndex) => {
        const headingId = `${section.id}-title`;
        const railNote = section.rail;
        // Move the same action selected by the page into the author panel,
        // including its copy. Omit its frame too so no empty spacing remains.
        const authorActionIndex = finalActionInAuthorNote && sectionIndex === sections.length - 1
          ? section.blocks.findIndex((block) => block.type === "nextAction")
          : -1;
        // On narrow screens the rail becomes an inline recap. Keep the article's
        // editorial note as the single aside when both cover the same section.
        const hasInlineInsight = section.blocks.some(
          (block) => block.type === "expertNote" || block.type === "keyInsight",
        );

        return (
          <section
            aria-labelledby={headingId}
            className={e.section}
            data-article-section
            data-article-section-index={sectionIndex}
            data-layout={section.layout ?? "article"}
            data-spacing={section.spacing ?? "normal"}
            id={section.id}
            key={section.id}
          >
            <header className={e.sectionHeader}>
              <div>
                <span className={e.sectionEyebrow}>
                  {section.eyebrow.replace(/^\s*\d+\s*\/\s*/u, "")}
                </span>
                <h2 id={headingId}>{section.title}</h2>
                {section.intro ? <p>{section.intro}</p> : null}
              </div>
            </header>
            <div className={e.sectionBlocks}>
              {section.blocks.map((block, blockIndex) => blockIndex === authorActionIndex ? null : (
                <div
                  className={e.semanticBlockFrame}
                  data-semantic-align={block.align ?? "left"}
                  data-semantic-layout={block.layout ?? "normal"}
                  data-semantic-spacing={block.spacing ?? "normal"}
                  key={`${block.type}-${blockIndex}`}
                >
                  <SemanticArticleBlock
                    block={block}
                    post={post}
                  />
                </div>
              ))}
              {railNote && !hasInlineInsight ? (
                <aside className={e.sectionMarginNote} aria-label="Poznámka k části">
                  {railNote.label ? <span>{railNote.label}</span> : null}
                  {railNote.title !== section.title && railNote.title !== railNote.label ? <strong>{railNote.title}</strong> : null}
                  {railNote.text !== railNote.title ? <p>{railNote.text}</p> : null}
                  {railNote.points?.length ? (
                    <ul>{railNote.points.map((point) => <li key={point}>{point}</li>)}</ul>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function createBlocksFromFlow(flow: BlogArticleFlow): BlogArticleBlock[] {
  const blocks: BlogArticleBlock[] = [
    { type: "paragraphs", paragraphs: flow.intro.paragraphs },
  ];

  if (flow.problem.title) {
    blocks.push({ type: "heading", level: 2, text: flow.problem.title });
  }

  blocks.push(
    { type: "paragraphs", paragraphs: flow.problem.body },
    { type: "conversion", id: "CTA_INLINE" },
    { type: "heading", level: 2, text: flow.comparison.title },
  );

  flow.comparison.rows.forEach((row) => {
    blocks.push(
      { type: "heading", level: 3, text: row.label },
      { type: "paragraphs", paragraphs: [row.value] },
    );
  });

  if (flow.screening) {
    blocks.push({ type: "conversion", id: "SCREENING_MODULE" });
  }

  blocks.push({ type: "heading", level: 2, text: flow.scenarios.title });

  flow.scenarios.items.forEach((scenario) => {
    blocks.push(
      { type: "heading", level: 3, text: scenario.title },
      { type: "paragraphs", paragraphs: [scenario.text] },
    );
  });

  blocks.push({
    type: "caseStudy",
    title: flow.caseStudy.title,
    body: [flow.caseStudy.text],
    metrics: flow.caseStudy.metrics,
  });

  if (flow.closing.title) {
    blocks.push({ type: "heading", level: 2, text: flow.closing.title });
  }

  blocks.push(
    { type: "paragraphs", paragraphs: flow.closing.body },
    { type: "heading", level: 2, text: flow.summary.title },
    { type: "list", items: flow.summary.items },
    { type: "conversion", id: "CTA_FINAL" },
  );

  return blocks;
}

function ArticleInlineCta({ post }: { post: BlogPostMeta }) {
  const conversionId = post.articleFlow?.screening?.conversionId;
  const block = getArticleConversionBlock(conversionId);
  const copy = post.conversionCopy?.inline ?? block.inlineCta;

  return (
    <aside
      className={s.editorialInlineCta}
      data-article-special-block
      data-suppress-sticky-cta
    >
      <span className={s.editorialBlockLabel}>První krok</span>
      <h3>{copy.title}</h3>
      {copy.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <ArticleLeadButton
        className={s.articleCtaButton}
        label={copy.buttonLabel ?? block.inlineCta.buttonLabel}
        topic={block.leadTopic}
        conversionId={conversionId}
        inheritedContext={getArticleConversionContext(post)}
      />
    </aside>
  );
}

function ArticleScreening({ post }: { post: BlogPostMeta }) {
  const screening = post.articleFlow?.screening;
  if (!screening) return null;

  const config = getArticleScreeningConfig(screening.type);
  if (!config) return null;

  return (
    <ArticleScreeningEmbed
      articleSlug={post.slug}
      config={config}
      id="screening"
    />
  );
}

function ArticleFinalCta({ post }: { post: BlogPostMeta }) {
  const conversionId =
    post.articleFlow?.finalCta?.conversionId ??
    post.articleFlow?.screening?.conversionId;
  const block = getArticleConversionBlock(conversionId);
  const copy = post.conversionCopy?.final ?? block.finalCta;

  return (
    <aside
      className={s.editorialFinalCta}
      data-article-special-block
      data-suppress-sticky-cta
      data-surface-tone="dark"
    >
      <span className={s.editorialBlockLabel}>Další krok</span>
      <h3>{copy.title}</h3>
      {copy.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <ArticleLeadButton
        cta="article-final"
        className={s.articleCtaButton}
        label={copy.buttonLabel ?? block.finalCta.buttonLabel}
        topic={block.leadTopic}
        conversionId={conversionId}
        inheritedContext={getArticleConversionContext(post)}
      />
    </aside>
  );
}

function ArticleConversionMarker({
  marker,
  post,
}: {
  marker: BlogArticleConversionMarkerBlock;
  post: BlogPostMeta;
}) {
  if (marker.id === "CTA_INLINE") return <ArticleInlineCta post={post} />;
  if (marker.id === "SCREENING_MODULE") return <ArticleScreening post={post} />;
  return <ArticleFinalCta post={post} />;
}

function ArticleBlockView({
  block,
  index,
  post,
}: {
  block: BlogArticleBlock;
  index: number;
  post: BlogPostMeta;
}) {
  if (block.type === "paragraphs") {
    const isIntro = index === 0;

    return (
      <section
        className={isIntro ? s.editorialIntro : s.editorialTextBlock}
        data-article-block={isIntro ? "intro" : "section"}
      >
        {block.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
    );
  }

  if (block.type === "heading") {
    const Heading = block.level === 3 ? "h3" : "h2";

    return (
      <section
        className={s.editorialHeadingBlock}
        data-article-block="heading"
        data-heading-level={block.level}
      >
        <Heading>{block.text}</Heading>
      </section>
    );
  }

  if (block.type === "list") {
    return (
      <ul className={s.editorialList}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className={s.editorialQuote} aria-label="Zkušenost klienta">
        <span className={s.editorialQuoteLabel}>Zkušenost klienta</span>
        <p>{block.text}</p>
      </blockquote>
    );
  }

  if (block.type === "callout") {
    return (
      <aside className={s.editorialCallout}>
        <h3>{block.title}</h3>
        {block.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </aside>
    );
  }

  if (block.type === "caseStudy") {
    return (
      <aside className={s.editorialCaseStudy} data-article-special-block>
        <span className={s.editorialBlockLabel}>Příklad k principu</span>
        <h2>{block.title}</h2>
        {block.metrics && block.metrics.length > 0 ? (
          <div className={s.editorialCaseMetrics}>
            {block.metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {block.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </aside>
    );
  }

  return <ArticleConversionMarker marker={block} post={post} />;
}

function ArticleControlPanel({ flow }: { flow?: BlogArticleFlow }) {
  if (!flow) return null;

  return (
    <aside className={s.editorialControlPanel} id="kontrola">
      <span className={s.editorialBlockLabel}>
        {flow.checklist.kicker ?? "Kontrola"}
      </span>
      <h2>{flow.checklist.title}</h2>
      <ul>
        {flow.checklist.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}

export default function ArticleEditorialRenderer({
  aside,
  blocks,
  content,
  finalActionInAuthorNote,
  flow,
  post,
  sections,
}: ArticleEditorialRendererProps) {
  if (sections?.length) {
    return <SemanticArticleSections finalActionInAuthorNote={finalActionInAuthorNote} post={post} sections={sections} />;
  }

  const canonicalBlocks = blocks?.length
    ? blocks
    : flow
      ? createBlocksFromFlow(flow)
      : [];

  return (
    <>
      <ArticleControlPanel flow={flow} />

      {aside ? (
        <div className={s.articleMobileRail}>
          <ArticleConversionRail
            aside={aside}
            headingId="article-mobile-conversion-rail-title"
          />
        </div>
      ) : null}

      {canonicalBlocks.length > 0 ? (
        <div className={s.editorialArticleFlow}>
          {canonicalBlocks.map((block, index) => (
            <ArticleBlockView
              block={block}
              index={index}
              key={`${block.type}-${index}`}
              post={post}
            />
          ))}
        </div>
      ) : (
        <div className={s.editorialArticleFlow}>
          <MDXRemote
            components={createArticleMdxComponents()}
            source={content}
          />
        </div>
      )}
    </>
  );
}
