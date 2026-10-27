import { expect, test } from "@playwright/test";

test("hero review portraits decode sharply within a 64 KiB transfer budget", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const portraits = page.locator("[data-hero-client-photo]");
  await expect(portraits).toHaveCount(3);
  await expect(portraits.first()).toBeVisible();

  const media = await portraits.evaluateAll(async (elements) => (
    Promise.all(elements.map(async (element) => {
      const image = element as HTMLImageElement;
      await image.decode();
      return {
        src: image.currentSrc,
        renderedWidth: image.getBoundingClientRect().width,
        naturalWidth: image.naturalWidth,
      };
    }))
  ));

  let totalBytes = 0;
  for (const portrait of media) {
    expect(portrait.naturalWidth).toBeGreaterThanOrEqual(portrait.renderedWidth * 2);
    const response = await request.get(portrait.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/^image\//u);
    totalBytes += (await response.body()).byteLength;
  }
  expect(totalBytes).toBeLessThanOrEqual(64 * 1024);
});
