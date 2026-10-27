import assert from "node:assert/strict";
import { test } from "node:test";
import { startIncomeTestJourney, trackIncomeTestEvent } from "../../lib/income-test/analytics.client.ts";
import { configureAnalyticsRuntime } from "../../lib/analytics/runtime.client.ts";
import { configureCookieConsent, updateCookieConsent } from "../../src/app/ui/privacy/cookieConsent.ts";
import { clearAxiomMeasurementSession } from "../../lib/analytics/axiom-first-party.client.ts";

test("income journey starts on late consent, sends closed milestones and immediately stops on withdrawal", async () => {
  const names = ["window", "document", "fetch", "IntersectionObserver", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"];
  const original = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const memory = new Map(); const requests = [];
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  globalThis.window = Object.assign(new EventTarget(), { localStorage: storage, sessionStorage: storage,
    location: new URL("https://pokornydavid.cz/test-jednoho-prijmu/?utm_source=meta&incomeA=45000&email=private%40example.test"), setInterval, clearInterval });
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: "visible", hasFocus: () => true, referrer: "", querySelector: () => null, querySelectorAll: () => [] });
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  globalThis.fetch = (url, options) => { requests.push({ url, body: JSON.parse(options.body), options }); return Promise.resolve({ ok: true }); };
  let journey;
  try {
    clearAxiomMeasurementSession(); configureAnalyticsRuntime({ analytics_mode: "axiom_only" });
    journey = startIncomeTestJourney(() => "income");
    assert.equal(trackIncomeTestEvent("test_started"), false);
    assert.equal(memory.size, 0);
    updateCookieConsent("rejected");
    assert.equal(requests.length, 0);
    updateCookieConsent("accepted");
    assert.equal(requests.filter(request => request.body.event_type === "page_view").length, 1);
    for (const event of ["test_started", "step_completed_income", "step_completed_budget", "result_viewed", "callback_opened_income", "callback_opened_budget", "callback_opened_reserve", "callback_opened_result", "email_result_requested", "callback_requested", "submission_failed", "contact_validation_failed"]) {
      assert.equal(trackIncomeTestEvent(event, "result"), true);
      const request = requests.at(-1);
      assert.equal(request.url, "/events"); assert.equal(request.options.referrerPolicy, "no-referrer");
      assert.equal(request.body.payload.event_name, `income_test_${event}`);
      assert.equal(request.body.payload.analytics_consent, "granted");
      assert.equal(request.body.payload.step, "result");
      assert.equal(request.body.event_type, event === "callback_requested" ? "lead_form_submitted" : event === "test_started" ? "lead_form_started" : "custom");
      assert.match(request.body.payload.page_instance_id, /^[\da-f-]{36}$/u);
      assert.doesNotMatch(JSON.stringify(request.body), /45000|private@|incomeA|email=/u);
    }
    assert.equal(trackIncomeTestEvent("private@example.test"), false);
    assert.equal(trackIncomeTestEvent("callback_requested", "private@example.test"), false);
    const beforeWithdrawal = requests.length;
    updateCookieConsent("rejected");
    window.dispatchEvent(new Event("pagehide")); journey.stop();
    assert.equal(trackIncomeTestEvent("callback_requested"), false);
    assert.equal(requests.length, beforeWithdrawal, "no final flush after denial");
    assert.equal(memory.has("axiom_measurement_session_v2"), false);
    configureAnalyticsRuntime({ analytics_mode: "ga4_only" });
    updateCookieConsent("accepted");
    journey = startIncomeTestJourney(() => "budget");
    await Promise.resolve();
    assert.equal(requests.length, beforeWithdrawal, "GA-only mode creates no Axiom journey");
    configureAnalyticsRuntime({ analytics_mode: "axiom_only" });
    await Promise.resolve();
    assert.equal(requests.filter(request => request.body.event_type === "page_view").length, 2, "late provider configuration starts once");
    const beforePolicyRotation = requests.length;
    configureCookieConsent({ version: "new-journey-policy", acceptedTtlDays: 365, rejectedTtlDays: 180 });
    await Promise.resolve();
    assert.equal(requests.length, beforePolicyRotation, "policy change never flushes the invalidated grant");
    assert.equal(memory.has("axiom_measurement_session_v2"), false);
    assert.equal(trackIncomeTestEvent("result_viewed"), false);
    configureAnalyticsRuntime({ analytics_mode: "disabled" });
    await Promise.resolve();
  } finally {
    journey?.stop(); clearAxiomMeasurementSession();
    for (const name of names) if (original[name] === undefined) delete globalThis[name]; else globalThis[name] = original[name];
  }
});
