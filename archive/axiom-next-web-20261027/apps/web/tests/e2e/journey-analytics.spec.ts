import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
type EventBody = { event_type: string; event_key: string; path: string; visitor_session_key: string; utm?: Record<string, string>; attribution_key?: string; payload: Record<string, unknown> };
async function instrumentation(page: Page) {
  const events: EventBody[] = []; const errors: string[] = []; const inquiries: Record<string, unknown>[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    const request = route.request(); const url = new URL(request.url());
    if (request.method() === "POST") {
      if (url.pathname === "/events") { events.push(request.postDataJSON()); await route.fulfill({ status: 204 }); }
      else if (url.pathname === "/api/income-test/") {
        const body = request.postDataJSON(); inquiries.push(body);
        await route.fulfill({ json: { status: "accepted", receiptId: "browser-fixture-receipt", intent: body.intent, delivery: "queued" } });
      } else await route.abort();
      return;
    }
    if (request.isNavigationRequest() || request.headers().rsc === "1") {
      const response = await route.fetch(); const headers = response.headers();
      if (/text\/(?:html|x-component)/u.test(headers["content-type"] ?? "")) {
        const body = (await response.text())
          .replace(/"analytics_mode":"(?:disabled|ga4_only|axiom_only|axiom_and_ga4)"/gu, '"analytics_mode":"axiom_only"')
          .replace(/\\"analytics_mode\\":\\"(?:disabled|ga4_only|axiom_only|axiom_and_ga4)\\"/gu, String.raw`\"analytics_mode\":\"axiom_only\"`);
        delete headers["content-length"]; delete headers["content-encoding"];
        await route.fulfill({ response, headers, body });
      } else await route.fulfill({ response });
    } else if (!["127.0.0.1", "localhost"].includes(url.hostname)) await route.abort();
    else await route.continue();
  });
  await page.emulateMedia({ reducedMotion: "reduce" }); return { events, errors, inquiries };
}
async function accept(page: Page) { await page.getByRole("button", { name: "Jasně, souhlasím", exact: true }).click(); }
async function callback(page: Page) {
  await page.getByLabel("Jméno a příjmení", { exact: true }).fill("Analytický test");
  await page.getByLabel("E-mail", { exact: true }).fill("private-contact@example.test");
  await page.getByLabel("Telefon", { exact: true }).fill("777123456");
  await page.getByRole("button", { name: "Požádat o zavolání", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Děkuji za zprávu.");
}
const name = (event: EventBody) => event.payload.event_name;

test("consented funnel measures early and completed journeys without financial or contact values", async ({ page }, testInfo) => {
  // Tailscale HTTP previews lack randomUUID; the transport must stay usable.
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true }));
  const probe = await instrumentation(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-jednoho-prijmu/?utm_source=meta&utm_campaign=income-safe&ax_campaign=chl_browser_fixture&ax_channel=untrusted-not-collected&utm_content=private%40example.test&incomeA=87123");
  await expect(page.locator("[data-income-test-ready]")).toHaveAttribute("data-income-test-ready", "true");
  await page.getByLabel("Čistý příjem A", { exact: true }).fill("87123");
  expect(probe.events).toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem("axiom_measurement_session_v2"))).toBeNull();
  await accept(page); await expect.poll(() => probe.events.filter(e => e.event_type === "page_view").length).toBe(1);
  await page.locator("#income-early-callback-action").click(); await callback(page);
  await page.getByRole("button", { name: "Zpět k testu", exact: true }).click();
  await page.getByLabel("Čistý příjem A", { exact: true }).fill("87124");
  await page.getByLabel("Čistý příjem B", { exact: true }).fill("39871");
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
  await page.locator("#income-step-callback-action").click();
  await page.getByRole("button", { name: "Zpět k testu", exact: true }).click();
  await page.getByLabel("Měsíční splátka hypotéky", { exact: true }).fill("28193");
  await page.getByLabel("Ostatní nutné výdaje a závazky", { exact: true }).fill("31341");
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
  await page.locator("#income-step-callback-action").click();
  await page.getByRole("button", { name: "Zpět k testu", exact: true }).click();
  await page.getByLabel("Dostupná finanční rezerva", { exact: true }).fill("78319");
  await page.getByRole("button", { name: "Zobrazit můj výsledek", exact: true }).click();
  await page.locator("#income-result-callback-action").click(); await callback(page);
  await expect.poll(() => probe.events.filter(e => name(e) === "income_test_callback_requested").length).toBe(2);
  expect(probe.events.filter(e => e.event_type === "lead_form_submitted").map(e => e.payload.step)).toEqual(["income", "result"]);
  expect(probe.inquiries).toHaveLength(2); expect(probe.inquiries[0]).not.toHaveProperty("calculation");
  for (const value of ["test_started", "step_completed_income", "step_completed_budget", "result_viewed", "callback_opened_income", "callback_opened_budget", "callback_opened_reserve", "callback_opened_result"]) expect(probe.events.map(name)).toContain(`income_test_${value}`);
  const clicks = probe.events.filter(e => e.event_type === "cta_clicked");
  for (const cta of ["callback_open", "step_next", "result_show", "contact_submit", "contact_close"]) expect(clicks.map(e => e.payload.cta_id)).toContain(cta);
  const snapshots = probe.events.filter(e => name(e) === "journey_snapshot_v1");
  expect(snapshots.some(e => (e.payload.viewed_steps as string[]).includes("contact"))).toBe(true);
  expect(snapshots.some(e => Number(e.payload.active_ms) > 0)).toBe(true);
  for (const snapshot of snapshots) {
    expect(Object.values(snapshot.payload.step_active_ms as Record<string, number>).reduce((sum, ms) => sum + ms, 0)).toBeLessThanOrEqual(Number(snapshot.payload.active_ms));
    expect(Object.values(snapshot.payload.section_active_ms as Record<string, number>).reduce((sum, ms) => sum + ms, 0)).toBeLessThanOrEqual(Number(snapshot.payload.active_ms));
  }
  for (const event of probe.events) {
    expect(event.payload.analytics_consent).toBe("granted");
    expect(event.utm).toEqual({ utm_source: "meta", utm_campaign: "income-safe" });
    expect(event.attribution_key).toBe("chl_browser_fixture");
    expect(event.path).toBe("/test-jednoho-prijmu/"); expect(event.event_key).toMatch(/^[a-f\d-]{36}(?::\d+)?$/u);
  }
  expect(JSON.stringify(probe.events)).not.toMatch(/87123|87124|39871|28193|31341|78319|Analytický test|private-contact|777123456|private@|incomeA|untrusted-not-collected/u);
  expect(probe.errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("consented-contact-mobile.png"), fullPage: true });
  await writeFile(testInfo.outputPath("closed-events.json"), JSON.stringify(probe.events, null, 2));
  await testInfo.attach("closed-events.json", { body: JSON.stringify(probe.events, null, 2), contentType: "application/json" });
});

test("withdrawal discards unsent attention and later consent starts a fresh session", async ({ page }) => {
  const probe = await instrumentation(page); await page.goto("/test-jednoho-prijmu/"); await accept(page);
  await expect.poll(() => probe.events.some(e => e.event_type === "page_view")).toBe(true);
  const session = probe.events[0].visitor_session_key;
  await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem("cookie_consent_v1")!);
    localStorage.setItem("cookie_consent_v1", JSON.stringify({ ...record, choice: "rejected", expiresAt: Date.now() + 86_400_000 }));
    window.dispatchEvent(new CustomEvent("cookie-consent-changed"));
  });
  const count = probe.events.length;
  await page.getByLabel("Čistý příjem A", { exact: true }).fill("45678");
  await page.locator("#income-step-callback-action").click();
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide"))); await page.waitForTimeout(250);
  expect(probe.events).toHaveLength(count);
  expect(await page.evaluate(() => sessionStorage.getItem("axiom_measurement_session_v2"))).toBeNull();
  await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem("cookie_consent_v1")!);
    localStorage.setItem("cookie_consent_v1", JSON.stringify({ ...record, choice: "accepted" }));
    window.dispatchEvent(new CustomEvent("cookie-consent-changed"));
  });
  await expect.poll(() => probe.events.filter(e => e.event_type === "page_view").length).toBe(2);
  expect(probe.events.at(-1)?.visitor_session_key).not.toBe(session); expect(probe.errors).toEqual([]);
});

test("busy scroll is bounded and shared pages keep attribution and semantic footer clicks", async ({ page }, testInfo) => {
  const probe = await instrumentation(page); await page.goto("/test-jednoho-prijmu/?utm_source=meta&utm_campaign=sticky-test"); await accept(page);
  await expect.poll(() => probe.events.length).toBeGreaterThan(1); const before = probe.events.length;
  await page.evaluate(async () => {
    for (let index = 0; index < 120; index += 1) { scrollTo(0, index % 2 === 0 ? 0 : document.documentElement.scrollHeight); await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
  });
  expect(probe.events.length - before).toBeLessThan(12); const session = probe.events[0].visitor_session_key;
  await page.goto("/clanky/");
  await expect.poll(() => probe.events.filter(e => e.payload.form_id === "website" && e.event_type === "page_view").length).toBe(1);
  const generic = probe.events.filter(e => e.payload.form_id === "website");
  expect(generic.every(e => e.visitor_session_key === session && e.utm?.utm_campaign === "sticky-test" && e.path === "/clanky/")).toBe(true);
  await page.locator('[data-component="site-footer"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const footer = document.querySelector('[data-component="site-footer"]')!;
    const link = footer.querySelector<HTMLAnchorElement>('a[href^="/ziskat-prehled"]');
    link?.addEventListener("click", e => e.preventDefault(), { once: true }); link?.click();
  });
  await expect.poll(() => probe.events.some(e => e.payload.event_name === "website_cta_clicked" && e.payload.cta_id === "footer_overview")).toBe(true);
  expect(probe.errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("shared-footer-desktop.png"), fullPage: true });
  await writeFile(testInfo.outputPath("shared-page-events.json"), JSON.stringify(probe.events, null, 2));
  await testInfo.attach("shared-page-events.json", { body: JSON.stringify(probe.events, null, 2), contentType: "application/json" });
});


test("idle and hidden time stop accumulating and closing an old tab does not manufacture a visit", async ({ page }) => {
  await page.clock.install();
  const probe = await instrumentation(page);
  await page.goto("/test-jednoho-prijmu/");
  await accept(page);
  await expect.poll(() => probe.events.some(e => e.event_type === "page_view")).toBe(true);
  await page.clock.runFor(46_000);
  const snapshots = () => probe.events.filter(e => name(e) === "journey_snapshot_v1");
  await expect.poll(() => Number(snapshots().at(-1)?.payload.active_ms ?? 0)).toBeGreaterThanOrEqual(29_000);
  expect(Number(snapshots().at(-1)?.payload.active_ms)).toBeLessThan(32_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(31 * 60_000);
  const before = probe.events.length;
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await page.waitForTimeout(200);
  expect(probe.events).toHaveLength(before);
  expect(probe.events.filter(e => e.event_type === "page_view")).toHaveLength(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    window.dispatchEvent(new Event("pageshow"));
  });
  await expect.poll(() => probe.events.filter(e => e.event_type === "page_view").length).toBe(2);
  expect(probe.events.at(-1)?.visitor_session_key).not.toBe(probe.events[0].visitor_session_key);
  expect(probe.errors).toEqual([]);
});
