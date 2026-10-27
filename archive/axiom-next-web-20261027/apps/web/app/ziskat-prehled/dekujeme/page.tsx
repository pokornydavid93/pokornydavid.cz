import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getOverviewRuntime,
  isProductionProviderUnavailable,
  type SubmissionReceipt,
} from "../../../lib/leads/runtime.server";
import {
  OVERVIEW_CONFIRMATION_EMAIL_COOKIE,
  readOverviewConfirmationEmailStatus,
  type OverviewConfirmationEmailStatus,
} from "../../../lib/leads/overview-confirmation-email";
import { OVERVIEW_RECEIPT_COOKIE } from "../../../lib/leads/receipt-cookie";
import { knownMainSiteHref } from "@/lib/site-mode-routes";
import OverviewHeader from "../OverviewHeader";
import s from "../overview.module.css";
import ThankYouAnalytics from "./ThankYouAnalytics.client";
import ThankYouExperience from "./ThankYouExperience.client";
import { getThankYouRelatedArticles } from "./related-articles.server";
import pageStyles from "./thankYouPage.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Děkuji",
  description: "Potvrzení serverem přijatého prvního kontaktu.",
  robots: { index: false, follow: false },
};

export default async function OverviewThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ nahled?: string | string[] }>;
}) {
  const query = await searchParams;
  const isPreview = process.env.NODE_ENV === "development" && query.nahled === "1";
  let confirmationEmailStatus: OverviewConfirmationEmailStatus = isPreview ? "queued" : "unavailable";
  let acceptedIntent: SubmissionReceipt["intent"] = "overview";

  if (!isPreview) {
    const cookieStore = await cookies();
    const receiptId = cookieStore.get(OVERVIEW_RECEIPT_COOKIE)?.value;
    if (!receiptId) redirect("/ziskat-prehled/");

    let receipt: SubmissionReceipt | null = null;
    try {
      const runtime = getOverviewRuntime();
      receipt = await runtime.receipts.read(receiptId);
    } catch (error) {
      if (!isProductionProviderUnavailable(error)) throw error;
    }
    if (!receipt) redirect("/ziskat-prehled/");
    acceptedIntent = receipt.intent;
    confirmationEmailStatus = receipt.confirmationEmailStatus ??
      readOverviewConfirmationEmailStatus(
        cookieStore.get(OVERVIEW_CONFIRMATION_EMAIL_COOKIE)?.value,
        receiptId,
        process.env.AXIOM_MAIL_WORKFLOW_TOKEN,
      );
  }

  const websiteHref = knownMainSiteHref(
    "/",
    process.env.NEXT_PUBLIC_SITE_MODE,
    process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN,
  );
  const recommendedArticles = await getThankYouRelatedArticles(acceptedIntent);
  const articles = recommendedArticles.flatMap((article) => {
    const href = knownMainSiteHref(
      `/clanky/${article.slug}/`,
      process.env.NEXT_PUBLIC_SITE_MODE,
      process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN,
    );
    return href ? [{ ...article, href }] : [];
  });

  return (
    <div className={s.utilityPage} data-surface-tone="light">
      <OverviewHeader showBackLink={false} />
      <main data-route-reveal-root data-route-reveal-profile="staged" className={s.utilityMain} id="main-content">
        <div className={pageStyles.page} data-preview={isPreview || undefined}>
          {isPreview ? (
            <p className={pageStyles.previewNotice}>Náhled stránky · Nic nebylo odesláno</p>
          ) : (
            <ThankYouAnalytics />
          )}
          <ThankYouExperience
            articles={articles}
            emailStatus={confirmationEmailStatus}
            websiteHref={websiteHref}
          />
        </div>
      </main>
    </div>
  );
}
