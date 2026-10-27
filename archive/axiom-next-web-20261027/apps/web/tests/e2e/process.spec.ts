import { expect, test, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-09-13-web-privacy-v2";

async function seedCookieConsent(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      const now = Date.now();

      window.localStorage.setItem(
        key,
        JSON.stringify({
          choice: "rejected",
          decidedAt: now,
          expiresAt: now + 180 * 24 * 60 * 60 * 1000,
          version,
        }),
      );
    },
    { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION },
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
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

test.describe("process", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  test("renders the philosophical hero without repeating the process", async ({
    page,
  }) => {
    test.slow();

    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/jak-pracuji/");

      const hero = page.locator("[data-process-hero]");

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(
        page.getByRole("heading", {
          name: "Každé doporučení musí mít důvod.",
        }),
      ).toBeVisible();
      await expect(hero).not.toContainText("JAK SPOLUPRÁCE PROBÍHÁ");
      await expect(hero).toContainText(
        "Nejdřív pochopím vaši situaci. Potom vám ukážu možnosti, jejich dopady a cestu, za kterou si umím stát.",
      );
      await expect(hero).not.toContainText(
        "Nestačí vědět, co zvolit. Potřebujete rozumět tomu, proč to dává smysl právě ve vaší situaci.",
      );
      const heroAction = hero.getByRole("link", {
        name: "Začít úvodním hovorem",
      });
      await expect(heroAction).toHaveAttribute(
        "href",
        "/ziskat-prehled/?source=process&cta=process-hero",
      );
      await expect(heroAction).toHaveAttribute("data-cta-composition", "docked");
      await expect(heroAction).toHaveAttribute("data-cursor", "action");
      await expect(heroAction).toHaveAttribute("data-cursor-icon", "send");
      await expect(heroAction).toHaveAttribute("data-cursor-magnetic", "true");
      await expect(hero).toContainText(
        "Bez závazku a bez přípravy dokumentů.",
      );
      await expect(hero.locator("ol")).toHaveCount(0);
      await expect(hero.locator("h2")).toHaveCount(0);
      await expect(hero).not.toContainText("Pojmenujete hlavní otázku.");
      await expect(hero).not.toContainText("Dám fakta do souvislostí.");
      await expect(hero).not.toContainText("Stanovíme další postup.");
      await expect(hero).not.toContainText("VY + JÁ = SPOLU");
      await expect(page.locator("#postup [data-process-step]")).toHaveCount(5);
      await expect(page.locator("#steps-title")).toHaveText(
        "Od první otázky k plánu, kterému rozumíte.",
      );
      const manifesto = page.locator("[data-process-manifesto]");

      await expect(page.locator("#principles-title")).toHaveText(
        "Vy rozhodujete. Já za doporučením stojím.",
      );
      await expect(manifesto).toContainText("NA ČEM TRVÁM");
      await expect(manifesto).toContainText(
        "U každé možnosti vám ukážu důvod, dopad i limity. Rozhodnete se s plným kontextem a bez tlaku.",
      );
      const signature = manifesto.locator(
        '[data-process-manifesto-part="signature"]',
      );
      await expect(signature.getByText("Vysvětlený důvod.")).toHaveCount(1);
      await expect(signature.getByText("Viditelný dopad.")).toHaveCount(1);
      await expect(signature.getByText("Volba bez tlaku.")).toHaveCount(1);
      await expect(manifesto.locator("ol, h3, a, button")).toHaveCount(0);
      await expect(manifesto).not.toContainText("Rozhodnutí je vaše.");
      await expect(manifesto).not.toContainText(
        "Obhájit doporučení je moje práce.",
      );
      await expect(manifesto).not.toContainText("Co ode mě můžete čekat");
      await expect(manifesto).not.toContainText("Srozumitelný kontext");
      await expect(manifesto).not.toContainText("Dopad na celý plán");
      await expect(manifesto).not.toContainText(
        "Rozhodnutí ve vašich rukou",
      );
      await expectNoHorizontalOverflow(page);
    }
  });

  test("uses the first viewport as a centered process cover", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/jak-pracuji/");

      const hero = page.locator("[data-process-hero]");
      const headingLines = await hero.locator("h1 > span").evaluateAll((lines) =>
        lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return range.getClientRects().length;
        }),
      );

      if (viewport.width >= 768) expect(headingLines).toEqual([1, 1]);

      const geometry = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>(
          '[data-component="site-header"]',
        );
        const hero = document.querySelector<HTMLElement>("[data-process-hero]");
        const copy = hero?.querySelector<HTMLElement>("h1")?.parentElement;
        const silk = hero?.querySelector<HTMLElement>("[data-react-bits-silk]");
        const process = document.querySelector<HTMLElement>("#postup");

        if (!header || !hero || !copy || !silk || !process) return null;

        const headerBox = header.getBoundingClientRect();
        const heroBox = hero.getBoundingClientRect();
        const copyBox = copy.getBoundingClientRect();
        const silkBox = silk.getBoundingClientRect();
        const processBox = process.getBoundingClientRect();

        return {
          copyCenterX: copyBox.left + copyBox.width / 2,
          copyCenterY: copyBox.top + copyBox.height / 2,
          copyTop: copyBox.top,
          headerBottom: headerBox.bottom,
          heroBottom: heroBox.bottom,
          heroCenterX: heroBox.left + heroBox.width / 2,
          heroCenterY: heroBox.top + heroBox.height / 2,
          heroHeight: heroBox.height,
          heroLeft: heroBox.left,
          heroRight: heroBox.right,
          heroTop: heroBox.top,
          processTop: processBox.top,
          silkBottom: silkBox.bottom,
          silkLeft: silkBox.left,
          silkRight: silkBox.right,
          silkTop: silkBox.top,
        };
      });

      expect(geometry).not.toBeNull();
      if (!geometry) throw new Error("Process hero geometry is unavailable.");

      expect(geometry.heroHeight).toBeGreaterThanOrEqual(
        viewport.height - 1,
      );
      expect(Math.abs(geometry.heroTop)).toBeLessThanOrEqual(1);
      expect(geometry.copyTop).toBeGreaterThanOrEqual(geometry.headerBottom + 16);
      expect(geometry.processTop).toBeGreaterThanOrEqual(viewport.height - 1);
      expect(
        Math.abs(geometry.copyCenterX - geometry.heroCenterX),
      ).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.heroCenterY - geometry.copyCenterY)).toBeLessThanOrEqual(
        geometry.heroHeight * 0.12,
      );
      expect(Math.abs(geometry.silkLeft - geometry.heroLeft)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.silkRight - geometry.heroRight)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.silkTop - geometry.heroTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.silkBottom - geometry.heroBottom)).toBeLessThanOrEqual(1);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("reuses the homepage hero typography and primary CTA treatment", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const width of [390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const homepageTypography = await page.locator("main h1").evaluate((heading) => {
        const style = getComputedStyle(heading);

        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
          lineHeight: style.lineHeight,
        };
      });
      const homepageAction = await page
        .locator(
          '[data-analytics-placement="hero"][data-cta-composition="docked"][data-cursor-icon="send"]',
        )
        .evaluate((action) => {
          const style = getComputedStyle(action);
          const icon = action.querySelector<HTMLElement>("[data-cta-icon-shell]");
          const iconStyle = icon ? getComputedStyle(icon) : null;

          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            height: style.height,
            iconBackgroundColor: iconStyle?.backgroundColor,
            iconBorderRadius: iconStyle?.borderRadius,
            iconColor: iconStyle?.color,
            iconHeight: iconStyle?.height,
          };
        });

      await page.goto("/jak-pracuji/");

      const processTypography = await page.locator("main h1").evaluate((heading) => {
        const style = getComputedStyle(heading);

        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
          lineHeight: style.lineHeight,
        };
      });
      const processAction = await page
        .locator('[data-process-hero] [data-cta-composition="docked"]')
        .evaluate((action) => {
          const style = getComputedStyle(action);
          const icon = action.querySelector<HTMLElement>("[data-cta-icon-shell]");
          const iconStyle = icon ? getComputedStyle(icon) : null;

          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            height: style.height,
            iconBackgroundColor: iconStyle?.backgroundColor,
            iconBorderRadius: iconStyle?.borderRadius,
            iconColor: iconStyle?.color,
            iconHeight: iconStyle?.height,
          };
        });

      expect(processTypography).toEqual(homepageTypography);
      expect(processAction).toEqual(homepageAction);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps the process ledger compact and aligned across breakpoints", async ({
    page,
  }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/jak-pracuji/");

      const section = page.locator("#postup");
      const rows = section.locator("[data-process-step]");
      const ledgerHeader = section.locator('[class*="ledgerHeader"]');

      await section.scrollIntoViewIfNeeded();
      await expect(rows).toHaveCount(5);
      await expect(
        rows.getByText("Po tomto kroku", { exact: true }),
      ).toHaveCount(0);
      await expect(section.locator("#steps-title > span")).toHaveCount(3);

      const rowHeights = await rows.evaluateAll((items) =>
        items.map((item) => item.getBoundingClientRect().height),
      );

      if (width === 1440) {
        await expect(ledgerHeader).toHaveCSS("display", "grid");

        const geometry = await section.evaluate((element) => {
          const header = element.querySelector<HTMLElement>("header")!;
          const ledger = element.querySelector<HTMLElement>("ol")!;
          const columnHeader = Array.from(
            element.querySelectorAll<HTMLElement>(
              '[class*="ledgerHeader"] > span',
            ),
          );
          const rows = Array.from(
            element.querySelectorAll<HTMLElement>("[data-process-step]"),
          );
          const parts = rows.map((row) =>
            Array.from(
              row.querySelectorAll<HTMLElement>("[data-process-step-part]"),
            ),
          );
          const firstDescription = parts[0][2];
          const firstResult = parts[0][3];
          const descriptionStyle = getComputedStyle(firstDescription);
          const resultStyle = getComputedStyle(firstResult);

          return {
            afterContent: getComputedStyle(rows[0], "::after").content,
            columnHeaderX: columnHeader.map(
              (item) => item.getBoundingClientRect().x,
            ),
            headerGap:
              ledger.getBoundingClientRect().top -
              header.getBoundingClientRect().bottom,
            partX: parts.map((row) =>
              row.map((item) => item.getBoundingClientRect().x),
            ),
            resultWeight: Number(resultStyle.fontWeight),
            sectionHeight: element.getBoundingClientRect().height,
            textWeight: Number(descriptionStyle.fontWeight),
            titleFontSize: Number.parseFloat(
              getComputedStyle(
                element.querySelector<HTMLElement>("#steps-title")!,
              ).fontSize,
            ),
          };
        });

        expect(Math.max(...rowHeights)).toBeLessThan(200);
        expect(geometry.sectionHeight).toBeLessThan(1450);
        expect(geometry.headerGap).toBeLessThan(115);
        expect(geometry.titleFontSize).toBeLessThanOrEqual(64);
        expect(geometry.resultWeight).toBeGreaterThan(geometry.textWeight);
        expect(geometry.afterContent).toBe("none");

        geometry.partX.forEach((row) => {
          row.forEach((x, index) => {
            expect(Math.abs(x - geometry.columnHeaderX[index])).toBeLessThan(1);
          });
        });
      } else if (width === 768) {
        await expect(ledgerHeader).toHaveCSS("display", "none");

        const [meta, title, description, result] = await rows
          .first()
          .locator("[data-process-step-part]")
          .evaluateAll((parts) =>
            parts.map((part) => {
              const rect = part.getBoundingClientRect();

              return { x: rect.x, y: rect.y };
            }),
          );

        expect(Math.abs(meta.x - title.x)).toBeLessThan(1);
        expect(Math.abs(description.x - result.x)).toBeLessThan(1);
        expect(description.x).toBeGreaterThan(title.x);
        expect(Math.max(...rowHeights)).toBeLessThan(230);
      } else {
        await expect(ledgerHeader).toHaveCSS("display", "none");

        const tops = await rows
          .first()
          .locator("[data-process-step-part]")
          .evaluateAll((parts) =>
            parts.map((part) => part.getBoundingClientRect().top),
          );

        expect(tops[1]).toBeGreaterThan(tops[0]);
        expect(tops[2]).toBeGreaterThan(tops[1]);
        expect(tops[3]).toBeGreaterThan(tops[2]);
        expect(Math.max(...rowHeights)).toBeLessThan(280);
      }

      await expectNoHorizontalOverflow(page);
    }
  });

  test("aligns the route chrome with the cinematic content container", async ({
    page,
  }) => {
    for (const width of [768, 1024, 1440, 1908]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/jak-pracuji/");

      const geometry = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>(
          '[data-component="site-header"] [data-layout="container"]',
        )!;
        const content = document.querySelector<HTMLElement>(
          "[data-process-hero] > div:last-child",
        )!;
        const footer = document.querySelector<HTMLElement>(
          '[data-component="site-footer"] [data-layout="container"]',
        )!;

        const headerRect = header.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const headerStyles = getComputedStyle(header);
        const footerStyles = getComputedStyle(footer);

        return {
          contentLeft: contentRect.left,
          contentRight: contentRect.right,
          footerContentLeft:
            footerRect.left + Number.parseFloat(footerStyles.paddingLeft),
          footerContentRight:
            footerRect.right - Number.parseFloat(footerStyles.paddingRight),
          headerContentLeft:
            headerRect.left + Number.parseFloat(headerStyles.paddingLeft),
          headerContentRight:
            headerRect.right - Number.parseFloat(headerStyles.paddingRight),
        };
      });

      expect(
        Math.abs(geometry.headerContentLeft - geometry.contentLeft),
      ).toBeLessThan(1);
      expect(
        Math.abs(geometry.headerContentRight - geometry.contentRight),
      ).toBeLessThan(1);
      expect(
        Math.abs(geometry.footerContentLeft - geometry.contentLeft),
      ).toBeLessThan(1);
      expect(
        Math.abs(geometry.footerContentRight - geometry.contentRight),
      ).toBeLessThan(1);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("uses an editorial scroll choreography without pinning the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/jak-pracuji/");

    const motion = page.locator("[data-process-motion]");
    const routeReveal = page.locator("[data-unified-reveal-engine]");
    const firstStep = page.locator("[data-process-step]").first();
    const stepParts = firstStep.locator("[data-process-step-part]");
    const silk = page.locator(
      '[data-process-hero] [data-react-bits-silk][data-silk-source="react-bits"]',
    );

    await expect(motion).toHaveAttribute("data-state", "ready");
    await expect(motion).toHaveAttribute(
      "data-profile",
      "editorial-ledger",
    );
    await expect(routeReveal).toHaveAttribute("data-state", "ready");
    await expect(routeReveal).toHaveAttribute(
      "data-profile",
      "unified-editorial-depth",
    );
    await expect(page.locator("[data-process-page] .pin-spacer")).toHaveCount(0);
    await expect(page.locator('[class*="gsap-marker"]')).toHaveCount(0);

    const rowTop = await firstStep.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    const rowStart = rowTop - 900;
    const rowEnd = rowTop - 0.6 * 900;

    const sampleStep = async (scrollY: number) => {
      await page.evaluate((nextScrollY) => {
        window.scrollTo(0, nextScrollY);
      }, scrollY);
      await page.waitForTimeout(760);

      return stepParts.evaluateAll((parts) =>
        parts.map((part) => {
          const styles = getComputedStyle(part);
          const transform = styles.transform === "none"
            ? new DOMMatrix()
            : new DOMMatrix(styles.transform);

          return {
            opacity: Number(styles.opacity),
            tilt: Math.abs(Math.atan2(transform.m23, transform.m22) * 180 / Math.PI),
            x: transform.m41,
            y: transform.m42,
          };
        }),
      );
    };

    const silkAtTop = await silk.evaluate((element) => {
      const transform = new DOMMatrix(getComputedStyle(element).transform);

      return { scale: transform.a, y: transform.m42 };
    });
    const before = await sampleStep(rowStart - 40);
    const middle = await sampleStep((rowStart + rowEnd) / 2);
    const middleRowTop = await firstStep.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    const after = await sampleStep(rowEnd + 50);
    const silkAfterScroll = await silk.evaluate((element) => {
      const transform = new DOMMatrix(getComputedStyle(element).transform);

      return { scale: transform.a, y: transform.m42 };
    });

    expect(before[0].opacity).toBeLessThan(0.2);
    expect(Math.abs(before[0].x)).toBeLessThan(0.5);
    expect(before[0].y).toBeGreaterThan(30);
    expect(before[3].y).toBeGreaterThan(30);
    expect(middle[0].opacity).toBeGreaterThan(before[0].opacity);
    expect(middle[1].opacity).toBeGreaterThan(before[1].opacity);
    expect(middle[1].y).toBeLessThan(before[1].y);
    expect(middle[1].y).toBeGreaterThan(4);
    expect(middle[1].tilt).toBeGreaterThan(1);
    expect(middle[1].tilt).toBeLessThan(before[1].tilt);
    expect(Math.abs(middleRowTop - 900 * 0.8)).toBeLessThan(2);
    after.forEach((part) => {
      expect(part.opacity).toBeGreaterThan(0.99);
      expect(Math.abs(part.x)).toBeLessThan(0.5);
      expect(Math.abs(part.y)).toBeLessThan(0.5);
      expect(part.tilt).toBeLessThan(0.05);
    });
    expect(silkAfterScroll.scale).toBeGreaterThan(silkAtTop.scale);
    expect(Math.abs(silkAfterScroll.y - silkAtTop.y)).toBeLessThan(0.5);

    const reversed = await sampleStep(rowStart - 40);
    reversed.forEach((part) => {
      expect(part.opacity).toBeLessThan(0.2);
      expect(part.y).toBeGreaterThan(30);
    });
    await expect(firstStep).toHaveAttribute(
      "data-route-reveal-state",
      "waiting",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("composes the advisor commitment as one compact manifesto", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/jak-pracuji/");

    const manifesto = page.locator("[data-process-manifesto]");
    const scene = manifesto.locator("[data-process-manifesto-scene]");
    const title = manifesto.locator("#principles-title");
    const titleParts = title.locator(":scope > span");
    const accent = manifesto.locator(
      '[data-process-manifesto-part="accent"]',
    );
    const description = manifesto.locator(
      '[data-process-manifesto-part="description"]',
    );
    const signature = manifesto.locator(
      '[data-process-manifesto-part="signature"]',
    );
    await expect(manifesto.locator('[data-process-manifesto-part="rule"]')).toHaveCount(0);

    await manifesto.scrollIntoViewIfNeeded();

    const geometry = await Promise.all([
      manifesto.boundingBox(),
      scene.boundingBox(),
      title.boundingBox(),
      accent.boundingBox(),
      description.boundingBox(),
      signature.boundingBox(),
    ]);
    const [
      manifestoBox,
      sceneBox,
      titleBox,
      accentBox,
      descriptionBox,
      signatureBox,
    ] = geometry;

    expect(manifestoBox?.height).toBeGreaterThanOrEqual(590);
    expect(manifestoBox?.height).toBeLessThanOrEqual(700);
    expect(titleBox!.width / sceneBox!.width).toBeGreaterThan(0.58);
    expect(titleBox!.width / sceneBox!.width).toBeLessThan(0.7);
    expect(descriptionBox!.x).toBeGreaterThan(
      sceneBox!.x + sceneBox!.width * 0.68,
    );
    expect(
      Math.abs(
        descriptionBox!.y +
          descriptionBox!.height / 2 -
          (accentBox!.y + accentBox!.height / 2),
      ),
    ).toBeLessThan(70);
    expect(signatureBox!.y).toBeGreaterThan(
      descriptionBox!.y + descriptionBox!.height,
    );
    const headingLines = await titleParts.evaluateAll((parts) =>
      parts.map((part) => {
        const range = document.createRange();
        range.selectNodeContents(part);

        return range.getClientRects().length;
      }),
    );
    expect(headingLines).toEqual([1, 1]);
    const titleLineSpacing = await titleParts.evaluateAll((parts) => {
      const [primary, accent] = parts;
      if (!primary || !accent) return null;

      const primaryRect = primary.getBoundingClientRect();
      const accentRect = accent.getBoundingClientRect();
      const fontSize = Number.parseFloat(getComputedStyle(accent).fontSize);

      return {
        fontSize,
        gap: accentRect.top - primaryRect.bottom,
      };
    });
    expect(titleLineSpacing).not.toBeNull();
    expect(titleLineSpacing!.gap).toBeGreaterThanOrEqual(
      titleLineSpacing!.fontSize * 0.2,
    );
    const signatureTops = await signature.locator(":scope > span").evaluateAll(
      (parts) => parts.map((part) => part.getBoundingClientRect().top),
    );
    expect(Math.max(...signatureTops) - Math.min(...signatureTops)).toBeLessThan(
      2,
    );
    await expect(page.locator("[data-process-motion]")).toHaveAttribute(
      "data-state",
      "ready",
    );
    await page.mouse.wheel(0, 220);
    await expect
      .poll(() =>
        manifesto
          .locator("[data-process-manifesto-part]")
          .evaluateAll((parts) =>
            parts.every((part) => {
              const styles = getComputedStyle(part);
              const minimumOpacity = part.hasAttribute(
                "data-route-reveal-rule",
              )
                ? 0.7
                : 0.99;

              return (
                Number(styles.opacity) > minimumOpacity &&
                ["", "auto"].includes(
                  (part as HTMLElement).style.willChange,
                )
              );
            }),
          ),
      )
      .toBe(true);
  });

  test("stacks the manifesto signature without dividers on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/jak-pracuji/");

    const manifesto = page.locator("[data-process-manifesto]");
    const phrases = manifesto.locator('[class*="manifestoPhrase"]');

    await manifesto.scrollIntoViewIfNeeded();

    await expect(phrases).toHaveCount(3);
    await expect(page.locator("[data-process-motion]")).toHaveAttribute(
      "data-state",
      "natural-flow",
    );

    const phraseTops = await phrases.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top),
    );
    expect(phraseTops[1]).toBeGreaterThan(phraseTops[0]);
    expect(phraseTops[2]).toBeGreaterThan(phraseTops[1]);
    await expectNoHorizontalOverflow(page);
  });

  test("uses one consistent overview CTA identity", async ({ page }) => {
    await page.goto("/jak-pracuji/");
    const overviewCtas = page.locator('main a[href^="/ziskat-prehled/"]');
    const heroCta = page.locator("[data-process-hero]").getByRole("link", {
      name: "Začít úvodním hovorem",
    });

    await expect(overviewCtas).toHaveCount(2);
    await expect(overviewCtas.first()).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=process&cta=process-hero",
    );
    await expect(overviewCtas.last()).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=process&cta=process-final",
    );

    for (const cta of await overviewCtas.all()) {
      await expect(cta.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);
      await expect(
        cta.locator(".lucide-arrow-right, .lucide-chevron-right"),
      ).toHaveCount(0);
    }

    await heroCta.focus();
    await expect(heroCta).toBeFocused();
    await expect(heroCta).toHaveCSS("outline-style", "solid");
    await expect(heroCta).toHaveCSS("outline-width", "2px");
    await expect(
      page.locator(
        '[data-process-hero] [data-react-bits-silk][data-silk-source="react-bits"]',
      ),
    ).toHaveAttribute("aria-hidden", "true");
  });

  test("keeps the hero static for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/jak-pracuji/");

    await expect(page.locator("[data-process-motion]")).toHaveAttribute(
      "data-state",
      "reduced-motion",
    );
    await expect(
      page.getByRole("heading", {
        name: "Každé doporučení musí mít důvod.",
      }),
    ).toBeVisible();
    await expect(page.locator("[data-process-hero]")).toBeVisible();
    await expect(page.locator("[data-process-manifesto]")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(
            "[data-process-manifesto] [data-process-manifesto-part]",
          )
          .evaluateAll((parts) =>
            parts.every((part) => {
              const styles = getComputedStyle(part);

              return (
                Number(styles.opacity) > 0.99 && styles.visibility === "visible"
              );
            }),
          ),
      )
      .toBe(true);
  });
});
