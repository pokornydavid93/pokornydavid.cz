import type { Metadata } from "next";
import TemplatePreviewContent, { type TemplatePreviewId } from "./TemplatePreviewContent";

export const metadata: Metadata = {
  title: "Template preview",
  robots: { index: false, follow: false },
};

type TemplatePreviewPageProps = {
  searchParams?: Promise<{ template?: string }>;
};

const templateIds = new Set<TemplatePreviewId>([
  "home",
  "index",
  "content-detail",
  "article-detail",
  "conversion",
  "legal",
  "system",
]);

export default async function TemplatePreviewPage({ searchParams }: TemplatePreviewPageProps) {
  const requestedTemplate = (await searchParams)?.template;
  const template = requestedTemplate && templateIds.has(requestedTemplate as TemplatePreviewId)
    ? requestedTemplate as TemplatePreviewId
    : "home";

  return <TemplatePreviewContent template={template} />;
}
