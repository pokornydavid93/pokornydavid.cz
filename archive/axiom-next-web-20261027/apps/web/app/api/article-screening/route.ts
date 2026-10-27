import { formPrivacyNotice } from "@/app/content/form-privacy";
import { handleArticleScreeningPost } from "@/lib/leads/article-screening-http";
import { submitArticleScreening } from "@/lib/leads/article-screening-runtime.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleArticleScreeningPost(request, { noticeVersion: formPrivacyNotice.version, submit: submitArticleScreening });
}
