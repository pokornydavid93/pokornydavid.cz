import { expect, test, type Page } from "@playwright/test";

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

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((target) => {
    const smoothWindow = window as Window & {
      __lenis?: {
        scrollTo?: (
          position: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    };

    if (smoothWindow.__lenis?.scrollTo) {
      smoothWindow.__lenis.scrollTo(target, {
        force: true,
        immediate: true,
      });
      return;
    }

    window.scrollTo(0, target);
  }, top);
}

async function openHomepage(page: Page) {
  await primeRejectedConsent(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
}

test.describe("homepage process scroll reveal", () => {
  test("reveals each editorial chapter and reverses it with scroll", async ({
    page,
  }) => {
    test.slow();
    test.setTimeout(120_000);
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);

    const process = page.locator('[data-home-module="process"]');
    const controller = process.locator("[data-process-reveal]");
    const steps = process.locator("[data-process-step]");
    const references = page.locator('[data-home-module="references"]');

    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute(
      "data-motion",
      "scroll-register",
    );
    await expect(controller).toHaveAttribute(
      "data-sequence",
      "scroll-linked",
    );
    await expect(process.locator("[data-process-scene]")).toHaveCount(1);
    await expect(process.locator("[data-process-pin-stage]")).toHaveCount(0);
    await expect(page.locator("[data-process-references-reveal]")).toHaveCount(0);
    await expect(page.locator("[data-process-references-flow]")).toHaveCount(0);
    await expect(page.locator(".pin-spacer-home-process-references-handoff"))
      .toHaveCount(0);
    await expect(process.locator("canvas")).toHaveCount(0);
    await expect(process.locator("[data-process-focus]")).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const processSection = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const referenceSection = document.querySelector<HTMLElement>(
        '[data-home-module="references"]',
      )!;
      const rows = [...processSection.querySelectorAll<HTMLElement>(
        "[data-process-step]",
      )];
      return {
        processBottom: processSection.offsetTop + processSection.offsetHeight,
        processHeight: processSection.offsetHeight,
        referenceTop: referenceSection.offsetTop,
        rowHeights: rows.map((row) => row.offsetHeight),
      };
    });

    expect(geometry.processHeight).toBeGreaterThan(900 * 1.2);
    expect(Math.abs(geometry.referenceTop - geometry.processBottom))
      .toBeLessThanOrEqual(1);
    expect(geometry.rowHeights.every((height) => height >= 210)).toBe(true);

    const revealEnds = await steps.evaluateAll((rows) => rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return window.scrollY + rect.bottom - window.innerHeight * 0.46;
    }));

    for (const [index, revealEnd] of revealEnds.entries()) {
      await scrollImmediately(page, revealEnd);
      await page.waitForTimeout(1_500);

      const scene = await steps.nth(index).evaluate((step) => ({
        index: Number(getComputedStyle(
          step.querySelector<HTMLElement>("[data-process-index-ink]")!,
        ).opacity),
        role: Number(getComputedStyle(
          step.querySelector<HTMLElement>("[data-process-role-ink]")!,
        ).opacity),
        ruleOpacity: Number(getComputedStyle(
          step.querySelector<HTMLElement>("[data-process-step-rule]")!,
        ).opacity),
        ruleTransform: getComputedStyle(
          step.querySelector<HTMLElement>("[data-process-step-rule]")!,
        ).transform,
        support: Number(getComputedStyle(
          step.querySelector<HTMLElement>("[data-process-support-ink]")!,
        ).opacity),
        words: [...step.querySelectorAll<HTMLElement>(
          "[data-process-word-ink]",
        )].map((word) => Number(getComputedStyle(word).opacity)),
      }));

      expect(scene.index).toBeGreaterThan(0.85);
      expect(scene.role).toBeGreaterThan(0.9);
      expect(scene.ruleOpacity).toBeGreaterThan(0.65);
      expect(scene.ruleTransform).not.toBe("matrix(0, 0, 0, 1, 0, 0)");
      expect(scene.support).toBeGreaterThan(0.9);
      expect(Math.min(...scene.words)).toBeGreaterThan(0.9);

      for (let revealedIndex = 0; revealedIndex <= index; revealedIndex += 1) {
        const revealedWords = await steps.nth(revealedIndex).locator(
          "[data-process-word-ink]",
        ).evaluateAll((words) => words.map((word) => Number(
          getComputedStyle(word).opacity,
        )));
        expect(Math.min(...revealedWords)).toBeGreaterThan(0.9);
      }
    }

    await expect(process.locator("[data-process-liquid-lines]")).toHaveAttribute(
      "data-renderer",
      "three-fragment-shader",
    );
    await expect(process.locator("[data-process-liquid-lines-webgl]"))
      .toHaveAttribute("data-state", "ready");

    const processStart = await process.evaluate(
      (section) => section.getBoundingClientRect().top
        + window.scrollY
        - window.innerHeight * 0.92,
    );
    await scrollImmediately(page, processStart);
    await page.waitForTimeout(900);
    const reverseState = await process.evaluate((section) => {
      const rows = [...section.querySelectorAll<HTMLElement>(
        "[data-process-step]",
      )];
      return rows.map((row) => {
        const wordOpacities = [...row.querySelectorAll<HTMLElement>(
          "[data-process-word-ink]",
        )].map((word) => Number(getComputedStyle(word).opacity));
        const rule = row.querySelector<HTMLElement>(
          "[data-process-step-rule]",
        )!;
        const ruleTransform = getComputedStyle(rule).transform;
        return {
          copy: Number(getComputedStyle(
            row.querySelector<HTMLElement>("[data-process-step-copy]")!,
          ).opacity),
          index: Number(getComputedStyle(
            row.querySelector<HTMLElement>("[data-process-index-ink]")!,
          ).opacity),
          role: Number(getComputedStyle(
            row.querySelector<HTMLElement>("[data-process-role-ink]")!,
          ).opacity),
          support: Number(getComputedStyle(
            row.querySelector<HTMLElement>("[data-process-support-ink]")!,
          ).opacity),
          ruleOpacity: Number(getComputedStyle(rule).opacity),
          ruleScaleX: ruleTransform === "none"
            ? 1
            : new DOMMatrixReadOnly(ruleTransform).a,
          words: wordOpacities,
        };
      });
    });
    for (const row of reverseState) {
      expect(row.copy).toBeLessThan(0.05);
      expect(row.index).toBeLessThan(0.05);
      expect(row.role).toBeLessThan(0.05);
      expect(row.ruleScaleX).toBeLessThan(0.05);
    }

    const resultEnd = await process.locator("[data-process-result]")
      .evaluate((result) => {
        const rect = result.getBoundingClientRect();
        return window.scrollY + rect.bottom - window.innerHeight * 0.46;
      });
    await scrollImmediately(page, resultEnd);
    await page.waitForTimeout(1_300);
    const resultReveal = await process.locator("[data-process-result]")
      .evaluate((result) => ({
        description: Number(getComputedStyle(result.querySelector<HTMLElement>(
          "[data-process-result-description-ink]",
        )!).opacity),
        eyebrow: Number(getComputedStyle(result.querySelector<HTMLElement>(
          "[data-process-result-eyebrow-ink]",
        )!).opacity),
        words: [...result.querySelectorAll<HTMLElement>(
          "[data-process-result-word-ink]",
        )].map((word) => Number(getComputedStyle(word).opacity)),
      }));
    expect(resultReveal.description).toBeGreaterThan(0.9);
    expect(resultReveal.eyebrow).toBeGreaterThan(0.9);
    expect(Math.min(...resultReveal.words)).toBeGreaterThan(0.9);

    const outcomeEnd = await process.locator("[data-process-outcome]")
      .evaluate((outcome) => {
        const rect = outcome.getBoundingClientRect();
        return window.scrollY + rect.bottom - window.innerHeight * 0.46;
      });
    await scrollImmediately(page, outcomeEnd);
    await page.waitForTimeout(1_400);
    await expect(process.locator("[data-process-cta]")).toBeVisible();
    await expect(process.locator("[data-process-video-trigger]")).toBeVisible();
    await expect(process.locator("[data-process-action-rail]"))
      .not.toHaveAttribute("inert", "");
    await expect(process.locator("[data-process-video-rail]"))
      .not.toHaveAttribute("inert", "");

    await process.locator("[data-process-video-trigger]").focus();
    await expect(process.locator("[data-process-video-trigger]")).toBeFocused();
    await process.locator("[data-process-video-trigger]").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(process.locator("[data-process-liquid-lines-webgl]"))
      .toHaveAttribute("data-paused", "");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(process.locator("[data-process-liquid-lines-webgl]"))
      .not.toHaveAttribute("data-paused", "");

    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
    expect(runtimeErrors).toEqual([]);
    await expect(references).not.toHaveAttribute("inert", "");
  });

  test("reverses later compact chapters when scrolling back", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    const process = page.locator('[data-home-module="process"]');
    const steps = process.locator("[data-process-step]");
    await expect(process.locator("[data-process-reveal]")).toHaveAttribute(
      "data-sequence",
      "scroll-linked",
    );
    await expect(process.locator("[data-process-role]")).toHaveText([
      "VY",
      "JÁ",
      "VY",
    ]);
    await expect(process.locator("[data-process-role-rule]")).toHaveCount(0);

    const revealEnds = await steps.evaluateAll((rows) => rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return window.scrollY + rect.bottom - window.innerHeight * 0.54;
    }));

    for (const revealEnd of revealEnds) {
      await scrollImmediately(page, revealEnd);
      await page.waitForTimeout(1_200);
    }

    const processStart = await process.evaluate(
      (section) => section.getBoundingClientRect().top
        + window.scrollY
        - window.innerHeight * 0.94,
    );
    await scrollImmediately(page, processStart);
    await page.waitForTimeout(700);

    await expect(process.locator("[data-process-liquid-lines]")).toHaveAttribute(
      "data-renderer",
      "three-fragment-shader",
    );
    await expect(process.locator("[data-process-liquid-lines-webgl]"))
      .toHaveAttribute("data-state", "ready");
    await expect(process.locator("[data-process-liquid-lines-canvas]"))
      .toHaveCount(1);

    const finalRows = await steps.evaluateAll((rows) => rows.map((row) => {
      const rule = row.querySelector<HTMLElement>(
        "[data-process-step-rule]",
      )!;
      const transform = getComputedStyle(rule).transform;
      return {
        copy: Number(getComputedStyle(
          row.querySelector<HTMLElement>("[data-process-step-copy]")!,
        ).opacity),
        index: Number(getComputedStyle(
          row.querySelector<HTMLElement>("[data-process-index-ink]")!,
        ).opacity),
        role: Number(getComputedStyle(
          row.querySelector<HTMLElement>("[data-process-role-ink]")!,
        ).opacity),
        support: Number(getComputedStyle(
          row.querySelector<HTMLElement>("[data-process-support-ink]")!,
        ).opacity),
        minWord: Math.min(...[
          ...row.querySelectorAll<HTMLElement>("[data-process-word-ink]"),
        ].map((word) => Number(getComputedStyle(word).opacity))),
        ruleOpacity: Number(getComputedStyle(rule).opacity),
        ruleScaleX: transform === "none"
          ? 1
          : new DOMMatrixReadOnly(transform).a,
      };
    }));

    for (const row of finalRows) {
      expect(row.copy).toBeLessThan(0.05);
      expect(row.index).toBeLessThan(0.05);
      expect(row.role).toBeLessThan(0.05);
      expect(row.ruleScaleX).toBeLessThan(0.05);
    }
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
  });

  test("keeps compact, reduced-motion, and forced-colors modes fully static", async ({
    page,
  }) => {
    await primeRejectedConsent(page);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const process = page.locator('[data-home-module="process"]');
      await expect(process.locator("[data-process-reveal]")).toHaveAttribute(
        "data-state",
        "reduced-motion",
      );
      await expect(process.locator("[data-process-reveal]")).toHaveAttribute(
        "data-sequence",
        "static",
      );
      await expect(process.locator("[data-process-word-ink]")).toHaveCount(17);
      await expect(process.locator("[data-process-support-ink]")).toHaveCount(3);
      await expect(process.locator("[data-process-result-word-ink]"))
        .toHaveCount(6);
      await expect(process.locator("[data-process-liquid-lines]"))
        .toHaveAttribute("data-state", "static");
      await expect(process.locator("[data-process-liquid-lines-webgl]"))
        .toHaveCount(0);
      for (const word of await process.locator("[data-process-word-ink]").all()) {
        await expect(word).toHaveCSS("opacity", "1");
      }
      await expect(process.locator("[data-process-cta]")).toBeVisible();
      await expect(process.locator("[data-process-video-trigger]")).toBeVisible();
      await expect(page.locator(".pin-spacer-home-process-references-handoff"))
        .toHaveCount(0);
    }

    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "no-preference",
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const controller = page.locator("[data-process-reveal]");
    await expect(controller).toHaveAttribute("data-state", "forced-colors");
    await expect(controller).toHaveAttribute("data-sequence", "static");
  });
});
