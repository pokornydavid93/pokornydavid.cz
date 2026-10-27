import type { Metadata } from "next";
import { MarketingPageShell } from "@/app/components/multipage/MarketingPage";
import {
  testimonialReferenceFeaturedReview,
  testimonialReferenceReviews,
  testimonialTrustMetrics,
} from "@/app/content/testimonials";
import { createPageMetadata } from "@/lib/seo";
import ReferencesExperience from "./ReferencesExperience.client";
import s from "./references.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Reference a zkušenosti klientů",
  description:
    "Přečtěte si ověřené zkušenosti mých klientů. Nejčastěji zmiňují srozumitelnost, lidský přístup a klid v rozhodování.",
  path: "/reference/",
});

export default function ReferencesPage() {
  return (
    <MarketingPageShell
      currentPath="/reference/"
      footerClassName={s.referencesFooter}
      headerClassName={s.referencesHeader}
    >
      <ReferencesExperience
        featuredReview={testimonialReferenceFeaturedReview}
        reviews={testimonialReferenceReviews}
        trustMetrics={testimonialTrustMetrics}
      />
    </MarketingPageShell>
  );
}
