import type { Metadata, Viewport } from "next";
import { randomUUID } from "node:crypto";
import { createPageMetadata } from "@/lib/seo";
import { parseLeadQuery } from "../../lib/leads/lead-query";
import { createOverviewFormState } from "../../lib/leads/overview-request";
import { knownMainSiteHref } from "../../lib/site-mode-routes";
import OverviewBackdrop from "./OverviewBackdrop.client";
import OverviewRequestForm from "./OverviewRequestForm.client";
import s from "./overviewFunnel.module.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#04130c",
};

export const metadata: Metadata = createPageMetadata({
  title: "Získat přehled ve financích",
  description: "Řešíte hypotéku, pojištění, úspory nebo investice? Vyberte téma a nechte mi kontakt pro úvodní hovor.",
  path: "/ziskat-prehled/",
  robots: { index: false, follow: true },
});

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const campaignHandle = typeof query.axiom_campaign === "string" &&
    /^[a-z2-7]{26}$/u.test(query.axiom_campaign)
    ? query.axiom_campaign
    : undefined;
  const parsed = parseLeadQuery({
    intent: query.intent,
    topic: query.topic,
    source: query.source,
    cta: query.cta,
    situation: query.situation,
    situace: query.situace,
    src: query.src,
  });
  const initialState = createOverviewFormState({
    campaignHandle,
    cta: parsed.cta,
    idempotencyKey: randomUUID(),
    intent: parsed.intent,
    source: parsed.source,
    topic: parsed.topic,
  });

  return (
    <div className={s.page} data-overview-funnel data-surface-tone="dark">
      <OverviewBackdrop />
      <main className={s.pageContent} id="main-content">
        <OverviewRequestForm
          initialState={initialState}
          initialStep={parsed.hasSpecificContext ? 2 : 1}
          websiteHref={knownMainSiteHref("/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)}
          legalHref={knownMainSiteHref("/pravni-informace/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)}
        />
      </main>
    </div>
  );
}
