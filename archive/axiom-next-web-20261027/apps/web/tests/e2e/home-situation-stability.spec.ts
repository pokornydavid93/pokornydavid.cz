import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const situations = [
  "mortgage-refixation",
  "new-housing",
  "insurance-review",
  "income-protection",
  "investing",
] as const;

const viewports = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 920, height: 900 },
  { width: 921, height: 900 },
  { width: 1024, height: 1024 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

const STACKED_MAX_WIDTH = 920;

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

async function readStageGeometry(page: Page, activeId: string) {
  return page.locator('[data-home-module="situations"]').evaluate(
    (section, situationId) => {
      const query = <ElementType extends HTMLElement>(selector: string) => {
        const element = section.querySelector<ElementType>(selector);
        if (!element) throw new Error(`Missing situation element: ${selector}`);
        return element;
      };
      const documentRect = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom + window.scrollY,
          height: rect.height,
          left: rect.left + window.scrollX,
          right: rect.right + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
        };
      };

      const selector = query<HTMLElement>("[data-situation-selector]");
      const choiceRail = query<HTMLElement>("[data-situation-choice-rail]");
      const detailViewport = query<HTMLElement>(
        "[data-situation-detail-viewport]",
      );
      const orientation = query<HTMLElement>("[data-orientation-surface]");
      const services = query<HTMLElement>("[data-situation-custom]");
      const process = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      );
      const panel = query<HTMLElement>(
        `[data-situation-panel="${situationId}"]`,
      );
      const activeChoice = query<HTMLElement>(
        `[data-situation-choice="${situationId}"]`,
      );
      const markers = Array.from(
        section.querySelectorAll<HTMLElement>(
          "[data-situation-choice-marker]",
        ),
      );
      const activeMarkers = markers.filter(
        (marker) => marker.dataset.active === "true",
      );
      const action = panel.querySelector<HTMLElement>(
        '[data-analytics-source="home-situations"]',
      );
      const panelStack = panel.parentElement;
      if (!process || !action || !panelStack) {
        throw new Error("The situation stage is incomplete.");
      }

      const choices = Array.from(
        section.querySelectorAll<HTMLElement>("[data-situation-choice]"),
      );
      const panels = Array.from(
        section.querySelectorAll<HTMLElement>("[data-situation-panel]"),
      );
      const firstPanelRect = panels[0]?.getBoundingClientRect();
      const choiceRailRect = choiceRail.getBoundingClientRect();
      const detailViewportRect = detailViewport.getBoundingClientRect();
      const visibleMarkers = markers.filter((marker) => {
        const rect = marker.getBoundingClientRect();
        const style = getComputedStyle(marker);
        return style.display !== "none"
          && style.visibility !== "hidden"
          && Number.parseFloat(style.opacity) > 0
          && rect.width > 0
          && rect.height > 0;
      });

      const panelsShareGridCell = Boolean(firstPanelRect) && panels.every(
        (candidate) => {
          const rect = candidate.getBoundingClientRect();
          return Math.abs(rect.top - firstPanelRect!.top) <= 1
            && Math.abs(rect.left - firstPanelRect!.left) <= 1
            && Math.abs(rect.width - firstPanelRect!.width) <= 1;
        },
      );

      return {
        activePanelCount: section.querySelectorAll(
          '[data-situation-panel][data-active="true"]',
        ).length,
        activeMarkerCount: activeMarkers.length,
        activeMarkerInsideSelectedChoice:
          activeMarkers.length === 1
          && activeChoice.contains(activeMarkers[0]!),
        activeMarkerIsVisible:
          activeMarkers.length === 1
          && visibleMarkers.includes(activeMarkers[0]!),
        activePanelFits:
          panel.scrollHeight <= panel.clientHeight + 1
          && panel.scrollWidth <= panel.clientWidth + 1,
        ariaContract: choices.every((choice) => {
          const controlledId = choice.getAttribute("aria-controls");
          const labelledPanel = controlledId
            ? section.querySelector<HTMLElement>(`#${CSS.escape(controlledId)}`)
            : null;
          return choice.getAttribute("role") === "tab"
            && labelledPanel?.getAttribute("role") === "tabpanel"
            && labelledPanel.getAttribute("aria-labelledby") === choice.id;
        }),
        choiceGeometry: choices.flatMap((choice) => {
          const rect = documentRect(choice);
          return [rect.top, rect.height, rect.width];
        }),
        choicesPrecedeDetail: choices.every(
          (choice) => choice.getBoundingClientRect().bottom
            <= detailViewportRect.top + 1,
        ),
        connectorCount: section.querySelectorAll(
          "[data-situation-connector]",
        ).length,
        detailViewport: documentRect(detailViewport),
        detailViewportCount: section.querySelectorAll(
          "[data-situation-detail-viewport]",
        ).length,
        disclosureCount: section.querySelectorAll(
          "[data-situation-accordion-disclosure]",
        ).length,
        documentOverflow:
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
        inactivePanelCount: section.querySelectorAll(
          "[data-situation-panel][inert]",
        ).length,
        metadataCount: panel.querySelectorAll("ul li").length,
        markerCount: markers.length,
        orientation: documentRect(orientation),
        panelCount: panels.length,
        panelsShareGridCell,
        panelsUseGridFlow: panels.every(
          (candidate) => getComputedStyle(candidate).position !== "absolute",
        ),
        panelStackDisplay: getComputedStyle(panelStack).display,
        processTop: documentRect(process).top,
        section: documentRect(section as HTMLElement),
        selector: documentRect(selector),
        services: documentRect(services),
        servicesFilter: getComputedStyle(services).filter,
        servicesOutsideStage:
          !selector.contains(services)
          && !detailViewport.contains(services),
        servicesTransform: getComputedStyle(services).transform,
        stageRuleCount: section.querySelectorAll(
          "[data-situation-stage-rule]",
        ).length,
        sideBySide:
          choiceRailRect.right <= detailViewportRect.left + 1
          && choiceRailRect.top < detailViewportRect.bottom
          && detailViewportRect.top < choiceRailRect.bottom,
        tablistOrientation: choiceRail.getAttribute("aria-orientation"),
        tablistRole: choiceRail.getAttribute("role"),
        uniquePanelIds:
          new Set(panels.map(({ id }) => id)).size === panels.length,
        visibleMarkerCount: visibleMarkers.length,
      };
    },
    activeId,
  );
}

function expectNear(
  actual: number,
  expected: number,
  label: string,
  tolerance = 1,
) {
  expect(
    Math.abs(actual - expected),
    `${label}: expected ${actual} to remain within ${tolerance}px of ${expected}`,
  ).toBeLessThanOrEqual(tolerance);
}

function cssTimeToMilliseconds(value: string) {
  const trimmed = value.trim();
  if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed);
  if (trimmed.endsWith("s")) return Number.parseFloat(trimmed) * 1_000;
  return 0;
}

test.describe("homepage situation advisor note", () => {
  test("keeps one stable tablist, panel grid, and active marker across viewports", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      const section = page.locator('[data-home-module="situations"]');
      const tablist = section.getByRole("tablist", {
        name: "Vyberte finanční situaci",
      });
      const tabs = tablist.getByRole("tab");
      await expect(tablist).toHaveAttribute("aria-orientation", "vertical");
      await expect(tabs).toHaveCount(situations.length);
      await expect(section.locator("[data-situation-detail-viewport]"))
        .toHaveCount(1);
      await expect(section.locator("[data-situation-connector]"))
        .toHaveCount(0);
      await expect(section.locator("[data-situation-choice-marker]"))
        .toHaveCount(situations.length);
      await expect(section.locator("[data-situation-stage-rule]"))
        .toHaveCount(1);
      await expect(section.locator("[data-situation-route-track]"))
        .toHaveCount(0);
      await expect(section.locator("[data-situation-route-node]"))
        .toHaveCount(0);
      await expect(section.locator(
        '[data-situation-choice-route][data-active="true"]',
      )).toHaveCount(0);
      await expect(section.locator(
        '[data-situation-choice-marker][data-active="true"]',
      )).toHaveCount(1);
      await expect(section.locator(
        "[data-situation-accordion-disclosure]",
      )).toHaveCount(0);
      await expect(section.locator("[data-situation-custom]"))
        .toHaveCount(1);
      await expect(section.locator(
        '[data-situation-choice-rail] [data-situation-custom], '
        + '[data-situation-detail-viewport] [data-situation-custom]',
      )).toHaveCount(0);
      await expect(section.locator("[data-situation-shared-microcopy]"))
        .toHaveCount(0);

      const visibleChoiceText = (await tabs.allTextContents()).join(" ");
      expect(visibleChoiceText).not.toMatch(/\b0[1-6]\b/);

      const servicesLink = section.locator(
        '[data-situation-custom] [data-custom-situation-link]',
      );
      await expect(servicesLink).toHaveAttribute(
        "href",
        "/sluzby/",
      );
      const orientation = section.locator("[data-orientation-path]");
      await expect(orientation).toHaveAttribute(
        "data-analytics-event",
        "home_situation_select",
      );
      await expect(orientation).toHaveAttribute(
        "data-analytics-source",
        "home-situations",
      );

      let baseline: Awaited<ReturnType<typeof readStageGeometry>> | undefined;
      for (const situation of situations) {
        const choice = section.locator(
          `[data-situation-choice="${situation}"]`,
        );
        await choice.click();
        await expect(choice).toHaveAttribute("aria-selected", "true");
        await expect(choice).toHaveAttribute("tabindex", "0");
        const activeMarker = choice.locator(
          '[data-situation-choice-marker][data-active="true"]',
        );
        await expect(activeMarker).toHaveCount(1);
        await expect(activeMarker).toBeVisible();

        const activePanel = section.locator(
          `[data-situation-panel="${situation}"]`,
        );
        await expect(activePanel).toHaveAttribute("data-active", "true");
        await expect(activePanel).toHaveAttribute("aria-hidden", "false");
        await expect(activePanel).toBeVisible();
        await expect(section.locator(
          '[data-situation-panel][data-active="true"]',
        )).toHaveCount(1);
        await expect(section.locator("[data-situation-panel][inert]"))
          .toHaveCount(situations.length - 1);
        await expect(activePanel.locator("ul li")).toHaveCount(3);

        const panelAction = activePanel.locator(
          '[data-analytics-source="home-situations"]',
        );
        await expect(panelAction).toHaveCount(1);
        await expect(panelAction).toHaveAttribute(
          "data-analytics-event",
          "home_situation_select",
        );
        await expect(panelAction).toHaveAttribute(
          "data-situation-id",
          situation,
        );
        expect(await panelAction.getAttribute("data-analytics-destination"))
          .toBe(await panelAction.getAttribute("href"));

        const geometry = await readStageGeometry(page, situation);
        expect(geometry.tablistRole).toBe("tablist");
        expect(geometry.tablistOrientation).toBe("vertical");
        expect(geometry.ariaContract).toBe(true);
        expect(geometry.panelCount).toBe(situations.length);
        expect(geometry.uniquePanelIds).toBe(true);
        expect(geometry.activePanelCount).toBe(1);
        expect(geometry.inactivePanelCount).toBe(situations.length - 1);
        expect(geometry.detailViewportCount).toBe(1);
        expect(geometry.disclosureCount).toBe(0);
        expect(geometry.connectorCount).toBe(0);
        expect(geometry.markerCount).toBe(situations.length);
        expect(geometry.stageRuleCount).toBe(1);
        expect(geometry.activeMarkerCount).toBe(1);
        expect(geometry.visibleMarkerCount).toBe(1);
        expect(geometry.activeMarkerIsVisible).toBe(true);
        expect(geometry.activeMarkerInsideSelectedChoice).toBe(true);
        expect(geometry.panelStackDisplay).toBe("grid");
        expect(geometry.panelsUseGridFlow).toBe(true);
        expect(geometry.panelsShareGridCell).toBe(true);
        expect(geometry.activePanelFits).toBe(true);
        expect(geometry.metadataCount).toBe(3);
        expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
        expect(geometry.servicesOutsideStage).toBe(true);
        expect(geometry.servicesTransform).toBe("none");
        expect(geometry.servicesFilter).toBe("none");

        if (viewport.width <= STACKED_MAX_WIDTH) {
          expect(geometry.choicesPrecedeDetail).toBe(true);
          expect(geometry.sideBySide).toBe(false);
        } else {
          expect(geometry.sideBySide).toBe(true);
        }

        if (!baseline) {
          baseline = geometry;
          continue;
        }

        for (const key of ["top", "height", "bottom"] as const) {
          expectNear(
            geometry.selector[key],
            baseline.selector[key],
            `${viewport.width}px selector ${key}`,
          );
          expectNear(
            geometry.section[key],
            baseline.section[key],
            `${viewport.width}px section ${key}`,
          );
          expectNear(
            geometry.detailViewport[key],
            baseline.detailViewport[key],
            `${viewport.width}px shared detail ${key}`,
          );
          expectNear(
            geometry.services[key],
            baseline.services[key],
            `${viewport.width}px services ${key}`,
          );
          expectNear(
            geometry.orientation[key],
            baseline.orientation[key],
            `${viewport.width}px orientation ${key}`,
          );
        }
        expectNear(
          geometry.processTop,
          baseline.processTop,
          `${viewport.width}px following section top`,
        );
        geometry.choiceGeometry.forEach((value, index) => {
          expectNear(
            value,
            baseline!.choiceGeometry[index]!,
            `${viewport.width}px choice metric ${index}`,
          );
        });
      }
    }
  });

  test("uses interruptible restrained motion without moving stage utility", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const intentionalChoice = page.locator(
      '[data-situation-choice="insurance-review"]',
    );
    await intentionalChoice.hover();
    await expect(intentionalChoice).toHaveAttribute("aria-selected", "false");
    await intentionalChoice.click();
    await expect(intentionalChoice).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(
      '[data-situation-panel="insurance-review"]',
    )).toHaveAttribute("aria-hidden", "false");

    const samples = await page.locator(
      '[data-home-module="situations"]',
    ).evaluate(async (section) => {
      const choices = [
        "investing",
        "new-housing",
        "income-protection",
      ].map((id) => section.querySelector<HTMLButtonElement>(
        `[data-situation-choice="${id}"]`,
      )!);
      const selector = section.querySelector<HTMLElement>(
        "[data-situation-selector]",
      )!;
      const detail = section.querySelector<HTMLElement>(
        "[data-situation-detail-viewport]",
      )!;
      const services = section.querySelector<HTMLElement>(
        "[data-situation-custom]",
      )!;
      const orientation = section.querySelector<HTMLElement>(
        "[data-orientation-surface]",
      )!;
      const process = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const frames: Array<{
        detailHeight: number;
        detailTop: number;
        maxScaleDelta: number;
        maxTranslateY: number;
        orientationTop: number;
        processTop: number;
        selectorHeight: number;
        servicesMotionless: boolean;
        servicesTop: number;
      }> = [];

      choices[0].click();
      window.setTimeout(() => choices[1].click(), 70);
      window.setTimeout(() => choices[2].click(), 140);
      const start = performance.now();

      await new Promise<void>((resolve) => {
        const sample = (now: number) => {
          const panels = Array.from(
            section.querySelectorAll<HTMLElement>("[data-situation-panel]"),
          );
          let maxTranslateY = 0;
          let maxScaleDelta = 0;
          for (const panel of panels) {
            const transform = getComputedStyle(panel).transform;
            if (transform === "none") continue;
            const matrix = new DOMMatrixReadOnly(transform);
            maxTranslateY = Math.max(maxTranslateY, Math.abs(matrix.m42));
            maxScaleDelta = Math.max(
              maxScaleDelta,
              Math.abs(matrix.a - 1),
              Math.abs(matrix.d - 1),
            );
          }

          const servicesStyle = getComputedStyle(services);
          const detailRect = detail.getBoundingClientRect();
          frames.push({
            detailHeight: detailRect.height,
            detailTop: detailRect.top,
            maxScaleDelta,
            maxTranslateY,
            orientationTop: orientation.getBoundingClientRect().top,
            processTop: process.getBoundingClientRect().top,
            selectorHeight: selector.getBoundingClientRect().height,
            servicesMotionless:
              servicesStyle.transform === "none"
              && servicesStyle.filter === "none",
            servicesTop: services.getBoundingClientRect().top,
          });

          if (now - start >= 650) {
            resolve();
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });

      return frames;
    });

    const spread = (
      key:
        | "detailHeight"
        | "detailTop"
        | "orientationTop"
        | "processTop"
        | "selectorHeight"
        | "servicesTop",
    ) => {
      const values = samples.map((sample) => sample[key]);
      return Math.max(...values) - Math.min(...values);
    };
    expect(spread("selectorHeight")).toBeLessThanOrEqual(1);
    expect(spread("detailHeight")).toBeLessThanOrEqual(1);
    expect(spread("detailTop")).toBeLessThanOrEqual(1);
    expect(spread("servicesTop")).toBeLessThanOrEqual(1);
    expect(spread("orientationTop")).toBeLessThanOrEqual(1);
    expect(spread("processTop")).toBeLessThanOrEqual(1);
    expect(samples.every(({ servicesMotionless }) => servicesMotionless))
      .toBe(true);
    expect(Math.max(...samples.map(({ maxTranslateY }) => maxTranslateY)))
      .toBeLessThanOrEqual(12);
    expect(Math.max(...samples.map(({ maxScaleDelta }) => maxScaleDelta)))
      .toBeLessThanOrEqual(0.002);

    const finalChoice = page.locator(
      '[data-situation-choice="income-protection"]',
    );
    await expect(finalChoice).toHaveAttribute("aria-selected", "true");
    await expect(finalChoice).toHaveAttribute("tabindex", "0");
    await expect(page.locator(
      '[data-situation-panel][aria-hidden="false"]',
    )).toHaveCount(1);
    await expect(page.locator("[data-situation-panel][inert]"))
      .toHaveCount(situations.length - 1);

    const geometry = await readStageGeometry(page, "income-protection");
    expect(geometry.activeMarkerCount).toBe(1);
    expect(geometry.visibleMarkerCount).toBe(1);
    expect(geometry.activeMarkerIsVisible).toBe(true);
    expect(geometry.activeMarkerInsideSelectedChoice).toBe(true);
  });

  test("keeps the vertical tab pattern keyboard-complete at both layouts", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });

      const section = page.locator('[data-home-module="situations"]');
      const tablist = section.getByRole("tablist", {
        name: "Vyberte finanční situaci",
      });
      const tabs = tablist.getByRole("tab");
      await expect(tabs).toHaveCount(situations.length);

      await tabs.first().focus();
      await page.keyboard.press("ArrowUp");
      await expect(tabs.last()).toBeFocused();
      await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("Home");
      await expect(tabs.first()).toBeFocused();
      await page.keyboard.press("End");
      await expect(tabs.last()).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(tabs.first()).toBeFocused();
      await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
      await expect(tabs.first()).toHaveAttribute("tabindex", "0");
      await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");

      await page.keyboard.press("Tab");
      const activePanel = section.locator(
        '[data-situation-panel][data-active="true"]',
      );
      expect(await activePanel.evaluate((panel) => (
        panel === document.activeElement || panel.contains(document.activeElement)
      ))).toBe(true);

      await tabs.nth(2).focus();
      await page.keyboard.press("Space");
      await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
      await expect(section.locator(
        '[data-situation-panel="insurance-review"]',
      )).toHaveAttribute("aria-hidden", "false");
      await expect(section.locator(
        '[data-situation-panel][data-active="true"]',
      )).toHaveCount(1);
    }
  });

  test("puts all compact choices before one natural-height detail", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const section = page.locator('[data-home-module="situations"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveAttribute(
      "data-situation-entry-state",
      "complete",
    );
    await expect(section.getByRole("tablist", {
      name: "Vyberte finanční situaci",
    })).toBeVisible();
    await expect(section.locator("[data-situation-detail-viewport]"))
      .toHaveCount(1);
    await expect(section.locator("[data-situation-accordion-disclosure]"))
      .toHaveCount(0);

    const heightSamples = await section.evaluate(async (element) => {
      const selector = element.querySelector<HTMLElement>(
        "[data-situation-selector]",
      )!;
      const detail = element.querySelector<HTMLElement>(
        "[data-situation-detail-viewport]",
      )!;
      const choice = element.querySelector<HTMLButtonElement>(
        '[data-situation-choice="income-protection"]',
      )!;
      const samples: Array<{ detail: number; selector: number }> = [];
      const startedAt = performance.now();

      choice.click();
      await new Promise<void>((resolve) => {
        const sample = (now: number) => {
          samples.push({
            detail: detail.getBoundingClientRect().height,
            selector: selector.getBoundingClientRect().height,
          });
          if (now - startedAt >= 460) {
            resolve();
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });

      return samples;
    });
    expect(
      Math.max(...heightSamples.map(({ selector }) => selector))
      - Math.min(...heightSamples.map(({ selector }) => selector)),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.max(...heightSamples.map(({ detail }) => detail))
      - Math.min(...heightSamples.map(({ detail }) => detail)),
    ).toBeLessThanOrEqual(1);

    const geometry = await readStageGeometry(page, "income-protection");
    expect(geometry.choicesPrecedeDetail).toBe(true);
    expect(geometry.sideBySide).toBe(false);
    expect(geometry.servicesOutsideStage).toBe(true);
    expect(geometry.activePanelCount).toBe(1);
    expect(geometry.inactivePanelCount).toBe(situations.length - 1);
  });

  test("removes panel and marker motion when reduced motion is requested", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const durations = await page.locator(
      '[data-home-module="situations"]',
    ).evaluate((section) => Array.from(section.querySelectorAll<HTMLElement>(
      "[data-situation-panel], [data-situation-choice-marker]",
    )).flatMap((element) => {
      const style = getComputedStyle(element);
      return [style.transitionDuration, style.animationDuration]
        .flatMap((value) => value.split(","));
    }));
    expect(Math.max(...durations.map(cssTimeToMilliseconds)))
      .toBeLessThanOrEqual(1);

    const finalChoice = page.locator('[data-situation-choice="investing"]');
    await finalChoice.click();
    await expect(finalChoice).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(
      '[data-situation-panel="investing"]',
    )).toHaveAttribute("aria-hidden", "false");
  });

  test("passes automated accessibility checks at compact and split layouts", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 920, height: 900 },
      { width: 921, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page })
        .include('[data-home-module="situations"]')
        .analyze();
      expect(
        results.violations.filter(({ impact }) =>
          impact === "critical" || impact === "serious"),
      ).toEqual([]);
    }
  });
});
