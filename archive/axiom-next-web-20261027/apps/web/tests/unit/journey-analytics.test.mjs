import assert from "node:assert/strict";
import { test } from "node:test";
import { JourneyClock, JOURNEY_MAX_ACTIVE_MS } from "../../lib/analytics/journey.ts";
import { createAxiomMeasurementId, collectNativeAttributionKey, getAxiomMeasurementSession, clearAxiomMeasurementSession, collectAxiomAttribution, classifyAxiomSource, AXIOM_SESSION_IDLE_MS } from "../../lib/analytics/axiom-first-party.client.ts";
import { configureAnalyticsRuntime } from "../../lib/analytics/runtime.client.ts";
import { writeCookieConsent } from "../../src/app/ui/privacy/cookieConsent.ts";

test("active time is visible, focused and capped after 30 seconds of inactivity", () => {
  const clock = new JourneyClock(0, "income", true, true);
  clock.sections(0, ["intro", "calculator"], "calculator");
  assert.equal(clock.snapshot(90_000).active_ms, 30_000);
  clock.activity(100_000);
  clock.attention(110_000, false, true);
  assert.equal(clock.snapshot(300_000).active_ms, 40_000);
  clock.attention(300_000, true, false);
  assert.equal(clock.snapshot(320_000).active_ms, 40_000);
  clock.attention(320_000, true, true);
  assert.equal(clock.snapshot(330_000).active_ms, 50_000);
});

test("step and dominant section totals never double count overlapping viewport sections", () => {
  const clock = new JourneyClock(0, "income", true, true);
  clock.sections(0, ["intro", "calculator"], "calculator");
  clock.changeStep(5_000.3, "budget");
  clock.sections(8_000.7, ["method", "footer"], "method");
  clock.sections(9_000.8, [], undefined);
  const result = clock.snapshot(12_000.9);
  assert.equal(result.active_ms, 12_000);
  assert.deepEqual(result.step_active_ms, { income: 5_000, budget: 7_000 });
  assert.deepEqual(result.section_active_ms, { calculator: 8_000, method: 1_000 });
  assert.deepEqual(result.viewed_sections, ["intro", "calculator", "method", "footer"]);
  assert.ok(Object.values(result.section_active_ms).reduce((sum, value) => sum + value, 0) <= result.active_ms);
  assert.equal(clock.snapshot(12_000.9).active_ms, result.active_ms, "repeated snapshot is cumulative, not another interval");
});

test("unfocused steps are not counted as seen and scroll is bounded to monotonic quartiles", () => {
  const clock = new JourneyClock(0, "income", false, false);
  clock.changeStep(3_000, "result");
  clock.sections(4_000, ["result"], "result");
  assert.deepEqual(clock.snapshot(5_000).viewed_steps, []);
  assert.deepEqual(clock.snapshot(5_000).viewed_sections, []);
  clock.attention(5_000, true, true);
  clock.scroll(0.73); clock.scroll(0.1);
  assert.equal(clock.snapshot(6_000).scroll_depth, 50);
  clock.scroll(2);
  assert.equal(clock.snapshot(7_000).scroll_depth, 100);
  assert.deepEqual(clock.snapshot(7_000).viewed_steps, ["result"]);
});

test("an extremely long active page stays within the collector time bound", () => {
  const clock = new JourneyClock(0, "page", true, true);
  for (let time = 0; time < JOURNEY_MAX_ACTIVE_MS * 2; time += 15_000) clock.activity(time);
  assert.equal(clock.snapshot(JOURNEY_MAX_ACTIVE_MS * 2).active_ms, JOURNEY_MAX_ACTIVE_MS);
});

test("campaign attribution accepts only bounded slugs and reduces referrers to a category", () => {
  assert.deepEqual(collectAxiomAttribution(new URL("https://example.test/?utm_source=meta&utm_campaign=safe-01&utm_content=private%40example.test&utm_term=secret%20note&email=private%40example.test")), { utm: { utm_source: "meta", utm_campaign: "safe-01" } });
  assert.deepEqual(collectAxiomAttribution(new URL("https://example.test/?utm_source=meta&utm_source=google&utm_campaign=" + "a".repeat(81))), {});
  const url = new URL("https://example.test/");
  assert.equal(classifyAxiomSource(url, "https://www.google.cz/search?q=private", {}), "search");
  assert.equal(classifyAxiomSource(url, "https://evilfacebook.com/private", {}), "referral");
  assert.equal(classifyAxiomSource(url, "https://example.test/private?token=secret", {}), "direct");
});

test("consented attribution is sticky across pages, passive snapshots do not renew an idle session", () => {
  const original = globalThis.window;
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  globalThis.window = { location: new URL("https://example.test/?utm_source=meta&utm_campaign=test-one"), localStorage: storage, sessionStorage: storage };
  try {
    clearAxiomMeasurementSession(); configureAnalyticsRuntime({ analytics_mode: "axiom_only" });
    assert.equal(getAxiomMeasurementSession(), null);
    assert.equal(entries.size, 0);
    writeCookieConsent("accepted");
    const now = Date.now();
    const first = getAxiomMeasurementSession(true, now);
    window.location = new URL("https://example.test/clanky/");
    const follow = getAxiomMeasurementSession(false, now + AXIOM_SESSION_IDLE_MS + 1);
    assert.equal(follow.key, first.key);
    assert.deepEqual(follow.attribution.utm, { utm_source: "meta", utm_campaign: "test-one" });
    const next = getAxiomMeasurementSession(true, now + AXIOM_SESSION_IDLE_MS + 2);
    assert.notEqual(next.key, first.key);
    assert.deepEqual(next.attribution, {});
    writeCookieConsent("rejected"); clearAxiomMeasurementSession();
    assert.equal(getAxiomMeasurementSession(), null);
    assert.equal(entries.has("axiom_measurement_session_v2"), false);
  } finally { clearAxiomMeasurementSession(); globalThis.window = original; }
});


test("HTTP previews without crypto.randomUUID still generate valid random UUID v4 keys", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const realCrypto = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) } });
  try {
    const first = createAxiomMeasurementId();
    const second = createAxiomMeasurementId();
    assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u);
    assert.notEqual(first, second);
  } finally { Object.defineProperty(globalThis, "crypto", descriptor); }
});


test("native publication campaign links retain only the allowlisted attribution key", () => {
  const url = new URL("https://example.test/?ax_campaign=chl_safe-key_01&ax_channel=private@example.test&email=secret");
  assert.equal(collectNativeAttributionKey(url), "chl_safe-key_01");
  assert.equal(classifyAxiomSource(url, "", {}), "campaign");
  assert.equal(collectNativeAttributionKey(new URL("https://example.test/?ax_campaign=person%40example.test")), null);
  assert.equal(collectNativeAttributionKey(new URL("https://example.test/?ax_campaign=one&ax_campaign=two")), null);
  assert.equal(collectNativeAttributionKey(new URL("https://example.test/?ax_campaign=" + "x".repeat(101))), null);
});
