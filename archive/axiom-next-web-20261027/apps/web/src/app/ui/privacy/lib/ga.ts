import { canSendGaAnalytics, gaPageContext } from "../../../../../lib/analytics/runtime.client.ts";

type GATagValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly GATagValue[]
  | { [key: string]: GATagValue };

export type GAParams = Record<string, GATagValue>;
type GTagFunction = (command: "event", name: string, params?: GAParams) => void;

declare global {
  interface Window {
    gtag?: GTagFunction;
  }
}

const DEBUG_FLAG_KEY = "ga_debug_v1";

/**
 * Zapni debug kdykoliv v prohlížeči:
 *   localStorage.setItem("ga_debug_v1", "1")
 * Vypni:
 *   localStorage.removeItem("ga_debug_v1")
 */
function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  // 1) runtime toggle bez rebuild
  let ls: string | null = null;
  try {
    ls = window.localStorage.getItem(DEBUG_FLAG_KEY);
  } catch {
    // Optional diagnostics must work without browser storage.
  }
  if (ls === "1" || ls === "true" || ls === "yes" || ls === "on") return true;

  // 2) fallback: URL param ?ga_debug=1
  const sp = new URLSearchParams(window.location.search);
  const qp = sp.get("ga_debug");
  if (qp === "1" || qp === "true") return true;

  return false;
}

function dbg(...args: unknown[]) {
  if (!isDebugEnabled()) return;
  // nechci to přebarvovat a dělat cirkus, jen jasnej prefix
  console.log("[ga]", ...args);
}

export function gaEvent(name: string, params: GAParams = {}) {
  if (!canSendGaAnalytics()) return;

  const gtag = window.gtag;
  if (typeof gtag !== "function") {
    dbg("skip (gtag missing)", { name, params });
    return;
  }

  try {
    gtag("event", name, { ...params, ...gaPageContext() });
    dbg("sent", { name, params });
  } catch (err) {
    dbg("error", { name, params, err });
  }
}

export function isGaAvailable(): boolean {
  return canSendGaAnalytics() && typeof window.gtag === "function";
}
