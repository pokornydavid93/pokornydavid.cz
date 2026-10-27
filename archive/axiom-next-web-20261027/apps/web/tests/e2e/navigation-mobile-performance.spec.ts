import { expect, test, type Locator, type Page } from "@playwright/test";

type HeaderOffsetWrite = { value: number; time: number };

declare global {
  interface Window {
    __headerOffsetWrites?: HeaderOffsetWrite[];
  }
}

const HEADER_SELECTOR = '[data-component="site-header"]:not([data-header-instance="hero"])';
const OFFSET_PROPERTY = "--site-header-visible-bottom";

async function prepareMobilePage(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-09-13-web-privacy-v2",
    }));

    window.__headerOffsetWrites = [];
    const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function (property, value, priority) {
      if (property === "--site-header-visible-bottom"
        && this === document.documentElement?.style) {
        window.__headerOffsetWrites!.push({
          value: Number.parseFloat(value ?? ""),
          time: performance.now(),
        });
      }
      return originalSetProperty.call(this, property, value, priority);
    };
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

async function readyHeader(page: Page, state: "visible" | "hidden" = "visible") {
  const header = page.locator(HEADER_SELECTOR);
  await expect(header.locator('[data-header-scroll-controller][data-state="ready"]'))
    .toHaveCount(1);
  await expect(header).toHaveAttribute("data-scroll-state", state);
  return header;
}

async function scrollTo(page: Page, top: number) {
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), top);
}

async function expectOffset(page: Page, expected: number) {
  await expect.poll(() => page.evaluate((property) => Number.parseFloat(
    document.documentElement.style.getPropertyValue(property),
  ), OFFSET_PROPERTY)).toBeCloseTo(expected, 1);
}

async function resetWrites(page: Page) {
  await page.evaluate(() => { window.__headerOffsetWrites = []; });
}

async function offsetWrites(page: Page) {
  return page.evaluate(() => window.__headerOffsetWrites ?? []);
}

async function interruptTransition(
  page: Page,
  startY: number,
  state: "hiding" | "revealing",
  reverseY: number,
) {
  const interrupted = await page.evaluate(({ start, expectedState, reverse, selector }) => (
    new Promise<boolean>((resolve) => {
      const header = document.querySelector<HTMLElement>(selector)!;
      const timeout = window.setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, 5_000);
      const observer = new MutationObserver(() => {
        if (header.dataset.scrollState !== expectedState) return;
        observer.disconnect();
        window.clearTimeout(timeout);
        // Reverse a real scroll while the first transition is still active.
        window.scrollTo(0, reverse);
        resolve(true);
      });
      observer.observe(header, { attributes: true, attributeFilter: ["data-scroll-state"] });
      window.scrollTo(0, start);
    })
  ), { start: startY, expectedState: state, reverse: reverseY, selector: HEADER_SELECTOR });
  expect(interrupted).toBe(true);
}

async function expectUnscaledHeader(header: Locator) {
  expect(await header.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    const matrix = transform === "none" ? new DOMMatrix() : new DOMMatrix(transform);
    return { x: matrix.a, y: matrix.d };
  })).toEqual({ x: 1, y: 1 });
  await expect(header.locator("[data-header-motion-inner]")).toHaveCSS("opacity", "1");
}

test.describe("compact navigation animation work", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });

  test.beforeEach(async ({ page }) => {
    await prepareMobilePage(page);
  });

  test("publishes sticky offset at state boundaries without per-frame root writes", async ({ page }) => {
    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
    const header = await readyHeader(page);
    const height = await header.evaluate((element: HTMLElement) => element.offsetHeight);
    await expectOffset(page, height);
    await expect(header).toHaveCSS("backdrop-filter", "none");
    await expect(header).toHaveCSS("box-shadow", "none");
    await resetWrites(page);

    await scrollTo(page, 320);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expectOffset(page, 0);
    await expectUnscaledHeader(header);
    const hiddenWrites = await offsetWrites(page);
    expect(hiddenWrites.map(({ value }) => value)).toEqual([0]);

    await scrollTo(page, 280);
    await expect(header).toHaveAttribute("data-scroll-state", "visible");
    await expectOffset(page, height);
    await expectUnscaledHeader(header);
    expect((await offsetWrites(page)).map(({ value }) => value)).toEqual([0, height]);
    await expect(header).toHaveCSS("opacity", "1");
  });

  test("reverses active transitions without losing the visible reservation", async ({ page }) => {
    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
    const header = await readyHeader(page);
    const height = await header.evaluate((element: HTMLElement) => element.offsetHeight);
    await resetWrites(page);

    await interruptTransition(page, 320, "hiding", 280);
    await expect(header).toHaveAttribute("data-scroll-state", "visible");
    await expectOffset(page, height);
    await expect(header).toHaveCSS("pointer-events", "auto");
    const firstWrites = await offsetWrites(page);
    expect(firstWrites.length).toBeLessThanOrEqual(2);
    expect(firstWrites.every(({ value }) => value === 0 || value === height)).toBe(true);

    await scrollTo(page, 480);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await resetWrites(page);
    await interruptTransition(page, 440, "revealing", 500);
    await expect(header).toHaveAttribute("data-scroll-state", "hidden");
    await expectOffset(page, 0);
    await expect(header).toHaveCSS("pointer-events", "none");
    expect((await offsetWrites(page)).map(({ value }) => value)).toEqual([height, 0]);
  });

  test("lets only the active header reserve space across mobile hero ownership", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");
    const dynamic = await readyHeader(page, "hidden");
    const hero = page.locator('[data-header-instance="hero"]');
    await expect(hero.locator('[data-header-scroll-controller][data-state="ready"]'))
      .toHaveCount(1);
    await expect(dynamic).toHaveAttribute("data-navigation-owner", "alternate");
    await expect(hero).toHaveAttribute("data-navigation-owner", "hero");
    await expectOffset(page, 0);

    const heroBottom = await page.locator("[data-cinematic-home-hero]").evaluate(
      (element) => element.getBoundingClientRect().bottom + window.scrollY,
    );
    await scrollTo(page, heroBottom + 400);
    await expect(dynamic).toHaveAttribute("data-navigation-owner", "dynamic");
    await expect(dynamic).toHaveAttribute("data-scroll-state", "hidden");
    await expectOffset(page, 0);
    await scrollTo(page, heroBottom + 360);
    await expect(dynamic).toHaveAttribute("data-scroll-state", "visible");
    const dynamicHeight = await dynamic.evaluate((element: HTMLElement) => element.offsetHeight);
    await expectOffset(page, dynamicHeight);

    // A resize of the inactive hero must not overwrite the floating owner.
    await hero.evaluate((element: HTMLElement) => { element.style.minBlockSize = "68px"; });
    await expect(hero).toHaveCSS("height", "68px");
    await expectOffset(page, dynamicHeight);
    await scrollTo(page, 0);
    await expect(dynamic).toHaveAttribute("data-navigation-owner", "alternate");
    await expect(hero).toHaveAttribute("data-navigation-owner", "hero");
    await expectOffset(page, 0);
    await expect(dynamic).toHaveAttribute("inert", "");
    await expect(hero).not.toHaveAttribute("inert", "");

    // This query changes position while retaining the same header border box,
    // so offset ownership must update without depending on ResizeObserver.
    await page.setViewportSize({ width: 843, height: 700 });
    await expect(hero).toHaveCSS("position", "fixed");
    const heroHeight = await hero.evaluate((element: HTMLElement) => element.offsetHeight);
    await expectOffset(page, heroHeight);
    await page.setViewportSize({ width: 843, height: 500 });
    await expect(hero).toHaveCSS("position", "absolute");
    await expectOffset(page, 0);
    await page.setViewportSize({ width: 843, height: 700 });
    await expect(hero).toHaveCSS("position", "fixed");
    await expectOffset(page, heroHeight);
  });

  for (const { route, stickySelector } of [
    { route: "/reference/", stickySelector: "[data-reference-filter-dock]" },
    { route: "/clanky/", stickySelector: "[data-article-filter-row]" },
  ]) {
    test(`keeps sticky controls clear and releases their offset on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const header = await readyHeader(page);
      const sticky = page.locator(stickySelector);
      await expect(sticky).toHaveCSS("position", "sticky");
      const stickyY = await sticky.evaluate(
        (element) => element.getBoundingClientRect().top + window.scrollY,
      );
      await scrollTo(page, stickyY + 160);
      await expect(header).toHaveAttribute("data-scroll-state", "hidden");
      await expectOffset(page, 0);
      await expect(sticky).toHaveCSS("top", "0px");

      await scrollTo(page, stickyY + 120);
      await expect(header).toHaveAttribute("data-scroll-state", "visible");
      const height = await header.evaluate((element: HTMLElement) => element.offsetHeight);
      await expectOffset(page, height);
      await expect(sticky).toHaveCSS("top", `${height}px`);
      const clearance = await sticky.evaluate((element, selector) => {
        const navigation = document.querySelector(selector)!;
        return element.getBoundingClientRect().top - navigation.getBoundingClientRect().bottom;
      }, HEADER_SELECTOR);
      expect(clearance).toBeGreaterThanOrEqual(-1);

      await scrollTo(page, stickyY + 220);
      await expect(header).toHaveAttribute("data-scroll-state", "hidden");
      await expectOffset(page, 0);
      await expect(sticky).toHaveCSS("top", "0px");
    });
  }
});
