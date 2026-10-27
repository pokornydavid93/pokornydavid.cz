import { expect, test, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-09-13-web-privacy-v2";

const routes = [
  { path: "/kdo-jsem/", firstGroup: "[data-about-editorial] [data-route-reveal-group]" },
  { path: "/jak-pracuji/", firstGroup: "[data-process-intro]" },
  { path: "/sluzby/", firstGroup: "[data-services-catalog-intro]" },
  { path: "/reference/", firstGroup: "[data-reference-page] [data-route-reveal-group]" },
] as const;

async function seedCookieConsent(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      const decidedAt = Date.now();

      window.localStorage.setItem(
        key,
        JSON.stringify({
          choice: "rejected",
          decidedAt,
          expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
          version,
        }),
      );
    },
    { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION },
  );
}

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((scrollTop) => {
    const lenisWindow = window as Window & {
      __lenis?: {
        scrollTo?: (
          target: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    };

    if (lenisWindow.__lenis?.scrollTo) {
      lenisWindow.__lenis.scrollTo(scrollTop, {
        force: true,
        immediate: true,
      });
    } else {
      window.scrollTo(0, scrollTop);
    }
  }, top);
}

test.describe("unified route reveal engine", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  for (const viewport of [
    { label: "desktop", width: 1440, height: 900, mode: "cinematic" },
    { label: "mobile", width: 390, height: 844, mode: "compact" },
  ] as const) {
    test(`uses the staged content choreography on every editorial route on ${viewport.label}`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize(viewport);

      for (const route of routes) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });

        const controller = page.locator("[data-unified-reveal-engine]");
        const group = page.locator(route.firstGroup).first();

        await expect(controller).toHaveCount(1);
        await expect(controller).toHaveAttribute("data-state", "ready");
        await expect(controller).toHaveAttribute(
          "data-profile",
          "unified-editorial-depth",
        );
        await expect(controller).toHaveAttribute("data-mode", viewport.mode);
        await expect(page.locator("html")).toHaveAttribute(
          "data-reveal-engine",
          "unified",
        );
        await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);

        const groupTop = await group.evaluate(
          (element) => element.getBoundingClientRect().top + window.scrollY,
        );
        expect(await group.evaluate((element) => element.closest<HTMLElement>(
          "[data-route-reveal-profile]",
        )?.dataset.routeRevealProfile)).toBe("staged");
        const startRatio = 1;
        const endRatio = viewport.mode === "cinematic" ? 0.56 : 0.6;
        const start = groupTop - viewport.height * startRatio;
        const end = groupTop - viewport.height * endRatio;

        await scrollImmediately(page, Math.max(0, start - 32));
        await page.waitForTimeout(700);
        await expect(group).toHaveAttribute("data-route-reveal-state", "waiting");

        const readDepth = () => group.evaluate((element) => {
          const nestedGroups = "[data-route-reveal-group]";
          const ownedItems = Array.from(
            element.querySelectorAll<HTMLElement>("[data-route-reveal-item]"),
          ).filter((item) => item.closest(nestedGroups) === element);
          const target = ownedItems.find((item) => item.dataset.routeRevealItem === "title")
            ?? ownedItems[0] ?? element;
          const styles = getComputedStyle(target);
          const matrix = styles.transform === "none"
            ? new DOMMatrix()
            : new DOMMatrix(styles.transform);

          return {
            opacity: Number(styles.opacity),
            scale: Math.hypot(matrix.m11, matrix.m12, matrix.m13),
            y: matrix.m42,
          };
        });
        const beforeDepth = await readDepth();

        expect(beforeDepth.opacity).toBeLessThan(0.05);
        expect(beforeDepth.scale).toBeLessThan(0.995);
        expect(beforeDepth.y).toBeGreaterThanOrEqual(
          viewport.mode === "cinematic" ? 50 : 24,
        );

        await scrollImmediately(page, (start + end) / 2);
        await page.waitForTimeout(700);
        await expect(group).toHaveAttribute("data-route-reveal-state", "entering");
        const middleDepth = await readDepth();

        expect(middleDepth.opacity).toBeGreaterThan(0.1);
        expect(middleDepth.opacity).toBeGreaterThan(0.8);
        expect(middleDepth.scale).toBeGreaterThan(beforeDepth.scale);
        expect(middleDepth.scale).toBeLessThan(1);
        expect(middleDepth.y).toBeGreaterThan(0.5);
        expect(middleDepth.y).toBeLessThan(beforeDepth.y);

        await scrollImmediately(page, end + 48);
        await page.waitForTimeout(700);
        await expect(group).toHaveAttribute("data-route-reveal-state", "visible");

        const isSettled = () => group.evaluate((element) => {
          const nestedGroups = "[data-route-reveal-group]";
          const ownedItems = Array.from(
            element.querySelectorAll<HTMLElement>("[data-route-reveal-item]"),
          ).filter((item) => item.closest(nestedGroups) === element);
          const targets = ownedItems.length > 0
            ? ownedItems
            : [element as HTMLElement];

          return targets.every((target) => {
            const styles = getComputedStyle(target);
            const matrix = styles.transform === "none"
              ? new DOMMatrix()
              : new DOMMatrix(styles.transform);

            return Number(styles.opacity) > 0.99 && Math.abs(matrix.m42) < 0.6;
          });
        });
        await expect.poll(isSettled).toBe(true);

        await scrollImmediately(page, Math.max(0, start - 32));
        await page.waitForTimeout(700);
        await expect(group).toHaveAttribute("data-route-reveal-state", "waiting");

        await scrollImmediately(
          page,
          await page.evaluate(
            () =>
              Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
              ) - window.innerHeight,
          ),
        );
        await expect(page.locator('[data-component="site-footer"]')).toHaveAttribute(
          "data-route-reveal-state",
          "visible",
        );
      }
    });
  }

  test("keeps focused content readable during scroll catch-up", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-unified-reveal-engine]")).toHaveAttribute(
      "data-state",
      "ready",
    );
    const row = page.locator("#registrace-cnb");
    const top = await row.evaluate((element) => {
      const style = getComputedStyle(element);
      const matrix = new DOMMatrixReadOnly(
        style.transform === "none" ? undefined : style.transform,
      );
      return window.scrollY + element.getBoundingClientRect().top - matrix.m42;
    });
    const readMaximumOpacity = () => row.evaluate((element) => Math.max(
      ...Array.from(element.querySelectorAll<HTMLElement>("[data-route-reveal-item]"))
        .map((item) => Number(getComputedStyle(item).opacity)),
    ));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await scrollImmediately(page, top - 900 - 32);
      await expect.poll(readMaximumOpacity).toBeLessThan(0.02);

      await scrollImmediately(page, top - 900 * 0.92);
      await page.waitForTimeout(100);
      await row.getByRole("link").focus();
      const samples = await row.evaluate((element) => new Promise<{
        opacity: number; y: number; focused: boolean;
      }[]>((resolve) => {
        const frames: { opacity: number; y: number; focused: boolean }[] = [];
        const start = performance.now();
        const parts = Array.from(element.querySelectorAll<HTMLElement>("[data-route-reveal-item]"));
        const sample = () => {
          for (const part of parts) {
            const style = getComputedStyle(part);
            const matrix = new DOMMatrixReadOnly(
              style.transform === "none" ? undefined : style.transform,
            );
            frames.push({
              opacity: Number(style.opacity), y: matrix.m42,
              focused: element.contains(document.activeElement),
            });
          }
          if (performance.now() - start < 300) requestAnimationFrame(sample);
          else resolve(frames);
        };
        requestAnimationFrame(sample);
      }));
      expect(samples.length).toBeGreaterThan(2);
      expect(samples.every((frame) =>
        frame.focused && frame.opacity > 0.99 && Math.abs(frame.y) < 0.6,
      )).toBe(true);

      await row.getByRole("link").evaluate((element) => element.blur());
      await scrollImmediately(page, top - 900 - 32);
      await expect.poll(readMaximumOpacity).toBeLessThan(0.02);
    }
  });

  test("keeps every route and footer static with reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const controller = page.locator("[data-unified-reveal-engine]");
      const groups = page.locator("[data-route-reveal-group]");

      await expect(controller).toHaveAttribute("data-state", "reduced-motion");
      await expect(groups.first()).toHaveAttribute(
        "data-route-reveal-state",
        "static",
      );
      await expect(page.locator('[data-component="site-footer"]')).toHaveAttribute(
        "data-route-reveal-state",
        "static",
      );

      const allStatic = await groups.evaluateAll((elements) =>
        elements.every((element) => {
          const nestedGroups = "[data-route-reveal-group]";
          const ownedItems = Array.from(
            element.querySelectorAll<HTMLElement>("[data-route-reveal-item]"),
          ).filter((item) => item.closest(nestedGroups) === element);
          const targets = ownedItems.length > 0
            ? ownedItems
            : [element as HTMLElement];

          return targets.every((target) => {
            const styles = getComputedStyle(target);
            return (
              styles.opacity === "1" &&
              (styles.visibility === "visible" ||
                target.closest('[role="region"][aria-hidden="true"]') !== null) &&
              styles.transform === "none"
            );
          });
        }),
      );

      expect(allStatic).toBe(true);
    }
  });
});
