import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-05-05-ga4-v1";
const FEATURED_ARTICLE_TITLE =
  "Cestovko zdarma od karty vás nemusí zachránit ve chvíli, kdy ho potřebujete";
const FEATURED_ARTICLE_PATH = "/clanky/cestovko-zdarma-od-karty-vas-nemusi-zachranit/";
const MIGRATED_ARTICLES = [
  ["mate-financni-produkty-ale-mate-skutecne-financni-plan", 6],
  ["v-jakem-poradi-resit-osobni-finance", 6],
  ["kolik-ma-mit-domacnost-v-rezerve", 10],
  ["banka-vam-pujci-vic-nez-si-muzete-dovolit", 6],
  ["urokova-sazba-neni-cena-hypoteky", 7],
  ["penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku", 7],
  ["cestovko-zdarma-od-karty-vas-nemusi-zachranit", 10],
  ["planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou", 7],
] as const;
const ARTICLE_CLOSING_TITLES: Record<string, string> = {
  "banka-vam-pujci-vic-nez-si-muzete-dovolit": "Proberme rozpočet pro vaše bydlení",
  "cestovko-zdarma-od-karty-vas-nemusi-zachranit": "Máte pojištění ke kartě a nevíte, zda sedí na cestu, kterou plánujete?",
  "chcete-investovat-zacnete-planem": "Proberme váš investiční plán",
  "kolik-ma-mit-domacnost-v-rezerve": "Nevíte, jaký počet měsíců odpovídá právě vaší domácnosti?",
  "mate-financni-produkty-ale-mate-skutecne-financni-plan": "Projděme vaše finance jako celek",
  "mate-pojisteni-prijmu-nebo-jen-pocit": "Proberme ochranu vašeho příjmu",
  "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku": "Proberme rozdělení vašich peněz",
  "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou": "Proberme finanční přípravu na rodinu",
  "v-jakem-poradi-resit-osobni-finance": "Ujasněme priority vašich financí",
  "zdrazilo-vam-pojisteni": "Proberme vaše pojištění",
  "urokova-sazba-neni-cena-hypoteky": "Proberme vaše hypoteční nabídky",
};

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
        const scrollingElement = document.scrollingElement ?? document.documentElement;

        return scrollingElement.scrollWidth - document.documentElement.clientWidth;
      }),
    )
    .toBeLessThanOrEqual(1);
}

async function getQueryParam(page: Page, name: string) {
  return new URL(page.url()).searchParams.get(name);
}

function getArticleReadingDisclosure(page: Page) {
  const navigation = page.locator(
    "nav[data-article-reading-index][data-article-hero-summary]",
  );
  const details = navigation.locator("details");

  return {
    navigation,
    details,
    summary: details.locator("summary"),
  };
}

async function expectSingleFinalArticleAction(page: Page, slug: string) {
  const finalSection = page.locator("[data-article-section]").last();
  const author = page.locator("[data-article-author]");
  const invitation = author.locator(":scope > div").last();
  const closingTitle = ARTICLE_CLOSING_TITLES[slug];

  await expect(finalSection.locator('[data-article-semantic-block="nextAction"], [data-article-semantic-block="closingNote"]'))
    .toHaveCount(0);
  if (closingTitle) {
    await expect(invitation.getByRole("heading", { level: 3 })).toHaveText(closingTitle);
    await expect(page.getByRole("heading", { name: closingTitle, exact: true })).toHaveCount(1);
    const paragraphs = invitation.locator("p");
    expect(await paragraphs.count()).toBeGreaterThan(0);
    for (const paragraph of await paragraphs.all()) await expect(paragraph).not.toBeEmpty();
    if (["chcete-investovat-zacnete-planem", "mate-pojisteni-prijmu-nebo-jen-pocit", "banka-vam-pujci-vic-nez-si-muzete-dovolit", "mate-financni-produkty-ale-mate-skutecne-financni-plan", "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku"].includes(slug)) {
      await expect(paragraphs).toHaveCount(1);
    }
    await expect(invitation).not.toContainText(
      "Na úvodním hovoru spolu projdeme vaši situaci a ujasníme si další krok.",
    );
  } else {
    await expect(invitation.getByRole("heading")).toHaveCount(0);
    await expect(invitation.locator("p")).toHaveText(
      "Na úvodním hovoru spolu projdeme vaši situaci a ujasníme si další krok.",
    );
  }
  await expect(author).toBeVisible();
  await expect(author.locator('a[href*="cta=article-final-check"]'))
    .toHaveCount(1);
  await expect(page.locator('main a[href*="cta=article-final-check"]'))
    .toHaveCount(1);
  const related = page.locator('section[aria-labelledby="related-stories-title"]');
  await expect(related.getByRole("heading", { level: 2 }))
    .toHaveText("Další články k tématu");
  await expect(related.locator(":scope > header p")).toHaveCount(0);
}

test.describe("articles", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  test("uses the cinematic page container for chrome and archive content", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto("/clanky/", { waitUntil: "domcontentloaded" });

    const [headerBrand, hero, archive, footerIdentity] = await Promise.all([
      page.locator("[data-header-motion-inner] > a").boundingBox(),
      page.locator("[data-articles-hero] > div:not([aria-hidden])").boundingBox(),
      page.locator("[data-article-archive-intro]").locator("..").boundingBox(),
      page
        .locator('footer [data-layout="container"] > :first-child')
        .boundingBox(),
    ]);

    expect(headerBrand).not.toBeNull();
    expect(hero).not.toBeNull();
    expect(archive).not.toBeNull();
    expect(footerIdentity).not.toBeNull();

    if (!headerBrand || !hero || !archive || !footerIdentity) {
      throw new Error("Article archive container geometry is unavailable.");
    }

    expect(Math.abs(headerBrand.x - hero.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(archive.x - hero.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(footerIdentity.x - hero.x)).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  });

  test("renders the index as a responsive editorial hub", async ({ page }) => {
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/clanky/");

      const hero = page.locator("[data-articles-hero]");
      const featured = hero.locator("[data-articles-featured]");
      const featuredVisual = featured.locator("[data-articles-hero-visual]");

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main h1")).toHaveCount(1);
      const title = hero.getByRole("heading", {
        level: 1,
        name: FEATURED_ARTICLE_TITLE,
        exact: true,
      });
      await expect(title).toBeVisible();
      await expect(title).toHaveText(FEATURED_ARTICLE_TITLE);
      await expect(title.locator("[data-articles-title-accent]"))
        .toHaveText("vás nemusí zachránit");
      await page.evaluate(() => document.fonts.ready);
      const headingOverflow = await title.evaluate((heading) => {
        const box = heading.getBoundingClientRect();
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        let overflow = 0;
        let node = walker.nextNode();
        while (node) {
          if (node.textContent?.trim()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of Array.from(range.getClientRects())) {
              overflow = Math.max(overflow, box.left - rect.left,
                rect.right - box.right, -rect.left,
                rect.right - document.documentElement.clientWidth);
            }
          }
          node = walker.nextNode();
        }
        return overflow;
      });
      expect(headingOverflow).toBeLessThanOrEqual(1);
      await expect(
        page.getByLabel("Hledat v článcích", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Co si ověřit, než se rozhodnete.",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Co si ověřit, než se rozhodnete.",
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Praktické články podle situace, kterou právě řešíte.",
          { exact: true },
        ),
      ).toBeVisible();
      const archiveIntro = page.locator("[data-article-archive-intro]");
      await expect(archiveIntro.getByRole("button")).toHaveCount(0);
      await expect(archiveIntro.locator("input")).toHaveCount(0);
      await expect(
        page.locator("[data-article-toolbar]").getByText("11 výsledků", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(featuredVisual.locator("img")).toHaveAttribute(
        "alt", "Cestující s kufrem drží kartu cestovního pojištění.",
      );
      await expect(featuredVisual).toHaveCSS("overflow", "visible");
      const imageFrame = featuredVisual.locator("[data-editorial-image]");
      await expect(imageFrame).toHaveCSS("overflow", "hidden");
      await expect(imageFrame).toHaveCSS("clip-path", /^polygon\(/u);
      await expect(page.locator("#article-results").getByRole("link")).toHaveCount(11);
      await expect(
        page
          .locator("#article-results")
          .getByRole("link", { name: /Cestovko zdarma od karty/ }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Co si přečíst dál" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("region", { name: "Mapa finančních rozhodnutí" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Otevřít dev nastavení" }),
      ).toHaveCount(0);

      if (width <= 760) {
        const mobileOrder = await featured.evaluate((article) =>
          [
            "[data-articles-hero-category]",
            "[data-articles-hero-title]",
            "[data-articles-hero-description]",
            "[data-articles-hero-visual]",
            "[data-articles-hero-benefit]",
            "[data-articles-hero-footer]",
          ].map((selector) => {
            const element = article.querySelector(selector);
            if (!element) throw new Error(`Missing ${selector}`);
            return element.getBoundingClientRect().top;
          }),
        );
        expect(mobileOrder).toEqual(
          [...mobileOrder].sort((left, right) => left - right),
        );
      }

      if (width === 1440) {
        const headingLineCount = await hero
          .locator("h1")
          .evaluate((heading) => {
            const walker = document.createTreeWalker(
              heading,
              NodeFilter.SHOW_TEXT,
            );
            const lineTops = new Set<number>();
            let node = walker.nextNode();

            while (node) {
              if (node.textContent?.trim()) {
                const range = document.createRange();
                range.selectNodeContents(node);
                Array.from(range.getClientRects()).forEach((rect) => {
                  lineTops.add(Math.round(rect.top));
                });
              }
              node = walker.nextNode();
            }

            return lineTops.size;
          });
        const [featuredBox, visualBox] = await Promise.all([
          featured.boundingBox(),
          featuredVisual.boundingBox(),
        ]);
        const storyBounds = await featured.evaluate((article) => {
          const category = article.querySelector(
            "[data-articles-hero-category]",
          );
          const footer = article.querySelector("[data-articles-hero-footer]");
          if (!category || !footer) return null;

          const start = category.getBoundingClientRect();
          const end = footer.getBoundingClientRect();
          return { centerY: (start.top + end.bottom) / 2 };
        });

        expect(featuredBox).not.toBeNull();
        expect(visualBox).not.toBeNull();
        expect(storyBounds).not.toBeNull();
        expect(headingLineCount).toBeGreaterThanOrEqual(3);
        expect(headingLineCount).toBeLessThanOrEqual(4);
        // Keep the complete padded feature in view; the decorative section
        // padding below it may continue beyond the first viewport.
        expect(
          (featuredBox?.y ?? 0) + (featuredBox?.height ?? 0),
        ).toBeLessThanOrEqual(900);
        expect(
          Math.abs(
            (visualBox?.y ?? 0) + (visualBox?.height ?? 0) / 2
              - (storyBounds?.centerY ?? 0),
          ),
        ).toBeLessThanOrEqual(2);

        const archiveAccessibility = await new AxeBuilder({ page })
          .include('section[aria-labelledby="latest-articles-title"]')
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(archiveAccessibility.violations).toEqual([]);
      }
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps article card geometry stable while the custom cursor frames it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/clanky/", { waitUntil: "networkidle" });

    const card = page.locator("#article-results [data-article-slug]").nth(1);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await page.waitForTimeout(300);
    await page.mouse.move(16, 500);
    await page.waitForTimeout(180);

    const before = await card.boundingBox();
    expect(before).not.toBeNull();

    await card.hover();
    await page.waitForTimeout(300);

    const after = await card.boundingBox();
    expect(after).not.toBeNull();
    expect(after?.width ?? 0).toBeCloseTo(before?.width ?? 0, 1);
    expect(after?.height ?? 0).toBeCloseTo(before?.height ?? 0, 1);

    const cursorZone = card.locator(
      "[data-cursor-direction] > [data-cursor-interaction-zone]",
    );
    await expect(cursorZone).toHaveCSS("position", "absolute");
  });

  test("renders editorial hero article links without dashboard controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/clanky/");

    const hero = page.locator('section[aria-labelledby="articles-title"]');

    await expect(
      hero.getByText("Články z praxe", { exact: true }),
    ).toBeVisible();
    await expect(
      hero.getByRole("link", { name: "Procházet všechny články" }),
    ).toHaveAttribute("href", "#latest-articles-title");
    await expect(hero.getByRole("navigation")).toHaveCount(0);
    await expect(hero.getByText("01 / Výběr")).toHaveCount(0);
    await expect(hero.locator("article")).toHaveCount(1);
    await expect(
      hero.getByText(
        "Nápis „cestovní pojištění“ ještě neříká, zda pojištění běží, koho kryje, jak vysoké má limity ani jestli platí právě pro cestu, na kterou se chystáte.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      hero.getByText(
        "Rozlišíte léčebné výlohy od úrazového pojištění a zjistíte, proč toto rozlišení rozhoduje.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(hero.getByText("David Pokorný", { exact: true })).toBeVisible();
    await expect(hero.getByText("17 min čtení", { exact: true })).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 }))
      .toHaveText(FEATURED_ARTICLE_TITLE);
    await expect(hero.locator("[data-articles-title-accent]"))
      .toHaveText("vás nemusí zachránit");
    await expect(
      hero.getByRole("link", { name: `Otevřít doporučený článek: ${FEATURED_ARTICLE_TITLE}`, exact: true }),
    ).toHaveAttribute("href", FEATURED_ARTICLE_PATH);
    const featuredCta = hero.getByRole("link", {
      name: `Číst článek: ${FEATURED_ARTICLE_TITLE}`,
      exact: true,
    });
    await expect(featuredCta).toHaveAttribute(
      "href",
      FEATURED_ARTICLE_PATH,
    );
    await expect(page.locator("[data-nav-theme-ready]")).toBeAttached();
    const focusState = await featuredCta.evaluate((element) => {
      element.focus();
      return {
        focused: document.activeElement === element,
        visible: element.matches(":focus-visible"),
        outline: getComputedStyle(element).outlineStyle,
      };
    });
    expect(focusState).toMatchObject({
      focused: true,
      visible: true,
      outline: "solid",
    });
    await expect(
      hero.getByRole("link", { name: /Zdražilo vám pojištění/ }),
    ).toHaveCount(0);
    await expect(
      hero.getByRole("link", { name: /Nejdřív plán, potom produkt/ }),
    ).toHaveCount(0);
    await expect(
      hero.getByRole("link", { name: /Zobrazit všechny články/ }),
    ).toHaveCount(0);
    await expect(hero.getByRole("button")).toHaveCount(0);
    await expect.poll(() => getQueryParam(page, "topic")).toBeNull();
  });

  test("keeps the featured hero static and accessible with reduced motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    try {
      await seedCookieConsent(page);
      await page.goto("/clanky/");

      const hero = page.locator("[data-articles-hero]");
      const motionTargets = hero.locator(
        [
          "[data-articles-hero-route]",
          "[data-articles-hero-visual]",
          "[data-articles-hero-part]",
        ].join(", "),
      );

      await expect(hero).toHaveAttribute(
        "data-articles-hero-motion",
        "reduced-motion",
      );
      await expect(page.locator("#article-results")).toHaveCSS(
        "animation-name",
        "none",
      );
      expect(
        await motionTargets.evaluateAll((elements) =>
          elements.map((element) => {
            const style = getComputedStyle(element);
            return {
              opacity: style.opacity,
              transform: style.transform,
              visibility: style.visibility,
            };
          }),
        ),
      ).toEqual(
        expect.arrayContaining([
          {
            opacity: "1",
            transform: "none",
            visibility: "visible",
          },
        ]),
      );
      expect(
        await motionTargets.evaluateAll((elements) =>
          elements.every((element) => {
            const style = getComputedStyle(element);
            return (
              style.opacity === "1" &&
              style.transform === "none" &&
              style.visibility === "visible"
            );
          }),
        ),
      ).toBe(true);

      const accessibility = await new AxeBuilder({ page })
        .include("[data-articles-hero]")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test("filters client-side search and keeps q in the URL", async ({ page }) => {
    await page.goto("/clanky/");

    const results = page.locator("#article-results");
    const search = page.getByLabel("Hledat v článcích", { exact: true });

    await expect(
      results.getByRole("link", { name: /Chcete investovat/ }),
    ).toBeVisible();

    await search.fill("hypotéka");

    await expect.poll(() => getQueryParam(page, "q")).toBe("hypotéka");
    await expect(
      results.getByRole("link", { name: /Končí vám fixace/ }),
    ).toBeVisible();
    await expect(
      results.getByRole("link", { name: /Chcete investovat/ }),
    ).toHaveCount(0);
    await expect(
      page.locator("[data-article-toolbar]").getByText("3 výsledky", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(results.getByRole("link")).toHaveCount(3);

    await page.getByRole("button", { name: "Vymazat hledání" }).first().click();

    await expect.poll(() => getQueryParam(page, "q")).toBeNull();
    await expect(
      results.getByRole("link", { name: /Chcete investovat/ }),
    ).toBeVisible();
  });

  test("hydrates topic and query from URL parameters", async ({ page }) => {
    await page.goto("/clanky/?topic=hypoteka&q=fixace#latest-articles-title");

    await expect(
      page.getByLabel("Hledat v článcích", { exact: true }),
    ).toHaveValue("fixace");

    await expect(
      page.locator("#article-results").getByRole("link", {
        name: /Končí vám fixace/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hypotéky", exact: true }).last(),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("shows an empty state with a clear action", async ({ page }) => {
    await page.goto("/clanky/");

    await page
      .getByLabel("Hledat v článcích", { exact: true })
      .fill("neexistujici-dotaz-xyz");

    await expect(page.getByRole("status")).toContainText(
      "Pro zadané téma tu není žádný článek.",
    );
    await expect(
      page.locator("[data-article-toolbar]").getByText("0 výsledků", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Zobrazit všechny" }).click();

    await expect.poll(() => getQueryParam(page, "q")).toBeNull();
    await expect(
      page
        .locator("#article-results")
        .getByRole("link", { name: /Zdražilo vám pojištění/ }),
    ).toBeVisible();
  });

  test("keeps the editorial filters attached to the moving navigation edge", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/clanky/");

    const header = page.locator(
      '[data-component="site-header"][data-scroll-navigation]',
    );
    const toolbar = page.locator("[data-article-toolbar]");
    const filterRow = page.locator("[data-article-filter-row]");

    await expect(toolbar).toHaveCSS("position", "sticky");
    expect(await filterRow.getByRole("button").allTextContents()).toEqual([
      "Všechny",
      "Hypotéky",
      "Pojištění",
      "Příjem",
      "Investice",
      "Ostatní",
    ]);

    await page.mouse.move(720, 450);
    for (let step = 0; step < 7; step += 1) {
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

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/clanky/");
    await expect(toolbar).toHaveCSS("position", "sticky");
    await expect(toolbar).not.toHaveCSS("display", "contents");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/clanky/");
    await expect(toolbar).toHaveCSS("display", "contents");
    await expect(filterRow).toHaveCSS("position", "sticky");

    const filtersOverflow = await filterRow.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    expect(filtersOverflow).toBe(true);

    await page.mouse.move(195, 422);
    for (let step = 0; step < 7; step += 1) {
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
      .poll(async () => (await filterRow.boundingBox())?.y ?? -1)
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
        const filterBox = await filterRow.boundingBox();

        if (!headerBox || !filterBox) return Number.POSITIVE_INFINITY;
        return Math.abs(filterBox.y - (headerBox.y + headerBox.height));
      })
      .toBeLessThanOrEqual(1.5);
    const searchBox = await page
      .getByLabel("Hledat v článcích", { exact: true })
      .boundingBox();
    expect(searchBox?.y ?? 0).toBeLessThan(0);
    await expectNoHorizontalOverflow(page);
  });

  test("moves pinned editorial filters with the navigation throughout interrupted transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/clanky/", { waitUntil: "domcontentloaded" });
      if (width === 1440) await page.waitForFunction(() => Boolean(window.__lenis));
      const headerSelector = '[data-component="site-header"][data-scroll-navigation]:not([data-header-instance="hero"])';
      const stickySelector = width > 760 ? "[data-article-toolbar]" : "[data-article-filter-row]";
      const header = page.locator(headerSelector);
      const sticky = page.locator(stickySelector);
      await expect(header.locator('[data-header-scroll-controller][data-state="ready"]')).toHaveCount(1);
      await expect(sticky).toHaveCSS("position", "sticky");
      const height = await header.evaluate((element: HTMLElement) => element.offsetHeight);
      const anchor = await sticky.evaluate((element) => element.getBoundingClientRect().top + window.scrollY + 400);
      const scrollImmediately = (top: number) => page.evaluate((target) => {
        if (window.__lenis) window.__lenis.scrollTo(target, { immediate: true, force: true });
        else window.scrollTo(0, target);
      }, top);

      await scrollImmediately(anchor);
      await expect(header).toHaveAttribute("data-scroll-state", "hidden");
      await expect.poll(async () => (await sticky.boundingBox())!.y).toBeCloseTo(0, 0);

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
      await scrollImmediately(anchor - 20);
      await expect(header).toHaveAttribute("data-scroll-state", "visible");
      await captureMotion(anchor + 60, false, anchor);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("renders article detail content, related posts and article metadata", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/clanky/konec-fixace-hypoteky/");
    await expect(page.locator("[data-nav-theme-ready]")).toBeAttached();

    const articleHero = page.locator("main > header").first();

    await expect(articleHero).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(articleHero.locator("h1")).toHaveText(
      "Končí vám fixace? Neberte první nabídku automaticky.",
    );
    await expect(articleHero.locator("h1 span")).toHaveCount(0);
    await expect(
      articleHero.getByRole("heading", {
        level: 2,
        name: "Neberte první nabídku automaticky.",
      }),
    ).toHaveCount(0);
    await expect(articleHero.locator("time").first()).toHaveAttribute(
      "datetime",
      "2026-08-12",
    );
    await expect(articleHero).toContainText("Aktualizováno");
    await expect(
      articleHero.getByRole("link", { name: "David Pokorný" }),
    ).toHaveAttribute("href", "/kdo-jsem/");
    await expect(articleHero).toContainText(
      "Konec fixace není jen administrativa. Je to chvíle, kdy dává smysl znovu porovnat sazbu, splátku, rezervu a plán domácnosti.",
    );

    const readingDisclosure = getArticleReadingDisclosure(page);
    await expect(readingDisclosure.navigation).toBeHidden();

    const articleBody = page.locator("article").first();
    const semanticArticle = articleBody.locator("[data-semantic-article]");
    const articleSections = semanticArticle.locator("[data-article-section]");
    const firstSection = semanticArticle.locator("#kontrola");
    const articleLead = firstSection.locator(
      '[data-article-semantic-block="lead"]',
    );

    await expect(semanticArticle).toBeVisible();
    await expect(articleSections).toHaveCount(8);
    await expect(
      firstSection.getByRole("heading", {
        level: 2,
        name: "Nejdřív si ujasněte, co má nová fixace vyřešit.",
      }),
    ).toBeVisible();
    await expect(articleLead.locator("p")).toHaveCount(1);
    await expect(articleLead.locator("p").first()).toHaveText(
      "Konec fixace hypotéky je moment, který v mnoha rodinách vyvolá velmi konkrétní otázku: kolik budeme nově měsíčně platit?",
    );
    await expect(
      firstSection.getByRole("heading", {
        level: 3,
        name: "Co si před podpisem zkontrolovat",
      }),
    ).toBeVisible();
    const checklist = firstSection.locator(
      '[data-article-semantic-block="checklist"]',
    );
    await expect(checklist.getByRole("list")).toHaveCount(1);
    await expect(checklist.getByRole("listitem")).toHaveCount(5);
    await expect(checklist.getByRole("list")).toHaveCSS(
      "list-style-type",
      "disc",
    );
    await expect(checklist.getByRole("button")).toHaveCount(0);
    await expect(checklist.locator("input, [role='checkbox']")).toHaveCount(0);

    const expertNote = firstSection.locator(
      '[data-article-semantic-block="expertNote"]',
    );
    await expect(
      expertNote.getByRole("heading", {
        level: 3,
        name: "Nabídka banky je návrh, ne verdikt.",
      }),
    ).toBeVisible();
    await expect(expertNote.locator("p")).toContainText(
      "Smyslem kontroly je zjistit, jak obstojí v kontextu vaší domácnosti.",
    );
    await expect(expertNote).not.toContainText(/Můj pohled/i);
    await expect(
      page.getByText(/Možná vám právě dorazil dopis nebo e-mail z banky/),
    ).toBeVisible();

    const contextRail = page.locator("[data-article-context-rail]");
    await firstSection.scrollIntoViewIfNeeded();
    await expect(contextRail).toBeVisible();
    const readingMap = contextRail.getByRole("navigation", {
      name: "Části článku",
    });
    await expect(readingMap.getByRole("link")).toHaveCount(8);
    await expect(readingMap.getByRole("link").first()).toHaveAttribute(
      "href",
      "#kontrola",
    );
    await expect
      .poll(() => contextRail.getAttribute("data-active-section"))
      .toBe("kontrola");
    await expect(contextRail.locator(":scope > *")).toHaveCount(2);
    await expect(contextRail).not.toContainText("Oddělte nabídku od rozhodnutí.");
    await expect(contextRail.getByRole("link")).toHaveCount(8);
    await expect(readingMap.locator('[aria-current="location"]')).toHaveCount(1);
    await expect(readingMap.locator('[aria-current="location"]')).toHaveAttribute(
      "href",
      "#kontrola",
    );
    await expect(contextRail.locator('a[href^="/ziskat-prehled/"]')).toHaveCount(
      0,
    );

    await contextRail.locator('a[href="#priklad-z-praxe"]').click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(
      "#priklad-z-praxe",
    );
    await expect
      .poll(() => contextRail.getAttribute("data-active-section"))
      .toBe("priklad-z-praxe");
    await expect(readingMap.locator('[aria-current="location"]')).toHaveAttribute(
      "href",
      "#priklad-z-praxe",
    );
    await expect
      .poll(() =>
        page
          .locator("#priklad-z-praxe")
          .evaluate((element) => element.getBoundingClientRect().top),
      )
      .toBeGreaterThanOrEqual(80);

    const comparisonSection = semanticArticle.locator("#prvni-nabidka-banky");
    await comparisonSection.scrollIntoViewIfNeeded();
    await expect
      .poll(() => contextRail.getAttribute("data-active-section"))
      .toBe("prvni-nabidka-banky");
    const comparisonBlock = comparisonSection.locator(
      '[data-article-semantic-block="comparison"]',
    );
    await expect(comparisonBlock).toBeVisible();
    await expect(
      comparisonBlock.getByRole("columnheader", { name: "Bez porovnání" }),
    ).toBeVisible();
    await expect(
      comparisonBlock.getByRole("columnheader", { name: "Po porovnání" }),
    ).toBeVisible();
    await expect(readingMap.locator('[aria-current="location"]')).toHaveAttribute(
      "href",
      "#prvni-nabidka-banky",
    );

    await expect(page.locator("#kontrola")).toContainText(
      "Co si před podpisem zkontrolovat",
    );
    await expect(
      page.getByRole("heading", { name: "Oproti první nabídce splátka klesla. Splatnost se prodloužila." }),
    ).toBeVisible();
    const caseSection = semanticArticle.locator("#priklad-z-praxe");
    const caseDelta = caseSection.locator(
      '[data-article-semantic-block="financialDelta"]',
    );
    await expect(caseDelta.locator(":scope > div > div")).toHaveCount(3);
    await expect(caseDelta).toContainText("Přibližně o 3 200 Kč méně než první nabídka.");
    await expect(caseDelta).toContainText("o pět let delší splatnost");
    await expect(
      caseSection.locator('[data-article-semantic-block="clientEvidence"]'),
    ).toHaveCount(0);
    const finalSection = semanticArticle.locator("#co-udelat-pred-podpisem");
    await expect(finalSection.getByRole("heading", {
      level: 2,
      name: "Co udělat, než podepíšete novou nabídku.",
    })).toBeVisible();
    await expect(finalSection.getByRole("heading", {
      level: 3,
      name: "Co mít po ruce při úvodním hovoru",
    })).toBeVisible();
    await expect(finalSection.getByRole("listitem")).toHaveCount(4);
    await expect(page.locator("#screening")).toHaveCount(0);
    await expect(semanticArticle.locator('[data-article-semantic-block="nextAction"]'))
      .toHaveCount(0);
    await expect(page.locator("#related-stories-title")).toContainText(
      "Další články k tématu",
    );
    const authorNote = page.locator("[data-article-author]");
    const authorIdentity = authorNote.locator(":scope > div").first();
    const authorInvitation = authorNote.locator(":scope > div").last();
    await expect(authorNote.locator(":scope > div")).toHaveCount(2);
    await expect(authorIdentity.getByRole("heading", { name: "David Pokorný" }))
      .toBeVisible();
    await expect(authorIdentity).toContainText("Autor článku");
    await expect(authorIdentity).toContainText("Finanční poradce");
    await expect(authorIdentity.getByRole("link")).toHaveCount(0);
    await expect(authorInvitation).toContainText(
      "Na úvodním hovoru spolu projdeme vaši situaci a ujasníme si další krok.",
    );
    await expect(authorInvitation.getByRole("link", { name: "Domluvit úvodní hovor" }))
      .toHaveAttribute(
        "href",
        "/ziskat-prehled/?source=article&intent=housing&topic=mortgage-refixation&cta=article-final-check",
      );
    await expect(authorNote.getByRole("link")).toHaveCount(1);

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
    await expect(
      page.locator('meta[property="article:published_time"]'),
    ).toHaveCount(1);
    await expect(page.locator('meta[property="article:author"]').first()).toHaveAttribute(
      "content",
      "https://pokornydavid.cz/kdo-jsem/",
    );

    const articleJsonLd = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => {
        for (const script of scripts) {
          try {
            const parsed = JSON.parse(script.textContent ?? "");
            const nodes = parsed["@graph"] ?? [parsed];
            const article = nodes.find((node: Record<string, unknown>) =>
              node["@type"] === "BlogPosting" || node["@type"] === "Article",
            );
            if (article) return article;
          } catch {
            continue;
          }
        }

        return null;
      });

    expect(articleJsonLd?.articleSection).toHaveLength(8);
    expect(articleJsonLd?.author["@id"]).toBe("https://pokornydavid.cz/#person");
    expect(articleJsonLd?.mainEntityOfPage["@id"]).toBe(
      "https://pokornydavid.cz/clanky/konec-fixace-hypoteky/#webpage",
    );

    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("keeps decisions and key insights readable without repeated labels", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/clanky/konec-fixace-hypoteky/");

    const section = page.locator("#strategicky-moment");
    const decision = section.locator('[data-article-semantic-block="decision"]');
    const branches = decision.locator(":scope > ul");
    const sharedCheck =
      "Před rozhodnutím zvažte dopad každé varianty na splátku, rezervu a dlouhodobé cíle domácnosti.";

    await expect(decision.getByRole("heading", { level: 3, name: "Dvě různé cesty" })).toBeVisible();
    await expect(branches).toHaveCount(1);
    await expect(branches).toHaveAttribute("role", "list");
    await expect(decision.locator("ol")).toHaveCount(0);
    await expect(branches.getByRole("listitem")).toHaveCount(2);
    await expect(branches.getByRole("heading", { level: 4 })).toHaveCount(2);
    await expect(branches.getByRole("heading", { level: 3 })).toHaveCount(0);
    await expect(branches.locator("li > span")).toHaveCount(0);
    await expect(branches.getByRole("listitem").first()).toContainText(
      "Pasivně prodloužit",
    );
    await expect(branches.getByRole("listitem").last()).toContainText(
      "Aktivně nastavit",
    );
    await expect(branches).not.toContainText(sharedCheck);
    await expect(decision.getByText(sharedCheck, { exact: true })).toHaveCount(1);

    const insight = section.locator('[data-article-semantic-block="keyInsight"]');
    await expect(insight.getByRole("heading")).toHaveCount(0);
    await expect(insight.locator("p")).toHaveText(
      "Nejde o to hypotéku jen prodloužit. Jde o to znovu ji nastavit tak, aby odpovídala dnešnímu životu vaší domácnosti.",
    );
    await expect(insight).not.toContainText(/Klíčová myšlenka/i);
    await expect(insight).not.toContainText(/Podstatný rozdíl/i);
    await expectNoHorizontalOverflow(page);

    const untitledDecision = page.locator(
      '#tri-chyby [data-article-semantic-block="decision"]',
    );
    await expect(untitledDecision.locator(":scope > ul")).toHaveAttribute(
      "role",
      "list",
    );
    await expect(untitledDecision.getByRole("heading", { level: 3 })).toHaveCount(3);
    await expect(untitledDecision.getByRole("heading", { level: 4 })).toHaveCount(0);

    await page.goto("/clanky/kolik-ma-mit-domacnost-v-rezerve/");
    const longDecision = page.locator(
      '#kolik-mesicu-podle-situace [data-article-semantic-block="decision"]',
    );
    await expect(longDecision.locator(":scope > ul > li")).toHaveCount(5);
    await expect(longDecision.getByRole("heading", { level: 3 })).toHaveCount(1);
    await expect(longDecision.getByRole("heading", { level: 4 })).toHaveCount(5);
    await expect(longDecision).toContainText(
      "Jste zaměstnanec na stabilní pozici a příjem by šel relativně snadno nahradit",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("compares the bank offer by accessible criteria without mobile sideways scrolling", async ({
    page,
  }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/clanky/konec-fixace-hypoteky/");

      const comparison = page.locator(
        '#prvni-nabidka-banky [data-article-semantic-block="comparison"]',
      );
      const table = comparison.getByRole("table");

      await expect(table).toBeVisible();
      for (const variant of ["Bez porovnání", "Po porovnání"]) {
        await expect(
          table.getByRole("columnheader", { name: variant, exact: true }),
        ).toHaveCount(1);
      }

      for (const [criterion, first, second] of [
        ["Sazba", "Znáte jedinou nabídku.", "Vidíte reálný rozdíl vůči trhu."],
        ["Splátka", "Přijmete výpočet banky.", "Ověříte více délek fixace a splatnosti."],
        ["Rozhodnutí", "Volíte hlavně pohodlí.", "Volíte podle dopadu na domácnost."],
      ]) {
        const rowHeader = table.getByRole("rowheader", {
          name: criterion,
          exact: true,
        });
        const row = rowHeader.locator("..");

        await expect(rowHeader).toHaveCount(1);
        await expect(row.getByRole("cell")).toHaveText([first, second]);
      }

      await expectNoHorizontalOverflow(page);
      if (width === 390) {
        const nestedHorizontalScrollers = await comparison.evaluate((element) =>
          Array.from(element.querySelectorAll("*")).filter((child) => {
            const overflowX = getComputedStyle(child).overflowX;
            return (
              (overflowX === "auto" || overflowX === "scroll") &&
              child.scrollWidth > child.clientWidth + 1
            );
          }).length,
        );
        expect(nestedHorizontalScrollers).toBe(0);
      }
    }
  });

  test("presents three mortgage settings with an inline call action and preserves ordered processes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/clanky/konec-fixace-hypoteky/");

    const section = page.locator("#vice-zpusobu");
    const criteria = section.locator('[data-article-semantic-block="checklist"]');
    const list = criteria.locator(":scope > ul");

    await expect(criteria.getByRole("heading", { level: 3, name: "Co spolu prověříme" })).toBeVisible();
    await expect(list).toHaveCount(1);
    await expect(criteria.getByRole("list")).toHaveCount(1);
    await expect(list.getByRole("listitem")).toHaveCount(3);
    await expect(list.locator("li strong")).toHaveText([
      "Délka fixace",
      "Délka splatnosti",
      "Finanční rezerva",
    ]);
    const callAction = criteria.locator('a[href^="/ziskat-prehled/"]');
    await expect(callAction).toHaveText("Domluvit úvodní hovor");
    await expect(callAction).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=article&intent=housing&topic=mortgage-refixation&cta=quick-refixation-check",
    );
    await expect(section.locator('[data-article-semantic-block="process"]')).toHaveCount(0);
    await expect(section.locator("ol")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.goto("/clanky/v-jakem-poradi-resit-osobni-finance/");
    const orderedProcess = page.locator(
      '#od-prvniho-rozhovoru-k-planu [data-article-semantic-block="process"]',
    );
    await expect(orderedProcess.locator(":scope > ol > li")).toHaveCount(3);
    await expect(orderedProcess.locator(":scope > ol > li > span")).toHaveText([
      "01", "02", "03",
    ]);
  });

  test("lays out three comparison items as full-width rows", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/clanky/kolik-ma-mit-domacnost-v-rezerve/");

    const comparison = page
      .locator('[data-article-semantic-block="comparison"]')
      .filter({
        has: page.getByRole("heading", {
          name: "Jak jednotlivá místa plní práci rezervy",
        }),
      });
    const items = comparison.locator("section");

    await expect(items).toHaveCount(3);
    const geometry = await comparison.evaluate((element) => ({
      container: element.getBoundingClientRect().toJSON(),
      items: Array.from(element.querySelectorAll("section"), (item) =>
        item.getBoundingClientRect().toJSON(),
      ),
    }));

    for (const item of geometry.items) {
      expect(Math.abs(item.x - geometry.container.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(item.width - geometry.container.width)).toBeLessThanOrEqual(2);
    }
    for (let index = 1; index < geometry.items.length; index += 1) {
      const previous = geometry.items[index - 1];
      const current = geometry.items[index];
      expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height - 1);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(items).toHaveCount(3);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the context rail informational and synced to reading", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/clanky/konec-fixace-hypoteky/");

    const contextRail = page.locator("[data-article-context-rail]");
    const authorAction = page.locator("[data-article-author]")
      .getByRole("link", { name: "Domluvit úvodní hovor" });
    const related = page
      .locator("section[data-suppress-sticky-cta]")
      .filter({ has: page.locator("#related-stories-title") });

    await expect(authorAction).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=article&intent=housing&topic=mortgage-refixation&cta=article-final-check",
    );

    await expect(contextRail.locator("button")).toHaveCount(0);
    await expect(contextRail.locator('a[href^="/ziskat-prehled/"]')).toHaveCount(
      0,
    );
    await expect(contextRail.locator(":scope > *")).toHaveCount(2);

    const expectRailWithoutNestedScrollbars = async () => {
      const railLayout = await contextRail.evaluate((element) => {
        const style = getComputedStyle(element);

        return {
          overflowX: style.overflowX,
          overflowY: style.overflowY,
        };
      });

      expect(railLayout).toEqual({ overflowX: "visible", overflowY: "visible" });
      await expectNoHorizontalOverflow(page);
    };

    const sectionOrder = [
      "kontrola",
      "strategicky-moment",
      "prvni-nabidka-banky",
      "vice-zpusobu",
      "tri-chyby",
      "priklad-z-praxe",
      "proc-nejen-sazba",
      "co-udelat-pred-podpisem",
    ];

    for (const sectionId of sectionOrder) {
      await page.locator(`#${sectionId}`).evaluate((element) => {
        element.scrollIntoView({ block: "start" });
      });
      await expect
        .poll(() => contextRail.getAttribute("data-active-section"))
        .toBe(sectionId);
      await expect(contextRail.locator('[aria-current="location"]')).toHaveAttribute(
        "href",
        `#${sectionId}`,
      );
      await expectRailWithoutNestedScrollbars();
    }

    for (const sectionId of [...sectionOrder].reverse()) {
      await page.locator(`#${sectionId}`).evaluate((element) => {
        element.scrollIntoView({ block: "start" });
      });
      await expect
        .poll(() => contextRail.getAttribute("data-active-section"))
        .toBe(sectionId);
      await expect(contextRail.locator('[aria-current="location"]')).toHaveAttribute(
        "href",
        `#${sectionId}`,
      );
      await expectRailWithoutNestedScrollbars();
    }

    await page.setViewportSize({ width: 1440, height: 740 });
    await expect(contextRail).toHaveCSS("position", "sticky");
    await expectRailWithoutNestedScrollbars();
    await page.setViewportSize({ width: 1440, height: 900 });

    await related.scrollIntoViewIfNeeded();

    const relatedRows = related.locator("li > a");
    await expect(relatedRows).toHaveCount(3);
    await expect(relatedRows.first()).toHaveAttribute(
      "data-native-cursor",
      /^(|true)$/,
    );
    await expect(relatedRows.first().locator("svg")).toHaveCount(1);

    const firstRow = relatedRows.first();
    const firstRowArrow = relatedRows.first().locator("svg");
    const rowBoxBefore = await firstRow.boundingBox();
    const arrowBoxBefore = await firstRowArrow.boundingBox();

    await relatedRows.first().hover();
    await page.waitForTimeout(240);

    const rowBoxAfter = await firstRow.boundingBox();
    const arrowBoxAfter = await firstRowArrow.boundingBox();

    expect(rowBoxBefore).not.toBeNull();
    expect(arrowBoxBefore).not.toBeNull();
    expect(rowBoxAfter).not.toBeNull();
    expect(arrowBoxAfter).not.toBeNull();
    expect(rowBoxAfter?.x ?? 0).toBeCloseTo(rowBoxBefore?.x ?? 0, 1);
    expect(arrowBoxAfter?.x ?? 0).toBeGreaterThanOrEqual(arrowBoxBefore?.x ?? 0);
    expect(
      await page.locator('[data-cursor-visible="true"]').count(),
    ).toBe(0);
  });

  test("keeps the insurance article rail pinned while scrolling down and back on a laptop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 700 });
    await page.goto("/clanky/zdrazilo-vam-pojisteni/", {
      waitUntil: "networkidle",
    });

    const contextRail = page.locator("[data-article-context-rail]");
    const firstSectionId = "dlouholety-klient-nemusi-mit-automaticky-nejlepsi-cenu";
    const sectionOrder = [
      firstSectionId,
      "co-porovnat-pred-zaplacenim",
      "kdy-pojistne-neplatit-automaticky",
      "co-porovnat-pred-zaplacenim",
      firstSectionId,
    ];
    const stickyTop = await contextRail.evaluate((rail) =>
      Number.parseFloat(getComputedStyle(rail).top),
    );

    for (const sectionId of sectionOrder) {
      await page.locator(`#${sectionId}`).evaluate((section, top) => {
        window.scrollTo({
          top: window.scrollY + section.getBoundingClientRect().top - top + 24,
          behavior: "instant",
        });
      }, stickyTop);

      await expect(contextRail).toHaveAttribute("data-active-section", sectionId);
      await expect(contextRail.locator('[aria-current="location"]'))
        .toHaveAttribute("href", `#${sectionId}`);
      await expect
        .poll(() => contextRail.evaluate((rail, top) =>
          Math.abs(rail.getBoundingClientRect().top - top), stickyTop))
        .toBeLessThanOrEqual(1);
    }

    const navigation = contextRail.getByRole("navigation", { name: "Části článku" });
    expect(await navigation.evaluate((nav) => nav.scrollHeight - nav.clientHeight))
      .toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`keeps rail hover from creating scrollbars with the custom cursor (${reducedMotion})`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      });
      await page.goto("/clanky/zdrazilo-vam-pojisteni/", {
        waitUntil: "networkidle",
      });

      const lastSectionId = "nejdriv-zkontrolovat-potom-zaplatit";
      await page.locator(`#${lastSectionId}`).evaluate((section) => {
        if (window.__lenis) {
          window.__lenis.scrollTo(section as HTMLElement, { immediate: true, offset: -100 });
        } else {
          section.scrollIntoView({ block: "start", behavior: "instant" });
        }
      });
      const rail = page.locator("[data-article-context-rail]");
      const navigation = rail.getByRole("navigation", { name: "Části článku" });
      const links = navigation.getByRole("link");
      const cursor = page.locator("[data-custom-cursor]");
      await expect(rail).toHaveAttribute("data-active-section", lastSectionId);
      await expect(links).toHaveCount(5);
      await expect(navigation).toBeInViewport({ ratio: 1 });
      await page.mouse.move(16, 200);

      const readGeometry = () => navigation.evaluate((nav) => ({
        clientWidth: nav.clientWidth,
        scrollWidth: nav.scrollWidth,
        clientHeight: nav.clientHeight,
        scrollHeight: nav.scrollHeight,
      }));
      const baseline = await readGeometry();
      expect(baseline.scrollWidth).toBe(baseline.clientWidth);
      expect(baseline.scrollHeight).toBe(baseline.clientHeight);

      // The expanded cursor hit area used to add 18px of overflow. Exercise
      // both edges of first, middle and last links with the real cursor active.
      for (const index of [0, 2, 4]) {
        const link = links.nth(index);
        const bounds = await link.boundingBox();
        expect(bounds).not.toBeNull();
        for (const position of [
          { x: 2, y: 2 },
          { x: bounds!.width - 2, y: bounds!.height - 2 },
        ]) {
          await link.hover({ position });
          await expect(cursor).toHaveAttribute("data-cursor-visible", "true");
          await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
          await expect(cursor.locator("[data-cursor-click-hand]")).toBeVisible();
          await expect.poll(readGeometry).toEqual(baseline);
          await expect(navigation.locator("[data-cursor-interaction-zone]"))
            .toHaveCount(0);
          await expect(navigation.locator("[data-cursor-magnetic-active]"))
            .toHaveCount(0);
          expect(await link.evaluate((element) => [
            element.style.getPropertyValue("--cursor-magnetic-x"),
            element.style.getPropertyValue("--cursor-magnetic-y"),
          ])).toEqual(["", ""]);
          await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
          await expect(cursor).toHaveAttribute("data-cursor-locked", "false");
        }
      }
      const screenshotPath = testInfo.outputPath("rail-after-hover.png");
      await rail.screenshot({ path: screenshotPath });
      await testInfo.attach("rail-after-hover", {
        path: screenshotPath,
        contentType: "image/png",
      });

      const middleLink = links.nth(2);
      await middleLink.focus();
      await expect(middleLink).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#kdy-pojistne-neplatit-automaticky$/);
      await expect(rail).toHaveAttribute("data-active-section", "kdy-pojistne-neplatit-automaticky");
      await expect(page.locator("#kdy-pojistne-neplatit-automaticky h2"))
        .toBeInViewport();

      await links.last().click();
      await expect(page).toHaveURL(/#nejdriv-zkontrolovat-potom-zaplatit$/);
      await expect(rail).toHaveAttribute("data-active-section", lastSectionId);
      await expect(links.last()).toHaveAttribute("aria-current", "location");
      await expect(page.locator(`#${lastSectionId} h2`)).toBeInViewport();
      await expectNoHorizontalOverflow(page);
    });

    test(`keeps the last rail link reachable inside a sticky rail on a short desktop (${reducedMotion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width: 1366, height: 560 });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      });
      await page.goto("/clanky/kolik-ma-mit-domacnost-v-rezerve/", {
        waitUntil: "networkidle",
      });
      if (reducedMotion === "no-preference") {
        await page.waitForFunction(() => Boolean(window.__lenis));
      } else {
        expect(await page.evaluate(() => window.__lenis)).toBeUndefined();
      }

      const scrollToSection = async (sectionId: string) => {
        await page.locator(`#${sectionId}`).evaluate((section) => {
          if (window.__lenis) {
            window.__lenis.scrollTo(section as HTMLElement, { immediate: true, offset: -100 });
          } else {
            section.scrollIntoView({ block: "start", behavior: "instant" });
          }
        });
      };

      const contextRail = page.locator("[data-article-context-rail]");
      const navigation = contextRail.getByRole("navigation", {
        name: "Části článku",
      });
      const links = navigation.getByRole("link");
      await expect(links).toHaveCount(10);
      await expect(contextRail).toHaveCSS("position", "sticky");
      await expect(contextRail).toHaveCSS("overflow-x", "visible");
      await expect(contextRail).toHaveCSS("overflow-y", "visible");

      await scrollToSection("rezerva-neni-nasobek-vyplaty");
      await expect(navigation).toBeInViewport();
      const documentScrollBefore = await page.evaluate(() => window.scrollY);
      const navigationScrollHeight = await navigation.evaluate((nav) => nav.scrollHeight);
      await navigation.hover();
      await page.mouse.wheel(0, navigationScrollHeight);
      await expect.poll(() => navigation.evaluate((nav) => nav.scrollTop))
        .toBeGreaterThan(0);

      const lastLink = links.last();
      await expect(lastLink).toBeInViewport();
      expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(documentScrollBefore, 0);
      expect(await contextRail.evaluate((rail) => rail.scrollTop)).toBe(0);
      const railBottom = await contextRail.evaluate((rail) => rail.getBoundingClientRect().bottom);
      expect(railBottom).toBeLessThanOrEqual(560);

      await lastLink.click();
      await expect(page).toHaveURL(/#kdy-rezervu-prepocitat$/);
      await expect(contextRail).toHaveAttribute("data-active-section", "kdy-rezervu-prepocitat");
      await expect(lastLink).toHaveAttribute("aria-current", "location");
      await expect(page.locator("#kdy-rezervu-prepocitat").getByRole("heading", { level: 2 }))
        .toBeInViewport();

      for (const sectionId of [
        "rezerva-neni-nasobek-vyplaty",
        "kdy-rezervu-prepocitat",
        "rezerva-neni-nasobek-vyplaty",
      ]) {
        await scrollToSection(sectionId);
        await expect(contextRail).toHaveAttribute("data-active-section", sectionId);
        await expect(navigation.locator('[aria-current="location"]'))
          .toBeInViewport({ ratio: 1 });
      }

      await expectNoHorizontalOverflow(page);
    });
  }

  test("composes the article hero as one responsive editorial scene", async ({
    page,
  }) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1000 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/clanky/konec-fixace-hypoteky/");

      const hero = page.locator("main > header").first();
      const headline = hero.locator("[data-article-hero-headline]");
      const visual = hero.locator("[data-article-hero-visual]");
      const intro = hero.locator("[data-article-hero-intro]");
      const readingDisclosure = getArticleReadingDisclosure(page);
      const firstSection = page.locator("[data-article-section]").first();

      await expect(headline).toBeVisible();
      await expect(visual).toBeVisible();
      await expect(hero.locator("figcaption")).toHaveCount(0);
      await expect(hero.getByText("KONEC FIXACE BEZ AUTOMATICKÉHO ROZHODNUTÍ"))
        .toHaveCount(0);
      await expect(visual.getByText(/^08$/)).toHaveCount(0);
      await expect(hero.locator("[data-article-reading-index]")).toHaveCount(0);
      await expect(readingDisclosure.details).toHaveJSProperty("open", false);
      await expect(readingDisclosure.summary).toHaveText(/Obsah článku\s*8 částí/);

      const [heroBox, headlineBox, visualBox, introBox, sectionBox] =
        await Promise.all([
          hero.boundingBox(),
          headline.boundingBox(),
          visual.boundingBox(),
          intro.boundingBox(),
          firstSection.boundingBox(),
        ]);

      expect(heroBox).not.toBeNull();
      expect(headlineBox).not.toBeNull();
      expect(visualBox).not.toBeNull();
      expect(introBox).not.toBeNull();
      expect(sectionBox).not.toBeNull();

      if (
        !heroBox ||
        !headlineBox ||
        !visualBox ||
        !introBox ||
        !sectionBox
      ) {
        throw new Error("Article hero geometry is unavailable.");
      }

      expect(introBox.y).toBeGreaterThanOrEqual(
        headlineBox.y + headlineBox.height,
      );
      expect(visualBox.y).toBeGreaterThanOrEqual(
        introBox.y + introBox.height,
      );
      expect(visualBox.x).toBeCloseTo(headlineBox.x, 0);
      expect(sectionBox.y).toBeGreaterThanOrEqual(
        heroBox.y + heroBox.height,
      );

      if (viewport.width > 1180) {
        await expect(readingDisclosure.navigation).toBeHidden();
        await expect(page.locator("[data-article-context-rail]")).toBeVisible();
      } else {
        await expect(readingDisclosure.summary).toBeVisible();
        await expect(readingDisclosure.navigation.locator("ol")).toBeHidden();
        await expect(page.locator("[data-article-context-rail]")).toBeHidden();
        const summaryBox = await readingDisclosure.summary.boundingBox();
        expect(summaryBox).not.toBeNull();
        expect(summaryBox?.y ?? 0).toBeGreaterThanOrEqual(
          heroBox.y + heroBox.height - 1,
        );
        expect((summaryBox?.y ?? 0) + (summaryBox?.height ?? 0)).toBeLessThanOrEqual(
          sectionBox.y + 1,
        );
      }

      await expectNoHorizontalOverflow(page);
    }
  });

  test("opens the introductory call form from the mortgage article author profile", async ({
    page,
  }) => {
    await page.goto("/clanky/konec-fixace-hypoteky/");
    const authorProfile = page.locator("[data-article-author]");
    const identity = authorProfile.locator(":scope > div").first();
    const invitation = authorProfile.locator(":scope > div").last();
    const finalAction = invitation.getByRole("link", {
      name: "Domluvit úvodní hovor",
    });
    await expect(authorProfile.locator(":scope > div")).toHaveCount(2);
    await expect(identity).toContainText("Autor článku");
    await expect(identity.getByRole("heading", { name: "David Pokorný" }))
      .toBeVisible();
    await expect(identity).toContainText("Finanční poradce");
    await expect(identity.getByRole("link")).toHaveCount(0);
    await expect(invitation.getByRole("img")).toHaveCount(0);
    await expect(invitation.getByRole("heading")).toHaveCount(0);
    await expect(invitation).toContainText(
      "Na úvodním hovoru spolu projdeme vaši situaci a ujasníme si další krok.",
    );
    const portrait = identity.getByRole("img", {
      name: "Portrét Davida Pokorného",
    });
    await portrait.scrollIntoViewIfNeeded();
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((image) =>
      (image as HTMLImageElement).naturalWidth,
    )).toBeGreaterThan(0);
    await expect(portrait.locator("..")).toHaveCSS("border-radius", "50%");
    const [identityBox, invitationBox] = await Promise.all([
      identity.boundingBox(),
      invitation.boundingBox(),
    ]);
    expect(identityBox).not.toBeNull();
    expect(invitationBox).not.toBeNull();
    if (!identityBox || !invitationBox) {
      throw new Error("Article author layout is unavailable.");
    }
    expect(invitationBox.y).toBeGreaterThanOrEqual(
      identityBox.y + identityBox.height,
    );
    await expect(authorProfile.locator('a[href^="/ziskat-prehled/"]'))
      .toHaveCount(1);
    await expect(page.locator("#screening")).toHaveCount(0);
    await expect(page.locator('[data-article-semantic-block="nextAction"]'))
      .toHaveCount(0);
    await expect(finalAction).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=article&intent=housing&topic=mortgage-refixation&cta=article-final-check",
    );

    await finalAction.click();
    await expect(page).toHaveURL(/\/ziskat-prehled\//);
    expect(await getQueryParam(page, "source")).toBe("article");
    expect(await getQueryParam(page, "intent")).toBe("housing");
    expect(await getQueryParam(page, "topic")).toBe("mortgage-refixation");
    expect(await getQueryParam(page, "cta")).toBe("article-final-check");
    await expect(
      page.getByRole("heading", { level: 1, name: "Kontaktní údaje" }),
    ).toBeAttached();
    await expect(
      page.getByText("Konec fixace hypotéky", { exact: true }),
    ).toBeVisible();
  });

  test("renders every current article through the article renderer", async ({
    page,
  }) => {
    const slugs = [
      "konec-fixace-hypoteky",
      "zdrazilo-vam-pojisteni",
      "mate-pojisteni-prijmu-nebo-jen-pocit",
      "chcete-investovat-zacnete-planem",
    ];

    for (const slug of slugs) {
      await page.goto(`/clanky/${slug}/`);

      await expect(
        page.locator('[data-article-layout="canonical"]'),
      ).toBeVisible();
      await expect(
        page.locator('article[data-article-renderer="canonical"]'),
      ).toBeVisible();
      await expect(page.locator("[data-article-context-rail]")).toBeAttached();
      await expect(page.locator("[data-semantic-article]")).toBeVisible();
      await expect(page.locator("[data-article-section]").first()).toBeVisible();
      await expect(page.getByText("Souvislosti článku")).toHaveCount(0);
      await expect(page.getByText("Orientační screening")).toHaveCount(0);
      await expectSingleFinalArticleAction(page, slug);
      if (slug === "konec-fixace-hypoteky") {
        await expect(page.locator("#kontrola")).toBeVisible();
        await expect(page.locator("[data-article-section]")).toHaveCount(8);
        await expect(page.locator("#screening")).toHaveCount(0);
        await expect(page.locator("[data-article-author]")
          .getByRole("link", { name: "Domluvit úvodní hovor" }))
          .toBeVisible();
      } else {
        await expect(page.locator("#screening")).toBeVisible();
        await expect(
          page.locator('#screening [data-screening-action="start"]'),
        ).toBeVisible();
        await expect(page.locator('[data-article-semantic-block="nextAction"]'))
          .toHaveCount(0);
      }
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps income scenarios readable and carries the income topic into consultation", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/clanky/mate-pojisteni-prijmu-nebo-jen-pocit/");
      const caseSection = page.locator("#kdyz-pojisteni-existovalo-ale-prijem-by-neochranilo");
      const comparison = caseSection.getByRole("table", { name: "Posuzované měsíční scénáře" });
      await expect(comparison.getByRole("columnheader")).toHaveText([
        "Hledisko", "Pracovní neschopnost", "Invalidita III. stupně",
      ]);
      await expect(comparison.getByRole("rowheader")).toHaveText(["Příjem", "Výdaje", "Měsíční rozdíl"]);
      await expect(comparison.getByRole("cell")).toHaveText([
        "27 000 Kč / měsíc", "20 000 Kč / měsíc",
        "42 000 Kč / měsíc", "42 000 Kč / měsíc", "15 000 Kč", "22 000 Kč",
      ]);
      await expect(caseSection).toContainText("třiceti dnům, za které by podle podmínek smlouvy vznikl nárok");
      await expect(caseSection).toContainText("vstupy tehdejšího propočtu podle individuálních podkladů");
      await expect(caseSection).toContainText("6 072 000 Kč");
      await expect(page.locator('main a[href="#screening"]')).toHaveCount(1);
      await expect(page.locator("[data-article-author] a[href*='topic=income-protection']"))
        .toHaveAccessibleName("Domluvit si úvodní hovor");
      await expect(page.locator('main a[href*="topic=property-insurance"]')).toHaveCount(0);
      const related = page.locator('section[aria-labelledby="related-stories-title"]');
      await expect(related.locator('a[href*="planujete-jednou-deti"]')).toHaveCount(1);
      await expect(related.locator('a[href*="mate-financni-produkty"]')).toHaveCount(1);
      await expectSingleFinalArticleAction(page, "mate-pojisteni-prijmu-nebo-jen-pocit");
      await expectNoHorizontalOverflow(page);
      const accessibility = await new AxeBuilder({ page }).include("main").analyze();
      expect(accessibility.violations).toEqual([]);
    }

    await page.locator("[data-article-author] a[href*='cta=article-final-check']").click();
    await expect(page).toHaveURL(/\/ziskat-prehled\//);
    expect(await getQueryParam(page, "topic")).toBe("income-protection");
    await expect(page.getByText("Ochrana příjmu", { exact: true })).toBeVisible();
  });

  test("presents shared case analysis before changes with sequential heading levels", async ({ page }) => {
    for (const slug of ["mate-financni-produkty-ale-mate-skutecne-financni-plan", "chcete-investovat-zacnete-planem", "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku"]) {
      await page.goto(`/clanky/${slug}/`);
      const caseStudy = page.locator('[data-article-semantic-block="caseStudy"]');
      await expect(caseStudy).toHaveCount(1);
      await expect(caseStudy.getByRole("heading", { level: 3 })).toHaveText([
        "Výchozí stav", "V čem byl problém", "Rozbor", "Co se změnilo", "Výsledek",
      ]);
      const groups = caseStudy.locator(":scope > div");
      await expect(groups.locator("section").filter({ has: page.getByRole("heading", { name: "Rozbor", exact: true }) }).locator("p"))
        .not.toBeEmpty();
      expect(await groups.evaluate((element) => [...element.children].map((child) =>
        child.querySelector("h3")?.textContent,
      ))).toEqual(["Výchozí stav", "V čem byl problém", "Rozbor", "Co se změnilo", "Výsledek"]);
    }
  });

  test("renders every migrated JSON article through the semantic renderer", async ({
    page,
  }) => {
    for (const [slug, sectionCount] of MIGRATED_ARTICLES) {
      await page.goto(`/clanky/${slug}/`);

      await expect(
        page.locator('[data-article-layout="canonical"]'),
      ).toBeVisible();
      await expect(page.locator("[data-semantic-article]")).toBeVisible();
      await expect(page.locator("[data-article-section]")).toHaveCount(
        sectionCount,
      );
      await expect(
        page.locator("[data-article-hero-visual] img"),
      ).toBeVisible();
      await expect(
        page.locator("[data-article-hero-visual-fallback]"),
      ).toHaveCount(0);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator("main > header")).toContainText("David Pokorný");
      await expect(page.locator("main > header")).toContainText(/min čtení/);
      await expectSingleFinalArticleAction(page, slug);
      await expect(page.locator('[data-article-semantic-block="nextAction"]'))
        .toHaveCount(0);
      const publicHtml = await page.locator("main").innerHTML();
      expect(publicHtml).not.toMatch(
        /sourceNote|needsVerification|vyžaduje ověření|před publikací|veřejný render|interní ověřovací workflow/i,
      );
      expect(publicHtml).not.toContain(
        "Aktuální pravidla bankovního posouzení je nutné ověřit",
      );
      const jsonLd = await page
        .locator('main > script[type="application/ld+json"]')
        .textContent();
      expect(jsonLd ?? "").not.toMatch(
        /verificationItems|sourceBasis|needsExternalVerification|productionNotes/i,
      );
      await expectNoHorizontalOverflow(page);
    }

    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("renders insurance through semantic editorial blocks", async ({
    page,
  }) => {
    await page.goto("/clanky/zdrazilo-vam-pojisteni/");

    const heroTitle = page.getByRole("heading", {
      level: 1,
      name: "Zdražilo vám pojištění? Neplaťte automaticky víc.",
    });
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toHaveText(
      "Zdražilo vám pojištění? Neplaťte automaticky víc.",
    );
    await expect(heroTitle.locator("span")).toHaveCount(0);
    await expect(heroTitle).toHaveCSS("white-space", "pre-line");
    expect(await heroTitle.textContent()).toBe(
      "Zdražilo vám pojištění?\nNeplaťte automaticky víc.",
    );
    const hero = page.locator("main > header").first();
    const readingSurface = page.locator('[data-article-layout="canonical"]');
    await expect(hero).toHaveAttribute("data-nav-section", "light");
    expect(
      await hero.evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe(
      await readingSurface.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    );

    const article = page.locator('article[data-article-renderer="canonical"]');

    await expect(
      article.getByRole("heading", {
        level: 2,
        name: "Dlouholetý klient nemusí mít automaticky nejlepší cenu",
      }),
    ).toBeVisible();
    await expect(
      article.getByRole("heading", {
        level: 2,
        name: "Co porovnat před zaplacením",
      }),
    ).toBeVisible();
    await expect(article.locator("[data-article-section]")).toHaveCount(5);
    await expect(article.locator("#co-porovnat-pred-zaplacenim")).toContainText(
      "Co porovnat před zaplacením",
    );
    await expect(article.locator("#screening")).toBeVisible();
    await expect(article.locator('[data-article-semantic-block="nextAction"]'))
      .toHaveCount(0);
    const introduction = article.locator("[data-article-section]").first();
    await expect(introduction.getByRole("link")).toHaveCount(0);
    const introductionLead = "Samotná nižší cena ještě neznamená vhodnější smlouvu.";
    await expect(introduction.locator('[data-article-semantic-block="lead"]'))
      .toHaveText(introductionLead);
    await expect(introduction.getByText(introductionLead, { exact: true }))
      .toHaveCount(1);
    await expect(introduction.locator('[data-article-semantic-block="explanation"]'))
      .toHaveText(
        "Při kontrole se proto dívejte na pojistné společně s rozsahem ochrany, limity a aktuální hodnotou majetku.",
      );
    await expect(introduction).not.toContainText(
      "V dalším bodě najdete, co porovnat před zaplacením.",
    );
    await expectSingleFinalArticleAction(page, "zdrazilo-vam-pojisteni");
    const invitation = page.locator("[data-article-author] > div").last();
    await expect(invitation.locator("p")).toHaveText(
      "Na úvodním hovoru spolu probereme, co vám zdražilo, a domluvíme se, které podklady připravit ke kontrole.",
    );
    await expect(invitation.getByRole("link", { name: "Domluvit si kontrolu", exact: true }))
      .toHaveAttribute("href", /cta=article-final-check/);
    await expectNoHorizontalOverflow(page);
  });

  test("shares article block treatments across topics", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const articles = [
      {
        slug: "konec-fixace-hypoteky",
        compactChecklist: "#kontrola",
        tileChecklist: "#vice-zpusobu",
        decision: "#tri-chyby",
        financialDelta: "#priklad-z-praxe",
        financialVariant: "single",
      },
      {
        slug: "banka-vam-pujci-vic-nez-si-muzete-dovolit",
        tileChecklist: "#tri-otazky-pred-hledanim-maxima",
        financialDelta: "#modelovy-par-dve-hranice",
        financialVariant: "comparison",
      },
      {
        slug: "zdrazilo-vam-pojisteni",
        tileChecklist: "#nejdriv-zkontrolovat-potom-zaplatit",
        rowChecklist: "#co-porovnat-pred-zaplacenim",
      },
    ] as const;

    for (const article of articles) {
      await page.goto(`/clanky/${article.slug}/`);

      if ("compactChecklist" in article) {
        await expect(page.locator(`${article.compactChecklist} [data-article-semantic-block="checklist"]`))
          .toHaveAttribute("data-variant", "compact");
      }
      if ("rowChecklist" in article) {
        await expect(page.locator(`${article.rowChecklist} [data-article-semantic-block="checklist"]`))
          .toHaveAttribute("data-variant", "rows");
      }
      if ("tileChecklist" in article) {
        const checklist = page.locator(`${article.tileChecklist} [data-article-semantic-block="checklist"]`);
        await expect(checklist).toHaveAttribute("data-variant", "tiles");
        const itemPositions = await checklist.locator("li").evaluateAll((items) =>
          items.map((item) => {
            const rect = item.getBoundingClientRect();
            return { x: rect.x, y: rect.y };
          }),
        );
        expect(itemPositions).toHaveLength(3);
        expect(Math.max(...itemPositions.map((item) => item.y)) - Math.min(...itemPositions.map((item) => item.y)))
          .toBeLessThanOrEqual(2);
        expect(itemPositions[0].x).toBeLessThan(itemPositions[1].x);
        expect(itemPositions[1].x).toBeLessThan(itemPositions[2].x);
      }
      if ("decision" in article) {
        const firstDecision = page.locator(`${article.decision} [data-article-semantic-block="decision"] li`).first();
        const [title, explanation] = await Promise.all([
          firstDecision.locator("h3, h4").boundingBox(),
          firstDecision.locator("p").first().boundingBox(),
        ]);
        expect(title).not.toBeNull();
        expect(explanation).not.toBeNull();
        expect(explanation!.x).toBeGreaterThan(title!.x + title!.width);
      }
      if ("financialDelta" in article) {
        await expect(page.locator(`${article.financialDelta} [data-article-semantic-block="financialDelta"]`))
          .toHaveAttribute("data-variant", article.financialVariant);
      }
      await expectNoHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    for (const slug of [
      "konec-fixace-hypoteky",
      "banka-vam-pujci-vic-nez-si-muzete-dovolit",
    ]) {
      await page.goto(`/clanky/${slug}/`);
      const checklist = page.locator('[data-article-semantic-block="checklist"][data-variant="tiles"]').first();
      const itemPositions = await checklist.locator("li").evaluateAll((items) =>
        items.map((item) => {
          const rect = item.getBoundingClientRect();
          return { x: rect.x, y: rect.y };
        }),
      );
      expect(itemPositions).toHaveLength(3);
      expect(Math.max(...itemPositions.map((item) => item.x)) - Math.min(...itemPositions.map((item) => item.x)))
        .toBeLessThanOrEqual(2);
      expect(itemPositions[0].y).toBeLessThan(itemPositions[1].y);
      expect(itemPositions[1].y).toBeLessThan(itemPositions[2].y);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("composes semantic section context inline on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 860 });
    await page.goto("/clanky/konec-fixace-hypoteky/");

    await expect(page.locator("[data-article-context-rail]")).toBeHidden();
    await expect(page.locator("#kontrola")).toBeVisible();
    await expect(
      page.locator('#kontrola [data-article-semantic-block="expertNote"]'),
    ).toBeVisible();
    await expect(
      page.locator('#kontrola aside[aria-label="Poznámka k části"]'),
    ).toHaveCount(0);
    await expect(
      page.locator("#kontrola > header").getByText("Kontrola před podpisem", { exact: true }),
    ).toBeVisible();
    const finalSection = page.locator("#co-udelat-pred-podpisem");
    await expect(finalSection.getByRole("heading", {
      level: 3,
      name: "Co mít po ruce při úvodním hovoru",
    })).toBeAttached();
    await expect(finalSection.getByRole("listitem")).toHaveCount(4);
    await expect(finalSection.locator('[data-article-semantic-block="nextAction"]'))
      .toHaveCount(0);
    const readingDisclosure = getArticleReadingDisclosure(page);
    await expect(readingDisclosure.summary).toBeVisible();
    await expect(readingDisclosure.details).toHaveJSProperty("open", false);
    await readingDisclosure.summary.press("Enter");
    await expect(readingDisclosure.navigation.locator("ol")).toBeVisible();
    await readingDisclosure.navigation.getByRole("link").first().click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(
      "#kontrola",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the semantic article resilient across viewports and reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 390, height: 860 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/clanky/konec-fixace-hypoteky/");

      await expect(page.locator("[data-article-section]")).toHaveCount(8);
      const readingDisclosure = getArticleReadingDisclosure(page);
      await expect(readingDisclosure.details).toHaveJSProperty("open", false);
      await expectNoHorizontalOverflow(page);

      const contextRail = page.locator("[data-article-context-rail]");
      let firstMapLink = readingDisclosure.navigation.getByRole("link").first();
      if (viewport.width <= 1180) {
        await expect(contextRail).toBeHidden();
        await expect(readingDisclosure.summary).toBeVisible();
        await expect(readingDisclosure.navigation.locator("ol")).toBeHidden();
        await readingDisclosure.summary.press("Enter");
        await expect(readingDisclosure.details).toHaveJSProperty("open", true);
      } else {
        await expect(readingDisclosure.navigation).toBeHidden();
        await page.locator("#kontrola").scrollIntoViewIfNeeded();
        await expect(contextRail).toBeVisible();
        await expect(contextRail.locator(":scope > *")).toHaveCount(2);
        firstMapLink = contextRail.getByRole("navigation", {
          name: "Části článku",
        }).getByRole("link").first();
        const transitionSeconds = await firstMapLink.evaluate((link) =>
          Number.parseFloat(getComputedStyle(link).transitionDuration),
        );
        expect(transitionSeconds).toBeLessThanOrEqual(0.01);
      }

      await firstMapLink.focus();
      expect(
        await firstMapLink.evaluate(
          (element) =>
            element.matches(":focus-visible") &&
            getComputedStyle(element).outlineStyle !== "none",
        ),
      ).toBe(true);

      if (viewport.width === 390) {
        const metricRows = page
          .locator('[data-article-semantic-block="financialDelta"] > div > div');
        const positions = await metricRows.evaluateAll((rows) =>
          rows.map((row) => {
            const rect = row.getBoundingClientRect();
            return { x: Math.round(rect.x), y: Math.round(rect.y) };
          }),
        );

        expect(new Set(positions.map((position) => position.x)).size).toBe(1);
        expect(positions.map((position) => position.y)).toEqual(
          [...positions.map((position) => position.y)].sort(
            (left, right) => left - right,
          ),
        );
      }
    }
  });

  test("supports skip link and visible focus states in the article flow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/clanky/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Přeskočit na obsah" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    const closedMenuTabbables = await page
      .locator("#site-side-menu a")
      .evaluateAll((links) =>
        links.filter((link) => (link as HTMLAnchorElement).tabIndex >= 0)
          .length,
      );
    expect(closedMenuTabbables).toBe(0);

    await page.keyboard.press("Tab");

    const firstCard = page.locator("#article-results a").first();
    await firstCard.focus();
    await expect(firstCard).toBeFocused();

    const cardFocus = await firstCard.evaluate((element) => {
      const style = window.getComputedStyle(element);

      return {
        isFocusVisible: element.matches(":focus-visible"),
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
      };
    });

    expect(cardFocus.isFocusVisible).toBe(true);
    expect(
      cardFocus.outlineStyle !== "none" || cardFocus.boxShadow !== "none",
    ).toBe(true);
  });

  test("cancels desktop scroll inertia before opening an article", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", {
        configurable: true,
        get: () => false,
      });
    });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/clanky/", { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            typeof (
              window as Window & {
                __lenis?: { scrollTo?: (target: number) => void };
              }
            ).__lenis?.scrollTo === "function",
        ),
      )
      .toBe(true);

    await page.evaluate(() => {
      const lenis = (
        window as Window & {
          __lenis?: {
            scrollTo: (
              target: number,
              options?: {
                duration?: number;
                force?: boolean;
                immediate?: boolean;
              },
            ) => void;
          };
        }
      ).__lenis;

      lenis?.scrollTo(700, { force: true, immediate: true });
      lenis?.scrollTo(1500, { duration: 2, force: true });
    });

    await page.waitForTimeout(110);
    const navigation = page.waitForURL(
      "**/clanky/zdrazilo-vam-pojisteni/",
    );
    await page
      .locator('[data-article-slug="zdrazilo-vam-pojisteni"]')
      .evaluate((link) => (link as HTMLAnchorElement).click());
    await navigation;

    const desktopGuardState = await page.evaluate(() => ({
      isLocked:
        document.documentElement.dataset.articleNavigationLock === "true",
      blockedMomentum: Array.from({ length: 5 }, () => {
        const momentumEvent = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 220,
        });
        const wasAccepted = window.dispatchEvent(momentumEvent);
        if (wasAccepted) window.scrollBy(0, momentumEvent.deltaY);
        return momentumEvent.defaultPrevented;
      }),
    }));
    expect(desktopGuardState).toEqual({
      isLocked: true,
      blockedMomentum: [true, true, true, true, true],
    });

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 2_500 })
      .toBeLessThanOrEqual(1);
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-article-navigation-lock",
      "true",
    );
    await expect(page.locator("#main-content")).toBeFocused();
    expect(
      await page.evaluate(
        () =>
          (window as Window & { __lenis?: { isStopped?: boolean } }).__lenis
            ?.isStopped,
      ),
    ).toBe(false);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  });

  test("opens an article at its beginning on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/clanky/");
    await page.evaluate(() => window.scrollTo(0, 900));

    const navigation = page.waitForURL(
      "**/clanky/zdrazilo-vam-pojisteni/",
    );
    await page
      .locator('[data-article-slug="zdrazilo-vam-pojisteni"]')
      .evaluate((link) => (link as HTMLAnchorElement).click());
    await navigation;

    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThanOrEqual(1);
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-article-navigation-lock",
      "true",
    );
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("keeps the side menu out of tab order until opened", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 840 });
    await page.goto("/clanky/");

    const menuButton = page.locator(
      'button[aria-controls="public-site-navigation-panel"]',
    );
    const menuPanel = page.locator("#public-site-navigation-panel");

    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAccessibleName("Otevřít menu");
    await expect(menuButton).toHaveAttribute(
      "aria-controls",
      "public-site-navigation-panel",
    );
    await expect(menuPanel).toHaveAttribute("aria-hidden", "true");
    await expect(menuPanel).toHaveAttribute("inert", "");

    await menuButton.click();

    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(menuButton).toHaveAccessibleName("Zavřít menu");
    await expect(menuPanel).toBeVisible();
    const closeButton = menuPanel.getByRole("button", { name: "Zavřít menu" });
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.activeElement?.closest("#public-site-navigation-panel")),
        ),
      )
      .toBe(true);
    await expect(menuPanel.getByRole("link", { name: "Služby" })).toBeVisible();
    if (await closeButton.evaluate((button) => document.activeElement === button)) {
      await page.keyboard.press("Tab");
    }
    await expect(menuPanel.getByRole("link", { name: "Služby" })).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(menuPanel).toHaveAttribute("aria-hidden", "true");
    await expect(menuPanel).toHaveAttribute("inert", "");
    await expect(menuButton).toBeFocused();
  });

  test("keeps the cookie banner compact on mobile", async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, CONSENT_STORAGE_KEY);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/clanky/");

    const banner = page.getByRole("region", { name: "Nastavení cookies" });
    await expect(banner).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Souhlasím", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nesouhlasím", exact: true }),
    ).toBeVisible();

    const box = await banner.boundingBox();
    const actionBoxes = await Promise.all([
      page.getByRole("button", { name: "Souhlasím", exact: true }).boundingBox(),
      page.getByRole("button", { name: "Nesouhlasím", exact: true }).boundingBox(),
    ]);
    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeLessThanOrEqual(270);
    expect(actionBoxes.every((actionBox) => (actionBox?.height ?? 0) >= 44))
      .toBe(true);
  });
});
