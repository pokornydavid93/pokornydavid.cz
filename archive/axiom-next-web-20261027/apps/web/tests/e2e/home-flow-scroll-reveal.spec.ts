import { expect, test, type Page } from "@playwright/test";

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

async function dismissHomepageIntro(page: Page) {
  const intro = page.locator("[data-home-intro]");
  await intro.waitFor({ state: "attached" });
  await expect.poll(async () => {
    await page.keyboard.press("Escape");
    return intro.evaluate(
      (element) => getComputedStyle(element).display === "none",
    );
  }, { timeout: 20_000 }).toBe(true);
}

async function openHomepage(page: Page) {
  await primeRejectedConsent(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await dismissHomepageIntro(page);
  // Each controller now initializes as its scene approaches. Prime the
  // actual reading journey before testing its forward and reverse states.
  for (const [scene, controller] of [
    ['[data-home-module="situations"]', "[data-profile-situations-handoff]"],
    ["[data-orientation-surface]", "[data-orientation-reveal]"],
    ["[data-process-transition-target]", "[data-process-reveal]"],
    ['[data-home-module="evidence"]', "[data-home-cinematic-scroll]"],
  ]) {
    await scrollImmediately(page, await page.locator(scene).evaluate(
      (element) => Math.max(
        0, element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 2,
      ),
    ));
    await expect(page.locator(controller))
      .toHaveAttribute("data-state", /ready|complete|reduced-motion/u);
  }
  await scrollImmediately(page, 0);
}

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((scrollTop) => {
    const lenis = (window as Window & {
      __lenis?: {
        scrollTo?: (
          target: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    }).__lenis;

    if (lenis?.scrollTo) {
      lenis.scrollTo(scrollTop, { force: true, immediate: true });
    } else {
      window.scrollTo(0, scrollTop);
    }
  }, top);
}

async function readServiceLedgerRows(page: Page) {
  return page.locator('[data-home-module="situations"]').evaluate((section) => {
    const opacity = (row: Element, selector: string) => Number.parseFloat(
      getComputedStyle(row.querySelector<HTMLElement>(selector)!).opacity,
    );

    return Array.from(section.querySelectorAll("[data-situation-row]"))
      .map((row, index) => ({
        context: opacity(row, "[data-situation-choice-context]"),
        count: opacity(row, "[data-situation-choice-count]"),
        index: opacity(row, "[data-situation-choice-index]"),
        ruleScale: index === 0 ? null : new DOMMatrixReadOnly(getComputedStyle(
          row.querySelector<HTMLElement>("[data-situation-choice-rule]")!,
        ).transform).a,
        summary: opacity(row, "[data-situation-choice-summary]"),
        title: opacity(row, "[data-situation-choice-ink] > span"),
        titleY: new DOMMatrixReadOnly(getComputedStyle(
          row.querySelector<HTMLElement>("[data-situation-choice-ink] > span")!,
        ).transform).m42,
      }));
  });
}

async function readOpenServicePanel(page: Page, firstGroupOnly = false) {
  return page.locator(
    '[data-situation-panel][data-active="true"]',
  ).evaluate((panel, firstGroup) => {
    const scope = firstGroup
      ? panel.querySelector<HTMLElement>("[data-situation-panel-reveal]")!
      : panel;

    return Array.from(scope.querySelectorAll<HTMLElement>([
      "[data-situation-panel-label-ink]",
      "[data-situation-topic-ink]",
      "[data-situation-start-ink]",
      "[data-situation-service] > span",
      "[data-situation-panel-action]",
    ].join(","))).map((element) => {
      const style = getComputedStyle(element);
      return {
        opacity: Number.parseFloat(style.opacity),
        y: new DOMMatrixReadOnly(style.transform).m42,
      };
    });
  }, firstGroupOnly);
}

test.describe("homepage reversible lower-page reveal", () => {
  test("scrubs every chapter from Váš výchozí bod through the footer in both directions", async ({
    page,
  }) => {
    test.slow();
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);

    const situations = page.locator("[data-profile-situations-handoff]");
    const services = page.locator('[data-home-module="situations"]');
    const serviceRows = services.locator("[data-situation-row]");
    const orientation = page.locator("[data-orientation-reveal]");
    const process = page.locator("[data-process-reveal]");
    const conversion = page.locator("[data-references-conversion]");
    const evidence = page.locator('[data-home-module="evidence"]');
    const insights = page.locator('[data-home-module="insights"]');
    const faq = page.locator('[data-home-module="faq"]');
    const finalAction = page.locator('[data-home-module="final-action"]');
    const footer = page.locator('[data-component="site-footer"]');
    const flow = page.locator("[data-home-cinematic-flow]");

    await expect(situations).toHaveAttribute(
      "data-playback-state",
      "scroll-linked",
    );
    await expect(services).toHaveAttribute(
      "data-situation-ledger-motion",
      "scroll-linked",
    );
    await expect(serviceRows).toHaveCount(5);
    for (const row of await serviceRows.all()) {
      await expect(row.locator("[data-situation-choice-context]")).toHaveCount(1);
      await expect(row.locator("[data-situation-choice-ink] > span")).toHaveCount(1);
      await expect(row.locator("[data-situation-choice-index]")).toHaveCount(1);
      await expect(row.locator("[data-situation-choice-summary]")).toHaveCount(1);
      await expect(row.locator("[data-situation-choice-count]")).toHaveCount(1);
    }
    await expect(orientation).toHaveAttribute("data-sequence", "scroll-linked");
    await expect(process).toHaveAttribute("data-sequence", "scroll-linked");
    await expect(process).toHaveAttribute("data-motion", "scroll-register");
    await expect(flow.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
    await expect.poll(async () => (await readServiceLedgerRows(page))
      .every((row) => row.title < 0.4 && row.titleY > 10
        && row.context < 0.4 && row.index < 0.4
        && row.summary < 0.4 && row.count < 0.4)).toBe(true);
    expect((await readOpenServicePanel(page)).length).toBeGreaterThanOrEqual(6);
    await expect.poll(async () => (await readOpenServicePanel(page))
      .every((part) => part.opacity < 0.4 && part.y > 8)).toBe(true);
    await expect(services.locator("[data-situation-stats]"))
      .toHaveCSS("opacity", "0");
    await expect(services.locator("[data-situation-utility]"))
      .toHaveCSS("opacity", "0");

    await scrollImmediately(page, await page.evaluate(
      () => document.documentElement.scrollHeight,
    ));

    await expect(situations).toHaveAttribute("data-entry-state", "complete");
    await expect.poll(async () => (await readServiceLedgerRows(page))
      .every((row) => row.index > 0.95
        && row.context > 0.95
        && row.title > 0.95
        && Math.abs(row.titleY) < 0.5
        && row.summary > 0.95
        && row.count > 0.95
        && (row.ruleScale === null || row.ruleScale > 0.95))).toBe(true);
    await expect.poll(async () => (await readOpenServicePanel(page))
      .every((part) => part.opacity > 0.95 && Math.abs(part.y) < 0.5))
      .toBe(true);
    await expect(services.locator("[data-situation-stats]"))
      .toHaveCSS("opacity", "1");
    await expect(services.locator("[data-situation-utility]"))
      .toHaveCSS("opacity", "1");
    await expect(orientation).toHaveAttribute("data-phase", "complete");
    await expect(process).toHaveAttribute("data-phase", "complete");
    await expect(conversion).toHaveAttribute(
      "data-references-conversion-motion-state",
      "complete",
    );
    await expect(evidence).toHaveAttribute("data-evidence-motion-state", "complete");
    await expect(insights).toHaveAttribute("data-cinematic-motion", "visible");
    await expect(faq).toHaveAttribute("data-faq-motion-state", "complete");
    await expect(finalAction).toHaveAttribute("data-cinematic-motion", "visible");
    await expect(footer).toHaveAttribute("data-cinematic-motion", "visible");
    const completedInsights = await insights.evaluate((section) => {
      const heading = section.querySelector<HTMLElement>("h2")!;
      const media = section.querySelector<HTMLElement>(
        '[data-home-article-media-reveal="primary"]',
      )!;

      return {
        headingOpacity: Number.parseFloat(getComputedStyle(heading).opacity),
        mediaOpacity: Number.parseFloat(getComputedStyle(media).opacity),
        mediaScale: new DOMMatrixReadOnly(getComputedStyle(media).transform).a,
      };
    });
    expect(completedInsights.headingOpacity).toBeGreaterThan(0.99);
    expect(completedInsights.mediaOpacity).toBeGreaterThan(0.99);
    expect(completedInsights.mediaScale).toBeCloseTo(1, 2);

    await scrollImmediately(page, 0);

    await expect(situations).toHaveAttribute("data-entry-state", "waiting");
    await expect.poll(async () => (await readServiceLedgerRows(page))
      .every((row) => row.index < 0.4
        && row.context < 0.4
        && row.title < 0.4
        && row.titleY > 10
        && row.summary < 0.4
        && row.count < 0.4
        && (row.ruleScale === null || row.ruleScale < 0.1))).toBe(true);
    await expect.poll(async () => (await readOpenServicePanel(page))
      .every((part) => part.opacity < 0.4 && part.y > 8)).toBe(true);
    await expect(services.locator("[data-situation-stats]"))
      .toHaveCSS("opacity", "0");
    await expect(services.locator("[data-situation-utility]"))
      .toHaveCSS("opacity", "0");
    await expect(orientation).toHaveAttribute("data-phase", "waiting");
    await expect(process).toHaveAttribute("data-phase", "waiting");
    await expect(conversion).toHaveAttribute(
      "data-references-conversion-motion-state",
      "waiting",
    );
    await expect(evidence).toHaveAttribute("data-evidence-motion-state", "waiting");
    await expect(insights).toHaveAttribute("data-cinematic-motion", "waiting");
    await expect(faq).toHaveAttribute("data-faq-motion-state", "waiting");
    await expect(finalAction).toHaveAttribute("data-cinematic-motion", "waiting");
    await expect(footer).toHaveAttribute("data-cinematic-motion", "waiting");

    const resetTransforms = await page.evaluate(() => {
      const translateY = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector)!;
        return new DOMMatrixReadOnly(getComputedStyle(element).transform).m42;
      };

      return {
        evidenceOpacity: Number.parseFloat(getComputedStyle(
          document.querySelector<HTMLElement>("[data-evidence-row]")!,
        ).opacity),
        insightsHeadingOpacity: Number.parseFloat(getComputedStyle(
          document.querySelector<HTMLElement>(
            '[data-home-module="insights"] h2',
          )!,
        ).opacity),
        insightsMediaOpacity: Number.parseFloat(getComputedStyle(
          document.querySelector<HTMLElement>(
            '[data-home-article-media-reveal="primary"]',
          )!,
        ).opacity),
        finalActionY: translateY(
          '[data-home-module="final-action"] [data-action-band-copy]',
        ),
        footerY: translateY(
          '[data-component="site-footer"] [data-layout="container"] > :first-child',
        ),
      };
    });
    expect(resetTransforms.evidenceOpacity).toBeLessThan(0.05);
    expect(resetTransforms.insightsHeadingOpacity).toBeLessThan(0.05);
    expect(resetTransforms.insightsMediaOpacity).toBeLessThan(0.05);
    expect(resetTransforms.finalActionY).toBeGreaterThan(25);
    expect(resetTransforms.footerY).toBeGreaterThan(23);
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
    expect(runtimeErrors).toEqual([]);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`initializes closed panel motion on opening and keeps keyboard copy readable at ${viewport.width}px`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize(viewport);
      await openHomepage(page);
      const row = page.locator("[data-situation-row]").nth(1);
      const choice = row.locator("[data-situation-choice]");
      const panelCopy = row.locator([
        "[data-situation-panel-label-ink]",
        "[data-situation-topic-ink]",
        "[data-situation-start-ink]",
        "[data-situation-panel-action]",
      ].join(","));

      await expect(choice).toHaveAttribute("aria-expanded", "false");
      expect(await panelCopy.evaluateAll((items) => items.every((item) => {
        const { opacity, transform } = (item as HTMLElement).style;
        return opacity === "" && transform === "";
      }))).toBe(true);

      for (let opening = 0; opening < 2; opening += 1) {
        await choice.focus();
        await choice.press("Enter");
        await expect(choice).toHaveAttribute("aria-expanded", "true");
        const action = row.locator("[data-situation-panel-action]");
        await action.focus();
        await expect(action).toBeFocused();
        await expect.poll(async () => (await readOpenServicePanel(page))
          .every((part) => part.opacity > 0.99 && Math.abs(part.y) < 0.5))
          .toBe(true);
        await choice.focus();
        await choice.press("Enter");
        await expect(choice).toHaveAttribute("aria-expanded", "false");
      }
    });

    test(`moves service headlines and open-panel copy with their metadata at ${viewport.width}px`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize(viewport);
      await openHomepage(page);
      await expect(page.locator('[data-home-module="situations"]'))
        .toHaveAttribute("data-situation-ledger-motion", "scroll-linked");
      const desktop = viewport.width >= 900;
      const waitingOpacity = 0;
      const secondRow = page.locator("[data-situation-row]").nth(1);
      const rowTop = await secondRow.evaluate(
        (row) => row.getBoundingClientRect().top + window.scrollY,
      );

      await expect.poll(async () => (await readServiceLedgerRows(page))
        .every((row) => Math.abs(row.title - waitingOpacity) < 0.03
          && Math.abs(row.context - waitingOpacity) < 0.03
          && Math.abs(row.summary - waitingOpacity) < 0.03
          && row.titleY > 5)).toBe(true);

      await scrollImmediately(page, rowTop - viewport.height * (
        desktop ? 0.8 : 0.88
      ));
      // Pausing mid-reveal must leave readable text while movement stays scrubbed.
      await expect.poll(async () => {
        const row = (await readServiceLedgerRows(page))[1];
        return row.title > 0.99 && row.context > 0.99
          && row.titleY > 0.1 && row.titleY < (desktop ? 14 : 7);
      }).toBe(true);

      await scrollImmediately(page, 0);
      const group = page.locator(
        '[data-situation-panel][data-active="true"] [data-situation-panel-reveal]',
      ).first();
      const groupPosition = await group.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY,
        };
      });
      const groupStart = groupPosition.top - viewport.height * (
        desktop ? 0.94 : 0.96
      );
      const groupEnd = groupPosition.bottom - viewport.height * (
        desktop ? 0.88 : 0.92
      );
      await expect.poll(async () => (await readOpenServicePanel(page, true))
        .every((part) => Math.abs(part.opacity - waitingOpacity) < 0.03
          && part.y > 5)).toBe(true);

      await scrollImmediately(page, (groupStart + groupEnd) / 2);
      await expect.poll(async () => {
        const parts = await readOpenServicePanel(page, true);
        return parts.every((part) => part.opacity > 0.99)
          && parts.some((part) => part.y > 0.1);
      }).toBe(true);
      await scrollImmediately(page, groupEnd + 40);
      await expect.poll(async () => (await readOpenServicePanel(page, true))
        .every((part) => part.opacity > 0.95 && Math.abs(part.y) < 0.5))
        .toBe(true);
      await scrollImmediately(page, 0);
      await expect.poll(async () => (await readOpenServicePanel(page, true))
        .every((part) => Math.abs(part.opacity - waitingOpacity) < 0.03
          && part.y > 5)).toBe(true);
    });
  }

  test("keeps the same chapters static and readable with reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    const services = page.locator('[data-home-module="situations"]');
    await expect(services).not.toHaveAttribute(
      "data-situation-ledger-motion",
      "scroll-linked",
    );
    await expect(services.locator("[data-situation-row]")).toHaveCount(5);
    for (const selector of [
      "[data-situation-choice-index]",
      "[data-situation-choice-context]",
      "[data-situation-choice-ink] > span",
      "[data-situation-choice-summary]",
      "[data-situation-choice-count]",
      '[data-situation-panel][data-active="true"] [data-situation-panel-label-ink]',
      '[data-situation-panel][data-active="true"] [data-situation-topic-ink]',
      '[data-situation-panel][data-active="true"] [data-situation-start-ink]',
      '[data-situation-panel][data-active="true"] [data-situation-service] > span',
      '[data-situation-panel][data-active="true"] [data-situation-panel-action]',
      "[data-situation-stats]",
      "[data-custom-situation-context]",
      "[data-custom-situation-link]",
    ]) {
      for (const item of await services.locator(selector).all()) {
        await expect(item).toBeVisible();
        await expect(item).toHaveCSS("opacity", "1");
        await expect.poll(async () => item.evaluate((element) => (
          new DOMMatrixReadOnly(getComputedStyle(element).transform).isIdentity
        ))).toBe(true);
      }
    }

    const sections = page.locator([
      '[data-home-module="evidence"]',
      '[data-home-module="insights"]',
      '[data-home-module="faq"]',
      '[data-home-module="final-action"]',
      '[data-component="site-footer"]',
    ].join(","));
    await expect(sections).toHaveCount(5);
    for (const section of await sections.all()) {
      await expect(section).toHaveAttribute("data-cinematic-motion", "static");
    }
    await expect(page.locator("[data-process-reveal]"))
      .toHaveAttribute("data-sequence", "static");
    await expect(page.locator("[data-orientation-reveal]"))
      .toHaveAttribute("data-sequence", "static");
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ))).toBeLessThanOrEqual(1);
  });
});
