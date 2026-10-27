import type { ProjectHostingFormClient } from "@axiom/next/project-hosting-form";
import type { BlogPost } from "../blog.ts";
import { articleScreeningTopics, type ArticleScreeningRequest, type ArticleScreeningResult } from "./article-screening-request.ts";

/** Article identity and topic are derived from the same source used by the renderer. */
export async function acceptArticleScreening(
  request: ArticleScreeningRequest,
  dependencies: Readonly<{
    publicHostname: string;
    articleBySlug: (slug: string) => Promise<BlogPost | null>;
    intake: Pick<ProjectHostingFormClient, "submit">;
  }>,
): Promise<ArticleScreeningResult> {
  const article = await dependencies.articleBySlug(request.articleSlug);
  const hasMatchingScreening = article?.sections?.length
    ? article.sections.some((section) => section.blocks.some((block) =>
      block.type === "interactiveTool" && block.tool === "screening" && block.screeningType === request.screeningType,
    ))
    : article?.articleFlow?.screening?.type === request.screeningType;
  if (!article || article.slug !== request.articleSlug || !hasMatchingScreening) return { status: "error", reason: "invalid" };
  const topic = articleScreeningTopics[request.screeningType];
  const receipt = await dependencies.intake.submit({
    schema_version: 1,
    form_id: "article-screening",
    public_hostname: dependencies.publicHostname,
    request_id: request.requestId,
    intent: topic.intent,
    topic: topic.topic,
    situation_note: "",
    phone: request.phone,
    email: request.email,
    first_name: request.name,
    preferred_call_time: "",
    source_context: "article",
    source_cta: "article-screening-check",
    privacy_notice_version: request.privacyNoticeVersion,
    submitted_at: request.submittedAt,
    article_context: { slug: article.slug, title: article.title, screening_type: request.screeningType },
  });
  // The intake atomically creates both mail jobs before accepting. A retry
  // remains accepted even if a delivery has since reached a terminal state;
  // queued status describes delivery state, not whether the inquiry exists.
  if (receipt.intent !== topic.intent || receipt.masked_phone.slice(-3) !== request.phone.slice(-3)) {
    return { status: "error", reason: "unavailable" };
  }
  return { status: "accepted", receiptId: receipt.receipt_id };
}
