import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PROFILE_HEADING =
  "Nejdřív vy. Potom čísla. Teprve potom plán.";
const PROFILE_HEADING_LINES = [
  "Nejdřív vy.",
  "Potom čísla.",
  "Teprve potom plán.",
] as const;
const PROFILE_INTRODUCTION =
  "Jsem David Pokorný. Nejdřív chci pochopit, co je pro vás důležité. Pak vám ukážu souvislosti a možnosti, abyste se mohli rozhodnout sami.";
const PROFILE_STATEMENT = "Co funguje, nechávám být.";
const PROFILE_ABOUT_LINK = "Jak stavím finanční plán";

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

test.describe("homepage editorial profile", () => {
  test("renders the approved cutout-led story as a frameless accessible scene", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const profile = page.locator('[data-home-module="profile"]');
    const controller = page.locator("[data-hero-profile-handoff]");
    await profile.scrollIntoViewIfNeeded();

    await expect(profile).toHaveAttribute(
      "data-profile-motion-signature",
      "editorial-portrait",
    );
    await expect(profile).toHaveAttribute("data-surface-role", "paper");
    await expect(profile).toHaveAttribute("data-surface-tone", "light");
    await expect(controller).toHaveAttribute("data-state", "reduced-motion");
    await expect(profile).toHaveAttribute("data-profile-handoff-mode", "static");

    const heading = profile.locator("[data-profile-heading]");
    await expect(profile.getByRole("heading", {
      level: 2,
      name: PROFILE_HEADING,
    })).toBeVisible();
    await expect(heading).toHaveText(PROFILE_HEADING);
    await expect(heading.locator(":scope > br")).toHaveCount(0);
    expect(await profile.locator("[data-profile-title-line]").allTextContents())
      .toEqual([...PROFILE_HEADING_LINES]);
    await expect(profile.locator("[data-profile-title-line-ink]")).toHaveCount(3);
    await expect(profile.locator("[data-profile-eyebrow]"))
      .toHaveCount(0);
    for (const selector of [
      "[data-profile-narrative-rule]",
      "[data-profile-quote-rule]",
      "[data-profile-meta-rule]",
    ]) {
      await expect(profile.locator(selector)).toHaveCSS("display", "none");
    }
    await expect(profile.locator("[data-profile-introduction]"))
      .toHaveText(PROFILE_INTRODUCTION);
    await expect(profile.locator("[data-profile-approach]"))
      .toHaveCount(0);
    await expect(profile.locator("[data-profile-quote]"))
      .toHaveText(PROFILE_STATEMENT);
    await expect(profile.locator("[data-profile-quote-sentence]"))
      .toHaveCount(1);
    await expect(profile.locator('[data-profile-story="context"]')).toHaveCount(0);

    const portraitFrame = profile.locator("[data-profile-portrait-frame]");
    const portraitImage = portraitFrame.locator("img");
    await expect(portraitImage).toHaveAttribute(
      "alt",
      "David Pokorný, finanční poradce",
    );
    await expect(portraitImage).toHaveAttribute(
      "src",
      /(?:\/|%2F)david-profile-cutout\.webp/u,
    );
    await expect(portraitImage).toHaveAttribute("width", "700");
    await expect(portraitImage).toHaveAttribute("height", "1096");
    await expect(portraitImage).toHaveAttribute("loading", "lazy");
    expect(await page.evaluate(async () => {
      const image = new Image();
      image.src = "/david-profile-cutout.webp";
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    })).toEqual([700, 1096]);

    const registry = profile.locator("[data-profile-registry-link]");
    await expect(profile).not.toContainText("Vázaný zástupce SAB servis s.r.o.");
    await expect(registry).toContainText("Ověřit v registru ČNB");
    await expect(registry).toHaveAttribute("href", /jerrs\.cnb\.cz/u);
    await expect(registry).toHaveAttribute("target", "_blank");
    await expect(registry).toHaveAttribute("rel", "noopener noreferrer");

    const aboutLink = profile.locator("[data-profile-about-link]");
    await expect(aboutLink).toHaveAttribute("href", "/kdo-jsem/");
    await expect(aboutLink).toContainText(PROFILE_ABOUT_LINK);
    await expect(aboutLink).toHaveAttribute("data-variant", "primary-action");
    await expect(aboutLink).toHaveAttribute("data-cta-composition", "docked");
    await expect(aboutLink).toHaveAttribute("data-cursor", "action");
    await expect(aboutLink).toHaveAttribute("data-cursor-icon", "send");
    await expect(aboutLink.locator(":scope > [data-cta-label]"))
      .toHaveText(PROFILE_ABOUT_LINK);
    await expect(aboutLink.locator(
      ":scope > [data-cta-icon-shell][data-profile-about-icon]"
        + " > [data-cta-icon-motion] > [data-cta-icon=\"arrow-right\"]",
    )).toHaveCount(1);
    await expect(profile).not.toHaveAttribute("data-cursor-rest");
    expect(await profile.locator("[data-profile-narrative]").evaluate((narrative) => {
      const story = narrative.querySelector("[data-profile-story]");
      const quote = narrative.querySelector("[data-profile-quote]");
      const meta = narrative.querySelector("[data-profile-meta]");
      const trust = meta?.querySelector("[data-profile-detail]");
      const about = meta?.querySelector("[data-profile-about-link]");

      return story?.parentElement === narrative
        && quote?.parentElement === narrative
        && meta?.parentElement === narrative
        && trust?.parentElement === meta
        && about?.parentElement === meta;
    })).toBe(true);
    await expect(profile.locator("[data-profile-card]")).toHaveCount(0);
    await expect(profile.locator('[data-component*="card" i]')).toHaveCount(0);

    const geometry = await profile.evaluate((section) => {
      const rect = (selector: string) => section.querySelector<HTMLElement>(selector)!
        .getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const headingRect = rect("[data-profile-heading]");
      const portraitRect = rect("[data-profile-portrait]");
      const frame = section.querySelector<HTMLElement>(
        "[data-profile-portrait-frame]",
      )!;
      const frameRect = frame.getBoundingClientRect();
      const frameStyle = getComputedStyle(frame);
      const portraitStyle = getComputedStyle(
        section.querySelector<HTMLElement>("[data-profile-portrait]")!,
      );
      const image = section.querySelector<HTMLImageElement>(
        "[data-profile-portrait] img",
      )!;
      const imageStyle = getComputedStyle(image);
      const accentLine = section.querySelector<HTMLElement>(
        '[data-profile-title-line-index="2"]',
      )!;
      const titleLines = Array.from(
        section.querySelectorAll<HTMLElement>("[data-profile-title-line]"),
      );
      const introduction = section.querySelector<HTMLElement>(
        "[data-profile-introduction]",
      )!;
      const storyRect = rect('[data-profile-story="lead"]');
      const quote = section.querySelector<HTMLElement>(
        "[data-profile-quote]",
      )!;
      const quoteStyle = getComputedStyle(quote);
      const trustRect = rect("[data-profile-detail]");
      const narrativeRect = rect("[data-profile-narrative]");
      const aboutRect = rect("[data-profile-about-link]");
      const [red, green, blue] = getComputedStyle(section).backgroundColor
        .match(/[\d.]+/gu)!
        .slice(0, 3)
        .map(Number);

      return {
        aboutBackground: getComputedStyle(
          section.querySelector<HTMLElement>("[data-profile-about-link]")!,
        ).backgroundColor,
        aboutHeight: aboutRect.height,
        aboutIsTextScale: aboutRect.width < narrativeRect.width,
        aboutStoryAlignment: Math.abs(aboutRect.left - storyRect.left),
        aboutQuoteGap: aboutRect.top - quote.getBoundingClientRect().bottom,
        frameBackground: frameStyle.backgroundColor,
        frameBorderRadius: frameStyle.borderRadius,
        frameBorderWidth: frameStyle.borderWidth,
        frameBoxShadow: frameStyle.boxShadow,
        frameOverflow: frameStyle.overflow,
        frameRatio: frameRect.width / frameRect.height,
        headingBeforeNarrative: headingRect.bottom < narrativeRect.top,
        headingAccentDecoration: getComputedStyle(accentLine, "::after").content,
        headlineClearsPortrait:
          Math.max(...titleLines.map((line) => line.getBoundingClientRect().right))
          <= portraitRect.left + 1,
        titleLinesStaySingleLine: titleLines.every((line) => {
          const lineRect = line.getBoundingClientRect();
          const lineHeight = Number.parseFloat(getComputedStyle(line).lineHeight);

          return lineRect.height <= lineHeight + 1;
        }),
        imageFilter: imageStyle.filter,
        imageObjectFit: imageStyle.objectFit,
        introductionFontSize: Number.parseFloat(
          getComputedStyle(introduction).fontSize,
        ),
        quoteFollowsStory: quote.getBoundingClientRect().top > storyRect.bottom,
        quoteStoryAlignment: Math.abs(quote.getBoundingClientRect().left - storyRect.left),
        overflow:
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
        portraitBottomOffset: sectionRect.bottom - portraitRect.bottom,
        portraitCropRatio:
          (frameRect.bottom - portraitRect.bottom) / frameRect.height,
        portraitOnRight:
          portraitRect.left > sectionRect.left + sectionRect.width * 0.45,
        portraitOverflow: portraitStyle.overflow,
        portraitPosition: portraitStyle.position,
        portraitRatio: portraitRect.width / portraitRect.height,
        portraitRightOffset: sectionRect.right - portraitRect.right,
        portraitFalloffDisplay: getComputedStyle(frame, "::before").display,
        quoteBackground: quoteStyle.backgroundImage,
        quoteBorderInlineStart: Number.parseFloat(quoteStyle.borderLeftWidth),
        quoteBoxShadow: quoteStyle.boxShadow,
        trustInsideNarrative: trustRect.left >= narrativeRect.left - 1
          && trustRect.right <= narrativeRect.right + 1,
        sectionHeight: sectionRect.height,
        surfaceIsWarm: red > green && green > blue,
      };
    });

    expect(geometry.headingBeforeNarrative).toBe(true);
    expect(geometry.portraitOnRight).toBe(true);
    expect(geometry.portraitPosition).toBe("absolute");
    expect(Math.abs(geometry.portraitBottomOffset)).toBeLessThanOrEqual(1);
    expect(geometry.portraitCropRatio).toBeCloseTo((1096 - 910) / 1096, 2);
    expect(geometry.portraitOverflow).toBe("clip");
    expect(geometry.portraitRatio).toBeCloseTo(700 / 910, 2);
    expect(geometry.portraitRightOffset).toBeGreaterThanOrEqual(64);
    expect(geometry.portraitRightOffset).toBeLessThanOrEqual(160);
    expect(geometry.sectionHeight).toBeGreaterThanOrEqual(900);
    expect(geometry.frameRatio).toBeCloseTo(700 / 1096, 2);
    expect(geometry.frameBorderWidth).toBe("0px");
    expect(geometry.frameBorderRadius).toBe("0px");
    expect(geometry.frameBackground).toBe("rgba(0, 0, 0, 0)");
    expect(geometry.frameBoxShadow).toBe("none");
    expect(geometry.frameOverflow).toBe("visible");
    expect(geometry.imageObjectFit).toBe("contain");
    expect(geometry.imageFilter).toContain("drop-shadow");
    expect(geometry.headingAccentDecoration).toBe("none");
    expect(geometry.headlineClearsPortrait).toBe(true);
    expect(geometry.titleLinesStaySingleLine).toBe(true);
    expect(geometry.introductionFontSize).toBeGreaterThanOrEqual(17);
    expect(geometry.quoteFollowsStory).toBe(true);
    expect(geometry.quoteStoryAlignment).toBeLessThanOrEqual(1);
    expect(geometry.portraitFalloffDisplay).toBe("none");
    expect(geometry.quoteBorderInlineStart).toBe(0);
    expect(geometry.quoteBackground).toBe("none");
    expect(geometry.quoteBoxShadow).toBe("none");
    expect(geometry.aboutStoryAlignment).toBeLessThanOrEqual(1);
    expect(geometry.trustInsideNarrative).toBe(true);
    expect(geometry.aboutQuoteGap).toBeGreaterThanOrEqual(16);
    expect(geometry.aboutQuoteGap).toBeLessThanOrEqual(72);
    expect(geometry.aboutBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(geometry.aboutHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.aboutIsTextScale).toBe(true);
    expect(geometry.surfaceIsWarm).toBe(true);
    expect(geometry.overflow).toBeLessThanOrEqual(1);

    for (const selector of [
      "[data-profile-heading]",
      "[data-profile-portrait-frame]",
      '[data-profile-story="lead"]',
      "[data-profile-quote]",
      "[data-profile-detail]",
      "[data-profile-about-link]",
    ]) {
      await expect(profile.locator(selector)).toHaveCSS("opacity", "1");
    }
    await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);

    await aboutLink.focus();
    await expect(aboutLink).toHaveCSS("outline-style", "solid");
    await registry.focus();
    await expect(registry).toHaveCSS("outline-style", "solid");

    const accessibility = await new AxeBuilder({ page })
      .include('[data-home-module="profile"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("stacks the cutout through tablet and composes mobile in reading order", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/", { waitUntil: "networkidle" });

    const profile = page.locator('[data-home-module="profile"]');

    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 1040, height: 820 },
      { width: 1041, height: 820 },
      { width: 1180, height: 820 },
    ]) {
      await page.setViewportSize(viewport);
      await profile.scrollIntoViewIfNeeded();
      await page.waitForTimeout(40);

      const geometry = await profile.evaluate((section) => {
        const rect = (selector: string) => section.querySelector<HTMLElement>(selector)!
          .getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const heading = rect("[data-profile-heading]");
        const introduction = rect("[data-profile-introduction]");
        const portrait = rect("[data-profile-portrait]");
        const frame = rect("[data-profile-portrait-frame]");
        const narrative = rect("[data-profile-narrative]");
        const scene = rect("[data-profile-scene]");
        const portraitStyle = getComputedStyle(
          section.querySelector<HTMLElement>("[data-profile-portrait]")!,
        );

        return {
          frameRatio: frame.width / frame.height,
          headingBeforeNarrative: heading.bottom < narrative.top,
          headingIntroductionGap: introduction.top - heading.bottom,
          narrativeAvoidsPortrait: narrative.right <= portrait.left + 56,
          narrativeBeforePortrait: narrative.bottom <= portrait.top,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
          portraitBottomOffset: sectionRect.bottom - portrait.bottom,
          portraitCenterDelta: Math.abs(
            portrait.left + portrait.width / 2 - (scene.left + scene.width / 2),
          ),
          portraitCropRatio:
            (frame.bottom - portrait.bottom) / frame.height,
          portraitOnRight: portrait.left > sectionRect.left + sectionRect.width * 0.45,
          portraitOverflow: portraitStyle.overflow,
          portraitPosition: portraitStyle.position,
          portraitRatio: portrait.width / portrait.height,
          sectionHeight: sectionRect.height,
          sectionPosition: getComputedStyle(section).position,
        };
      });

      expect(geometry.headingBeforeNarrative).toBe(true);
      expect(
        geometry.headingIntroductionGap,
        `${viewport.width}x${viewport.height} heading-to-introduction gap`,
      ).toBeGreaterThanOrEqual(20);
      expect(geometry.headingIntroductionGap).toBeLessThanOrEqual(120);
      if (viewport.width <= 1040) {
        expect(geometry.narrativeBeforePortrait).toBe(true);
        expect(geometry.portraitPosition).toBe("relative");
        expect(geometry.portraitCenterDelta).toBeLessThanOrEqual(1);
        expect(geometry.sectionPosition).not.toMatch(/fixed|sticky/u);
      } else {
        expect(geometry.narrativeAvoidsPortrait).toBe(true);
        expect(geometry.portraitOnRight).toBe(true);
        expect(geometry.portraitPosition).toBe("absolute");
        expect(geometry.sectionHeight).toBeGreaterThanOrEqual(viewport.height);
      }
      expect(Math.abs(geometry.portraitBottomOffset)).toBeLessThanOrEqual(1);
      expect(geometry.portraitCropRatio).toBeCloseTo((1096 - 910) / 1096, 2);
      expect(geometry.portraitOverflow).toBe("clip");
      expect(geometry.portraitRatio).toBeCloseTo(700 / 910, 2);
      expect(geometry.frameRatio).toBeCloseTo(700 / 1096, 2);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
    }

    for (const viewport of [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      await page.setViewportSize(viewport);
      await profile.scrollIntoViewIfNeeded();
      await page.waitForTimeout(40);

      const geometry = await profile.evaluate((section) => {
        const rect = (selector: string) => section.querySelector<HTMLElement>(selector)!
          .getBoundingClientRect();
        const heading = rect("[data-profile-heading]");
        const portrait = rect("[data-profile-portrait]");
        const portraitElement = section.querySelector<HTMLElement>(
          "[data-profile-portrait]",
        )!;
        const portraitFrame = rect("[data-profile-portrait-frame]");
        const story = rect('[data-profile-story="lead"]');
        const statement = rect("[data-profile-quote]");
        const trust = rect("[data-profile-detail]");
        const about = rect("[data-profile-about-link]");
        const titleLines = Array.from(
          section.querySelectorAll<HTMLElement>("[data-profile-title-line]"),
        );
        const titleLineLefts = titleLines.map(
          (line) => line.getBoundingClientRect().left,
        );

        return {
          aboutBeforeTrust: about.bottom <= trust.top,
          headingBeforeStory: heading.bottom < story.top,
          storyBeforeStatement: story.bottom < statement.top,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
          trustBeforePortrait: trust.bottom <= portrait.top,
          portraitPosition: getComputedStyle(
            portraitElement,
          ).position,
          portraitOverflow: getComputedStyle(portraitElement).overflow,
          portraitRatio: portrait.width / portrait.height,
          visibleImageRatio: portrait.height / portraitFrame.height,
          portraitWidthRatio: portrait.width / document.documentElement.clientWidth,
          statementBeforeAbout: statement.bottom < about.top,
          titleLinesAligned:
            Math.max(...titleLineLefts) - Math.min(...titleLineLefts) <= 1,
          titleLinesStaySingleLine: titleLines.every((line) => {
            const lineRect = line.getBoundingClientRect();
            const lineHeight = Number.parseFloat(getComputedStyle(line).lineHeight);

            return lineRect.height <= lineHeight + 1;
          }),
        };
      });

      expect(geometry.headingBeforeStory).toBe(true);
      expect(geometry.storyBeforeStatement).toBe(true);
      expect(geometry.statementBeforeAbout).toBe(true);
      expect(geometry.titleLinesAligned).toBe(true);
      expect(geometry.titleLinesStaySingleLine).toBe(true);
      expect(geometry.aboutBeforeTrust).toBe(true);
      expect(geometry.trustBeforePortrait).toBe(true);
      expect(geometry.portraitPosition).toBe("relative");
      expect(geometry.portraitOverflow).toBe("clip");
      expect(geometry.portraitRatio).toBeCloseTo(700 / 910, 2);
      expect(geometry.visibleImageRatio).toBeCloseTo(910 / 1096, 2);
      expect(geometry.portraitWidthRatio).toBeGreaterThanOrEqual(0.8);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
    }

    await page.setViewportSize({ width: 844, height: 390 });
    await profile.scrollIntoViewIfNeeded();
    const landscape = await profile.evaluate((section) => {
      const sectionRect = section.getBoundingClientRect();
      const portrait = section.querySelector<HTMLElement>(
        "[data-profile-portrait]",
      )!;
      const portraitRect = portrait.getBoundingClientRect();
      const frameRect = section.querySelector<HTMLElement>(
        "[data-profile-portrait-frame]",
      )!.getBoundingClientRect();
      const narrativeRect = section.querySelector<HTMLElement>(
        "[data-profile-narrative]",
      )!.getBoundingClientRect();
      return {
        bottomOffset: sectionRect.bottom - portraitRect.bottom,
        cropRatio:
          (frameRect.bottom - portraitRect.bottom) / frameRect.height,
        frameRatio: frameRect.width / frameRect.height,
        narrativeBeforePortrait: narrativeRect.bottom <= portraitRect.top,
        overflow:
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
        position: getComputedStyle(portrait).position,
        portraitRatio: portraitRect.width / portraitRect.height,
        sectionPosition: getComputedStyle(section).position,
      };
    });
    expect(landscape.position).toBe("relative");
    expect(landscape.sectionPosition).not.toMatch(/fixed|sticky/u);
    expect(landscape.narrativeBeforePortrait).toBe(true);
    expect(Math.abs(landscape.bottomOffset)).toBeLessThanOrEqual(1);
    expect(landscape.cropRatio).toBeCloseTo((1096 - 910) / 1096, 2);
    expect(landscape.portraitRatio).toBeCloseTo(700 / 910, 2);
    expect(landscape.frameRatio).toBeCloseTo(700 / 1096, 2);
    expect(landscape.overflow).toBeLessThanOrEqual(1);
  });

  test("keeps the portrait and copy as one centered composition on short notebooks", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1530, height: 650 });
    await page.goto("/", { waitUntil: "networkidle" });

    const profile = page.locator('[data-home-module="profile"]');

    for (const viewport of [
      { width: 1530, height: 650 },
      { width: 1530, height: 720 },
      { width: 1530, height: 721 },
      { width: 1530, height: 800 },
      { width: 1530, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await profile.scrollIntoViewIfNeeded();

      const geometry = await profile.evaluate((section) => {
        const heading = section.querySelector<HTMLElement>(
          "[data-profile-heading]",
        )!.getBoundingClientRect();
        const introduction = section.querySelector<HTMLElement>(
          "[data-profile-introduction]",
        )!.getBoundingClientRect();
        const scene = section.querySelector<HTMLElement>(
          "[data-profile-scene]",
        )!.getBoundingClientRect();
        const layout = section.querySelector<HTMLElement>(
          "[data-profile-scene] > div",
        )!.getBoundingClientRect();
        const narrative = section.querySelector<HTMLElement>(
          "[data-profile-narrative]",
        )!.getBoundingClientRect();
        const portrait = section.querySelector<HTMLElement>(
          "[data-profile-portrait]",
        )!.getBoundingClientRect();
        const cta = section.querySelector<HTMLElement>(
          "[data-profile-about-link]",
        )!.getBoundingClientRect();

        return {
          headingIntroductionGap: introduction.top - heading.bottom,
          compositionCenterDelta: Math.abs(
            layout.left + layout.width / 2 - (scene.left + scene.width / 2),
          ),
          copyPortraitGap: portrait.left - narrative.right,
          ctaVisibleInViewport: cta.top >= 0 && cta.bottom <= window.innerHeight,
          layoutWidth: layout.width,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        };
      });

      expect(geometry.compositionCenterDelta).toBeLessThanOrEqual(1);
      expect(geometry.layoutWidth).toBeLessThanOrEqual(1152);
      expect(geometry.copyPortraitGap).toBeGreaterThanOrEqual(32);
      expect(geometry.ctaVisibleInViewport).toBe(true);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      if (viewport.height === 650) {
        expect(geometry.headingIntroductionGap).toBeGreaterThanOrEqual(20);
        expect(geometry.headingIntroductionGap).toBeLessThanOrEqual(100);
      }
    }
  });

  test("keeps the portrait close to the copy across desktop widths", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const profile = page.locator('[data-home-module="profile"]');

    for (const viewport of [
      { width: 1241, height: 900 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      await profile.scrollIntoViewIfNeeded();

      const geometry = await profile.evaluate((section) => {
        const portrait = section.querySelector<HTMLElement>(
          "[data-profile-portrait]",
        )!.getBoundingClientRect();
        const narrative = section.querySelector<HTMLElement>(
          "[data-profile-narrative]",
        )!.getBoundingClientRect();
        const headingRight = Math.max(...Array.from(
          section.querySelectorAll<HTMLElement>("[data-profile-title-line]"),
          (line) => line.getBoundingClientRect().right,
        ));

        return {
          copyPortraitGap: portrait.left - narrative.right,
          headingPortraitClearance: portrait.left - headingRight,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        };
      });

      expect(geometry.copyPortraitGap).toBeGreaterThanOrEqual(32);
      expect(
        geometry.copyPortraitGap,
        `${viewport.width}x${viewport.height} copy-to-portrait gap`,
      ).toBeLessThanOrEqual(viewport.width * 0.14);
      expect(geometry.headingPortraitClearance).toBeGreaterThanOrEqual(64);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
    }
  });

  test("keeps breathing room below the claim on wide shallow desktops", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1920, height: 768 });
    await page.goto("/", { waitUntil: "networkidle" });

    const profile = page.locator('[data-home-module="profile"]');

    for (const viewport of [
      { width: 1530, height: 721 },
      { width: 1600, height: 800 },
      { width: 1800, height: 800 },
      { width: 1800, height: 895 },
      { width: 1920, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await profile.scrollIntoViewIfNeeded();

      const geometry = await profile.evaluate((section) => {
        const heading = section.querySelector<HTMLElement>(
          "[data-profile-heading]",
        )!.getBoundingClientRect();
        const introduction = section.querySelector<HTMLElement>(
          "[data-profile-introduction]",
        )!.getBoundingClientRect();
        const layout = section.querySelector<HTMLElement>(
          "[data-profile-scene] > div",
        )!;

        return {
          gap: introduction.top - heading.bottom,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
          rowGap: Number.parseFloat(getComputedStyle(layout).rowGap),
          sectionHeight: section.getBoundingClientRect().height,
        };
      });

      expect(
        geometry.gap,
        `${viewport.width}x${viewport.height} heading-to-introduction gap`,
      ).toBeGreaterThanOrEqual(31);
      expect(geometry.gap).toBeLessThanOrEqual(100);
      expect(geometry.rowGap).toBeGreaterThanOrEqual(40);
      expect(geometry.sectionHeight).toBeGreaterThanOrEqual(viewport.height);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
    }
  });

  test("reveals cutout, heading and concise story through the cinematic handoff", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const controller = page.locator("[data-hero-profile-handoff]");
    const hero = page.locator("[data-cinematic-home-hero]");
    const profile = page.locator('[data-home-module="profile"]');
    const portrait = profile.locator("[data-profile-portrait-frame]");
    const heading = profile.locator("[data-profile-heading]");
    const firstHeadingInk = profile.locator(
      "[data-profile-title-line-ink]",
    ).first();
    const lead = profile.locator('[data-profile-story="lead"]');
    const statement = profile.locator("[data-profile-quote]");
    const trust = profile.locator("[data-profile-detail]");
    const about = profile.locator("[data-profile-about-link]");

    await expect(controller).toHaveAttribute("data-state", "ready");
    const heroHeight = await hero.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );

    await scrollImmediately(page, heroHeight * 0.24);
    await expect(portrait).toHaveCSS("opacity", "0");
    await expect(heading).toHaveCSS("opacity", "0");
    await expect(firstHeadingInk).toHaveCSS("opacity", "0");
    await expect(lead).toHaveCSS("opacity", "0");
    await expect(statement).toHaveCSS("opacity", "0");
    await expect(trust).toHaveCSS("opacity", "0");
    await expect(about).toHaveCSS("opacity", "0");
    expect(await portrait.evaluate((element) => {
      const transform = getComputedStyle(element).transform;
      return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
    })).toBeGreaterThan(0);

    await scrollImmediately(page, heroHeight * 0.42);
    await expect.poll(() => portrait.evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).opacity),
    )).toBeGreaterThan(0.35);
    await expect.poll(() => heading.evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).opacity),
    )).toBeGreaterThan(0.35);
    await expect.poll(() => firstHeadingInk.evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).opacity),
    )).toBeGreaterThan(0.35);
    await expect(lead).toHaveCSS("opacity", "0");

    await scrollImmediately(page, heroHeight * 0.72);
    await expect.poll(() => lead.evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).opacity),
    )).toBeGreaterThan(0.5);
    await expect(about).toHaveCSS("opacity", "0");

    await scrollImmediately(page, heroHeight);
    await expect(profile).toHaveAttribute(
      "data-profile-handoff-phase",
      "complete",
    );
    for (const element of [portrait, heading, lead, statement, trust, about]) {
      await expect(element).toHaveCSS("opacity", "1");
    }
    await expect(profile.locator("[data-profile-narrative-rule]"))
      .toHaveCSS("display", "none");
    expect(Math.abs(await portrait.evaluate((element) => {
      const transform = getComputedStyle(element).transform;
      return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
    }))).toBeLessThanOrEqual(0.5);

    await scrollImmediately(page, 0);
    await expect(heading).toHaveCSS("opacity", "0");
    await expect(firstHeadingInk).toHaveCSS("opacity", "0");
    await expect(portrait).toHaveCSS("opacity", "0");
  });
});
