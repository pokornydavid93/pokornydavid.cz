import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-05-05-ga4-v1";
const HEADER_THEME_STORAGE_KEY = "site_header_theme_v1";
const HEADER_SELECTOR = '[data-component="site-header"]';
const TRANSPARENT_SURFACE = "rgba(0, 0, 0, 0)";
const SHARED_BACKDROP = "blur(8px)";
const REFERENCE_LIGHT_SURFACE = "rgb(246, 244, 232)";

type HeaderMaterial = {
  backdrop: string;
  background: string;
  backgroundImage: string;
  borderBottomColor: string;
  borderBottomStyle: string;
  borderBottomWidth: string;
  shadow: string;
};

async function readHeaderMaterial(header: Locator): Promise<HeaderMaterial> {
  return header.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      backdrop: style.backdropFilter,
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderBottomColor: style.borderBottomColor,
      borderBottomStyle: style.borderBottomStyle,
      borderBottomWidth: style.borderBottomWidth,
      shadow: style.boxShadow,
    };
  });
}

async function readHeaderForeground(header: Locator) {
  return header.evaluate((element) => {
    const brand = element.querySelector<HTMLElement>(
      "[data-header-motion-inner] > a svg",
    );
    const link = element.querySelector<HTMLElement>(
      '[data-component="site-navigation"] ul a',
    );
    const action = element.querySelector<HTMLElement>(
      '[data-analytics-placement="header"]',
    );
    const actionIcon = action?.querySelector<HTMLElement>(
      '[data-cta-icon="paper-plane"]',
    );
    const actionIconShell = action?.querySelector<HTMLElement>(
      "[data-cta-icon-shell]",
    );

    return {
      actionBackground: action ? getComputedStyle(action).backgroundColor : null,
      actionBorder: action ? getComputedStyle(action).borderColor : null,
      actionColor: action ? getComputedStyle(action).color : null,
      actionShadow: action ? getComputedStyle(action).boxShadow : null,
      actionIcon: actionIcon ? getComputedStyle(actionIcon).color : null,
      actionIconBackground: actionIconShell
        ? getComputedStyle(actionIconShell).backgroundColor
        : null,
      actionIconBorder: actionIconShell
        ? getComputedStyle(actionIconShell).borderColor
        : null,
      actionIconShadow: actionIconShell
        ? getComputedStyle(actionIconShell).boxShadow
        : null,
      brand: brand ? getComputedStyle(brand).color : null,
      link: link ? getComputedStyle(link).color : null,
    };
  });
}

function parseRgbColor(color: string): [number, number, number, number] {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (!match) throw new Error(`Expected an RGB color, received ${color}`);
  const [red, green, blue, alpha = 1] = match[1]
    .split(/[\s,/]+/)
    .map(Number);
  return [red, green, blue, alpha];
}

function expectSharedGlassMaterial(material: HeaderMaterial) {
  const alpha = parseRgbColor(material.background)[3];
  expect(alpha).toBeGreaterThan(0);
  expect(alpha).toBeLessThan(1);
  expect(material.backgroundImage).toBe("none");
  expect(material.backdrop).toBe(SHARED_BACKDROP);
  expect(material.borderBottomWidth).toBe("0px");
  expect(material.borderBottomStyle).toBe("none");
  expect(material.shadow).not.toBe("none");
  expect(material.shadow.match(/rgba?\(/g)).toHaveLength(3);
}

async function expectReadableGlassNavigation(header: Locator) {
  const background = parseRgbColor((await readHeaderMaterial(header)).background);
  const link = header.locator(
    '[data-component="site-navigation"] ul a:not([aria-current])',
  ).first();
  await expect(link).toBeVisible();
  await expect(link).toHaveCSS("opacity", "1");
  const foreground = parseRgbColor(
    await link.evaluate((element) => getComputedStyle(element).color),
  );
  const luminance = (rgb: number[]) => {
    const linear = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };

  // Solid black/white are the extreme backdrops, including when blur is absent.
  for (const backing of [0, 255]) {
    const surface = background.slice(0, 3).map(
      (channel) => channel * background[3] + backing * (1 - background[3]),
    );
    const text = foreground.slice(0, 3).map(
      (channel, index) =>
        channel * foreground[3] + surface[index] * (1 - foreground[3]),
    );
    const levels = [luminance(surface), luminance(text)].sort((a, b) => a - b);
    const contrast = (levels[1] + 0.05) / (levels[0] + 0.05);
    expect(contrast, `Inactive navigation over ${backing === 0 ? "black" : "white"}`)
      .toBeGreaterThanOrEqual(4.5);
  }
}

function expectHomepageLightMaterial(material: HeaderMaterial) {
  expect(material.background).not.toBe(TRANSPARENT_SURFACE);
  expect(material.backgroundImage).toBe("none");
  expect(material.backdrop).toBe("blur(8px) saturate(0.82)");
  expect(material.borderBottomWidth).toBe("1px");
  expect(material.borderBottomStyle).toBe("solid");
  expect(material.shadow).not.toBe("none");
}

function expectHomepageDarkMaterial(material: HeaderMaterial) {
  expect(material.background).not.toBe(TRANSPARENT_SURFACE);
  expect(material.backgroundImage).toBe("none");
  expect(material.backdrop).toBe("blur(8px) saturate(0.9)");
  expect(material.borderBottomWidth).toBe("1px");
  expect(material.borderBottomStyle).toBe("solid");
  expect(material.shadow).not.toBe("none");
}

function expectHomepageSceneMaterial(header: HeaderMaterial) {
  expect(header.background).toBe(TRANSPARENT_SURFACE);
  expect(header.backgroundImage).toBe("none");
  expect(header.backdrop).toBe("none");
  expect(header.borderBottomStyle).toBe("none");
  expect(header.borderBottomWidth).toBe("0px");
  expect(header.shadow).toBe("none");
}

function getMaterialSignature(material: HeaderMaterial) {
  return {
    backdrop: material.backdrop,
    background: material.background,
    backgroundImage: material.backgroundImage,
    borderBottomStyle: material.borderBottomStyle,
    borderBottomWidth: material.borderBottomWidth,
    shadow: material.shadow,
  };
}

async function expectMaterial(
  header: Locator,
  material: "default" | "hero-glass",
) {
  await expect(header).toHaveAttribute("data-nav-material", material);
}

async function readPngLuminanceDeviation(page: Page, png: Buffer) {
  return page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D context is unavailable.");

    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    ).data;
    let sum = 0;
    let squareSum = 0;
    let count = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const luminance =
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      sum += luminance;
      squareSum += luminance * luminance;
      count += 1;
    }

    const mean = sum / count;
    return Math.sqrt(squareSum / count - mean * mean);
  }, `data:image/png;base64,${png.toString("base64")}`);
}

async function seedCookieConsent(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      const decidedAt = Date.now();

      window.localStorage.setItem(
        key,
        JSON.stringify({
          choice: "rejected",
          decidedAt,
          expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
          version,
        }),
      );
    },
    { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION },
  );
}

async function waitForThemeController(page: Page) {
  const header = page.locator(HEADER_SELECTOR);

  await expect(
    header.locator('[data-header-theme-controller][data-state="ready"]'),
  ).toHaveCount(1);
  const homepageIntro = page.locator("[data-home-intro]");
  if (await homepageIntro.count()) {
    await expect
      .poll(async () => {
        await page.keyboard.press("Escape");
        return homepageIntro.evaluate(
          (element) => getComputedStyle(element).display === "none",
        );
      })
      .toBe(true);
  }
  await page.evaluate(() => {
    document.documentElement.setAttribute(
      "data-site-header-lock-visible",
      "navigation-theme-test",
    );
  });

  return page.locator(`${HEADER_SELECTOR}:not([inert])`);
}

async function scrollToOwner(page: Page, selector: string) {
  await page.locator(selector).evaluate((element) => {
    let top = 0;
    let current: HTMLElement | null = element as HTMLElement;

    while (current) {
      top += current.offsetTop;
      current = current.offsetParent as HTMLElement | null;
    }

    const win = window as Window & {
      __lenis?: {
        scrollTo?: (
          target: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    };

    if (win.__lenis?.scrollTo) {
      win.__lenis.scrollTo(top, { force: true, immediate: true });
      return;
    }

    window.scrollTo(0, top);
  });
}

async function expectTheme(
  header: ReturnType<Page["locator"]>,
  theme: "dark" | "light",
) {
  await expect(header).toHaveAttribute("data-nav-theme", theme);
  await expect(header).toHaveAttribute("data-surface-tone", theme);
  await expect(header).toHaveAttribute("data-cursor-surface", theme);
}

test.describe("context-aware public navigation theme", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  test("keeps the history bootstrap outside headers during client navigation", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForThemeController(page);

    await page.locator(
      '[data-header-instance="hero"] a[href="/kdo-jsem/"]',
    ).click();
    await page.waitForURL("**/kdo-jsem/");
    await expect(page.locator(HEADER_SELECTOR)).toHaveCount(1);
    await expect(page.locator(`${HEADER_SELECTOR} script`)).toHaveCount(0);
    await expect(
      page.locator('script[data-site-header-theme-bootstrap="true"]'),
    ).toHaveCount(1);
    expect(consoleErrors.filter((message) =>
      message.includes("script tag while rendering React component")
    )).toEqual([]);

    await page.evaluate((storageKey) => {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          pathname: window.location.pathname,
          theme: "light",
          updatedAt: Date.now(),
        }),
      );
    }, HEADER_THEME_STORAGE_KEY);
    await page.reload({ waitUntil: "domcontentloaded" });

    const restoredHeader = page.locator(HEADER_SELECTOR);
    await expectTheme(restoredHeader, "light");
    await expect(restoredHeader).toHaveAttribute(
      "data-nav-theme-history",
      "restore",
    );
    await expect(restoredHeader.locator("script")).toHaveCount(0);
    expect(consoleErrors.filter((message) =>
      message.includes("script tag while rendering React component")
    )).toEqual([]);
  });

  test("tracks homepage owners and keeps hero glass scoped to the hero", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const header = await waitForThemeController(page);

    await expectTheme(header, "dark");
    await expectMaterial(header, "hero-glass");
    const heroMaterial = await readHeaderMaterial(header);
    const darkForeground = await readHeaderForeground(header);
    expectHomepageSceneMaterial(heroMaterial);
    await expect(page.locator("[data-hero-trust]")).toHaveCount(0);
    const darkAccessibility = await new AxeBuilder({ page })
      .include(HEADER_SELECTOR)
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(darkAccessibility.violations).toEqual([]);

    await scrollToOwner(page, '[data-home-module="profile"]');
    await expectTheme(header, "light");
    await expectMaterial(header, "default");
    await expect
      .poll(async () => (await readHeaderMaterial(header)).background)
      .not.toBe(TRANSPARENT_SURFACE);
    const lightDefaultMaterial = await readHeaderMaterial(header);
    expectHomepageLightMaterial(lightDefaultMaterial);
    let darkDefaultMaterial: HeaderMaterial | null = null;

    for (const [selector, theme] of [
      ['[data-home-module="situations"]', "light"],
      ['[data-home-module="process"]', "dark"],
      ['[data-home-module="references"]', "light"],
      ['[data-home-module="insights"]', "dark"],
      ['[data-home-module="faq"]', "light"],
    ] as const) {
      await scrollToOwner(page, selector);
      await expectTheme(header, theme);
      await expectMaterial(header, "default");
      const material = await readHeaderMaterial(header);
      if (theme === "light") {
        expectHomepageLightMaterial(material);
        expect(getMaterialSignature(material)).toEqual(
          getMaterialSignature(lightDefaultMaterial),
        );
      } else {
        expectHomepageDarkMaterial(material);
        darkDefaultMaterial ??= material;
        expect(getMaterialSignature(material)).toEqual(
          getMaterialSignature(darkDefaultMaterial),
        );
      }
    }

    await scrollToOwner(page, '[data-home-module="references"]');
    await expectTheme(header, "light");
    const lightMaterial = await readHeaderMaterial(header);
    const lightForeground = await readHeaderForeground(header);
    expectHomepageLightMaterial(lightMaterial);
    expect(lightMaterial).toEqual(lightDefaultMaterial);
    expect(lightForeground.brand).not.toBe(darkForeground.brand);
    expect(lightForeground.link).not.toBe(darkForeground.link);
    expect(lightForeground.actionBackground).not.toBe(
      darkForeground.actionBackground,
    );
    expect(lightForeground.actionBorder).not.toBe(darkForeground.actionBorder);
    expect(lightForeground.actionColor).not.toBe(darkForeground.actionColor);
    expect(darkForeground.actionBackground).toBe(darkForeground.actionIcon);
    expect(darkForeground.actionBorder).toBe(darkForeground.actionBackground);
    expect(darkForeground.actionIconBackground).toBe("rgb(4, 19, 12)");
    expect(darkForeground.actionIconBorder).toBe(
      darkForeground.actionIconBackground,
    );
    expect(darkForeground.actionColor).toBe("rgb(2, 44, 18)");
    expect(darkForeground.actionShadow).not.toBe("none");
    expect(darkForeground.actionIconShadow).toBe("none");
    expect(lightForeground.actionIcon).toBe("rgb(17, 110, 28)");
    expect(lightForeground.actionIconBackground).not.toBe(
      lightForeground.actionBackground,
    );
    expect(lightForeground.actionIconBorder).not.toBe(
      lightForeground.actionIconBackground,
    );
    expect(lightForeground.actionShadow).not.toBe("none");
    expect(lightForeground.actionIconShadow).not.toBe("none");
    const worstCaseLinkContrast = await header.evaluate((element) => {
      const link = element.querySelector<HTMLElement>(
        '[data-component="site-navigation"] ul a',
      )!;
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const luminance = ([red, green, blue]: readonly number[]) => {
        const channels = [red, green, blue].map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126
          + channels[1] * 0.7152
          + channels[2] * 0.0722;
      };
      const readPixel = () => [
        ...context.getImageData(0, 0, 1, 1).data.slice(0, 3),
      ];

      context.fillStyle = "#000";
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(element).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      const background = readPixel();
      context.fillStyle = getComputedStyle(link).color;
      context.fillRect(0, 0, 1, 1);
      const foreground = readPixel();
      const lighter = Math.max(luminance(background), luminance(foreground));
      const darker = Math.min(luminance(background), luminance(foreground));
      return (lighter + 0.05) / (darker + 0.05);
    });
    expect(worstCaseLinkContrast).toBeGreaterThanOrEqual(4.5);
    const profileSurface = await page.locator('[data-home-module="profile"]')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          token: style.getPropertyValue("--profile-surface").trim(),
        };
      });
    expect(profileSurface.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(profileSurface.background).toBe("rgb(246, 244, 232)");
    expect(profileSurface.token.toLowerCase()).toBe("#f6f4e8");
    const referenceSurfaceToken = await page.locator("[data-reference-carousel]")
      .evaluate((element) => getComputedStyle(element)
        .getPropertyValue("--surface-section-light").trim());
    expect(referenceSurfaceToken.toLowerCase()).toBe("#f6f4e8");
    await expect(page.locator("[data-reference-carousel]")).toHaveCSS(
      "background-color",
      REFERENCE_LIGHT_SURFACE,
    );
    await expect(page.locator("[data-reference-carousel-stage]")).toHaveCSS(
      "background-color",
      REFERENCE_LIGHT_SURFACE,
    );
    const lightAccessibility = await new AxeBuilder({ page })
      .include(HEADER_SELECTOR)
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(lightAccessibility.violations).toEqual([]);

    await scrollToOwner(page, '[data-home-module="process"]');
    await expectTheme(header, "dark");
    await expectMaterial(header, "default");
    expect(darkDefaultMaterial).not.toBeNull();
    await expect
      .poll(async () => getMaterialSignature(
        await readHeaderMaterial(header),
      ))
      .toEqual(getMaterialSignature(darkDefaultMaterial!));

    await scrollToOwner(page, "[data-cinematic-home-hero]");
    await expectTheme(header, "dark");
    await expectMaterial(header, "hero-glass");
    await expect.poll(() => readHeaderMaterial(header)).toEqual(heroMaterial);
  });

  test("prefers the visible surface to clipped handoff geometry", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const header = await waitForThemeController(page);
    await expectTheme(header, "dark");

    await page.evaluate(() => {
      document.querySelector("[data-cinematic-home-hero]")
        ?.removeAttribute("data-nav-theme");
      const clippedOwner = document.createElement("section");
      clippedOwner.dataset.navigationClippedOwnerProbe = "";
      clippedOwner.dataset.navTheme = "light";
      Object.assign(clippedOwner.style, {
        clipPath: "circle(1px at 50% 100%)",
        inset: "0",
        pointerEvents: "none",
        position: "fixed",
        zIndex: "8",
      });
      document.body.append(clippedOwner);
      window.dispatchEvent(new Event("site-visual-layout-change"));
    });

    await expect.poll(() => page.evaluate(() => {
      const headerElement = document.querySelector<HTMLElement>(
        '[data-component="site-header"]',
      )!;
      const y = headerElement.offsetHeight + 1;
      return [0.18, 0.5, 0.82].every((ratio) =>
        !document.elementsFromPoint(window.innerWidth * ratio, y).some(
          (element) => element.hasAttribute("data-navigation-clipped-owner-probe"),
        )
      );
    })).toBe(true);
    await expectTheme(header, "dark");
  });

  test("settles on the visual owner after rapid forward and reverse scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const header = await waitForThemeController(page);

    await scrollToOwner(page, '[data-home-module="profile"]');
    await scrollToOwner(page, '[data-home-module="process"]');
    await scrollToOwner(page, '[data-home-module="profile"]');
    await expectTheme(header, "light");
    await expectMaterial(header, "default");

    await scrollToOwner(page, '[data-home-module="references"]');
    await scrollToOwner(page, '[data-home-module="process"]');
    await expectTheme(header, "dark");
    await expectMaterial(header, "default");

    await page.reload({ waitUntil: "domcontentloaded" });
    const restoredHeader = await waitForThemeController(page);
    await expectTheme(restoredHeader, "dark");
    await expectMaterial(restoredHeader, "default");

    await scrollToOwner(page, '[data-home-module="situations"]');
    await expectTheme(restoredHeader, "light");
    await expectMaterial(restoredHeader, "default");
    await scrollToOwner(page, '[data-cinematic-home-hero]');
    await expectTheme(restoredHeader, "dark");
    await expectMaterial(restoredHeader, "hero-glass");

    await page.evaluate(() => {
      window.history.replaceState(null, "", "#david");
    });
    await scrollToOwner(page, '[data-home-module="process"]');
    await expectTheme(restoredHeader, "dark");
    await expectMaterial(restoredHeader, "default");
    await page.reload({ waitUntil: "domcontentloaded" });
    const persistentHashHeader = await waitForThemeController(page);
    await expectTheme(persistentHashHeader, "dark");
    await expectMaterial(persistentHashHeader, "default");
  });

  test("keeps the dark hero navigation from the first paint after reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForThemeController(page);

    await page.evaluate((storageKey) => {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          pathname: "/",
          theme: "light",
          updatedAt: Date.now(),
        }),
      );
    }, HEADER_THEME_STORAGE_KEY);
    await page.addInitScript(() => {
      const win = window as Window & {
        __siteHeaderMaterialTrace?: string[];
        __siteHeaderThemeTrace?: string[];
      };
      win.__siteHeaderMaterialTrace = [];
      win.__siteHeaderThemeTrace = [];

      const recordHeaderState = () => {
        const header = document.querySelector<HTMLElement>(
          '[data-component="site-header"][data-header-instance="hero"]',
        );
        if (!header) return;

        const theme = header.dataset.navTheme ?? "missing";
        if (win.__siteHeaderThemeTrace?.at(-1) !== theme) {
          win.__siteHeaderThemeTrace?.push(theme);
        }

        const material = header.dataset.navMaterial ?? "missing";
        if (win.__siteHeaderMaterialTrace?.at(-1) !== material) {
          win.__siteHeaderMaterialTrace?.push(material);
        }
      };

      new MutationObserver(recordHeaderState).observe(document, {
        attributes: true,
        attributeFilter: ["data-nav-material", "data-nav-theme"],
        childList: true,
        subtree: true,
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    const initialHeader = page.locator(`${HEADER_SELECTOR}[data-header-instance="hero"]`);
    await expectTheme(initialHeader, "dark");
    await expectMaterial(initialHeader, "hero-glass");
    expectHomepageSceneMaterial(await readHeaderMaterial(initialHeader));
    const header = await waitForThemeController(page);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const win = window as Window & { __siteHeaderThemeTrace?: string[] };
          return win.__siteHeaderThemeTrace ?? [];
        }),
      )
      .toEqual(["dark"]);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const win = window as Window & {
            __siteHeaderMaterialTrace?: string[];
          };
          return win.__siteHeaderMaterialTrace ?? [];
        }),
      )
      .toEqual(["hero-glass"]);

    await scrollToOwner(page, '[data-home-module="profile"]');
    await expectTheme(header, "light");
    await expectMaterial(header, "default");
    await scrollToOwner(page, '[data-cinematic-home-hero]');
    await expectTheme(header, "dark");
    await expectMaterial(header, "hero-glass");
  });

  test("maps light route chapters and leaves static preview headers static", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/clanky/", { waitUntil: "domcontentloaded" });
    const articlesHeader = await waitForThemeController(page);
    await scrollToOwner(page, '[aria-labelledby="latest-articles-title"]');
    await expectTheme(articlesHeader, "light");

    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
    const servicesHeader = await waitForThemeController(page);
    await scrollToOwner(page, "[data-services-action]");
    await expectTheme(servicesHeader, "light");

    await page.goto("/design-language/shell-preview/", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.locator(
        '[data-component="site-header"] [data-header-theme-controller]',
      ),
    ).toHaveCount(0);
  });

  test("uses the anchor theme before hydration and keeps it after hydration", async ({
    baseURL,
    browser,
    page,
  }) => {
    const noScriptContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const noScriptPage = await noScriptContext.newPage();

    await noScriptPage.goto(`${baseURL}/#david`, {
      waitUntil: "domcontentloaded",
    });
    expectHomepageLightMaterial(
      await readHeaderMaterial(
        noScriptPage.locator(`${HEADER_SELECTOR}[data-header-instance="dynamic"]`),
      ),
    );

    await noScriptPage.goto(`${baseURL}/pravni-informace/`, {
      waitUntil: "domcontentloaded",
    });
    await expect(noScriptPage.locator(HEADER_SELECTOR)).toHaveAttribute(
      "data-nav-theme",
      "light",
    );
    expectSharedGlassMaterial(
      await readHeaderMaterial(noScriptPage.locator(HEADER_SELECTOR)),
    );
    for (const route of ["/kdo-jsem/", "/reference/", "/jak-pracuji/", "/sluzby/"]) {
      await noScriptPage.goto(`${baseURL}${route}`, {
        waitUntil: "domcontentloaded",
      });
      const routeHeader = noScriptPage.locator(HEADER_SELECTOR);
      expectHomepageSceneMaterial(await readHeaderMaterial(routeHeader));
      await expect(routeHeader.locator("[data-header-overview] [data-cta-label]"))
        .toBeVisible();
      await expect(routeHeader.locator("[data-header-overview]"))
        .toHaveAttribute("href", "/ziskat-prehled/?source=header&cta=header-primary");
    }
    await noScriptContext.close();

    await page.goto("/#david", { waitUntil: "domcontentloaded" });
    const header = await waitForThemeController(page);
    await expectTheme(header, "light");
    await expectMaterial(header, "default");
    expectHomepageLightMaterial(await readHeaderMaterial(header));

    await page.goto("/#postup", { waitUntil: "domcontentloaded" });
    const darkHeader = await waitForThemeController(page);
    await expectTheme(darkHeader, "dark");
    await expectMaterial(darkHeader, "default");
    expectHomepageDarkMaterial(await readHeaderMaterial(darkHeader));
  });

  test("visibly blurs the scene beneath shared route glass", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [route, theme] of [
      ["/sluzby/", "dark"],
      ["/pravni-informace/", "light"],
    ] as const) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const header = await waitForThemeController(page);
      if (route === "/sluzby/") {
        await scrollToOwner(page, "[data-services-hero] h1");
      }
      await expectTheme(header, theme);
      await expectMaterial(header, "default");
      const material = await readHeaderMaterial(header);
      expectSharedGlassMaterial(material);
      await expectReadableGlassNavigation(header);

      await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.dataset.navigationBlurProbe = "";
        Object.assign(probe.style, {
          background:
            "repeating-linear-gradient(90deg, #000 0 4px, #fff 4px 8px)",
          height: "80px",
          inset: "0 0 auto",
          pointerEvents: "none",
          position: "fixed",
          zIndex: "199",
        });
        document.body.append(probe);
      });
      await page.addStyleTag({
        content:
          '[data-component="site-header"] [data-header-motion-inner] { visibility: hidden !important; }',
      });
      await page.waitForTimeout(100);

      const bounds = await header.boundingBox();
      expect(bounds).not.toBeNull();
      if (!bounds) throw new Error("Header bounds are unavailable.");
      const clip = {
        x: Math.round(bounds.x + bounds.width * 0.42),
        y: Math.round(bounds.y + 10),
        width: 160,
        height: 48,
      };
      const blurred = await page.screenshot({ clip });

      await page.addStyleTag({
        content:
          '[data-component="site-header"] { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }',
      });
      await page.waitForTimeout(100);
      const unblurred = await page.screenshot({ clip });

      const blurredDeviation = await readPngLuminanceDeviation(page, blurred);
      const unblurredDeviation = await readPngLuminanceDeviation(
        page,
        unblurred,
      );
      // Tint attenuates the checkerboard; preserve the original signal threshold
      // after normalizing for the portion of the backdrop still transmitted.
      const transmission = 1 - parseRgbColor(material.background)[3];
      expect(unblurredDeviation / transmission).toBeGreaterThan(35);
      expect(blurredDeviation / unblurredDeviation).toBeLessThan(0.35);
      await test.info().attach(`glass-${theme}-pixels`, {
        body: JSON.stringify({ blurredDeviation, unblurredDeviation, transmission }),
        contentType: "application/json",
      });
    }
  });

  test.describe("touch mobile navigation", () => {
    test.use({ hasTouch: true, isMobile: true });

    test("keeps the mobile panel controlled, keyboard-readable, and independent of the page", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const header = await waitForThemeController(page);
      await scrollToOwner(page, "#david");
      await expectTheme(header, "light");
      await page.emulateMedia({ reducedMotion: "no-preference" });

      const navigation = header.getByRole("navigation", {
        name: "Hlavní navigace",
      });
      const trigger = navigation.getByRole("button");
      const triggerLines = trigger.locator("[data-menu-trigger-line]");
      const headerAction = header.locator("[data-header-overview]");
      const headerActionLabel = headerAction.locator("[data-cta-label]");
      const headerActionIconShell = headerAction.locator("[data-cta-icon-shell]");
      const triggerBox = await trigger.boundingBox();
      const headerActionBox = await headerAction.boundingBox();

      await expect(headerAction).toHaveAccessibleName("Získat přehled");
      await expect(headerAction).toHaveAttribute("href", "/ziskat-prehled/?source=header&cta=header-primary");
      await expect(headerActionLabel).toBeVisible();
      await expect(headerActionLabel).toHaveText("Získat přehled");
      await expect(page.locator("[data-custom-cursor-root]:visible")).toHaveCount(0);
      expect(headerActionBox).not.toBeNull();
      expect(triggerBox).not.toBeNull();
      expect((triggerBox?.x ?? 0) + (triggerBox?.width ?? 0))
        .toBeLessThanOrEqual(headerActionBox?.x ?? 0);
      expect(headerActionBox?.width).toBeGreaterThan(44);
      expect(headerActionBox?.height).toBeGreaterThanOrEqual(44);
      expect((headerActionBox?.x ?? 0) + (headerActionBox?.width ?? 0))
        .toBeLessThanOrEqual(390);
      await expect(headerActionIconShell).toBeVisible();
      await expect(headerAction.locator('[data-cta-icon="paper-plane"]')).toBeVisible();
      await expect(headerActionIconShell).toHaveCSS("animation-name", "none");
      await expect(trigger).toHaveAccessibleName("Otevřít menu");
      await expect(triggerLines).toHaveCount(3);
      await trigger.click();

      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(trigger).toHaveAccessibleName("Zavřít menu");
      await expect(headerAction).toHaveCSS("visibility", "hidden");
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

      const panel = page.getByRole("dialog", { name: "Kam chcete pokračovat?" });
      const scrim = page.locator('[data-navigation-scrim][data-open="true"]');
      await expect(scrim).toHaveCount(1);
      await expect(panel).toHaveCSS(
        "background-color",
        "rgb(2, 44, 18)",
      );
      await expect(panel).toHaveCSS("backdrop-filter", "none");
      await expect(panel).toHaveCSS("box-shadow", "none");
      await expect(panel).toHaveCSS("border-radius", "0px");
      await expect(scrim).toHaveCSS("pointer-events", "auto");
      await expect(page.locator("main")).toHaveAttribute("inert", "");

      const panelBox = await panel.boundingBox();
      expect(panelBox).not.toBeNull();
      expect(panelBox?.x).toBeGreaterThan(0);
      expect(panelBox?.x).toBeLessThanOrEqual(48);
      expect(panelBox?.y).toBe(0);
      expect(panelBox?.height).toBe(844);
      expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeCloseTo(
        await page.evaluate(() => document.body.getBoundingClientRect().right),
        0,
      );

      const close = panel.getByRole("button", { name: "Zavřít menu" });
      const links = panel.getByRole("link");
      const overviewAction = panel.locator("[data-navigation-drawer-overview]");
      await expect(overviewAction).toHaveAccessibleName("Získat přehled");
      await expect(overviewAction).toHaveAttribute(
        "href", "/ziskat-prehled/?source=header&cta=header-primary",
      );
      await expect(overviewAction).toBeInViewport();
      const closeBox = await close.boundingBox();
      expect(closeBox?.width).toBeGreaterThanOrEqual(44);
      expect(closeBox?.height).toBeGreaterThanOrEqual(44);
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(links.first()).toBeFocused();
      await links.last().focus();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(links.last()).toBeFocused();

      const accessibility = await new AxeBuilder({ page })
        .include("#public-site-navigation-panel")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);

      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toHaveAccessibleName("Otevřít menu");
      await expect(trigger).toBeFocused();
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      await expect(page.locator("main")).not.toHaveAttribute("inert", "");
    });

    test("keeps the narrow phone drawer contained and keyboard-reachable at 200% text size", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const header = await waitForThemeController(page);
      await page.evaluate(async () => {
        document.documentElement.style.fontSize = "200%";
        await document.fonts.ready;
      });
      await expect(page.locator("html")).toHaveCSS("font-size", "32px");

      const trigger = header.getByRole("button", { name: "Otevřít menu" });
      await trigger.tap();
      const panel = page.getByRole("dialog", { name: "Kam chcete pokračovat?" });
      const close = panel.getByRole("button", { name: "Zavřít menu" });
      const links = panel.locator("[data-navigation-drawer-link]");
      const overviewAction = panel.locator("[data-navigation-drawer-overview]");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("aria-modal", "true");
      await expect(page.locator("main")).toHaveAttribute("inert", "");
      await expect(page.locator("[data-custom-cursor-root]:visible")).toHaveCount(0);
      await expect(overviewAction).toHaveAttribute(
        "href", "/ziskat-prehled/?source=header&cta=header-primary",
      );

      const expectContainedControls = async () => {
        const geometry = await panel.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            contentLeft: bounds.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
            contentRight: bounds.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
            controls: Array.from(element.querySelectorAll<HTMLElement>(
              "[data-navigation-drawer-link], [data-navigation-drawer-overview]",
            )).map((control) => {
              const rect = control.getBoundingClientRect();
              return { left: rect.left, right: rect.right };
            }),
          };
        });
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
        expect(geometry.controls).toHaveLength(6);
        for (const control of geometry.controls) {
          expect(control.left).toBeGreaterThanOrEqual(geometry.contentLeft - 1);
          expect(control.right).toBeLessThanOrEqual(geometry.contentRight + 1);
        }
      };

      await expectContainedControls();
      const closeBox = await close.boundingBox();
      expect(closeBox).not.toBeNull();
      expect(closeBox?.width).toBeGreaterThanOrEqual(44);
      expect(closeBox?.height).toBeGreaterThanOrEqual(44);
      await expect(close).toBeInViewport({ ratio: 1 });
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(links.first()).toBeFocused();

      await overviewAction.scrollIntoViewIfNeeded();
      await expect(overviewAction).toBeInViewport({ ratio: 1 });
      await overviewAction.focus();
      await expect(overviewAction).toBeFocused();
      await expectContainedControls();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await expect(close).toBeInViewport({ ratio: 1 });
      await page.keyboard.press("Shift+Tab");
      await expect(overviewAction).toBeFocused();
      await expect(overviewAction).toBeInViewport({ ratio: 1 });

      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
      await expect(panel).not.toBeVisible();
      await expect(page.locator("main")).not.toHaveAttribute("inert", "");
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      await expect(page.locator("body")).not.toHaveAttribute("data-navigation-drawer-open", "true");
    });

    test("moves the mobile drawer through one reversible right-edge trajectory", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
      await waitForThemeController(page);
      await expect(page.locator("#public-site-navigation-panel")).toHaveCount(1);

      const motion = await page.evaluate(async () => {
        const panel = document.querySelector<HTMLElement>(
          "#public-site-navigation-panel",
        )!;
        const trigger = document.querySelector<HTMLButtonElement>(
          'button[aria-controls="public-site-navigation-panel"]',
        )!;
        const twoFrames = () => new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const closedX = panel.getBoundingClientRect().x;
        const initialInlineTransform = panel.style.transform;
        trigger.click();
        await twoFrames();
        await new Promise((resolve) => window.setTimeout(resolve, 90));
        const openingX = panel.getBoundingClientRect().x;
        await new Promise((resolve) => window.setTimeout(resolve, 920));
        const openX = panel.getBoundingClientRect().x;

        panel.querySelector<HTMLButtonElement>(
          'button[aria-label="Zavřít menu"]',
        )!.click();
        await twoFrames();
        await new Promise((resolve) => window.setTimeout(resolve, 90));
        const closingX = panel.getBoundingClientRect().x;
        const utilitiesStaySuppressed =
          document.body.dataset.navigationDrawerOpen === "true";
        await new Promise((resolve) => window.setTimeout(resolve, 920));
        const closedFinalX = panel.getBoundingClientRect().x;
        trigger.click();
        await twoFrames();
        await new Promise((resolve) => window.setTimeout(resolve, 90));
        const reopenedX = panel.getBoundingClientRect().x;
        // Reverse the reused timeline while its entrance is still active.
        panel.querySelector<HTMLButtonElement>(
          'button[aria-label="Zavřít menu"]',
        )!.click();
        await new Promise((resolve) => window.setTimeout(resolve, 920));

        return {
          bodyOverflow: getComputedStyle(document.body).overflow,
          closedFinalX,
          closedX,
          closingX,
          initialInlineTransform,
          openX,
          openingX,
          reopenedX,
          reversedFinalX: panel.getBoundingClientRect().x,
          utilitiesStaySuppressed,
        };
      });

      expect(motion.initialInlineTransform).toBe("");
      expect(motion.reopenedX).toBeLessThan(motion.closedX - 1);
      expect(motion.reversedFinalX).toBeGreaterThanOrEqual(motion.closedX - 1);
      expect(motion.openingX).toBeLessThan(motion.closedX - 1);
      expect(motion.openingX).toBeGreaterThanOrEqual(motion.openX - 0.5);
      expect(motion.closingX).toBeGreaterThan(motion.openX);
      expect(motion.closedFinalX).toBeGreaterThanOrEqual(motion.closedX - 1);
      expect(motion.utilitiesStaySuppressed).toBe(true);
      expect(motion.bodyOverflow).not.toContain("hidden");
    });

    test("uses a static drawer under reduced motion and cleans up across the breakpoint", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
      const header = await waitForThemeController(page);
      const trigger = header.getByRole("button", { name: "Otevřít menu" });

      await trigger.click();
      const panel = page.getByRole("dialog", { name: "Kam chcete pokračovat?" });
      await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(header.getByRole("navigation", { name: "Hlavní navigace" }))
        .not.toHaveAttribute("data-menu-open", "true");
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      await expect(header.locator('[data-analytics-placement="header"] [data-cta-label]'))
        .not.toHaveCSS("display", "none");
      await expect(page.locator("#public-site-navigation-panel")).toBeVisible();
    });

    test("keeps the phone-landscape drawer composed without overlapping its navigation", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
      const header = await waitForThemeController(page);
      const headerAction = header.locator("[data-header-overview]");

      await expect(headerAction).toBeVisible();
      await expect(headerAction).toHaveAccessibleName("Získat přehled");
      await expect(headerAction.locator("[data-cta-label]")).toBeVisible();
      await header.getByRole("button", { name: "Otevřít menu" }).click();

      const panel = page.getByRole("dialog", { name: "Kam chcete pokračovat?" });
      const title = panel.getByRole("heading", { name: "Kam chcete pokračovat?" });
      const links = panel.locator("[data-navigation-drawer-link]");
      const [panelBox, titleBox, firstLinkBox, lastLinkBox] = await Promise.all([
        panel.boundingBox(),
        title.boundingBox(),
        links.first().boundingBox(),
        links.last().boundingBox(),
      ]);

      expect(panelBox).not.toBeNull();
      expect(titleBox).not.toBeNull();
      expect(firstLinkBox).not.toBeNull();
      expect(lastLinkBox).not.toBeNull();
      expect((titleBox?.y ?? 0) + (titleBox?.height ?? 0)).toBeLessThanOrEqual(
        firstLinkBox?.y ?? 0,
      );
      expect(
        (lastLinkBox?.y ?? 0) + (lastLinkBox?.height ?? 0),
      ).toBeLessThanOrEqual(
        (panelBox?.y ?? 0) + (panelBox?.height ?? 0),
      );
      expect(
        await panel.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      const overviewAction = panel.locator("[data-navigation-drawer-overview]");
      await overviewAction.scrollIntoViewIfNeeded();
      await expect(overviewAction).toBeInViewport();
      await overviewAction.click();
      await expect(page).toHaveURL((url) => (
        url.pathname === "/ziskat-prehled/"
        && url.searchParams.get("source") === "header"
        && url.searchParams.get("cta") === "header-primary"
      ));
      await expect(page.getByRole("heading", { level: 1, name: "Vyberte oblast" }))
        .toBeVisible();
    });

  });

  test("exposes a non-pill active route and removes theme tweening for reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
    const header = await waitForThemeController(page);
    const currentLink = header.getByRole("link", { name: "Služby" });

    await expect(currentLink).toHaveAttribute("aria-current", "page");
    await expect(currentLink).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    expect(
      await currentLink.evaluate(
        (link) => getComputedStyle(link, "::after").opacity,
      ),
    ).toBe("1");
    await expect(header).toHaveCSS("transition-duration", "0s");
  });
});
