import { expect, test, type Locator, type Page } from "@playwright/test";

const sceneSelector = "[data-about-parallax-scene]";
const layerSelector = "[data-about-relief]";
const controllerSelector = "[data-about-parallax-controller]";

async function openAbout(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/kdo-jsem/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const rejectCookies = page.getByRole("button", { name: "Ne, díky", exact: true });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  const scenes = page.locator(sceneSelector);
  await expect(scenes).toHaveCount(2);
  for (const scene of await scenes.all()) {
    await expect(scene.locator(layerSelector)).toHaveCount(2);
    for (const layer of await scene.locator(layerSelector).all()) {
      expect(await layer.evaluate((element) => Boolean(element.closest('[aria-hidden="true"]'))))
        .toBe(true);
      await expect(layer).toHaveCSS("pointer-events", "none");
    }
  }
  return { scenes, errors };
}

async function alignScene(scene: Locator) {
  await scene.evaluate((element) => window.scrollTo({
    top: window.scrollY + element.getBoundingClientRect().top - 100,
    behavior: "instant",
  }));
  await expect.poll(async () => Math.abs((await scene.boundingBox())!.y - 100))
    .toBeLessThanOrEqual(1);
}

async function readLayers(scene: Locator) {
  return scene.locator(layerSelector).evaluateAll((layers) => layers.map((layer) => {
    const style = getComputedStyle(layer);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return {
      x: matrix.m41, y: matrix.m42,
      shape: {
        background: style.backgroundImage,
        width: style.width, height: style.height,
        borderRadius: style.borderRadius,
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.m13, matrix.m23, matrix.m31, matrix.m32, matrix.m33, matrix.m34, matrix.m43],
      },
    };
  }));
}

async function readContent(scene: Locator) {
  return scene.locator(
    ":scope > [class*='inner'], h2, h3, p, [data-about-principle-copy], [data-about-principle-title-line], [data-about-agreement-expected-line]",
  ).evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      transform: style.transform, opacity: style.opacity, filter: style.filter,
    };
  }));
}

async function settleContent(scene: Locator) {
  let previous = "";
  let stableSamples = 0;
  await expect.poll(async () => {
    const current = JSON.stringify(await readContent(scene));
    stableSamples = current === previous ? stableSamples + 1 : 0;
    previous = current;
    return stableSamples;
  }, { intervals: [100], timeout: 10_000 }).toBeGreaterThanOrEqual(3);
}

async function expectAtRest(scene: Locator) {
  await expect.poll(async () => (await readLayers(scene)).every(({ x, y }) => (
    Math.abs(x) < 0.05 && Math.abs(y) < 0.05
  ))).toBe(true);
  await expect(scene).not.toHaveAttribute("data-about-parallax-active", "true");
}

async function moveToSide(page: Page, scene: Locator, side: "left" | "right") {
  const box = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  const top = Math.max(0, box.y);
  const bottom = Math.min(viewport.height, box.y + box.height);
  await page.mouse.move(
    box.x + box.width * (side === "left" ? 0.05 : 0.95),
    top + (bottom - top) * (side === "left" ? 0.7 : 0.3),
    { steps: 12 },
  );
  await expect(scene).toHaveAttribute("data-about-parallax-active", "true");
  await expect.poll(async () => Math.max(
    ...(await readLayers(scene)).map(({ x, y }) => Math.hypot(x, y)),
  )).toBeGreaterThan(2);
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => (
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

test.describe("about page decorative relief parallax", () => {
  test.use({
    viewport: { width: 1440, height: 1000 },
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("translates both scenes' reliefs independently without moving content or changing their geometry", async ({ page }) => {
    const { scenes, errors } = await openAbout(page);
    await expect(page.locator(controllerSelector)).toHaveAttribute("data-state", "ready");
    for (const scene of await scenes.all()) {
      await page.mouse.move(20, 20);
      await alignScene(scene);
      await expect(scene).toHaveAttribute("data-about-parallax", "ready");
      await settleContent(scene);
      await expectAtRest(scene);
      const content = await readContent(scene);
      const shapes = (await readLayers(scene)).map(({ shape }) => shape);
      expect(shapes.every(({ background }) => background.includes("gradient")))
        .toBe(true);
      for (const { matrix } of shapes) {
        expect(Math.abs(matrix[0])).toBe(1);
        expect(matrix.slice(1)).toEqual([0, 0, 1, 0, 0, 0, 0, 1, 0, 0]);
      }

      await moveToSide(page, scene, "left");
      const left = await readLayers(scene);
      expect(new Set(left.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)).size)
        .toBe(2);
      expect(left.every(({ x, y }) => Math.abs(x) <= 45 && Math.abs(y) <= 45))
        .toBe(true);
      expect(left.map(({ shape }) => shape)).toEqual(shapes);
      expect(await readContent(scene)).toEqual(content);

      await moveToSide(page, scene, "right");
      await expect.poll(async () => (await readLayers(scene)).every(({ x, y }, index) => (
        Math.hypot(x - left[index].x, y - left[index].y) > 1
      ))).toBe(true);
      expect((await readLayers(scene)).map(({ shape }) => shape)).toEqual(shapes);
      expect(await readContent(scene)).toEqual(content);

      await page.mouse.move(20, 20);
      await expectAtRest(scene);
      expect(await readContent(scene)).toEqual(content);
    }
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test("resets interrupted scenes and responds to live motion and contrast preferences", async ({ page }) => {
    const { scenes, errors } = await openAbout(page);
    const controller = page.locator(controllerSelector);
    await expect(controller).toHaveAttribute("data-state", "ready");
    for (const scene of await scenes.all()) {
      await alignScene(scene);
      await moveToSide(page, scene, "left");
      await scene.dispatchEvent("pointercancel", { pointerType: "mouse" });
      await expectAtRest(scene);
      await moveToSide(page, scene, "right");
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await expectAtRest(scene);
      await moveToSide(page, scene, "left");
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expectAtRest(scene);
    }

    for (const preference of ["reduced", "contrast"] as const) {
      const activeScene = scenes.nth(preference === "reduced" ? 0 : 1);
      await alignScene(activeScene);
      await moveToSide(page, activeScene, "right");
      await page.emulateMedia(preference === "reduced"
        ? { reducedMotion: "reduce" } : { forcedColors: "active" });
      await expect(controller).toHaveAttribute("data-state", "static");
      for (const scene of await scenes.all()) {
        await expect(scene).not.toHaveAttribute("data-about-parallax", "ready");
        await expectAtRest(scene);
        if (preference === "contrast") {
          for (const layer of await scene.locator(layerSelector).all()) {
            await expect(layer).toBeHidden();
          }
        }
      }
      await page.mouse.move(20, 20);
      await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "none" });
      await expect(controller).toHaveAttribute("data-state", "ready");
    }
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });

  test("keeps compact scenes static and readable through their middle and final rows", async ({ page }) => {
    const { scenes, errors } = await openAbout(page);
    for (const viewport of [
      { width: 900, height: 1000 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.locator(controllerSelector)).toHaveAttribute("data-state", "static");
      for (const scene of await scenes.all()) {
        await expect(scene).not.toHaveAttribute("data-about-parallax", "ready");
        const rows = scene.locator("[data-about-principle], [data-about-agreement-row]");
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(3);
        for (const index of [Math.floor(count / 2), count - 1]) {
          const row = rows.nth(index);
          await row.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
          await settleContent(scene);
          await expect(row.locator("h3")).toBeInViewport();
          const content = await readContent(scene);
          const shapes = (await readLayers(scene)).map(({ shape }) => shape);
          await page.mouse.move(viewport.width * 0.9, viewport.height * 0.5, { steps: 6 });
          await expectAtRest(scene);
          expect(await readContent(scene)).toEqual(content);
          expect((await readLayers(scene)).map(({ shape }) => shape)).toEqual(shapes);
          // Decorative canvases still cover the row's viewport after scrolling.
          expect(await scene.locator(layerSelector).first().evaluate((layer) => {
            const rect = layer.parentElement!.getBoundingClientRect();
            return rect.bottom > 0 && rect.top < innerHeight && rect.left < innerWidth && rect.right > 0;
          })).toBe(true);
          await expectNoOverflow(page);
        }
      }
    }
    expect(errors).toEqual([]);
  });
});

test.describe("about relief on touch devices", () => {
  test.use({
    viewport: { width: 1280, height: 1000 },
    hasTouch: true,
    isMobile: true,
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("keeps both scenes static on a coarse pointer at desktop width", async ({ page }) => {
    const { scenes, errors } = await openAbout(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    await expect(page.locator(controllerSelector)).toHaveAttribute("data-state", "static");
    for (const scene of await scenes.all()) {
      await alignScene(scene);
      await page.touchscreen.tap(30, 600);
      await expectAtRest(scene);
      await expect(scene).not.toHaveAttribute("data-about-parallax", "ready");
    }
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  });
});
