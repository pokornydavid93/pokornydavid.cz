import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SITE_THEME_STORAGE_KEY = "dp.siteTheme.v2";
const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-05-05-ga4-v1";

async function seedBrowserState(
  page: Page,
  theme: string | null,
  traceFirstFrame = false,
) {
  await page.addInitScript(
    ({ consentKey, consentVersion, storageKey, themeId, shouldTrace }) => {
      const decidedAt = Date.now();
      window.localStorage.setItem(
        consentKey,
        JSON.stringify({
          choice: "rejected",
          decidedAt,
          expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
          version: consentVersion,
        }),
      );

      const seedMarker = `${storageKey}.playwrightSeeded`;
      if (window.sessionStorage.getItem(seedMarker) !== "true") {
        if (themeId === null) {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, themeId);
        }
        window.sessionStorage.setItem(seedMarker, "true");
      }

      if (shouldTrace) {
        requestAnimationFrame(() => {
          const runtime = window as Window & {
            __siteThemeAtFirstFrame?: string;
          };
          runtime.__siteThemeAtFirstFrame =
            document.documentElement.dataset.colorTheme ?? "missing";
        });
      }
    },
    {
      consentKey: CONSENT_STORAGE_KEY,
      consentVersion: CONSENT_VERSION,
      storageKey: SITE_THEME_STORAGE_KEY,
      themeId: theme,
      shouldTrace: traceFirstFrame,
    },
  );
}

async function readRootTokens(page: Page, names: readonly string[]) {
  return page.evaluate((tokenNames) => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      tokenNames.map((name) => [name, styles.getPropertyValue(name).trim()]),
    );
  }, names);
}

test.describe("site color themes", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      if (route.request().method() === "POST") {
        return route.abort();
      }
      return route.continue();
    });
  });

  test("uses Verdant as the default theme", async ({ page }) => {
    await seedBrowserState(page, null);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute(
      "data-color-theme",
      "verdant",
    );
    expect(
      await page.evaluate((key) => localStorage.getItem(key), SITE_THEME_STORAGE_KEY),
    ).toBeNull();

    expect(
      await readRootTokens(page, [
        "--brand-lime",
        "--brand-forest",
        "--brand-ivory",
        "--brand-jet",
      ]),
    ).toEqual({
      "--brand-lime": "#cbec10",
      "--brand-forest": "#116e1c",
      "--brand-ivory": "#f6f4e8",
      "--brand-jet": "#022c12",
    });
  });

  test("restores a saved Signature choice before the first frame", async ({ page }) => {
    await seedBrowserState(page, "signature", true);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute(
      "data-color-theme",
      "signature",
    );
    expect(
      await page.evaluate((key) => localStorage.getItem(key), SITE_THEME_STORAGE_KEY),
    ).toBe("signature");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const runtime = window as Window & {
            __siteThemeAtFirstFrame?: string;
          };
          return runtime.__siteThemeAtFirstFrame;
        }),
      )
      .toBe("signature");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#0D0D0D",
    );
  });

  test("keeps the browser scrollbar thumb visibly lime", async ({ page }) => {
    await seedBrowserState(page, "verdant");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const scrollbar = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);

      return {
        accent: root.getPropertyValue("--accent-primary").trim(),
        thumb: root.getPropertyValue("--browser-scrollbar-thumb").trim(),
        scrollbarColor: root.scrollbarColor,
      };
    });

    expect(scrollbar.thumb).toBe("#cbec10");
    expect(scrollbar.thumb).toBe(scrollbar.accent);
    expect(scrollbar.scrollbarColor).toContain("rgb(203, 236, 16)");
  });

  test("restores Verdant before the first frame and maps every supplied role", async ({
    page,
  }) => {
    await seedBrowserState(page, "verdant", true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute(
      "data-color-theme",
      "verdant",
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const runtime = window as Window & {
            __siteThemeAtFirstFrame?: string;
          };
          return runtime.__siteThemeAtFirstFrame;
        }),
      )
      .toBe("verdant");

    expect(
      await readRootTokens(page, [
        "--brand-lime",
        "--brand-forest",
        "--brand-ivory",
        "--brand-jet",
        "--surface-card-light",
        "--text-on-dark-secondary",
        "--text-on-dark-muted",
        "--text-on-light-secondary",
        "--border-on-light-subtle",
        "--border-on-dark-subtle",
        "--status-info-indicator",
        "--theme-transparent",
      ]),
    ).toEqual({
      "--brand-lime": "#cbec10",
      "--brand-forest": "#116e1c",
      "--brand-ivory": "#f6f4e8",
      "--brand-jet": "#022c12",
      "--surface-card-light": "#fff",
      "--text-on-dark-secondary": "#ffffffd9",
      "--text-on-dark-muted": "#ffffffa6",
      "--text-on-light-secondary": "#39463e",
      "--border-on-light-subtle": "#022c121a",
      "--border-on-dark-subtle": "#fff3",
      "--status-info-indicator": "#007cdc",
      "--theme-transparent": "#0000",
    });

    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#022C12",
    );
    await expect(page.locator("[data-cinematic-home-hero]")).toHaveCSS(
      "background-color",
      "rgb(2, 44, 18)",
    );
    await expect(page.locator('[data-home-module="profile"]')).toHaveCSS(
      "background-color",
      "rgb(246, 244, 232)",
    );

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);

    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("normalizes an unknown stored theme to Verdant", async ({ page }) => {
    await seedBrowserState(page, "unknown-theme", true);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute(
      "data-color-theme",
      "verdant",
    );
    expect(
      await page.evaluate((key) => localStorage.getItem(key), SITE_THEME_STORAGE_KEY),
    ).toBeNull();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const runtime = window as Window & {
            __siteThemeAtFirstFrame?: string;
          };
          return runtime.__siteThemeAtFirstFrame;
        }),
      )
      .toBe("verdant");
  });

  test("does not render dev settings in the public app", async ({ page }) => {
    await seedBrowserState(page, null);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-component="dev-settings"]')).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Otevřít dev nastavení" }),
    ).toHaveCount(0);
  });

  test("keeps Verdant composed without horizontal overflow on mobile", async ({
    page,
  }) => {
    await seedBrowserState(page, "verdant");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute(
      "data-color-theme",
      "verdant",
    );
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  });
});
