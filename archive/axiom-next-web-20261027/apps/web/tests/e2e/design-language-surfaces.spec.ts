import { expect, test } from "@playwright/test";

const surfaces = [
  { token: "--surface-page", tone: "dark", rgb: [13, 13, 13], hex: "#0D0D0D" },
  { token: "--surface-card-dark", tone: "dark", rgb: [17, 25, 14], hex: "#11190E" },
  { token: "--surface-paper", tone: "light", rgb: [226, 248, 200], hex: "#E2F8C8" },
  { token: "--surface-card-light", tone: "light", rgb: [234, 255, 208], hex: "#EAFFD0" },
  { token: "--surface-action", tone: "action", rgb: [176, 228, 84], hex: "#B0E454" },
  { token: "--surface-action-dark", tone: "dark", rgb: [34, 79, 16], hex: "#224F10" },
] as const;

function cssColorChannels(value: string) {
  const srgb = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (srgb) {
    return srgb.slice(1, 4).map((channel) => Math.round(Number(channel) * 255));
  }

  const rgb = value.match(/^rgba?\((\d+),?\s+(\d+),?\s+(\d+)/i);
  if (rgb) return rgb.slice(1, 4).map(Number);

  throw new Error(`Unsupported CSS color: ${value}`);
}

test.describe("design language surfaces", () => {
  test("proves the four-color graph through nested surface families", async ({
    page,
  }) => {
    await page.goto("/design-language/surfaces/");

    const main = page.locator("main");
    await expect(main.locator("[data-surface-family]")).toHaveCount(3);
    await expect(main.locator("[data-surface-token]")).toHaveCount(6);

    const darkFamily = main.locator('[data-surface-family="dark"]');
    const lightFamily = main.locator('[data-surface-family="light"]');
    const actionFamily = main.locator('[data-surface-family="action"]');

    await expect(
      darkFamily.locator(
        '[data-surface-token="--surface-page"] [data-surface-token="--surface-card-dark"]',
      ),
    ).toHaveCount(1);
    await expect(
      lightFamily.locator(
        '[data-surface-token="--surface-paper"] [data-surface-token="--surface-card-light"]',
      ),
    ).toHaveCount(1);
    await expect(actionFamily.locator("[data-surface-token]")).toHaveCount(2);

    for (const surface of surfaces) {
      const specimen = main.locator(`[data-surface-token="${surface.token}"]`);
      await expect(specimen).toHaveAttribute("data-surface-tone", surface.tone);
      await expect(
        specimen.locator(`[data-surface-resolved="${surface.token}"]`),
      ).toHaveText(surface.hex);
      await expect(specimen).toContainText("Surface role");
      await expect(specimen).toContainText("Contrast tone");
      await expect(specimen).toContainText("Source chain");
      await expect(specimen).toContainText("Text contract");
      await expect(specimen).toContainText("Edge contract");
      await expect(specimen).toContainText("Authored");
      await expect(specimen).toContainText("Resolved");
      await expect(specimen).toContainText("Use");

      const computed = await specimen.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          background: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          boxShadow: style.boxShadow,
        };
      });
      expect(cssColorChannels(computed.background)).toEqual(surface.rgb);
      expect(computed.backgroundImage).toBe("none");
      expect(computed.boxShadow).toBe("none");
    }

    await expect(
      main.locator('[data-surface-token="--surface-action-dark"]'),
    ).toHaveCSS("border-color", "rgba(176, 228, 84, 0.22)");

    await expect(main.locator("[data-tone-contract]")).toHaveCount(3);
    const toneFamilies = {
      dark: "--surface-page --surface-card-dark --surface-action-dark",
      light: "--surface-paper --surface-card-light",
      action: "--surface-action",
    } as const;
    for (const tone of ["dark", "light", "action"] as const) {
      const contract = main.locator(`[data-tone-contract="${tone}"]`);
      await expect(contract).toHaveAttribute(
        "data-tone-surfaces",
        toneFamilies[tone],
      );
      await expect(contract.locator("[data-contract-alias]")).toHaveCount(9);
      await expect(contract).not.toContainText("not read");
      await expect(contract).not.toContainText("not defined");
      await expect(contract).not.toContainText("resolving");

      const primaryContrast = await contract
        .locator('[data-contract-alias="--text-primary"] [data-contract-minimum]')
        .textContent();
      expect(Number.parseFloat(primaryContrast?.match(/[\d.]+/)?.[0] ?? "0"))
        .toBeGreaterThanOrEqual(4.5);

      for (const alias of ["--border-control", "--border-state", "--focus-ring"]) {
        const minimum = await contract
          .locator(`[data-contract-alias="${alias}"] [data-contract-minimum]`)
          .textContent();
        expect(Number.parseFloat(minimum?.match(/[\d.]+/)?.[0] ?? "0"))
          .toBeGreaterThanOrEqual(3);
      }
    }

    const darkContract = main.locator('[data-tone-contract="dark"]');
    await expect(
      darkContract.locator('[data-contract-alias="--text-muted"]'),
    ).toContainText("--surface-action-dark");
    await expect(
      darkContract.locator('[data-contract-alias="--focus-ring"]'),
    ).toContainText("--surface-action-dark");
    await expect(main.locator("text=--surface-*-edge")).toBeVisible();
    await expect(main).toContainText(
      "Structural border aliases must never be the only indicator",
    );

    await expect(main).not.toContainText("not read");
    await expect(main).not.toContainText("not defined");
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  });

  test("keeps light action components valid on the new Paper surface", async ({
    page,
  }) => {
    await page.goto("/design-language/actions/");

    const preview = page.getByTestId("action-surface-preview");
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await expect(preview).toHaveAttribute("data-surface-tone", "light");
    expect(
      cssColorChannels(
        await preview.evaluate(
          (element) => window.getComputedStyle(element).backgroundColor,
        ),
      ),
    ).toEqual([226, 248, 200]);

    const primary = preview.locator('[data-action-state="default"] button').first();
    const secondary = preview.locator('[data-action-state="default"] button').nth(1);
    const primaryDisabled = preview
      .locator('[data-action-state="disabled"] button')
      .first();
    const selected = preview.locator(
      '[data-selection-state="selected-rest"] button',
    );
    const selectedDisabled = preview.locator(
      '[data-selection-state="selected-disabled"] button',
    );
    const selectedFocus = preview.locator(
      '[data-selection-state="selected-focus-visible"] button',
    );

    await expect(primary).toHaveCSS("background-color", "rgb(34, 79, 16)");
    await expect(primary).toHaveCSS("color", "rgb(234, 255, 208)");
    await expect(secondary).toHaveCSS("box-shadow", "none");
    await expect(primaryDisabled).toHaveCSS(
      "background-color",
      "rgba(34, 79, 16, 0.08)",
    );
    await expect(selected).toHaveCSS(
      "background-color",
      "rgba(34, 79, 16, 0.1)",
    );
    await expect(
      selected.locator('[data-selection-indicator="checkmark"]'),
    ).toHaveCSS("color", "rgb(34, 79, 16)");
    await expect(selectedDisabled).toHaveCSS(
      "background-color",
      "rgba(34, 79, 16, 0.06)",
    );
    await expect(selectedFocus).toHaveCSS(
      "outline-color",
      "rgba(34, 79, 16, 0.64)",
    );
  });
});
