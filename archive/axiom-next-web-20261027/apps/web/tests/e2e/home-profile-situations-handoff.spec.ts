import { expect, test, type Page } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const ENTRY_CONTROLLER = "[data-profile-situations-handoff]";
const ENTRY_SOURCE = "[data-profile-situation-source]";
const ENTRY_TARGET = "[data-profile-situation-transition-target]";

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

async function openHomepage(
  page: Page,
  viewport = DESKTOP_VIEWPORT,
  path = "/",
) {
  await primeRejectedConsent(page);
  await page.setViewportSize(viewport);
  await page.goto(path, { waitUntil: "networkidle" });
  const intro = page.locator("[data-home-intro]");
  await intro.waitFor({ state: "attached" });
  await expect.poll(async () => {
    await page.keyboard.press("Escape");
    return intro.evaluate(
      (element) => getComputedStyle(element).display === "none",
    );
  }, { timeout: 20_000 }).toBe(true);
  const controller = page.locator(ENTRY_CONTROLLER);
  await controller.waitFor({ state: "attached", timeout: 30_000 });
  await expect(controller).not.toHaveAttribute("data-state", "loading");
  return controller;
}

async function readBoundary(page: Page) {
  return page.evaluate(({ sourceSelector, targetSelector }) => {
    const source = document.querySelector<HTMLElement>(sourceSelector)!;
    const target = document.querySelector<HTMLElement>(targetSelector)!;
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    return {
      sourceBottom: sourceRect.bottom,
      sourceDocumentBottom: sourceRect.bottom + window.scrollY,
      sourceFrozen: source.hasAttribute(
        "data-profile-situation-handoff-frozen",
      ),
      sourceInert: source.inert,
      sourcePinAncestor: Boolean(source.closest(".pin-spacer")),
      sourcePosition: getComputedStyle(source).position,
      sourceVisibility: getComputedStyle(source).visibility,
      targetDocumentTop: targetRect.top + window.scrollY,
      targetInert: target.inert,
      targetPosition: getComputedStyle(target).position,
      targetTop: targetRect.top,
      targetVisibility: getComputedStyle(target).visibility,
    };
  }, {
    sourceSelector: ENTRY_SOURCE,
    targetSelector: ENTRY_TARGET,
  });
}

async function readEntryParts(page: Page) {
  return page.locator(ENTRY_TARGET).evaluate((target) => {
    const read = (selector: string) => {
      const element = target.querySelector<HTMLElement>(selector)!;
      const style = getComputedStyle(element);
      return {
        opacity: Number.parseFloat(style.opacity),
        transform: style.transform,
        visibility: style.visibility,
      };
    };

    return {
      copy: read("[data-situation-intro-copy]"),
      heading: read("[data-situation-intro-heading]"),
      nav: read("[data-situation-selector-nav]"),
    };
  });
}

async function readMotionLayers(page: Page) {
  return page.locator(ENTRY_TARGET).evaluate((target) => {
    const style = (selector: string) => {
      const element = target.querySelector<HTMLElement>(selector)!;
      const computed = getComputedStyle(element);
      return {
        clipPath: computed.clipPath,
        opacity: Number.parseFloat(computed.opacity),
        transform: computed.transform,
        y: new DOMMatrixReadOnly(computed.transform).m42,
      };
    };

    return {
      activeChoiceInk: style(
        '[data-situation-row][data-active="true"] '
        + "[data-situation-choice-ink] > span",
      ),
      activeDetail: style("[data-situation-dark-plane]"),
      activeTopic: style(
        '[data-situation-panel][data-active="true"] '
        + "[data-situation-topic-ink]",
      ),
      stageRule: style("[data-situation-stage-rule]"),
      titleInk: style("[data-situation-title-token-ink]"),
    };
  });
}

async function readActiveDisclosure(page: Page) {
  return page.locator(ENTRY_TARGET).evaluate((target) => {
    const activeRow = target.querySelector<HTMLElement>(
      '[data-situation-row][data-active="true"]',
    );
    const label = activeRow?.querySelector<HTMLElement>(
      "[data-situation-choice-ink]",
    );
    const labelInk = label?.querySelector<HTMLElement>("span");
    const summary = label?.nextElementSibling as HTMLElement | null;
    const detail = activeRow?.querySelector<HTMLElement>(
      "[data-situation-detail-viewport]",
    );
    const panelContentSelectors = [
      "[data-situation-panel-label-ink]",
      "[data-situation-topic-ink]",
      "[data-situation-start-ink]",
      "[data-situation-service] > span",
      "[data-situation-panel-action]",
    ];
    const content = [
      labelInk,
      ...Array.from(detail?.querySelectorAll<HTMLElement>(
        panelContentSelectors.join(","),
      ) ?? []),
    ].filter((element): element is HTMLElement => Boolean(element));

    if (!activeRow || !label || !labelInk || !summary || !detail
      || panelContentSelectors.some((selector) => !detail.querySelector(selector))) {
      throw new Error("The active situation disclosure is incomplete.");
    }

    const labelRect = label.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();
    const detailStyle = getComputedStyle(detail);

    return {
      content: content.map((element) => {
        const style = getComputedStyle(element);
        return {
          opacity: Number.parseFloat(style.opacity),
          transform: style.transform,
          y: new DOMMatrixReadOnly(style.transform).m42,
          visibility: style.visibility,
        };
      }),
      detailOpacity: Number.parseFloat(detailStyle.opacity),
      detailTransform: detailStyle.transform,
      detailVisibility: detailStyle.visibility,
      labelSummaryGap: summaryRect.top - labelRect.bottom,
    };
  });
}

function expectDisclosureSurface(disclosure: Awaited<
  ReturnType<typeof readActiveDisclosure>
>) {
  expect(disclosure.detailOpacity).toBe(1);
  expect(disclosure.detailVisibility).toBe("visible");
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"])
    .toContain(disclosure.detailTransform);
  expect(disclosure.labelSummaryGap).toBeGreaterThanOrEqual(0);
}

function expectDisclosureSettled(disclosure: Awaited<
  ReturnType<typeof readActiveDisclosure>
>) {
  expectDisclosureSurface(disclosure);
  for (const part of disclosure.content) {
    expect(part.opacity).toBe(1);
    expect(part.visibility).toBe("visible");
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"])
      .toContain(part.transform);
  }
}

async function scrollActiveDisclosureToCompletion(page: Page) {
  const bottom = await page.locator(
    '[data-situation-panel][data-active="true"]',
  ).evaluate((panel) => panel.getBoundingClientRect().bottom + window.scrollY);
  await page.evaluate((top) => window.scrollTo(0, top), (
    bottom - page.viewportSize()!.height * 0.8
  ));
  await expect.poll(async () => (await readActiveDisclosure(page)).content
    .every((part) => part.opacity === 1 && Math.abs(part.y) < 0.05)).toBe(true);
}

test.describe("homepage profile to situations natural entry", () => {
  test("keeps both sections in normal document flow without a pin or scroll owner", async ({
    page,
  }) => {
    const controller = await openHomepage(page);
    const source = page.locator(ENTRY_SOURCE);
    const target = page.locator(ENTRY_TARGET);

    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute("data-drive", "natural-scroll");
    await expect(controller).toHaveAttribute(
      "data-playback-state",
      "scroll-linked",
    );
    await expect(controller).toHaveAttribute(
      "data-reveal",
      "editorial-rise",
    );
    await expect(target).toHaveAttribute(
      "data-profile-situation-handoff-mode",
      "natural-flow",
    );
    await expect(target).not.toHaveAttribute("data-profile-transition-layer");
    await expect(source).not.toHaveAttribute(
      "data-profile-situation-handoff-frozen",
    );

    const initial = await readBoundary(page);
    expect(Math.abs(initial.targetTop - initial.sourceBottom)).toBeLessThanOrEqual(1);
    expect(initial.sourceDocumentBottom).toBeCloseTo(initial.targetDocumentTop, 0);
    expect(initial.sourcePosition).not.toMatch(/fixed|sticky/u);
    expect(initial.targetPosition).not.toMatch(/fixed|sticky/u);
    expect(initial).toMatchObject({
      sourceFrozen: false,
      sourceInert: false,
      sourcePinAncestor: false,
      sourceVisibility: "visible",
      targetInert: false,
      targetVisibility: "visible",
    });
    expect(await page.evaluate(() => {
      const gsapWindow = window as Window & {
        ScrollTrigger?: {
          getById?: (id: string) => unknown;
        };
      };
      return Boolean(
        gsapWindow.ScrollTrigger?.getById?.(
          "home-profile-situations-handoff",
        ),
      );
    })).toBe(false);

    const targetDocumentTop = initial.targetDocumentTop;
    await page.evaluate((top) => window.scrollTo(0, top), targetDocumentTop - 680);
    const before = await readBoundary(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 180));
    await page.waitForTimeout(80);
    const after = await readBoundary(page);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    const scrollDelta = scrollAfter - scrollBefore;

    expect(scrollDelta).toBeGreaterThan(100);
    expect(Math.abs(
      (after.targetTop - before.targetTop) + scrollDelta,
    )).toBeLessThanOrEqual(2);
    expect(Math.abs(
      after.targetDocumentTop - targetDocumentTop,
    )).toBeLessThanOrEqual(1);
    expect(Math.abs(after.targetTop - after.sourceBottom)).toBeLessThanOrEqual(1);
  });

  test("reveals the situations editorially without moving the page", async ({
    page,
  }) => {
    const controller = await openHomepage(page);
    await expect(controller).toHaveAttribute("data-entry-state", "waiting");

    const initialParts = await readEntryParts(page);
    expect(initialParts.heading.opacity).toBe(0);
    expect(initialParts.copy.opacity).toBe(0);
    expect(initialParts.nav.opacity).toBe(1);
    expect(initialParts.heading.transform).not.toBe("none");
    expect(initialParts.nav.transform).toBe("none");
    await expect(page.locator("[data-situation-header-rule]"))
      .toHaveCount(0);
    const initialLayers = await readMotionLayers(page);
    expect(initialLayers.titleInk.transform).not.toBe("none");
    expect(initialLayers.stageRule.transform).not.toBe("none");
    for (const part of [initialLayers.activeChoiceInk, initialLayers.activeTopic]) {
      expect(part.clipPath).toBe("none");
      expect(part.opacity).toBeCloseTo(0.2, 2);
      expect(part.y).toBeGreaterThan(10);
    }
    for (const part of [initialLayers.activeDetail]) {
      expect(part.clipPath).toBe("none");
      expect(part.opacity).toBe(1);
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"])
        .toContain(part.transform);
    }

    const targetDocumentTop = await page.locator(ENTRY_TARGET).evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    await page.evaluate((top) => window.scrollTo(0, top), (
      targetDocumentTop - DESKTOP_VIEWPORT.height * 0.86
    ));
    await page.evaluate(() => window.scrollBy(0, 60));
    await expect(controller).toHaveAttribute("data-entry-state", "revealing");
    const animationScrollY = await page.evaluate(() => window.scrollY);
    await page.evaluate((top) => window.scrollTo(0, top), (
      targetDocumentTop - DESKTOP_VIEWPORT.height * 0.46
    ));
    await expect(controller).toHaveAttribute("data-entry-state", "complete");
    const settledScrollY = await page.evaluate(() => window.scrollY);

    expect(settledScrollY).toBeGreaterThan(animationScrollY);
    await expect(controller).toHaveAttribute("data-active", "false");
    await expect(controller).toHaveAttribute("data-scene-phase", "complete");
    await expect(controller).toHaveAttribute("data-scene-progress", "1.000");
    const settledParts = await readEntryParts(page);
    for (const part of Object.values(settledParts)) {
      expect(part.opacity).toBe(1);
      expect(part.visibility).toBe("visible");
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"])
        .toContain(part.transform);
    }
    // Completing the intro does not prematurely complete the row and panel
    // farther down the page. Their own scroll ranges reveal their full copy.
    await scrollActiveDisclosureToCompletion(page);
    const settledLayers = await readMotionLayers(page);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"])
      .toContain(settledLayers.titleInk.transform);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"])
      .toContain(settledLayers.stageRule.transform);
    for (const part of [
      settledLayers.activeChoiceInk,
      settledLayers.activeDetail,
      settledLayers.activeTopic,
    ]) {
      expect(part.clipPath).toBe("none");
      expect(part.opacity).toBe(1);
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"])
        .toContain(part.transform);
    }

    const source = page.locator(ENTRY_SOURCE);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(controller).toHaveAttribute("data-entry-state", "waiting");
    await expect(controller).toHaveAttribute(
      "data-playback-state",
      "scroll-linked",
    );
    await expect(source).not.toHaveAttribute(
      "data-profile-situation-handoff-frozen",
    );
  });

  test("reveals every open disclosure on forward scroll and resets its content on reverse scroll", async ({
    page,
  }) => {
    const controller = await openHomepage(page);
    const targetDocumentTop = await page.locator(ENTRY_TARGET).evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );

    await page.evaluate((top) => {
      window.scrollTo(0, top - 64);
    }, targetDocumentTop);
    await page.evaluate(() => new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    }));

    await scrollActiveDisclosureToCompletion(page);
    expectDisclosureSettled(await readActiveDisclosure(page));
    await expect(controller).toHaveAttribute("data-entry-state", "complete");

    const secondChoice = page.locator(
      '[data-situation-choice="new-housing"]',
    );
    await secondChoice.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await expect(secondChoice).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(500);
    await scrollActiveDisclosureToCompletion(page);
    expectDisclosureSettled(await readActiveDisclosure(page));

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    }));
    await expect.poll(async () => (await readActiveDisclosure(page)).content
      .every((part) => part.opacity < 0.4 && part.y > 8)).toBe(true);
    const reversedDisclosure = await readActiveDisclosure(page);
    expectDisclosureSurface(reversedDisclosure);
    for (const part of reversedDisclosure.content) {
      expect(part.opacity).toBeGreaterThan(0.15);
      expect(part.visibility).toBe("visible");
    }
  });

  test("keeps a keyboard-focused choice visible during the scrub", async ({
    page,
  }) => {
    const controller = await openHomepage(page);
    await expect(controller).toHaveAttribute("data-entry-state", "waiting");

    await page.locator("[data-situation-choice]").first().focus();
    await expect(controller).toHaveAttribute(
      "data-entry-state",
      /revealing|complete/u,
    );
    await expect(page.locator("[data-situation-choice]").first()).toBeFocused();
    const parts = await readEntryParts(page);
    expect(parts.nav).toEqual({
      opacity: 1,
      transform: "none",
      visibility: "visible",
    });
    const focusedRow = page.locator("[data-situation-row]").first();
    for (const selector of [
      "[data-situation-choice-index]",
      "[data-situation-choice-context]",
      "[data-situation-choice-ink] > span",
      "[data-situation-choice-summary]",
      "[data-situation-choice-count]",
    ]) {
      const ink = focusedRow.locator(selector);
      await expect(ink).toHaveCSS("opacity", "1");
      await expect.poll(async () => ink.evaluate((element) => (
        new DOMMatrixReadOnly(getComputedStyle(element).transform).isIdentity
      ))).toBe(true);
    }

    const panelAction = focusedRow.locator("[data-situation-panel-action]");
    await panelAction.focus();
    await expect(panelAction).toBeFocused();
    await expect(panelAction).toBeVisible();
    await expect(panelAction).toHaveCSS("opacity", "1");
    await expect.poll(async () => panelAction.evaluate((element) => (
      new DOMMatrixReadOnly(getComputedStyle(element).transform).isIdentity
    ))).toBe(true);
    await expect.poll(async () => panelAction.evaluate((action) => {
      const group = action.closest<HTMLElement>("[data-situation-panel-reveal]")!;
      const visibleContent = Array.from(group.querySelectorAll<HTMLElement>([
        "[data-situation-panel-label-ink]",
        "[data-situation-start-ink]",
        "[data-situation-service] > span",
        "[data-situation-panel-action]",
      ].join(","))).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      return visibleContent.length >= 2 && visibleContent.every((element) => {
        const style = getComputedStyle(element);
        return Number.parseFloat(style.opacity) === 1
          && style.visibility === "visible"
          && new DOMMatrixReadOnly(style.transform).isIdentity;
      });
    })).toBe(true);
  });

  test("uses the native anchor landing and opens situations fully settled", async ({
    page,
  }) => {
    const controller = await openHomepage(
      page,
      DESKTOP_VIEWPORT,
      "/#situace",
    );
    const target = page.locator(ENTRY_TARGET);

    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute("data-entry-state", "complete");
    await expect(controller).toHaveAttribute(
      "data-playback-state",
      "scroll-linked",
    );
    await expect(target).not.toHaveAttribute("inert", "");
    await expect(target).not.toHaveAttribute("data-profile-transition-layer");
    const parts = await readEntryParts(page);
    for (const part of Object.values(parts)) {
      expect(part.opacity).toBe(1);
      expect(part.transform).toBe("none");
    }

    const targetTop = await target.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    expect(targetTop).toBeGreaterThanOrEqual(64);
    expect(targetTop).toBeLessThanOrEqual(180);
    expect((await readBoundary(page)).sourcePinAncestor).toBe(false);
  });

  test("keeps the compact composition natural and gives the orientation path breathing room", async ({
    page,
  }) => {
    const controller = await openHomepage(
      page,
      MOBILE_VIEWPORT,
      "/#situace",
    );
    const target = page.locator(ENTRY_TARGET);

    await expect(controller).toHaveAttribute("data-drive", "natural-scroll");
    await expect(controller).toHaveAttribute(
      "data-playback-state",
      "scroll-linked",
    );
    await expect(controller).toHaveAttribute("data-entry-state", "complete");
    const boundary = await readBoundary(page);
    expect(Math.abs(boundary.targetDocumentTop - boundary.sourceDocumentBottom))
      .toBeLessThanOrEqual(1);
    expect(boundary.sourcePinAncestor).toBe(false);

    const orientationGeometry = await target.evaluate((section) => {
      const selector = section.querySelector<HTMLElement>(
        "[data-situation-selector]",
      )!;
      const orientation = section.querySelector<HTMLElement>(
        "[data-orientation-surface]",
      )!;
      const services = section.querySelector<HTMLElement>(
        "[data-situation-custom]",
      )!;
      const action = section.querySelector<HTMLElement>(
        "[data-orientation-action]",
      )!;
      const selectorRect = selector.getBoundingClientRect();
      const servicesRect = services.getBoundingClientRect();
      const orientationRect = orientation.getBoundingClientRect();
      return {
        actionRadius: getComputedStyle(action).borderRadius,
        orientationGap: orientationRect.top - servicesRect.bottom,
        servicesGap: servicesRect.top - selectorRect.bottom,
        margin: Number.parseFloat(getComputedStyle(orientation).marginTop),
        overflow:
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      };
    });
    expect(orientationGeometry.actionRadius).toBe("999px");
    expect(Math.abs(orientationGeometry.servicesGap)).toBeLessThanOrEqual(1);
    expect(orientationGeometry.orientationGap).toBeGreaterThanOrEqual(71);
    expect(orientationGeometry.orientationGap).toBeLessThanOrEqual(113);
    expect(Math.abs(
      orientationGeometry.orientationGap - orientationGeometry.margin,
    )).toBeLessThanOrEqual(1);
    expect(orientationGeometry.overflow).toBeLessThanOrEqual(1);
  });

  test("makes reduced-motion and forced-colors fallbacks static and interactive", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto("/", { waitUntil: "networkidle" });

    const controller = page.locator(ENTRY_CONTROLLER);
    const source = page.locator(ENTRY_SOURCE);
    const target = page.locator(ENTRY_TARGET);
    await expect(controller).toHaveAttribute("data-state", "reduced-motion");
    await expect(controller).toHaveAttribute("data-reveal", "static");
    await expect(controller).toHaveAttribute("data-entry-state", "complete");
    await expect(controller).toHaveAttribute("data-playback-state", "static");
    expect((await readBoundary(page))).toMatchObject({
      sourceFrozen: false,
      sourceInert: false,
      sourcePinAncestor: false,
      targetInert: false,
    });
    for (const part of Object.values(await readEntryParts(page))) {
      expect(part.opacity).toBe(1);
      expect(part.transform).toBe("none");
    }
    expectDisclosureSettled(await readActiveDisclosure(page));
    await expect(source).not.toHaveAttribute(
      "data-profile-situation-handoff-frozen",
    );
    await expect(target).not.toHaveAttribute("data-profile-transition-layer");

    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "no-preference",
    });
    await expect(controller).toHaveAttribute("data-state", "forced-colors");
    await expect(controller).toHaveAttribute("data-reveal", "static");
    await expect(controller).toHaveAttribute("data-entry-state", "complete");
    expect((await readBoundary(page))).toMatchObject({
      sourceInert: false,
      sourcePinAncestor: false,
      targetInert: false,
    });
    expectDisclosureSettled(await readActiveDisclosure(page));
  });
});
