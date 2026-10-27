import { Send } from "lucide-react";
import NextLink from "next/link";
import Link from "@/app/ui/primitives/Link";
import type { LeadTopic as LegacyLeadTopic } from "@/lib/api";
import { createLeadHref } from "@/lib/leads/lead-contract";
import { getArticleLeadContext, type ArticleLeadContext } from "./articleLeadContext";

type ArticleLeadButtonProps = {
  cta?: "article-final" | "article-inline" | "article-screening";
  className?: string;
  docked?: boolean;
  label: string;
  topic?: LegacyLeadTopic;
  fallbackTopic?: LegacyLeadTopic;
  conversionId?: string;
  inheritedContext?: ArticleLeadContext;
};

export default function ArticleLeadButton({
  cta = "article-inline",
  className,
  docked = false,
  label,
  topic,
  fallbackTopic,
  conversionId,
  inheritedContext,
}: ArticleLeadButtonProps) {
  const context = getArticleLeadContext({ topic, fallbackTopic, conversionId, inheritedContext });
  const ctaId = context?.topic === "mortgage-refixation" && cta === "article-inline"
    ? "quick-refixation-check"
    : {
        "article-final": "article-final-check",
        "article-inline": "article-inline-check",
        "article-screening": "article-screening-check",
      }[cta];
  const href = createLeadHref({
    cta: ctaId,
    ...(context ?? {}),
    source: "article",
  });
  if (docked) {
    return (
      <Link
        className={className}
        data-cta-composition="docked"
        data-cursor="action"
        data-cursor-icon="send"
        href={href}
        variant="secondary-action"
      >
        <span data-cta-label>{label}</span>
        <span aria-hidden="true" data-cta-icon-shell>
          <span data-cta-icon-motion>
            <Send aria-hidden="true" data-cta-icon="paper-plane" />
          </span>
        </span>
      </Link>
    );
  }

  return (
    <NextLink
      className={className}
      data-cursor="action"
      data-cursor-icon="send"
      data-cursor-label="ZÍSKAT PŘEHLED • ZAČÍT PRVNÍM KROKEM •"
      data-cursor-magnetic="true"
      href={href}
    >
      {label}
    </NextLink>
  );
}
