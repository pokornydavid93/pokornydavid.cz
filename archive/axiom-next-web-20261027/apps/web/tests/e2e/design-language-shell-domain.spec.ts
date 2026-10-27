import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const labUrl = "/design-language/components/labs/shell-domain/";
const shellUrl = "/design-language/shell-preview/?page=3";

const openLab = async (page: Page) => {
  await page.goto(labUrl);
  await expect(page.locator("[data-shell-domain-foundation]")).toBeVisible();
};

const selectLayer = async (
  page: Page,
  name: "Contract Lab" | "Shell Document" | "Integration Lab",
  id: "contracts" | "shell-document" | "integrations",
) => {
  const tab = page.getByRole("tab", { name, exact: true });
  await expect.poll(async () => {
    if (await tab.getAttribute("aria-selected") !== "true") await tab.click();
    return tab.getAttribute("aria-selected");
  }).toBe("true");
  await expect(page.locator(`[data-lab-layer="${id}"]`)).toBeVisible();
};

const firstRowCount = async (locator: Locator) => locator.evaluateAll((elements) => {
  const rects = elements
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const firstTop = Math.min(...rects.map((rect) => rect.top));
  return rects.filter((rect) => Math.abs(rect.top - firstTop) <= 2).length;
});

const expectNoHorizontalOverflow = async (page: Page) => {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
};

const selectDomainContracts = async (page: Page) => {
  const button = page.getByRole("button", { name: "Domain contracts", exact: true });
  await expect.poll(async () => {
    if (await button.getAttribute("aria-pressed") !== "true") await button.click();
    return button.getAttribute("aria-pressed");
  }).toBe("true");
  await expect(page.locator('[data-contract-family="domain"]')).toBeVisible();
};

test.describe("design language shell and domain foundation", () => {
  test("publishes 15 contracts with independent kind, scope, tone, and facet axes", async ({ page }) => {
    await openLab(page);

    const index = page.getByRole("region", { name: "15 kontraktů, dvě nezávislé osy" });
    const contracts = index.locator("li[data-kind][data-scope]");
    await expect(contracts).toHaveCount(15);
    await expect(contracts.filter({ hasText: "domain.hero" })).toContainText("DomainHero");
    await expect(contracts.filter({ hasText: "domain.hero" })).toHaveAttribute("data-kind", "composition");
    await expect(contracts.filter({ hasText: "domain.booking-panel" })).toHaveAttribute("data-kind", "integration");
    await expect(contracts.filter({ hasText: "domain.booking-panel" })).toHaveAttribute("data-scope", "domain");
    await expect(contracts.filter({ hasText: "domain.cookie-consent" })).toHaveAttribute("data-kind", "integration");
    await expect(contracts.filter({ hasText: "domain.cookie-consent" })).toHaveAttribute("data-scope", "global");
    await expect(contracts.filter({ hasText: "site.skip-link" })).toHaveAttribute("data-kind", "primitive");
    await expect(contracts.filter({ hasText: "site.skip-link" })).toHaveAttribute("data-scope", "shell");
    await expect(contracts.locator("small")).toHaveText([
      "dark / light / action",
      "dark",
      "dark",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark / light / action",
      "dark",
    ]);

    await expect(page.locator("[data-shell-preview-document]")).toHaveCount(0);

    await page.goto("/design-language/components/registry/?kind=integration");
    const registry = page.locator("[data-runtime-registry]");
    await expect(registry.locator("article[data-kind=integration]")).toHaveCount(2);
    await registry.getByLabel("Scope").selectOption("global");
    await expect(registry.locator("article[data-kind=integration]")).toHaveCount(1);
    await expect(registry.locator("article[data-component-id='domain.cookie-consent']")).toContainText("dark");
    await registry.getByRole("link", { name: "Detail kontraktu" }).click();
    const facets = page.getByRole("heading", { name: "Verification facets" }).locator("..");
    await expect(facets).toBeVisible();
    for (const facet of ["runtime", "surfaces", "reflow", "interaction", "accessibility", "route", "integration"]) {
      await expect(facets.locator("dt").filter({ hasText: new RegExp(`^${facet}$`, "i") })).toBeVisible();
    }
  });

  test("keeps the full SiteShell in one isolated document with canonical navigation", async ({ page }) => {
    await openLab(page);
    await selectLayer(page, "Shell Document", "shell-document");

    const iframe = page.locator('iframe[title^="Izolovaný SiteShell preview"]');
    await expect(iframe).toHaveCount(1);
    await expect(page.locator("[data-shell-preview-document]")).toHaveCount(0);

    const shell = page.frameLocator('iframe[title^="Izolovaný SiteShell preview"]');
    await expect(shell.locator("[data-shell-preview-document]")).toBeVisible();
    await expect(shell.getByRole("banner")).toHaveCount(1);
    await expect(shell.getByRole("main")).toHaveCount(1);
    await expect(shell.getByRole("contentinfo")).toHaveCount(1);
    await expect(shell.getByRole("navigation", { name: "Hlavní navigace shell preview" })).toHaveCount(1);
    await expect(shell.getByRole("navigation", { name: "Sekundární navigace" })).toHaveCount(1);

    const currentRoute = shell.getByRole("navigation", { name: "Hlavní navigace shell preview" })
      .getByRole("link", { name: "Služby", exact: true });
    await expect(currentRoute).toHaveAttribute("aria-current", "page");
    await expect(currentRoute).toHaveAttribute("href", /^\/sluzby\/?$/);

    const cta = shell.getByRole("link", { name: "Zjistit, čím začít", exact: true });
    await expect(cta).toHaveAttribute("href", /^\/ziskat-prehled\/?$/);
    await expect(cta).toHaveAttribute("data-variant", "primary-action");
    const ctaColors = await cta.evaluate((element) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--cta-primary-text)";
      element.append(probe);
      const tokenColor = getComputedStyle(probe).color;
      probe.remove();
      const styles = getComputedStyle(element);
      return { background: styles.backgroundColor, color: styles.color, tokenColor };
    });
    expect(ctaColors.color).toBe(ctaColors.tokenColor);
    expect(ctaColors.color).not.toBe(ctaColors.background);

    const breadcrumb = shell.getByRole("navigation", { name: "Drobečková navigace shell preview" });
    await expect(breadcrumb.locator("ol > li")).toHaveCount(5);
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("Přehled kroků před první konzultací");
    await expect(shell.getByRole("navigation", { name: "Stránkování shell preview" })
      .locator('a[aria-current="page"]')).toHaveText("3");
    await expect(shell.getByRole("contentinfo").getByText("Nastavení cookies")).toBeVisible();
  });

  test("uses one mobile navigation DOM and preserves focus, Escape, current route, and compact paging", async ({ page }) => {
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(shellUrl);

      const navigation = page.getByRole("navigation", { name: "Hlavní navigace shell preview" });
      const trigger = navigation.locator("button[aria-controls]");
      await expect(navigation).toHaveCount(1);
      await expect(navigation.locator("ul")).toHaveCount(1);
      await expect(trigger).toBeVisible();
      const triggerBox = await trigger.boundingBox();
      expect(triggerBox?.width).toBeGreaterThanOrEqual(44);
      expect(triggerBox?.height).toBeGreaterThanOrEqual(44);

      await expect(navigation.locator('a[aria-current="page"]')).toHaveText("Služby");
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(navigation.getByRole("link", { name: "Přehled", exact: true })).toBeFocused();
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
      await expect(navigation.locator("ul")).toHaveCount(1);

      const pagination = page.getByRole("navigation", { name: "Stránkování shell preview" });
      await expect(pagination.locator("ol")).toBeHidden();
      await expect(pagination.getByText("3 z 8")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Drobečková navigace shell preview" })
        .locator('[aria-current="page"]')).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("preserves real pagination URLs, route history, title, and main focus", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(shellUrl);
    const pagination = page.getByRole("navigation", { name: "Stránkování shell preview" });

    await expect(pagination.getByRole("link", { name: "Následující stránka" })).toHaveAttribute(
      "href",
      "/design-language/shell-preview/?page=4",
    );
    await pagination.getByRole("link", { name: "Následující stránka" }).click();
    await expect(page).toHaveURL(/shell-preview\/\?page=4$/);
    await expect(page).toHaveTitle(/Shell preview – strana 4/);
    await expect(page.getByRole("main")).toBeFocused();
    await expect(page.getByRole("link", { name: "Stránka 4" })).toHaveAttribute("aria-current", "page");

    await page.goBack();
    await expect(page).toHaveURL(/shell-preview\/\?page=3$/);
    await expect(page.getByRole("link", { name: "Stránka 3" })).toHaveAttribute("aria-current", "page");
  });

  test("proves cards 3-2-1, facts 4-2-1, optional anatomy, and claim provenance", async ({ page }) => {
    const contexts = [
      { width: 1920, cards: 3, facts: 4 },
      { width: 768, cards: 2, facts: 2 },
      { width: 390, cards: 1, facts: 1 },
    ] as const;

    for (const context of contexts) {
      await page.setViewportSize({ width: context.width, height: 1000 });
      await openLab(page);
      await selectDomainContracts(page);

      const cards = page.locator([
        '[data-component="service-card"]',
        '[data-component="article-card"]',
        '[data-component="testimonial-card"]',
        '[data-component="profile-card"]',
      ].join(", "));
      const facts = page.locator('[data-pattern="trust-block"] [data-component="proof-item"]');
      await expect(cards).toHaveCount(5);
      await expect(facts).toHaveCount(4);
      expect(await firstRowCount(cards)).toBe(context.cards);
      expect(await firstRowCount(facts)).toBe(context.facts);
      await expectNoHorizontalOverflow(page);
    }

    const services = page.locator('[data-component="service-card"]');
    await expect(services.nth(0).locator("[aria-label='Kontext služby'] li")).toHaveCount(1);
    await expect(services.nth(1).locator("[aria-label='Kontext služby'] li")).toHaveCount(4);
    const article = page.locator('[data-component="article-card"]');
    await expect(article.locator("img, time")).toHaveCount(0);
    await expect(article).toContainText("bez náhledového média");
    await expect(page.locator('[data-component="testimonial-card"] blockquote')).toContainText("dlouhodobé investice");

    const facts = page.locator('[data-pattern="trust-block"] [data-component="proof-item"]');
    await expect(facts).toContainText(["5+", "Ověřeno", "Olomouc", "1 rámec"]);
    expect((await facts.allTextContents()).join(" ")).not.toContain("10+");
    await expect(facts.locator("time")).toHaveCount(4);
    await expect(facts.locator("a")).toHaveCount(4);
    await expect(facts.locator("time").first()).toHaveAttribute("datetime", "2026-07-13");
  });

  test("gates the booking provider and exposes all fallback and failure states", async ({ page }) => {
    let providerRequests = 0;
    let releaseProvider: (() => void) | undefined;
    const providerGate = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });

    await page.route("**/design-language/calendar-provider-preview/**", async (route) => {
      providerRequests += 1;
      await providerGate;
      await route.fulfill({
        body: "<!doctype html><html lang='cs'><body><main>Kalendář je připravený.</main></body></html>",
        contentType: "text/html",
        status: 200,
      });
    });

    await openLab(page);
    await selectLayer(page, "Integration Lab", "integrations");
    const booking = page.locator('[data-component="booking-panel"]');
    const fallback = booking.getByRole("link", { name: "Domluvit termín přímo" });

    await expect(booking).toHaveAttribute("data-state", "blocked");
    await expect(booking.locator("iframe")).toHaveCount(0);
    await expect(fallback).toHaveAttribute("href", "mailto:info@pokornydavid.cz");
    expect(providerRequests).toBe(0);

    const permission = booking.getByRole("button", { name: "Povolit kalendář" });
    await expect(permission).toHaveAttribute("data-variant", "secondary");
    await permission.click();
    await expect(booking).toHaveAttribute("data-state", "loading");
    await expect.poll(() => providerRequests).toBe(1);
    releaseProvider?.();
    await expect(booking).toHaveAttribute("data-state", "ready");
    await expect(booking.locator("iframe")).toHaveAttribute("title", "Ukázkový rezervační kalendář");
    await expect(fallback).toBeVisible();

    await booking.getByRole("button", { name: "Odvolat povolení" }).click();
    await expect(booking).toHaveAttribute("data-state", "withdrawn");
    await expect(booking.locator("iframe")).toHaveCount(0);
    await expect(fallback).toBeVisible();

    const scenario = page.getByRole("group", { name: "Calendar provider outcome" });
    await scenario.getByRole("button", { name: "provider-error" }).click();
    await booking.getByRole("button", { name: "Znovu povolit kalendář" }).click();
    await expect(booking).toHaveAttribute("data-state", "provider-error");
    await expect(booking.locator("iframe")).toHaveCount(0);
    await expect(fallback).toBeVisible();

    await scenario.getByRole("button", { name: "network-blocked" }).click();
    await expect(booking).toHaveAttribute("data-state", "network-blocked");
    await expect(booking.locator("iframe")).toHaveCount(0);
    await expect(fallback).toBeVisible();
    expect(providerRequests).toBe(1);
  });

  test("uses a form notice and loads analytics only after an equal-weight decision", async ({ page }) => {
    await openLab(page);
    await selectLayer(page, "Integration Lab", "integrations");
    const lab = page.locator('[data-lab-layer="integrations"]');
    const form = lab.locator('[data-component="enquiry-form"]');
    const loader = lab.locator('[data-component="consent-analytics-loader"]');
    const consent = lab.locator('[data-component="cookie-consent"]');

    await expect(form.getByRole("checkbox")).toHaveCount(0);
    await expect(form.locator("[data-form-privacy-notice]"))
      .toContainText("Odesláním vás nepřihlašuji k newsletteru.");
    await expect(loader).toHaveAttribute("data-state", "blocked");
    await expect(loader.locator("[data-analytics-request]")).toHaveCount(0);

    const banner = consent.locator('[data-component="consent-banner"]');
    const essential = banner.getByRole("button", { name: "Pouze nezbytné" });
    const analytics = banner.getByRole("button", { name: "Povolit analytiku" });
    await expect(essential).toHaveAttribute("data-variant", "secondary");
    await expect(analytics).toHaveAttribute("data-variant", "secondary");
    await analytics.click();
    await expect(consent).toHaveAttribute("data-state", "saved");
    await expect(loader).toHaveAttribute("data-state", "loaded");
    await expect(loader.locator("[data-analytics-request]")).toBeVisible();

    await lab.getByRole("button", { name: "Nastavení cookies" }).click();
    const preferences = lab.locator('[data-component="consent-preferences"]');
    await expect(preferences).toBeVisible();
    await expect(preferences.getByRole("checkbox", { name: "Analytika" })).toBeChecked();
    await preferences.getByRole("button", { name: "Odvolat analytiku" }).click();
    await expect(loader).toHaveAttribute("data-state", "blocked");
    await expect(form.getByRole("checkbox")).toHaveCount(0);

    await lab.getByRole("button", { name: "Nastavení cookies" }).click();
    await expect(lab.locator('[data-component="consent-preferences"]')
      .getByRole("checkbox", { name: "Analytika" })).not.toBeChecked();
  });

  test("passes automated accessibility, reflow equivalents, and forced-colors focus checks", async ({ page }) => {
    await openLab(page);
    await selectDomainContracts(page);
    let result = await new AxeBuilder({ page })
      .include('[data-lab-layer="contracts"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);

    await selectLayer(page, "Integration Lab", "integrations");
    result = await new AxeBuilder({ page })
      .include('[data-lab-layer="integrations"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);

    for (const width of [1280, 768, 640, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(shellUrl);
      await expectNoHorizontalOverflow(page);
    }

    await page.emulateMedia({ forcedColors: "active" });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(shellUrl);
    const menu = page.getByRole("button", { name: "Otevřít menu" });
    await menu.focus();
    await expect(menu).toHaveCSS("outline-style", "solid");
    await expect(menu).toHaveCSS("outline-width", "2px");
    await expect(page.getByRole("navigation", { name: "Hlavní navigace shell preview" })
      .locator('a[aria-current="page"]')).toHaveCSS("border-top-style", "solid");
  });
});
