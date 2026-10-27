import { expect, test, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-05-05-ga4-v1";

const publicRoutes = [
  "/",
  "/sluzby/",
  "/jak-pracuji/",
  "/kdo-jsem/",
  "/reference/",
  "/osvedceni-a-certifikace/",
  "/clanky/",
  "/pravni-informace/",
  "/zasady-zpracovani-osobnich-udaju/",
  "/cookies-a-mereni/",
] as const;

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

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((scrollTop) => {
    const win = window as Window & {
      __lenis?: {
        scrollTo?: (
          target: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    };

    if (win.__lenis?.scrollTo) {
      win.__lenis.scrollTo(scrollTop, { force: true, immediate: true });
      return;
    }

    window.scrollTo(0, scrollTop);
  }, top);
}

async function waitForNavigationMotion(
  page: Page,
  expectedState: "hidden" | "visible" = "visible",
) {
  const header = page.locator(
    '[data-component="site-header"][data-scroll-navigation]:not([data-header-instance="hero"])',
  );
  await expect(
    header.locator('[data-header-scroll-controller][data-state="ready"]'),
  ).toHaveCount(1);
  await expect(header).toHaveAttribute("data-scroll-state", expectedState);
  return header;
}

async function dismissHomepageIntro(page: Page) {
  await expect
    .poll(async () => {
      await page.keyboard.press("Escape");
      return page.locator("[data-home-intro]").evaluate(
        (element) => getComputedStyle(element).display === "none",
      );
    })
    .toBe(true);
}

test.describe("public navigation scroll direction", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  test("uses one directional navigation contract on every public route", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    for (const route of publicRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const header = await waitForNavigationMotion(
        page,
        route === "/" ? "hidden" : "visible",
      );

      await expect(header).toHaveCount(1);
      await expect(
        header.locator('[data-component="site-navigation"]'),
      ).toHaveCount(1);
    }
  });

  for (const viewport of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ] as const) {
    for (const [route, heroSelector] of [
      ["/sluzby/", "[data-services-hero]"],
      ["/jak-pracuji/", "[data-process-hero]"],
      ["/kdo-jsem/", "[data-about-hero-chapter]"],
      ["/reference/", "[data-reference-hero]"],
    ] as const) {
      test(`hides down and reveals up on ${route} on ${viewport.label}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const header = await waitForNavigationMotion(page);
        const overviewAction = header.locator("[data-header-overview]");

        await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(header).toHaveCSS("backdrop-filter", "none");
        await expect(header).toHaveCSS("box-shadow", "none");
        await expect(overviewAction.locator("[data-cta-label]")).toBeVisible();
        await expect.poll(() => page.locator(heroSelector).evaluate((element) =>
          Math.round(element.getBoundingClientRect().top),
        )).toBe(0);
        const [headerBox, headingBox] = await Promise.all([
          header.boundingBox(),
          page.locator(heroSelector).getByRole("heading", { level: 1 }).boundingBox(),
        ]);
        expect(headerBox).not.toBeNull();
        expect(headingBox).not.toBeNull();
        expect(headingBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);

        await scrollImmediately(page, 48);
        await expect(header).toHaveAttribute("data-scroll-state", "visible");
        await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

        await scrollImmediately(page, 320);
        await expect(header).toHaveAttribute("data-scroll-state", "hidden");
        await expect(header).toHaveCSS("opacity", "0");
        expect((await header.boundingBox())?.y ?? 0).toBeLessThan(0);

        await scrollImmediately(page, 280);
        await expect(header).toHaveAttribute("data-scroll-state", "visible");
        await expect
          .poll(() =>
            header.evaluate((element) =>
              Math.round(element.getBoundingClientRect().top),
            ),
          )
          .toBe(0);
        await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(overviewAction.locator("[data-cta-label]")).toBeVisible();

        await scrollImmediately(page, 0);
        await expect(header).toHaveAttribute("data-scroll-state", "visible");
        await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(header).toHaveCSS("backdrop-filter", "none");
        expect(await page.evaluate(() => (
          document.documentElement.scrollWidth
            <= document.documentElement.clientWidth + 1
        ))).toBe(true);
      });
    }
  }

  for (const viewport of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`uses the composed homepage navigation motion on ${viewport.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissHomepageIntro(page);
      const header = await waitForNavigationMotion(page, "hidden");
      const heroHeader = page.locator('[data-header-instance="hero"]');

      await expect(
        header.locator(
          '[data-header-scroll-controller][data-hidden-within="[data-cinematic-home-hero]"]',
        ),
      ).toHaveCount(1);
      await expect(heroHeader).toHaveAttribute("data-nav-material", "hero-glass");
      await expect(heroHeader).not.toHaveAttribute("aria-hidden", "true");
      await expect(heroHeader).not.toHaveAttribute("inert", "");
      await expect(header).toHaveAttribute("aria-hidden", "true");
      await expect(header).toHaveAttribute("inert", "");
      await expect(header).toHaveCSS("opacity", "0");
      await expect(
        page.getByRole("navigation", { name: "Hlavní navigace" }),
      ).toHaveCount(1);
      await expect(
        heroHeader.locator('[aria-controls="hero-site-navigation-panel"]'),
      ).toHaveCount(1);
      await expect(
        header.locator('[aria-controls="public-site-navigation-panel"]'),
      ).toHaveCount(1);

      if (viewport.label === "mobile") {
        const heroNavigation = heroHeader.getByRole("navigation", {
          name: "Hlavní navigace",
        });
        const heroMenuTrigger = heroNavigation.getByRole("button", {
          name: "Otevřít menu",
        });
        await heroMenuTrigger.click();
        await expect(heroNavigation).toHaveAttribute("data-menu-open", "true");
        await expect(
          page.locator("#hero-site-navigation-panel"),
        ).toBeVisible();
        await expect(header).toHaveAttribute("aria-hidden", "true");
        await page.keyboard.press("Escape");
        await expect(heroNavigation).not.toHaveAttribute("data-menu-open", "true");
        await expect(heroMenuTrigger).toBeFocused();
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        });
      }

      const situationsTop = await page.locator('[data-home-module="situations"]')
        .evaluate(
          (element) => element.getBoundingClientRect().top + window.scrollY,
      );
      await scrollImmediately(page, situationsTop + 8);
      await expect(header).toHaveAttribute("data-nav-material", "default");
      await expect(heroHeader).toHaveAttribute("aria-hidden", "true");
      await expect(heroHeader).toHaveAttribute("inert", "");
      await expect(header).not.toHaveAttribute("aria-hidden", "true");
      await expect(header).not.toHaveAttribute("inert", "");
      await expect(header).toHaveAttribute("data-scroll-state", "hidden");
      await scrollImmediately(page, situationsTop + 8);
      await expect
        .poll(() => page.evaluate(() => Math.round(window.scrollY)))
        .toBe(Math.round(situationsTop + 8));

      const chapterEntryY = await page.evaluate(() => window.scrollY);
      await scrollImmediately(page, chapterEntryY - 40);
      await expect
        .poll(() => page.evaluate(() => Math.round(window.scrollY)))
        .toBe(Math.round(chapterEntryY - 40));
      await expect(header).toHaveAttribute("data-scroll-state", "visible");

      await scrollImmediately(page, chapterEntryY + 180);
      await expect
        .poll(() => page.evaluate(() => Math.round(window.scrollY)))
        .toBe(Math.round(chapterEntryY + 180));
      await expect(header).toHaveAttribute("data-scroll-state", "hidden");
      await expect(header).toHaveCSS("opacity", "0");

      await scrollImmediately(page, 0);
      await expect(heroHeader).not.toHaveAttribute("aria-hidden", "true");
      await expect(heroHeader).not.toHaveAttribute("inert", "");
      await expect(header).toHaveAttribute("aria-hidden", "true");
      await expect(header).toHaveAttribute("inert", "");
      await expect(header).toHaveAttribute("data-scroll-state", "hidden");
      await expect(header).toHaveCSS("opacity", "0");
    });
  }

  test("keeps one mobile navigation hidden while scrolling down across the hero handoff", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 716 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissHomepageIntro(page);

    const header = await waitForNavigationMotion(page, "hidden");
    const hero = page.locator("[data-cinematic-home-hero]");
    const heroHeader = page.locator('[data-header-instance="hero"]');
    const heroHeight = await hero.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );
    const handoffY = heroHeight + 2;

    await expect(heroHeader).toHaveCSS("position", "absolute");

    await expect(
      heroHeader.locator('[data-header-scroll-controller][data-state="ready"]'),
    ).toHaveCount(1);
    const heroNavigation = heroHeader.locator(
      '[data-component="site-navigation"]',
    );
    const heroMenuTrigger = heroHeader.locator(
      '[aria-controls="hero-site-navigation-panel"]',
    );
    await heroMenuTrigger.click();
    await expect(heroNavigation).toHaveAttribute("data-menu-open", "true");
    await page
      .getByRole("dialog", { name: "Kam chcete pokračovat?" })
      .getByRole("button", { name: "Zavřít menu" })
      .click();
    await expect(heroNavigation).not.toHaveAttribute("data-menu-open", "true");
    await expect(heroMenuTrigger).toBeFocused();

    await scrollImmediately(page, Math.min(180, handoffY - 24));
    await expect(heroHeader).toHaveAttribute("data-scroll-state", "visible");
    await expect(heroHeader).toHaveCSS("opacity", "1");
    await expect.poll(() => heroHeader.evaluate((element) =>
      element.getBoundingClientRect().bottom,
    )).toBeLessThan(0);
    await expect(header).toHaveCSS("opacity", "0");

    await scrollImmediately(page, handoffY - 4);
    await expect(heroHeader).toHaveAttribute("data-navigation-owner", "hero");

    await scrollImmediately(page, handoffY);
    await expect(header).toHaveAttribute("data-navigation-owner", "dynamic");
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveAttribute("data-nav-theme", "light");
    await expect(header).toHaveCSS("opacity", "0");
    await expect
      .poll(() =>
        page.evaluate(() =>
          document
            .elementFromPoint(window.innerWidth / 2, 30)
            ?.closest<HTMLElement>('[data-component="site-header"]')
            ?.dataset.headerInstance,
        ),
      )
      .not.toBe("dynamic");

    await scrollImmediately(page, handoffY + 120);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");

    await scrollImmediately(page, handoffY + 96);
    await expect(header).toHaveAttribute("data-scroll-state", "visible");
    await expect(header).toHaveCSS("opacity", "1");
    await expect
      .poll(() =>
        header.evaluate((element) =>
          Math.round(element.getBoundingClientRect().top),
        ),
      )
      .toBe(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          document
            .elementFromPoint(window.innerWidth / 2, 30)
            ?.closest<HTMLElement>('[data-component="site-header"]')
            ?.dataset.headerInstance,
        ),
      )
      .toBe("dynamic");

    const overviewAction = header.locator("[data-header-overview]");
    await expect(overviewAction).toBeVisible();
    await expect(overviewAction).toHaveAccessibleName("Získat přehled");
    await expect(overviewAction.locator("[data-cta-label]")).toBeVisible();
    await expect(overviewAction.locator('[data-cta-icon="paper-plane"]')).toBeVisible();

    // The floating navigation yields as soon as any hero returns, even while
    // the hero's own navigation is still above the visible part of the page.
    await scrollImmediately(page, heroHeight - 1);
    await expect(header).toHaveAttribute("data-navigation-owner", "alternate");
    await expect(header).toHaveAttribute("inert", "");
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveCSS("opacity", "0");
    await expect(heroHeader).toHaveAttribute("data-navigation-owner", "hero");
    await expect.poll(() => hero.evaluate((element) =>
      element.getBoundingClientRect().bottom,
    )).toBeGreaterThan(0);
    await expect.poll(() => heroHeader.evaluate((element) =>
      element.getBoundingClientRect().bottom,
    )).toBeLessThan(0);

    await scrollImmediately(page, 0);
    await expect(heroHeader).toHaveAttribute("data-scroll-state", "visible");
    await expect.poll(() => heroHeader.evaluate((element) =>
      Math.round(element.getBoundingClientRect().top),
    )).toBe(0);
  });

  test("preserves an open mobile menu and focus when resizing back into the hero", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 716 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissHomepageIntro(page);
    const header = await waitForNavigationMotion(page, "hidden");
    const hero = page.locator("[data-cinematic-home-hero]");
    const heroHeader = page.locator('[data-header-instance="hero"]');
    const heroHeight = await hero.evaluate((element) =>
      element.getBoundingClientRect().height,
    );

    await scrollImmediately(page, heroHeight + 180);
    await expect(header).toHaveAttribute("data-navigation-owner", "dynamic");
    await scrollImmediately(page, heroHeight + 120);
    await expect(header).toHaveAttribute("data-scroll-state", "visible");
    const trigger = header.getByRole("button", { name: "Otevřít menu" });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Kam chcete pokračovat?" }))
      .toBeVisible();

    await page.setViewportSize({ width: 390, height: 1000 });
    await expect.poll(() => hero.evaluate((element) =>
      element.getBoundingClientRect().bottom,
    )).toBeGreaterThan(0);
    await expect(header).toHaveAttribute("data-navigation-owner", "dynamic");
    await expect(header).not.toHaveAttribute("inert", "");
    await expect(page.getByRole("dialog", { name: "Kam chcete pokračovat?" }))
      .toBeVisible();

    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(header).not.toHaveAttribute("inert", "");
    await hero.locator('[data-hero-actions] a').first().focus();
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveAttribute("inert", "");
    await expect(heroHeader).toHaveAttribute("data-navigation-owner", "hero");
    await expect(heroHeader).not.toHaveAttribute("inert", "");
  });

  test("keeps the desktop hero navigation stable for reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissHomepageIntro(page);
    const header = await waitForNavigationMotion(page, "hidden");
    const heroHeader = page.locator('[data-header-instance="hero"]');

    await scrollImmediately(page, 320);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveCSS("opacity", "0");
    await expect(heroHeader).not.toHaveAttribute("aria-hidden", "true");
    await expect(heroHeader).toHaveAttribute("data-scroll-state", "visible");
    await expect
      .poll(() =>
        heroHeader.evaluate((element) =>
          Math.round(element.getBoundingClientRect().top),
        ),
      )
      .toBe(0);
  });

  test("lets the profile handoff cover the hero-owned navigation before the next chapter", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissHomepageIntro(page);

    const header = await waitForNavigationMotion(page, "hidden");
    const hero = page.locator("[data-cinematic-home-hero]");
    const heroHeader = page.locator('[data-header-instance="hero"]');
    const handoff = page.locator("[data-hero-situation-reveal]");
    const profile = page.locator("[data-hero-transition-target]");

    expect(
      await heroHeader.evaluate((element) =>
        element.closest("[data-cinematic-home-hero]") !== null,
      ),
    ).toBe(true);
    await expect(heroHeader).toHaveCSS("position", "absolute");
    await expect(header).toHaveCSS("position", "fixed");

    await expect(handoff).toHaveAttribute("data-state", "ready");
    const heroHeight = await hero.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );
    await scrollImmediately(page, Math.round(heroHeight * 0.5));

    await expect(header).toHaveAttribute("aria-hidden", "true");
    await expect(heroHeader).not.toHaveAttribute("aria-hidden", "true");
    await expect(profile).toHaveCSS("clip-path", /circle/u);

    await scrollImmediately(page, heroHeight + 2);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveCSS("opacity", "0");
    await expect(header).not.toHaveAttribute("aria-hidden", "true");
    await expect(heroHeader).toHaveAttribute("aria-hidden", "true");

    await scrollImmediately(page, Math.round(heroHeight * 0.5));
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveAttribute("aria-hidden", "true");
    await expect(heroHeader).not.toHaveAttribute("aria-hidden", "true");
  });

  test("reveals the dynamic homepage navigation at the viewport edge with Lenis active", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "webdriver", {
        configurable: true,
        get: () => false,
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissHomepageIntro(page);
    await page.waitForFunction(() => Boolean(window.__lenis));

    const header = page.locator('[data-header-instance="dynamic"]');
    await expect(
      header.locator('[data-header-scroll-controller][data-state="ready"]'),
    ).toHaveCount(1);
    const situationsTop = await page.locator('[data-home-module="situations"]')
      .evaluate(
        (element) => element.getBoundingClientRect().top + window.scrollY,
      );

    await page.evaluate((top) => {
      window.__lenis?.scrollTo(top, { force: true, immediate: true });
    }, situationsTop - 420);
    await page.waitForTimeout(600);
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(900);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveCSS("opacity", "0");
    await page.mouse.wheel(0, -160);

    await expect(header).toHaveAttribute("data-scroll-state", "visible");
    await expect(header).toHaveCSS("opacity", "1");
    await expect
      .poll(() =>
        header.evaluate((element) =>
          Math.round(element.getBoundingClientRect().top),
        ),
      )
      .toBe(0);
  });

  test("keeps navigation stable through the natural reference reveal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const references = page.locator("[data-reference-carousel]");
    const readerStage = page.locator("[data-reference-reader-stage]");

    await references.waitFor();
    await expect
      .poll(async () => {
        await page.keyboard.press("Escape");
        return page
          .locator("[data-home-intro]")
          .evaluate(
            (element) => getComputedStyle(element).display === "none",
          );
      })
      .toBe(true);

    const header = await waitForNavigationMotion(page, "hidden");
    await expect(references).toHaveAttribute(
      "data-motion",
      "natural-editorial",
    );
    await expect(references).toHaveAttribute(
      "data-scroll-control",
      "natural",
    );
    expect(
      await readerStage.evaluate(
        (element) =>
          element.parentElement?.classList.contains("pin-spacer") ?? false,
      ),
    ).toBe(false);

    const sectionTop = await readerStage.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    await scrollImmediately(page, sectionTop + 4);
    await expect(references).toHaveAttribute("data-scene-active", "false");
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveCSS("opacity", "0");

    const beforeWheel = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 820);
    await expect.poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(beforeWheel + 40);
    await expect(references).toHaveAttribute("data-active-index", /^[0-4]$/u);
    await expect(references).toHaveAttribute("data-scene-active", "false");
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveCSS("opacity", "0");
  });

  test("keeps the mobile navigation visible while its menu is open", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
    const header = await waitForNavigationMotion(page);
    const navigation = header.getByRole("navigation", {
      name: "Hlavní navigace",
    });
    const trigger = navigation.getByRole("button", { name: "Otevřít menu" });
    const overviewAction = header.locator("[data-header-overview]");

    await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await overviewAction.focus();
    await expect(overviewAction).toBeFocused();
    await trigger.click();
    await expect(navigation).toHaveAttribute("data-menu-open", "true");
    await page.keyboard.press("Escape");
    await expect(navigation).not.toHaveAttribute("data-menu-open", "true");
    await expect(trigger).toBeFocused();
    await expect(overviewAction.locator("[data-cta-label]")).toBeVisible();
    await page.locator("[data-services-hero] h1").click();

    await scrollImmediately(page, 320);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await scrollImmediately(page, 280);
    await expect(header).toHaveAttribute("data-scroll-state", "visible");

    await trigger.click();
    await expect(navigation).toHaveAttribute("data-menu-open", "true");
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    const beforeWheel = await page.evaluate(() => window.scrollY);

    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeWheel);
    await expect(header).toHaveAttribute("data-scroll-state", "visible");

    await page.keyboard.press("Escape");
    await expect(navigation).not.toHaveAttribute("data-menu-open", "true");
    await expect(trigger).toBeFocused();
  });

  test("switches states without tweening for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
    const header = await waitForNavigationMotion(page);

    await scrollImmediately(page, 320);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expect(header).toHaveCSS("opacity", "0");

    await scrollImmediately(page, 280);
    await expect(header).toHaveAttribute("data-scroll-state", "visible");
    await expect(header).toHaveCSS("opacity", "1");
  });
});
