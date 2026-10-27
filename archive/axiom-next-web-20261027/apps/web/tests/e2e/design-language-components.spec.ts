import { expect, test } from "@playwright/test";

const summary = {
  runtime: "42",
  patterns: "9",
  templates: "7",
  routes: "10",
} as const;

const runtimeGroups = {
  layout: 9,
  ui: 11,
  form: 7,
  navigation: 6,
  domain: 9,
} as const;

test.describe("design language component workspace", () => {
  test("keeps the primary route concise and exposes dedicated workspaces", async ({
    page,
  }) => {
    await page.goto("/design-language/components/");

    const main = page.locator("#main-content");
    await expect(main.locator('[data-components-view="overview"]')).toBeVisible();

    for (const [kind, count] of Object.entries(summary)) {
      await expect(
        main.locator(`[data-registry-summary="${kind}"] strong`),
      ).toHaveText(count);
    }

    const expectedMaturity = {
      specified: "0",
      implemented: "37",
      verified: "18",
      live: "3",
    } as const;

    for (const [stage, count] of Object.entries(expectedMaturity)) {
      await expect(
        main.locator(`[data-maturity-stage="${stage}"] strong`),
      ).toHaveText(count);
    }

    await expect(main.locator("[data-component-id]")).toHaveCount(0);
    await expect(main.locator("[data-layout-foundation]")).toHaveCount(0);
    await expect(main.locator("[data-ui-forms-foundation]")).toHaveCount(0);
    await expect(main.getByRole("link", { name: "Registry", exact: true })).toHaveAttribute(
      "href",
      "/design-language/components/registry/",
    );
    await expect(main.getByRole("link", { name: "Coverage", exact: true })).toHaveAttribute(
      "href",
      "/design-language/components/coverage/",
    );

    for (const route of ["layout", "ui-forms", "shell-domain", "patterns"]) {
      await expect(
        main.locator(`a[href="/design-language/components/labs/${route}/"]`),
      ).toHaveCount(2);
    }
  });

  test("filters the canonical runtime registry and opens a shareable contract", async ({
    page,
  }) => {
    await page.goto("/design-language/components/registry/");

    const main = page.locator("#main-content");
    await expect(main.locator('[data-components-view="registry"]')).toBeVisible();

    for (const [kind, count] of Object.entries(runtimeGroups)) {
      const group = main.locator(`[data-component-kind="${kind}"]`);
      await expect(group.locator("[data-component-id]")).toHaveCount(count);
      await expect(group.locator(":scope > header > strong")).toHaveText(String(count));
    }

    await expect(main.locator("[data-component-id]")).toHaveCount(42);
    await expect(main.locator('[data-component-id="layout.container"]')).toHaveAttribute(
      "data-maturity",
      "verified",
    );
    await expect(main.locator('[data-component-id="site.skip-link"]')).toHaveAttribute(
      "data-maturity",
      "live",
    );
    await expect(main.locator('[data-component-id="component.badge"]')).toHaveCount(1);
    await expect(main.locator('[data-component-id="component.selection-chip"]')).toHaveCount(1);

    for (const id of ["component.card", "component.input", "component.navigationItem"]) {
      await expect(main.locator(`[data-component-id="${id}"]`)).toHaveCount(0);
    }

    const capability = main.getByLabel("Capability");
    await capability.selectOption("site-shell");
    await expect(page).toHaveURL(/\?capability=site-shell$/);
    await expect(capability).toHaveValue("site-shell");
    await capability.selectOption("all");

    const search = main.getByRole("searchbox", { name: "Hledat kontrakt" });
    await search.fill("site.header");
    await expect(page).toHaveURL(/\?q=site\.header$/);
    await expect(main.getByText("1 odpovídajících kontraktů")).toBeVisible();
    await expect(main.locator("[data-component-id]")).toHaveCount(1);

    await main.getByRole("link", { name: "Detail kontraktu" }).click();
    await expect(page).toHaveURL(/\/design-language\/components\/registry\/site\.header\/?$/);
    const detail = main.locator('[data-component-contract-detail="site.header"]');
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("heading", { name: "Public API" })).toBeVisible();
    await expect(detail.getByRole("heading", { name: "HTML, ARIA a keyboard" })).toBeVisible();
    await expect(detail.getByRole("heading", { name: "Route coverage a evidence" })).toBeVisible();
  });

  test("publishes route coverage as a separate audit view", async ({ page }) => {
    await page.goto("/design-language/components/coverage/");

    const main = page.locator("#main-content");
    await expect(main.locator('[data-components-view="coverage"]')).toBeVisible();
    await expect(main.locator("[data-route-family]")).toHaveCount(10);
    await expect(main.getByText("Live without evidence").locator("xpath=..").locator("strong")).toHaveText("0");
    await expect(main.getByText("Current routes without source").locator("xpath=..").locator("strong")).toHaveText("0");
    await expect(main.getByText("Patterns outside templates").locator("xpath=..").locator("strong")).toHaveText("0");
  });

  test("keeps overview and registry readable without mobile overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of [
      "/design-language/components/",
      "/design-language/components/registry/",
    ]) {
      await page.goto(route);
      await expect(page.locator("[data-components-view]")).toBeVisible();
      const viewport = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
    }
  });
});
