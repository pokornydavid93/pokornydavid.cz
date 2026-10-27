import { expect, test, type Page } from "@playwright/test";

const FAQ = '[data-home-module="faq"]';
const CONTROLLER = "[data-home-cinematic-scroll]";

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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Escape");
  await expect(page.locator(CONTROLLER)).not.toHaveAttribute(
    "data-state",
    "loading",
  );
}

test.describe("homepage FAQ motion", () => {
  test("reverses the editorial reveal and preserves the accordion state", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);

    const faq = page.locator(FAQ);
    const rows = faq.locator("[data-faq-reveal-row]");
    const firstQuestion = faq.getByRole("button", {
      name: "Co se stane po odeslání?",
    });

    await expect(faq.locator("[data-faq-reveal-rule]")).toHaveCount(2);
    await expect(faq.locator("[data-faq-word-ink]")).toHaveCount(5);
    await expect(rows).toHaveCount(4);
    await expect(faq).toHaveAttribute("data-faq-motion", "enhanced");
    await expect(faq).toHaveAttribute("data-faq-motion-state", "waiting");
    await expect(firstQuestion).toHaveAttribute("aria-expanded", "true");

    await faq.evaluate((element) => {
      const bottom = element.getBoundingClientRect().bottom + window.scrollY;
      window.scrollTo({
        behavior: "instant",
        top: bottom - window.innerHeight * 0.46,
      });
    });

    await expect(faq).toHaveAttribute("data-faq-motion-state", "complete");
    await expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#home-faq-after-contact-panel")).toBeVisible();
    expect(await rows.evaluateAll((items) => items.every((row) => {
      const style = getComputedStyle(row);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return Number.parseFloat(style.opacity) === 1
        && Math.abs(matrix.m42) < 0.5;
    }))).toBe(true);

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(faq).toHaveAttribute("data-faq-motion-state", "waiting");
    await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
    await expect(faq).toHaveAttribute("data-faq-motion-state", "waiting");
    await expect(faq).toHaveAttribute("data-cinematic-motion", "waiting");
  });

  test("settles before keyboard interaction and stays static with reduced motion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    const faq = page.locator(FAQ);
    const secondQuestion = faq.getByRole("button", {
      name: "Je první kontakt nezávazný?",
    });

    await secondQuestion.focus();
    await expect(faq).toHaveAttribute(
      "data-faq-motion-state",
      /revealing|complete/u,
    );
    await expect(secondQuestion).toBeFocused();
    await expect.poll(() => secondQuestion.evaluate((element) =>
      Number.parseFloat(getComputedStyle(
        element.closest<HTMLElement>("[data-faq-reveal-row]")!,
      ).opacity))).toBeGreaterThan(0.2);
    await page.keyboard.press("Enter");
    await expect(secondQuestion).toHaveAttribute("aria-expanded", "true");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");
    await expect(page.locator(CONTROLLER)).not.toHaveAttribute(
      "data-state",
      "loading",
    );

    const reducedFaq = page.locator(FAQ);
    await expect(reducedFaq).toHaveAttribute("data-cinematic-motion", "static");
    await expect(reducedFaq).toHaveAttribute(
      "data-faq-motion-state",
      "complete",
    );
    await expect(reducedFaq.locator("[data-faq-reveal-row]")).toHaveCount(4);
    await expect(reducedFaq.getByRole("heading", {
      level: 2,
      name: "Jak spolupráce funguje v praxi.",
    })).toBeVisible();
  });
});
