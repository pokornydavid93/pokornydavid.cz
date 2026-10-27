import { expect, test } from "@playwright/test";

const journeys = [
  {
    slug: "banka-vam-pujci-vic-nez-si-muzete-dovolit",
    intent: "housing",
    topic: "mortgage",
    label: "Hypotéka a bydlení",
  },
  {
    slug: "konec-fixace-hypoteky",
    intent: "housing",
    topic: "mortgage-refixation",
    label: "Konec fixace hypotéky",
  },
  {
    slug: "mate-financni-produkty-ale-mate-skutecne-financni-plan",
    intent: "overview",
    topic: "financial-plan",
    label: "Finanční plán",
  },
] as const;

for (const width of [390, 1440]) {
  for (const journey of journeys) {
    test(`article consultation context: ${journey.topic} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const posts: string[] = [];
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        if (route.request().method() === "POST") {
          posts.push(route.request().url());
          await route.abort();
        } else await route.continue();
      });
      await page.goto(`/clanky/${journey.slug}/`);
      await page.waitForLoadState("networkidle");
      const consent = page.getByRole("region", { name: "Nastavení cookies" });
      if (await consent.count()) {
        await consent.getByRole("button", { name: "Nesouhlasím", exact: true }).click();
        await expect(consent).toBeHidden();
      }

      const finalAction = page.locator('[data-article-author] a[href^="/ziskat-prehled/"]');
      await expect(finalAction).toHaveCount(1);
      await expect(finalAction).toHaveAttribute("href",
        `/ziskat-prehled/?source=article&intent=${journey.intent}&topic=${journey.topic}&cta=article-final-check`);

      if (journey.topic === "mortgage-refixation") {
        // This article has no final action or screening; the author inherits its checklist consultation.
        await expect(page.locator("#screening")).toHaveCount(0);
        await expect(page.locator('[data-article-author] h3')).toHaveCount(0);
        const inlineAction = page.locator('[data-article-semantic-block="checklist"] a[href^="/ziskat-prehled/"]');
        await expect(inlineAction).toHaveCount(1);
        await expect(inlineAction).toHaveAttribute("href",
          "/ziskat-prehled/?source=article&intent=housing&topic=mortgage-refixation&cta=quick-refixation-check");
      }

      await finalAction.click();
      await expect(page).toHaveURL(/\/ziskat-prehled\//);
      await expect(page.locator('form[data-overview-step]')).toHaveAttribute("data-overview-step", "2");
      await expect(page.locator('form input[name="intent"]')).toHaveValue(journey.intent);
      await expect(page.locator('form input[name="topic"]')).toHaveValue(journey.topic);
      await expect(page.locator('form input[name="sourceContext"]')).toHaveValue("article");
      await expect(page.locator('form input[name="sourceCta"]')).toHaveValue("article-final-check");
      await expect(page.getByText(journey.label, { exact: true })).toBeVisible();
      expect(posts).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
