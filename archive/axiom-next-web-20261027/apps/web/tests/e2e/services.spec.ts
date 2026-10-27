import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-09-13-web-privacy-v2";

async function seedCookieConsent(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      const now = Date.now();

      window.localStorage.setItem(
        key,
        JSON.stringify({
          choice: "rejected",
          decidedAt: now,
          expiresAt: now + 180 * 24 * 60 * 60 * 1000,
          version,
        }),
      );
    },
    { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION },
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const scrollWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        );

        return scrollWidth - document.documentElement.clientWidth;
      }),
    )
    .toBeLessThanOrEqual(1);
}

test.describe("services", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  test("renders the services route as a responsive situation-led index", async ({
    page,
  }) => {
    for (const width of [390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/sluzby/");

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(
        page.getByRole("heading", {
          name: "Každé rozhodnutí mění celý finanční obraz.",
        }),
      ).toBeVisible();
      const silk = page.locator(
        '[data-services-hero] [data-react-bits-silk][data-silk-source="react-bits"]',
      );
      await expect(silk).toHaveAttribute("data-state", "ready");
      await expect(silk.locator("canvas[data-react-bits-silk-canvas]")).toHaveCount(1);
      await expect(page.locator("[data-services-hero]")).toHaveAttribute(
        "data-services-silk-ready",
        "true",
      );
      await expect(page.locator("[data-refixation-silk]")).toHaveCount(0);
      await expect(
        page.getByText("Služby v souvislostech", { exact: true }),
      ).toHaveCount(0);
      const heroAction = page
        .locator("[data-services-hero]")
        .getByRole("link", { name: "Zjistit, čím začít" });
      await expect(heroAction).toHaveAttribute("data-cta-composition", "docked");
      await expect(heroAction).toHaveAttribute("data-cursor", "action");
      await expect(heroAction).toHaveAttribute("data-cursor-icon", "send");
      await expect(heroAction).toHaveAttribute("data-cursor-magnetic", "true");
      const catalog = page.locator("#prehled-sluzeb");
      await expect(catalog.getByRole("button")).toHaveCount(5);
      await expect(catalog.locator("a[id]")).toHaveCount(9);
      await expect(catalog).toContainText(
        "Spotřebitelské a podnikatelské úvěry",
      );
      await expect(catalog).toContainText("Pojištění vozidla");
      await expect(catalog).toContainText("Pojištění odpovědnosti");
      await expectNoHorizontalOverflow(page);
    }
  });

  test("uses the first viewport as a centered services cover", async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/sluzby/");

      const geometry = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>(
          '[data-component="site-header"]',
        );
        const hero = document.querySelector<HTMLElement>("[data-services-hero]");
        const copy = hero?.querySelector<HTMLElement>("h1")?.parentElement;
        const silk = hero?.querySelector<HTMLElement>("[data-react-bits-silk]");
        const catalog = document.querySelector<HTMLElement>("#prehled-sluzeb");

        if (!header || !hero || !copy || !silk || !catalog) return null;

        const headerBox = header.getBoundingClientRect();
        const heroBox = hero.getBoundingClientRect();
        const copyBox = copy.getBoundingClientRect();
        const silkBox = silk.getBoundingClientRect();
        const catalogBox = catalog.getBoundingClientRect();

        return {
          catalogTop: catalogBox.top,
          copyCenterX: copyBox.left + copyBox.width / 2,
          copyCenterY: copyBox.top + copyBox.height / 2,
          copyTop: copyBox.top,
          headerBottom: headerBox.bottom,
          heroCenterX: heroBox.left + heroBox.width / 2,
          heroCenterY: heroBox.top + heroBox.height / 2,
          heroHeight: heroBox.height,
          heroTop: heroBox.top,
          heroWidth: heroBox.width,
          silkHeight: silkBox.height,
          silkWidth: silkBox.width,
        };
      });

      expect(geometry).not.toBeNull();
      if (!geometry) throw new Error("Services hero geometry is unavailable.");

      expect(geometry.heroHeight).toBeGreaterThanOrEqual(
        viewport.height - 1,
      );
      expect(Math.abs(geometry.heroTop)).toBeLessThanOrEqual(1);
      expect(geometry.copyTop).toBeGreaterThanOrEqual(geometry.headerBottom + 16);
      expect(geometry.catalogTop).toBeGreaterThanOrEqual(viewport.height - 1);
      expect(
        Math.abs(geometry.copyCenterX - geometry.heroCenterX),
      ).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.heroCenterY - geometry.copyCenterY)).toBeLessThanOrEqual(
        geometry.heroHeight * 0.12,
      );
      expect(Math.abs(geometry.silkWidth - geometry.heroWidth)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.silkHeight - geometry.heroHeight)).toBeLessThanOrEqual(1);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("reuses the homepage hero typography and primary CTA treatment", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const width of [390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const homepageTypography = await page.locator("main h1").evaluate((heading) => {
        const style = getComputedStyle(heading);

        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
          lineHeight: style.lineHeight,
        };
      });
      const homepageAction = await page
        .locator(
          '[data-analytics-placement="hero"][data-cta-composition="docked"][data-cursor-icon="send"]',
        )
        .evaluate((action) => {
          const style = getComputedStyle(action);
          const icon = action.querySelector<HTMLElement>("[data-cta-icon-shell]");
          const iconStyle = icon ? getComputedStyle(icon) : null;

          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            height: style.height,
            iconBackgroundColor: iconStyle?.backgroundColor,
            iconBorderRadius: iconStyle?.borderRadius,
            iconColor: iconStyle?.color,
            iconHeight: iconStyle?.height,
          };
        });

      await page.goto("/sluzby/");

      const servicesTypography = await page.locator("main h1").evaluate((heading) => {
        const style = getComputedStyle(heading);

        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
          lineHeight: style.lineHeight,
        };
      });
      const servicesAction = await page
        .locator('[data-services-hero] [data-cta-composition="docked"]')
        .evaluate((action) => {
          const style = getComputedStyle(action);
          const icon = action.querySelector<HTMLElement>("[data-cta-icon-shell]");
          const iconStyle = icon ? getComputedStyle(icon) : null;

          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            height: style.height,
            iconBackgroundColor: iconStyle?.backgroundColor,
            iconBorderRadius: iconStyle?.borderRadius,
            iconColor: iconStyle?.color,
            iconHeight: iconStyle?.height,
          };
        });

      expect(servicesTypography).toEqual(homepageTypography);
      expect(servicesAction).toEqual(homepageAction);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("stacks the services intro above the full-width accordion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sluzby/");

    const catalog = page.locator("#prehled-sluzeb");
    const layout = catalog.locator(":scope > div");
    const intro = catalog.locator("header");
    const accordion = catalog.locator('[class*="catalogAccordion"]');
    const eyebrow = intro.locator("p").first();
    const firstNumber = catalog
      .locator('[class*="accordionMeta"] > span')
      .first();

    await expect(layout).toHaveCSS("display", "block");
    await expect(intro).toHaveCSS("position", "static");
    await expect(eyebrow).toHaveCSS("color", "rgb(17, 110, 28)");
    await expect(firstNumber).toHaveCSS("color", "rgb(17, 110, 28)");

    const geometry = await Promise.all([
      intro.boundingBox(),
      accordion.boundingBox(),
    ]);
    const [introBox, accordionBox] = geometry;

    expect(introBox).not.toBeNull();
    expect(accordionBox).not.toBeNull();

    if (!introBox || !accordionBox) {
      throw new Error("Services catalog geometry is unavailable.");
    }

    expect(accordionBox.y).toBeGreaterThan(introBox.y + introBox.height);
    expect(accordionBox.width).toBeGreaterThan(introBox.width);
  });

  test("presents recommendation criteria as one semantic decision framework", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sluzby/");

    const framework = page.locator("[data-services-context]");
    await expect(framework).toContainText("Jak posuzuji doporučení");
    await expect(
      framework.getByRole("heading", {
        name: "Řešení musí fungovat dnes. A nezavřít cestu zítra.",
      }),
    ).toBeVisible();
    await expect(framework).toContainText(
      "Každé doporučení posuzuji podle toho, co udělá s vaším rozpočtem, dalšími závazky a prostorem pro budoucí změny.",
    );

    const criteria = framework.locator("[data-services-context-criterion]");
    await expect(criteria).toHaveCount(3);
    await expect(criteria.nth(0)).toContainText("Prostor v rozpočtu");
    await expect(criteria.nth(1)).toContainText("Dopad na celek");
    await expect(criteria.nth(2)).toContainText("Odolnost v čase");
    await expect(framework.locator("a, button")).toHaveCount(0);

    const headingLineCounts = await framework
      .locator("[data-services-context-heading-line]")
      .evaluateAll((lines) =>
        lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return range.getClientRects().length;
        }),
      );

    expect(headingLineCounts).toEqual([1, 1]);

    const headingMasks = framework.locator('[class*="contextHeadingMask"]');
    const headingLines = framework.locator(
      "[data-services-context-heading-line]",
    );
    await expect(headingMasks).toHaveCount(2);
    await expect(headingLines).toHaveCount(2);
    expect(
      await headingMasks.evaluateAll((masks) =>
        masks.every((mask) => {
          const styles = getComputedStyle(mask);
          return (
            styles.overflow === "clip" &&
            Number.parseFloat(styles.overflowClipMargin) > 0
          );
        }),
      ),
    ).toBe(true);
    expect(
      await headingLines.evaluateAll((lines) =>
        lines.every((line) => getComputedStyle(line).clipPath === "none"),
      ),
    ).toBe(true);
    expect(
      await headingLines.evaluateAll((lines) =>
        lines.every((line) => {
          const mask = line.parentElement;
          if (!mask) return false;

          const range = document.createRange();
          range.selectNodeContents(line);
          const glyphRect = range.getBoundingClientRect();
          const maskRect = mask.getBoundingClientRect();
          const safeMargin = Number.parseFloat(
            getComputedStyle(mask).overflowClipMargin,
          );
          const glyphOverhang = Math.max(
            maskRect.top - glyphRect.top,
            glyphRect.bottom - maskRect.bottom,
          );

          return safeMargin >= glyphOverhang;
        }),
      ),
    ).toBe(true);

    const criterionTops = await criteria.evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top)),
    );

    expect(Math.max(...criterionTops) - Math.min(...criterionTops)).toBeLessThanOrEqual(
      1,
    );
  });

  test("keeps animated Czech display glyphs inside a safe reveal mask", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sluzby/");

    const framework = page.locator("[data-services-context]");
    const headingLines = framework.locator(
      "[data-services-context-heading-line]",
    );

    await expect(page.locator("[data-services-motion]"))
      .toHaveAttribute("data-state", "ready");
    await expect(headingLines).toHaveCount(2);
    expect(
      await headingLines.evaluateAll((lines) =>
        lines.every((line) => getComputedStyle(line).clipPath === "none"),
      ),
    ).toBe(true);
  });

  test("uses one primary CTA identity and paper plane icon", async ({ page }) => {
    await page.goto("/sluzby/");

    const primaryCtas = page.locator(
      'main a[href^="/ziskat-prehled/"]:has([data-cta-icon="paper-plane"])',
    );
    await expect(primaryCtas).toHaveCount(2);

    for (const cta of await primaryCtas.all()) {
      await expect(cta).toHaveText(/Zjistit, čím začít/);
      await expect(cta.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);
    }
  });

  test("maps all service choices to the matching overview situation", async ({
    page,
  }) => {
    await page.goto("/sluzby/");

    const catalog = page.locator("#prehled-sluzeb");
    const expectedMappings = [
      ["financni-plan", "overview", "financial-plan", "service-group-01"],
      ["hypoteka-a-financovani", "housing", "mortgage", "service-group-02"],
      ["prodej-nemovitosti", "housing", "property-sale", "service-group-02"],
      [
        "spotrebitelske-a-podnikatelske-uvery",
        "financing",
        "business-financing",
        "service-group-03",
      ],
      ["zajisteni-prijmu", "protection", "income-protection", "service-group-04"],
      ["pojisteni-majetku", "protection", "property-insurance", "service-group-04"],
      ["pojisteni-vozidla", "protection", "vehicle-insurance", "service-group-04"],
      ["pojisteni-odpovednosti", "protection", "liability-insurance", "service-group-04"],
      ["investice-a-sporeni", "future", "investments", "service-group-05"],
    ] as const;

    for (const [slug, intent, topic, groupId] of expectedMappings) {
      const group = catalog.locator(`#${groupId}`);
      const trigger = group.getByRole("button");
      if ((await trigger.getAttribute("aria-expanded")) !== "true") {
        await trigger.click();
      }

      const service = catalog.locator(`#${slug}`);
      await expect(service).toBeVisible();
      await expect(service).toHaveAttribute(
        "href",
        `/ziskat-prehled/?source=service-detail&intent=${intent}&topic=${topic}&cta=service-${topic}`,
      );
      await expect(service.locator(".lucide-arrow-up-right")).toHaveCount(1);
      await expect(service.locator('[data-cta-icon="paper-plane"]')).toHaveCount(
        0,
      );
    }
  });

  test("keeps exactly one group open and supports keyboard control", async ({
    page,
  }) => {
    await page.goto("/sluzby/");

    const catalog = page.locator("#prehled-sluzeb");
    const firstTrigger = catalog.locator("#service-group-01-trigger");
    const thirdTrigger = catalog.locator("#service-group-03-trigger");

    await expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    await thirdTrigger.focus();
    await page.keyboard.press("Enter");

    await expect(thirdTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#service-group-03$/);
  });

  test("removes accordion motion when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sluzby/");

    const transitionDuration = await page
      .locator("#service-group-01-panel")
      .evaluate((element) => getComputedStyle(element).transitionDuration);

    expect(transitionDuration.split(", ").every((value) => value === "0s")).toBe(
      true,
    );
  });

  test("has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sluzby/");

    await page.locator("[data-services-action]").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-services-action]")).toHaveAttribute(
      "data-route-reveal-state",
      "visible",
    );
    await expect
      .poll(() =>
        page.locator("[data-services-hero-part]").evaluateAll((parts) =>
          parts.every((part) => {
            const styles = getComputedStyle(part);

            return (
              styles.opacity === "1" &&
              (part as HTMLElement).style.willChange === ""
            );
          }),
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page
          .locator(
            "#services-catalog-title, #services-context-title, #services-action-title",
          )
          .evaluateAll((headings) =>
            headings.every(
              (heading) => getComputedStyle(heading).visibility !== "hidden",
            ),
          ),
      )
      .toBe(true);

    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .analyze();

    expect(accessibility.violations).toEqual([]);
  });
});
