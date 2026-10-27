"use server";

import { cookies } from "next/headers";
import { hasCurrentAnalyticsConsent } from "../../../lib/analytics/consent-policy";
import { getWebPrivacyConfiguration } from "../../../lib/privacy/webPrivacyRuntime.server";
import {
  getOverviewRuntime,
  isProductionProviderUnavailable,
} from "../../../lib/leads/runtime.server";
import {
  OVERVIEW_ANALYTICS_CLAIM_COOKIE,
  OVERVIEW_RECEIPT_COOKIE,
} from "../../../lib/leads/receipt-cookie";

export async function claimOverviewSuccessAnalytics(consent: unknown) {
  const privacy = await getWebPrivacyConfiguration();
  if (privacy.analytics_mode === "disabled") return { status: "disabled" as const };
  if (!hasCurrentAnalyticsConsent(consent, privacy)) {
    return { status: "consent-required" as const };
  }
  const cookieStore = await cookies();
  const receiptId = cookieStore.get(OVERVIEW_RECEIPT_COOKIE)?.value;
  if (!receiptId) return { status: "missing" as const };

  try {
    const runtime = getOverviewRuntime();
    const receipt = await runtime.receipts.read(receiptId);
    if (!receipt) return { status: "missing" as const };
    const claim = await runtime.receipts.claimAnalytics(
      receiptId,
      cookieStore.get(OVERVIEW_ANALYTICS_CLAIM_COOKIE)?.value,
    );
    if (claim.status !== "claimed") return { status: claim.status } as const;
    if (claim.marker) {
      cookieStore.set(OVERVIEW_ANALYTICS_CLAIM_COOKIE, claim.marker.value, {
        httpOnly: true,
        maxAge: claim.marker.maxAge,
        path: "/ziskat-prehled",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return {
      status: "claimed" as const,
      source: receipt.source.context ?? "direct",
      intent: receipt.intent,
      ...(receipt.topic ? { topic: receipt.topic } : {}),
    };
  } catch (error) {
    if (isProductionProviderUnavailable(error)) return { status: "missing" as const };
    throw error;
  }
}
