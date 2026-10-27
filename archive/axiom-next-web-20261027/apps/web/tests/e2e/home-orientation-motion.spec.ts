import { expect, test, type Page } from "@playwright/test";

const ORIENTATION = "[data-orientation-surface]";
const CONTROLLER = "[data-orientation-reveal]";

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

async function openHomepage(page: Page) {
  await primeRejectedConsent(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Escape");
  await expect(page.locator(CONTROLLER)).not.toHaveAttribute(
    "data-state",
    "loading",
  );
}

test.describe("homepage orientation CTA motion system", () => {
  test("uses the shared scroll reveal grammar and reverses with scroll", async ({
    page,
  }) => {
    await openHomepage(page);

    const controller = page.locator(CONTROLLER);
    const orientation = page.locator(ORIENTATION);
    await expect(controller).toHaveAttribute("data-sequence", "scroll-linked");
    await expect(orientation).toHaveAttribute(
      "data-orientation-motion-state",
      "waiting",
    );
    await expect(orientation.locator("[data-orientation-rule]")).toHaveCount(2);
    await expect(orientation.locator("[data-orientation-word-ink]")).toHaveCount(
      6,
    );

    await orientation.evaluate((element) => {
      const bottom = element.getBoundingClientRect().bottom + window.scrollY;
      window.scrollTo({
        behavior: "instant",
        top: bottom - window.innerHeight * 0.46,
      });
    });
    await expect(controller).toHaveAttribute("data-state", "complete");
    await expect(orientation).toHaveAttribute(
      "data-orientation-motion-state",
      "complete",
    );

    const visibleState = await orientation.evaluate((element) => {
      const read = (selector: string) => {
        const style = getComputedStyle(
          element.querySelector<HTMLElement>(selector)!,
        );
        return {
          clipPath: style.clipPath,
          opacity: Number.parseFloat(style.opacity),
          transform: style.transform,
        };
      };

      return {
        action: read("[data-orientation-action-rail]"),
        description: read("[data-orientation-description-ink]"),
        heading: read("[data-orientation-word-ink]"),
      };
    });
    expect(visibleState.action.opacity).toBe(1);
    expect(visibleState.description.opacity).toBe(1);
    expect(visibleState.heading.opacity).toBe(1);

    await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute("data-phase", "waiting");
    await expect(orientation).toHaveAttribute(
      "data-orientation-motion-state",
      "waiting",
    );
  });

  test("keeps a static readable CTA for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHomepage(page);

    const controller = page.locator(CONTROLLER);
    const orientation = page.locator(ORIENTATION);
    await expect(controller).toHaveAttribute("data-state", "reduced-motion");
    await expect(controller).toHaveAttribute("data-sequence", "static");
    await expect(orientation.getByRole("heading", {
      name: "Když nevíte, kde začít, začneme přehledem.",
    })).toBeVisible();
    await expect(orientation.getByRole("link", {
      name: "Získat přehled",
    })).toBeVisible();
  });
});
