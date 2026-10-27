"use client";

import { subscribeCookieConsent } from "../../src/app/ui/privacy/cookieConsent.ts";
import { canSendAxiomAnalytics, subscribeAnalyticsRuntime } from "./runtime.client.ts";
import { createAxiomMeasurementId, clearAxiomMeasurementSession, getAxiomMeasurementSession, queueAxiomFirstPartyEvent, type AxiomPublicationEventType } from "./axiom-first-party.client.ts";
import { JOURNEY_CTAS, JOURNEY_PLACEMENTS, JOURNEY_SECTIONS, JOURNEY_STEPS, JOURNEY_FLUSH_MS, JOURNEY_MAX_ACTIVE_MS, JourneyClock, type JourneyStep, type JourneySection, type JourneyReason } from "./journey.ts";

const includes = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === "string" && (values as readonly string[]).includes(value);

type JourneyEnvelope = { schema_version: 1; analytics_consent: "granted"; form_id: "income-test" | "website"; page_instance_id: string; source_kind: string; step: JourneyStep; section: JourneySection };
export type JourneyController = {
  stepChanged: () => void;
  event: (eventName: string, eventType: AxiomPublicationEventType, originStep?: JourneyStep) => boolean;
  stop: () => void;
};

/** One mounted funnel. No activity listeners, observer, timer or measurement ID
 * exist until both the configured provider and current consent allow them. */
export function startJourney(getStep: () => JourneyStep, options: { path: string; formId: "income-test" | "website" } = { path: "/test-jednoho-prijmu/", formId: "income-test" }): JourneyController {
  const { path, formId } = options;
  let stopMeasurement: (() => void) | undefined;
  let updateStep: (() => void) | undefined;
  let sendEvent: JourneyController["event"] | undefined;
  let disposed = false;

  function begin() {
    const initialSession = getAxiomMeasurementSession(document.visibilityState === "visible" && document.hasFocus());
    if (!initialSession) return;
    let sessionKey = initialSession.key;
    let pageId = createAxiomMeasurementId();
    let clock = new JourneyClock(performance.now(), getStep(), document.visibilityState === "visible", document.hasFocus());
    let sequence = 0;
    let previousSnapshot = "";
    let stopped = false;
    let raf = 0;
    let pageSuspended = false;
    let previousSections = "";
    let lastSectionFlushAt = -Infinity;
    const observed = new Set<Element>();

    function envelope(originStep?: JourneyStep): JourneyEnvelope {
      return { schema_version: 1, analytics_consent: "granted", form_id: formId, page_instance_id: pageId,
        source_kind: getAxiomMeasurementSession()?.sourceKind ?? "direct", step: originStep ?? clock.step, section: clock.section };
    }
    function pageView() {
      queueAxiomFirstPartyEvent({ eventType: "page_view", eventKey: createAxiomMeasurementId(), path, activity: false,
        payload: { ...envelope(), event_name: "page_view" } });
    }
    function currentSession(activity = false) {
      if (stopped || !canSendAxiomAnalytics()) return false;
      const session = getAxiomMeasurementSession(activity);
      if (!session) return false;
      if (session.key !== sessionKey || (activity && (clock.activeMs >= JOURNEY_MAX_ACTIVE_MS || sequence >= 10_000))) {
        sessionKey = session.key;
        pageId = createAxiomMeasurementId();
        clock = new JourneyClock(performance.now(), getStep(), document.visibilityState === "visible", document.hasFocus());
        sequence = 0;
        previousSnapshot = "";
        pageView();
      }
      return true;
    }
    function flush(reason: JourneyReason) {
      if (!currentSession() || pageSuspended && reason !== "pagehide") return;
      const snapshot = clock.snapshot(performance.now());
      const fingerprint = JSON.stringify(snapshot);
      if (fingerprint === previousSnapshot) return;
      sequence += 1;
      const queued = queueAxiomFirstPartyEvent({ eventType: "custom", eventKey: `${pageId}:${sequence}`, path, activity: false,
        payload: { ...envelope(), event_name: "journey_snapshot_v1", snapshot_sequence: sequence, ...snapshot, reason } });
      if (queued) previousSnapshot = fingerprint;
    }
    function stepChanged() {
      if (!currentSession()) return;
      const step = getStep();
      if (step !== clock.step) {
        clock.changeStep(performance.now(), step);
        flush("step");
      }
      reconcileSections();
    }
    function measureSections() {
      raf = 0;
      if (!currentSession() || pageSuspended) return;
      const candidates: { id: JourneySection; area: number }[] = [];
      for (const element of observed) {
        const id = element.getAttribute("data-journey-section") ?? (element.matches('[data-component="site-footer"], footer') ? "footer" : element.matches("main") ? "main" : element.matches("header") ? "header" : "");
        if (!includes(JOURNEY_SECTIONS, id)) continue;
        const rect = element.getBoundingClientRect();
        const height = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
        // Large sections are measured against the viewport, not their full height.
        if (height > 0 && width > 0 && height >= Math.min(rect.height, window.innerHeight) * 0.5 && width >= Math.min(rect.width, window.innerWidth) * 0.5) {
          candidates.push({ id, area: height * width });
        }
      }
      candidates.sort((a, b) => b.area - a.area);
      clock.sections(performance.now(), candidates.map(({ id }) => id), candidates[0]?.id);
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      clock.scroll(height <= window.innerHeight ? 1 : (window.scrollY + window.innerHeight) / height);
      const sectionsFingerprint = JSON.stringify([candidates.map(({ id }) => id), clock.scrollDepth]);
      const changed = sectionsFingerprint !== previousSections;
      previousSections = sectionsFingerprint;
      // Scrolling can produce 60 animation frames per second. Only a semantic
      // visibility/bucket change requests an early snapshot, at most once/second.
      if (changed && performance.now() - lastSectionFlushAt >= 1_000) {
        lastSectionFlushAt = performance.now();
        flush("section");
      }
    }
    function scheduleSections() { if (!raf) raf = requestAnimationFrame(measureSections); }
    const intersection = new IntersectionObserver(scheduleSections, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    function reconcileSections() {
      const selector = formId === "income-test"
        ? '[data-income-test-page] [data-journey-section], [data-income-test-page] [data-component="site-footer"]'
        : 'main, body > header, [data-component="site-header"], [data-component="site-footer"]';
      const elements = new Set(document.querySelectorAll(selector));
      for (const element of observed) if (!elements.has(element)) { intersection.unobserve(element); observed.delete(element); }
      for (const element of elements) if (!observed.has(element)) { observed.add(element); intersection.observe(element); }
      scheduleSections();
    }
    function activity() {
      if (!currentSession(true) || pageSuspended) return;
      clock.activity(performance.now());
    }
    function scroll() { activity(); scheduleSections(); }
    function attention() {
      if (!currentSession()) return;
      const visible = document.visibilityState === "visible";
      const focused = document.hasFocus();
      clock.attention(performance.now(), visible && !pageSuspended, focused);
      if (visible && focused) { currentSession(true); scheduleSections(); }
      else flush(visible ? "blur" : "hidden");
    }
    function pagehide() {
      if (!currentSession()) return;
      clock.attention(performance.now(), false, false);
      flush("pagehide");
      pageSuspended = true;
    }
    function pageshow() { pageSuspended = false; attention(); }
    function click(event: MouseEvent) {
      if (!(event.target instanceof Element) || !currentSession(true)) return;
      if (formId === "website") {
        websiteClick(event.target);
        return;
      }
      const target = event.target.closest<HTMLElement>("[data-journey-cta]");
      const footerLink = event.target.closest<HTMLAnchorElement>('[data-component="site-footer"] a');
      const footerCtas: Record<string, string> = { "/clanky": "footer_articles", "/clanky/": "footer_articles", "/ziskat-prehled": "footer_overview", "/ziskat-prehled/": "footer_overview" };
      const cta = target?.dataset.journeyCta ?? (footerLink ? footerCtas[(footerLink.getAttribute("href") ?? "").split(/[?#]/u)[0]] : undefined);
      const placement = target?.dataset.journeyPlacement ?? (footerLink ? "footer" : undefined);
      if ((!target?.closest("[data-income-test-page]") && !footerLink?.closest("[data-income-test-page]")) || !includes(JOURNEY_CTAS, cta) || !includes(JOURNEY_PLACEMENTS, placement)) return;
      const sections: Record<string, JourneySection> = { hero: "intro", calculator: "calculator", result_top: "result", consultation: "consultation", result_email: "result", adjustments: "result", contact: "contact", header: "intro", testimonial: "testimonial", footer: "footer" };
      queueAxiomFirstPartyEvent({ eventType: "cta_clicked", path, activity: false,
        payload: { ...envelope(), section: sections[placement], event_name: "income_test_cta_clicked", cta_id: cta, placement } });
    }
    function websiteClick(element: Element) {
      const target = element.closest<HTMLElement>("[data-analytics-event]");
      const footerLink = element.closest<HTMLAnchorElement>('[data-component="site-footer"] a');
      let cta: string | undefined;
      let placement = "main";
      if (target?.dataset.analyticsEvent === "home_primary_cta_click" && ["header", "hero", "outcome", "references", "final"].includes(target.dataset.analyticsPlacement ?? "")) {
        cta = "home_primary";
        if (["header", "hero"].includes(target.dataset.analyticsPlacement ?? "")) placement = target.dataset.analyticsPlacement!;
      } else if (target?.dataset.analyticsEvent === "home_situation_select") {
        cta = "home_situation";
      } else if (target?.dataset.analyticsEvent === "lead_flow_direct_contact_click" && ["phone", "email"].includes(target.dataset.analyticsContact ?? "")) {
        cta = "direct_contact";
        if (target.dataset.analyticsPlacement === "header") placement = "header";
      } else if (footerLink) {
        const map: Record<string, string> = { "/clanky": "footer_articles", "/clanky/": "footer_articles", "/ziskat-prehled": "footer_overview", "/ziskat-prehled/": "footer_overview" };
        cta = map[(footerLink.getAttribute("href") ?? "").split(/[?#]/u)[0]];
        placement = "footer";
      }
      if (!includes(JOURNEY_CTAS, cta) || !includes(JOURNEY_PLACEMENTS, placement)) return;
      queueAxiomFirstPartyEvent({ eventType: "cta_clicked", path, activity: false,
        payload: { ...envelope(), section: placement === "header" ? "header" : placement === "footer" ? "footer" : "main", event_name: "website_cta_clicked", cta_id: cta, placement } });
    }
    const mutation = new MutationObserver(stepChanged);
    const root = formId === "income-test" ? document.querySelector("[data-income-test-page]") : document.querySelector("main");
    if (root) mutation.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-journey-step"] });
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("click", click, true);
    window.addEventListener("focus", attention);
    window.addEventListener("blur", attention);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", attention);
    const timer = window.setInterval(() => flush("interval"), JOURNEY_FLUSH_MS);
    pageView();
    flush("start");
    reconcileSections();
    updateStep = stepChanged;
    sendEvent = (eventName, eventType, originStep) => {
      if (!currentSession(true)) return false;
      return queueAxiomFirstPartyEvent({ eventType, path, activity: false, payload: { ...envelope(originStep), event_name: eventName } });
    };
    stopMeasurement = () => {
      // Revocation deliberately discards the final unsent interval.
      if (canSendAxiomAnalytics()) flush("unmount");
      stopped = true;
      window.clearInterval(timer);
      cancelAnimationFrame(raf);
      intersection.disconnect();
      mutation.disconnect();
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("click", click, true);
      window.removeEventListener("focus", attention);
      window.removeEventListener("blur", attention);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", attention);
      updateStep = undefined;
      sendEvent = undefined;
    };
  }

  function reconcileConsent() {
    if (disposed) return;
    if (!canSendAxiomAnalytics()) {
      stopMeasurement?.();
      stopMeasurement = undefined;
      clearAxiomMeasurementSession();
    } else if (!stopMeasurement) begin();
  }
  const unsubscribeConsent = subscribeCookieConsent(reconcileConsent);
  const unsubscribeRuntime = subscribeAnalyticsRuntime(reconcileConsent);
  // React development effect replay must not produce a second page visit.
  queueMicrotask(reconcileConsent);
  return {
    stepChanged: () => updateStep?.(),
    event: (name, type, originStep) => sendEvent?.(name, type, originStep) ?? false,
    stop: () => { disposed = true; unsubscribeConsent(); unsubscribeRuntime(); stopMeasurement?.(); stopMeasurement = undefined; },
  };
}

export function safeJourneyStep(value: unknown): JourneyStep | undefined {
  return includes(JOURNEY_STEPS, value) ? value : undefined;
}
