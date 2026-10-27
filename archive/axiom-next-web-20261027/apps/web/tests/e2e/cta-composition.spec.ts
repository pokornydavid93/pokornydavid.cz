import { expect, test, type Page } from "@playwright/test";

const HOMEPAGE_CTA_SELECTOR = [
  '[data-header-instance="hero"] [data-analytics-placement="header"]',
  '[data-analytics-placement="hero"]',
  "[data-process-cta]",
  '[data-analytics-placement="final"]',
].join(",");

async function primeRejectedConsent(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-05-05-ga4-v1",
    }));
  });
}

async function readCtaGeometry(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) => elements.map((element) => {
    const cta = element as HTMLElement;
    const label = cta.firstElementChild as HTMLElement | null;
    const shell = cta.querySelector<HTMLElement>("[data-cta-icon-shell]");
    const icon = shell?.querySelector<SVGElement>(
      '[data-cta-icon="paper-plane"]',
    );
    if (!label || !shell || !icon) throw new Error("Incomplete docked CTA markup.");

    const ctaRect = cta.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const ctaStyle = getComputedStyle(cta);
    const shellStyle = getComputedStyle(shell);

    const colorProbe = document.createElement("span");
    const tokenFamily = cta.dataset.variant === "secondary-action"
      ? "secondary"
      : "primary";
    colorProbe.style.cssText = [
      "position:absolute",
      "visibility:hidden",
      `background-color:var(--cta-${tokenFamily}-bg)`,
      `color:var(--cta-${tokenFamily}-text)`,
      `border:1px solid var(--cta-${tokenFamily}-border)`,
    ].join(";");
    cta.append(colorProbe);
    const probeStyle = getComputedStyle(colorProbe);
    const tokenColors = {
      background: probeStyle.backgroundColor,
      border: probeStyle.borderColor,
      text: probeStyle.color,
    };
    colorProbe.remove();

    return {
      background: ctaStyle.backgroundColor,
      backgroundImage: ctaStyle.backgroundImage,
      border: ctaStyle.borderColor,
      height: ctaRect.height,
      iconCenterDeltaX:
        ((iconRect.left + iconRect.right) - (shellRect.left + shellRect.right)) / 2,
      iconCenterDeltaY:
        ((iconRect.top + iconRect.bottom) - (shellRect.top + shellRect.bottom)) / 2,
      iconHeight: iconRect.height,
      iconWidth: iconRect.width,
      labelGap: shellRect.left - labelRect.right,
      labelInset: labelRect.left - ctaRect.left,
      placement:
        cta.dataset.analyticsPlacement
        ?? (cta.hasAttribute("data-process-cta") ? "process" : "unknown"),
      radius: ctaStyle.borderRadius,
      shellBottomInset: ctaRect.bottom - shellRect.bottom,
      shellHeight: shellRect.height,
      shellRadius: shellStyle.borderRadius,
      shellRightInset: ctaRect.right - shellRect.right,
      shellTopInset: shellRect.top - ctaRect.top,
      shellWidth: shellRect.width,
      text: ctaStyle.color,
      tokenColors,
      width: ctaRect.width,
    };
  }));
}

function expectReferenceComposition(
  geometries: Awaited<ReturnType<typeof readCtaGeometry>>,
) {
  for (const geometry of geometries) {
    expect(geometry.height).toBeCloseTo(52, 1);
    expect(geometry.radius).toBe("999px");
    expect(geometry.shellWidth).toBeGreaterThanOrEqual(40);
    expect(geometry.shellWidth).toBeLessThanOrEqual(42);
    expect(geometry.shellHeight).toBeGreaterThanOrEqual(40);
    expect(geometry.shellHeight).toBeLessThanOrEqual(42);
    expect(geometry.shellRadius).toBe("50%");
    expect(geometry.shellTopInset).toBeGreaterThanOrEqual(5);
    expect(geometry.shellTopInset).toBeLessThanOrEqual(6);
    expect(geometry.shellRightInset).toBeGreaterThanOrEqual(5);
    expect(geometry.shellRightInset).toBeLessThanOrEqual(6);
    expect(geometry.shellBottomInset).toBeGreaterThanOrEqual(5);
    expect(geometry.shellBottomInset).toBeLessThanOrEqual(6);
    expect(geometry.iconWidth).toBeCloseTo(18, 1);
    expect(geometry.iconHeight).toBeCloseTo(18, 1);
    expect(Math.abs(geometry.iconCenterDeltaX)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(geometry.iconCenterDeltaY)).toBeLessThanOrEqual(0.5);
    const compactMobileHero = geometry.placement === "hero"
      && geometry.shellWidth === 40;
    expect(geometry.labelInset).toBeGreaterThanOrEqual(
      compactMobileHero ? 13 : 19,
    );
    expect(geometry.labelInset).toBeLessThanOrEqual(22);
    expect(geometry.labelGap).toBeGreaterThanOrEqual(
      compactMobileHero ? 6 : 15,
    );
    expect(geometry.backgroundImage).toBe("none");
    expect(geometry.background).toBe(geometry.tokenColors.background);
    expect(geometry.border).toBe(geometry.tokenColors.border);
    expect(geometry.text).toBe(geometry.tokenColors.text);
  }
}

test.describe("docked conversion CTA composition", () => {
  test.beforeEach(async ({ page }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("uses the reference silhouette without stretching intrinsic actions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });

    const ctas = page.locator(HOMEPAGE_CTA_SELECTOR);
    await expect(ctas).toHaveCount(4);
    for (const cta of await ctas.all()) {
      await expect(cta).toHaveAttribute("data-cta-composition", "docked");
      await expect(cta.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);
      await expect(cta.locator(".lucide-arrow-right, .lucide-chevron-right"))
        .toHaveCount(0);
    }
    await expect(page.locator(
      '[data-header-instance="hero"] [data-analytics-placement="header"]',
    ))
      .toHaveAttribute("data-variant", "primary-action");
    await expect(page.locator('[data-analytics-placement="hero"]'))
      .toHaveAttribute("data-variant", "primary-action");
    for (const selector of [
      "[data-process-cta]",
      '[data-analytics-placement="final"]',
    ]) {
      await expect(page.locator(selector))
        .toHaveAttribute("data-variant", "primary-action");
    }

    const geometry = await readCtaGeometry(page, HOMEPAGE_CTA_SELECTOR);
    expectReferenceComposition(geometry);
    expect(geometry.find(({ placement }) => placement === "hero")?.width)
      .toBeLessThan(260);
    expect(new Set(geometry.map(({ width }) => Math.round(width))).size)
      .toBeGreaterThanOrEqual(3);
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
  });

  test("keeps conversion actions intrinsic on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    const geometry = await readCtaGeometry(page, HOMEPAGE_CTA_SELECTOR);
    expectReferenceComposition(
      geometry.filter(({ placement }) => placement !== "header"),
    );
    const header = geometry.find(({ placement }) => placement === "header");
    expect(header?.width).toBe(0);
    expect(header?.height).toBe(0);

    const hero = geometry.find(({ placement }) => placement === "hero");
    const process = geometry.find(({ placement }) => placement === "process");
    const final = geometry.find(({ placement }) => placement === "final");
    expect(hero?.width).toBeLessThan(260);
    expect(process?.width).toBeLessThan(260);
    expect(final?.width).toBeLessThan(260);
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
  });

  test("uses one route action-band silhouette across the public site", async ({
    page,
  }) => {
    const routes = [
      {
        href: "/ziskat-prehled/?source=services&cta=services-final",
        label: "Zjistit, čím začít",
        path: "/sluzby/",
      },
      {
        href: "/ziskat-prehled/?source=process&cta=process-final",
        label: "Zjistit, čím začít",
        path: "/jak-pracuji/",
      },
      {
        href: "/ziskat-prehled/?source=references&cta=references-final",
        label: "Probrat moji situaci",
        path: "/reference/",
      },
      {
        href: "/ziskat-prehled/?source=about&cta=about-final",
        label: "Zjistit, čím začít",
        path: "/kdo-jsem/",
      },
    ] as const;

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);

      for (const route of routes) {
        await page.goto(route.path, { waitUntil: "networkidle" });

        const actionBand = page.locator('[data-pattern="action-band"]').last();
        const action = actionBand.getByRole("link", { name: route.label });

        await expect(actionBand).toHaveAttribute("data-surface-role", "action");
        await expect(actionBand).toHaveAttribute("data-surface-tone", "action");
        await expect(action).toHaveAttribute("href", route.href);
        await expect(action).toHaveAttribute("data-cta-composition", "docked");
        await expect(action.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);

        const geometry = await readCtaGeometry(
          page,
          '[data-pattern="action-band"] a[data-cta-composition="docked"]',
        );
        expectReferenceComposition(geometry);
        expect(geometry).toHaveLength(1);
        if (viewport.width === 390) {
          expect(geometry[0]?.width).toBeGreaterThanOrEqual(190);
          expect(geometry[0]?.width).toBeLessThan(240);
        } else {
          expect(geometry[0]?.width).toBeCloseTo(240, 1);
        }

        expect(await page.evaluate(() => (
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth
        ))).toBeLessThanOrEqual(1);
      }
    }
  });

  test("matches the dark header CTA to the hero action and keeps the light treatment distinct", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const theme of ["signature", "verdant"]) {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.evaluate((selectedTheme) => {
        localStorage.setItem("dp.siteTheme.v2", selectedTheme);
      }, theme);
      await page.reload({ waitUntil: "networkidle" });

      const palette = await page.locator(
        '[data-analytics-placement="hero"]',
      ).evaluate((heroAction) => {
        const headerAction = document.querySelector<HTMLElement>(
          '[data-header-instance="hero"] [data-analytics-placement="header"]',
        )!;
        const readPalette = (action: Element) => {
          const shell = action.querySelector<HTMLElement>(
            "[data-cta-icon-shell]",
          )!;
          const actionStyle = getComputedStyle(action);
          const shellStyle = getComputedStyle(shell);
          return {
            body: actionStyle.backgroundColor,
            dock: shellStyle.backgroundColor,
            dockBorder: shellStyle.borderColor,
            icon: shellStyle.color,
            outerBorder: actionStyle.borderColor,
            shadow: actionStyle.boxShadow,
            text: actionStyle.color,
            dockShadow: shellStyle.boxShadow,
          };
        };
        const defaultProbe = document.createElement("span");
        defaultProbe.style.cssText = [
          "position:absolute",
          "visibility:hidden",
          "background-color:var(--cta-primary-bg-on-dark)",
          "color:var(--cta-primary-text-on-dark)",
          "border-style:solid",
          "border-width:1px",
          "border-top-color:var(--cta-primary-border-on-dark)",
          "border-right-color:var(--cta-docked-default-icon-bg)",
          "border-bottom-color:var(--cta-docked-default-icon-border)",
          "border-left-color:var(--cta-docked-default-icon-color)",
          "outline-color:var(--brand-lime)",
          "caret-color:var(--brand-forest)",
        ].join(";");
        const secondaryProbe = document.createElement("span");
        secondaryProbe.style.cssText = [
          "position:absolute",
          "visibility:hidden",
          "background-color:var(--cta-docked-secondary-bg)",
          "color:var(--cta-docked-secondary-text)",
          "border-style:solid",
          "border-width:1px",
          "border-top-color:var(--cta-docked-secondary-border)",
          "border-right-color:var(--cta-docked-secondary-icon-bg)",
          "border-bottom-color:var(--cta-docked-secondary-icon-border)",
          "border-left-color:var(--cta-docked-secondary-icon-color)",
        ].join(";");
        heroAction.append(defaultProbe, secondaryProbe);

        const defaultProbeStyle = getComputedStyle(defaultProbe);
        const secondaryProbeStyle = getComputedStyle(secondaryProbe);
        const result = {
          default: {
            body: defaultProbeStyle.backgroundColor,
            dock: defaultProbeStyle.borderRightColor,
            dockBorder: defaultProbeStyle.borderBottomColor,
            icon: defaultProbeStyle.borderLeftColor,
            outerBorder: defaultProbeStyle.borderTopColor,
            text: defaultProbeStyle.color,
            brandLime: defaultProbeStyle.outlineColor,
            brandForest: defaultProbeStyle.caretColor,
          },
          header: readPalette(headerAction),
          hero: readPalette(heroAction),
          secondary: {
            body: secondaryProbeStyle.backgroundColor,
            dock: secondaryProbeStyle.borderRightColor,
            dockBorder: secondaryProbeStyle.borderBottomColor,
            icon: secondaryProbeStyle.borderLeftColor,
            outerBorder: secondaryProbeStyle.borderTopColor,
            text: secondaryProbeStyle.color,
          },
        };
        defaultProbe.remove();
        secondaryProbe.remove();
        return result;
      });

      expect(palette.header.body).toBe(palette.hero.body);
      expect(palette.header.dock).toBe(palette.hero.dock);
      expect(palette.header.dockBorder).toBe(palette.hero.dockBorder);
      expect(palette.header.icon).toBe(palette.hero.icon);
      expect(palette.header.outerBorder).toBe(palette.hero.outerBorder);
      expect(palette.header.shadow).toBe(palette.hero.shadow);
      expect(palette.header.dockShadow).toBe(palette.hero.dockShadow);
      expect(palette.header.text).toBe(palette.hero.text);
      expect(palette.hero.body).toBe(palette.hero.icon);
      expect(palette.hero.outerBorder).toBe(palette.hero.body);
      expect(palette.hero.dockBorder).toBe(palette.hero.dock);
      expect(palette.hero.dock).not.toBe(palette.hero.body);
      expect(palette.secondary.body).toBe("rgb(2, 44, 18)");
      expect(palette.secondary.outerBorder).toBe(palette.secondary.dock);
      expect(palette.secondary.dockBorder).toBe(palette.secondary.dock);
      expect(palette.secondary.icon).toBe(palette.secondary.body);
      expect(palette.secondary.text).toBe(palette.secondary.dock);

      const headerAction = page.locator(
        '[data-header-instance="hero"] [data-analytics-placement="header"]',
      );
      await headerAction.hover();
      await expect(headerAction).not.toHaveCSS(
        "background-color",
        palette.header.body,
      );
      await expect(headerAction).toHaveCSS("color", palette.header.text);
      await page.mouse.move(0, 500);

      const siteHeader = page.locator('[data-header-instance="dynamic"]');
      const lightChapterTop = await page.locator(
        '[data-home-module="profile"]',
      ).evaluate((chapter) => chapter.getBoundingClientRect().top + window.scrollY);
      await page.evaluate((top) => {
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
      }, lightChapterTop + 8);
      await expect(siteHeader).toHaveAttribute("data-nav-theme", "light");
      const lightHeaderPalette = await page.locator(
        '[data-header-instance="dynamic"] [data-analytics-placement="header"]',
      ).evaluate((headerAction) => {
        const shell = headerAction.querySelector<HTMLElement>(
          "[data-cta-icon-shell]",
        )!;
        const actionStyle = getComputedStyle(headerAction);
        const shellStyle = getComputedStyle(shell);
        return {
          body: actionStyle.backgroundColor,
          dock: shellStyle.backgroundColor,
          dockBorder: shellStyle.borderColor,
          icon: shellStyle.color,
          outerBorder: actionStyle.borderColor,
          shadow: actionStyle.boxShadow,
          text: actionStyle.color,
          dockShadow: shellStyle.boxShadow,
        };
      });
      expect(lightHeaderPalette.outerBorder).not.toBe(lightHeaderPalette.icon);
      expect(lightHeaderPalette.body).not.toBe(lightHeaderPalette.icon);
      expect(lightHeaderPalette.dockBorder).not.toBe(lightHeaderPalette.dock);
      expect(lightHeaderPalette.dock).not.toBe(lightHeaderPalette.body);
      expect(lightHeaderPalette.dock).toBe(palette.default.brandLime);
      expect(lightHeaderPalette.icon).toBe(palette.default.brandForest);
      expect(lightHeaderPalette.body).not.toBe(palette.default.brandLime);
      expect(lightHeaderPalette.body).not.toBe(palette.header.body);
      expect(lightHeaderPalette.shadow).not.toBe("none");
      expect(lightHeaderPalette.dockShadow).not.toBe("none");
    }
  });

  test("uses the same dock inside the process video dialog", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("[data-process-video-trigger]").click();

    const dialogCta = page.locator("[data-process-video-cta]");
    await expect(dialogCta).toBeVisible();
    await expect(dialogCta.locator('[data-cta-icon="paper-plane"]'))
      .toHaveCount(1);
    expectReferenceComposition(await readCtaGeometry(
      page,
      "[data-process-video-cta]",
    ));
  });
});
