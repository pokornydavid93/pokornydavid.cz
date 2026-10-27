import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const articleLinks = [
  {
    href: "/clanky/konec-fixace-hypoteky/",
    name: "Přečíst článek: Končí vám fixace? První nabídka banky není verdikt.",
    slug: "konec-fixace-hypoteky",
  },
  {
    href: "/clanky/chcete-investovat-zacnete-planem/",
    name: "Přečíst článek: Chcete investovat? Začněte plánem, ne produktem.",
    slug: "chcete-investovat-zacnete-planem",
  },
  {
    href: "/clanky/mate-pojisteni-prijmu-nebo-jen-pocit/",
    name: "Přečíst článek: Chrání vaše pojištění příjem, nebo jen pocit jistoty?",
    slug: "mate-pojisteni-prijmu-nebo-jen-pocit",
  },
] as const;

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

test.describe("homepage editorial article selection", () => {
  test.beforeEach(async ({ page }) => {
    await primeRejectedConsent(page);
  });

  test("renders exactly three curated stories without archive controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });

    const section = page.locator('[data-home-module="insights"]');
    const articles = section.locator("article[data-home-article]");

    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section.getByText(
      "Z PRAXE, NE Z UČEBNICE",
      { exact: true },
    )).toBeVisible();
    const sectionTitle = section.getByRole("heading", {
      level: 2,
      name: "Situace, které stojí za bližší pohled.",
    });
    await expect(sectionTitle).toBeVisible();
    await expect(sectionTitle.locator("[data-home-articles-title-line]"))
      .toHaveCount(2);
    await expect(section.getByRole("heading", { level: 3 })).toHaveCount(3);
    const articleTitleLines = section.locator(
      "[data-home-article-title-line]",
    );
    await expect(articleTitleLines).toHaveCount(6);

    const sectionTitleColors = await sectionTitle
      .locator("[data-home-articles-title-line]")
      .evaluateAll((lines) => lines.map((line) => getComputedStyle(line).color));
    expect(new Set(sectionTitleColors).size).toBe(2);

    const articleTitleColors = await articleTitleLines.evaluateAll((lines) => (
      lines.map((line) => getComputedStyle(line).color)
    ));
    for (let lineIndex = 0; lineIndex < articleTitleColors.length; lineIndex += 2) {
      expect(articleTitleColors[lineIndex]).not.toBe(
        articleTitleColors[lineIndex + 1],
      );
    }
    await expect(section).toContainText(
      "Konkrétní čísla, souvislosti a rozhodnutí, na kterých ukazuji, proč stejné řešení nemůže fungovat každému.",
    );
    await expect(section.getByText("Případy & rozhodnutí", { exact: true }))
      .toBeVisible();
    await expect(section.getByRole("link", {
      name: "Procházet všechny články",
    })).toHaveAttribute("href", "/clanky/");
    await expect(section).not.toHaveAttribute("data-cursor-rest");

    await expect(articles).toHaveCount(3);
    await expect(section.locator("[data-article-navigation]")).toHaveCount(3);
    expect(await articles.evaluateAll((items) => items.map((item) => (
      item.getAttribute("data-home-article")
    )))).toEqual(articleLinks.map(({ slug }) => slug));
    await expect(section.locator('[data-home-article-featured="true"]'))
      .toHaveCount(1);
    const articleIndexes = section.locator("[data-home-article-index]");
    await expect(articleIndexes).toHaveCount(3);
    expect(await articleIndexes.allTextContents()).toEqual(["01", "02", "03"]);
    expect(await articleIndexes.evaluateAll((indexes) => indexes.map((index) => ({
      insideMeta: index.parentElement?.hasAttribute("data-home-article-meta"),
      position: getComputedStyle(index).position,
    })))).toEqual([
      { insideMeta: true, position: "static" },
      { insideMeta: true, position: "static" },
      { insideMeta: true, position: "static" },
    ]);
    const articleMedia = section.locator("[data-home-article-media]");
    await expect(articleMedia).toHaveCount(3);
    expect(await articleMedia.evaluateAll((items) => items.every((item) => (
      !item.hasAttribute("data-cursor")
    )))).toBe(true);
    const articleActions = section.locator("[data-home-article-action]");
    await expect(articleActions).toHaveCount(3);
    expect(await articleActions.evaluateAll((items) => items.map((item) => ({
      cursor: item.getAttribute("data-cursor"),
      magnetic: item.getAttribute("data-cursor-magnetic"),
      text: item.textContent?.trim(),
    })))).toEqual(Array.from({ length: 3 }, () => ({
      cursor: "article",
      magnetic: "true",
      text: "Číst článek",
    })));
    await expect(section.locator("[data-home-article-media] img")).toHaveCount(3);
    await expect(section.locator(
      "[data-home-article-media] span, [data-home-article-media] p",
    )).toHaveCount(0);
    await expect(section.locator("[data-home-article-meta-divider]"))
      .toHaveCount(3);
    await expect(section.locator("[data-home-article-meta]"))
      .toHaveCount(3);
    await expect(section.locator("[data-home-article-media] img").nth(0))
      .toHaveAttribute("alt", /Titulní fotografie k článku Končí vám fixace/u);
    await expect(section.locator("[data-home-article-media] img").nth(1))
      .toHaveAttribute("alt", /Titulní fotografie k článku Chcete investovat/u);
    await expect(section.locator("[data-home-article-media] img").nth(2))
      .toHaveAttribute(
        "alt",
        /Titulní fotografie k článku Chrání vaše pojištění/u,
      );

    for (const article of articleLinks) {
      await expect(section.getByRole("link", {
        name: article.name,
      })).toHaveAttribute("href", article.href);
    }
    for (const href of [
      ...articleLinks.map((article) => article.href),
      "/clanky/",
    ]) {
      expect((await page.request.get(href)).ok()).toBe(true);
    }

    await expect(section.getByRole("searchbox")).toHaveCount(0);
    await expect(section.getByRole("button")).toHaveCount(0);
    await expect(section.locator("output")).toHaveCount(0);
    await expect(section).not.toContainText("Vybrané čtení");
    await expect(section).not.toContainText("01 / 03");
    await expect(section).not.toContainText("Témata");

    const imageSources = await section
      .locator("[data-home-article-media] img")
      .evaluateAll((images) => images.map((image) => (
        (image as HTMLImageElement).getAttribute("src")
      )));
    expect(new Set(imageSources).size).toBe(3);

    const editorialGeometry = await section.evaluate((element) => {
      const header = element.querySelector<HTMLElement>("header")!;
      const heading = header.querySelector<HTMLElement>("h2")!;
      const description = header.querySelector<HTMLElement>("p")!;
      const cards = Array.from(
        element.querySelectorAll<HTMLElement>("[data-home-article]"),
        (article) => article.getBoundingClientRect(),
      );
      const archiveLink = element.querySelector<HTMLElement>(
        "[data-home-articles-footer] a",
      )!.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const descriptionRect = description.getBoundingClientRect();

      return {
        cardsBottom: Math.max(...cards.map(({ bottom }) => bottom)),
        descriptionLeft: descriptionRect.left,
        descriptionCenter:
          descriptionRect.left + descriptionRect.width / 2,
        headerCenter: headerRect.left + headerRect.width / 2,
        headingLeft: heading.getBoundingClientRect().left,
        headingFontSize: Number.parseFloat(
          getComputedStyle(heading).fontSize,
        ),
        linkTop: archiveLink.top,
      };
    });
    expect(editorialGeometry.headingFontSize).toBeGreaterThan(60);
    expect(editorialGeometry.descriptionCenter).toBeGreaterThan(
      editorialGeometry.headerCenter,
    );
    expect(editorialGeometry.descriptionLeft).toBeGreaterThan(
      editorialGeometry.headingLeft,
    );
    expect(editorialGeometry.linkTop).toBeGreaterThan(
      editorialGeometry.cardsBottom,
    );

    const visualDetails = await section.evaluate((element) => {
      const articles = Array.from(
        element.querySelectorAll<HTMLElement>("[data-home-article]"),
      );

      return {
        backgroundImage: getComputedStyle(element).backgroundImage,
        contentFitsArticles: articles.every((article) => {
          const copy = article.querySelector<HTMLElement>(
            "[data-home-article-copy-reveal]",
          );
          return Boolean(
            copy
            && copy.getBoundingClientRect().bottom
              <= article.getBoundingClientRect().bottom + 1,
          );
        }),
        dividers: Array.from(
          element.querySelectorAll<HTMLElement>(
            "[data-home-article-meta-divider]",
          ),
          (divider) => {
            const rect = divider.getBoundingClientRect();

            return {
              height: rect.height,
              width: rect.width,
            };
          },
        ),
        radii: Array.from(
          element.querySelectorAll<HTMLElement>("[data-home-article-media]"),
          (media) => Number.parseFloat(getComputedStyle(media).borderRadius),
        ),
      };
    });
    expect(visualDetails.backgroundImage).toContain("radial-gradient");
    expect(visualDetails.contentFitsArticles).toBe(true);
    expect(visualDetails.radii).toEqual([0, 0, 0]);
    expect(visualDetails.dividers.every(({ height, width }) => (
      height >= 10 && width === 1
    ))).toBe(true);

    const accessibility = await new AxeBuilder({ page })
      .include('[data-home-module="insights"]')
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("keeps the asymmetric editorial hierarchy across breakpoints", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const section = page.locator('[data-home-module="insights"]');

    for (const viewport of [
      { width: 1440, height: 1000, layout: "editorial" },
      { width: 1024, height: 900, layout: "tablet" },
      { width: 768, height: 1024, layout: "tablet" },
      { width: 390, height: 844, layout: "mobile" },
    ] as const) {
      await page.setViewportSize(viewport);
      await section.scrollIntoViewIfNeeded();

      const geometry = await section.evaluate((element) => {
        const articles = Array.from(
          element.querySelectorAll<HTMLElement>("[data-home-article]"),
          (article) => article.getBoundingClientRect(),
        );
        const media = Array.from(
          element.querySelectorAll<HTMLElement>("[data-home-article-media]"),
          (item) => item.getBoundingClientRect(),
        );
        const mediaRadii = Array.from(
          element.querySelectorAll<HTMLElement>("[data-home-article-media]"),
          (item) => getComputedStyle(item).borderRadius,
        );
        return {
          articles,
          roles: Array.from(
            element.querySelectorAll<HTMLElement>("[data-home-article]"),
            (article) => article.dataset.homeArticleRole,
          ),
          media,
          mediaRadii,
          overflow:
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        };
      });

      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(geometry.media.every(({ height, width }) => (
        height > 0 && width > 0
      ))).toBe(true);
      expect(geometry.mediaRadii).toEqual(["0px", "0px", "0px"]);
      expect(geometry.roles).toEqual(["primary", "secondary", "secondary"]);

      if (viewport.layout === "editorial") {
        expect(Math.abs(
          geometry.articles[0].top - geometry.articles[1].top,
        )).toBeLessThanOrEqual(1);
        expect(geometry.articles[0].width).toBeGreaterThan(
          geometry.articles[1].width * 1.5,
        );
        expect(Math.abs(
          geometry.articles[1].left - geometry.articles[2].left,
        )).toBeLessThanOrEqual(1);
        expect(geometry.articles[2].top).toBeGreaterThanOrEqual(
          geometry.articles[1].bottom,
        );
        expect(geometry.media[1].width).toBeGreaterThan(
          geometry.articles[1].width * 0.9,
        );
      } else if (viewport.layout === "tablet") {
        expect(geometry.articles[1].top).toBeGreaterThanOrEqual(
          geometry.articles[0].bottom,
        );
        expect(Math.abs(
          geometry.articles[1].top - geometry.articles[2].top,
        )).toBeLessThanOrEqual(1);
        expect(Math.abs(
          geometry.articles[2].width - geometry.articles[1].width,
        )).toBeLessThanOrEqual(1);
      } else {
        expect(geometry.articles[1].top).toBeGreaterThanOrEqual(
          geometry.articles[0].bottom,
        );
        expect(geometry.articles[2].top).toBeGreaterThanOrEqual(
          geometry.articles[1].bottom,
        );
      }
    }
  });

  test("provides calm hover, focus, and reduced-motion states", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });

    const firstLink = page.getByRole("link", { name: articleLinks[0].name });
    const firstMedia = firstLink.locator("[data-home-article-media]");
    const firstImage = firstLink.locator("img");
    const firstTitle = firstLink.locator("h3");

    await firstLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await firstMedia.hover();
    await expect.poll(async () => firstImage.evaluate((image) => (
      new DOMMatrixReadOnly(getComputedStyle(image).transform).a
    ))).toBeGreaterThan(1.01);
    await expect.poll(async () => firstTitle.evaluate((title) => (
      new DOMMatrixReadOnly(getComputedStyle(title, "::after").transform).a
    ))).toBeGreaterThan(0.95);

    await firstLink.focus();
    await expect(firstLink).toHaveCSS("outline-style", "solid");
    await expect(firstLink).toHaveCSS("outline-width", "2px");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    const reducedLink = page.getByRole("link", { name: articleLinks[0].name });
    const reducedImage = reducedLink.locator("img");
    await reducedLink.hover();
    await expect(reducedImage).toHaveCSS("transition-duration", "0s");
    await expect(reducedImage).toHaveCSS("transform", "none");
  });
});
