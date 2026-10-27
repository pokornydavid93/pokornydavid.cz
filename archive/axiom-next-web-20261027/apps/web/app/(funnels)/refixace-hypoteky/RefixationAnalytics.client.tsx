"use client";

import { useEffect } from "react";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

export default function RefixationAnalytics() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const attribution = {
      source: params.get("src") ?? undefined,
      situation: params.get("situation") ?? undefined,
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
      utm_content: params.get("utm_content") ?? undefined,
      utm_term: params.get("utm_term") ?? undefined,
    };

    gaEvent("hero_view", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
      ...Object.fromEntries(
        Object.entries(attribution).filter(([, value]) => Boolean(value)),
      ),
    });
  }, []);

  return null;
}
