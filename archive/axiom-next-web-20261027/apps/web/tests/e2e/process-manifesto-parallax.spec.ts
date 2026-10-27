import { expect, test, type Locator, type Page } from "@playwright/test";

const sectionSelector = "[data-process-manifesto]";
const sheetSelector = "[data-manifesto-sheet]";
const controllerSelector = "[data-manifesto-parallax-controller]";

async function alignSection(section: Locator) {
  await section.evaluate((element) => window.scrollTo({
    top: window.scrollY + element.getBoundingClientRect().top - 100,
    behavior: "instant",
  }));
  await expect.poll(async () => Math.abs((await section.boundingBox())!.y - 100))
    .toBeLessThanOrEqual(1);
}

async function openManifesto(page: Page) {
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
  await page.goto("/jak-pracuji/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator(sectionSelector);
  await alignSection(section);
  await expect(section.locator(sheetSelector)).toHaveCount(3);
  for (const sheet of await section.locator(sheetSelector).all()) {
    expect(await sheet.evaluate((element) => Boolean(element.closest('[aria-hidden="true"]'))))
      .toBe(true);
    await expect(sheet).toHaveCSS("pointer-events", "none");
  }
  return { section, errors };
}

async function readSheets(section: Locator) {
  return section.locator(sheetSelector).evaluateAll((sheets) => sheets.map((sheet) => {
    const style = getComputedStyle(sheet);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return {
      x: matrix.m41,
      y: matrix.m42,
      shape: {
        background: style.backgroundImage,
        width: style.width,
        height: style.height,
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.m13, matrix.m23, matrix.m31, matrix.m32, matrix.m33, matrix.m34, matrix.m43],
      },
    };
  }));
}

async function readContent(section: Locator) {
  return section.locator(
    "[data-process-manifesto-scene], h2, p, [data-process-manifesto-part], [class*='manifestoPhrase']",
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
  await expect(section).toHaveAttribute("data-route-reveal-state", "visible");
  let previous = "";
  let stableSamples = 0;
  await expect.poll(async () => {
    const current = JSON.stringify(await readContent(section));
    stableSamples = current === previous ? stableSamples + 1 : 0;
    previous = current;
    return stableSamples;
  }, { intervals: [100], timeout: 10_000 }).toBeGreaterThanOrEqual(3);
}

async function expectNoContentMotion(section: Locator) {
  await expect(section.locator("[data-process-manifesto-scene]")).toHaveCSS("transform", "none");
  expect(await section.evaluate((element) => Array.from((element as HTMLElement).style)
    .filter((property) => /^--manifesto-(sheet|content)-/u.test(property))))
    .toEqual([]);
}

async function expectAtRest(section: Locator) {
  await expect.poll(async () => (await readSheets(section)).every(({ x, y }) => (
    Math.abs(x) < 0.05 && Math.abs(y) < 0.05
  ))).toBe(true);
  await expect(section).not.toHaveAttribute("data-manifesto-parallax-active", "true");
  await expectNoContentMotion(section);
}

async function moveToSide(page: Page, section: Locator, side: "left" | "right") {
  const box = (await section.boundingBox())!;
  await page.mouse.move(
    box.x + box.width * (side === "left" ? 0.06 : 0.94),
    box.y + Math.min(box.height * (side === "left" ? 0.7 : 0.3), 650),
    { steps: 12 },
  );
  await expect(section).toHaveAttribute("data-manifesto-parallax-active", "true");
  await expect.poll(async () => Math.max(
    ...(await readSheets(section)).map(({ x, y }) => Math.hypot(x, y)),
  )).toBeGreaterThan(2);
  await expectNoContentMotion(section);
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => (
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

test.describe("process manifesto decorative parallax", () => {
  test.use({
    viewport: { width: 1440, height: 1000 },
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("translates sheets independently while content stays fixed through pointer movement and interruptions", async ({ page }) => {
    const { section, errors } = await openManifesto(page);
    await expect(section).toHaveAttribute("data-manifesto-parallax", "ready");
    await expect(section.locator(controllerSelector)).toHaveAttribute("data-state", "ready");
    await settleContent(section);
    await expectAtRest(section);
    const content = await readContent(section);
    const shapes = (await readSheets(section)).map(({ shape }) => shape);
    expect(shapes.every(({ background }) => background.includes("linear-gradient")))
      .toBe(true);
    for (const shape of shapes) {
      expect(shape.matrix).toEqual([1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0]);
    }

    await moveToSide(page, section, "left");
    const left = await readSheets(section);
    expect(new Set(left.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)).size)
      .toBe(3);
    expect(left.every(({ x, y }) => Math.abs(x) <= 40 && Math.abs(y) <= 40))
      .toBe(true);
    expect(left.map(({ shape }) => shape)).toEqual(shapes);
    expect(await readContent(section)).toEqual(content);

    await moveToSide(page, section, "right");
    await expect.poll(async () => (await readSheets(section)).every(({ x, y }, index) => (
      Math.hypot(x - left[index].x, y - left[index].y) > 1
    ))).toBe(true);
    expect((await readSheets(section)).map(({ shape }) => shape)).toEqual(shapes);
    expect(await readContent(section)).toEqual(content);

    for (const interrupt of ["leave", "cancel", "blur"] as const) {
      await moveToSide(page, section, "left");
      if (interrupt === "leave") await page.mouse.move(20, 20);
      if (interrupt === "cancel") await section.dispatchEvent("pointercancel", { pointerType: "mouse" });
      if (interrupt === "blur") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await expectAtRest(section);
      expect((await readSheets(section)).map(({ shape }) => shape)).toEqual(shapes);
      expect(await readContent(section)).toEqual(content);
    }
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test("cleans up live motion preferences and leaves compact layouts static", async ({ page }) => {
    const { section, errors } = await openManifesto(page);
    const controller = section.locator(controllerSelector);
    await expect(controller).toHaveAttribute("data-state", "ready");
    await moveToSide(page, section, "left");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(controller).toHaveAttribute("data-state", "static");
    await expect(section).not.toHaveAttribute("data-manifesto-parallax", "ready");
    await expectAtRest(section);
    await page.mouse.move(1300, 400, { steps: 12 });
    await expectAtRest(section);

    await page.mouse.move(20, 20);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(controller).toHaveAttribute("data-state", "ready");
    await alignSection(section);
    await moveToSide(page, section, "left");
    await page.emulateMedia({ forcedColors: "active" });
    await expect(controller).toHaveAttribute("data-state", "static");
    await expectAtRest(section);
    await expect(section.locator(sheetSelector).first()).toBeHidden();
    await page.emulateMedia({ forcedColors: "none" });
    await expect(controller).toHaveAttribute("data-state", "ready");

    for (const viewport of [
      { width: 900, height: 1000 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await alignSection(section);
      await expect(controller).toHaveAttribute("data-state", "static");
      await expect(section).not.toHaveAttribute("data-manifesto-parallax", "ready");
      await page.mouse.move(viewport.width * 0.85, viewport.height * 0.5);
      await expectAtRest(section);
      await expectNoOverflow(page);
    }
    expect(errors).toEqual([]);
  });
});

test.describe("process manifesto on touch devices", () => {
  test.use({
    viewport: { width: 1280, height: 1000 },
    hasTouch: true,
    isMobile: true,
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("does not move content or sheets on coarse pointers at a desktop width", async ({ page }) => {
    const { section, errors } = await openManifesto(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches))
      .toBe(true);
    await expect(section.locator(controllerSelector)).toHaveAttribute("data-state", "static");
    await expect(section).not.toHaveAttribute("data-manifesto-parallax", "ready");
    await page.touchscreen.tap(30, 600);
    await expectAtRest(section);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });
});
