import { expect, test } from "@playwright/test";

const assignedSlugs = [
  "mate-financni-produkty-ale-mate-skutecne-financni-plan",
  "v-jakem-poradi-resit-osobni-finance",
  "kolik-ma-mit-domacnost-v-rezerve",
  "banka-vam-pujci-vic-nez-si-muzete-dovolit",
  "urokova-sazba-neni-cena-hypoteky",
  "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku",
  "cestovko-zdarma-od-karty-vas-nemusi-zachranit",
  "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou",
];
const preservedDates: Record<string, string> = {
  "chcete-investovat-zacnete-planem": "2026-06-22",
  "mate-pojisteni-prijmu-nebo-jen-pocit": "2026-06-23",
  "zdrazilo-vam-pojisteni": "2026-06-24",
  "konec-fixace-hypoteky": "2026-06-25",
};
const publications = [
  ...assignedSlugs.map((slug) => ({ slug, publishedAt: "2026-10-08", updatedAt: "2026-10-08" })),
  ...Object.entries(preservedDates).map(([slug, publishedAt]) => ({ slug, publishedAt, updatedAt: "2026-08-12" })),
];

test.use({ javaScriptEnabled: false });

test("all twelve article dates agree in visible HTML, Open Graph, JSON-LD and sitemap", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  const entries = new Map([...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/gu)]
    .map((match) => [new URL(match[1]).pathname, match[2].match(/<lastmod>([^<]+)<\/lastmod>/u)?.[1]]));
  expect(entries.get("/clanky/")).toBe("2026-10-08");
  expect([...entries.keys()].filter((path) => /^\/clanky\/[^/]+\/$/u.test(path))).toHaveLength(12);
  const evidence = [];

  for (const expected of publications) {
    const path = `/clanky/${expected.slug}/`;
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), path).toBe(200);
    const time = page.locator("main header time[datetime]").first();
    await expect(time).toHaveAttribute("datetime", expected.updatedAt);
    await expect(time).toHaveText(expected.updatedAt === "2026-10-08" ? "8. října 2026" : "12. srpna 2026");
    await expect(time).toBeVisible();
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute("content", expected.publishedAt);
    await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute("content", expected.updatedAt);
    const graph = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.flatMap((node) => {
      const value = JSON.parse(node.textContent ?? "");
      return value["@graph"] ?? [value];
    }));
    const article = graph.find((entity) => entity["@type"] === "BlogPosting");
    expect(article?.datePublished, path).toBe(expected.publishedAt);
    expect(article?.dateModified, path).toBe(expected.updatedAt);
    expect(entries.get(path), path).toBe(expected.updatedAt);
    evidence.push({ ...expected, renderedTime: await time.textContent(), lastmod: entries.get(path), schemaPublished: article.datePublished, schemaModified: article.dateModified });
  }
  await testInfo.attach("article-publication-date-consistency", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
});
