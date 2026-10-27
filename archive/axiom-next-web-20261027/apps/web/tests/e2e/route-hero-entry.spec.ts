import { expect, test, type Page } from "@playwright/test";

const routes = ["/sluzby/", "/jak-pracuji/", "/reference/", "/kdo-jsem/", "/clanky/"] as const;
const entrySelector = "[data-route-hero-entry]";

type HeroTarget = {
  key: string;
  opacity: number;
  y: number;
  visibility: string;
  animation: string;
  rendered: boolean;
};
type HeroFrame = { t: number; path: string; targets: HeroTarget[] };
type HeroTraceWindow = Window & {
  __heroEntryFrames: HeroFrame[];
  __resetHeroEntryFrames: () => void;
};

async function watchFirstPaint(page: Page) {
  // Begin before hydration: sampling only after page.goto would miss the flash.
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt: now,
      expiresAt: now + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-09-13-web-privacy-v2",
    }));
    const traceWindow = window as unknown as HeroTraceWindow;
    traceWindow.__heroEntryFrames = [];
    traceWindow.__resetHeroEntryFrames = () => { traceWindow.__heroEntryFrames = []; };
    const frame = () => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-route-hero-entry]"))
        .filter((element) => !element.closest("[data-route-transition-snapshot]"))
        .map((element, index) => {
          const style = getComputedStyle(element);
          let opacity = 1;
          let visibility = style.visibility;
          for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
            const parentStyle = getComputedStyle(parent);
            opacity *= Number(parentStyle.opacity);
            if (parentStyle.visibility === "hidden" || parentStyle.display === "none") visibility = "hidden";
          }
          return {
            key: `${index}:${element.dataset.routeHeroEntry}:${element.textContent?.trim().slice(0, 80)}`,
            opacity,
            y: new DOMMatrixReadOnly(style.transform).m42,
            visibility,
            animation: style.animationName,
            rendered: element.getClientRects().length > 0,
          };
        });
      traceWindow.__heroEntryFrames.push({ t: performance.now(), path: location.pathname, targets });
      if (traceWindow.__heroEntryFrames.length > 1_800) traceWindow.__heroEntryFrames.shift();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

async function resetTrace(page: Page) {
  await page.evaluate(() => (window as unknown as HeroTraceWindow).__resetHeroEntryFrames());
}

async function expectSettled(page: Page) {
  await expect(page.locator(entrySelector).first()).toBeAttached();
  await expect.poll(() => page.locator(entrySelector).evaluateAll((elements) => elements.every((element) => {
    const style = getComputedStyle(element);
    return Number(style.opacity) > 0.99 && Math.abs(new DOMMatrixReadOnly(style.transform).m42) < 0.6;
  }))).toBe(true);
  await expect(page.locator("main h1").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function checkEntry(page: Page, route: string, label: string, requireAnimation = true) {
  await expectSettled(page);
  // Keep sampling beyond the CSS entrance so a delayed controller reset is caught.
  await page.waitForTimeout(400);
  const frames = await page.evaluate((path) => (window as unknown as HeroTraceWindow).__heroEntryFrames
    .filter((frame) => frame.path === path && frame.targets.length > 0), route);
  expect(frames.length, `${label}: sampled first paint and settlement`).toBeGreaterThan(5);
  await test.info().attach(label.replaceAll("/", "-") + ".json", {
    body: JSON.stringify(frames), contentType: "application/json",
  });
  const keys = new Set(frames.flatMap((frame) => frame.targets.map((target) => target.key)));
  let animatedParts = 0;
  for (const key of keys) {
    const samples = frames.flatMap((frame) => frame.targets.filter((target) => target.key === key));
    // The reference context is intentionally display:none in the mobile layout.
    if (samples.length < 2 || samples.every((sample) => !sample.rendered)) continue;
    const intermediate = samples.filter((sample) => sample.opacity > 0.001 && sample.opacity < 0.999);
    if (intermediate.length >= 3) animatedParts += 1;
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index].opacity, `${label}: ${key} must not flash from visible to hidden`)
        .toBeGreaterThanOrEqual(samples[index - 1].opacity - 0.025);
    }
    expect(samples.at(-1)!.opacity, `${label}: ${key} finishes visible`).toBeGreaterThan(0.99);
    expect(Math.abs(samples.at(-1)!.y), `${label}: ${key} finishes in place`).toBeLessThan(0.6);
    expect(samples.at(-1)!.visibility).toBe("visible");
  }
  if (requireAnimation) {
    expect(Math.min(...frames[0].targets.map((target) => target.opacity)), `${label}: begins with the entrance, not a visible flash`)
      .toBeLessThan(0.95);
    expect(animatedParts, `${label}: entrance unfolds over multiple frames`).toBeGreaterThan(0);
  }
}

async function clickMenuRoute(page: Page, route: string, touch: boolean) {
  const menu = page.getByRole("button", { name: "Otevřít menu", exact: true });
  if (await menu.isVisible()) {
    if (touch) await menu.tap();
    else await menu.click();
    const link = page.locator(`#public-site-navigation-panel a[href="${route}"]`);
    if (touch) await link.tap();
    else await link.click();
  } else {
    await page.locator(`header nav a[href="${route}"]`).first().click();
  }
  await page.waitForURL(`**${route}`);
}

test.describe("public route hero first paint", () => {
  test("finishes a focused hero control without replaying its entrance after blur", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await watchFirstPaint(page);
    await page.goto("/reference/", { waitUntil: "networkidle" });
    await expectSettled(page);
    await clickMenuRoute(page, "/sluzby/", false);
    const action = page.locator('[data-services-hero-part][data-route-hero-entry="3"]');
    const result = await action.evaluate((element) => new Promise<{
      before: number;
      focused: boolean;
      samples: { opacity: number; y: number }[];
    }>((resolve) => {
      const link = element.querySelector<HTMLAnchorElement>("a")!;
      const before = Number(getComputedStyle(element).opacity);
      link.focus({ preventScroll: true });
      const focused = document.activeElement === link;
      const samples: { opacity: number; y: number }[] = [];
      const started = performance.now();
      const sample = () => {
        const style = getComputedStyle(element);
        samples.push({ opacity: Number(style.opacity), y: new DOMMatrixReadOnly(style.transform).m42 });
        if (samples.length === 1) link.blur();
        if (performance.now() - started < 300 || samples.length < 4) requestAnimationFrame(sample);
        else resolve({ before, focused, samples });
      };
      requestAnimationFrame(sample);
    }));
    expect(result.before, "focus interrupts an unfinished entrance").toBeLessThan(0.99);
    expect(result.focused).toBe(true);
    for (const sample of result.samples) {
      expect(sample.opacity).toBe(1);
      expect(Math.abs(sample.y)).toBeLessThan(0.6);
    }
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`enters once on real menu clicks, back and repeated navigation at ${viewport.width}px`, async ({ browser, baseURL }) => {
      test.slow();
      const mobile = viewport.width === 390;
      const context = await browser.newContext({ baseURL, viewport, isMobile: mobile, hasTouch: mobile, reducedMotion: "no-preference" });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await watchFirstPaint(page);
      try {
        await page.goto(routes[0], { waitUntil: "domcontentloaded" });
        await checkEntry(page, routes[0], "direct-services");
        for (const route of [...routes.slice(1), routes[0]]) {
          await resetTrace(page);
          await clickMenuRoute(page, route, mobile);
          await checkEntry(page, route, `menu-${route}`);
        }
        await resetTrace(page);
        await page.goBack({ waitUntil: "domcontentloaded" });
        await page.waitForURL("**/clanky/");
        // History may restore a finished animation; it must never hide it again.
        await checkEntry(page, "/clanky/", "history-articles", false);
        await resetTrace(page);
        await clickMenuRoute(page, "/sluzby/", mobile);
        await checkEntry(page, "/sluzby/", "repeat-services");
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }

  for (const viewport of [{ width: 768, height: 1024 }, { width: 1920, height: 1080 }]) {
    test(`settles all five hero compositions without overflow at ${viewport.width}px`, async ({ page }) => {
      test.slow();
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await watchFirstPaint(page);
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await checkEntry(page, route, `${viewport.width}-${route}`);
      }
    });
  }

  for (const mode of ["reduced-motion", "forced-colors"] as const) {
    test(`keeps every hero readable from first paint with ${mode}`, async ({ page }) => {
      test.slow();
      await page.emulateMedia({ reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference", forcedColors: mode === "forced-colors" ? "active" : "none" });
      await watchFirstPaint(page);
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await checkEntry(page, route, `${mode}-${route}`, false);
        const samples = await page.evaluate(() => (window as unknown as HeroTraceWindow).__heroEntryFrames.flatMap((frame) => frame.targets));
        expect(samples.length).toBeGreaterThan(0);
        for (const sample of samples) {
          expect(sample.opacity).toBe(1);
          expect(sample.y).toBe(0);
          expect(sample.visibility).toBe("visible");
          expect(sample.animation).toBe("none");
        }
      }
    });
  }

  test("finishes every direct hero entrance with JavaScript disabled", async ({ browser, baseURL }) => {
    test.slow();
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, javaScriptEnabled: false, reducedMotion: "no-preference" });
    const page = await context.newPage();
    try {
      for (const route of routes) {
        await page.goto(route, { waitUntil: "load" });
        await expectSettled(page);
        await expect(page.locator("main h1").first()).not.toHaveText("");
      }
    } finally {
      await context.close();
    }
  });
});
