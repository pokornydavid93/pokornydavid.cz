import { expect, test, type Locator, type Page } from "@playwright/test";
import { testimonialReferenceReviews } from "../../app/content/testimonials";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-09-13-web-privacy-v2";

const expectedClientAreas = [
  ["Daniel Baciak", ["Ochrana majetku", "Ochrana příjmu"]],
  ["Lukáš Kratochvíl", ["Komplexní finanční plán", "Hypotéka", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["David Jaroš", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Daniel Dvořák", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Dominik Vykydal", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Zuzana Smolíková", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Nikola Maléřová", ["Komplexní finanční plán", "Ochrana příjmu", "Ochrana majetku", "Investice"]],
  ["Lucie Martínková", ["Komplexní finanční plán", "Hypotéka", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Nikola Kvapilova", ["Komplexní finanční plán", "Hypotéka", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Radek Mader", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Daniel Prucek", ["Ochrana majetku"]],
  ["Eva Hustá", ["Komplexní finanční plán", "Hypotéka", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Martina Heinzová", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Denisa Řezníčková", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Stanislav Dvořák", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Pavla Kučerová", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
  ["Sabina Palkovičová", ["Komplexní finanční plán", "Investice", "Zajištění příjmů", "Ochrana majetku"]],
] as const;

async function seedCookieConsent(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      const now = Date.now();

      window.localStorage.setItem(
        key,
        JSON.stringify({
          choice: "accepted",
          decidedAt: now,
          expiresAt: now + 365 * 24 * 60 * 60 * 1000,
          version,
        }),
      );
    },
    { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION },
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const scrollWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        );

        return scrollWidth - document.documentElement.clientWidth;
      }),
    )
    .toBeLessThanOrEqual(1);
}

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((scrollTop) => {
    const lenisWindow = window as Window & {
      __lenis?: {
        scrollTo?: (
          target: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    };

    if (lenisWindow.__lenis?.scrollTo) {
      lenisWindow.__lenis.scrollTo(scrollTop, {
        force: true,
        immediate: true,
      });
    } else {
      window.scrollTo(0, scrollTop);
    }
  }, top);
}

async function readRevealDepth(target: Locator) {
  return target.evaluate((element) => {
    const styles = getComputedStyle(element);
    const matrix = styles.transform === "none"
      ? new DOMMatrix()
      : new DOMMatrix(styles.transform);

    return { opacity: Number(styles.opacity), y: matrix.m42, tilt: matrix.m23 };
  });
}

async function expectStaticContainers(containers: Locator[]) {
  for (const container of containers) {
    await expect(container).toHaveCSS("opacity", "1");
    await expect(container).toHaveCSS("transform", "none");
  }
}

async function expectContentRevealCycle(
  page: Page,
  group: Locator,
  staticContainers: Locator[],
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("A viewport is required for scroll verification");

  const isDesktop = viewport.width >= 900;
  const isRow = (await group.getAttribute("data-route-reveal-group")) === "row";
  const groupTop = await group.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  const start = groupTop - viewport.height;
  const endRatio = isRow
    ? isDesktop ? 0.60 : 0.62
    : isDesktop ? 0.56 : 0.60;
  const end = groupTop - viewport.height * endRatio;
  const items = group.locator("[data-route-reveal-item]");
  const firstItem = items.first();

  await scrollImmediately(page, Math.max(0, start - 32));
  await expect(group).toHaveAttribute("data-route-reveal-state", "waiting");
  await expect.poll(async () => (await readRevealDepth(firstItem)).opacity)
    .toBeLessThan(0.05);
  const waiting = await readRevealDepth(firstItem);
  expect(waiting.y).toBeGreaterThan(20);
  expect(Math.abs(waiting.tilt)).toBeGreaterThan(0.05);
  await expectStaticContainers(staticContainers);

  await scrollImmediately(page, (start + end) / 2);
  await expect(group).toHaveAttribute("data-route-reveal-state", "entering");
  await expect.poll(async () => (await readRevealDepth(firstItem)).opacity)
    .toBeGreaterThan(0.1);
  const entering = await readRevealDepth(firstItem);
  // Text becomes readable while the spatial movement is still in progress.
  expect(entering.y).toBeGreaterThan(0.5);
  expect(entering.y).toBeLessThan(waiting.y);
  await expectStaticContainers(staticContainers);

  await scrollImmediately(page, end + 48);
  await expect(group).toHaveAttribute("data-route-reveal-state", "visible");
  await expect.poll(() => items.evaluateAll((elements) =>
    elements.every((element) => {
      const styles = getComputedStyle(element);
      const matrix = styles.transform === "none"
        ? new DOMMatrix()
        : new DOMMatrix(styles.transform);

      return Number(styles.opacity) > 0.99 && Math.abs(matrix.m42) < 0.6;
    }),
  )).toBe(true);
  await expectStaticContainers(staticContainers);

  await scrollImmediately(page, Math.max(0, start - 32));
  await expect(group).toHaveAttribute("data-route-reveal-state", "waiting");
  await expect.poll(async () => (await readRevealDepth(firstItem)).opacity)
    .toBeLessThan(0.05);
  const reversed = await readRevealDepth(firstItem);
  expect(reversed.y).toBeGreaterThan(entering.y);
  await expectStaticContainers(staticContainers);
}

test.describe("reference", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  for (const viewport of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    test(`reveals archive and action content inside static surfaces on ${viewport.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/reference/");
      await expect(page.locator("[data-unified-reveal-engine]"))
        .toHaveAttribute("data-state", "ready");

      const results = page.locator("#reference-results");
      const row = results.locator("article").first();
      await expect(row).toHaveAttribute("data-route-reveal-group", "row");
      await expect(row.locator("[data-route-reveal-item]")).toHaveCount(6);
      await expectContentRevealCycle(page, row, [
        results,
        row,
        row.getByRole("button"),
        row.getByRole("link"),
      ]);

      const action = page.locator("[data-reference-action]");
      const actionBand = action.locator('[data-pattern="action-band"]');
      await expect(action.locator("[data-route-reveal-item]")).toHaveCount(4);
      await expectContentRevealCycle(page, action, [action, actionBand]);
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const viewport of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    test(`rebuilds row reveals for equal-count searches and empty-result recovery on ${viewport.label}`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize(viewport);
      await page.goto("/reference/");
      await expect(page.locator("[data-unified-reveal-engine]"))
        .toHaveAttribute("data-state", "ready");

      const search = page.getByLabel("Hledat v recenzích");
      const results = page.locator("#reference-results");
      const archiveHeading = page.getByRole("heading", {
        name: "Co se ve spolupráci skutečně opakuje.",
      });

      for (const author of ["Daniel Prucek", "Eva Hustá"]) {
        await scrollImmediately(page, await results.evaluate(
          (element) => element.getBoundingClientRect().top + window.scrollY - 200,
        ));
        await expect(archiveHeading).toHaveCSS("opacity", "1");
        const retainedHeadingFrames = archiveHeading.evaluate((element) =>
          new Promise<number[]>((resolve) => {
            const opacities: number[] = [];
            const sample = () => {
              opacities.push(Number(getComputedStyle(element).opacity));
              if (opacities.length < 30) requestAnimationFrame(sample);
              else resolve(opacities);
            };
            requestAnimationFrame(sample);
          }),
        );
        await search.fill(author);
        const row = results.locator("article");
        await expect(row).toHaveCount(1);
        await expect(row).toContainText(author);
        await expect(row).toHaveAttribute(
          "data-route-reveal-state",
          /waiting|entering|visible/,
        );
        await expect(page.locator("[data-unified-reveal-engine]"))
          .toHaveAttribute("data-state", "ready");
        expect(Math.min(...await retainedHeadingFrames)).toBeGreaterThan(0.99);
        await expect(row.locator("[data-route-reveal-item]")).toHaveCount(6);
        await expectContentRevealCycle(page, row, [results, row]);
      }

      await search.fill("téma které neexistuje");
      await expect(results.locator("article")).toHaveCount(0);
      const emptyState = results.getByRole("status");
      await expect(emptyState).toHaveAttribute("data-route-reveal-group", "row");
      await expect(emptyState).toHaveAttribute(
        "data-route-reveal-state",
        /waiting|entering|visible/,
      );
      await expect(emptyState.locator("[data-route-reveal-item]")).toHaveCount(2);
      await expectContentRevealCycle(page, emptyState, [results, emptyState]);

      await emptyState.getByRole("button", { name: "Zobrazit všechny reference" }).click();
      await expect(search).toHaveValue("");
      const rows = results.locator("article");
      await expect(rows).toHaveCount(expectedClientAreas.length);
      await expect.poll(() => rows.evaluateAll((elements) =>
        elements.every((element) =>
          element.hasAttribute("data-route-reveal-state"),
        ),
      )).toBe(true);
      await expect(rows.locator("[data-route-reveal-item]"))
        .toHaveCount(expectedClientAreas.length * 6);
      const restoredRow = rows.first();
      await expectContentRevealCycle(page, restoredRow, [results, restoredRow]);
    });
  }

  test("renders the reference route as a responsive proof page", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/reference/");

      await expect(page.locator("main")).toBeVisible();
      await expect(
        page.locator('[data-reference-renderer="canonical"]'),
      ).toBeVisible();
      await expect(page.locator("[data-reference-silk-stage]")).toBeVisible();
      const silk = page.locator(
        '[data-reference-silk-stage] [data-react-bits-silk][data-silk-source="react-bits"]',
      );
      await expect(silk).toHaveAttribute("data-state", "ready");
      await expect(silk.locator("canvas[data-react-bits-silk-canvas]")).toHaveCount(1);
      await expect(page.locator("[data-reference-silk-stage]")).toHaveAttribute(
        "data-reference-silk-ready",
        "true",
      );
      await expect(page.locator("[data-refixation-silk]")).toHaveCount(0);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(
        page.getByRole("heading", {
          name: "„Umí srozumitelným způsobem vše vysvětlit a s přehledem reagovat na potřeby klienta a jeho konkrétní situaci.“",
        }),
      ).toBeVisible();
      await expect(page.locator("[data-reference-hero]")).toContainText(
        "Pavla Kučerová",
      );
      await expect(page.locator("[data-reference-hero-emphasis]")).toHaveText(
        "srozumitelným způsobem",
      );

      const heroGeometry = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>(
          '[data-component="site-header"]',
        );
        const hero = document.querySelector<HTMLElement>(
          "[data-reference-hero]",
        );

        if (!header || !hero) return null;

        return {
          expectedHeight: window.innerHeight - header.getBoundingClientRect().height,
          height: hero.getBoundingClientRect().height,
        };
      });

      expect(heroGeometry).not.toBeNull();
      expect(heroGeometry?.height ?? 0).toBeGreaterThanOrEqual(
        heroGeometry?.expectedHeight ?? Number.POSITIVE_INFINITY,
      );
      expect(heroGeometry?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
        (heroGeometry?.expectedHeight ?? 0) + 8,
      );

      await expect(
        page.getByRole("heading", {
          name: "Co se ve spolupráci skutečně opakuje.",
        }),
      ).toBeVisible();
      await expect(page.locator("#reference-results article")).toHaveCount(17);
      await expect(
        page.locator("main").getByRole("link", { name: "Probrat moji situaci" }),
      ).toBeVisible();
      const overviewCta = page.locator('main a[href^="/ziskat-prehled/"]');
      await expect(overviewCta).toHaveCount(1);
      await expect(overviewCta.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);
      await expect(overviewCta.locator(".lucide-arrow-right, .lucide-chevron-right")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps one verified featured review readable without a carousel", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/reference/");

    const hero = page.locator("[data-reference-hero]");
    const sourceLink = hero.getByRole("link", {
      name: "Otevřít ověřenou Google recenzi od Pavla Kučerová v nové kartě",
    });

    await expect(hero).toContainText("Pavla Kučerová");
    await expect(hero.locator("blockquote")).toHaveText(
      "„Umí srozumitelným způsobem vše vysvětlit a s přehledem reagovat na potřeby klienta a jeho konkrétní situaci.“",
    );
    await expect(hero).toContainText(
      "Komplexní finanční plán · Investice · Zajištění příjmů · Ochrana majetku",
    );
    await expect(hero).toContainText("20 ověřených Google recenzí");
    await expect(sourceLink).toHaveAttribute(
      "href",
      "https://share.google/lRTfcLgEGJbjB2Gzo",
    );
    await expect(sourceLink).toHaveAttribute("target", "_blank");
    await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(
      hero.getByRole("button", { name: /Předchozí|Další/ }),
    ).toHaveCount(0);
  });

  test("ends with the shared lime action system before the footer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/reference/");

    const action = page.locator("[data-reference-action]");
    const actionBand = action.locator('[data-pattern="action-band"]');
    const actionLink = action.getByRole("link", {
      name: "Probrat moji situaci",
    });

    await expect(actionBand).toHaveAttribute("data-surface-role", "action");
    await expect(actionBand).toHaveAttribute("data-surface-tone", "action");
    await expect(
      action.getByRole("heading", {
        name: "Teď může přijít na řadu vaše situace.",
      }),
    ).toBeVisible();
    await expect(action).toContainText(
      "Krátce mi řeknete, co právě řešíte. Společně zjistíme, jestli a jak dává smysl pokračovat — bez dokumentů a bez závazku.",
    );
    await expect(actionLink).toHaveAttribute("data-component", "link");
    await expect(actionLink).toHaveAttribute("data-variant", "primary-action");
    await expect(actionLink).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=references&cta=references-final",
    );
    const actionIcon = actionLink.locator('[data-cta-icon="paper-plane"]');
    const actionIconMotion = actionLink.locator('[data-cta-icon-motion]');
    await expect(actionIcon).toHaveCount(1);
    await expect(actionIconMotion).toHaveCount(1);

    const surfaceTreatment = await actionBand.evaluate((element) => {
      const styles = window.getComputedStyle(element);

      return {
        backgroundImage: styles.backgroundImage,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
      };
    });

    expect(surfaceTreatment).toEqual({
      backgroundImage: "none",
      borderRadius: "0px",
      boxShadow: "none",
    });

    await actionLink.hover();
    await expect
      .poll(() =>
        actionIconMotion.evaluate(
          (element) => getComputedStyle(element).transform,
        ),
      )
      .not.toBe("none");
    await expect
      .poll(() =>
        actionLink.evaluate((element) => getComputedStyle(element).transform),
      )
      .toBe("none");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() =>
        actionIcon.evaluate(
          (element) => getComputedStyle(element).transitionDuration,
        ),
      )
      .toBe("0s");

    const transitionGap = await page.evaluate(() => {
      const actionElement = document.querySelector<HTMLElement>(
        "[data-reference-action]",
      );
      const footer = document.querySelector<HTMLElement>(
        '[data-component="site-footer"]',
      );

      if (!actionElement || !footer) return null;

      return Math.abs(
        actionElement.getBoundingClientRect().bottom -
          footer.getBoundingClientRect().top,
      );
    });

    expect(transitionGap).not.toBeNull();
    expect(transitionGap ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  });

  test("shows a compact topic while preserving every client's full scope in the dialog", async ({ page }) => {
    await page.goto("/reference/");

    const results = page.locator("#reference-results");
    const dialog = page.locator("[data-review-dialog]");
    await expect(results.locator("article")).toHaveCount(
      expectedClientAreas.length,
    );

    for (const [client, areas] of expectedClientAreas) {
      const source = testimonialReferenceReviews.find((review) => review.author === client);
      if (!source?.excerpt) throw new Error(`Missing authentic excerpt for ${client}`);
      expect(source.fullText.replace(/\s+/gu, " ").trim(), client)
        .toContain(source.excerpt.replace(/\s+/gu, " ").trim());
      const review = results.locator("article").filter({ hasText: client });
      await expect(review).toHaveCount(1);
      await expect(review.locator("blockquote")).toHaveText(`„${source.excerpt}“`);
      const primaryArea = areas[0] === "Komplexní finanční plán"
        ? "Finanční plán" : "Pojištění majetku";
      await expect(review.locator("[data-review-primary-area]")).toHaveText(primaryArea);
      await expect(review.locator("[data-review-areas]")).toHaveCount(0);

      const trigger = review.getByRole("button", {
        name: `Celá recenze od ${client}`,
      });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("[data-review-areas]")).toHaveText(areas.join(" · "));
      await expect(dialog.locator("#review-dialog-copy")).toHaveText(`„${source.fullText}“`);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  });

  test("filters and searches the editorial archive client-side", async ({
    page,
  }) => {
    await page.goto("/reference/");

    const results = page.locator("#reference-results");

    await page
      .getByRole("button", { name: "Hypotéka", exact: true })
      .click();

    await expect(results).toContainText("Lukáš Kratochvíl");
    await expect(results).not.toContainText("David Jaroš");
    await expect(results.locator("article")).toHaveCount(4);
    await expect(results.locator("[data-review-primary-area]")).toHaveText(
      ["Hypotéka", "Hypotéka", "Hypotéka", "Hypotéka"],
    );
    await expect(page.getByText("4 výsledky", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: "Ochrana majetku", exact: true })
      .click();
    await expect(results.locator("article")).toHaveCount(17);

    await page
      .getByRole("button", { name: "Ochrana příjmu", exact: true })
      .click();
    await expect(results.locator("article")).toHaveCount(16);
    await expect(results).not.toContainText("Daniel Prucek");

    await page.getByRole("button", { name: "Všechny", exact: true }).click();
    const search = page.getByLabel("Hledat v recenzích");
    await expect(search).toHaveAttribute("type", "search");
    await search.fill("Pojištění majetku");
    await expect(results.locator("article")).toHaveCount(17);
    await expect(results).toContainText("Daniel Baciak");
    await search.fill("REZNICKOVA");

    await expect(results).toContainText("Denisa Řezníčková");
    await expect(results.locator("article")).toHaveCount(1);
    await expect(results.locator("[data-review-primary-area]")).toHaveText("Finanční plán");

    // The complete scope remains searchable even when rows display one topic.
    await search.fill("Zajištění příjmů");
    await expect(results.locator("article")).toHaveCount(16);
    await expect(results).toContainText("Daniel Baciak");
    await expect(results).toContainText("Nikola Maléřová");
    await expect(results).toContainText("Zuzana Smolíková");
    await expect(results).not.toContainText("Daniel Prucek");

    await search.fill("téma které neexistuje");
    await expect(results).toContainText(
      "Zkuste jiné jméno, téma nebo oblast.",
    );
    await expect(results.locator("article")).toHaveCount(0);

    await page.getByRole("button", { name: "Vymazat hledání" }).click();
    await expect(results.locator("article")).toHaveCount(17);
  });

  test("opens the authentic review in a focus-safe dialog", async ({
    page,
  }) => {
    await page.goto("/reference/");

    const review = page
      .locator("#reference-results article")
      .filter({ hasText: "Zuzana Smolíková" });
    const trigger = review.getByRole("button", {
      name: "Celá recenze od Zuzana Smolíková",
    });
    const dialog = page.locator("[data-review-dialog]");

    await trigger.focus();
    await page.keyboard.press("Enter");

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog).toContainText("Zuzana Smolíková");
    await expect(dialog.locator("[data-review-areas]")).toHaveText(
      "Komplexní finanční plán · Investice · Zajištění příjmů · Ochrana majetku",
    );
    await expect(dialog).toContainText(
      "Měla jsem pocit, že mu jde hlavně o to, aby mi to dávalo smysl",
    );
    await expect(
      dialog.getByRole("link", {
        name: "Otevřít původní Google recenzi od Zuzana Smolíková v nové kartě",
      }),
    ).toHaveAttribute("href", "https://share.google/bIpQxPDkvei2tPzhj");
    await expect(
      page.getByRole("button", { name: "Zavřít celou zkušenost" }),
    ).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("keeps source links independent from the row dialog trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/reference/");

    const review = page
      .locator("#reference-results article")
      .filter({ hasText: "Daniel Baciak" });
    const source = review.getByRole("link", {
      name: "Otevřít ověřenou Google recenzi od Daniel Baciak v nové kartě",
    });

    await expect(review.locator("blockquote")).toHaveCount(1);
    await expect(review.locator("details, summary")).toHaveCount(0);
    await expect(source).toHaveAttribute(
      "href",
      "https://share.google/m6Nutj17CZUp7bRZP",
    );
    await expect(source).toHaveAttribute("target", "_blank");
    await expect(source).toHaveAttribute("rel", "noopener noreferrer");
    const trigger = review.getByRole("button");
    for (const target of [source, trigger]) {
      await expect(target).toHaveAttribute("data-cursor-no-magnetic");
      await scrollImmediately(page, await target.evaluate(
        (element) => element.getBoundingClientRect().top + window.scrollY - 250,
      ));
      await expect(review.locator('[data-route-reveal-item="title"]'))
        .toHaveCSS("opacity", "1");
      const origin = (await target.boundingBox())!;
      for (const fraction of [0.25, 0.75]) {
        await page.mouse.move(
          origin.x + origin.width * fraction,
          origin.y + origin.height / 2,
          { steps: 6 },
        );
        await expect.poll(() => target.evaluate((element) => element.matches(":hover")))
          .toBe(true);
        const drift = await target.evaluate((element) => new Promise<number>((resolve) => {
          const initial = element.getBoundingClientRect();
          let frames = 0;
          let maximum = 0;
          const sample = () => {
            const rect = element.getBoundingClientRect();
            maximum = Math.max(maximum, Math.abs(rect.x - initial.x), Math.abs(rect.y - initial.y));
            if (++frames < 12) requestAnimationFrame(sample);
            else resolve(maximum);
          };
          requestAnimationFrame(sample);
        }));
        expect(drift).toBeLessThanOrEqual(0.25);
        await expect(target).toHaveCSS("transform", "none");
      }
    }
    await source.evaluate((element) => {
      element.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      });
    });
    await source.click();
    await expect(page.locator("[data-review-dialog]")).not.toHaveAttribute(
      "open",
      "",
    );
  });

  test("moves pinned reference filters with the navigation throughout interrupted transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/reference/", { waitUntil: "domcontentloaded" });
      if (width === 1440) await page.waitForFunction(() => Boolean(window.__lenis));
      const headerSelector = '[data-component="site-header"][data-scroll-navigation]:not([data-header-instance="hero"])';
      const stickySelector = width > 760 ? "[data-reference-toolbar]" : "[data-reference-filter-dock]";
      const header = page.locator(headerSelector);
      const sticky = page.locator(stickySelector);
      await expect(header.locator('[data-header-scroll-controller][data-state="ready"]')).toHaveCount(1);
      await expect(sticky).toHaveCSS("position", "sticky");
      const height = await header.evaluate((element: HTMLElement) => element.offsetHeight);
      const anchor = await sticky.evaluate((element) => element.getBoundingClientRect().top + window.scrollY + 400);

      await scrollImmediately(page, anchor);
      await expect(header).toHaveAttribute("data-scroll-state", "hidden");
      await expect.poll(async () => (await sticky.boundingBox())!.y).toBeCloseTo(0, 0);
      await expect(sticky).toHaveCSS("opacity", "1");
      await expect(sticky).toHaveCSS("visibility", "visible");

      const captureMotion = async (top: number, reveal: boolean, reverseTop?: number) => {
        const result = await page.evaluate(({ headerSelector, stickySelector, top, reveal, reverseTop }) => (
          new Promise<{
            samples: { headerBottom: number; stickyTop: number }[];
            reversed: boolean;
          }>((resolve, reject) => {
            const navigation = document.querySelector<HTMLElement>(headerSelector)!;
            const controls = document.querySelector<HTMLElement>(stickySelector)!;
            const height = navigation.offsetHeight;
            const read = () => ({
              headerBottom: Math.max(0, navigation.getBoundingClientRect().bottom),
              stickyTop: controls.getBoundingClientRect().top,
            });
            const scroll = (target: number) => {
              if (window.__lenis) window.__lenis.scrollTo(target, { immediate: true, force: true });
              else window.scrollTo(0, target);
            };
            const samples = [read()];
            let started = false;
            let reversed = false;
            let reverseStarted = false;
            let settledFrames = 0;
            let frame = 0;
            const timeout = window.setTimeout(() => {
              window.cancelAnimationFrame(frame);
              reject(new Error(`Navigation transition did not settle: ${navigation.dataset.scrollState}`));
            }, 5_000);
            const sample = () => {
              const position = read();
              samples.push(position);
              const state = navigation.dataset.scrollState;
              if (state === (reveal ? "revealing" : "hiding")) started = true;
              if (reversed && state === (reveal ? "hiding" : "revealing")) reverseStarted = true;
              const canReverse = reveal
                ? position.headerBottom > height * 0.35 && position.headerBottom < height * 0.9
                : position.headerBottom < height * 0.65 && position.headerBottom > height * 0.1;
              if (started && !reversed && reverseTop !== undefined && canReverse) {
                reversed = true;
                scroll(reverseTop);
              }
              const finalVisible = reverseTop === undefined ? reveal : !reveal;
              const finished = started && (reverseTop === undefined || reverseStarted)
                && state === (finalVisible ? "visible" : "hidden");
              settledFrames = finished ? settledFrames + 1 : 0;
              if (settledFrames >= 3) {
                window.clearTimeout(timeout);
                resolve({ samples, reversed });
              } else frame = window.requestAnimationFrame(sample);
            };
            scroll(top);
            frame = window.requestAnimationFrame(sample);
          })
        ), { headerSelector, stickySelector, top, reveal, reverseTop });

        const label = `${width}px ${reveal ? "reveal" : "hide"}${reverseTop === undefined ? "" : " reversed"}`;
        expect(result.reversed, label).toBe(reverseTop !== undefined);
        for (const key of ["headerBottom", "stickyTop"] as const) {
          const intermediate = result.samples.map((sample) => sample[key])
            .filter((position) => position > height * 0.05 && position < height * 0.95);
          expect(new Set(intermediate.map(Math.round)).size, `${label}: ${key} moves progressively`).toBeGreaterThanOrEqual(3);
        }
        const gaps = result.samples.map(({ stickyTop, headerBottom }) => stickyTop - headerBottom);
        expect(Math.min(...gaps), `${label}: controls stay below navigation`).toBeGreaterThanOrEqual(-1.5);
        // The header travels 108% and scales slightly; the filters stop at the viewport edge.
        expect(Math.max(...gaps), `${label}: controls follow navigation during motion`).toBeLessThanOrEqual(height * 0.08 + 1.5);
        const last = result.samples.at(-1)!;
        expect(Math.abs(last.stickyTop - last.headerBottom), `${label}: final edge`).toBeLessThanOrEqual(1.5);
      };

      await captureMotion(anchor - 60, true);
      await captureMotion(anchor + 20, false);
      await captureMotion(anchor - 40, true, anchor + 40);
      await scrollImmediately(page, anchor - 20);
      await expect(header).toHaveAttribute("data-scroll-state", "visible");
      await captureMotion(anchor + 60, false, anchor);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps the archive controls attached to the moving navigation edge", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/reference/");

    const header = page.locator(
      '[data-component="site-header"][data-scroll-navigation]',
    );
    const toolbar = page.locator("[data-reference-toolbar]");
    const dock = page.locator("[data-reference-filter-dock]");

    await expect(toolbar).toHaveCSS("position", "sticky");
    const desktopFilterInset = await page
      .getByLabel("Filtrovat reference")
      .evaluate((filters) => {
        const stickyBar = filters.closest<HTMLElement>(
          "[data-reference-toolbar]",
        );
        if (!stickyBar) return 0;
        return (
          filters.getBoundingClientRect().left -
          stickyBar.getBoundingClientRect().left
        );
      });
    expect(desktopFilterInset).toBeGreaterThanOrEqual(16);

    await page.mouse.move(720, 450);
    for (let step = 0; step < 6; step += 1) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
    }
    await expect
      .poll(() =>
        header.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
      )
      .toBeLessThanOrEqual(0.01);
    await expect
      .poll(async () => (await toolbar.boundingBox())?.y ?? -1)
      .toBeLessThanOrEqual(1);

    await page.mouse.wheel(0, -120);
    await expect
      .poll(() =>
        header.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
      )
      .toBeGreaterThanOrEqual(0.99);
    await expect
      .poll(async () => {
        const headerBox = await header.boundingBox();
        const toolbarBox = await toolbar.boundingBox();

        if (!headerBox || !toolbarBox) return Number.POSITIVE_INFINITY;
        return Math.abs(toolbarBox.y - (headerBox.y + headerBox.height));
      })
      .toBeLessThanOrEqual(1.5);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/reference/");
    await expect(toolbar).toHaveCSS("display", "contents");
    await expect(dock).toHaveCSS("position", "sticky");

    const filtersOverflow = await page
      .getByLabel("Filtrovat reference")
      .evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      );
    expect(filtersOverflow).toBe(true);
    const mobileFilterInset = await page
      .getByLabel("Filtrovat reference")
      .evaluate((filters) => {
        const stickyBar = filters.closest<HTMLElement>(
          "[data-reference-filter-dock]",
        );
        if (!stickyBar) return 0;
        return (
          filters.getBoundingClientRect().left -
          stickyBar.getBoundingClientRect().left
        );
      });
    expect(mobileFilterInset).toBeGreaterThanOrEqual(16);

    await page.mouse.move(195, 422);
    for (let step = 0; step < 6; step += 1) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
    }
    await expect
      .poll(() =>
        header.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
      )
      .toBeLessThanOrEqual(0.01);
    await expect
      .poll(async () => (await dock.boundingBox())?.y ?? -1)
      .toBeLessThanOrEqual(1);
    await expect(dock).toHaveCSS("opacity", "1");
    await expect(dock).toHaveCSS("visibility", "visible");

    await page.mouse.wheel(0, -120);
    await expect
      .poll(() =>
        header.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
      )
      .toBeGreaterThanOrEqual(0.99);
    await expect
      .poll(async () => {
        const headerBox = await header.boundingBox();
        const dockBox = await dock.boundingBox();

        if (!headerBox || !dockBox) return Number.POSITIVE_INFINITY;
        return Math.abs(dockBox.y - (headerBox.y + headerBox.height));
      })
      .toBeLessThanOrEqual(1.5);
    const searchBox = await page.getByLabel("Hledat v recenzích").boundingBox();
    expect(searchBox?.y ?? 0).toBeLessThan(0);
    await expectNoHorizontalOverflow(page);
  });
});
