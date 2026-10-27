import { expect, test, type Page } from "@playwright/test";

const EVIDENCE = '[data-home-module="evidence"]';
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

test.describe("homepage evidence register motion", () => {
  test("scrubs the evidence register in both scroll directions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);

    const evidence = page.locator(EVIDENCE);
    const rows = evidence.locator("[data-evidence-row]");

    await expect(rows).toHaveCount(3);
    expect(await rows.evaluateAll((items) => items.map(
      (item) => item.getAttribute("data-evidence-row"),
    ))).toEqual(["cnb", "sab", "exams"]);
    await expect(evidence.locator("[data-evidence-reveal-rule]")).toHaveCount(2);
    await expect(evidence.locator("[data-evidence-word-ink]")).toHaveCount(9);
    await expect(evidence).toHaveAttribute("data-evidence-motion", "enhanced");
    await expect(evidence).toHaveAttribute(
      "data-evidence-motion-state",
      "waiting",
    );

    await evidence.evaluate((element) => {
      const bottom = element.getBoundingClientRect().bottom + window.scrollY;
      window.scrollTo({
        behavior: "instant",
        top: bottom - window.innerHeight * 0.46,
      });
    });
    await expect(evidence).toHaveAttribute(
      "data-evidence-motion-state",
      "complete",
    );

    const revealed = await evidence.evaluate((element) => ({
      leadOpacity: Number.parseFloat(getComputedStyle(
        element.querySelector<HTMLElement>("[data-evidence-lead-ink]")!,
      ).opacity),
      rowOpacities: Array.from(
        element.querySelectorAll<HTMLElement>("[data-evidence-row]"),
        (row) => Number.parseFloat(getComputedStyle(row).opacity),
      ),
      wordOpacities: Array.from(
        element.querySelectorAll<HTMLElement>("[data-evidence-word-ink]"),
        (word) => Number.parseFloat(getComputedStyle(word).opacity),
      ),
    }));
    expect(revealed.leadOpacity).toBe(1);
    expect(revealed.rowOpacities).toEqual([1, 1, 1]);
    expect(revealed.wordOpacities.every((opacity) => opacity === 1)).toBe(true);

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(evidence).toHaveAttribute(
      "data-evidence-motion-state",
      "waiting",
    );
    await expect.poll(() => rows.evaluateAll((items) => items.every(
      (row) => Number.parseFloat(getComputedStyle(row).opacity) < 0.05,
    ))).toBe(true);

    await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
    await expect(evidence).toHaveAttribute(
      "data-evidence-motion-state",
      "waiting",
    );
    await expect(evidence).toHaveAttribute("data-cinematic-motion", "waiting");
    await expect.poll(() => rows.evaluateAll((items) => items.every(
      (row) => Number.parseFloat(getComputedStyle(row).opacity) < 0.05,
    ))).toBe(true);
  });

  test("keeps the three-source register static and readable with reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    const evidence = page.locator(EVIDENCE);
    await expect(evidence).toHaveAttribute("data-cinematic-motion", "static");
    await expect(evidence).toHaveAttribute(
      "data-evidence-motion-state",
      "complete",
    );
    await expect(evidence.locator("[data-evidence-row]")).toHaveCount(3);
    await expect(evidence.getByRole("heading", {
      level: 2,
      name: "Důvěru stavím na tom, co si můžete sami ověřit.",
    })).toBeVisible();
    await expect(evidence.getByRole("link", {
      name: "Ověřit registraci v registru ČNB (otevře se v nové kartě)",
    })).toBeVisible();
    await expect(evidence.getByRole("link", {
      name: "Otevřít dokumentaci společnosti SAB servis (otevře se v nové kartě)",
    })).toBeVisible();
    await expect(evidence.locator("[data-evidence-certificate]")).toHaveCount(4);
  });
});
