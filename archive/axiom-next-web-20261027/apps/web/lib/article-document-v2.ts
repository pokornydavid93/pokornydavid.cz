import {
  ARTICLE_DOCUMENT_SCHEMA_VERSION,
  assertArticleDocumentV2 as assertSharedArticleDocumentV2,
  assertPublicArticleDocumentV2 as assertSharedPublicArticleDocumentV2,
  type ArticleDocumentV2,
  type ArticleSourceBlock,
  type ArticleSourceRail,
  type ArticleVerificationItem,
  type PublicArticleDocumentV2,
} from "@axiom-dp/contracts/article";
import { z } from "zod";
import { getPublicArticle as projectPublicArticle } from "@axiom-dp/article-editorial";

export {
  ARTICLE_DOCUMENT_SCHEMA_VERSION,
  assertSharedArticleDocumentV2 as assertArticleDocumentV2,
  assertSharedPublicArticleDocumentV2 as assertPublicArticleDocumentV2,
};
export type {
  ArticleDocumentV2,
  ArticleSourceBlock,
  ArticleSourceRail,
  ArticleVerificationItem,
  PublicArticleDocumentV2,
};

const text = z.string().trim().min(1);
const optionalText = text.nullish().transform((value) => value ?? undefined);

const publicationSchema = z.object({
  status: z.enum(["draft", "review", "ready", "published"]),
  author: text,
  publishedAt: optionalText,
  updatedAt: optionalText,
});

const publicPublicationSchema = publicationSchema.omit({ status: true });

const articleMetaSchema = z.object({
  slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  topic: text,
  category: text,
  primaryIntent: text,
  audience: text,
  estimatedReadTime: z.number().int().positive(),
});

const articleHeroSchema = z.object({
  category: text,
  eyebrow: text,
  title: text,
  displayTitle: optionalText,
  subtitle: text,
  excerpt: text,
  estimatedReadTime: text,
  heroSummary: z.array(text).min(1),
});

const articleSeoSchema = z.object({
  title: optionalText,
  description: optionalText,
  canonical: optionalText,
  index: z.boolean().optional(),
  follow: z.boolean().optional(),
  socialTitle: optionalText,
  socialDescription: optionalText,
  socialImage: optionalText,
});

const articleMediaSchema = z.object({
  heroImage: optionalText,
  heroImageAlt: optionalText,
});

const railSchema = z
  .object({
    type: z.enum([
      "caseStudySummary",
      "comparisonSummary",
      "currentTopic",
      "decisionSummary",
      "metric",
      "nextAction",
      "progress",
      "summary",
    ]),
    label: text,
    title: optionalText,
    summary: optionalText,
    left: optionalText,
    right: optionalText,
    value: optionalText,
    caption: optionalText,
    steps: z.array(text).optional(),
    items: z
      .array(
        z.union([
          text,
          z.object({
            label: text,
            value: text,
          }),
        ]),
      )
      .optional(),
    metrics: z
      .array(
        z.object({
          label: text,
          value: text,
        }),
      )
      .optional(),
  })
  .strict();

// The shared contracts package is the authoritative closed validator. Keep
// this routing schema deliberately lossless so additive block fields are not
// stripped before the shared integrity boundary runs below.
export const articleSourceBlockSchema = z
  .object({
    type: z.enum([
      "lead", "explanation", "keyInsight", "definition", "comparison",
      "expertNote", "checklist", "process", "decision", "caseStudy",
      "financialDelta", "clientEvidence", "interactiveTool", "nextAction",
      "paragraph", "richText", "heading", "list", "quote", "divider",
      "table", "image", "gallery", "video", "audio", "file", "embed",
      "callout", "keyTakeaway", "statistic", "timeline", "cta",
    ]),
  })
  .passthrough() as z.ZodType<ArticleSourceBlock>;

const articleSectionSchema = z.object({
  id: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  eyebrow: text,
  title: text,
  intro: optionalText,
  rail: railSchema.nullable(),
  blocks: z.array(articleSourceBlockSchema).min(1),
  layout: z.enum(["article", "wide", "split"]).optional(),
  spacing: z.enum(["compact", "normal", "generous"]).optional(),
  anchor: optionalText,
});

const articleConclusionSchema = z.object({
  title: text,
  paragraphs: z.array(text).min(1),
});

const relatedTopicSchema = z.object({
  topic: text,
  reason: text,
  slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
});

const articleReviewSchema = z
  .object({
    status: z.enum(["pending", "approved", "changes_requested"]),
    reviewedBy: optionalText,
    reviewedAt: optionalText,
    note: optionalText,
  })
  .strict();

export const articleVerificationItemSchema = z
  .object({
    id: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: text,
    instruction: text,
    status: z.enum(["pending", "verified", "rejected", "not_applicable"]),
    severity: z.enum(["blocking", "advisory"]),
    blocksPublish: z.boolean(),
    visibility: z.literal("internal"),
    sectionId: optionalText,
    blockId: optionalText,
    claimRef: optionalText,
    evidenceRequired: optionalText,
    sources: z.array(text).optional(),
    verifiedBy: optionalText,
    verifiedAt: optionalText,
    expiresAt: optionalText,
    requiresRecheck: z.boolean().optional(),
    note: optionalText,
  })
  .strict();

const articleEditorialSchema = z
  .object({
    contentStatus: text,
    sourceBasis: text,
    needsExternalVerification: z.boolean(),
    sensitivity: optionalText,
    review: articleReviewSchema,
    verificationItems: z.array(articleVerificationItemSchema),
    productionNotes: z.object({}).passthrough().optional(),
  })
  .strict();

export const publicArticleDocumentV2Schema = z
  .object({
    schemaVersion: z.literal(ARTICLE_DOCUMENT_SCHEMA_VERSION),
    publication: publicPublicationSchema,
    meta: articleMetaSchema,
    seo: articleSeoSchema.optional(),
    media: articleMediaSchema.optional(),
    hero: articleHeroSchema,
    sections: z.array(articleSectionSchema).min(1),
    conclusion: articleConclusionSchema,
    relatedTopics: z.array(relatedTopicSchema).default([]),
  })
  .strict();

export const articleDocumentV2Schema = z
  .object({
    schemaVersion: z.literal(ARTICLE_DOCUMENT_SCHEMA_VERSION),
    publication: publicationSchema,
    meta: articleMetaSchema,
    seo: articleSeoSchema.optional(),
    media: articleMediaSchema.optional(),
    hero: articleHeroSchema,
    sections: z.array(articleSectionSchema).min(1),
    conclusion: articleConclusionSchema,
    relatedTopics: z.array(relatedTopicSchema).default([]),
    editorial: articleEditorialSchema,
  })
  .strict();

export function getPublicArticle(
  article: ArticleDocumentV2,
): PublicArticleDocumentV2 {
  const projected = publicArticleDocumentV2Schema.parse(
    projectPublicArticle(article),
  );
  return assertSharedPublicArticleDocumentV2(
    projected,
  ) as PublicArticleDocumentV2;
}

export function parseArticleDocumentV2(
  value: unknown,
  sourceName: string,
): ArticleDocumentV2 {
  const result = articleDocumentV2Schema.safeParse(value);

  if (result.success) {
    // Zod intentionally accepts legacy nullish optional text and normalizes it
    // to undefined. The shared wire is JSON-only, so remove those omitted keys
    // before crossing the authoritative contract boundary.
    const normalized = JSON.parse(JSON.stringify(result.data)) as unknown;
    try {
      return assertSharedArticleDocumentV2(normalized) as ArticleDocumentV2;
    } catch (error) {
      throw new Error(
        `Invalid ArticleDocumentV2 in ${sourceName}: shared contract integrity failure.`,
        { cause: error },
      );
    }
  }

  const details = result.error.issues
    .map((issue) => `${issue.path.join(".") || "document"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid ArticleDocumentV2 in ${sourceName}:\n${details}`);
}
