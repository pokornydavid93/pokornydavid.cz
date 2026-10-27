"use client";

import type { AxiomWebPrivacyConfiguration } from "@axiom/web-core";
import { readCookieConsent } from "../../src/app/ui/privacy/cookieConsent.ts";

type AnalyticsMode = AxiomWebPrivacyConfiguration["analytics_mode"];
let activeMode: AnalyticsMode = "disabled";
const runtimeListeners = new Set<() => void>();

export function subscribeAnalyticsRuntime(listener: () => void) {
  runtimeListeners.add(listener);
  return () => { runtimeListeners.delete(listener); };
}

export function configureAnalyticsRuntime(configuration: Pick<AxiomWebPrivacyConfiguration, "analytics_mode">) {
  // Server rendering must not share one visitor's configuration with another.
  if (typeof window !== "undefined" && activeMode !== configuration.analytics_mode) {
    activeMode = configuration.analytics_mode;
    // Configuration is installed during render. Notify after that render completes.
    queueMicrotask(() => runtimeListeners.forEach((listener) => listener()));
  }
}

function hasAnalyticsConsent() {
  return typeof window !== "undefined"
    && !window.location.pathname.startsWith("/design-language")
    && readCookieConsent() === "accepted";
}

export function canSendAxiomAnalytics() {
  return (activeMode === "axiom_only" || activeMode === "axiom_and_ga4")
    && hasAnalyticsConsent();
}

export function canSendGaAnalytics() {
  return (activeMode === "ga4_only" || activeMode === "axiom_and_ga4")
    && hasAnalyticsConsent();
}

export function canSendAnalytics() {
  return canSendAxiomAnalytics() || canSendGaAnalytics();
}

export function sanitizeAnalyticsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? `${url.origin}${url.pathname}`
      : "";
  } catch {
    return "";
  }
}

export function gaPageContext() {
  return {
    page_location: sanitizeAnalyticsUrl(window.location.href),
    page_path: window.location.pathname,
    page_referrer: sanitizeAnalyticsUrl(document.referrer),
  };
}
