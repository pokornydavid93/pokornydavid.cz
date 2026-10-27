import { expect, test, type Page } from "@playwright/test";

const patternIds = [
  "section-intro",
  "card-collection",
  "split-narrative",
  "trust-block",
  "process-and-fees",
  "faq-section",
  "action-band",
  "form-contact-split",
  "editorial-flow",
] as const;

const templateSlots = {
  home: ["hero", "main", "final-action"],
  index: ["entry", "collection", "action"],
  "content-detail": ["hero", "main", "action"],
  "article-detail": ["article", "action"],
  conversion: ["entry", "trust", "form", "faq"],
  legal: ["content"],
  system: [],
} as const;

const openPatternWorkbench = async (page: Page) => {
  await page.goto("/design-language/components/labs/patterns/");
  await expect(page.locator("[data-pattern-template-foundation]")).toBeVisible();
};

test.describe("design language patterns and templates foundation", () => {
  test("renders all nine canonical recipes and their real child contracts", async ({ page }) => {
    await openPatternWorkbench(page);
    const workbench = page.locator("[data-pattern-template-foundation]");

    await expect(workbench.locator("[data-pattern-specimen]")).toHaveCount(9);
    for (const patternId of patternIds) {
      const specimen = workbench.locator(`[data-pattern-specimen="${patternId}"]`);
      await expect(specimen).toBeVisible();
      await expect(specimen.locator(`[data-pattern="${patternId}"]`).first()).toBeVisible();
    }

    await expect(workbench.locator('[data-pattern="card-collection"] [data-component="service-card"]')).toHaveCount(2);
    await expect(workbench.locator('[data-pattern="process-and-fees"] ol > li')).toHaveCount(3);
    await expect(workbench.locator('[data-pattern="form-contact-split"] [data-component="enquiry-form"]')).toHaveCount(1);
    await expect(workbench.locator('[data-pattern="editorial-flow"] [data-component="prose"]')).toHaveCount(1);

    const faq = workbench.locator('[data-pattern-specimen="faq-section"]');
    const secondQuestion = faq.getByRole("button", { name: "Musím se hned rozhodnout?" });
    await expect(secondQuestion).toHaveAttribute("aria-expanded", "false");
    await secondQuestion.click();
    await expect(secondQuestion).toHaveAttribute("aria-expanded", "true");

    await expect(workbench.locator("[data-template-contract]")).toHaveCount(7);
    await expect(workbench.getByRole("link", { name: "Otevřít preview" })).toHaveCount(7);
  });

  test("maps the same recipes across dark, light, and action tones", async ({ page }) => {
    await openPatternWorkbench(page);
    const workbench = page.locator("[data-pattern-template-foundation]");
    const stage = workbench.locator("#phase5-pattern-stage");
    const backgrounds: string[] = [];

    for (const tone of ["Dark", "Light", "Action"] as const) {
      await workbench.getByRole("button", { name: tone, exact: true }).click();
      await expect(stage).toHaveAttribute("data-surface-tone", tone.toLowerCase());
      backgrounds.push(await stage.evaluate((element) => getComputedStyle(element).backgroundColor));
      await expect(stage.locator('[data-pattern="section-intro"]').first()).toBeVisible();
      await expect(stage.locator('[data-pattern="action-band"]').first()).toBeVisible();
    }

    expect(new Set(backgrounds).size).toBe(3);
  });

  test("renders every page template as an independent semantic route shell", async ({ page }) => {
    for (const [template, slots] of Object.entries(templateSlots)) {
      await page.goto(`/design-language/template-preview/?template=${template}`);
      const main = page.locator(`main[data-template="${template}"]`);
      await expect(main).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);

      for (const slot of slots) {
        await expect(main.locator(`[data-template-slot="${slot}"]`)).toHaveCount(1);
      }

      await expect(page.locator('[data-component="site-header"]')).toHaveCount(1);
      await expect(page.locator('[data-component="site-footer"]')).toHaveCount(1);
    }
  });

  test("keeps recipes and templates linear without mobile overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPatternWorkbench(page);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    for (const template of Object.keys(templateSlots)) {
      await page.goto(`/design-language/template-preview/?template=${template}`);
      await expect(page.locator(`main[data-template="${template}"]`)).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
    }
  });

  test("uses the canonical system template on the production not-found route", async ({ page }) => {
    const response = await page.goto("/phase-5-route-that-does-not-exist/");
    expect(response?.status()).toBe(404);

    const template = page.locator('main[data-template="system"]');
    await expect(template).toBeVisible();
    await expect(template.getByRole("heading", { level: 1, name: "Tahle stránka tu není." })).toBeVisible();
    await expect(template.getByRole("link", { name: "Zpět na hlavní stránku" })).toHaveAttribute("href", "/");
    await expect(template.getByRole("link")).toHaveCount(1);
    await expect(page.locator('[data-component="site-header"]')).toHaveCount(1);
    await expect(page.locator('[data-component="site-footer"]')).toContainText(/IČO\s+09016236/u);
    await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1);
  });

  test("keeps the removed legacy contact route hard-deleted", async ({ page }) => {
    const response = await page.goto("/kontakt/");
    expect(response?.status()).toBe(404);
    await expect(page.locator('main[data-template="system"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Zpět na hlavní stránku" })).toHaveCount(1);
  });
});
