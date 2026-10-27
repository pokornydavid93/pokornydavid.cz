import { expect, test } from "@playwright/test";

const actionSurfaceLabels = ["Dark", "Light", "Action"] as const;

type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function parseCssColor(value: string): ParsedColor {
  const normalized = value.trim();
  const srgbMatch = normalized.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i,
  );

  if (srgbMatch) {
    return {
      r: Number(srgbMatch[1]) * 255,
      g: Number(srgbMatch[2]) * 255,
      b: Number(srgbMatch[3]) * 255,
      a: srgbMatch[4] ? Number(srgbMatch[4]) : 1,
    };
  }

  const rgbMatch = normalized.match(/^rgba?\((.+)\)$/i);

  if (!rgbMatch) {
    throw new Error(`Unsupported CSS color: ${value}`);
  }

  const parts = rgbMatch[1]
    .replaceAll(",", " ")
    .replace("/", " ")
    .trim()
    .split(/\s+/);

  return {
    r: Number(parts[0]),
    g: Number(parts[1]),
    b: Number(parts[2]),
    a: parts[3] ? Number(parts[3]) : 1,
  };
}

function compositeColor(foreground: ParsedColor, background: ParsedColor) {
  if (foreground.a >= 1) return foreground;

  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function channelLuminance(channel: number) {
  const value = channel / 255;

  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: ParsedColor) {
  return (
    channelLuminance(color.r) * 0.2126 +
    channelLuminance(color.g) * 0.7152 +
    channelLuminance(color.b) * 0.0722
  );
}

function contrastRatio(foregroundValue: string, backgroundValue: string) {
  const background = parseCssColor(backgroundValue);
  const foreground = compositeColor(parseCssColor(foregroundValue), background);
  return contrastRatioFromColors(foreground, background);
}

function contrastRatioFromColors(
  foreground: ParsedColor,
  background: ParsedColor,
) {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

function colorDistance(firstValue: string, secondValue: string) {
  const first = parseCssColor(firstValue);
  const second = parseCssColor(secondValue);

  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b);
}

test.describe("design language actions", () => {
  test("keeps action states surface-aware without changing control metrics", async ({
    page,
  }) => {
    await page.goto("/design-language/actions/");
    await page.addStyleTag({
      content:
        "*, *::before, *::after { animation: none !important; transition: none !important; }",
    });

    const preview = page.getByTestId("action-surface-preview");
    await expect(preview).toHaveAttribute("data-surface-tone", "dark");

    const metricsBySurface = new Map<string, Record<string, string | number>>();
    const primaryBackgrounds = new Map<string, string>();
    const focusRingColors = new Map<string, string>();
    const surfaceSnapshots = new Map<
      string,
      {
        wrapperBackground: string;
        primaryDefaultBackground: string;
        primaryHoverBackground: string;
        primaryActiveBackground: string;
        primaryText: string;
        primaryDisabledBackground: string;
        primaryDisabledText: string;
        primaryDisabledBorder: string;
        focusRingColor: string;
        actionCardBackground: string;
        stateCardBackground: string;
        stateNoteColors: string[];
      }
    >();

    for (const label of actionSurfaceLabels) {
      await page.getByRole("button", { name: label }).click();
      await expect(preview).toHaveAttribute(
        "data-surface-tone",
        label.toLowerCase(),
      );

      await expect(preview.locator("[data-action-state]")).toHaveCount(10);
      await expect(preview.locator("[data-selection-state]")).toHaveCount(10);
      await expect(
        preview.locator('[data-action-state="disabled"] button:disabled'),
      ).toHaveCount(2);
      await expect(
        preview.locator('[data-demo-state="focus-visible"]'),
      ).toHaveCount(4);

      const state = await preview.evaluate((element) => {
        const primary = element.querySelector(
          '[data-action-state="default"] button',
        );
        const primaryHover = element.querySelector(
          '[data-action-state="hover"] button',
        );
        const primaryActive = element.querySelector(
          '[data-action-state="active"] button',
        );
        const primaryDisabled = element.querySelector(
          '[data-action-state="disabled"] button',
        );
        const focusButton = element.querySelector(
          '[data-action-state="focus-visible"] button',
        );
        const referenceStateCard = element.querySelector(
          '[data-action-state="active"]',
        );
        const actionCard = referenceStateCard?.parentElement?.parentElement;
        const stateNotes = ["active", "focus-visible", "disabled"].map(
          (stateName) =>
            element.querySelector(
              `[data-action-state="${stateName}"] > p:last-child`,
            ),
        );

        const requireControl = (
          control: Element | null,
          label: string,
        ): HTMLElement => {
          if (!(control instanceof HTMLElement)) {
            throw new Error(`Missing ${label} CTA specimen.`);
          }

          return control;
        };

        const primaryElement = requireControl(primary, "default primary");
        const primaryHoverElement = requireControl(
          primaryHover,
          "hover primary",
        );
        const primaryActiveElement = requireControl(
          primaryActive,
          "active primary",
        );
        const primaryDisabledElement = requireControl(
          primaryDisabled,
          "disabled primary",
        );
        const focusButtonElement = requireControl(
          focusButton,
          "focus-visible primary",
        );

        if (!(referenceStateCard instanceof HTMLElement)) {
          throw new Error("Missing reference action state card.");
        }

        if (!(actionCard instanceof HTMLElement)) {
          throw new Error("Missing parent action card.");
        }

        if (stateNotes.some((note) => !(note instanceof HTMLElement))) {
          throw new Error("Missing action state supporting copy.");
        }

        const primaryStyle = window.getComputedStyle(primaryElement);
        const primaryHoverStyle = window.getComputedStyle(primaryHoverElement);
        const primaryActiveStyle = window.getComputedStyle(primaryActiveElement);
        const primaryDisabledStyle = window.getComputedStyle(
          primaryDisabledElement,
        );
        const focusStyle = window.getComputedStyle(focusButtonElement);

        return {
          hasNotRead: document.body.innerText.toUpperCase().includes("NOT READ"),
          hasMissingToken: document.body.innerText
            .toUpperCase()
            .includes("MISSING TOKEN"),
          primaryBackground: primaryStyle.backgroundColor,
          focusRingColor: focusStyle.outlineColor,
          wrapperBackground: window.getComputedStyle(element).backgroundColor,
          primaryHoverBackground: primaryHoverStyle.backgroundColor,
          primaryActiveBackground: primaryActiveStyle.backgroundColor,
          primaryText: primaryStyle.color,
          primaryDisabledBackground: primaryDisabledStyle.backgroundColor,
          primaryDisabledText: primaryDisabledStyle.color,
          primaryDisabledBorder: primaryDisabledStyle.borderColor,
          focusRingStyle: focusStyle.outlineStyle,
          focusRingWidth: focusStyle.outlineWidth,
          focusRingOffset: focusStyle.outlineOffset,
          actionCardBackground:
            window.getComputedStyle(actionCard).backgroundColor,
          stateCardBackground:
            window.getComputedStyle(referenceStateCard).backgroundColor,
          stateNoteColors: stateNotes.map(
            (note) => window.getComputedStyle(note as HTMLElement).color,
          ),
          metrics: {
            height: Math.round(primaryElement.getBoundingClientRect().height),
            paddingInline: `${primaryStyle.paddingLeft}/${primaryStyle.paddingRight}`,
            paddingBlock: `${primaryStyle.paddingTop}/${primaryStyle.paddingBottom}`,
            borderRadius: primaryStyle.borderRadius,
            fontSize: primaryStyle.fontSize,
            fontWeight: primaryStyle.fontWeight,
            lineHeight: primaryStyle.lineHeight,
            gap: primaryStyle.columnGap,
          },
        };
      });

      expect(state.hasNotRead).toBe(false);
      expect(state.hasMissingToken).toBe(false);
      expect(state.focusRingStyle).toBe("solid");
      expect(state.focusRingWidth).toBe("2px");
      expect(state.focusRingOffset).toBe("3px");

      metricsBySurface.set(label, state.metrics);
      primaryBackgrounds.set(label, state.primaryBackground);
      focusRingColors.set(label, state.focusRingColor);
      surfaceSnapshots.set(label, {
        wrapperBackground: state.wrapperBackground,
        primaryDefaultBackground: state.primaryBackground,
        primaryHoverBackground: state.primaryHoverBackground,
        primaryActiveBackground: state.primaryActiveBackground,
        primaryText: state.primaryText,
        primaryDisabledBackground: state.primaryDisabledBackground,
        primaryDisabledText: state.primaryDisabledText,
        primaryDisabledBorder: state.primaryDisabledBorder,
        focusRingColor: state.focusRingColor,
        actionCardBackground: state.actionCardBackground,
        stateCardBackground: state.stateCardBackground,
        stateNoteColors: state.stateNoteColors,
      });
    }

    const darkMetrics = metricsBySurface.get("Dark");
    expect(darkMetrics).toBeDefined();
    expect(darkMetrics?.borderRadius).toBe("16px");

    for (const label of actionSurfaceLabels) {
      expect(metricsBySurface.get(label)).toEqual(darkMetrics);
    }

    expect(primaryBackgrounds.get("Action")).not.toBe(
      primaryBackgrounds.get("Dark"),
    );
    expect(primaryBackgrounds.get("Action")).not.toBe(
      primaryBackgrounds.get("Light"),
    );
    expect(primaryBackgrounds.get("Light")).not.toBe(
      primaryBackgrounds.get("Dark"),
    );
    expect(focusRingColors.get("Action")).not.toBe(focusRingColors.get("Dark"));

    const light = surfaceSnapshots.get("Light");
    expect(light).toBeDefined();

    if (!light) {
      throw new Error("Missing light surface snapshot.");
    }

    expect(light.primaryDefaultBackground).toBe("rgb(34, 79, 16)");
    expect(light.primaryText).toBe("rgb(234, 255, 208)");
    expect(light.primaryDisabledBackground).toContain("34, 79, 16");
    expect(light.primaryDisabledText).toContain("34, 79, 16");
    expect(light.primaryDisabledBorder).toContain("34, 79, 16");

    expect(
      contrastRatio(light.primaryDefaultBackground, light.wrapperBackground),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(light.primaryHoverBackground, light.wrapperBackground),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(light.primaryActiveBackground, light.wrapperBackground),
    ).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(light.focusRingColor, light.wrapperBackground)).toBeGreaterThanOrEqual(3);

    const action = surfaceSnapshots.get("Action");
    expect(action).toBeDefined();

    if (!action) {
      throw new Error("Missing action surface snapshot.");
    }

    const actionHover = parseCssColor(action.primaryHoverBackground);
    expect(action.primaryDefaultBackground).toBe("rgb(13, 13, 13)");
    expect(actionHover.r).toBeCloseTo(20, 0);
    expect(actionHover.g).toBeCloseTo(34, 0);
    expect(actionHover.b).toBeCloseTo(14, 0);
    expect(
      colorDistance(
        action.primaryDefaultBackground,
        action.primaryHoverBackground,
      ),
    ).toBeGreaterThanOrEqual(20);
    expect(action.primaryActiveBackground).toBe("rgb(34, 79, 16)");
    expect(action.primaryDisabledBackground).toContain("13, 13, 13");
    expect(action.primaryDisabledText).toContain("13, 13, 13");
    expect(action.primaryDisabledBorder).toContain("13, 13, 13");
    expect(action.focusRingColor).toBe("rgba(13, 13, 13, 0.72)");

    const wrapperBackground = parseCssColor(action.wrapperBackground);
    const actionCardBackground = compositeColor(
      parseCssColor(action.actionCardBackground),
      wrapperBackground,
    );
    const stateCardBackground = compositeColor(
      parseCssColor(action.stateCardBackground),
      actionCardBackground,
    );

    for (const noteColorValue of action.stateNoteColors) {
      const noteColor = compositeColor(
        parseCssColor(noteColorValue),
        stateCardBackground,
      );
      expect(
        contrastRatioFromColors(noteColor, stateCardBackground),
      ).toBeGreaterThanOrEqual(4.5);
    }

    await page.getByRole("button", { name: "Action" }).click();
    const livePrimary = preview.locator(
      '[data-action-state="default"] button',
    ).first();
    await livePrimary.hover();
    await expect(livePrimary).toHaveCSS(
      "background-color",
      action.primaryHoverBackground,
    );
  });

  test("keeps the light secondary CTA flat and surface-aware", async ({
    page,
  }) => {
    await page.goto("/design-language/actions/");

    const preview = page.getByTestId("action-surface-preview");
    const secondaryStateButton = (state: string) =>
      preview.locator(`[data-action-state="${state}"] button`).nth(1);

    const darkDefaultShadow = await secondaryStateButton("default").evaluate(
      (button) => window.getComputedStyle(button).boxShadow,
    );
    const darkHoverShadow = await secondaryStateButton("hover").evaluate(
      (button) => window.getComputedStyle(button).boxShadow,
    );

    expect(darkDefaultShadow).not.toBe("none");
    expect(darkHoverShadow).not.toBe("none");

    await page.getByRole("button", { name: "Light" }).click();
    await expect(preview).toHaveAttribute("data-surface-tone", "light");
    for (const state of [
      "default",
      "hover",
      "active",
      "focus-visible",
      "disabled",
    ]) {
      await expect(secondaryStateButton(state)).toHaveCSS("box-shadow", "none");
    }

    const secondaryStyles = await Promise.all(
      ["default", "hover", "active", "focus-visible", "disabled"].map(
        async (state) =>
          secondaryStateButton(state).evaluate((button) => {
            const style = window.getComputedStyle(button);

            return {
              background: style.backgroundColor,
              border: style.borderColor,
              color: style.color,
              filter: style.filter,
              outlineColor: style.outlineColor,
              outlineOffset: style.outlineOffset,
              outlineWidth: style.outlineWidth,
              shadow: style.boxShadow,
            };
          }),
      ),
    );
    const [defaultState, hoverState, activeState, focusState, disabledState] =
      secondaryStyles;

    expect(defaultState.background).toBe("rgba(13, 13, 13, 0.035)");
    expect(hoverState.background).toBe("rgba(34, 79, 16, 0.07)");
    expect(activeState.background).toBe("rgba(34, 79, 16, 0.11)");
    expect(defaultState.color).toBe("rgb(13, 13, 13)");
    expect(hoverState.color).toBe("rgb(13, 13, 13)");
    expect(activeState.color).toBe("rgb(13, 13, 13)");
    expect(defaultState.border).toBe("rgba(13, 13, 13, 0.16)");
    expect(hoverState.border).toBe("rgba(34, 79, 16, 0.32)");
    expect(activeState.border).toBe("rgba(34, 79, 16, 0.42)");

    for (const state of secondaryStyles) {
      expect(state.shadow).toBe("none");
      expect(state.filter).toBe("none");
    }

    expect(focusState.outlineColor).toBe("rgba(34, 79, 16, 0.64)");
    expect(focusState.outlineWidth).toBe("2px");
    expect(focusState.outlineOffset).toBe("3px");
    expect(disabledState.background).toBe("rgba(34, 79, 16, 0.04)");
    expect(disabledState.color).toBe("rgba(34, 79, 16, 0.42)");
    expect(disabledState.border).toBe("rgba(34, 79, 16, 0.12)");
    await expect(secondaryStateButton("disabled")).toBeDisabled();

    const disabledDocumentation = preview
      .locator('[data-action-state="disabled"]')
      .nth(1);
    await expect(disabledDocumentation).toContainText(
      "rgba(34, 79, 16, 0.04)",
    );
    await expect(disabledDocumentation).toContainText(
      "rgba(34, 79, 16, 0.42)",
    );
    await expect(disabledDocumentation).toContainText(
      "rgba(34, 79, 16, 0.12)",
    );
    await expect(disabledDocumentation).not.toContainText("234, 255, 208");

    const liveSecondary = secondaryStateButton("default");
    await liveSecondary.hover();
    await expect(liveSecondary).toHaveCSS(
      "background-color",
      hoverState.background,
    );
    await expect(liveSecondary).toHaveCSS("box-shadow", "none");

    await page.getByRole("button", { name: "Dark" }).click();
    await expect(secondaryStateButton("default")).toHaveCSS(
      "box-shadow",
      darkDefaultShadow,
    );
    await expect(secondaryStateButton("hover")).toHaveCSS(
      "box-shadow",
      darkHoverShadow,
    );
  });

  test("keeps the action secondary CTA flat and surface-aware", async ({
    page,
  }) => {
    await page.goto("/design-language/actions/");

    const preview = page.getByTestId("action-surface-preview");
    const secondaryStateButton = (state: string) =>
      preview.locator(`[data-action-state="${state}"] button`).nth(1);

    await page.getByRole("button", { name: "Action" }).click();
    await expect(preview).toHaveAttribute("data-surface-tone", "action");

    const secondaryStyles = await Promise.all(
      ["default", "hover", "active", "focus-visible", "disabled"].map(
        async (state) =>
          secondaryStateButton(state).evaluate((button) => {
            const style = window.getComputedStyle(button);

            return {
              background: style.backgroundColor,
              border: style.borderColor,
              color: style.color,
              filter: style.filter,
              outlineColor: style.outlineColor,
              outlineOffset: style.outlineOffset,
              outlineWidth: style.outlineWidth,
              shadow: style.boxShadow,
            };
          }),
      ),
    );
    const [defaultState, hoverState, activeState, focusState, disabledState] =
      secondaryStyles;

    expect(defaultState.background).toBe("rgba(13, 13, 13, 0.055)");
    expect(hoverState.background).toBe("rgba(13, 13, 13, 0.1)");
    expect(activeState.background).toBe("rgba(13, 13, 13, 0.16)");
    expect(defaultState.color).toBe("rgb(13, 13, 13)");
    expect(hoverState.color).toBe("rgb(13, 13, 13)");
    expect(activeState.color).toBe("rgb(13, 13, 13)");
    expect(defaultState.border).toBe("rgba(13, 13, 13, 0.24)");
    expect(hoverState.border).toBe("rgba(13, 13, 13, 0.34)");
    expect(activeState.border).toBe("rgba(13, 13, 13, 0.48)");

    for (const state of secondaryStyles) {
      expect(state.shadow).toBe("none");
      expect(state.filter).toBe("none");
    }

    expect(focusState.outlineColor).toBe("rgba(13, 13, 13, 0.72)");
    expect(focusState.outlineWidth).toBe("2px");
    expect(focusState.outlineOffset).toBe("3px");
    expect(disabledState.background).toBe("rgba(13, 13, 13, 0.04)");
    expect(disabledState.color).toBe("rgba(13, 13, 13, 0.42)");
    expect(disabledState.border).toBe("rgba(13, 13, 13, 0.12)");
    await expect(secondaryStateButton("disabled")).toBeDisabled();

    const disabledDocumentation = preview
      .locator('[data-action-state="disabled"]')
      .nth(1);
    await expect(disabledDocumentation).toContainText(
      "rgba(13, 13, 13, 0.04)",
    );
    await expect(disabledDocumentation).toContainText(
      "rgba(13, 13, 13, 0.42)",
    );
    await expect(disabledDocumentation).toContainText(
      "rgba(13, 13, 13, 0.12)",
    );
    await expect(disabledDocumentation).not.toContainText("234, 255, 208");

    const liveSecondary = secondaryStateButton("default");
    await liveSecondary.hover();
    await expect(liveSecondary).toHaveCSS(
      "background-color",
      hoverState.background,
    );
    await expect(liveSecondary).toHaveCSS("box-shadow", "none");

    await page.getByRole("button", { name: "Light" }).click();
    await expect(secondaryStateButton("default")).toHaveCSS(
      "background-color",
      "rgba(13, 13, 13, 0.035)",
    );
    await expect(secondaryStateButton("disabled")).toHaveCSS(
      "background-color",
      "rgba(34, 79, 16, 0.04)",
    );
  });

  test("documents and runs the complete dark selection state matrix", async ({
    page,
  }) => {
    await page.goto("/design-language/actions/");

    const preview = page.getByTestId("action-surface-preview");
    const stateButton = (state: string) =>
      preview.locator(`[data-selection-state="${state}"] button`);
    const readStyle = async (state: string) =>
      stateButton(state).evaluate((button) => {
        const indicator = button.querySelector('[data-selection-indicator="checkmark"]');
        const style = window.getComputedStyle(button);
        const indicatorStyle = indicator
          ? window.getComputedStyle(indicator)
          : null;

        return {
          background: style.backgroundColor,
          border: style.borderColor,
          color: style.color,
          cursor: style.cursor,
          filter: style.filter,
          indicatorColor: indicatorStyle?.color ?? "",
          indicatorOpacity: indicatorStyle?.opacity ?? "",
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          outlineWidth: style.outlineWidth,
          pointerEvents: style.pointerEvents,
          shadow: style.boxShadow,
        };
      });

    await expect(preview.locator("[data-selection-state]")).toHaveCount(10);
    await expect(
      preview.locator('[data-selection-persistence="unselected"]'),
    ).toHaveCount(5);
    await expect(
      preview.locator('[data-selection-persistence="selected"]'),
    ).toHaveCount(5);
    await expect(
      preview.locator("[data-selection-state] button[tabindex='-1']"),
    ).toHaveCount(10);
    await expect(
      preview.locator("[data-selection-state] button:disabled"),
    ).toHaveCount(2);
    const indicators = preview.locator(
      '[data-selection-state] svg[data-selection-indicator="checkmark"]',
    );
    await expect(indicators).toHaveCount(10);
    const indicatorContract = await indicators.evaluateAll((icons) =>
      icons.map((icon) => {
        const style = window.getComputedStyle(icon);

        return {
          ariaHidden: icon.getAttribute("aria-hidden"),
          focusable: icon.getAttribute("focusable"),
          height: style.height,
          stroke: icon.getAttribute("stroke"),
          tagName: icon.tagName.toLowerCase(),
          width: style.width,
        };
      }),
    );
    for (const indicator of indicatorContract) {
      expect(indicator).toEqual({
        ariaHidden: "true",
        focusable: "false",
        height: "12px",
        stroke: "currentColor",
        tagName: "svg",
        width: "12px",
      });
    }
    await expect(preview).not.toContainText("•");

    const [
      unselectedRest,
      unselectedHover,
      unselectedPressed,
      unselectedFocus,
      unselectedDisabled,
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ] = await Promise.all(
      [
        "unselected-rest",
        "unselected-hover",
        "unselected-pressed",
        "unselected-focus-visible",
        "unselected-disabled",
        "selected-rest",
        "selected-hover",
        "selected-pressed",
        "selected-focus-visible",
        "selected-disabled",
      ].map(readStyle),
    );

    expect(unselectedRest.border).toBe("rgba(234, 255, 208, 0.12)");
    expect(unselectedHover.background).toBe("rgba(176, 228, 84, 0.08)");
    expect(unselectedHover.border).toBe("rgba(176, 228, 84, 0.18)");
    expect(unselectedPressed.background).toBe("rgba(176, 228, 84, 0.12)");
    expect(unselectedPressed.border).toBe("rgba(176, 228, 84, 0.26)");
    expect(unselectedPressed.indicatorOpacity).toBe("0");
    expect(unselectedFocus.background).toBe(unselectedRest.background);
    expect(unselectedFocus.border).toBe(unselectedRest.border);
    const unselectedDisabledBackground = parseCssColor(
      unselectedDisabled.background,
    );
    expect(unselectedDisabledBackground.r).toBe(234);
    expect(unselectedDisabledBackground.g).toBe(255);
    expect(unselectedDisabledBackground.b).toBe(208);
    expect(unselectedDisabledBackground.a).toBeCloseTo(0.025, 2);
    expect(unselectedDisabled.color).toBe("rgba(234, 255, 208, 0.32)");
    expect(unselectedDisabled.border).toBe("rgba(234, 255, 208, 0.06)");

    expect(selectedHover.background).toBe("rgba(176, 228, 84, 0.22)");
    expect(selectedHover.border).toBe("rgba(176, 228, 84, 0.26)");
    expect(selectedPressed.background).toBe("rgba(176, 228, 84, 0.26)");
    expect(selectedPressed.border).toBe("rgba(176, 228, 84, 0.34)");
    expect(selectedFocus.background).toBe(selectedRest.background);
    expect(selectedFocus.border).toBe(selectedRest.border);
    expect(selectedDisabled.background).toBe("rgba(176, 228, 84, 0.08)");
    expect(selectedDisabled.color).toBe("rgba(176, 228, 84, 0.42)");
    expect(selectedDisabled.border).toBe("rgba(176, 228, 84, 0.12)");

    for (const state of [
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ]) {
      expect(state.indicatorOpacity).toBe("1");
    }

    expect(selectedHover.indicatorColor).toBe("rgb(176, 228, 84)");
    expect(selectedPressed.indicatorColor).toBe("rgb(176, 228, 84)");
    expect(selectedDisabled.indicatorColor).toBe(
      "rgba(176, 228, 84, 0.42)",
    );

    for (const focusState of [unselectedFocus, selectedFocus]) {
      expect(focusState.outlineColor).toBe("rgba(176, 228, 84, 0.56)");
      expect(focusState.outlineWidth).toBe("2px");
      expect(focusState.outlineOffset).toBe("3px");
    }

    for (const state of [
      unselectedRest,
      unselectedHover,
      unselectedPressed,
      unselectedFocus,
      unselectedDisabled,
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ]) {
      expect(state.cursor).toBe("default");
      expect(state.pointerEvents).toBe("none");
      expect(state.shadow).toBe("none");
      expect(state.filter).toBe("none");
    }

    const liveChip = page.getByTestId("selection-live-chip");
    const liveIndicator = liveChip.locator(
      'svg[data-selection-indicator="checkmark"]',
    );
    const readMetrics = () =>
      liveChip.evaluate((button) => {
        const label = button.querySelector("span:nth-child(2)");

        if (!(label instanceof HTMLElement)) {
          throw new Error("Missing selection chip label.");
        }

        const buttonRect = button.getBoundingClientRect();
        const labelRect = label.getBoundingClientRect();

        return {
          buttonHeight: buttonRect.height,
          buttonWidth: buttonRect.width,
          labelCenter: labelRect.left + labelRect.width / 2,
        };
      });

    await expect(liveChip).toHaveAttribute("aria-pressed", "false");
    await expect(liveIndicator).toHaveCSS("opacity", "0");
    const unselectedMetrics = await readMetrics();

    await liveChip.hover();
    await expect(liveChip).toHaveCSS(
      "background-color",
      "rgba(176, 228, 84, 0.08)",
    );
    await page.mouse.down();
    await expect(liveChip).toHaveCSS(
      "background-color",
      "rgba(176, 228, 84, 0.12)",
    );
    await page.mouse.up();

    await expect(liveChip).toHaveAttribute("aria-pressed", "true");
    await expect(liveIndicator).toHaveCSS("opacity", "1");
    const selectedMetrics = await readMetrics();
    expect(selectedMetrics.buttonWidth).toBeCloseTo(
      unselectedMetrics.buttonWidth,
      2,
    );
    expect(selectedMetrics.buttonHeight).toBeCloseTo(
      unselectedMetrics.buttonHeight,
      2,
    );
    expect(selectedMetrics.labelCenter).toBeCloseTo(
      unselectedMetrics.labelCenter,
      2,
    );

    await page.mouse.move(0, 0);
    await liveChip.press("Space");
    await expect(liveChip).toHaveAttribute("aria-pressed", "false");
    await expect(liveChip).toHaveCSS(
      "outline-color",
      "rgba(176, 228, 84, 0.56)",
    );
    await liveChip.press("Space");
    await expect(liveChip).toHaveAttribute("aria-pressed", "true");
    await expect(liveChip).toHaveCSS(
      "background-color",
      selectedRest.background,
    );
  });

  test("keeps the light selection matrix in one deep-green polarity", async ({
    page,
  }) => {
    await page.goto("/design-language/actions/");

    const preview = page.getByTestId("action-surface-preview");
    await page.getByRole("button", { name: "Light" }).click();
    await expect(preview).toHaveAttribute("data-surface-tone", "light");

    const stateButton = (state: string) =>
      preview.locator(`[data-selection-state="${state}"] button`);
    const readStyle = async (state: string) =>
      stateButton(state).evaluate((button) => {
        const indicator = button.querySelector('[data-selection-indicator="checkmark"]');
        const style = window.getComputedStyle(button);
        const indicatorStyle = indicator
          ? window.getComputedStyle(indicator)
          : null;

        return {
          background: style.backgroundColor,
          border: style.borderColor,
          color: style.color,
          filter: style.filter,
          indicatorColor: indicatorStyle?.color ?? "",
          indicatorOpacity: indicatorStyle?.opacity ?? "",
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          outlineWidth: style.outlineWidth,
          shadow: style.boxShadow,
        };
      });

    const [
      unselectedRest,
      unselectedHover,
      unselectedPressed,
      unselectedFocus,
      unselectedDisabled,
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ] = await Promise.all(
      [
        "unselected-rest",
        "unselected-hover",
        "unselected-pressed",
        "unselected-focus-visible",
        "unselected-disabled",
        "selected-rest",
        "selected-hover",
        "selected-pressed",
        "selected-focus-visible",
        "selected-disabled",
      ].map(readStyle),
    );

    const unselectedBackground = parseCssColor(unselectedRest.background);
    expect(unselectedBackground.r).toBe(34);
    expect(unselectedBackground.g).toBe(79);
    expect(unselectedBackground.b).toBe(16);
    expect(unselectedBackground.a).toBeCloseTo(0.025, 2);
    expect(unselectedRest.color).toBe("rgba(13, 13, 13, 0.68)");
    expect(unselectedRest.border).toBe("rgba(34, 79, 16, 0.12)");

    expect(unselectedHover.background).toBe("rgba(34, 79, 16, 0.07)");
    expect(unselectedHover.border).toBe("rgba(34, 79, 16, 0.32)");
    expect(unselectedHover.indicatorOpacity).toBe("0");
    expect(unselectedPressed.background).toBe("rgba(34, 79, 16, 0.11)");
    expect(unselectedPressed.border).toBe("rgba(34, 79, 16, 0.42)");
    expect(unselectedPressed.indicatorOpacity).toBe("0");

    expect(selectedRest.background).toBe("rgba(34, 79, 16, 0.1)");
    expect(selectedRest.color).toBe("rgb(34, 79, 16)");
    expect(selectedRest.border).toBe("rgba(34, 79, 16, 0.32)");
    expect(selectedHover.background).toBe("rgba(34, 79, 16, 0.14)");
    expect(selectedHover.border).toBe("rgba(34, 79, 16, 0.4)");
    expect(selectedPressed.background).toBe("rgba(34, 79, 16, 0.18)");
    expect(selectedPressed.border).toBe("rgba(34, 79, 16, 0.48)");

    for (const state of [
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ]) {
      expect(state.indicatorOpacity).toBe("1");
    }

    expect(selectedRest.indicatorColor).toBe("rgb(34, 79, 16)");
    expect(selectedHover.indicatorColor).toBe("rgb(34, 79, 16)");
    expect(selectedPressed.indicatorColor).toBe("rgb(34, 79, 16)");
    expect(unselectedFocus.background).toBe(unselectedRest.background);
    expect(selectedFocus.background).toBe(selectedRest.background);

    for (const focusState of [unselectedFocus, selectedFocus]) {
      expect(focusState.outlineColor).toBe("rgba(34, 79, 16, 0.64)");
      expect(focusState.outlineWidth).toBe("2px");
      expect(focusState.outlineOffset).toBe("3px");
    }

    expect(unselectedDisabled.background).toBe("rgba(34, 79, 16, 0.02)");
    expect(unselectedDisabled.color).toBe("rgba(34, 79, 16, 0.34)");
    expect(unselectedDisabled.border).toBe("rgba(34, 79, 16, 0.06)");
    expect(selectedDisabled.background).toBe("rgba(34, 79, 16, 0.06)");
    expect(selectedDisabled.color).toBe("rgba(34, 79, 16, 0.42)");
    expect(selectedDisabled.border).toBe("rgba(34, 79, 16, 0.12)");
    expect(selectedDisabled.indicatorColor).toBe(
      "rgba(34, 79, 16, 0.42)",
    );

    for (const state of [
      unselectedRest,
      unselectedHover,
      unselectedPressed,
      unselectedFocus,
      unselectedDisabled,
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ]) {
      expect(state.shadow).toBe("none");
      expect(state.filter).toBe("none");
    }

    const restDocumentation = preview.locator(
      '[data-selection-state="unselected-rest"]',
    );
    await expect(restDocumentation).toContainText("rgba(34, 79, 16, .025)");
    await expect(restDocumentation).toContainText(
      "rgba(34, 79, 16, .025) -> rgba(34, 79, 16, 0.02)",
    );
    await expect(restDocumentation).not.toContainText("white");
    await expect(
      preview.locator('[data-selection-state="unselected-disabled"]'),
    ).toContainText("rgba(34, 79, 16, 0.02)");
  });

  test("completes the action selection matrix without changing its hierarchy", async ({
    page,
  }) => {
    await page.goto("/design-language/actions/");

    const preview = page.getByTestId("action-surface-preview");
    await page.getByRole("button", { name: "Action" }).click();
    await expect(preview).toHaveAttribute("data-surface-tone", "action");

    const stateButton = (state: string) =>
      preview.locator(`[data-selection-state="${state}"] button`);
    const readStyle = async (state: string) =>
      stateButton(state).evaluate((button) => {
        const indicator = button.querySelector('[data-selection-indicator="checkmark"]');
        const style = window.getComputedStyle(button);
        const indicatorStyle = indicator
          ? window.getComputedStyle(indicator)
          : null;

        return {
          background: style.backgroundColor,
          border: style.borderColor,
          color: style.color,
          filter: style.filter,
          indicatorColor: indicatorStyle?.color ?? "",
          indicatorOpacity: indicatorStyle?.opacity ?? "",
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          outlineWidth: style.outlineWidth,
          shadow: style.boxShadow,
        };
      });

    const [
      unselectedRest,
      unselectedHover,
      unselectedPressed,
      unselectedFocus,
      unselectedDisabled,
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ] = await Promise.all(
      [
        "unselected-rest",
        "unselected-hover",
        "unselected-pressed",
        "unselected-focus-visible",
        "unselected-disabled",
        "selected-rest",
        "selected-hover",
        "selected-pressed",
        "selected-focus-visible",
        "selected-disabled",
      ].map(readStyle),
    );

    expect(unselectedRest.background).toBe("rgba(13, 13, 13, 0.055)");
    expect(unselectedRest.color).toBe("rgba(13, 13, 13, 0.72)");
    expect(unselectedRest.border).toBe("rgba(13, 13, 13, 0.16)");
    expect(unselectedHover.background).toBe("rgba(13, 13, 13, 0.1)");
    expect(unselectedHover.border).toBe("rgba(13, 13, 13, 0.3)");
    expect(unselectedHover.indicatorOpacity).toBe("0");
    expect(unselectedPressed.background).toBe("rgba(13, 13, 13, 0.14)");
    expect(unselectedPressed.border).toBe("rgba(13, 13, 13, 0.4)");
    expect(unselectedPressed.indicatorOpacity).toBe("0");

    expect(selectedRest.background).toBe("rgba(13, 13, 13, 0.16)");
    expect(selectedRest.border).toBe("rgba(13, 13, 13, 0.46)");
    expect(selectedHover.background).toBe("rgba(13, 13, 13, 0.2)");
    expect(selectedHover.border).toBe("rgba(13, 13, 13, 0.56)");
    expect(selectedPressed.background).toBe("rgba(13, 13, 13, 0.24)");
    expect(selectedPressed.border).toBe("rgba(13, 13, 13, 0.64)");

    for (const state of [
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ]) {
      expect(state.indicatorOpacity).toBe("1");
    }

    expect(selectedRest.indicatorColor).toBe("rgb(13, 13, 13)");
    expect(selectedHover.indicatorColor).toBe("rgb(13, 13, 13)");
    expect(selectedPressed.indicatorColor).toBe("rgb(13, 13, 13)");
    expect(unselectedFocus.background).toBe(unselectedRest.background);
    expect(selectedFocus.background).toBe(selectedRest.background);

    for (const focusState of [unselectedFocus, selectedFocus]) {
      expect(focusState.outlineColor).toBe("rgba(13, 13, 13, 0.72)");
      expect(focusState.outlineWidth).toBe("2px");
      expect(focusState.outlineOffset).toBe("3px");
    }

    expect(unselectedDisabled.background).toBe("rgba(13, 13, 13, 0.03)");
    expect(unselectedDisabled.color).toBe("rgba(13, 13, 13, 0.36)");
    expect(unselectedDisabled.border).toBe("rgba(13, 13, 13, 0.08)");
    expect(selectedDisabled.background).toBe("rgba(13, 13, 13, 0.08)");
    expect(selectedDisabled.color).toBe("rgba(13, 13, 13, 0.42)");
    expect(selectedDisabled.border).toBe("rgba(13, 13, 13, 0.18)");
    expect(selectedDisabled.indicatorColor).toBe(
      "rgba(13, 13, 13, 0.42)",
    );

    for (const state of [
      unselectedRest,
      unselectedHover,
      unselectedPressed,
      unselectedFocus,
      unselectedDisabled,
      selectedRest,
      selectedHover,
      selectedPressed,
      selectedFocus,
      selectedDisabled,
    ]) {
      expect(state.shadow).toBe("none");
      expect(state.filter).toBe("none");
    }

    const disabledDocumentation = preview.locator(
      '[data-selection-state="selected-disabled"]',
    );
    await expect(disabledDocumentation).toContainText(
      "rgba(13, 13, 13, .18)",
    );
    await expect(disabledDocumentation).not.toContainText("234, 255, 208");

    const liveChip = page.getByTestId("selection-live-chip");
    await liveChip.hover();
    await expect(liveChip).toHaveCSS(
      "background-color",
      "rgba(13, 13, 13, 0.1)",
    );
    await page.mouse.down();
    await expect(liveChip).toHaveCSS(
      "background-color",
      "rgba(13, 13, 13, 0.14)",
    );
    await page.mouse.up();
    await expect(liveChip).toHaveAttribute("aria-pressed", "true");
    await expect(liveChip).toHaveCSS(
      "background-color",
      "rgba(13, 13, 13, 0.2)",
    );
  });
});
