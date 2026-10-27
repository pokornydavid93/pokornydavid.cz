import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __gaEvents?: unknown[][];
  }
}

async function rejectAnalytics(page: Page) {
  const reject = page.getByRole("button", { name: "Nesouhlasím", exact: true });
  await reject.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (await reject.isVisible().catch(() => false)) await reject.click();
}

async function completeDiagnostic(page: Page) {
  const target = new Date();
  target.setMonth(target.getMonth() + 2);
  await page.locator("#hero-refixation-month").selectOption(String(target.getMonth() + 1));
  await page.locator("#hero-refixation-year").selectOption(String(target.getFullYear()));
  await page.getByRole("button", { name: "Ukázat, kdy začít" }).click();
  await expect(page.getByText("Jste v rozhodovacím okně")).toBeVisible();
  await page.getByRole("button", { name: "Pokračovat v auditu" }).click();
  await page.getByRole("radio", { name: "2-4 mil. Kč" }).check();
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
  await page.getByRole("radio", { name: /Porovnat možnosti/u }).check();
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
}

async function submitContact(page: Page) {
  await page.locator("#refixation-name").fill("Test Refixace");
  await page.locator("#refixation-phone").fill("+420 731 830 897");
  await page.locator("#refixation-email").fill("refixation-e2e@example.cz");
  await page.locator("#refixation-callbackWindow").selectOption("afternoon");
  await page.getByRole("button", { name: "Získat plán a požádat o kontakt" }).click();
}

test.describe("refixation funnel", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__gaEvents = [];
      (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = (...args: unknown[]) => {
        window.__gaEvents?.push(args);
      };
    });
  });

  test("opens directly with one primary task and validates the first step", async ({ page }) => {
    await page.goto("/refixace-hypoteky/?utm_source=e2e&utm_medium=test", {
      waitUntil: "networkidle",
    });
    await rejectAnalytics(page);
    await expect(page.getByRole("heading", {
      level: 1,
      name: /Končí vám fixace\? Banka nemá poslední slovo\./u,
    })).toBeVisible();
    const silk = page.locator(
      '[data-refixation-hero] [data-react-bits-silk][data-silk-source="react-bits"]',
    );
    await expect(silk).toHaveAttribute("data-state", "ready");
    await expect(silk.locator("canvas[data-react-bits-silk-canvas]")).toHaveCount(1);
    await expect(page.locator("[data-refixation-hero]")).toHaveAttribute(
      "data-silk-ready",
      "true",
    );
    await expect(page.locator("[data-refixation-silk]")).toHaveCount(0);

    const showResult = page.getByRole("button", { name: "Ukázat, kdy začít" });
    await expect(showResult).toBeDisabled();
    await page.getByRole("button", { name: "Termín neznám" }).click();
    await expect(showResult).toBeEnabled();
    await showResult.click();
    await expect(page.getByText("Přesné datum není překážka")).toBeVisible();
  });

  test("routes expired, early and unknown dates to distinct next actions", async ({ page }) => {
    await page.goto("/refixace-hypoteky/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);

    const expired = new Date();
    expired.setMonth(expired.getMonth() - 2);
    await page.locator("#hero-refixation-month").selectOption(String(expired.getMonth() + 1));
    await page.locator("#hero-refixation-year").selectOption(String(expired.getFullYear()));
    await page.getByRole("button", { name: "Ukázat, kdy začít" }).click();
    await expect(page.getByText("Fixace už pravděpodobně skončila")).toBeVisible();
    await expect(page.getByRole("button", { name: "Prověřit současné nastavení" })).toBeVisible();
    await page.getByRole("button", { name: "Upravit datum" }).click();

    const early = new Date();
    early.setMonth(early.getMonth() + 24);
    await page.locator("#hero-refixation-month").selectOption(String(early.getMonth() + 1));
    await page.locator("#hero-refixation-year").selectOption(String(early.getFullYear()));
    await page.getByRole("button", { name: "Ukázat, kdy začít" }).click();
    await expect(page.getByText("Aktivní řešení může zatím počkat")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Připomenout správný čas" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("kontrola-refixace.ics");
    await expect(page.getByText(/Žádné kontaktní údaje nebyly odeslány/u)).toBeVisible();
    await expect(page.locator("#refixation-diagnostic")).toHaveAttribute(
      "data-refixation-path",
      "reminder",
    );
    await expect(page.getByRole("heading", { name: "Jaký je přibližný zůstatek hypotéky?" })).toHaveCount(0);

    await page.getByRole("button", { name: "Pokračovat bez připomenutí" }).click();
    await expect(page.locator("#refixation-diagnostic")).toHaveAttribute(
      "data-refixation-path",
      "reminder",
    );
    await expect(page.getByRole("heading", { name: "Jaký je přibližný zůstatek hypotéky?" })).toBeVisible();
  });

  test("explains where to find an unknown fixation date", async ({ page }) => {
    await page.goto("/refixace-hypoteky/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);
    await page.getByRole("button", { name: "Termín neznám" }).click();
    await page.getByRole("button", { name: "Ukázat, kdy začít" }).click();
    await expect(page.getByText("Přesné datum není překážka")).toBeVisible();
    await page.getByRole("button", { name: "Kde datum najdu?" }).click();
    await expect(page.getByText(/úvěrové smlouvě nebo detailu hypotéky/u)).toBeVisible();
  });

  test("submits only after contact details and shows a non-advisory result", async ({ page }) => {
    await page.goto("/refixace-hypoteky/?utm_source=e2e&utm_campaign=refixation", {
      waitUntil: "networkidle",
    });
    await rejectAnalytics(page);
    await completeDiagnostic(page);
    await submitContact(page);

    const result = page.getByTestId("refixation-result");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Rozhodovací okno");
    await expect(result).toContainText("Tři cesty zůstávají otevřené");
    await expect(result).toContainText("Konkrétní termín zatím není rezervovaný");

    const gaEvents = await page.evaluate(() => window.__gaEvents ?? []);
    const eventPayloads = gaEvents
      .filter((entry) => entry[0] === "event")
      .map((entry) => entry[2] as Record<string, unknown>);
    for (const payload of eventPayloads) {
      expect(JSON.stringify(payload)).not.toContain("2-4");
      expect(JSON.stringify(payload)).not.toContain("Porovnat");
      expect(JSON.stringify(payload)).not.toContain("Test Refixace");
      expect(JSON.stringify(payload)).not.toContain("refixation-e2e");
      expect(Object.keys(payload).sort()).toEqual(
        expect.arrayContaining(["funnel_id", "page_path"]),
      );
    }
  });

  test("keeps mobile layout usable and accessible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/refixace-hypoteky/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);

    await completeDiagnostic(page);
    await expect(page.getByRole("heading", {
      name: "Kam vám mám poslat výsledek a ozvat se kvůli ověření?",
    })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });

  test("survives refresh and browser back on the public route", async ({ page }) => {
    await page.goto("/refixace-hypoteky/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", {
      level: 1,
      name: /Končí vám fixace\? Banka nemá poslední slovo\./u,
    })).toBeVisible();
    await page.goto("/");
    await page.goBack();
    await expect(page).toHaveURL(/\/refixace-hypoteky\/?$/u);
  });
});
