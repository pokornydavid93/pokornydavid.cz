import { expect, test } from "@playwright/test";

test.describe("public content semantics without client JavaScript", () => {
  test.use({ javaScriptEnabled: false, contextOptions: { reducedMotion: "reduce" } });

  test("homepage questions and every answer are present in the server HTML", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const faq = page.locator("[data-home-faq-accordion]");
    const questions = faq.locator("h3 > button[data-home-faq-trigger]");
    const answers = faq.locator("[data-home-faq-answer]");
    expect(await questions.count()).toBeGreaterThan(0);
    await expect(answers).toHaveCount(await questions.count());

    for (const question of await questions.all()) {
      await expect(question).not.toBeEmpty();
      const panelId = await question.getAttribute("aria-controls");
      const panel = page.locator(`[id="${panelId}"]`);
      await expect(panel).toHaveCount(1);
      await expect(panel.locator("p")).not.toBeEmpty();
      await expect(panel).toHaveAttribute("aria-labelledby", await question.getAttribute("id") ?? "");
    }
  });

  test("all service descriptions and destination links exist before opening the accordion", async ({ page }) => {
    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });

    const groups = page.locator("[data-services-accordion-item]");
    expect(await groups.count()).toBeGreaterThan(1);
    for (const group of await groups.all()) {
      await expect(group.locator("h3 button")).not.toBeEmpty();
      const services = group.locator('[role="region"] a[href]');
      expect(await services.count()).toBeGreaterThan(0);
      for (const service of await services.all()) {
        await expect(service.locator("strong")).not.toBeEmpty();
        await expect(service.locator("small")).not.toBeEmpty();
        await expect(service).toHaveAttribute("href", /^\/ziskat-prehled\//u);
      }
    }
  });

  test("sitemap articles expose their body, reading anchors and linked author in server HTML", async ({ page, request }) => {
    test.setTimeout(180_000);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const articlePaths = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/gu)]
      .map((match) => new URL(match[1]).pathname)
      .filter((pathname) => /^\/clanky\/[^/]+\/$/u.test(pathname));
    expect(articlePaths.length).toBeGreaterThan(0);

    for (const pathname of articlePaths) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main h1"), pathname).toHaveCount(1);
      await expect(page.locator('article[aria-labelledby="article-title"]'), pathname).toHaveCount(1);
      await expect(page.locator('a[rel~="author"][href="/kdo-jsem/"]'), pathname).toHaveCount(1);

      const sections = page.locator("[data-article-section]");
      expect(await sections.count(), pathname).toBeGreaterThan(0);
      await expect(page.locator("[data-article-reading-index] ol a"), pathname).toHaveCount(await sections.count());
      for (const section of await sections.all()) {
        const id = await section.getAttribute("id");
        const heading = section.locator(":scope > header h2");
        await expect(heading).not.toBeEmpty();
        await expect(page.locator(`[data-article-reading-index] a[href="#${id}"]`)).toHaveText(
          new RegExp((await heading.innerText()).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
        );
        expect((await section.locator("p, li, dd").allTextContents()).join(" ").trim().length).toBeGreaterThan(30);
      }

      for (const comparison of await page.locator('[data-article-semantic-block="comparison"]').all()) {
        const cards = comparison.locator(":scope > div[data-comparison-layout] > section");
        if (!(await cards.count())) continue;
        const level = await comparison.locator(":scope > h3").count() ? "h4" : "h3";
        await expect(cards.locator(`:scope > ${level}`)).toHaveCount(await cards.count());
      }
    }
  });

  for (const pathname of ["/sluzby/", "/kdo-jsem/", "/jak-pracuji/", "/reference/", "/osvedceni-a-certifikace/", "/pravni-informace/"]) {
    test(`skip navigation resolves to a focusable main on ${pathname}`, async ({ page }) => {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator('a[data-component="skip-link"][href="#main-content"]')).toHaveCount(1);
      const main = page.locator("main#main-content");
      await expect(main).toHaveCount(1);
      await expect(main).toHaveAttribute("tabindex", "-1");
      expect(await main.evaluate((element) => {
        element.focus();
        return document.activeElement === element;
      })).toBeTruthy();
    });
  }
});
