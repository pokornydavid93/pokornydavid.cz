import { expect, test } from "@playwright/test";

const toneContracts = {
  dark: {
    surfaces: "--surface-page --surface-card-dark --surface-action-dark",
    sources: [
      "--border-on-dark-subtle",
      "--border-on-dark-default",
      "--border-on-dark-emphasis",
    ],
    resolved: [
      "rgba(234, 255, 208, 0.08)",
      "rgba(234, 255, 208, 0.14)",
      "rgba(176, 228, 84, 0.32)",
    ],
    worstSurfaces: ["--surface-page", "--surface-page", "--surface-action-dark"],
    focusSource: "--focus-ring-on-dark",
  },
  light: {
    surfaces: "--surface-paper --surface-card-light",
    sources: [
      "--border-on-light-subtle",
      "--border-on-light-default",
      "--border-on-light-emphasis",
    ],
    resolved: [
      "rgba(13, 13, 13, 0.1)",
      "rgba(13, 13, 13, 0.16)",
      "rgba(34, 79, 16, 0.32)",
    ],
    worstSurfaces: ["--surface-paper", "--surface-paper", "--surface-paper"],
    focusSource: "--focus-ring-on-light",
  },
  action: {
    surfaces: "--surface-action",
    sources: [
      "--border-on-action-subtle",
      "--border-on-action-default",
      "--border-on-action-emphasis",
    ],
    resolved: [
      "rgba(13, 13, 13, 0.1)",
      "rgba(13, 13, 13, 0.16)",
      "rgba(13, 13, 13, 0.32)",
    ],
    worstSurfaces: ["--surface-action", "--surface-action", "--surface-action"],
    focusSource: "--focus-ring-on-action",
  },
} as const;

const levels = ["subtle", "default", "emphasis"] as const;

function ratioFromText(value: string | null) {
  return Number.parseFloat(value?.match(/[\d.]+/)?.[0] ?? "0");
}

test.describe("design language borders", () => {
  test("keeps structural, edge, and focus contracts separate", async ({ page }) => {
    await page.goto("/design-language/borders/");

    const main = page.locator("main");
    await expect(main.locator("[data-border-tone]")).toHaveCount(3);
    await expect(main.locator("[data-focus-tone]")).toHaveCount(3);
    await expect(main.locator("[data-edge-semantic]")).toHaveCount(3);

    for (const tone of ["dark", "light", "action"] as const) {
      const expected = toneContracts[tone];
      const structural = main.locator(`[data-border-tone="${tone}"]`);
      await expect(structural).toHaveAttribute("data-surface-tone", tone);
      await expect(structural).toHaveAttribute(
        "data-tone-surfaces",
        expected.surfaces,
      );
      await expect(structural.locator("[data-border-level]")).toHaveCount(3);
      await expect(structural).not.toContainText("not read");
      await expect(structural).not.toContainText("not defined");
      await expect(structural).not.toContainText("pending");

      for (const [index, level] of levels.entries()) {
        const row = structural.locator(`[data-border-level="${level}"]`);
        await expect(row).toContainText(expected.sources[index]);
        await expect(row.locator("[data-border-resolved]")).toHaveText(
          expected.resolved[index],
        );
        await expect(row.locator("[data-border-minimum]")).toContainText(
          expected.worstSurfaces[index],
        );
        expect(
          ratioFromText(await row.locator("[data-border-minimum]").textContent()),
        ).toBeLessThan(3);
        await expect(row.locator("i")).toHaveCSS(
          "border-top-color",
          expected.resolved[index],
        );
      }

      const focus = main.locator(`[data-focus-tone="${tone}"]`);
      await expect(focus).toHaveAttribute("data-surface-tone", tone);
      await expect(focus).toContainText(expected.focusSource);
      await expect(focus).not.toContainText("pending");
      expect(
        ratioFromText(await focus.locator("[data-focus-minimum]").textContent()),
      ).toBeGreaterThanOrEqual(3);

      const control = focus.locator("[data-focus-control]");
      await expect(control).toHaveCSS("outline-width", "2px");
      await expect(control).toHaveCSS("outline-offset", "3px");
      await expect(control).toHaveCSS("box-shadow", "none");
      await expect(control).toHaveCSS("background-image", "none");
    }

    const lightStructural = main.locator('[data-border-tone="light"]');
    await expect(lightStructural).toHaveCSS("color", "rgb(13, 13, 13)");
    await expect(lightStructural.locator("header p")).toHaveCSS(
      "color",
      "rgba(13, 13, 13, 0.58)",
    );
    await expect(
      lightStructural.locator('[data-border-level="emphasis"] p'),
    ).toHaveCSS("color", "rgba(13, 13, 13, 0.68)");

    await expect(main.locator('[data-edge-semantic="surface"]')).toContainText(
      "--surface-*-edge",
    );
    await expect(
      main.locator('[data-edge-semantic="structural"]'),
    ).toContainText("--border-subtle / --border-default / --border-emphasis");
    await expect(
      main.locator('[data-edge-semantic="functional"]'),
    ).toContainText("--border-control / --border-state");
    await expect(main).toContainText(
      "Žádný structural border pod 3:1 není jediným indikátorem",
    );
    await expect(main).toContainText(
      "Silnější strukturální oddělení. Může podporovat významový stav, nikdy jej nenese samo.",
    );

    const removedTokens = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return [
        styles.getPropertyValue("--border-accent-on-dark-emphasis").trim(),
        styles.getPropertyValue("--focus-ring-accent").trim(),
      ];
    });
    expect(removedTokens).toEqual(["", ""]);
  });

  test("stacks all border contracts without mobile overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-language/borders/");
    await expect(page.locator('[data-focus-tone="light"]')).not.toContainText(
      "pending",
    );

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  });
});
