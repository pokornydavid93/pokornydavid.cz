import "server-only";
import { AxiomRuntimeError } from "@axiom/web-core/runtime";
import { getArticleBySlug } from "../article-content.server";
import { projectFormClientFromEnvironment } from "./project-form-runtime.server";
import { acceptArticleScreening } from "./article-screening-service";
import type { ArticleScreeningRequest, ArticleScreeningResult } from "./article-screening-request";
import { isCanonicalProjectPublicHost } from "./project-public-host";

export async function submitArticleScreening(request: ArticleScreeningRequest, publicHostname: string): Promise<ArticleScreeningResult> {
  // Private SDK credentials and release authority are mandatory in every environment.
  // There is no legacy API or in-memory fallback pretending to accept a CRM inquiry.
  if (!isCanonicalProjectPublicHost(publicHostname)) return { status: "error", reason: "unavailable" };
  try {
    return await acceptArticleScreening(request, {
      publicHostname,
      articleBySlug: getArticleBySlug,
      intake: projectFormClientFromEnvironment(),
    });
  } catch (error) {
    if (error instanceof AxiomRuntimeError) {
      if (error.status === 400) return { status: "error", reason: "invalid" };
      if (error.status === 409) return { status: "error", reason: "conflict" };
      if (error.status === 429) return { status: "error", reason: "rate-limited" };
    }
    return { status: "error", reason: "unavailable" };
  }
}
