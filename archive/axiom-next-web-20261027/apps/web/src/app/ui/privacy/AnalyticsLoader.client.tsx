"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import type { AxiomWebPrivacyConfiguration } from "@axiom/web-core";
import {
  configureCookieConsent,
  getServerCookieConsent,
  readCookieConsent,
  subscribeCookieConsent,
} from "./cookieConsent";
import { disableGaRuntime } from "./gaCleanup";
import { clearAxiomMeasurementSession } from "@/lib/analytics/axiom-first-party.client";
import { canSendAxiomAnalytics, canSendGaAnalytics, configureAnalyticsRuntime, gaPageContext } from "@/lib/analytics/runtime.client";

type AnalyticsLoaderProps = {
  configuration: AxiomWebPrivacyConfiguration;
};

export default function AnalyticsLoader({ configuration }: AnalyticsLoaderProps) {
  const pathname = usePathname();
  const isInternalDesignRoute = pathname?.startsWith("/design-language");
  const policy = useMemo(() => ({
    version: configuration.consent_policy_version,
    acceptedTtlDays: configuration.consent_grant_ttl_days,
    rejectedTtlDays: configuration.consent_reject_ttl_days,
  } as const), [configuration.consent_grant_ttl_days, configuration.consent_policy_version, configuration.consent_reject_ttl_days]);
  configureCookieConsent(policy);
  configureAnalyticsRuntime(configuration);
  const consent = useSyncExternalStore(
    subscribeCookieConsent,
    readCookieConsent,
    getServerCookieConsent,
  );
  const measurementId = configuration.analytics_mode === "ga4_only" || configuration.analytics_mode === "axiom_and_ga4"
    ? configuration.ga4_measurement_id?.trim()
    : undefined;

  const shouldLoad =
    !isInternalDesignRoute && Boolean(measurementId) && consent === "accepted";

  useEffect(() => subscribeCookieConsent(() => {
    // Stop an already loaded provider synchronously, before React rerenders.
    if (!canSendGaAnalytics()) disableGaRuntime(measurementId);
    if (!canSendAxiomAnalytics()) clearAxiomMeasurementSession();
  }), [measurementId]);

  useEffect(() => {
    if (!canSendAxiomAnalytics()) clearAxiomMeasurementSession();
    if (!shouldLoad || !measurementId || !canSendGaAnalytics()) {
      disableGaRuntime(measurementId);
      return undefined;
    }

    const gaWindow = window as Window & { dataLayer?: unknown[] };
    const flags = window as unknown as Record<string, unknown>;
    flags[`ga-disable-${measurementId}`] = false;
    const dataLayer = gaWindow.dataLayer ?? [];
    gaWindow.dataLayer = dataLayer;
    // The rest parameter types the public command signature; Google consumes arguments below.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function gtag(..._args: unknown[]) {
      // Google command parsing requires the function arguments object.
      // A loaded script or queued event must not outlive the current consent.
      // eslint-disable-next-line prefer-rest-params -- Preserve Google's IArguments queue protocol.
      if (canSendGaAnalytics()) dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: configuration.consent_grant_ttl_days * 86400,
      send_page_view: false,
      ...gaPageContext(),
    });
    return () => disableGaRuntime(measurementId);
  }, [configuration.analytics_mode, configuration.consent_grant_ttl_days, measurementId, shouldLoad, consent]);

  useEffect(() => {
    if (!shouldLoad || !canSendGaAnalytics()) return;
    window.gtag?.("event", "page_view", gaPageContext());
  }, [pathname, shouldLoad]);

  if (!shouldLoad || !measurementId) return null;

  return (
    <>
      <Script
        id={`ga4-script-${measurementId}`}
        data-web-ga4="true"
        referrerPolicy="origin"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
