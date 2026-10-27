import { expect, test, type Page } from "@playwright/test";

async function primeRejectedConsent(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-05-05-ga4-v1",
    }));
  });
}

test.describe("process to references boundary", () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    test(`keeps a direct, non-pinned boundary at ${viewport.width}×${viewport.height}`, async ({
      page,
    }) => {
      await primeRejectedConsent(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });

      const process = page.locator('[data-home-module="process"]');
      const references = page.locator('[data-home-module="references"]');

      await expect(process.locator("[data-process-reveal]")).toHaveAttribute(
        "data-sequence",
        "static",
      );
      await expect(page.locator("[data-process-references-flow]")).toHaveCount(0);
      await expect(page.locator("[data-process-references-reveal]")).toHaveCount(0);
      await expect(page.locator("[data-references-intro-reveal]")).toHaveCount(0);
      await expect(page.locator(".pin-spacer-home-process-references-handoff"))
        .toHaveCount(0);
      await expect(process.locator("[data-process-pin-stage]")).toHaveCount(0);
      await expect(references).not.toHaveAttribute("inert", "");

      const boundary = await page.evaluate(() => {
        const processSection = document.querySelector<HTMLElement>(
          '[data-home-module="process"]',
        )!;
        const referenceSection = document.querySelector<HTMLElement>(
          '[data-home-module="references"]',
        )!;
        const reveal = referenceSection.querySelector<HTMLElement>(
          "[data-references-content]",
        );
        return {
          processBottom: processSection.offsetTop + processSection.offsetHeight,
          referenceTop: referenceSection.offsetTop,
          referenceTransform: getComputedStyle(referenceSection).transform,
          revealClipPath: reveal ? getComputedStyle(reveal).clipPath : "none",
          revealTransform: reveal ? getComputedStyle(reveal).transform : "none",
        };
      });

      expect(Math.abs(boundary.referenceTop - boundary.processBottom))
        .toBeLessThanOrEqual(1);
      expect(boundary.referenceTransform).toBe("none");
      expect(boundary.revealClipPath).toBe("none");
      expect(boundary.revealTransform).toBe("none");
      expect(await page.evaluate(() => (
        document.documentElement.scrollWidth
        - document.documentElement.clientWidth
      ))).toBeLessThanOrEqual(1);
    });
  }
});
