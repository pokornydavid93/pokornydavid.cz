import type { LeadTopic as LegacyLeadTopic } from "@/lib/api";
import type { BlogPostMeta } from "@/lib/blog";
import type { LeadIntent, LeadTopic } from "@/lib/leads/lead-contract";
import type { ArticleConversionId } from "./articleConversionBlocks";

export type ArticleLeadContext = Readonly<{
  intent: LeadIntent;
  topic: LeadTopic;
}>;

const categoryContexts: Partial<Record<LegacyLeadTopic, ArticleLeadContext>> = {
  "Finanční plán": { intent: "overview", topic: "financial-plan" },
  "Hypotéka & bydlení": { intent: "housing", topic: "mortgage" },
  "Ochrana majetku": { intent: "protection", topic: "property-insurance" },
  "Zajištění příjmu": { intent: "protection", topic: "income-protection" },
  "Investice a spoření": { intent: "future", topic: "investments" },
};

const conversionContexts = {
  "fixace-hypoteky": { intent: "housing", topic: "mortgage-refixation" },
  "zdrazovani-pojisteni": { intent: "protection", topic: "property-insurance" },
  "zajisteni-prijmu": { intent: "protection", topic: "income-protection" },
  "investicni-chaos": { intent: "future", topic: "investments" },
} as const satisfies Record<ArticleConversionId, ArticleLeadContext>;

function knownConversion(id: string | undefined): ArticleConversionId | undefined {
  return id && Object.prototype.hasOwnProperty.call(conversionContexts, id)
    ? id as ArticleConversionId
    : undefined;
}

/** Infer an article-wide invitation only when its authored conversions agree. */
export function getArticleConversionContext(
  post: Pick<BlogPostMeta, "sections" | "articleFlow">,
): ArticleLeadContext | undefined {
  const conversions = new Set<ArticleConversionId>();
  const add = (id: string | undefined) => {
    const known = knownConversion(id);
    if (known) conversions.add(known);
  };

  add(post.articleFlow?.screening?.conversionId);
  add(post.articleFlow?.finalCta?.conversionId);
  for (const section of post.sections ?? []) {
    for (const block of section.blocks) {
      if (block.type === "nextAction" || block.type === "interactiveTool") {
        add(block.conversionId);
      } else if (block.type === "checklist") {
        add(block.action?.conversionId);
      }
    }
  }

  if (conversions.size !== 1) return undefined;
  return conversionContexts[conversions.values().next().value!];
}

/** A specific action wins over article inheritance, then the broad category. */
export function getArticleLeadContext({
  topic,
  fallbackTopic,
  conversionId,
  inheritedContext,
}: {
  topic?: LegacyLeadTopic;
  fallbackTopic?: LegacyLeadTopic;
  conversionId?: string;
  inheritedContext?: ArticleLeadContext;
}): ArticleLeadContext | undefined {
  const known = knownConversion(conversionId);
  if (known) return conversionContexts[known];

  const actionContext = topic ? categoryContexts[topic] : undefined;
  if (actionContext) {
    const compatible = inheritedContext && (
      inheritedContext.topic === actionContext.topic ||
      (actionContext.topic === "mortgage" && inheritedContext.topic === "mortgage-refixation")
    );
    return compatible ? inheritedContext : actionContext;
  }
  return inheritedContext ?? (fallbackTopic ? categoryContexts[fallbackTopic] : undefined);
}
