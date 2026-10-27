"use client";

import { createRandomUuid as createAxiomMeasurementId } from "../random-id.ts";
export { createRandomUuid as createAxiomMeasurementId } from "../random-id.ts";

import type { AnalyticsEvent } from "./events";
import { canSendAxiomAnalytics } from "./runtime.client.ts";

export const AXIOM_EVENT_ENDPOINT = "/events";

const SESSION_STORAGE_KEY = "axiom_measurement_session_v2";
export const AXIOM_SESSION_IDLE_MS = 30 * 60_000;
const safeAttributionSlug = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,79}$/u;
let memorySession: MeasurementSession | null = null;
let lastSessionWriteAt = 0;
type MeasurementSession = { key: string; lastActivityAt: number; attribution: AxiomAttribution; campaignHandle: string | null; attributionKey: string | null; sourceKind: AxiomSourceKind };
export type AxiomSourceKind = "direct" | "search" | "social" | "referral" | "campaign";
const EVENT_SEQUENCE_STORAGE_KEY = "axiom_measurement_sequence_v1";
const allowedUtmKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
const hostedCampaignHandlePattern = /^[a-z2-7]{26}$/u;
const nativeAttributionKeyPattern = /^[A-Za-z0-9_-]{1,100}$/u;

export type AxiomPublicationEventType =
  | "page_view"
  | "lead_form_started"
  | "lead_form_submitted"
  | "cta_clicked"
  | "custom";

export type AxiomFirstPartyEvent = {
  eventType: AxiomPublicationEventType;
  eventKey?: string;
  path?: string;
  payload?: Record<string, unknown>;
  /** Passive snapshots must not extend the 30-minute interaction session. */
  activity?: boolean;
};

export type AxiomAttribution = {
  utm?: Record<string, string>;
};

export function mapAnalyticsEventToAxiomType(
  event: AnalyticsEvent,
): AxiomPublicationEventType {
  switch (event.name) {
    case "home_primary_cta_click":
    case "home_situation_select":
    case "lead_flow_direct_contact_click":
      return "cta_clicked";
    case "lead_flow_start":
    case "lead_flow_view":
    case "lead_form_view":
      return "lead_form_started";
    case "lead_flow_submit_success":
    case "lead_submit_success":
      return "lead_form_submitted";
    default:
      return "custom";
  }
}

export function collectAxiomAttribution(url: URL): AxiomAttribution {
  const utm = Object.fromEntries(
    allowedUtmKeys.flatMap((key) => {
      const values = url.searchParams.getAll(key);
      const value = values.length === 1 ? values[0].trim() : "";
      return safeAttributionSlug.test(value) ? [[key, value]] : [];
    }),
  );

  return {
    ...(Object.keys(utm).length > 0 ? { utm } : {}),
  };
}

export function collectHostedCampaignHandle(url: URL): string | null {
  const values = url.searchParams.getAll("axiom_campaign");
  return values.length === 1 && hostedCampaignHandlePattern.test(values[0])
    ? values[0]
    : null;
}

/** Native publication URLs use ax_campaign; ax_channel is resolved server-side. */
export function collectNativeAttributionKey(url: URL): string | null {
  const values = url.searchParams.getAll("ax_campaign");
  return values.length === 1 && nativeAttributionKeyPattern.test(values[0]) ? values[0] : null;
}


function readSessionStorage(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // A private or embedded browser can deny storage. The event remains usable.
  }
}

export function clearAxiomMeasurementSession() {
  memorySession = null;
  lastSessionWriteAt = 0;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem("axiom_measurement_session_v1");
    window.sessionStorage.removeItem(EVENT_SEQUENCE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable; consent still prevents further collection.
  }
}

export function classifyAxiomSource(url: URL, referrer: string, attribution: AxiomAttribution): AxiomSourceKind {
  if (attribution.utm && Object.keys(attribution.utm).length > 0 || collectNativeAttributionKey(url) || collectHostedCampaignHandle(url)) return "campaign";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === url.hostname) return "direct";
    const matches = (domains: string[]) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
    if (matches(["google.com", "google.cz", "bing.com", "seznam.cz", "duckduckgo.com", "search.yahoo.com"])) return "search";
    if (matches(["facebook.com", "instagram.com", "t.co", "twitter.com", "linkedin.com", "tiktok.com", "pinterest.com"])) return "social";
    return "referral";
  } catch {
    return "direct";
  }
}

/** Tab-scoped, consented session. No persistent cross-visit visitor ID. */
export function getAxiomMeasurementSession(activity = false, now = Date.now()): MeasurementSession | null {
  if (!canSendAxiomAnalytics()) return null;
  if (!memorySession) {
    try {
      const parsed = JSON.parse(readSessionStorage(SESSION_STORAGE_KEY) ?? "null") as MeasurementSession | null;
      if (parsed && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(parsed.key) && Number.isFinite(parsed.lastActivityAt)
        && parsed.lastActivityAt <= now && parsed.attribution && typeof parsed.attribution === "object") {
        const safeUrl = new URL(window.location.origin);
        for (const [key, value] of Object.entries(parsed.attribution.utm ?? {})) {
          if (typeof value === "string") safeUrl.searchParams.set(key, value);
        }
        memorySession = { ...parsed, attribution: collectAxiomAttribution(safeUrl),
          campaignHandle: parsed.campaignHandle && hostedCampaignHandlePattern.test(parsed.campaignHandle) ? parsed.campaignHandle : null,
          attributionKey: typeof parsed.attributionKey === "string" && nativeAttributionKeyPattern.test(parsed.attributionKey) ? parsed.attributionKey : null,
          sourceKind: ["direct", "search", "social", "referral", "campaign"].includes(parsed.sourceKind) ? parsed.sourceKind : "direct" };
      }
    } catch { /* Missing or corrupt session starts a new consented visit. */ }
  }
  if (!memorySession || (activity && now - memorySession.lastActivityAt >= AXIOM_SESSION_IDLE_MS)) {
    const url = new URL(window.location.href);
    const attribution = collectAxiomAttribution(url);
    memorySession = {
      key: createAxiomMeasurementId(), lastActivityAt: now, attribution,
      campaignHandle: collectNativeAttributionKey(url) ? null : collectHostedCampaignHandle(url),
      attributionKey: collectNativeAttributionKey(url),
      sourceKind: classifyAxiomSource(url, typeof document === "undefined" ? "" : document.referrer, attribution),
    };
    lastSessionWriteAt = 0;
    writeSessionStorage(EVENT_SEQUENCE_STORAGE_KEY, "0");
  }
  if (activity) memorySession.lastActivityAt = now;
  if (!lastSessionWriteAt || now - lastSessionWriteAt >= 1_000) {
    writeSessionStorage(SESSION_STORAGE_KEY, JSON.stringify(memorySession));
    lastSessionWriteAt = now;
  }
  return memorySession;
}

function nextEventKey(sessionKey: string) {
  const previous = Number.parseInt(
    readSessionStorage(EVENT_SEQUENCE_STORAGE_KEY) ?? "0",
    10,
  );
  const sequence = Number.isSafeInteger(previous) && previous >= 0
    ? previous + 1
    : 1;
  writeSessionStorage(EVENT_SEQUENCE_STORAGE_KEY, String(sequence));
  return `web:${sessionKey}:${sequence}`;
}

export function queueAxiomFirstPartyEvent(event: AxiomFirstPartyEvent): boolean {
  if (
    !canSendAxiomAnalytics()
  ) {
    return false;
  }

  const session = getAxiomMeasurementSession(event.activity !== false);
  if (!session) return false;
  const visitorSessionKey = session.key;
  const currentUrl = new URL(window.location.href);
  const campaignHandle = session.campaignHandle;
  const body = JSON.stringify({
    event_type: event.eventType,
    event_key: event.eventKey ?? (event.payload?.schema_version === 1 ? createAxiomMeasurementId() : nextEventKey(visitorSessionKey)),
    path: event.path ?? currentUrl.pathname,
    visitor_session_key: visitorSessionKey,
    occurred_at: new Date().toISOString(),
    payload: event.payload ?? {},
    ...(session.attributionKey ? { attribution_key: session.attributionKey } : campaignHandle ? { campaign_handle: campaignHandle } : {}),
    ...session.attribution,
  });

  void fetch(AXIOM_EVENT_ENDPOINT, {
    method: "POST",
    body,
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    referrerPolicy: "no-referrer",
  }).catch(() => {
    // Measurement must never interrupt the visitor journey.
  });

  return true;
}

export function queueAxiomAnalyticsEvent(event: AnalyticsEvent): boolean {
  const { name, ...dimensions } = event;
  return queueAxiomFirstPartyEvent({
    eventType: mapAnalyticsEventToAxiomType(event),
    payload: {
      event_name: name,
      ...dimensions,
    },
  });
}

export function queueAxiomPageView(path: string): boolean {
  return queueAxiomFirstPartyEvent({
    eventType: "page_view",
    path,
    payload: { event_name: "page_view" },
  });
}
