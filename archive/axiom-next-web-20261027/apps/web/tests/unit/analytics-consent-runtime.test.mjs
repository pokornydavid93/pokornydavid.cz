import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  configureCookieConsent,
  readCookieConsent,
  subscribeCookieConsent,
  updateCookieConsent,
} from "../../src/app/ui/privacy/cookieConsent.ts";
import {
  canSendAxiomAnalytics,
  canSendGaAnalytics,
  canSendAnalytics,
  configureAnalyticsRuntime,
  sanitizeAnalyticsUrl,
} from "../../lib/analytics/runtime.client.ts";
import { queueAxiomPageView } from "../../lib/analytics/axiom-first-party.client.ts";
import { gaEvent } from "../../src/app/ui/privacy/lib/ga.ts";

const policy = { version: "test-david-notice", acceptedTtlDays: 365, rejectedTtlDays: 180 };
const originals = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
let requests;
let storage;
let stop;
const makeStorage = (values) => ({
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
});

beforeEach(() => {
  requests = [];
  storage = new Map();
  const target = new EventTarget();
  Object.assign(target, {
    localStorage: makeStorage(storage),
    sessionStorage: makeStorage(new Map()),
    location: new URL("https://example.test/clanky/?email=private@example.test&token=secret#private"),
  });
  globalThis.window = target;
  globalThis.document = Object.assign(new EventTarget(), { referrer: "https://referrer.test/from?email=private#token", visibilityState: "visible" });
  globalThis.fetch = async (...args) => { requests.push(args); return new Response(null, { status: 204 }); };
  configureCookieConsent(policy);
  configureAnalyticsRuntime({ analytics_mode: "disabled" });
});
afterEach(() => {
  stop?.(); stop = undefined;
  for (const [key, value] of Object.entries(originals)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  }
});

describe("optional analytics provider and consent boundary", () => {
  for (const mode of ["disabled", "ga4_only", "axiom_only", "axiom_and_ga4"]) {
    it(`routes only consented providers in ${mode}`, () => {
      configureAnalyticsRuntime({ analytics_mode: mode });
      const gaCalls = [];
      window.gtag = (...args) => gaCalls.push(args);
      assert.equal(queueAxiomPageView("/clanky/"), false);
      gaEvent("cta_click");
      assert.equal(gaCalls.length, 0);
      assert.equal(window.sessionStorage.getItem("axiom_measurement_session_v1"), null);
      updateCookieConsent("accepted");
      const axiom = mode === "axiom_only" || mode === "axiom_and_ga4";
      const ga = mode === "ga4_only" || mode === "axiom_and_ga4";
      assert.equal(canSendAxiomAnalytics(), axiom);
      assert.equal(canSendGaAnalytics(), ga);
      assert.equal(canSendAnalytics(), axiom || ga);
      assert.equal(queueAxiomPageView("/clanky/"), axiom);
      gaEvent("cta_click", { page_location: "https://example.test/?private=override" });
      assert.equal(requests.length, axiom ? 1 : 0);
      assert.equal(gaCalls.length, ga ? 1 : 0);
      if (ga) assert.deepEqual(gaCalls[0][2], {
        page_location: "https://example.test/clanky/",
        page_path: "/clanky/",
        page_referrer: "https://referrer.test/from",
      });
      updateCookieConsent("rejected");
      assert.equal(canSendAnalytics(), false);
      const previous = requests.length;
      assert.equal(queueAxiomPageView("/clanky/"), false);
      gaEvent("cta_click");
      assert.equal(requests.length, previous);
      assert.equal(gaCalls.length, ga ? 1 : 0);
    });
  }

  it("reads storage withdrawal and removal instead of trusting event detail", () => {
    configureAnalyticsRuntime({ analytics_mode: "axiom_and_ga4" });
    updateCookieConsent("accepted");
    const choices = [];
    stop = subscribeCookieConsent(() => choices.push(readCookieConsent()));
    const current = JSON.parse(storage.get(COOKIE_CONSENT_STORAGE_KEY));
    storage.set(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({
      ...current, choice: "rejected", expiresAt: current.decidedAt + policy.rejectedTtlDays * 86_400_000,
    }));
    window.dispatchEvent(Object.assign(new Event("storage"), { key: COOKIE_CONSENT_STORAGE_KEY }));
    assert.deepEqual(choices, ["rejected"]);
    assert.equal(canSendGaAnalytics(), false);
    storage.delete(COOKIE_CONSENT_STORAGE_KEY);
    window.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    assert.deepEqual(choices, ["rejected", null]);
    assert.equal(canSendAxiomAnalytics(), false);
  });

  it("notifies mounted consumers when a late policy change invalidates their grant", async () => {
    configureAnalyticsRuntime({ analytics_mode: "axiom_only" });
    updateCookieConsent("accepted");
    // Drain initial configuration before subscribing to the tested rotation.
    await Promise.resolve();
    const choices = [];
    stop = subscribeCookieConsent(() => choices.push(readCookieConsent()));
    configureCookieConsent({ ...policy, version: "new-measurement-purpose" });
    assert.equal(canSendAxiomAnalytics(), false);
    await Promise.resolve();
    assert.deepEqual(choices, [null]);
    configureCookieConsent({ ...policy, version: "new-measurement-purpose" });
    await Promise.resolve();
    assert.deepEqual(choices, [null], "unchanged configuration does not notify repeatedly");
  });

  it("revokes an open page when consent expires", async () => {
    configureAnalyticsRuntime({ analytics_mode: "axiom_and_ga4" });
    const now = Date.now();
    storage.set(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ choice: "accepted", version: policy.version, decidedAt: now, expiresAt: now + 30 }));
    const choices = [];
    stop = subscribeCookieConsent(() => choices.push(readCookieConsent()));
    assert.equal(canSendGaAnalytics(), true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.deepEqual(choices, [null]);
    assert.equal(canSendGaAnalytics(), false);
    assert.equal(canSendAxiomAnalytics(), false);
  });

  it("fails closed for unavailable storage, a rotated notice and design routes", () => {
    configureAnalyticsRuntime({ analytics_mode: "axiom_and_ga4" });
    updateCookieConsent("accepted");
    configureCookieConsent({ ...policy, version: "changed-controller-notice" });
    assert.equal(canSendGaAnalytics(), false);
    configureCookieConsent(policy);
    updateCookieConsent("accepted");
    window.location = new URL("https://example.test/design-language/components/");
    assert.equal(canSendGaAnalytics(), false);
    window.location = new URL("https://example.test/");
    Object.defineProperty(window, "localStorage", { get: () => { throw new Error("denied"); } });
    assert.equal(canSendGaAnalytics(), false);
    assert.equal(canSendAxiomAnalytics(), false);
  });

  it("never preserves credentials, queries, fragments or non-web referrers", () => {
    assert.equal(sanitizeAnalyticsUrl("https://name:secret@example.test/path?q=private#private"), "https://example.test/path");
    assert.equal(sanitizeAnalyticsUrl("javascript:private"), "");
    assert.equal(sanitizeAnalyticsUrl(""), "");
  });

  it("rejects grants with future decision times or a duration beyond the policy", () => {
    configureAnalyticsRuntime({ analytics_mode: "ga4_only" });
    const now = Date.now();
    for (const record of [
      { decidedAt: now + 60_000, expiresAt: now + 86_400_000 },
      { decidedAt: now, expiresAt: now + 366 * 86_400_000 },
    ]) {
      storage.set(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({
        choice: "accepted", version: policy.version, ...record,
      }));
      assert.equal(readCookieConsent(), null);
      assert.equal(canSendAnalytics(), false);
    }
  });

  it("a failed withdrawal write still blocks the previously persisted grant", () => {
    configureAnalyticsRuntime({ analytics_mode: "axiom_and_ga4" });
    updateCookieConsent("accepted");
    const setItem = window.localStorage.setItem;
    window.localStorage.setItem = () => { throw new Error("quota exceeded"); };
    assert.equal(updateCookieConsent("rejected"), null);
    assert.equal(storage.get(COOKIE_CONSENT_STORAGE_KEY), undefined);
    assert.equal(readCookieConsent(), "rejected");
    assert.equal(canSendGaAnalytics(), false);
    assert.equal(canSendAxiomAnalytics(), false);
    assert.equal(updateCookieConsent("accepted"), null);
    assert.equal(readCookieConsent(), "rejected");
    window.localStorage.setItem = setItem;
    updateCookieConsent("accepted");
    assert.equal(canSendGaAnalytics(), true);
  });

  it("keeps the current page denied when neither storage writing nor removal works", () => {
    configureAnalyticsRuntime({ analytics_mode: "axiom_and_ga4" });
    updateCookieConsent("accepted");
    const saved = storage.get(COOKIE_CONSENT_STORAGE_KEY);
    const setItem = window.localStorage.setItem;
    const removeItem = window.localStorage.removeItem;
    window.localStorage.setItem = window.localStorage.removeItem = () => { throw new Error("denied"); };
    assert.equal(updateCookieConsent("rejected"), null);
    assert.equal(storage.get(COOKIE_CONSENT_STORAGE_KEY), saved);
    assert.equal(readCookieConsent(), "rejected");
    assert.equal(canSendGaAnalytics(), false);
    assert.equal(canSendAxiomAnalytics(), false);
    window.localStorage.setItem = setItem;
    window.localStorage.removeItem = removeItem;
    updateCookieConsent("rejected");
  });
});
