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

async function scrollElementToViewportRatio(
  page: Page,
  selector: string,
  ratio: number,
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const delta = await page.evaluate(({ ratio: targetRatio, selector: targetSelector }) => {
      const element = document.querySelector<HTMLElement>(targetSelector);
      if (!element) throw new Error(`Missing cinematic target: ${targetSelector}`);

      return element.getBoundingClientRect().top - window.innerHeight * targetRatio;
    }, { ratio, selector });

    if (Math.abs(delta) <= 2) break;

    await page.evaluate((offset) => {
      const top = window.scrollY + offset;
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
      } else {
        window.scrollTo(0, top);
      }
    }, delta);
    await page.waitForTimeout(80);
  }
}

test.describe("homepage cinematic content flow", () => {
  test("stages the chapters from the origin scene through the final action", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const controller = page.locator("[data-home-cinematic-scroll]");
    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute("data-mode", "cinematic");
    await expect(page.locator('[data-home-module="situations"]')).toHaveAttribute(
      "data-cinematic-motion",
      "owned-scene",
    );
    await expect(page.locator('[data-home-module="process"]')).toHaveAttribute(
      "data-cinematic-motion",
      "owned-scene",
    );

    const checkpoints = [
      {
        ratio: 0.54,
        selector: '[data-home-module="profile"]',
        target: "[data-profile-portrait]",
        visibleOpacity: 0.45,
      },
      {
        ratio: 0.66,
        selector: "[data-evidence-intro]",
        target: "[data-evidence-intro] h2",
        visibleOpacity: 0.2,
      },
      {
        ratio: 0.62,
        selector: "#zacit",
        target: "#zacit h2",
        visibleOpacity: 0.2,
      },
    ] as const;

    for (const checkpoint of checkpoints) {
      await scrollElementToViewportRatio(page, checkpoint.selector, checkpoint.ratio);
      await expect.poll(async () => {
        const opacity = await page.locator(checkpoint.target).evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity));
        return opacity;
      }).toBeGreaterThan(checkpoint.visibleOpacity);
    }

    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )).toBeLessThanOrEqual(1);
  });

  test("keeps compact geometry stable and honors reduced motion", async ({ page }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    const controller = page.locator("[data-home-cinematic-scroll]");
    await expect(controller).toHaveAttribute("data-state", "reduced-motion");

    for (const selector of [
      '[data-home-module="profile"]',
      '[data-home-module="references"]',
      '[data-home-module="evidence"]',
      "#zacit",
    ]) {
      await expect(page.locator(selector)).toHaveAttribute(
        "data-cinematic-motion",
        "static",
      );
    }

    const profileFlow = await page.locator('[data-home-module="profile"]').evaluate(
      (section) => {
        const heading = section.querySelector<HTMLElement>(
          "[data-profile-heading]",
        )!.getBoundingClientRect();
        const trustElement = section.querySelector<HTMLElement>(
          "[data-profile-detail]",
        )!;
        const trust = trustElement.getBoundingClientRect();
        const statement = section.querySelector<HTMLElement>(
          "[data-profile-quote]",
        )!.getBoundingClientRect();
        const portrait = section.querySelector<HTMLElement>(
          "[data-profile-portrait]",
        )!.getBoundingClientRect();
        const narrative = section.querySelector<HTMLElement>(
          "[data-profile-narrative]",
        )!;
        const story = section.querySelector<HTMLElement>(
          '[data-profile-story="lead"]',
        )!;
        const introduction = section.querySelector<HTMLElement>(
          "[data-profile-introduction]",
        )!.getBoundingClientRect();
        const meta = section.querySelector<HTMLElement>("[data-profile-meta]")!;
        const aboutElement = section.querySelector<HTMLElement>(
          "[data-profile-about-link]",
        )!;
        const about = aboutElement.getBoundingClientRect();
        const image = section.querySelector<HTMLImageElement>(
          "[data-profile-portrait] img",
        )!;

        return {
          aboutBeforeTrust: about.bottom <= trust.top,
          headingBeforeIntroduction: heading.bottom < introduction.top,
          imageObjectFit: getComputedStyle(image).objectFit,
          introductionBeforeStatement: introduction.bottom < statement.top,
          metaInsideNarrative: meta.parentElement === narrative,
          trustBeforePortrait: trust.bottom <= portrait.top,
          portraitPosition: getComputedStyle(
            section.querySelector<HTMLElement>("[data-profile-portrait]")!,
          ).position,
          portraitWidthRatio:
            portrait.width / document.documentElement.clientWidth,
          statementBeforeAbout: statement.bottom < about.top,
          storyInsideNarrative: story.parentElement === narrative,
          trustInsideMeta: trustElement.parentElement === meta,
          aboutInsideMeta: aboutElement.parentElement === meta,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        };
      },
    );
    expect(profileFlow.headingBeforeIntroduction).toBe(true);
    expect(profileFlow.storyInsideNarrative).toBe(true);
    expect(profileFlow.metaInsideNarrative).toBe(true);
    expect(profileFlow.trustInsideMeta).toBe(true);
    expect(profileFlow.aboutInsideMeta).toBe(true);
    expect(profileFlow.introductionBeforeStatement).toBe(true);
    expect(profileFlow.statementBeforeAbout).toBe(true);
    expect(profileFlow.aboutBeforeTrust).toBe(true);
    expect(profileFlow.trustBeforePortrait).toBe(true);
    expect(profileFlow.portraitPosition).toBe("relative");
    expect(profileFlow.portraitWidthRatio).toBeGreaterThanOrEqual(0.8);
    expect(profileFlow.imageObjectFit).toBe("contain");
    expect(profileFlow.overflow).toBeLessThanOrEqual(1);
  });
});
