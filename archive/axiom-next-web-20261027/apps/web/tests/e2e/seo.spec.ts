import { expect, test } from "@playwright/test";

// Run against the production-profile build: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3108.
// JavaScript is disabled so assertions cover the HTML a crawler actually receives.
test.use({ javaScriptEnabled: false });

test("every sitemap URL serves canonical, indexable, semantic HTML and valid entity data", async ({ page, request }) => {
  test.setTimeout(180_000);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const xml = await sitemap.text();
  expect(xml).not.toContain("<changefreq>");
  expect(xml).not.toContain("<priority>");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(urls.length).toBeGreaterThan(15);
  expect(new Set(urls).size).toBe(urls.length);
  const titles = new Set<string>();
  const images = new Set<string>();
  await page.route("**/*", (route) => route.abort());

  for (const canonical of urls) {
    const url = new URL(canonical);
    expect(url.origin).toBe("https://pokornydavid.cz");
    expect(url.pathname.endsWith("/")).toBe(true);
    const response = await request.get(url.pathname, { maxRedirects: 0 });
    expect(response.status(), url.pathname).toBe(200);
    expect(response.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
    const html = await response.text();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "cs");
    await expect(page.locator("main"), url.pathname).toHaveCount(1);
    await expect(page.locator("h1"), url.pathname).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    const title = await page.title();
    expect(title.match(/David Pokorný/g)?.length, title).toBe(1);
    expect(titles.has(title), title).toBe(false);
    titles.add(title);
    const robots = await page.locator('meta[name="robots"], meta[name="googlebot"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content")).join(","));
    expect(robots).not.toContain("noindex");
    expect(robots).not.toContain("nofollow");
    expect(robots).toContain("max-image-preview:large");
    expect(await page.locator("main").innerText()).not.toHaveLength(0);
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image).toBeTruthy();
    expect(new URL(image!).pathname).not.toMatch(/\.(jpg|png|webp|avif)\/$/);
    images.add(image!);
    const entities = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.flatMap((node) => {
      const value = JSON.parse(node.textContent ?? "");
      return value["@graph"] ?? [value];
    }));
    expect(entities.some((entity) => entity["@type"] === "Person")).toBe(true);
    expect(entities.some((entity) => entity["@type"] === "WebSite")).toBe(true);
    if (/^\/clanky\/[^/]+\/$/.test(url.pathname)) {
      const article = entities.find((entity) => ["Article", "BlogPosting"].includes(entity["@type"]));
      expect(article, url.pathname).toBeTruthy();
      expect(article.author["@id"]).toBe("https://pokornydavid.cz/#person");
      expect(article.mainEntityOfPage["@id"]).toBe(`${canonical}#webpage`);
      expect(entities.find((entity) => entity["@id"] === `${canonical}#webpage`)?.url).toBe(canonical);
      expect(entities.some((entity) => entity["@type"] === "BreadcrumbList")).toBe(true);
      await expect(page.locator("main article").first()).toBeAttached();
      expect((await page.locator("main").innerText()).length).toBeGreaterThan(1000);
    }
  }
  for (const image of images) {
    const response = await request.get(new URL(image).pathname);
    expect(response.status(), image).toBe(200);
    expect(response.headers()["content-type"], image).toMatch(/^image\//);
  }
});

test("robots, permanent migrations, canonical slash, missing pages and funnel exclusion", async ({ page, request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toContain("User-Agent: *");
  expect(text).toContain("Allow: /");
  expect(text).toContain("Sitemap: https://pokornydavid.cz/sitemap.xml");
  expect(text).not.toMatch(/^Disallow: \/\s*$/m);
  for (const [from, to] of [["/blog/", "/clanky/"], ["/blog/konec-fixace-hypoteky/", "/clanky/konec-fixace-hypoteky/"], ["/clanky", "/clanky/"]]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(new URL(response.headers().location, "https://pokornydavid.cz").pathname).toBe(to);
  }
  for (const path of ["/seo-audit-nonexistent/", "/clanky/seo-audit-nonexistent/"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
  const funnel = await request.get("/ziskat-prehled/");
  expect(funnel.status()).toBe(200);
  await page.route("**/*", (route) => route.abort());
  await page.setContent(await funnel.text(), { waitUntil: "domcontentloaded" });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("/ziskat-prehled/");
});

test("search crawlers receive the same canonical article identity and archive filters consolidate", async ({ page, request }) => {
  await page.route("**/*", (route) => route.abort());
  for (const userAgent of ["Googlebot", "OAI-SearchBot", "PerplexityBot"]) {
    const response = await request.get("/clanky/konec-fixace-hypoteky/", {
      headers: { "User-Agent": userAgent },
    });
    expect(response.status(), userAgent).toBe(200);
    expect(response.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
    await page.setContent(await response.text(), { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href", "https://pokornydavid.cz/clanky/konec-fixace-hypoteky/",
    );
    await expect(page.locator("main h1")).toHaveCount(1);
    expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(
      expect.arrayContaining([expect.stringContaining('"@type":"BlogPosting"')]),
    );
  }
  const filtered = await request.get("/clanky/?q=hypoteka&topic=bydleni");
  expect(filtered.status()).toBe(200);
  await page.setContent(await filtered.text(), { waitUntil: "domcontentloaded" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://pokornydavid.cz/clanky/");
});
