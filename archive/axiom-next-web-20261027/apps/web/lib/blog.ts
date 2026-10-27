import path from "node:path";
import type { LeadTopic } from "@/lib/api";
import type {
  ArticleStudioBlock,
  ArticleStudioBlockBase,
} from "@axiom-dp/contracts/article";
import { loadArticleDocumentPosts } from "./article-document-loader";

export type BlogCategory =
  | "prehled"
  | "hypoteka"
  | "pojisteni"
  | "rezerva"
  | "investice"
  | "uvery"
  | "rodina";

export type BlogPostMeta = {
  title: string;
  heroTitle?: string;
  slug: string;
  excerpt: string;
  heroExcerpt?: string;
  heroEyebrow?: string;
  hubDescription?: string;
  hubBenefit?: string;
  heroCategoryLabel?: string;
  heroImage?: string;
  heroImageAlt?: string;
  author?: string;
  category: BlogCategory;
  date?: string;
  updatedAt?: string;
  readingTime?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoCanonical?: string;
  seoIndex?: boolean;
  seoFollow?: boolean;
  socialTitle?: string;
  socialDescription?: string;
  socialImage?: string;
  relatedServices?: string[];
  featured?: boolean;
  featuredPriority?: number;
  quickCheck?: BlogQuickCheck;
  aside?: BlogArticleAside;
  template?: BlogArticleTemplate;
  articleFlow?: BlogArticleFlow;
  articleBlocks?: BlogArticleBlock[];
  sections?: BlogArticleSection[];
  conversionCopy?: BlogArticleConversionCopy;
  schemaVersion?: number;
  relatedArticles?: Array<{
    slug: string;
    reason: string;
  }>;
};

export type BlogArticleSection = {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  blocks: BlogSemanticArticleBlock[];
  rail?: BlogArticleSectionRail;
  layout?: "article" | "wide" | "split";
  spacing?: "compact" | "normal" | "generous";
};

export type BlogArticleSectionRail = {
  label?: string;
  title: string;
  text: string;
  points?: string[];
};

export type BlogArticleBlockComposition = Pick<
  ArticleStudioBlockBase,
  "layout" | "align" | "spacing"
>;

export type BlogSemanticArticleBlock = (
  | BlogArticleExplanationBlock
  | BlogArticleSubsectionsBlock
  | BlogArticleLeadBlock
  | BlogArticleKeyInsightBlock
  | BlogArticleExpertNoteBlock
  | BlogArticleDefinitionBlock
  | BlogArticleDecisionBlock
  | BlogArticleSemanticComparisonBlock
  | BlogArticleSemanticChecklistBlock
  | BlogArticleProcessBlock
  | BlogArticleFinancialDeltaBlock
  | BlogArticleMetricBlock
  | BlogArticleSemanticCaseStudyBlock
  | BlogArticleClientEvidenceBlock
  | BlogArticleVideoExplanationBlock
  | BlogArticleInteractiveToolBlock
  | BlogArticleNextActionBlock
  | BlogArticleStudioBlock
  | BlogArticleDividerBlock
) & BlogArticleBlockComposition;

export type BlogArticleStudioBlock = {
  type: "studio";
  block: ArticleStudioBlock;
};

export type BlogArticleExplanationBlock = {
  type: "explanation";
  paragraphs: string[];
};

export type BlogArticleSubsectionsBlock = {
  type: "subsections";
  items: Array<{
    title: string;
    paragraphs: string[];
  }>;
};

export type BlogArticleLeadBlock = {
  type: "lead";
  paragraphs: string[];
};

export type BlogArticleKeyInsightBlock = {
  type: "keyInsight";
  label?: string;
  title?: string;
  body: string;
};

export type BlogArticleExpertNoteBlock = {
  type: "expertNote";
  title: string;
  body: string[];
};

export type BlogArticleDefinitionBlock = {
  type: "definition";
  term: string;
  definition: string;
  detail?: string;
  example?: string;
};

export type BlogArticleDecisionBlock = {
  type: "decision";
  title?: string;
  intro?: string;
  options?: Array<{
    title: string;
    text?: string;
  }>;
  branches?: Array<{
    condition: string;
    action: string;
    check: string;
  }>;
};

export type BlogArticleSemanticComparisonBlock = {
  type: "comparison";
  title?: string;
  columns?: [string, string];
  rows?: Array<{
    criterion: string;
    first: string;
    second: string;
  }>;
  items?: Array<{
    label: string;
    summary: string;
    points: string[];
  }>;
  takeaway?: string;
};

export type BlogArticleSemanticChecklistBlock = {
  type: "checklist";
  title?: string;
  items: Array<
    | string
    | {
        title: string;
        description?: string;
      }
  >;
  action?: {
    label: string;
    leadTopic?: LeadTopic;
    conversionId?: string;
  };
};

export type BlogArticleProcessBlock = {
  type: "process";
  title?: string;
  steps: Array<{
    title: string;
    text: string;
  }>;
};

export type BlogArticleFinancialDeltaBlock = {
  type: "financialDelta";
  title: string;
  items: Array<{
    label: string;
    value?: string;
    tone?: "base" | "warning" | "positive";
    from?: string;
    to?: string;
    context?: string;
  }>;
  summary: string;
};

export type BlogArticleMetricBlock = {
  type: "metric";
  label: string;
  value: string;
  context?: string;
};

export type BlogArticleSemanticCaseStudyBlock = {
  type: "caseStudy";
  title?: string;
  body?: string[];
  context?: string;
  initialState?: string[];
  problem?: string[];
  analysis?: string;
  whatChanged?: string[];
  result?: string[];
  takeaway?: string;
};

export type BlogArticleClientEvidenceBlock = {
  type: "clientEvidence";
  quote: string;
  attribution?: string;
  context?: string;
};

export type BlogArticleVideoExplanationBlock = {
  type: "videoExplanation";
  title: string;
  src: string;
  poster?: string;
  caption?: string;
};

export type BlogArticleInteractiveToolBlock = {
  type: "interactiveTool";
  tool: "screening";
  id?: string;
  title?: string;
  text?: string;
  screeningType: string;
  conversionId?: string;
};

export type BlogArticleNextActionBlock = {
  type: "nextAction";
  eyebrow?: string;
  title: string;
  body: string[];
  buttonLabel: string;
  conversionId?: string;
  leadTopic?: LeadTopic;
  actionIntent?: string;
};

export type BlogArticleDividerBlock = {
  type: "divider";
  label?: string;
};

export type BlogQuickCheck = {
  title: string;
  intro: string;
  items: string[];
  ctaLabel: string;
  ctaHref: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
};

export type BlogArticleTemplate = "practical-check";

export type BlogArticleAside = BlogArticleScreeningRailAside;

export type BlogArticleScreeningRailAside = {
  type: "screeningRail";
  eyebrow: string;
  title: string;
  text: string;
  bullets: string[];
  cta: {
    label: string;
    href: string;
  };
  note?: string;
};

export type BlogArticleFlow = {
  intro: BlogArticleIntroBlock;
  problem: BlogArticleTextSection;
  checklist: BlogArticleChecklist;
  comparison: BlogArticleComparison;
  screening?: BlogArticleScreeningPlacement;
  scenarios: BlogArticleScenarioSection;
  caseStudy: BlogArticleCaseStudy;
  closing: BlogArticleTextSection;
  summary: BlogArticleSummary;
  finalCta?: BlogArticleFinalCta;
};

export type BlogArticleIntroBlock = {
  type: "intro";
  paragraphs: string[];
};

export type BlogArticleTextSection = {
  title?: string;
  body: string[];
};

export type BlogArticleChecklist = {
  id?: string;
  kicker?: string;
  title: string;
  items: string[];
};

export type BlogArticleComparison = {
  title: string;
  rows: BlogArticleComparisonRow[];
};

export type BlogArticleComparisonRow = {
  label: string;
  value: string;
};

export type BlogArticleScreeningPlacement = {
  type: string;
  conversionId?: string;
};

export type BlogArticleScenarioSection = {
  title: string;
  items: BlogArticleScenario[];
};

export type BlogArticleScenario = {
  title: string;
  text: string;
};

export type BlogArticleCaseStudy = {
  title: string;
  metrics: BlogArticleCaseMetric[];
  text: string;
};

export type BlogArticleCaseMetric = {
  label: string;
  value: string;
};

export type BlogArticleSummary = {
  title: string;
  items: string[];
};

export type BlogArticleFinalCta = {
  conversionId?: string;
};

export type BlogArticleBlock =
  | BlogArticleParagraphBlock
  | BlogArticleHeadingBlock
  | BlogArticleListBlock
  | BlogArticleQuoteBlock
  | BlogArticleCalloutBlock
  | BlogArticleCaseBlock
  | BlogArticleConversionMarkerBlock;

export type BlogArticleParagraphBlock = {
  type: "paragraphs";
  paragraphs: string[];
};

export type BlogArticleHeadingBlock = {
  type: "heading";
  level: 2 | 3;
  text: string;
};

export type BlogArticleListBlock = {
  type: "list";
  items: string[];
};

export type BlogArticleQuoteBlock = {
  type: "quote";
  text: string;
};

export type BlogArticleCalloutBlock = {
  type: "callout";
  title: string;
  body: string[];
};

export type BlogArticleCaseBlock = {
  type: "caseStudy";
  title: string;
  body: string[];
  metrics?: BlogArticleCaseMetric[];
};

export type BlogArticleConversionMarkerBlock = {
  type: "conversion";
  id: "CTA_INLINE" | "SCREENING_MODULE" | "CTA_FINAL";
};

export type BlogArticleConversionCopy = {
  inline?: BlogArticleConversionText;
  screening?: BlogArticleScreeningCopy;
  final?: BlogArticleConversionText;
};

export type BlogArticleConversionText = {
  title: string;
  body: string[];
  buttonLabel?: string;
};

export type BlogArticleScreeningCopy = {
  rationale: string[];
  psychology: string[];
  steps: {
    title: string;
    questions: {
      text: string;
      options: string[];
    }[];
  }[];
  fields: string[];
  resultPromise: string;
  followUp: string;
  buttonLabel: string;
};

const blogDirectory = path.join(process.cwd(), "content", "blog");

export const categoryLabels: Record<BlogCategory, string> = {
  prehled: "Přehled ve financích",
  hypoteka: "Hypotéka",
  pojisteni: "Pojištění",
  rezerva: "Rezerva a rozpočet",
  investice: "Investice",
  uvery: "Úvěry",
  rodina: "Finance pro páry a rodiny",
};

export function getAllPosts(): BlogPost[] {
  const articleDocumentPosts = loadArticleDocumentPosts(blogDirectory);
  return articleDocumentPosts.toSorted(
    (left, right) => {
      const leftDate = left.date ? Date.parse(left.date) : 0;
      const rightDate = right.date ? Date.parse(right.date) : 0;
      const dateDifference = rightDate - leftDate;

      return dateDifference || left.title.localeCompare(right.title, "cs-CZ");
    },
  );
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find((post) => post.slug === slug) ?? null;
}

export function getFeaturedPosts(limit = 3) {
  const posts = getAllPosts();
  const featured = posts.filter((post) => post.featured);
  return (featured.length ? featured : posts).slice(0, limit);
}

export function getRelatedPosts(post: BlogPostMeta, limit = 3) {
  const explicitOrder = new Map(
    post.relatedArticles?.map((article, index) => [article.slug, index]),
  );

  return getAllPosts()
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((a, b) => {
      const explicitA = explicitOrder.get(a.slug);
      const explicitB = explicitOrder.get(b.slug);

      if (explicitA !== undefined || explicitB !== undefined) {
        return (
          (explicitA ?? Number.MAX_SAFE_INTEGER) -
          (explicitB ?? Number.MAX_SAFE_INTEGER)
        );
      }

      const categoryScore =
        Number(b.category === post.category) - Number(a.category === post.category);
      if (categoryScore !== 0) return categoryScore;
      return (
        (b.date ? Date.parse(b.date) : 0) -
        (a.date ? Date.parse(a.date) : 0)
      );
    })
    .slice(0, limit);
}

export function getAllCategories() {
  const used = new Set(getAllPosts().map((post) => post.category));

  return Object.entries(categoryLabels)
    .filter(([key]) => used.has(key as BlogCategory))
    .map(([value, label]) => ({ value: value as BlogCategory, label }));
}
