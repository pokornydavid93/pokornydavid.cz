import { expect, test, type Page } from "@playwright/test";

const STANDARD_RADIUS_TOKENS = [
  "--radius-primary",
  "--radius-control",
  "--radius-input",
  "--radius-card-compact",
  "--radius-card",
  "--radius-panel",
  "--radius-modal",
  "--radius-media",
  "--radius",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
  "--radius-2xl",
  "--radius-3xl",
  "--radius-4xl",
] as const;

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

async function resolveRadiusTokens(
  page: Page,
  tokens: readonly string[],
) {
  return page.evaluate((tokenNames) => {
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.inlineSize = "100px";
    probe.style.blockSize = "100px";
    probe.style.visibility = "hidden";
    document.body.append(probe);

    const values = Object.fromEntries(tokenNames.map((token) => {
      probe.style.borderRadius = `var(${token})`;
      return [token, getComputedStyle(probe).borderRadius];
    }));

    probe.remove();
    return values;
  }, tokens);
}

test.describe("site radius contract", () => {
  test.beforeEach(async ({ page }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("resolves standard homepage geometry from one 16px token", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });

    const tokens = await resolveRadiusTokens(page, STANDARD_RADIUS_TOKENS);
    expect(tokens).toEqual(Object.fromEntries(
      STANDARD_RADIUS_TOKENS.map((token) => [token, "16px"]),
    ));

    const standardSurfaces = page.locator("[data-home-article-media]");
    await expect(standardSurfaces).not.toHaveCount(0);

    const renderedRadii = await standardSurfaces.evaluateAll((elements) => (
      elements.map((element) => getComputedStyle(element).borderRadius)
    ));
    expect(new Set(renderedRadii)).toEqual(new Set(["0px"]));
    expect(await page.locator("[data-reference-card] > div").evaluateAll(
      (elements) => elements.map(
        (element) => getComputedStyle(element).borderRadius,
      ),
    )).toEqual(Array(5).fill("0px"));
    await expect(page.locator("[data-orientation-action]"))
      .toHaveCSS("border-radius", "999px");

    await expect(page.locator("[data-profile-portrait-frame]"))
      .toHaveCSS("border-radius", "0px");
    const activeSituationMarker = page.locator(
      '[data-situation-choice-marker][data-active="true"]',
    );
    await expect(activeSituationMarker).toHaveCount(1);
    await expect(activeSituationMarker).toHaveCSS("border-radius", "0px");
    const markerContainment = await activeSituationMarker.evaluate((marker) => {
      const activeChoice = document.querySelector<HTMLElement>(
        '[data-situation-choice][aria-selected="true"]',
      );
      if (!activeChoice) throw new Error("Missing active situation choice.");

      const markerRect = marker.getBoundingClientRect();
      const choiceRect = activeChoice.getBoundingClientRect();
      return {
        fitsInsideActiveChoice:
          markerRect.top >= choiceRect.top - 1
          && markerRect.right <= choiceRect.right + 1
          && markerRect.bottom <= choiceRect.bottom + 1
          && markerRect.left >= choiceRect.left - 1,
        nestedInsideActiveChoice: activeChoice.contains(marker),
      };
    });
    expect(markerContainment.nestedInsideActiveChoice).toBe(true);
    expect(markerContainment.fitsInsideActiveChoice).toBe(true);

    const conversionCtas = page.locator([
      '[data-component="site-header"] [data-analytics-placement="header"]',
      '[data-analytics-placement="hero"]',
      "[data-process-cta]",
      '[data-analytics-placement="final"]',
    ].join(","));
    await expect(conversionCtas).not.toHaveCount(0);
    expect(new Set(await conversionCtas.evaluateAll((elements) => (
      elements.map((element) => getComputedStyle(element).borderRadius)
    )))).toEqual(new Set(["999px"]));

    const exceptions = await resolveRadiusTokens(page, [
      "--radius-none",
      "--radius-checkbox",
      "--radius-cinematic-outer",
      "--radius-pill",
      "--radius-cta",
      "--button-cta-radius",
      "--radius-circle",
    ]);
    expect(exceptions).toEqual({
      "--radius-none": "0px",
      "--radius-checkbox": "4px",
      "--radius-cinematic-outer": "39px",
      "--radius-pill": "999px",
      "--radius-cta": "999px",
      "--button-cta-radius": "999px",
      "--radius-circle": "50%",
    });
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
  });

  test("keeps the 16px control radius on compact navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    const menuTrigger = page.getByRole("button", { name: "Otevřít menu" });
    await expect(menuTrigger).toBeVisible();
    await expect(menuTrigger).toHaveCSS("border-radius", "16px");
    await expect(page.locator("[data-orientation-action]"))
      .toHaveCSS("border-radius", "999px");
    await expect(page.locator("[data-reference-card] > div").first())
      .toHaveCSS("border-radius", "0px");
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
  });
});
