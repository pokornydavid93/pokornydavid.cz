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

test.describe("mobile CTA sizing", () => {
  test("keeps action pills content-sized without shrinking their touch target", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 515, height: 682 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.keyboard.press("Escape");

      const ctas = page.locator('[data-cta-composition="docked"]:visible');
      await expect(ctas.first()).toBeVisible();

      const measurements = await ctas.evaluateAll((elements) => elements.map(
        (element) => {
          const rect = element.getBoundingClientRect();
          const parentRect = element.parentElement?.getBoundingClientRect();

          return {
            height: rect.height,
            parentWidth: parentRect?.width ?? window.innerWidth,
            text: element.textContent?.replace(/\s+/gu, " ").trim() ?? "",
            width: rect.width,
          };
        },
      ));

      for (const measurement of measurements) {
        expect(measurement.height, measurement.text).toBeGreaterThanOrEqual(44);
        expect(measurement.width, measurement.text)
          .toBeLessThanOrEqual(viewport.width - 64);

        if (measurement.parentWidth >= viewport.width - 64) {
          expect(measurement.width, measurement.text)
            .toBeLessThan(measurement.parentWidth - 16);
        }
      }

      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth
          <= document.documentElement.clientWidth + 1
      ))).toBe(true);
    }
  });

  test("keeps standalone route hero CTAs intrinsic on a phone", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of [
      { path: "/sluzby", source: "services" },
      { path: "/jak-pracuji", source: "process" },
      { path: "/kdo-jsem", source: "about" },
    ]) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const cta = page.locator(
        `a[href*="source=${route.source}&cta=${route.source}-hero"]`,
      );
      await expect(cta).toBeVisible();

      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeLessThan(326);
      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth
          <= document.documentElement.clientWidth + 1
      ))).toBe(true);
    }
  });
});
