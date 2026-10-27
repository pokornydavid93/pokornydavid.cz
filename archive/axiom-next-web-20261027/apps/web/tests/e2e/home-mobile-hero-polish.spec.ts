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

test.describe("homepage mobile hero polish", () => {
  test("opens the overview form from the labeled mobile action in public headers", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/", "/sluzby/"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.keyboard.press("Escape");

      const header = route === "/"
        ? page.locator('[data-cinematic-home-hero] [data-header-instance="hero"]')
        : page.locator('[data-component="site-header"]').first();
      const headerAction = header.locator("[data-header-overview]");
      const actionLabel = headerAction.locator("[data-cta-label]");
      const iconMotion = headerAction.locator("[data-cta-icon-motion]");

      await expect(headerAction).toBeVisible();
      await expect(actionLabel).toBeVisible();
      await expect(actionLabel).toHaveText("Získat přehled");
      await expect(headerAction).toHaveAccessibleName("Získat přehled");
      await expect(headerAction).toHaveAttribute(
        "href", "/ziskat-prehled/?source=header&cta=header-primary",
      );
      await expect(headerAction).toHaveAttribute(
        "data-analytics-event", "home_primary_cta_click",
      );
      await expect(headerAction).toHaveAttribute("data-analytics-placement", "header");
      await expect(headerAction).not.toHaveAttribute("data-analytics-channel", /.+/u);
      await expect(headerAction.locator('[data-cta-icon="paper-plane"]')).toBeVisible();
      await expect(headerAction.locator('[data-cta-icon="phone"]')).toHaveCount(0);
      await expect(iconMotion).toHaveCSS("animation-name", "none");

      if (route === "/") {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(iconMotion).toHaveCSS("animation-name", "none");
        await page.setViewportSize({ width: 768, height: 900 });
        await expect(headerAction).toBeVisible();
        await expect(actionLabel).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
      }

      await headerAction.click();
      await expect(page).toHaveURL((url) => (
        url.pathname === "/ziskat-prehled/"
        && url.searchParams.get("source") === "header"
        && url.searchParams.get("cta") === "header-primary"
      ));
      await expect(page.locator('form[data-overview-interactive="true"]')).toBeAttached();
      await expect(page.getByRole("heading", { level: 1, name: "Vyberte oblast" }))
        .toBeVisible();
      await expect(page.getByRole("radio", {
        name: "Chci se zorientovat ve svých financích", exact: true,
      })).toBeVisible();
    }
  });

  test("keeps phone landscape on the clean Silk composition", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hero = page.locator("[data-cinematic-home-hero]");
    const header = hero.locator('[data-header-instance="hero"]');
    const heading = hero.getByRole("heading", { level: 1 });

    await expect(hero.locator("[data-hero-portrait]")).toHaveCSS(
      "display",
      "none",
    );
    await expect(header.locator("[data-header-overview]")).toBeVisible();
    await expect(header.locator("[data-header-overview] [data-cta-label]")).toBeVisible();
    await expect(hero.locator("[data-hero-heading-emphasis]")).toHaveText(
      "finanční rozhodnutí",
    );

    const [headerBox, headingBox] = await Promise.all([
      header.boundingBox(),
      heading.boundingBox(),
    ]);
    expect(headerBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    expect(headingBox!.y).toBeGreaterThanOrEqual(
      headerBox!.y + headerBox!.height + 16,
    );
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
        <= document.documentElement.clientWidth + 1
    ))).toBe(true);
    expect(await page.evaluate(() => performance
      .getEntriesByType("resource")
      .some(({ name }) => (
        name.includes("who-home.avif") || name.includes("whov2-hero.avif")
      ))))
      .toBe(false);
  });

  test("keeps a short desktop hero clear of the fixed header with a reachable action", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1180, height: 520 });
    await page.goto("/", { waitUntil: "networkidle" });

    const hero = page.locator("[data-cinematic-home-hero]");
    const header = hero.locator('[data-header-instance="hero"]');
    const heading = hero.getByRole("heading", { level: 1 });
    const action = hero.locator('[data-analytics-placement="hero"]');
    await expect(header).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(action).toBeVisible();

    const geometry = await hero.evaluate((element) => {
      const headerElement = element.querySelector<HTMLElement>(
        '[data-header-instance="hero"]',
      )!;
      const headingElement = element.querySelector<HTMLElement>("h1")!;
      const actionElement = element.querySelector<HTMLElement>(
        '[data-analytics-placement="hero"]',
      )!;
      const headerRect = headerElement.getBoundingClientRect();
      const headingRect = headingElement.getBoundingClientRect();
      const actionRect = actionElement.getBoundingClientRect();
      const heroRect = element.getBoundingClientRect();

      return {
        actionInViewport: actionRect.top >= 0 && actionRect.bottom <= innerHeight,
        actionWithinHero: actionRect.bottom <= heroRect.bottom + 1,
        documentScrollable:
          document.documentElement.scrollHeight > innerHeight + 1,
        headerPosition: getComputedStyle(headerElement).position,
        headingClearance: headingRect.top - headerRect.bottom,
        horizontalOverflow:
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      };
    });

    expect(geometry.headerPosition).toBe("fixed");
    expect(geometry.headingClearance).toBeGreaterThanOrEqual(40);
    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(geometry.actionWithinHero).toBe(true);
    if (!geometry.actionInViewport) {
      expect(geometry.documentScrollable).toBe(true);
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeInViewport();
    }
  });

  test("keeps the simplified hero message aligned across viewports", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    for (const viewport of [
      { width: 1920, height: 1080, leadLines: 1 },
      { width: 1440, height: 900, leadLines: 1 },
      { width: 1280, height: 720, leadLines: 1 },
      { width: 1024, height: 768, leadLines: 1 },
      { width: 768, height: 900, leadLines: 2 },
      { width: 515, height: 682, leadLines: 2 },
      { width: 390, height: 844, leadLines: 2 },
    ]) {
      await page.setViewportSize(viewport);

      const hero = page.locator("[data-cinematic-home-hero]");
      await expect(hero.locator("[data-hero-eyebrow]")).toHaveCount(0);
      await expect(hero.getByRole("list", { name: "Ověřené údaje" }))
        .toBeVisible();
      await expect(hero.getByRole("heading", {
        level: 1,
        name: "Nejhorší finanční rozhodnutí je to, kterému nerozumíte.",
      })).toBeVisible();
      await expect(hero.locator("[data-hero-heading-emphasis]")).toHaveText(
        "finanční rozhodnutí",
      );
      await expect(hero.locator("[data-hero-lead]")).toHaveText(
        "Pomůžu vám udělat si jasno dřív, než uděláte důležité rozhodnutí.",
      );
      if (
        viewport.width >= 768
        && ["cutout", "scene"].includes(
          await hero.getAttribute("data-hero-portrait-variant") ?? "",
        )
      ) {
        await expect.poll(() => hero.locator(
          "[data-hero-scene-foreground] img, [data-hero-portrait][data-portrait-variant=\"cutout\"] img",
        ).evaluate((image) => (image as HTMLImageElement).naturalWidth))
          .toBeGreaterThan(0);
      }

      const geometry = await hero.evaluate((heroElement, viewportWidth) => {
        const rect = (selector: string) => heroElement
          .querySelector<HTMLElement>(selector)!
          .getBoundingClientRect();
        const heroRect = heroElement.getBoundingClientRect();
        const copyRect = rect("[data-hero-copy]");
        const headingRect = rect("#home-hero-title");
        const leadRect = rect("[data-hero-lead]");
        const actionsRect = rect("[data-hero-actions]");
        const portraitRect = rect("[data-hero-portrait]");
        const portraitVariant = heroElement.getAttribute("data-hero-portrait-variant");
        const isCutoutPortrait = portraitVariant === "cutout" || portraitVariant === "scene";
        const portraitImage = heroElement.querySelector<HTMLImageElement>(
          portraitVariant === "scene"
            ? "[data-hero-scene-foreground] img"
            : "[data-hero-portrait] img",
        )!;
        const imageRect = portraitImage.getBoundingClientRect();
        const paintedImageWidth = isCutoutPortrait && viewportWidth >= 768
          ? Math.min(
            imageRect.width,
            imageRect.height * portraitImage.naturalWidth / portraitImage.naturalHeight,
          )
          : 0;
        // The cutout's head alpha begins near x=540/1254 of its square source.
        const paintedImageHeight = paintedImageWidth * portraitImage.naturalHeight / portraitImage.naturalWidth;
        const portraitHeadTop = imageRect.bottom - paintedImageHeight + paintedImageHeight * 21 / 1254;
        const portraitContentLeft = isCutoutPortrait
          ? imageRect.right - paintedImageWidth * 0.57
          : portraitRect.left + portraitRect.width * 0.48;
        const leadElement = heroElement.querySelector<HTMLElement>(
          "[data-hero-lead]",
        )!;
        const headingStyle = getComputedStyle(
          heroElement.querySelector<HTMLElement>("#home-hero-title")!,
        );
        const leadStyle = getComputedStyle(leadElement);
        const leadVeilStyle = getComputedStyle(leadElement, "::before");
        const leadRange = document.createRange();
        leadRange.selectNodeContents(leadElement);
        const headingLines = [...heroElement.querySelectorAll<HTMLElement>(
          "[data-hero-heading-line-inner]",
        )];
        const headingTextRects = headingLines.flatMap((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return [...range.getClientRects()];
        });
        const firstHeadingLine = headingTextRects[0];

        return {
          actionsAboveFold: actionsRect.bottom <= window.innerHeight + 1,
          actionsWithinHero: actionsRect.bottom <= heroRect.bottom + 1,
          documentScrollable: document.documentElement.scrollHeight > window.innerHeight + 1,
          copyCenterDelta: Math.abs(
            copyRect.top + copyRect.height / 2
              - (heroRect.top + heroRect.height / 2),
          ),
          copySitsAboveHeroCenter:
            copyRect.top + copyRect.height / 2
              <= heroRect.top + heroRect.height / 2,
          gazeAlignmentDelta: viewportWidth >= 768
            ? Math.abs(
              (firstHeadingLine.top + firstHeadingLine.bottom) / 2
                - (portraitRect.top + portraitRect.height * 0.32)
            )
            : 0,
          headingClearsPortrait: viewportWidth >= 768
            ? Math.max(...headingTextRects.map(({ right }) => right)) <= portraitContentLeft + 1
                // Scene tablet composition puts the person below the title.
                // Its parallax overscan must be tested in both dimensions.
                || (portraitVariant === "scene"
                  && Math.max(...headingTextRects.map(({ bottom }) => bottom)) <= portraitHeadTop - 24)
            : true,
          headingPortraitClearance: viewportWidth >= 768
            ? portraitContentLeft - Math.max(...headingTextRects.map(({ right }) => right))
            : null,
          headingFontWeight: headingStyle.fontWeight,
          headingLetterSpacing: headingStyle.letterSpacing,
          heroHeight: heroRect.height,
          leadColor: leadStyle.color,
          leadFontWeight: leadStyle.fontWeight,
          leadHasOpticalVeil: leadVeilStyle.backgroundImage !== "none",
          leadLineHeightRatio:
            Number.parseFloat(leadStyle.lineHeight)
              / Number.parseFloat(leadStyle.fontSize),
          leadLines: new Set(
            [...leadRange.getClientRects()].map(({ top }) => Math.round(top)),
          ).size,
          leftOffsets: [headingRect.left, leadRect.left, actionsRect.left],
          noOverflow:
            document.documentElement.scrollWidth
              <= document.documentElement.clientWidth + 1,
          supportGap: leadRect.top - headingRect.bottom,
          portraitVariant,
        };
      }, viewport.width);

      expect(geometry.actionsWithinHero).toBe(true);
      if (viewport.width <= 767 && !geometry.actionsAboveFold) {
        expect(geometry.documentScrollable).toBe(true);
        const action = hero.locator('[data-analytics-placement="hero"]');
        await action.scrollIntoViewIfNeeded();
        await expect(action).toBeInViewport();
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
        expect(geometry.actionsAboveFold).toBe(true);
      }
      if (viewport.width >= 1280) {
        expect(geometry.copyCenterDelta).toBeLessThanOrEqual(48);
        expect(geometry.copySitsAboveHeroCenter).toBe(true);
      }
      expect(geometry.gazeAlignmentDelta).toBeLessThanOrEqual(64);
      expect(geometry.headingClearsPortrait).toBe(true);
      expect(geometry.headingFontWeight).toBe("850");
      expect(Number.parseFloat(geometry.headingLetterSpacing)).toBeLessThan(0);
      // At tablet width the portrait sits below the heading, so their small
      // horizontal gap does not describe a visual collision.
      if (viewport.width >= 901
        && ["cutout", "scene"].includes(geometry.portraitVariant ?? "")) {
        expect(geometry.headingPortraitClearance ?? 0).toBeGreaterThanOrEqual(24);
      } else if (viewport.width >= 1280) {
        expect(geometry.headingPortraitClearance ?? 0).toBeGreaterThanOrEqual(48);
      }
      expect(geometry.heroHeight).toBeGreaterThanOrEqual(viewport.height - 1);
      expect(geometry.leadColor).toBe("rgba(243, 240, 230, 0.92)");
      expect(geometry.leadFontWeight).toBe("540");
      expect(geometry.leadHasOpticalVeil).toBe(false);
      expect(geometry.leadLineHeightRatio).toBeGreaterThanOrEqual(1.5);
      expect(geometry.leadLines).toBe(viewport.leadLines);
      expect(Math.max(...geometry.leftOffsets) - Math.min(...geometry.leftOffsets))
        .toBeLessThanOrEqual(1);
      expect(geometry.noOverflow).toBe(true);
      expect(geometry.supportGap).toBeGreaterThanOrEqual(16);
      expect(geometry.supportGap).toBeLessThanOrEqual(40);
    }
  });

  test("composes a full-viewport mobile silk scene without loading the portrait", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });

    for (const width of [375, 767]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const hero = page.locator("[data-cinematic-home-hero]");
      const portrait = hero.locator("[data-hero-portrait]");
      const silkHost = hero.locator("[data-hero-silk-host]");
      const silkBackdrop = silkHost.locator("[data-silk-backdrop]");

      await hero.evaluate((element) => {
        element.setAttribute("data-hero-effects-prewarm", "true");
        window.dispatchEvent(new CustomEvent("home:hero-effects-prewarm"));
      });
      await page.keyboard.press("Escape");
      await expect(hero).toHaveAttribute("data-hero-effects-mode", "webgl", {
        timeout: 15_000,
      });
      await page.waitForFunction(() =>
        document.documentElement.dataset.homeIntroState === "complete"
      );
      await expect(portrait).toHaveCSS("display", "none");
      await expect(hero).toHaveAttribute("data-hero-silk-enabled", "true");
      await expect(hero).not.toHaveAttribute(
        "data-hero-portrait-warp-enabled",
        "true",
      );
      await expect(silkBackdrop).toHaveAttribute("data-state", "ready");
      await expect(hero.locator("[data-react-bits-silk]")).toHaveCount(1);
      await expect(silkBackdrop.locator("[data-react-bits-silk-canvas]"))
        .toBeVisible();
      await expect(hero.getByRole("list", { name: "Ověřené údaje" }))
        .toBeVisible();
      await expect(hero.locator("[data-hero-eyebrow]")).toHaveCount(0);
      expect(await page.evaluate(() => performance
        .getEntriesByType("resource")
        .some(({ name }) => (
          name.includes("who-home.avif") || name.includes("whov2-hero.avif")
        ))))
        .toBe(false);

      const geometry = await hero.evaluate((heroElement) => {
        const heroRect = heroElement.getBoundingClientRect();
        const frameRect = heroElement.querySelector<HTMLElement>(
          "[data-home-container-frame]",
        )!.getBoundingClientRect();
        const copy = heroElement.querySelector<HTMLElement>(
          "[data-hero-copy]",
        )!;
        const copyRect = copy.getBoundingClientRect();
        const headline = heroElement.querySelector<HTMLElement>(
          "#home-hero-title",
        )!;
        const headlineRect = headline.getBoundingClientRect();
        const lead = heroElement.querySelector<HTMLElement>(
          "[data-hero-lead]",
        )!;
        const actions = heroElement.querySelector<HTMLElement>(
          "[data-hero-actions]",
        )!;
        const actionsRect = actions.getBoundingClientRect();
        const portrait = heroElement.querySelector<HTMLElement>(
          "[data-hero-portrait]",
        )!;
        const silkRect = heroElement.querySelector<HTMLElement>(
          "[data-hero-silk-host]",
        )!.getBoundingClientRect();

        return {
          actionsFitCopy: actionsRect.width <= copyRect.width + 1,
          actionsWidth: actionsRect.width,
          copyAlignSelf: getComputedStyle(copy).alignSelf,
          copyClearsHeader: headlineRect.top > heroRect.top + 72,
          copyClearsHeroEnd: actionsRect.bottom < heroRect.bottom - 12,
          copyFillsFrame: Math.abs(copyRect.width - frameRect.width) <= 1,
          copyOffsetTop: headlineRect.top - heroRect.top,
          copyToHeroEnd: heroRect.bottom - actionsRect.bottom,
          headlineMaxWidth: getComputedStyle(headline).maxWidth,
          heroHeight: heroRect.height,
          heroViewportRatio: heroRect.height / window.innerHeight,
          leadWidth: lead.getBoundingClientRect().width,
          portraitDisplay: getComputedStyle(portrait).display,
          silkCoversBottom: silkRect.bottom >= heroRect.bottom - 1,
          silkCoversLeft: silkRect.left <= heroRect.left + 1,
          silkCoversRight: silkRect.right >= heroRect.right - 1,
          silkCoversTop: silkRect.top <= heroRect.top + 1,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        };
      });

      expect(geometry.actionsFitCopy).toBe(true);
      expect(geometry.actionsWidth).toBeGreaterThan(300);
      expect(geometry.copyAlignSelf).toBe("start");
      expect(geometry.copyClearsHeader).toBe(true);
      expect(geometry.copyClearsHeroEnd).toBe(true);
      expect(geometry.copyFillsFrame).toBe(true);
      expect(geometry.copyOffsetTop).toBeGreaterThan(104);
      expect(geometry.copyOffsetTop).toBeLessThan(160);
      expect(geometry.copyToHeroEnd).toBeGreaterThanOrEqual(16);
      expect(geometry.headlineMaxWidth).not.toMatch(/ch$/u);
      expect(geometry.heroHeight).toBeGreaterThanOrEqual(899);
      expect(geometry.heroViewportRatio).toBeGreaterThanOrEqual(899 / 900);
      expect(geometry.leadWidth).toBeGreaterThan(300);
      expect(geometry.portraitDisplay).toBe("none");
      expect(geometry.silkCoversBottom).toBe(true);
      expect(geometry.silkCoversLeft).toBe(true);
      expect(geometry.silkCoversRight).toBe(true);
      expect(geometry.silkCoversTop).toBe(true);
      expect(geometry.overflow).toBeLessThanOrEqual(0);
    }
  });

  test("keeps one dominant hero action with quiet context and proof", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 320, height: 704 },
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const hero = page.locator("[data-cinematic-home-hero]");
      const headerAction = hero.locator("[data-header-overview]");
      const heroAction = hero.locator('[data-analytics-placement="hero"]');
      const heroSecondary = hero.locator("[data-hero-secondary]");
      await expect(headerAction).toHaveAttribute("data-variant", "primary-action");
      await expect(headerAction.locator("[data-cta-label]")).toBeVisible();
      await expect(heroAction).toHaveAttribute("data-variant", "primary-action");
      await expect(heroSecondary).toHaveAttribute(
        "data-variant",
        "secondary-action",
      );
      await expect(heroSecondary).toHaveAttribute("data-cursor", "action");
      await expect(heroSecondary).toHaveAttribute("data-cursor-icon", "arrow");
      await expect(heroSecondary).toHaveText("Kdo jsem");
      await expect(heroSecondary).toHaveAttribute("href", "/kdo-jsem/");
      await expect(hero.locator("[data-hero-eyebrow]")).toHaveCount(0);
      await expect(page.locator("[data-profile-eyebrow]")).toHaveCount(0);
      const proof = hero.getByRole("list", { name: "Ověřené údaje" });
      await expect(proof).toBeVisible();
      const reviewProof = proof.getByRole("link", {
        name: "5,0 z 20 ověřených Google recenzí",
      });
      await expect(reviewProof).toHaveAttribute("href", "/reference/");
      await expect(reviewProof).toContainText("5,0/ 20 recenzí");
      await expect(hero.locator("[data-hero-client-bubble]")).toHaveCount(3);
      expect(await hero.locator("[data-hero-client-bubble]").evaluateAll(
        (items) => items.map((item) => ({
          id: item.getAttribute("data-client-id"),
          name: item.getAttribute("data-client-name"),
          photo: item.getAttribute("data-client-photo"),
        })),
      )).toEqual([
        {
          id: "denisa-reznickova",
          name: "Denisa Řezníčková",
          photo: "/images/testimonials/denisa-reznickova-avatar.webp",
        },
        {
          id: "stanislav-dvorak",
          name: "Stanislav Dvořák",
          photo: "/images/testimonials/stanislav-dvorak-avatar.webp",
        },
        {
          id: "pavla-kucerova",
          name: "Pavla Kučerová",
          photo: "/images/testimonials/pavla-kucerova-avatar.webp",
        },
      ]);
      await expect(hero.locator("[data-hero-client-photo]")).toHaveCount(3);
      await expect(hero.locator("[data-hero-rating-star]")).toHaveCount(5);

      const geometry = await hero.evaluate((element) => {
        const headerAction = element.querySelector<HTMLElement>(
          "[data-header-overview]",
        )!;
        const heroAction = element.querySelector<HTMLElement>(
          '[data-analytics-placement="hero"]',
        )!;
        const heroSecondary = element.querySelector<HTMLElement>(
          "[data-hero-secondary]",
        )!;
        const headerRect = headerAction.getBoundingClientRect();
        const heroRect = heroAction.getBoundingClientRect();
        const secondaryRect = heroSecondary.getBoundingClientRect();
        return {
          headerHeight: headerRect.height,
          headerWidth: headerRect.width,
          heroHeight: heroRect.height,
          heroRight: heroRect.right,
          heroTop: heroRect.top,
          secondaryHeight: secondaryRect.height,
          secondaryLeft: secondaryRect.left,
          secondaryTop: secondaryRect.top,
          secondaryWidth: secondaryRect.width,
          noOverflow:
            document.documentElement.scrollWidth
              <= document.documentElement.clientWidth + 1,
        };
      });

      expect(geometry.headerHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.headerWidth).toBeGreaterThanOrEqual(44);
      expect(geometry.heroHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.secondaryHeight).toBeGreaterThanOrEqual(48);
      expect(geometry.secondaryWidth).toBeGreaterThan(96);
      expect(geometry.secondaryWidth).toBeLessThan(180);
      expect(geometry.secondaryLeft).toBeGreaterThanOrEqual(
        geometry.heroRight + 7,
      );
      expect(Math.abs(geometry.secondaryTop - geometry.heroTop))
        .toBeLessThanOrEqual(1);
      expect(geometry.noOverflow).toBe(true);
    }

    const accessibility = await new AxeBuilder({ page })
      .include("[data-cinematic-home-hero]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("keeps the hero and profile in native mobile flow without a pinned handoff", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    const consentBanner = page.getByRole("region", {
      name: "Nastavení cookies",
    });
    if (await consentBanner.isVisible()) {
      await consentBanner.getByRole("button", {
        name: "Nesouhlasím",
        exact: true,
      }).click();
      await expect(consentBanner).toBeHidden();
    }

    const hero = page.locator("[data-cinematic-home-hero]");
    const profile = page.locator('[data-home-module="profile"]');
    const controller = page.locator("[data-hero-profile-handoff]");

    await expect(controller).toHaveAttribute("data-state", "natural-flow");
    await expect(profile).toHaveAttribute(
      "data-profile-handoff-mode",
      "natural-flow",
    );
    await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
    await expect(profile).toHaveCSS("clip-path", "none");
    await expect(profile).toHaveCSS("transform", "none");

    const initialFlow = await page.evaluate(() => {
      const heroElement = document.querySelector<HTMLElement>(
        "[data-cinematic-home-hero]",
      )!;
      const profileElement = document.querySelector<HTMLElement>(
        '[data-home-module="profile"]',
      )!;
      const profileHeading = profileElement.querySelector<HTMLElement>(
        "[data-profile-heading]",
      )!;
      const heroRect = heroElement.getBoundingClientRect();
      const profileRect = profileElement.getBoundingClientRect();
      const profileHeadingRect = profileHeading.getBoundingClientRect();

      return {
        gap: profileRect.top - heroRect.bottom,
        heroHeight: heroRect.height,
        profileHeadingGap: profileHeadingRect.top - profileRect.top,
      };
    });

    expect(Math.abs(initialFlow.gap)).toBeLessThanOrEqual(1);
    expect(initialFlow.profileHeadingGap).toBeGreaterThanOrEqual(40);
    expect(initialFlow.profileHeadingGap).toBeLessThanOrEqual(60);
    await page.evaluate((top) => window.scrollTo(0, top), initialFlow.heroHeight / 2);
    await expect(hero).not.toHaveCSS("position", "fixed");
    await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: 768, height: 900 });
    await expect(controller).toHaveAttribute("data-state", "natural-flow");
    await expect(hero.locator("[data-hero-trust]")).toHaveCount(0);
    await page.setViewportSize({ width: 1041, height: 900 });
    await expect(controller).toHaveAttribute("data-state", "ready");
    const boundaryCookieSettings = page.locator("[data-cookie-settings]");
    await expect(boundaryCookieSettings).not.toHaveAttribute(
      "data-home-hero-visible",
      /.+/u,
    );
    const boundaryCookieButton = boundaryCookieSettings.getByRole("button", {
      name: "Nastavení cookies",
    });
    await expect(boundaryCookieButton).toBeVisible();
    const [boundaryCookieBox, boundaryHeroBox, desktopViewportHeight] =
      await Promise.all([
      boundaryCookieButton.boundingBox(),
      hero.boundingBox(),
      page.evaluate(() => window.innerHeight),
    ]);
    expect(boundaryCookieBox).not.toBeNull();
    expect(boundaryHeroBox).not.toBeNull();
    expect(boundaryCookieBox!.width).toBeGreaterThanOrEqual(44);
    expect(boundaryCookieBox!.height).toBeGreaterThanOrEqual(44);
    expect(
      desktopViewportHeight - boundaryCookieBox!.y - boundaryCookieBox!.height,
    ).toBeGreaterThanOrEqual(19);
    expect(
      desktopViewportHeight - boundaryCookieBox!.y - boundaryCookieBox!.height,
    ).toBeLessThanOrEqual(21);
    expect(boundaryCookieBox!.y + boundaryCookieBox!.height)
      .toBeLessThanOrEqual(boundaryHeroBox!.y + boundaryHeroBox!.height - 12);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(controller).toHaveAttribute("data-state", "natural-flow");
    await expect(hero.locator("[data-hero-trust]")).toHaveCount(0);
    await expect(profile).toHaveCSS("clip-path", "none");
    await expect(profile).toHaveCSS("transform", "none");
    await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
    const mobileCookieBox = await boundaryCookieButton.boundingBox();
    expect(mobileCookieBox).not.toBeNull();
    expect(mobileCookieBox!.width).toBeGreaterThanOrEqual(44);
    expect(mobileCookieBox!.height).toBeGreaterThanOrEqual(44);
    expect(844 - mobileCookieBox!.y - mobileCookieBox!.height)
      .toBeGreaterThanOrEqual(11);
    expect(844 - mobileCookieBox!.y - mobileCookieBox!.height)
      .toBeLessThanOrEqual(13);
  });

  test("opens the Kdo jsem route from the hero on phone, tablet, and desktop", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 390, height: 716 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });

      const heroSecondary = page.locator("[data-hero-secondary]");
      await expect(heroSecondary).toBeVisible();
      await expect(heroSecondary).toHaveAttribute("href", "/kdo-jsem/");
      await heroSecondary.click();
      await expect(page).toHaveURL(/\/kdo-jsem\/$/u);
      await expect(page.getByRole("heading", {
        level: 1,
        name: "Nechci, abyste mi věřili. Chci, abyste mi rozuměli.",
      })).toBeVisible();
    }
  });

  test("keeps the portrait composition in the natural tablet flow", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const hero = page.locator("[data-cinematic-home-hero]");
    await expect(page.locator("[data-hero-profile-handoff]"))
      .toHaveAttribute("data-state", "natural-flow");
    await expect(hero.locator("[data-hero-portrait]")).not.toHaveCSS(
      "display",
      "none",
    );
    await expect(hero.locator("[data-hero-trust]")).toHaveCount(0);
  });
});
