import type {
  ArticleSourceBlock,
  ArticleSourceRail,
  PublicArticleDocumentV2,
} from "./article-document-v2";
import type {
  BlogArticleSection,
  BlogArticleSectionRail,
  BlogCategory,
  BlogPost,
  BlogSemanticArticleBlock,
} from "./blog";
import type { LeadTopic } from "@/lib/api";
import { resolveArticlePublication } from "./article-publication-dates.ts";
import {
  getArticleConversionBlock,
  isArticleConversionId,
} from "../app/clanky/articleConversionBlocks.ts";

// Contract JSON is intentionally parsed into null-prototype objects. That is a
// useful safety property at the wire boundary, but React Server Components may
// only pass ordinary objects to client islands. Rebuild the public projection
// as a plain JSON graph once, at the adapter boundary, instead of weakening the
// contract parser or cloning ad hoc in individual components.
function toPlainProjection<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toPlainProjection(item)) as T;
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        toPlainProjection(child),
      ]),
    ) as T;
  }
  return value;
}

function normalizeLookup(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("cs-CZ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getBlogCategory(document: PublicArticleDocumentV2): BlogCategory {
  const { slug } = document.meta;

  if (slug === "kolik-ma-mit-domacnost-v-rezerve") return "rezerva";
  if (slug === "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku") {
    return "investice";
  }
  if (slug === "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou") {
    return "rodina";
  }

  const category = document.meta.category.toLocaleLowerCase("cs-CZ");
  if (category.includes("hypot")) return "hypoteka";
  if (category.includes("pojišt")) return "pojisteni";
  if (category.includes("invest")) return "investice";
  return "prehled";
}

export function getLeadTopic(category: BlogCategory): LeadTopic | undefined {
  if (category === "prehled" || category === "rodina") return "Finanční plán";
  if (category === "hypoteka" || category === "uvery") {
    return "Hypotéka & bydlení";
  }
  if (category === "pojisteni") return "Ochrana majetku";
  if (category === "investice") return "Investice a spoření";
  return undefined;
}

function getActionLeadTopic(conversionId: string | undefined, fallback?: LeadTopic) {
  // An authored conversion identifies the intended consultation more precisely
  // than the article's broad category. Unknown IDs retain the category fallback.
  return isArticleConversionId(conversionId)
    ? getArticleConversionBlock(conversionId).leadTopic
    : fallback;
}

function stringifyRailItem(item: string | { label: string; value: string }) {
  return typeof item === "string" ? item : `${item.label}: ${item.value}`;
}

function normalizeRail(
  rail: ArticleSourceRail | null,
  sectionIntro?: string,
): BlogArticleSectionRail | undefined {
  if (!rail) return undefined;

  const points = [
    ...(rail.steps ?? []),
    ...(rail.items ?? []).map(stringifyRailItem),
    ...(rail.metrics ?? []).map((metric) => `${metric.label}: ${metric.value}`),
  ];
  const title =
    rail.title ??
    rail.value ??
    rail.left ??
    rail.items?.map(stringifyRailItem).join(" · ") ??
    rail.label;
  const text =
    rail.summary ??
    rail.caption ??
    rail.right ??
    sectionIntro ??
    title;

  return {
    label: rail.label,
    title,
    text,
    ...(points.length > 0 ? { points } : {}),
  };
}

function normalizeBlockContent(
  block: ArticleSourceBlock,
  leadTopic?: LeadTopic,
): BlogSemanticArticleBlock[] {
  if (block.type === "lead") {
    return [{ type: "lead", paragraphs: [block.text] }];
  }

  if (block.type === "explanation") {
    if (block.subsections) {
      return [{ type: "subsections", items: block.subsections }];
    }

    return [{ type: "explanation", paragraphs: block.paragraphs ?? [] }];
  }

  if (block.type === "keyInsight") {
    return [
      {
        type: "keyInsight",
        ...(block.supportingText ? { title: block.text } : {}),
        body: block.supportingText ?? block.text,
      },
    ];
  }

  if (block.type === "definition") {
    return [
      {
        type: "definition",
        term: block.term,
        definition: block.simpleDefinition,
        detail: block.optionalDetail,
        example: block.optionalExample,
      },
    ];
  }

  if (block.type === "comparison") {
    return [
      {
        type: "comparison",
        title: block.title,
        items: block.items,
        takeaway: block.takeaway,
      },
    ];
  }

  if (block.type === "expertNote") {
    return [
      {
        type: "expertNote",
        title: block.title,
        body: [block.text],
      },
    ];
  }

  if (block.type === "checklist") {
    return [
      {
        type: "checklist",
        title: block.title,
        items: block.items,
        ...(block.action ? {
          action: {
            label: block.action.label,
            leadTopic: getActionLeadTopic(block.action.conversionId, leadTopic),
            conversionId: block.action.conversionId,
          },
        } : {}),
      },
    ];
  }

  if (block.type === "process") {
    return [
      {
        type: "process",
        title: block.title,
        steps: block.steps.map((step) => ({
          title: step.title,
          text: step.description,
        })),
      },
    ];
  }

  if (block.type === "decision") {
    return [
      {
        type: "decision",
        title: block.title,
        branches: block.branches.map((branch) => ({
          condition: branch.if,
          action: branch.then,
          check: branch.check,
        })),
      },
    ];
  }

  if (block.type === "caseStudy") {
    return [
      {
        type: "caseStudy",
        context: block.context,
        initialState: block.initialState,
        problem: block.problem,
        analysis: block.analysis,
        whatChanged: block.whatChanged,
        result: block.result,
        takeaway: block.takeaway,
      },
    ];
  }

  if (block.type === "financialDelta") {
    return [
      {
        type: "financialDelta",
        title: block.title,
        items: block.items,
        summary: block.interpretation,
      },
    ];
  }

  if (block.type === "clientEvidence") {
    return [
      {
        type: "clientEvidence",
        quote: block.quote,
        attribution: block.attribution,
        context: block.context,
      },
    ];
  }

  if (block.type === "interactiveTool") {
    return [
      {
        type: "interactiveTool",
        tool: block.tool,
        id: block.id,
        title: block.title,
        text: block.text,
        screeningType: block.screeningType,
        conversionId: block.conversionId,
      },
    ];
  }

  if (block.type === "nextAction") return [
    {
      type: "nextAction",
      title: block.title,
      body: block.paragraphs ?? (block.text ? [block.text] : []),
      buttonLabel: block.action.label,
      leadTopic: getActionLeadTopic(block.action.conversionId, leadTopic),
      actionIntent: block.action.intent,
      conversionId: block.action.conversionId,
    },
  ];

  return [{ type: "studio", block }];
}

function normalizeBlock(
  block: ArticleSourceBlock,
  leadTopic?: LeadTopic,
): BlogSemanticArticleBlock[] {
  const composition = {
    ...(block.layout ? { layout: block.layout } : {}),
    ...(block.align ? { align: block.align } : {}),
    ...(block.spacing ? { spacing: block.spacing } : {}),
  };

  return normalizeBlockContent(block, leadTopic).map((normalized) => ({
    ...normalized,
    ...composition,
  }));
}

function normalizeSections(
  document: PublicArticleDocumentV2,
  category: BlogCategory,
): BlogArticleSection[] {
  const leadTopic = getLeadTopic(category);
  const sections = document.sections.map((section) => ({
    id: section.id,
    eyebrow: section.eyebrow,
    title: section.title,
    intro: section.intro,
    layout: section.layout,
    spacing: section.spacing,
    rail: normalizeRail(section.rail, section.intro),
    blocks: section.blocks.flatMap((block) => normalizeBlock(block, leadTopic)),
  }));
  const lastSection = sections.at(-1);

  if (lastSection) {
    const nextActions = lastSection.blocks.filter(
      (block) => block.type === "nextAction",
    );
    const contentBlocks = lastSection.blocks.filter(
      (block) => block.type !== "nextAction",
    );

    lastSection.blocks = [
      ...contentBlocks,
      {
        type: "subsections",
        items: [
          {
            title: document.conclusion.title,
            paragraphs: document.conclusion.paragraphs,
          },
        ],
      },
      ...nextActions,
    ];
  }

  return sections;
}

function resolveRelatedArticles(
  document: PublicArticleDocumentV2,
  documents: PublicArticleDocumentV2[],
) {
  const candidates = documents.map((candidate) => ({
    slug: candidate.meta.slug,
    title: normalizeLookup(candidate.hero.title),
  }));
  const seen = new Set([document.meta.slug]);

  return document.relatedTopics.flatMap((related) => {
    const lookup = normalizeLookup(related.topic);
    // Explicit references survive headline edits. Do not silently redirect a
    // missing explicit reference to another article with a similar title.
    const candidate = related.slug
      ? candidates.find((item) => item.slug === related.slug)
      : candidates.find(
          (item) =>
            item.slug !== document.meta.slug &&
            (item.title === lookup ||
              item.title.startsWith(lookup) ||
              lookup.startsWith(item.title)),
        );

    if (!candidate || seen.has(candidate.slug)) return [];
    seen.add(candidate.slug);
    return [{ slug: candidate.slug, reason: related.reason }];
  });
}

export function articleDocumentToBlogPost(
  document: PublicArticleDocumentV2,
  allDocuments: PublicArticleDocumentV2[],
): BlogPost {
  const category = getBlogCategory(document);
  const relatedArticles = resolveRelatedArticles(document, allDocuments);
  const publication = resolveArticlePublication(document.meta.slug, document.publication);

  return toPlainProjection({
    title: document.hero.title,
    heroTitle: document.hero.displayTitle ?? document.hero.title,
    slug: document.meta.slug,
    excerpt: document.hero.excerpt,
    heroExcerpt: document.hero.subtitle,
    heroEyebrow: document.hero.eyebrow,
    hubDescription: document.hero.subtitle,
    hubBenefit: document.hero.heroSummary[0],
    heroCategoryLabel: document.hero.category,
    heroImage: document.media?.heroImage,
    heroImageAlt: document.media?.heroImageAlt,
    author: publication.author,
    category,
    date: publication.publishedAt,
    updatedAt: publication.updatedAt,
    readingTime: `${document.meta.estimatedReadTime} min`,
    seoTitle: document.seo?.title ?? document.hero.title,
    seoDescription: document.seo?.description ?? document.hero.excerpt,
    seoCanonical: document.seo?.canonical,
    seoIndex: document.seo?.index,
    seoFollow: document.seo?.follow,
    socialTitle: document.seo?.socialTitle,
    socialDescription: document.seo?.socialDescription,
    socialImage: document.seo?.socialImage,
    relatedServices: [
      category,
      document.meta.topic,
      document.meta.primaryIntent,
      document.hero.category,
      ...document.relatedTopics.map((topic) => topic.topic),
      ...relatedArticles.map((article) => article.slug),
    ],
    featured: false,
    quickCheck: {
      title: "V článku si ujasníte",
      intro: document.hero.subtitle,
      items: document.hero.heroSummary,
      ctaLabel: "Přejít k článku ↗",
      ctaHref: `#${document.sections[0].id}`,
    },
    template: "practical-check",
    sections: normalizeSections(document, category),
    schemaVersion: document.schemaVersion,
    relatedArticles,
    content: "",
  });
}
