import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const route = "/design-language/components/labs/ui-forms/";

async function gotoLab(page: Page) {
  await page.goto(route);
  const foundation = page.locator("[data-ui-form-foundation]");
  await expect(foundation).toHaveAttribute("data-hydrated", "true");
  return foundation;
}

async function selectLayer(page: Page, name: "Contract Lab" | "Composition Lab" | "Form Journey") {
  const tab = page.getByRole("tab", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

test.describe("design language UI and form foundation", () => {
  test("separates contract, composition, and journey layers with keyboard tabs", async ({ page }) => {
    const foundation = await gotoLab(page);
    const tabs = foundation.getByRole("tab");
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(foundation.locator('[data-lab-layer="contract"]')).toBeVisible();
    await expect(foundation.locator('[data-lab-layer="composition"]')).toHaveCount(0);

    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(foundation.locator('[data-lab-layer="composition"]')).toBeVisible();

    await page.keyboard.press("End");
    await expect(tabs.nth(2)).toBeFocused();
    await expect(foundation.locator('[data-lab-layer="journey"]')).toBeVisible();
    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toBeFocused();
  });

  test("publishes exactly fifteen selectable contracts across identical tone matrices", async ({ page }) => {
    const foundation = await gotoLab(page);
    const index = foundation.getByRole("navigation", { name: "UI and Forms contracts" });

    const contracts = [
      ["Button", "button"],
      ["Link", "link"],
      ["IconButton", "icon-button"],
      ["Badge", "badge"],
      ["SelectionChip", "selection-chip"],
      ["Divider", "divider"],
      ["Disclosure", "disclosure"],
      ["Notice", "notice"],
      ["TextField", "text-input"],
      ["TextareaField", "textarea"],
      ["SelectField", "select"],
      ["Checkbox", "checkbox"],
      ["RadioGroup", "radio-group"],
      ["ErrorSummary", "error-summary"],
      ["Field / FieldGroup", "field"],
    ] as const;

    await expect(index.getByRole("button")).toHaveCount(15);
    for (const [name, component] of contracts) {
      await index.getByRole("button", { name, exact: true }).click();
      const panels = foundation.locator("[data-contract-tone]");
      await expect(panels).toHaveCount(3);
      for (const tone of ["dark", "light", "action"]) {
        await expect(
          panels.filter({ has: page.locator(`[data-component="${component}"]`) })
            .and(page.locator(`[data-contract-tone="${tone}"]`)),
        ).toHaveCount(1);
      }
    }

    await index.getByRole("button", { name: "TextField", exact: true }).click();
    const signatures = await foundation.locator("[data-contract-tone]").evaluateAll((panels) =>
      panels.map((panel) => Array.from(panel.querySelectorAll("[data-demo-state]")).map((state) => ({
        state: state.getAttribute("data-demo-state"),
        components: Array.from(state.querySelectorAll("[data-component]")).map((component) => ({
          component: component.getAttribute("data-component"),
          tag: component.tagName,
          disabled: component.hasAttribute("disabled"),
          readonly: component.hasAttribute("readonly"),
          invalid: component.getAttribute("aria-invalid"),
        })),
      }))),
    );
    expect(signatures[1]).toEqual(signatures[0]);
    expect(signatures[2]).toEqual(signatures[0]);
  });

  test("keeps invalid and focus visible together and delegates complete field wiring", async ({ page }) => {
    const foundation = await gotoLab(page);
    const dark = foundation.locator('[data-contract-tone="dark"]');
    const invalidFocus = dark.locator('[data-demo-state="invalid-focus"]');
    const input = invalidFocus.locator('[data-component="text-input"]');

    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveCSS("border-top-width", "2px");
    await expect(input).toHaveCSS("outline-style", "solid");
    await expect(input).toHaveCSS("outline-width", "2px");
    const stateColors = await input.evaluate((element) => ({
      border: getComputedStyle(element).borderTopColor,
      focus: getComputedStyle(element).outlineColor,
    }));
    expect(stateColors.border).not.toBe(stateColors.focus);

    const rest = dark.locator('[data-demo-state="rest"]');
    await expect(rest.locator("label")).toContainText("E-mailVolitelné");
    await expect(rest.locator('[data-component="text-input"]')).not.toHaveAttribute("placeholder", /.+/);
    const describedBy = await rest.locator('[data-component="text-input"]').getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(rest.locator(`#${describedBy}`)).toContainText("Například david@example.cz.");

    const index = foundation.getByRole("navigation", { name: "UI and Forms contracts" });
    await index.getByRole("button", { name: "RadioGroup", exact: true }).click();
    const group = foundation.locator('[data-contract-tone="dark"] [data-component="radio-group"]').first();
    await expect(group).toHaveJSProperty("tagName", "FIELDSET");
    await expect(group.locator("legend")).toContainText("Preferovaný výsledek");
    await expect(group.locator('input[type="radio"]')).toHaveCount(2);

    await index.getByRole("button", { name: "Checkbox", exact: true }).click();
    const checkboxRow = foundation
      .locator('[data-contract-tone="dark"] [data-demo-state="rest"] [data-component="checkbox"]');
    const checkbox = checkboxRow.locator("input");
    await expect(checkbox).not.toBeChecked();
    await checkboxRow.locator("label").click();
    await expect(checkbox).toBeChecked();

    await index.getByRole("button", { name: "ErrorSummary", exact: true }).click();
    const summary = foundation.locator('[data-contract-tone="dark"] [data-component="error-summary"]');
    await expect(summary).not.toHaveAttribute("role", "alert");
    const summaryLink = summary.getByRole("link", { name: "Doplňte platný e-mail." });
    await summaryLink.click();
    await expect(foundation.locator("#contract-summary-dark")).toBeFocused();
  });

  test("keeps the realistic composition surface-aware and the lead form linear", async ({ page }) => {
    await gotoLab(page);
    await selectLayer(page, "Composition Lab");

    const composition = page.locator('[data-lab-layer="composition"]');
    const stage = composition.locator("#composition-preview-stage");
    await expect(composition.locator('[data-preview-family="ui"]')).toBeVisible();
    await expect(composition.locator('[data-preview-family="forms"]')).toBeVisible();
    await expect(composition.getByRole("button", { name: "Zavolat mi" })).toBeVisible();
    await expect(composition.getByRole("button", { name: "Další možnosti" })).toBeVisible();

    const badge = composition.locator('[data-component="badge"]');
    await expect(badge).toHaveJSProperty("tagName", "SPAN");
    await expect(badge).not.toHaveAttribute("tabindex", /.+/);
    const chip = composition.locator('[data-component="selection-chip"]');
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");

    const summary = composition.locator('[data-component="error-summary"]');
    const summaryLink = summary.getByRole("link", { name: "Doplňte platný e-mail." });
    const email = composition.locator("#composition-email");
    await expect(composition.locator("#composition-email-error")).toContainText("Doplňte platný e-mail.");
    await summaryLink.click();
    await expect(email).toBeFocused();

    const form = composition.locator("form");
    await expect(form.locator("[placeholder]")).toHaveCount(0);
    await expect(form.locator('[data-component="checkbox"] input')).not.toBeChecked();
    const formBox = await form.boundingBox();
    expect(formBox?.width).toBeLessThanOrEqual(768);

    const backgrounds: string[] = [];
    for (const tone of ["Dark", "Light", "Action"]) {
      await composition.getByRole("button", { name: tone, exact: true }).click();
      await expect(stage).toHaveAttribute("data-surface-tone", tone.toLowerCase());
      backgrounds.push(await stage.evaluate((element) => getComputedStyle(element).backgroundColor));
    }
    expect(new Set(backgrounds).size).toBe(3);
  });

  test("runs pristine, invalid, repair, submitting, success, and server-error states", async ({ page }) => {
    await gotoLab(page);
    await selectLayer(page, "Form Journey");

    const journey = page.locator('[data-lab-layer="journey"]');
    const form = journey.locator("[data-journey-form]");
    const submit = form.locator('button[type="submit"]');
    await expect(submit).toHaveAccessibleName("Odeslat poptávku");
    await expect(journey).toHaveAttribute("data-journey-state", "pristine");

    await submit.click();
    await expect(journey).toHaveAttribute("data-journey-state", "invalid");
    const summary = form.locator('[data-component="error-summary"]');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("link")).toHaveCount(4);
    await expect(summary.getByRole("link", { name: "Doplňte platný e-mail." })).toBeVisible();
    const emailLink = summary.getByRole("link", { name: "Doplňte platný e-mail." });
    await emailLink.click();
    const email = form.locator('input[name="email"]');
    await expect(email).toBeFocused();
    await email.pressSequentially("d");
    await expect(email).toBeFocused();

    await form.locator('input[name="name"]').fill("David Pokorný");
    await email.fill("david@example.cz");
    await form.locator('textarea[name="message"]').fill("Chci srovnat rezervu a dlouhodobý plán.");
    await form.locator('input[name="consent"]').check();
    await expect(journey).toHaveAttribute("data-journey-state", "repairing");
    await expect(summary).toHaveCount(0);

    await submit.click();
    await expect(journey).toHaveAttribute("data-journey-state", "submitting");
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(journey).toHaveAttribute("data-journey-state", "success");
    await expect(form.getByRole("status")).toContainText("Poptávka byla odeslána");

    await form.getByRole("button", { name: "Začít znovu" }).click();
    await expect(journey).toHaveAttribute("data-journey-state", "pristine");
    await journey.getByRole("button", { name: "Server error", exact: true }).click();
    await form.locator('input[name="name"]').fill("David Pokorný");
    await form.locator('input[name="email"]').fill("david@example.cz");
    await form.locator('textarea[name="message"]').fill("Chci srovnat rezervu a dlouhodobý plán.");
    await form.locator('input[name="consent"]').check();
    await submit.click();
    await expect(journey).toHaveAttribute("data-journey-state", "server-error");
    await expect(form.getByRole("alert")).toContainText("Chyba odeslání");
  });

  test("reflows at 200 and 400 percent equivalents without horizontal overflow", async ({ page }) => {
    for (const width of [640, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoLab(page);
      const viewport = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
      await expect(page.locator("[data-contract-tone]")).toHaveCount(3);
      const toneBoxes = await page.locator("[data-contract-tone]").evaluateAll((panels) =>
        panels.map((panel) => panel.getBoundingClientRect().width),
      );
      expect(toneBoxes.every((panelWidth) => panelWidth <= width)).toBe(true);
    }
  });

  test("has no automated accessibility violations across the three lab layers", async ({ page }) => {
    await gotoLab(page);

    const layers = [
      { tab: "Contract Lab", selector: '[data-lab-layer="contract"]' },
      { tab: "Composition Lab", selector: '[data-lab-layer="composition"]' },
      { tab: "Form Journey", selector: '[data-lab-layer="journey"]' },
    ] as const;

    for (const layer of layers) {
      await selectLayer(page, layer.tab);
      const result = await new AxeBuilder({ page })
        .include(layer.selector)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(result.violations, `${layer.tab} accessibility violations`).toEqual([]);
    }
  });

  test("preserves error geometry and focus indicators in forced colors", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await gotoLab(page);

    const invalidFocus = page.locator(
      '[data-contract-tone="dark"] [data-demo-state="invalid-focus"] [data-component="text-input"]',
    );
    await expect(invalidFocus).toHaveCSS("border-top-style", "solid");
    await expect(invalidFocus).toHaveCSS("border-top-width", "2px");
    await expect(invalidFocus).toHaveCSS("outline-style", "solid");
    await expect(invalidFocus).toHaveCSS("outline-width", "2px");

    const index = page.getByRole("navigation", { name: "UI and Forms contracts" });
    await index.getByRole("button", { name: "ErrorSummary", exact: true }).click();
    const summary = page.locator('[data-contract-tone="dark"] [data-component="error-summary"]');
    await expect(summary).toHaveCSS("border-left-width", "4px");
    await expect(summary.getByRole("link", { name: "Doplňte platný e-mail." })).toBeVisible();
  });
});
