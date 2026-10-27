"use client";

import { useEffect, useRef } from "react";
import {
  readCookieConsentRecord,
  subscribeCookieConsent,
} from "@/src/app/ui/privacy/cookieConsent";
import {
  analyticsCanSend,
  trackAnalyticsEvent,
} from "../../../lib/analytics/track.client";
import { claimOverviewSuccessAnalytics } from "./analytics-actions";

export default function ThankYouAnalytics() {
  const claimPromiseRef = useRef<ReturnType<typeof claimOverviewSuccessAnalytics> | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let completed = false;
    let timer: number | undefined;

    const attempt = async (remaining = 20) => {
      const consent = readCookieConsentRecord();
      if (cancelled || completed || consent?.choice !== "accepted") return;
      if (!analyticsCanSend()) {
        if (remaining > 0) {
          timer = window.setTimeout(() => void attempt(remaining - 1), 250);
        }
        return;
      }

      claimPromiseRef.current ??= claimOverviewSuccessAnalytics(consent);
      const claim = await claimPromiseRef.current;
      if (cancelled || sentRef.current) return;
      if (claim.status !== "claimed") {
        completed = claim.status === "already-claimed";
        claimPromiseRef.current = null;
        return;
      }
      sentRef.current = trackAnalyticsEvent({
        name: "lead_submit_success",
        source: claim.source,
        intent: claim.intent,
        ...(claim.topic ? { topic: claim.topic } : {}),
      });
      completed = sentRef.current;
      if (!completed && remaining > 0) {
        timer = window.setTimeout(() => void attempt(remaining - 1), 250);
      }
    };

    const onConsentChange = () => void attempt();
    void attempt();
    const unsubscribe = subscribeCookieConsent(onConsentChange);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return null;
}
