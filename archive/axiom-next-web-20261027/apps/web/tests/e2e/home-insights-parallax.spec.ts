import { expect, test, type Locator, type Page } from "@playwright/test";

const sectionSelector = '[data-home-module="insights"]';
const reliefSelector = "[data-home-insights-relief]";
const layerSelector = "[data-home-insights-relief-layer]";

async function openInsights(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  const rejectCookies = page.getByRole("button", { name: "Ne, díky", exact: true });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator(sectionSelector);
  await alignSection(section);
  const relief = section.locator(reliefSelector);
  await expect(relief).toHaveAttribute("aria-hidden", "true");
  await expect(relief.locator(layerSelector)).toHaveCount(4);
  return { section, relief, errors };
}

async function alignSection(section: Locator) {
  await section.evaluate((element) => {
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top - 100,
      behavior: "instant",
    });
  });
  await expect.poll(async () => (
    Math.abs((await section.boundingBox())!.y - 100)
  )).toBeLessThanOrEqual(1);
}

async function readOffsets(relief: Locator) {
  return relief.locator(layerSelector).evaluateAll((layers) => (
    layers.map((layer) => {
      const style = getComputedStyle(layer);
      const matrix = new DOMMatrixReadOnly(style.transform);
      const radius = style.backgroundImage.match(
        /^radial-gradient\((?:circle )?([\d.]+)px/u,
      );
      return {
        x: matrix.m41,
        y: matrix.m42,
        radius: radius ? Number.parseFloat(radius[1]) : 0,
        backgroundImage: style.backgroundImage,
      };
    })
  ));
}

async function expectAtRest(relief: Locator) {
  await expect.poll(async () => (
    (await readOffsets(relief)).every(({ x, y }) => (
      Math.abs(x) < 0.05 && Math.abs(y) < 0.05
    ))
  )).toBe(true);
  await expect(relief).not.toHaveAttribute("data-active", "true");
}

async function moveIntoMargin(page: Page, side: "left" | "right") {
  const viewport = page.viewportSize()!;
  await page.mouse.move(
    viewport.width * (side === "left" ? 0.04 : 0.96),
    viewport.height * (side === "left" ? 0.72 : 0.32),
    { steps: 12 },
  );
  const relief = page.locator(reliefSelector);
  await expect(relief).toHaveAttribute("data-active", "true");
  await expect.poll(async () => (
    Math.max(...(await readOffsets(relief)).map(({ x, y }) => Math.hypot(x, y)))
  )).toBeGreaterThan(2);
}

async function readContentGeometry(section: Locator) {
  return section.locator(
    '[data-layout="container"], h2, h3, p, [data-home-article-action]',
  ).evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      transform: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
    };
  }));
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

test.describe("homepage article relief parallax", () => {
  test.use({
    viewport: { width: 1440, height: 1000 },
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("moves decorative arcs independently while keeping their radii, gradients, and content fixed", async ({
    page,
  }) => {
    const { section, relief, errors } = await openInsights(page);
    await expect(relief).toHaveAttribute("data-state", "ready");
    await expect(relief).toHaveCSS("pointer-events", "none");
    await expectAtRest(relief);
    const before = await readContentGeometry(section);
    const restingArcs = await readOffsets(relief);
    expect(restingArcs.every(({ radius }) => radius > 0)).toBe(true);
    const restingSurfaces = restingArcs.map(({ radius, backgroundImage }) => ({
      radius, backgroundImage,
    }));

    await moveIntoMargin(page, "left");
    const left = await readOffsets(relief);
    expect(new Set(left.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)).size)
      .toBeGreaterThan(1);
    expect(left.every(({ x, y }) => Math.abs(x) <= 45 && Math.abs(y) <= 45))
      .toBe(true);
    expect(left.map(({ radius, backgroundImage }) => ({ radius, backgroundImage })))
      .toEqual(restingSurfaces);
    expect(await readContentGeometry(section)).toEqual(before);

    await moveIntoMargin(page, "right");
    await expect.poll(async () => {
      const right = await readOffsets(relief);
      return right.every(({ x, y }, index) => (
        Math.hypot(x - left[index].x, y - left[index].y) > 2
      ));
    }).toBe(true);
    const right = await readOffsets(relief);
    expect(right.every(({ x, y }) => (
      Math.abs(x) <= 45 && Math.abs(y) <= 45
    ))).toBe(true);
    expect(right.map(({ radius, backgroundImage }) => ({ radius, backgroundImage })))
      .toEqual(restingSurfaces);
    expect(await readContentGeometry(section)).toEqual(before);
    await expectNoOverflow(page);

    await page.mouse.move(20, 20);
    await expectAtRest(relief);
    expect((await readOffsets(relief)).map(({ radius, backgroundImage }) => ({
      radius, backgroundImage,
    }))).toEqual(restingSurfaces);
    expect(await readContentGeometry(section)).toEqual(before);
    expect(errors).toEqual([]);
  });

  test("clears displaced arcs after interrupted pointers, resize, and scrolling away", async ({
    page,
  }) => {
    const { section, relief, errors } = await openInsights(page);
    await expect(relief).toHaveAttribute("data-state", "ready");

    await moveIntoMargin(page, "left");
    await section.dispatchEvent("pointercancel", { pointerType: "mouse" });
    await expectAtRest(relief);

    await moveIntoMargin(page, "right");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expectAtRest(relief);

    await moveIntoMargin(page, "left");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await expectAtRest(relief);
    // Existing scroll scenes refresh after resizing and can restore their scroll.
    await page.waitForTimeout(400);
    await alignSection(section);

    await moveIntoMargin(page, "right");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expectAtRest(relief);
    await page.mouse.move(20, 20);
    await alignSection(section);
    await expectAtRest(relief);
    await moveIntoMargin(page, "left");
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test("responds to motion and contrast preferences without leaving transforms behind", async ({
    page,
  }) => {
    const { section, relief, errors } = await openInsights(page);
    await expect(relief).toHaveAttribute("data-state", "ready");
    await moveIntoMargin(page, "left");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(relief).toHaveAttribute("data-state", "static");
    await expectAtRest(relief);
    expect(await relief.locator(layerSelector).evaluateAll((layers) => (
      layers.every((layer) => (layer as HTMLElement).style.transform === "")
    ))).toBe(true);
    await page.mouse.move(1300, 400, { steps: 12 });
    await expectAtRest(relief);

    const articleLink = section.locator("[data-article-navigation]").first();
    await articleLink.focus();
    await expect(articleLink).toBeFocused();
    await expect(articleLink).toHaveCSS("outline-style", "solid");
    await expectAtRest(relief);

    await page.mouse.move(20, 20);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(relief).toHaveAttribute("data-state", "ready");
    await alignSection(section);
    await moveIntoMargin(page, "left");

    await page.emulateMedia({ forcedColors: "active" });
    await expect(relief).toHaveAttribute("data-state", "static");
    await expect(relief).toHaveCSS("display", "none");
    await expectAtRest(relief);
    await page.emulateMedia({ forcedColors: "none" });
    await expect(relief).toHaveAttribute("data-state", "ready");
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test("keeps tablet and mobile layouts static even when a mouse is present", async ({
    page,
  }) => {
    const { section, relief, errors } = await openInsights(page);
    for (const viewport of [
      { width: 900, height: 1000 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await alignSection(section);
      await expect(relief).toHaveAttribute("data-state", "static");
      await page.mouse.move(viewport.width * 0.85, viewport.height * 0.5);
      await expectAtRest(relief);
      await expectNoOverflow(page);
    }
    expect(errors).toEqual([]);
  });
});

test.describe("article relief on touch devices", () => {
  test.use({
    viewport: { width: 1280, height: 1000 },
    hasTouch: true,
    isMobile: true,
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("does not activate parallax on coarse pointers at a desktop width", async ({
    page,
  }) => {
    const { relief, errors } = await openInsights(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches))
      .toBe(true);
    await expect(relief).toHaveAttribute("data-state", "static");
    await page.touchscreen.tap(30, 600);
    await expectAtRest(relief);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });
});
