import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function primeRejectedConsent(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-09-13-web-privacy-v2",
    }));
  });
}

async function dismissHomepageIntro(page: Page) {
  const intro = page.locator("[data-home-intro]");
  await intro.waitFor({ state: "attached" });
  await expect.poll(async () => {
    await page.keyboard.press("Escape");
    return intro.evaluate(
      (element) => getComputedStyle(element).display === "none",
    );
  }, { timeout: 20_000 }).toBe(true);
}

async function openHomepage(page: Page) {
  await primeRejectedConsent(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await dismissHomepageIntro(page);
}

test.describe("mobile situation accordion", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps non-CTA clicks in the accordion and aligns newly opened content", async ({
    page,
  }) => {
    await openHomepage(page);

    const row = page.locator('[data-situation-row="new-housing"]');
    const choice = row.locator('[data-situation-choice="new-housing"]');
    const dismiss = row.locator("[data-situation-panel-dismiss]");
    const cta = row.locator("[data-situation-panel-action]");

    await choice.click();
    await expect(choice).toHaveAttribute("aria-expanded", "true");
    await expect(page).toHaveURL(/\/$/u);
    await expect.poll(async () => {
      const box = await row.boundingBox();
      return box?.y ?? Number.POSITIVE_INFINITY;
    }).toBeGreaterThan(40);
    await expect.poll(async () => {
      const box = await row.boundingBox();
      return box?.y ?? Number.POSITIVE_INFINITY;
    }).toBeLessThan(150);

    await dismiss.click({ position: { x: 24, y: 180 } });
    await expect(choice).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/\/$/u);

    await choice.click();
    await expect(choice).toHaveAttribute("aria-expanded", "true");
    await choice.click();
    await expect(choice).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/\/$/u);

    await choice.click();
    await expect(choice).toHaveAttribute("aria-expanded", "true");
    await cta.click();
    await expect(page).toHaveURL(/\/ziskat-prehled\//u);
  });

  test("keeps alignment and keyboard closing in reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHomepage(page);

    const row = page.locator('[data-situation-row="income-protection"]');
    const choice = row.locator(
      '[data-situation-choice="income-protection"]',
    );
    const dismiss = row.locator("[data-situation-panel-dismiss]");

    await choice.click();
    await expect(choice).toHaveAttribute("aria-expanded", "true");
    await expect.poll(async () => {
      const box = await row.boundingBox();
      return box?.y ?? Number.POSITIVE_INFINITY;
    }).toBeGreaterThan(40);

    const accessibility = await new AxeBuilder({ page })
      .include('[data-home-module="situations"]')
      .analyze();
    expect(accessibility.violations).toEqual([]);

    await dismiss.focus();
    await expect(dismiss).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(choice).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/\/$/u);
  });
});

test.describe("touch situation accordion", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("closes from the expanded content without opening the form", async ({
    page,
  }) => {
    await openHomepage(page);

    const row = page.locator('[data-situation-row="insurance-review"]');
    const choice = row.locator('[data-situation-choice="insurance-review"]');

    await choice.tap();
    await expect(choice).toHaveAttribute("aria-expanded", "true");

    await row.locator("[data-situation-panel-dismiss]").tap({
      position: { x: 24, y: 180 },
    });
    await expect(choice).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/\/$/u);
  });
});
