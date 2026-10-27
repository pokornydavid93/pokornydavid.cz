import { expect, test, type Page } from "@playwright/test";

type InstrumentedWindow = Window & {
  __heroRevealSettledAt?: number;
  __homeIntroCompletedAt?: number;
  __lenis?: unknown;
  __lenisInitializedAt?: number;
  __lenisInitializedIntroState?: string | null;
};

async function prepareRealUserContext(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", {
      configurable: true,
      get: () => false,
    });

    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-05-05-ga4-v1",
    }));

    const instrumentedWindow = window as InstrumentedWindow;
    let lenis: unknown;
    Object.defineProperty(instrumentedWindow, "__lenis", {
      configurable: true,
      get: () => lenis,
      set: (value: unknown) => {
        lenis = value;
        if (!value) return;

        instrumentedWindow.__lenisInitializedAt = performance.now();
        instrumentedWindow.__lenisInitializedIntroState =
          document.documentElement.dataset.homeIntroState ?? null;
      },
    });
    window.addEventListener("home:intro-complete", () => {
      instrumentedWindow.__homeIntroCompletedAt = performance.now();
    });
    window.addEventListener("home:hero-reveal-settled", () => {
      instrumentedWindow.__heroRevealSettledAt = performance.now();
    });
  });
}

test.describe("Lenis homepage Hero gate", () => {
  test("initializes only after the homepage Hero reveal has settled", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepareRealUserContext(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect.poll(() => page.evaluate(() => (
      document.documentElement.dataset.homeIntroState
    ))).toMatch(/^(?:active|pending)$/u);
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => Boolean(
      (window as InstrumentedWindow).__lenis,
    ))).toBe(false);

    await expect.poll(() => page.evaluate(() => [
      "active",
      "fallback-exit",
      "pending",
    ].includes(document.documentElement.dataset.homeIntroState ?? "")), {
      timeout: 20_000,
    }).toBe(false);
    await expect(page.locator("[data-cinematic-home-hero]")).toHaveAttribute(
      "data-hero-reveal-settled",
      "true",
      { timeout: 15_000 },
    );
    await expect.poll(() => page.evaluate(() => Boolean(
      (window as InstrumentedWindow).__lenis,
    )), { timeout: 15_000 }).toBe(true);

    const timing = await page.evaluate(() => {
      const instrumentedWindow = window as InstrumentedWindow;
      return {
        completedAt: instrumentedWindow.__homeIntroCompletedAt,
        revealSettledAt: instrumentedWindow.__heroRevealSettledAt,
        initializedAt: instrumentedWindow.__lenisInitializedAt,
        initializedState: instrumentedWindow.__lenisInitializedIntroState,
      };
    });
    expect(["complete", "fallback-complete"]).toContain(
      timing.initializedState,
    );
    if (timing.completedAt !== undefined) {
      expect(timing.initializedAt).toBeGreaterThanOrEqual(timing.completedAt);
      expect(timing.initializedState).toBe("complete");
    }
    expect(timing.revealSettledAt).toBeDefined();
    expect(timing.initializedAt).toBeGreaterThanOrEqual(
      timing.revealSettledAt!,
    );
  });

  test("keeps non-home routes independent from the homepage event", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepareRealUserContext(page);
    await page.goto("/kdo-jsem", { waitUntil: "domcontentloaded" });

    await expect.poll(() => page.evaluate(() => Boolean(
      (window as InstrumentedWindow).__lenis,
    )), { timeout: 10_000 }).toBe(true);
    expect(await page.evaluate(() => (
      (window as InstrumentedWindow).__homeIntroCompletedAt
    ))).toBeUndefined();
  });

  test("continues to disable Lenis for reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepareRealUserContext(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect.poll(() => page.evaluate(() => (
      document.documentElement.dataset.homeIntroState
    )), { timeout: 10_000 }).toBe("complete");
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => Boolean(
      (window as InstrumentedWindow).__lenis,
    ))).toBe(false);
  });
});
