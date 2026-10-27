"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { AxiomWebPrivacyConfiguration } from "@axiom/web-core";
import {
  isKnownInternalHref,
  isOverviewSource,
} from "../../lib/homepage/routing";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import { startJourney } from "../../lib/analytics/journey.client";
import { configureCookieConsent, subscribeCookieConsent } from "@/src/app/ui/privacy/cookieConsent";
import { canSendAnalytics, configureAnalyticsRuntime, subscribeAnalyticsRuntime } from "../../lib/analytics/runtime.client";

export default function PublicAnalytics({ configuration }: { configuration: AxiomWebPrivacyConfiguration }) {
  const pathname = usePathname();
  const enabled = configuration.analytics_mode !== "disabled";
  const axiomEnabled = configuration.analytics_mode === "axiom_only" || configuration.analytics_mode === "axiom_and_ga4";
  configureAnalyticsRuntime(configuration);
  configureCookieConsent({
    version: configuration.consent_policy_version,
    acceptedTtlDays: configuration.consent_grant_ttl_days,
    rejectedTtlDays: configuration.consent_reject_ttl_days,
  });

  useEffect(() => {
    if (!axiomEnabled) return undefined;
    const path = pathname || "/";
    // The calculator owns its detailed journey; all other public routes get
    // page attention. Internal, query-bearing and arbitrary paths are excluded.
    if (path.replace(/\/$/u, "") === "/test-jednoho-prijmu") return undefined;
    if (!/^\/(?:|clanky(?:\/[a-z0-9][a-z0-9-]*)?|blog(?:\/[a-z0-9][a-z0-9-]*)?|jak-pracuji|kdo-jsem|osvedceni-a-certifikace|reference|sluzby|refixace-hypoteky|ziskat-prehled(?:\/dekujeme)?|cookies-a-mereni|pravni-informace|zasady-zpracovani-osobnich-udaju)\/?$/u.test(path) || path.length > 240) return undefined;
    const journey = startJourney(() => "page", { path, formId: "website" });
    return journey.stop;
  }, [axiomEnabled, pathname]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-analytics-event]")
        : null;
      if (!target) return;

      const eventName = target.dataset.analyticsEvent;
      if (eventName === "home_primary_cta_click") {
        const placement = target.dataset.analyticsPlacement;
        if (
          placement === "header"
          || placement === "hero"
          || placement === "outcome"
          || placement === "references"
          || placement === "final"
        ) {
          gaEvent(eventName, { placement });
        }
      }
      if (eventName === "home_situation_select") {
        const destination = target.dataset.analyticsDestination;
        const source = target.dataset.analyticsSource;
        if (
          destination
          && isKnownInternalHref(destination)
          && source
          && isOverviewSource(source)
        ) {
          gaEvent(eventName, { source });
        }
      }
      if (eventName === "lead_flow_direct_contact_click") {
        const channel = target.dataset.analyticsContact;
        const placement = target.dataset.analyticsPlacement;
        if (
          (channel === "email" || channel === "phone")
          && (placement === "header" || placement === "form" || placement === "error" || placement === "success")
        ) {
          gaEvent(eventName, { channel, placement });
        }
      }
    };

    const reconcile = () => {
      document.removeEventListener("click", onClick);
      if (canSendAnalytics()) document.addEventListener("click", onClick);
    };
    const unsubscribeConsent = subscribeCookieConsent(reconcile);
    const unsubscribeRuntime = subscribeAnalyticsRuntime(reconcile);
    reconcile();
    return () => {
      unsubscribeConsent(); unsubscribeRuntime();
      document.removeEventListener("click", onClick);
    };
  }, [enabled]);

  return null;
}
