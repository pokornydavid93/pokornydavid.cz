import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { WEB_PRIVACY_NOTICE_VERSION } from "../../lib/privacy/policy";
import { MOCK_GA_MEASUREMENT_ID, withMockAnalyticsConfiguration } from "./fixtures/analytics-configuration";

const CONSENT_KEY = "cookie_consent_v1";
type Probe = { axiom: string[]; ga: string[]; actions: string[]; scripts: Route[]; errors: string[]; fixtureResponses: number };

function gaMock(measurementId: string) {
  return `(() => {
    const id = ${JSON.stringify(measurementId)};
    const layer = window.dataLayer || (window.dataLayer = []);
    const process = (command) => {
      if (window['ga-disable-' + id] || !['config', 'event'].includes(command[0])) return;
      document.cookie = '_ga=consented-test; path=/';
      fetch('/__mock_ga_collect__', {method: 'POST', body: JSON.stringify(command)});
    };
    const queued = [...layer];
    const push = layer.push.bind(layer);
    layer.push = (...items) => { items.forEach(process); return push(...items); };
    queued.forEach(process);
  })();`;
}

async function interceptAnalytics(context: BrowserContext, { gaFixture, holdScript = false }: { gaFixture: boolean; holdScript?: boolean }): Promise<Probe> {
  const probe: Probe = { axiom: [], ga: [], actions: [], scripts: [], errors: [], fixtureResponses: 0 };
  context.on("page", (page) => page.on("pageerror", (error) => probe.errors.push(error.message)));
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js") {
      probe.scripts.push(route);
      if (gaFixture) expect(url.searchParams.get("id")).toBe(MOCK_GA_MEASUREMENT_ID);
      if (!holdScript) await route.fulfill({ contentType: "text/javascript", body: gaMock(url.searchParams.get("id") ?? "") });
    } else if (url.pathname === "/events" || url.pathname === "/__mock_ga_collect__") {
      (url.pathname === "/events" ? probe.axiom : probe.ga).push(request.postData() ?? "");
      await route.fulfill({ status: 204 });
    } else if (!["localhost", "127.0.0.1"].includes(url.hostname) || request.method() !== "GET") {
      if (request.headers()["next-action"]) probe.actions.push(url.pathname);
      // Neither real analytics nor any form/server action can leave this test.
      await route.abort();
    } else {
      if (gaFixture && url.hostname === "localhost" && (request.isNavigationRequest() || request.headers().rsc === "1")) {
        const response = await route.fetch();
        const headers = response.headers();
        if (/text\/(?:html|x-component)/u.test(headers["content-type"] ?? "")) {
          const original = await response.text();
          const body = withMockAnalyticsConfiguration(original);
          if (body !== original) probe.fixtureResponses += 1;
          delete headers["content-length"];
          delete headers["content-encoding"];
          await route.fulfill({ response, headers, body });
          return;
        }
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    }
  });
  return probe;
}

async function consentRecord(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), CONSENT_KEY);
}

async function changeConsent(page: Page, choice: "accepted" | "rejected" | null) {
  await page.evaluate(({ key, choice }) => {
    const old = JSON.parse(localStorage.getItem(key) ?? "null");
    if (choice === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ ...old, choice, decidedAt: Date.now(), expiresAt: Date.now() + 86_400_000 }));
  }, { key: CONSENT_KEY, choice });
}

async function clickTrackedControl(page: Page) {
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.dataset.analyticsEvent = "home_primary_cta_click";
    button.dataset.analyticsPlacement = "hero";
    document.body.appendChild(button);
    button.click();
    button.remove();
  });
}

async function expectBlocked(page: Page) {
  await expect.poll(() => page.evaluate(() => typeof window.gtag)).toBe("undefined");
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.cookie.split(";").some((cookie) => cookie.trim().startsWith("_ga=")))).toBe(false);
  expect(await page.evaluate(() => sessionStorage.getItem("axiom_measurement_session_v1"))).toBeNull();
}

test.describe("consented analytics with mocked providers", () => {
  test("real disabled configuration stays blocked after a local grant and explicit settings open", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: false });
    await page.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText("vypnuté");
    for (const name of ["overview_receipt_v1", "overview_confirmation_email_v1", "overview_analytics_claim_v1"]) {
      await expect(page.locator("main code", { hasText: name })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Jasně, souhlasím", exact: true })).toHaveCount(0);
    const settings = page.getByRole("button", { name: "Otevřít nastavení cookies", exact: true });
    await settings.focus();
    await settings.press("Enter");
    const panel = page.getByRole("region", { name: "Soukromí a cookies", exact: true });
    await expect(panel).toContainText("Volitelné měření je vypnuté");
    await expect(page.getByRole("switch")).toHaveCount(0);
    await page.getByRole("button", { name: "Zavřít panel", exact: true }).click();
    const html = await page.content();
    const version = html.match(/consent_policy_version\\":\\"([^"\\]+)\\"/u)?.[1];
    expect(version).toBeTruthy();
    await page.evaluate(({ key, version }) => {
      localStorage.setItem(key, JSON.stringify({ choice: "accepted", version, decidedAt: Date.now(), expiresAt: Date.now() + 86_400_000 }));
      window.dispatchEvent(new CustomEvent("cookie-consent-changed"));
    }, { key: CONSENT_KEY, version });
    await clickTrackedControl(page);
    await page.reload({ waitUntil: "networkidle" });
    await settings.focus();
    await settings.press("Enter");
    await expect(panel).toContainText("Volitelné měření je vypnuté");
    await expect(page.getByRole("switch")).toHaveCount(0);
    await expectBlocked(page);
    await page.getByRole("button", { name: "Zavřít panel", exact: true }).click();
    const footerSettings = page.getByRole("contentinfo").getByRole("button", { name: "Nastavení cookies", exact: true });
    await footerSettings.focus();
    await footerSettings.press("Enter");
    await expect(panel).toContainText("Volitelné měření je vypnuté");
    await expect(page.getByRole("switch")).toHaveCount(0);
    expect(probe.fixtureResponses).toBe(0);
    expect(probe.scripts).toHaveLength(0);
    expect(probe.ga).toHaveLength(0);
    expect(probe.axiom).toHaveLength(0);
    expect(probe.actions).toHaveLength(0);
    expect((await context.cookies()).filter((cookie) => cookie.name === "overview_analytics_claim_v1")).toEqual([]);
    expect(probe.errors).toEqual([]);
  });

  test("loads no provider before consent or after rejection", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: true });
    await page.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Ne, díky", exact: true })).toBeVisible();
    const settings = page.getByRole("button", { name: "Otevřít nastavení cookies", exact: true });
    await settings.focus();
    await settings.press("Enter");
    await expect(page.getByRole("switch", { name: "Zapnout analytiku" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("button", { name: "Zavřít panel", exact: true }).click();
    await clickTrackedControl(page);
    expect(probe.scripts).toHaveLength(0);
    expect(probe.ga).toHaveLength(0);
    expect(probe.axiom).toHaveLength(0);
    await page.getByRole("button", { name: "Ne, díky", exact: true }).click();
    await page.getByRole("contentinfo").getByRole("link", { name: "Získat přehled", exact: true }).first().click();
    await expect(page).toHaveURL(/\/ziskat-prehled\//u);
    await expectBlocked(page);
    expect(probe.scripts).toHaveLength(0);
    expect(probe.ga).toHaveLength(0);
    expect(probe.axiom).toHaveLength(0);
    expect(probe.errors).toEqual([]);
  });

  test("ga4-only sends sanitized GA events without Axiom requests or session IDs", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: true });
    await page.goto("/cookies-a-mereni/?email=private%40example.test&token=private#secret", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Jasně, souhlasím", exact: true }).click();
    await expect.poll(() => probe.ga.length).toBeGreaterThan(0);
    expect((await consentRecord(page)).version).toContain(WEB_PRIVACY_NOTICE_VERSION);
    const previous = probe.ga.length;
    await clickTrackedControl(page);
    await expect.poll(() => probe.ga.length).toBeGreaterThan(previous);
    expect(probe.scripts).toHaveLength(1);
    expect(probe.fixtureResponses).toBeGreaterThan(0);
    expect(probe.axiom).toHaveLength(0);
    expect(await page.evaluate(() => sessionStorage.getItem("axiom_measurement_session_v1"))).toBeNull();
    const commands = probe.ga.map((body) => JSON.parse(body));
    for (const command of commands) {
      const params = command[2];
      expect(params.page_location).not.toMatch(/[?#]/u);
      expect(params.page_referrer).not.toMatch(/[?#]/u);
      expect(JSON.stringify(command)).not.toMatch(/private|secret/u);
    }
    expect(probe.errors).toEqual([]);
  });

  test("withdrawal, regrant and consent removal propagate between tabs", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: true });
    await page.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Jasně, souhlasím", exact: true }).click();
    await expect.poll(() => probe.ga.length).toBeGreaterThan(0);
    const other = await context.newPage();
    await other.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await changeConsent(other, "rejected");
    await expectBlocked(page);
    const stopped = probe.ga.length;
    await clickTrackedControl(page);
    await page.waitForTimeout(100);
    expect(probe.ga).toHaveLength(stopped);
    await page.getByRole("button", { name: "Nastavení cookies", exact: true }).last().click();
    await expect(page.getByRole("switch", { name: "Zapnout analytiku" })).toHaveAttribute("aria-checked", "false");
    await changeConsent(other, "accepted");
    await expect.poll(() => probe.ga.length).toBeGreaterThan(stopped);
    await expect(page.getByRole("switch", { name: "Vypnout analytiku" })).toHaveAttribute("aria-checked", "true");
    await changeConsent(other, null);
    await expectBlocked(page);
    await expect(page.getByRole("button", { name: "Jasně, souhlasím", exact: true })).toBeVisible();
    expect(probe.axiom).toHaveLength(0);
    expect(probe.errors).toEqual([]);
  });

  test("expires consent in an open page and cleans provider cookies", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: true });
    await page.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Jasně, souhlasím", exact: true }).click();
    await expect.poll(() => probe.ga.length).toBeGreaterThan(0);
    await page.evaluate((key) => {
      const record = JSON.parse(localStorage.getItem(key)!);
      localStorage.setItem(key, JSON.stringify({ ...record, expiresAt: Date.now() + 200 }));
      window.dispatchEvent(new CustomEvent("cookie-consent-changed"));
    }, CONSENT_KEY);
    await expectBlocked(page);
    await expect(page.getByRole("button", { name: "Jasně, souhlasím", exact: true })).toBeVisible();
    const stopped = probe.ga.length;
    await clickTrackedControl(page);
    await page.waitForTimeout(100);
    expect(probe.ga).toHaveLength(stopped);
    expect(probe.axiom).toHaveLength(0);
    expect(probe.errors).toEqual([]);
  });

  test("withdrawal stays blocked when storage cannot persist the new choice", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: true });
    await page.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Jasně, souhlasím", exact: true }).click();
    await expect.poll(() => probe.ga.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Nastavení cookies", exact: true }).last().click();
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new DOMException("Storage denied", "QuotaExceededError"); };
    });
    await page.getByRole("switch", { name: "Vypnout analytiku" }).click();
    await expectBlocked(page);
    await expect(page.getByRole("switch", { name: "Zapnout analytiku" })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("status")).toContainText("Vaši volbu se nepodařilo zapamatovat");
    expect(await consentRecord(page)).toBeNull();
    const stopped = probe.ga.length;
    await clickTrackedControl(page);
    await page.waitForTimeout(100);
    expect(probe.ga).toHaveLength(stopped);
    expect(probe.axiom).toHaveLength(0);
    await page.reload({ waitUntil: "networkidle" });
    await expectBlocked(page);
    await expect(page.getByRole("button", { name: "Jasně, souhlasím", exact: true })).toBeVisible();
    expect(probe.ga).toHaveLength(stopped);
    expect(probe.errors).toEqual([]);
  });

  test("explains a document-only withdrawal if both storage operations fail", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: true });
    await page.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Jasně, souhlasím", exact: true }).click();
    await expect.poll(() => probe.ga.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Nastavení cookies", exact: true }).last().click();
    await page.evaluate(() => {
      Storage.prototype.setItem = Storage.prototype.removeItem = () => { throw new DOMException("Storage denied", "SecurityError"); };
    });
    await page.getByRole("switch", { name: "Vypnout analytiku" }).click();
    await expectBlocked(page);
    await expect(page.getByRole("status")).toContainText("Analytika je v této kartě vypnutá");
    expect((await consentRecord(page)).choice).toBe("accepted");
    const stopped = probe.ga.length;
    await clickTrackedControl(page);
    await page.waitForTimeout(100);
    expect(probe.ga).toHaveLength(stopped);
    expect(probe.axiom).toHaveLength(0);
    expect(probe.errors).toEqual([]);
  });

  test("withdrawal while the provider script is pending clears queued commands", async ({ page, context }) => {
    const probe = await interceptAnalytics(context, { gaFixture: true, holdScript: true });
    await page.goto("/cookies-a-mereni/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Jasně, souhlasím", exact: true }).click();
    await expect.poll(() => probe.scripts.length).toBe(1);
    await page.evaluate((key) => {
      const record = JSON.parse(localStorage.getItem(key)!);
      localStorage.setItem(key, JSON.stringify({ ...record, choice: "rejected" }));
      window.dispatchEvent(new CustomEvent("cookie-consent-changed"));
    }, CONSENT_KEY);
    await expectBlocked(page);
    const pending = probe.scripts[0];
    await pending.fulfill({ contentType: "text/javascript", body: gaMock(new URL(pending.request().url()).searchParams.get("id") ?? "") });
    await page.waitForTimeout(100);
    expect(probe.ga).toHaveLength(0);
    expect(probe.axiom).toHaveLength(0);
    expect(probe.errors).toEqual([]);
  });
});
