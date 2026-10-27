import { expect, test, type Locator, type Page } from "@playwright/test";

const articlePath = "/clanky/zdrazilo-vam-pojisteni/";
const cursorFor = (page: Page) => page.locator("[data-custom-cursor]");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-09-13-web-privacy-v2",
    }));
  });
});

async function centerTarget(target: Locator) {
  await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const top = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
    if (window.__lenis?.scrollTo) {
      window.__lenis.scrollTo(top, { force: true, immediate: true });
    } else {
      window.scrollTo({ top, behavior: "instant" });
    }
  });
}

async function expectCustomHand(page: Page, target: Locator) {
  await cursorFor(page).waitFor({ state: "attached" });
  // Start each assertion with a real pointer transition, including immediately
  // after a route mount or a scroll that revealed a target under the pointer.
  await page.mouse.move(1, 1);
  await target.hover();
  const cursor = cursorFor(page);
  await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
  await expect(cursor).toHaveAttribute("data-cursor-visible", "true");
  await expect(cursor.locator("[data-cursor-click-hand]")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/custom-cursor-ready/u);
  await expect(target).toHaveCSS("cursor", "none");
}

async function clickAtCenter(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("Click target did not have a layout box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function expectStationaryControl(page: Page, target: Locator) {
  const before = await target.boundingBox();
  await expectCustomHand(page, target);
  const cursor = cursorFor(page);
  await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
  await expect(cursor).toHaveAttribute("data-cursor-locked", "false");
  await expect(target).not.toHaveAttribute("data-cursor-magnetic-active", "true");
  await expect(target.locator("[data-cursor-interaction-zone]")).toHaveCount(0);
  await expect.poll(async () => {
    const after = await target.boundingBox();
    if (!before || !after) return Number.POSITIVE_INFINITY;
    return Math.max(Math.abs(after.x - before.x), Math.abs(after.y - before.y));
  }).toBeLessThanOrEqual(0.25);
}

async function addControlFixture(page: Page) {
  await page.evaluate(() => {
    const panel = document.createElement("form");
    panel.id = "cursor-control-fixture";
    panel.dataset.cursorSurface = "light";
    panel.style.cssText = "position:fixed;left:24px;top:150px;z-index:20000;width:380px;padding:20px;background:#f6f4e8;color:#173a1a;display:grid;gap:14px";
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px">
        <input id="cursor-checkbox" type="checkbox" style="width:24px;height:24px">
        <label id="cursor-checkbox-label" for="cursor-checkbox"><span>Associated checkbox label</span></label>
      </div>
      <label id="cursor-wrapping-label" style="display:flex;align-items:center;gap:16px">
        <input id="cursor-wrapping-checkbox" type="checkbox" style="width:24px;height:24px">
        <span>Wrapping checkbox label</span>
      </label>
      <div style="display:flex;align-items:center;gap:16px">
        <input id="cursor-radio" name="fixture-radio" type="radio" style="width:24px;height:24px">
        <label id="cursor-radio-label" for="cursor-radio">Associated radio label</label>
      </div>
      <input id="cursor-input-button" type="button" value="Input button" style="height:40px">
      <div style="display:flex;align-items:center;gap:16px">
        <input id="cursor-disabled-checkbox" type="checkbox" disabled style="width:24px;height:24px">
        <label id="cursor-disabled-label" for="cursor-disabled-checkbox">Disabled checkbox label</label>
      </div>
      <fieldset disabled style="padding:8px">
        <legend>Disabled fieldset</legend>
        <label id="cursor-fieldset-label" style="display:flex;align-items:center;gap:16px">
          <input id="cursor-fieldset-checkbox" type="checkbox" style="width:24px;height:24px">
          <span>Disabled fieldset label</span>
          <a id="cursor-nested-link" href="#cursor-fixture-link">Details</a>
        </label>
      </fieldset>
      <label id="cursor-active-nested-label" style="display:flex;align-items:center;gap:16px">
        <input id="cursor-active-nested-checkbox" type="checkbox" style="width:24px;height:24px">
        <span>Active label</span>
        <a id="cursor-active-nested-link" href="#cursor-fixture-link">Details</a>
      </label>
      <input id="cursor-text" type="text" placeholder="Native text editing" style="height:36px">
      <select id="cursor-select" style="height:36px"><option>Native option</option></select>
      <div contenteditable="" id="cursor-editable"><span>Editable descendant</span></div>
      <div contenteditable="plaintext-only" id="cursor-plaintext"><span>Plain text descendant</span></div>
    `;
    panel.addEventListener("submit", (event) => event.preventDefault());
    panel.addEventListener("change", (event) => {
      const input = event.target as HTMLInputElement;
      input.dataset.changes = String(Number(input.dataset.changes ?? 0) + 1);
    });
    panel.querySelectorAll<HTMLInputElement | HTMLAnchorElement>("input[type=button], a").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (element instanceof HTMLAnchorElement) event.preventDefault();
        element.dataset.clicks = String(Number(element.dataset.clicks ?? 0) + 1);
      });
    });
    document.body.append(panel);
  });
}

test.describe("custom cursor coverage beyond primary CTAs", () => {
  test("shows and positions the custom hand when the first pointer entry has no preceding move", async ({ page }) => {
    await page.goto("/clanky/", { waitUntil: "networkidle" });
    const cursor = cursorFor(page);
    await expect.poll(() => cursor.evaluate((element) => element.matches(":popover-open")))
      .toBe(true);
    await addControlFixture(page);
    const target = page.locator("#cursor-checkbox-label span");
    const point = await target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      element.dispatchEvent(new PointerEvent("pointerover", {
        bubbles: true,
        clientX: point.x,
        clientY: point.y,
        pointerType: "mouse",
      }));
      return point;
    });
    await expect(cursor).toHaveAttribute("data-cursor-visible", "true");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
    await expect(page.locator("html")).toHaveClass(/custom-cursor-ready/u);
    await expect.poll(() => cursor.locator("[data-cursor-dot]").evaluate((element, pointer) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
      return Math.max(Math.abs(matrix.m41 - pointer.x), Math.abs(matrix.m42 - pointer.y));
    }, point)).toBeLessThanOrEqual(0.5);
  });

  test("covers the reported article CTA label, icon and desktop reading links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(articlePath, { waitUntil: "networkidle" });

    const action = page.locator('a[data-cta-composition="docked"][href*="cta=article-inline-check"]');
    await expect(action).toHaveText("Chci zkontrolovat pojistné smlouvy");
    await centerTarget(action);
    await expectCustomHand(page, action.locator("[data-cta-label]"));
    await expectCustomHand(page, action.locator("[data-cta-icon-shell]"));

    const readingLink = page.locator("[data-article-context-rail]").getByRole("link", {
      name: /Nejdřív zkontrolovat\. Potom zaplatit\./u,
    });
    await expectCustomHand(page, readingLink);
    await readingLink.click();
    await expect.poll(() => page.evaluate(() => window.location.hash))
      .toBe("#nejdriv-zkontrolovat-potom-zaplatit");
  });

  test("uses the custom hand over related article images and preserves navigation", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(articlePath, { waitUntil: "networkidle" });
    const story = page.locator('section[aria-labelledby="related-stories-title"] a').first();
    const image = story.locator("img");
    const destination = await story.getAttribute("href");
    expect(destination).toMatch(/^\/clanky\/.+\/$/u);
    await centerTarget(image);
    await expectCustomHand(page, image);
    await image.click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`, "u"), { timeout: 30_000 });
    await expect(page.locator("[data-article-hero-headline]")).toBeVisible();
  });

  test("keeps the compact article summary stationary and toggles it once", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(articlePath, { waitUntil: "networkidle" });
    const details = page.locator("[data-article-reading-index] details");
    const summary = details.locator("summary");
    await centerTarget(summary);
    await expect(details).toHaveJSProperty("open", false);
    await expectStationaryControl(page, summary);
    await summary.click();
    await expect(details).toHaveJSProperty("open", true);
    await expectCustomHand(page, details.getByRole("link").first());
    await summary.focus();
    await summary.press("Enter");
    await expect(details).toHaveJSProperty("open", false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("supports native FAQ summaries without an enlarged click zone", async ({ page }) => {
    await page.goto("/refixace-hypoteky/", { waitUntil: "networkidle" });
    const details = page.locator("main details").first();
    const summary = details.locator("summary");
    await centerTarget(summary);
    await expectStationaryControl(page, summary);
    await summary.click();
    await expect(details).toHaveJSProperty("open", true);
    await summary.click();
    await expect(details).toHaveJSProperty("open", false);
  });

  test("covers direct inputs and associated or wrapping labels without double activation", async ({ page }) => {
    await page.goto("/clanky/", { waitUntil: "networkidle" });
    await addControlFixture(page);
    for (const selector of [
      "#cursor-checkbox", "#cursor-checkbox-label span", "#cursor-wrapping-label span",
      "#cursor-radio", "#cursor-radio-label", "#cursor-input-button",
    ]) {
      await expectStationaryControl(page, page.locator(selector));
    }
    const checkbox = page.locator("#cursor-checkbox");
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toHaveAttribute("data-changes", "1");
    await page.locator("#cursor-checkbox-label span").click();
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toHaveAttribute("data-changes", "2");
    const wrapped = page.locator("#cursor-wrapping-checkbox");
    await page.locator("#cursor-wrapping-label span").click();
    await expect(wrapped).toBeChecked();
    await expect(wrapped).toHaveAttribute("data-changes", "1");
    await page.locator("#cursor-radio-label").click();
    await expect(page.locator("#cursor-radio")).toBeChecked();
    await expect(page.locator("#cursor-radio")).toHaveAttribute("data-changes", "1");
    await page.locator("#cursor-input-button").click();
    await expect(page.locator("#cursor-input-button")).toHaveAttribute("data-clicks", "1");

    for (const selector of ["#cursor-text", "#cursor-select", "#cursor-editable span", "#cursor-plaintext span"]) {
      await page.locator(selector).hover();
      await expect(cursorFor(page)).toHaveAttribute("data-cursor-visible", "false");
      await expect(page.locator("html")).not.toHaveClass(/custom-cursor-ready/u);
    }
    await expect(page.locator("#cursor-text")).toHaveCSS("cursor", "text");
  });

  test("keeps disabled inputs and their labels passive while nested links keep their own action", async ({ page }) => {
    await page.goto("/clanky/", { waitUntil: "networkidle" });
    await addControlFixture(page);
    for (const selector of [
      "#cursor-disabled-checkbox", "#cursor-disabled-label",
      "#cursor-fieldset-checkbox", "#cursor-fieldset-label span",
    ]) {
      await page.locator(selector).hover();
      await expect(cursorFor(page)).toHaveAttribute("data-cursor-icon", "arrow");
      await expect(cursorFor(page)).toHaveAttribute("data-cursor-visible", "true");
      await expect(cursorFor(page)).toHaveAttribute("data-cursor-framed", "false");
    }
    await clickAtCenter(page, page.locator("#cursor-disabled-label"));
    await expect(page.locator("#cursor-disabled-checkbox")).not.toBeChecked();
    await clickAtCenter(page, page.locator("#cursor-fieldset-label span"));
    await expect(page.locator("#cursor-fieldset-checkbox")).not.toBeChecked();
    for (const selector of ["#cursor-nested-link", "#cursor-active-nested-link"]) {
      const link = page.locator(selector);
      await expectCustomHand(page, link);
      await link.click();
      await expect(link).toHaveAttribute("data-clicks", "1");
    }
    await expect(page.locator("#cursor-active-nested-checkbox")).not.toBeChecked();
  });

  test("covers the public conversion flow and restores native text editing", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/ziskat-prehled/", { waitUntil: "networkidle" });
    const radio = page.locator('input[name="intent"][type="radio"]').first();
    const label = radio.locator("..");
    await expectStationaryControl(page, label);
    await label.click();
    await expect(radio).toBeChecked();
    const next = page.getByRole("button", { name: "Pokračovat ke kontaktu" });
    await expectCustomHand(page, next);
    await next.click();
    const phone = page.locator("#overview-phone");
    await centerTarget(phone);
    await phone.hover();
    await expect(cursorFor(page)).toHaveAttribute("data-cursor-visible", "false");
    await expect(page.locator("html")).not.toHaveClass(/custom-cursor-ready/u);
    await expect(phone).toHaveCSS("cursor", "text");
    const privacy = page.getByRole("link", { name: "Jak zpracovávám osobní údaje" });
    await centerTarget(privacy);
    await expectCustomHand(page, privacy);
    await expect(cursorFor(page)).toHaveAttribute("data-reduced-motion", "true");
    const back = page.getByRole("button", { name: "Zpět k výběru oblasti" });
    await centerTarget(back);
    await expectCustomHand(page, back);
    await page.emulateMedia({ forcedColors: "active" });
    await expect(cursorFor(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/custom-cursor-ready/u);
    await expect(privacy).toHaveCSS("cursor", "pointer");
  });

  test("keeps the compact mouse navigation drawer interactive", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/clanky/", { waitUntil: "networkidle" });
    const menu = page.getByRole("button", { name: "Otevřít menu" });
    await expectCustomHand(page, menu);
    await menu.click();
    const drawer = page.getByRole("dialog", { name: "Kam chcete pokračovat?" });
    await expect(drawer).toBeVisible();
    await expectCustomHand(page, drawer.getByRole("link").first());
    const close = drawer.getByRole("button", { name: "Zavřít menu" });
    await expectCustomHand(page, close);
    await close.click();
    await expect(drawer).toBeHidden();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
  });

  test("renders above a native modal dialog and preserves its links and close button", async ({ page }) => {
    await page.goto("/reference/", { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: "Otevřít celou zkušenost od Zuzana Smolíková" });
    await trigger.focus();
    await trigger.press("Enter");
    const dialog = page.locator("[data-review-dialog]");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("open", "");
    const source = dialog.getByRole("link", { name: "Otevřít původní Google recenzi od Zuzana Smolíková v nové kartě" });
    await expectCustomHand(page, source);
    await expect.poll(() => cursorFor(page).evaluate((element) => element.matches(":popover-open")))
      .toBe(true);
    const close = dialog.getByRole("button", { name: "Zavřít celou zkušenost" });
    await expectCustomHand(page, close);
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("falls back to a native cursor inside modal dialogs when top-layer rendering is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      for (const method of ["showPopover", "hidePopover"]) {
        Object.defineProperty(HTMLElement.prototype, method, { configurable: true, value: undefined });
      }
    });
    await page.goto("/reference/", { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: "Otevřít celou zkušenost od Zuzana Smolíková" });
    await centerTarget(trigger);
    await expectCustomHand(page, trigger);
    await trigger.click();
    const dialog = page.locator("[data-review-dialog]");
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", { name: "Zavřít celou zkušenost" });
    await close.hover();
    await expect(cursorFor(page)).toHaveAttribute("data-cursor-visible", "false");
    await expect(page.locator("html")).not.toHaveClass(/custom-cursor-ready/u);
    await expect(close).toHaveCSS("cursor", "pointer");
    await close.click();
    await expect(dialog).toBeHidden();
    await centerTarget(trigger);
    await expectCustomHand(page, trigger);
  });
});

test.describe("touch conversion cursor fallback", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("keeps the public radio choice and next step usable without a custom mouse cursor", async ({ page }) => {
    await page.goto("/ziskat-prehled/", { waitUntil: "networkidle" });
    const cookieBanner = page.getByRole("region", { name: "Nastavení cookies" });
    if (await cookieBanner.isVisible()) {
      await cookieBanner.getByRole("button", { name: "Ne, díky" }).tap();
      await expect(cookieBanner).toBeHidden();
    }
    await expect(cursorFor(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/custom-cursor-ready/u);
    const radio = page.locator('input[name="intent"][type="radio"]').first();
    await radio.locator("..").tap();
    await expect(radio).toBeChecked();
    const next = page.getByRole("button", { name: "Pokračovat ke kontaktu" });
    await centerTarget(next);
    await next.tap();
    await expect(page.locator("#overview-phone")).toBeVisible();
    await expect(cursorFor(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
