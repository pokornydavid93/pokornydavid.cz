import { expect, test, type Locator, type Page } from "@playwright/test";

const groupsSelector = "[data-services-page] [data-route-reveal-group]";
const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

async function openServices(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected", decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-09-13-web-privacy-v2",
    }));
  });
  await page.goto("/sluzby/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-unified-reveal-engine]"))
    .toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-services-page]"))
    .toHaveAttribute("data-route-reveal-profile", "staged");
}

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((scrollTop) => {
    if (window.__lenis?.scrollTo) {
      window.__lenis.scrollTo(scrollTop, { force: true, immediate: true });
    } else window.scrollTo({ top: scrollTop, behavior: "instant" });
  }, Math.max(0, top));
}

async function documentTop(target: Locator) {
  return target.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return window.scrollY + element.getBoundingClientRect().top - matrix.m42;
  });
}

async function readContent(group: Locator) {
  return group.evaluate((element) => {
    const items = Array.from(element.querySelectorAll<HTMLElement>("[data-route-reveal-item]"))
      .filter((item) => item.closest("[data-route-reveal-group]") === element);
    return (items.length ? items : [element]).map((target) => {
      const style = getComputedStyle(target);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return {
        part: target.getAttribute("data-route-reveal-item"),
        closedPanel: Boolean(target.closest('[role="region"][aria-hidden="true"]')),
        opacity: Number(style.opacity), y: matrix.m42,
        scale: Math.hypot(matrix.m11, matrix.m12, matrix.m13),
        rotation: Math.abs(Math.atan2(matrix.m23, matrix.m22) * 180 / Math.PI),
        visibility: style.visibility,
      };
    });
  });
}

async function expectReadable(group: Locator) {
  // Text is readable by 75%, while its separate depth motion can still finish.
  await expect.poll(async () => (await readContent(group))
    .filter((item) => !item.closedPanel).every((item) =>
      item.opacity > 0.9 && Math.abs(item.y) < 50 && item.rotation < 7.5,
    ), { timeout: 1_200, intervals: [50, 100, 100] }).toBe(true);
  for (const item of (await readContent(group)).filter((item) => !item.closedPanel)) {
    expect(item.scale).toBeGreaterThan(0.96);
    expect(item.rotation).toBeLessThan(7.5);
    expect(Math.abs(item.y)).toBeLessThan(50);
    expect(item.visibility).toBe("visible");
  }
}

async function expectSettled(group: Locator) {
  await expect.poll(async () => (await readContent(group)).every((item) =>
    item.opacity > 0.99 && Math.abs(item.y) < 0.6 &&
    Math.abs(item.scale - 1) < 0.001 && item.rotation < 0.05,
  )).toBe(true);
}

async function wheelTo(page: Page, top: number) {
  const initial = await page.evaluate(() => window.scrollY);
  const distance = top - initial;
  for (let step = 0; step < 6; step += 1) {
    await page.mouse.wheel(0, distance / 6);
    await page.waitForTimeout(110);
  }
  await expect.poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - top))
    .toBeLessThan(3);
}

test.describe("services staged scroll readability", () => {
  for (const viewport of viewports) {
    test(`stages individual parts and preserves readability and focus through accordion resizing at ${viewport.width}px`, async ({ page }) => {
      test.slow();
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await openServices(page);
      const groups = page.locator(groupsSelector);
      await expect(groups).toHaveCount(22);

      // Fast forward and reverse jumps exercise all catalog, context and action groups.
      const orderedGroups = await groups.all();
      for (const group of [...orderedGroups, ...orderedGroups.toReversed()]) {
        if (await group.evaluate((element) => Boolean(element.closest('[role="region"][aria-hidden="true"]')))) continue;
        await scrollImmediately(page, (await documentTop(group)) - viewport.height * 0.75);
        await expectReadable(group);
        await scrollImmediately(page, (await documentTop(group)) - viewport.height * 0.55);
        await expectSettled(group);
      }

      const row = page.locator("#service-group-03");
      const rowTop = await documentTop(row);
      await scrollImmediately(page, rowTop - viewport.height - 32);
      await expect.poll(async () => (await readContent(row))[0].opacity).toBeLessThan(0.02);
      const triggerBox = await row.getByRole("button").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { top: window.scrollY + rect.top, width: rect.width, height: rect.height };
      });
      await expect(row.locator("[data-services-accordion-content]"))
        .not.toHaveAttribute("data-route-reveal-item");
      for (const part of ["meta", "title", "body", "control", "detail"]) {
        expect(await row.locator(`[data-route-reveal-item="${part}"]`).count()).toBeGreaterThan(0);
      }
      await wheelTo(page, rowTop - viewport.height * 0.94);
      await page.waitForTimeout(450);
      const entering = (await readContent(row)).filter((item) => !item.closedPanel);
      const enteringTitle = entering.find((item) => item.part === "title")!;
      expect(enteringTitle.y).toBeGreaterThan(viewport.width === 1440 ? 24 : 16);
      expect(enteringTitle.rotation).toBeGreaterThan(2);
      expect(enteringTitle.scale).toBeLessThan(0.995);
      expect(Math.max(...entering.map((item) => item.opacity))).toBeLessThan(0.9);
      expect(Math.max(...entering.map((item) => item.opacity)) - Math.min(...entering.map((item) => item.opacity)))
        .toBeGreaterThan(0.12);
      await wheelTo(page, rowTop - viewport.height * 0.85);
      await page.waitForTimeout(450);
      const middleTitle = (await readContent(row)).find((item) => item.part === "title")!;
      expect(middleTitle.y).toBeGreaterThan(4);
      expect(middleTitle.y).toBeLessThan(enteringTitle.y - 4);
      expect(middleTitle.rotation).toBeLessThan(enteringTitle.rotation);
      expect(middleTitle.opacity).toBeGreaterThan(enteringTitle.opacity);
      const currentTriggerBox = await row.getByRole("button").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { top: window.scrollY + rect.top, width: rect.width, height: rect.height };
      });
      expect(Math.abs(currentTriggerBox.top - triggerBox.top)).toBeLessThan(0.5);
      expect(currentTriggerBox.width).toBeCloseTo(triggerBox.width, 2);
      expect(currentTriggerBox.height).toBeCloseTo(triggerBox.height, 2);
      await wheelTo(page, rowTop - viewport.height * 0.75);
      await expectReadable(row);
      await wheelTo(page, rowTop - viewport.height - 32);
      await expect.poll(async () => (await readContent(row))[0].opacity).toBeLessThan(0.02);
      await scrollImmediately(page, rowTop - viewport.height * 0.7);
      await expectReadable(row);
      await scrollImmediately(page, rowTop - viewport.height - 32);
      await expect.poll(async () => (await readContent(row))[0].opacity).toBeLessThan(0.02);

      const focusRow = page.locator("#service-group-02");
      const wrapper = focusRow.locator("[data-services-accordion-content]");
      await expect(wrapper.locator(":scope > h3")).toHaveCount(1);
      await expect(wrapper.locator(':scope > [role="region"]')).toHaveCount(1);
      const trigger = focusRow.getByRole("button");
      await scrollImmediately(page, (await documentTop(focusRow)) - viewport.height * 0.96);
      await trigger.evaluate((element) => element.focus({ preventScroll: true }));
      await expect(trigger).toBeFocused();
      await expectSettled(focusRow);

      const context = page.locator("[data-services-context-stage]");
      const before = await documentTop(context);
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(focusRow.getByRole("region")).toHaveAttribute("aria-hidden", "false");
      await expect.poll(async () => Math.abs((await documentTop(context)) - before)).toBeGreaterThan(4);
      await page.waitForTimeout(450);
      await expect(trigger).toBeFocused();
      await expectReadable(focusRow);
      await trigger.evaluate((element) => element.blur());
      await scrollImmediately(page, (await documentTop(context)) - viewport.height * 0.75);
      await expectReadable(context);
      if (viewport.width === 1440) {
        // Equal-height panel swaps still move intervening rows. Their trigger
        // positions must refresh even when the accordion's outer height does not.
        const firstTrigger = page.locator("#service-group-01").getByRole("button");
        const accordion = page.locator("[data-services-accordion]");
        const waitForPanelTransitions = () => expect.poll(() => accordion.evaluate((element) =>
          element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length,
        )).toBe(0);
        await firstTrigger.click();
        await waitForPanelTransitions();
        const heightBefore = (await accordion.boundingBox())!.height;
        const thirdTopBefore = await documentTop(row);
        const thirdTrigger = row.getByRole("button");
        await thirdTrigger.click();
        await waitForPanelTransitions();
        expect(Math.abs((await accordion.boundingBox())!.height - heightBefore)).toBeLessThan(1);
        expect(Math.abs((await documentTop(row)) - thirdTopBefore)).toBeGreaterThan(40);
        await thirdTrigger.evaluate((element) => element.blur());
        await scrollImmediately(page, (await documentTop(row)) - viewport.height - 32);
        await expect.poll(async () => (await readContent(row))[0].opacity).toBeLessThan(0.02);
        await scrollImmediately(page, (await documentTop(row)) - viewport.height * 0.75);
        await expectReadable(row);
      }
      if (viewport.width === 390) {
        const protection = page.locator("#service-group-04");
        const protectionTrigger = protection.getByRole("button");
        await protectionTrigger.click();
        await expect(protectionTrigger).toHaveAttribute("aria-expanded", "true");
        await page.waitForTimeout(450);
        await protectionTrigger.evaluate((element) => element.blur());
        await scrollImmediately(page, (await documentTop(protection)) - viewport.height * 0.55);
        await expectSettled(protection);
        const lastService = page.locator("#pojisteni-odpovednosti");
        await expect(lastService).toHaveAttribute("data-route-reveal-group", "row");
        expect((await lastService.boundingBox())!.y).toBeGreaterThan(viewport.height);
        await expect.poll(async () => Math.max(...(await readContent(lastService)).map((item) => item.opacity)))
          .toBeLessThan(0.02);
        const lastTop = await documentTop(lastService);
        await wheelTo(page, lastTop - viewport.height * 0.75);
        await expectReadable(lastService);
        await scrollImmediately(page, lastTop - viewport.height * 0.55);
        await expectSettled(lastService);
        await scrollImmediately(page, lastTop - viewport.height - 32);
        await expect.poll(async () => Math.max(...(await readContent(lastService)).map((item) => item.opacity)))
          .toBeLessThan(0.02);
        await expectSettled(protection);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      expect(errors).toEqual([]);
    });

    test(`cleans up every content group for live reduced motion and forced colors at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await openServices(page);
      const controller = page.locator("[data-unified-reveal-engine]");
      const groups = page.locator(groupsSelector);
      const row = page.locator("#service-group-03");
      await scrollImmediately(page, (await documentTop(row)) - viewport.height * 0.93);
      for (const mode of ["reduced-motion", "forced-colors"] as const) {
        await page.emulateMedia({
          reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference",
          forcedColors: mode === "forced-colors" ? "active" : "none",
        });
        await expect(controller).toHaveAttribute("data-state", mode);
        for (const group of await groups.all()) {
          await expect(group).toHaveAttribute("data-route-reveal-state", "static");
          for (const item of await readContent(group)) {
            expect(item.opacity).toBe(1);
            expect(item.y).toBe(0);
            expect(item.scale).toBe(1);
            if (!item.closedPanel) expect(item.visibility).toBe("visible");
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      }
      await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "none" });
      await expect(controller).toHaveAttribute("data-state", "ready");
      await scrollImmediately(page, (await documentTop(row)) - viewport.height * 0.75);
      await expectReadable(row);
    });
  }

  test("keeps all five accordion triggers, nine service links and the escape link stationary under the pointer", async ({ page }) => {
    test.slow();
    await page.setViewportSize(viewports[0]);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openServices(page);
    const rows = page.locator("[data-services-accordion-item]");
    await expect(rows).toHaveCount(5);
    await expect(rows.locator('[role="region"] a')).toHaveCount(9);

    const checkPointer = async (target: Locator) => {
      await expect(target).toHaveAttribute("data-cursor-no-magnetic");
      await scrollImmediately(page, (await documentTop(target)) - 250);
      await page.mouse.move(12, 180);
      await page.waitForTimeout(400);
      const before = (await target.boundingBox())!;
      for (const fraction of [0.25, 0.75]) {
        await page.mouse.move(before.x + before.width * fraction, before.y + before.height / 2, { steps: 6 });
        await expect(page.locator("[data-custom-cursor]")).toHaveAttribute("data-cursor-visible", "true");
        await expect.poll(() => target.evaluate((element) => element.matches(":hover")),
          { timeout: 1_000, intervals: [50, 50, 100] }).toBe(true);
        const samples = await target.evaluate((element) => new Promise<{ drift: number; writes: number; frames: number }>((resolve) => {
          const origin = element.getBoundingClientRect();
          const started = performance.now();
          let drift = 0;
          let writes = 0;
          let frames = 0;
          const sample = () => {
            frames += 1;
            const box = element.getBoundingClientRect();
            drift = Math.max(drift, Math.abs(box.x - origin.x), Math.abs(box.y - origin.y));
            const target = element as HTMLElement;
            if (target.dataset.cursorMagneticActive === "true" ||
              target.style.getPropertyValue("--cursor-magnetic-x") ||
              target.style.getPropertyValue("--cursor-magnetic-y")) writes += 1;
            if (performance.now() - started < 180 || frames < 4) requestAnimationFrame(sample);
            else resolve({ drift, writes, frames });
          };
          requestAnimationFrame(sample);
        }));
        expect(samples.frames).toBeGreaterThan(2);
        expect(samples.drift).toBeLessThanOrEqual(0.25);
        expect(samples.writes).toBe(0);
        const after = (await target.boundingBox())!;
        expect(Math.max(Math.abs(before.x - after.x), Math.abs(before.y - after.y))).toBeLessThanOrEqual(0.25);
      }
    };

    for (const row of await rows.all()) {
      const trigger = row.getByRole("button");
      await checkPointer(trigger);
      if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await page.waitForTimeout(450);
      for (const link of await row.locator('[role="region"] a').all()) await checkPointer(link);
    }
    await checkPointer(page.locator("[data-services-catalog-escape]"));
  });
});
