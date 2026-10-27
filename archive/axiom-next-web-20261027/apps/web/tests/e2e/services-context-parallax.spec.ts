import { expect, test, type Locator, type Page } from "@playwright/test";

const sectionSelector = "[data-services-context]";
const foldSelector = "[data-services-context-fold]";

async function openContext(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt: now,
      expiresAt: now + 180 * 24 * 60 * 60 * 1000,
      version: "2026-09-13-web-privacy-v2",
    }));
  });
  await page.goto("/sluzby/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator(sectionSelector);
  await alignSection(section);
  await expect(section.locator(foldSelector)).toHaveCount(2);
  for (const fold of await section.locator(foldSelector).all()) {
    expect(await fold.evaluate((element) => Boolean(element.closest('[aria-hidden="true"]'))))
      .toBe(true);
    await expect(fold).toHaveCSS("pointer-events", "none");
  }
  return { section, errors };
}

async function alignSection(section: Locator) {
  await section.evaluate((element) => window.scrollTo({
    top: window.scrollY + element.getBoundingClientRect().top - 100,
    behavior: "instant",
  }));
  await expect.poll(async () => Math.abs((await section.boundingBox())!.y - 100))
    .toBeLessThanOrEqual(1);
}

async function readFolds(section: Locator) {
  return section.locator(foldSelector).evaluateAll((folds) => folds.map((fold) => {
    const style = getComputedStyle(fold);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return {
      x: matrix.m41,
      y: matrix.m42,
      shape: {
        background: style.backgroundImage,
        width: style.width,
        height: style.height,
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d],
      },
    };
  }));
}

async function expectAtRest(section: Locator) {
  await expect.poll(async () => (await readFolds(section)).every(({ x, y }) => (
    Math.abs(x) < 0.05 && Math.abs(y) < 0.05
  ))).toBe(true);
}

async function moveToSide(page: Page, section: Locator, side: "left" | "right") {
  const viewport = page.viewportSize()!;
  await page.mouse.move(
    viewport.width * (side === "left" ? 0.05 : 0.95),
    viewport.height * (side === "left" ? 0.7 : 0.35),
    { steps: 12 },
  );
  await expect.poll(async () => Math.max(
    ...(await readFolds(section)).map(({ x, y }) => Math.hypot(x, y)),
  )).toBeGreaterThan(2);
}

async function readContent(section: Locator) {
  return section.locator(
    "h2, h3, p, [data-services-context-heading-line], [data-services-context-index], [data-services-context-criterion]",
  ).evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      transform: style.transform, opacity: style.opacity, filter: style.filter,
    };
  }));
}

async function settleContent(section: Locator) {
  const stage = section.locator("[data-services-context-stage]");
  const frame = section.locator("[data-services-context-frame]");
  await expect(stage).toHaveAttribute("data-route-reveal-state", "visible");
  // The frame's scroll-scrubbed reveal can rest partway through its progress.
  // Compare content only after its actual rendered geometry stops changing.
  await expect(frame).toHaveAttribute("data-route-reveal-state", /entering|visible/);
  let previous = "";
  let stableSamples = 0;
  await expect.poll(async () => {
    const current = JSON.stringify(await readContent(section));
    stableSamples = current === previous ? stableSamples + 1 : 0;
    previous = current;
    return stableSamples;
  }, { intervals: [100], timeout: 10_000 }).toBeGreaterThanOrEqual(3);
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => (
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

test.describe("services recommendation background parallax", () => {
  test.use({
    viewport: { width: 1440, height: 1000 },
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("moves the folds independently while preserving content and gradient geometry", async ({ page }) => {
    const { section, errors } = await openContext(page);
    await expect(section).toHaveAttribute("data-context-parallax", "ready");
    await settleContent(section);
    await expectAtRest(section);
    const content = await readContent(section);
    const shapes = (await readFolds(section)).map(({ shape }) => shape);
    expect(shapes.every(({ background }) => background.includes("linear-gradient")))
      .toBe(true);

    await moveToSide(page, section, "left");
    const left = await readFolds(section);
    expect(new Set(left.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)).size)
      .toBe(2);
    expect(left.every(({ x, y }) => Math.abs(x) <= 35 && Math.abs(y) <= 35))
      .toBe(true);
    expect(left.map(({ shape }) => shape)).toEqual(shapes);
    expect(await readContent(section)).toEqual(content);

    await moveToSide(page, section, "right");
    await expect.poll(async () => (await readFolds(section)).every(({ x, y }, index) => (
      Math.hypot(x - left[index].x, y - left[index].y) > 2
    ))).toBe(true);
    expect((await readFolds(section)).map(({ shape }) => shape)).toEqual(shapes);
    expect(await readContent(section)).toEqual(content);

    await page.mouse.move(20, 20);
    await expectAtRest(section);
    expect((await readFolds(section)).map(({ shape }) => shape)).toEqual(shapes);
    expect(await readContent(section)).toEqual(content);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test("returns displaced folds to rest after interruption, resize, and scrolling away", async ({ page }) => {
    const { section, errors } = await openContext(page);
    await expect(section).toHaveAttribute("data-context-parallax", "ready");
    await moveToSide(page, section, "left");
    await section.dispatchEvent("pointercancel", { pointerType: "mouse" });
    await expectAtRest(section);

    await moveToSide(page, section, "right");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expectAtRest(section);

    await moveToSide(page, section, "left");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await expectAtRest(section);
    // Let the existing scroll scenes finish their resize refresh first.
    await page.waitForTimeout(400);
    await alignSection(section);

    await moveToSide(page, section, "right");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expectAtRest(section);
    await page.mouse.move(20, 20);
    await alignSection(section);
    await expectAtRest(section);
    await moveToSide(page, section, "left");
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test("cleans up live motion and contrast preferences and keeps compact layouts static", async ({ page }) => {
    const { section, errors } = await openContext(page);
    await expect(section).toHaveAttribute("data-context-parallax", "ready");
    await moveToSide(page, section, "left");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(section).toHaveAttribute("data-context-parallax", "disabled");
    await expectAtRest(section);
    await page.mouse.move(1300, 400, { steps: 12 });
    await expectAtRest(section);

    await page.mouse.move(20, 20);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(section).toHaveAttribute("data-context-parallax", "ready");
    await alignSection(section);
    await moveToSide(page, section, "left");
    await page.emulateMedia({ forcedColors: "active" });
    await expect(section).toHaveAttribute("data-context-parallax", "disabled");
    await expectAtRest(section);
    await expect(section.locator(foldSelector).first().locator("..")).toHaveCSS("display", "none");
    await page.emulateMedia({ forcedColors: "none" });
    await expect(section).toHaveAttribute("data-context-parallax", "ready");

    for (const viewport of [
      { width: 900, height: 1000 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await alignSection(section);
      await expect(section).toHaveAttribute("data-context-parallax", "disabled");
      await page.mouse.move(viewport.width * 0.85, viewport.height * 0.5);
      await expectAtRest(section);
      await expectNoOverflow(page);
    }
    expect(errors).toEqual([]);
  });
});

test.describe("services recommendation background on touch devices", () => {
  test.use({
    viewport: { width: 1280, height: 1000 },
    hasTouch: true,
    isMobile: true,
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("keeps the folds static on coarse pointers at a desktop width", async ({ page }) => {
    const { section, errors } = await openContext(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches))
      .toBe(true);
    await expect(section).toHaveAttribute("data-context-parallax", "disabled");
    await page.touchscreen.tap(30, 600);
    await expectAtRest(section);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });
});
