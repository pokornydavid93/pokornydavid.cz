import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const path = "/test-jednoho-prijmu/";

test.beforeEach(async ({ page }) => {
  // Explicit API mocks registered by individual tests take precedence.
  // Never let a browser test send a real inquiry or analytics POST.
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
});

async function openTest(page: Page) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Utáhnete hypotéku i z jedné výplaty?");
  await expect(page.locator("[data-income-test-ready]")).toHaveAttribute("data-income-test-ready", "true");
  const reject = page.getByRole("button", { name: /^(Nesouhlasím|Ne, díky)$/u });
  if (await reject.isVisible()) await reject.click();
}

async function calculate(page: Page, incomeA = "45000", incomeB = "35000", options: {
  mortgagePayment?: string; essentialCosts?: string; reserve?: string; targetMonths?: 3 | 6 | 12;
} = {}) {
  await page.getByLabel("Čistý příjem A", { exact: true }).fill(incomeA);
  await page.getByLabel("Čistý příjem B", { exact: true }).fill(incomeB);
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
  await page.getByLabel("Měsíční splátka hypotéky", { exact: true }).fill(options.mortgagePayment ?? "25000");
  await page.getByLabel("Ostatní nutné výdaje a závazky", { exact: true }).fill(options.essentialCosts ?? "25000");
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
  await page.getByLabel("Dostupná finanční rezerva", { exact: true }).fill(options.reserve ?? "60000");
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByRole("button", { name: "Zobrazit můj výsledek", exact: true }).click();
  await expect(page.locator("#income-result-title")).toBeFocused();
  const horizon = page.getByRole("group", { name: "Období pro porovnání", exact: true });
  await expect(horizon.getByRole("radio", { name: "6 měsíců", exact: true })).toBeChecked();
  if (options.targetMonths && options.targetMonths !== 6) {
    const months = options.targetMonths;
    await horizon.getByRole("radio", { name: `${months} ${months === 3 ? "měsíce" : "měsíců"}`, exact: true }).check();
  }
}

async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).include("[data-income-test-page]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
}

async function advisorAndFooter(page: Page) {
  const portrait = page.locator('img[src*="david-profile-cutout.webp"]');
  await expect(portrait).toHaveCount(1);
  await portrait.scrollIntoViewIfNeeded();
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('[data-component="site-footer"]')).toContainText(/IČO\s+09016236/u);
}

test("early conversation is available on mobile from every step without validating or losing the draft", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await openTest(page);

  async function openAndReturn(triggerId: string, capture = false) {
    const trigger = page.locator(`#${triggerId}`);
    await expect(trigger).toHaveText("Probrat moji situaci");
    await expect(trigger).toHaveAttribute("type", "button");
    await expect(trigger).toBeEnabled();
    await trigger.scrollIntoViewIfNeeded();
    const bounds = await trigger.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Proberme vaši situaci.");
    const contact = page.locator("#income-contact");
    await expect(contact.getByRole("heading", { name: "Probrat moji situaci", exact: true })).toBeFocused();
    await expect(contact.getByLabel("Jméno a příjmení", { exact: true })).toBeInViewport();
    await expect(page.locator("[data-income-test-result]")).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
    if (capture) {
      await accessible(page);
      await page.screenshot({ path: testInfo.outputPath("early-contact-390.png"), fullPage: true });
    }
    await contact.getByRole("button", { name: "Zpět k testu", exact: true }).click();
    await expect(page.locator(`#${triggerId}`)).toBeFocused();
    await expect(page.locator("#income-contact")).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  }

  await openAndReturn("income-early-callback-action", true);
  await expect(page.getByLabel("Čistý příjem A", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Čistý příjem B", { exact: true })).toHaveValue("");
  await page.getByLabel("Čistý příjem A", { exact: true }).fill("42000");
  await page.getByLabel("Čistý příjem B", { exact: true }).fill("zatím nevím");
  await openAndReturn("income-step-callback-action");
  await expect(page.getByLabel("Čistý příjem A", { exact: true })).toHaveValue(/^42\s000$/u);
  await expect(page.getByLabel("Čistý příjem B", { exact: true })).toHaveValue("zatím nevím");

  await page.getByLabel("Čistý příjem B", { exact: true }).fill("31000");
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
  await page.getByLabel("Měsíční splátka hypotéky", { exact: true }).fill("18500");
  await openAndReturn("income-step-callback-action");
  await expect(page.getByLabel("Měsíční splátka hypotéky", { exact: true })).toHaveValue(/^18\s500$/u);
  await expect(page.getByLabel("Ostatní nutné výdaje a závazky", { exact: true })).toHaveValue("");
  await page.getByLabel("Ostatní nutné výdaje a závazky", { exact: true }).fill("21500");
  await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
  await page.getByLabel("Dostupná finanční rezerva", { exact: true }).fill("?");
  await openAndReturn("income-step-callback-action");
  await expect(page.getByLabel("Dostupná finanční rezerva", { exact: true })).toHaveValue("?");
  expect(posts).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("an early callback requires contact details and retries without sending unfinished financial values", async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/income-test/", async (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return route.abort("failed");
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      status: "accepted", receiptId: "early-callback-test-only", intent: "callback", delivery: "queued",
    }) });
  });
  await openTest(page);
  await page.getByLabel("Čistý příjem A", { exact: true }).fill("42000");
  await page.getByLabel("Čistý příjem B", { exact: true }).fill("nevím");
  await page.locator("#income-step-callback-action").click();
  const contact = page.locator("#income-contact");
  await contact.getByRole("button", { name: "Požádat o zavolání", exact: true }).click();
  await expect(contact.getByLabel("Jméno a příjmení", { exact: true })).toBeFocused();
  expect(requests).toHaveLength(0);
  await contact.getByLabel("Jméno a příjmení", { exact: true }).fill("Testovací návštěvník");
  await contact.getByLabel("E-mail", { exact: true }).fill("early@example.test");
  await contact.getByRole("button", { name: "Požádat o zavolání", exact: true }).click();
  await expect(contact.getByLabel("Telefon", { exact: true })).toBeFocused();
  expect(requests).toHaveLength(0);
  await contact.getByLabel("Telefon", { exact: true }).fill("+420 777 111 222");
  await contact.getByRole("button", { name: "Požádat o zavolání", exact: true }).click();
  await expect(contact.getByRole("alert")).toContainText("nepodařilo potvrdit");
  await expect(contact.getByRole("alert")).not.toContainText("Výsledek");
  await expect(contact.getByLabel("E-mail", { exact: true })).toHaveValue("early@example.test");
  await contact.getByRole("button", { name: "Požádat o zavolání", exact: true }).click();
  await expect(contact.getByRole("status")).toContainText("Děkuji za zprávu.");
  await expect(contact.getByRole("status")).toContainText("probrali vaši situaci");
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).toMatchObject({ intent: "callback", name: "Testovací návštěvník", email: "early@example.test", phone: "+420 777 111 222" });
  expect(requests[0]).not.toHaveProperty("calculation");
  expect(JSON.stringify(requests[0])).not.toMatch(/incomeA|incomeB|mortgagePayment|essentialCosts|reserve|targetMonths|remainingIncome/u);
  await contact.getByRole("button", { name: "Zpět k testu", exact: true }).click();
  await expect(page.locator("#income-step-callback-action")).toBeFocused();
  await expect(page.getByLabel("Čistý příjem A", { exact: true })).toHaveValue(/^42\s000$/u);
  await expect(page.getByLabel("Čistý příjem B", { exact: true })).toHaveValue("nevím");
  await expect(page.locator("[data-income-test-result]")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, location.href])))
    .not.toMatch(/early@example|777|incomeA|42000/u);
});

test("the result starts at six months and changing its horizon updates the gap without changing reserve duration", async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/income-test/", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      status: "accepted", receiptId: "horizon-test-only", intent: "email_result", delivery: "queued",
    }) });
  });
  await openTest(page);
  await calculate(page);
  const horizon = page.getByRole("group", { name: "Období pro porovnání", exact: true });
  const a = page.locator('[data-income-scenario="A"]');
  const b = page.locator('[data-income-scenario="B"]');
  await expect(a).toContainText(/30\s000 Kč/u);
  const threeMonths = horizon.getByRole("radio", { name: "3 měsíce", exact: true });
  await threeMonths.check();
  await expect(threeMonths).toBeFocused();
  await expect(page.locator("#income-result-title")).toHaveText("Rezerva pokryje zvolené období.");
  await expect(a.getByText("Rezerva na 3 měsíce", { exact: true }).locator(".."))
    .toContainText(/45\s000 Kč/u);
  await expect(a.getByText("K této rezervě chybí", { exact: true }).locator(".."))
    .toContainText(/\b0 Kč/u);
  await expect(a.locator("strong")).toHaveText("4");
  await expect(b.locator("strong")).toHaveText("12");
  await page.getByRole("button", { name: "Domluvit úvodní hovor", exact: true }).click();
  await expect(page.locator("#income-contact")).toBeVisible();
  const twelveMonths = horizon.getByRole("radio", { name: "12 měsíců", exact: true });
  await twelveMonths.check();
  await expect(twelveMonths).toBeFocused();
  await expect(page.locator("#income-contact")).toHaveCount(0);
  await expect(page.locator("#income-result-title")).toHaveText("Rezerva nepokryje celé zvolené období.");
  await expect(a.getByText("Rezerva na 12 měsíců", { exact: true }).locator(".."))
    .toContainText(/180\s000 Kč/u);
  await expect(a.getByText("K této rezervě chybí", { exact: true }).locator(".."))
    .toContainText(/120\s000 Kč/u);
  await expect(a.locator("strong")).toHaveText("4");
  await expect(b.locator("strong")).toHaveText("12");
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Poslat výsledek e-mailem", exact: true }).click();
  const contact = page.locator("#income-contact");
  await contact.getByLabel("Jméno a příjmení", { exact: true }).fill("Testovací návštěvník");
  await contact.getByLabel("E-mail", { exact: true }).fill("horizon@example.test");
  await contact.getByRole("button", { name: "Poslat výsledek e-mailem", exact: true }).click();
  await expect(contact.getByRole("status")).toContainText("Děkuji, žádost o výsledek jsem přijal.");
  expect(requests).toHaveLength(1);
  expect(requests[0].calculation).toMatchObject({ targetMonths: 12, reserve: 60000 });
});

for (const width of [390, 768, 1440, 1920]) {
  test(`calculator at ${width}px shows both scenarios without submitting or storing financial data`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1080 });
    if (width === 390) await page.emulateMedia({ reducedMotion: "reduce" });
    const posts: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") {
        posts.push(route.request().url());
        await route.abort();
      } else await route.continue();
    });
    await openTest(page);
    await advisorAndFooter(page);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`intro-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Pokračovat", exact: true }).click();
    await expect(page.getByLabel("Čistý příjem A", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Čistý příjem A", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await calculate(page);
    const resultContactAction = page.locator("#income-result-callback-action");
    await expect(resultContactAction).toHaveAccessibleName("Probrat můj výsledek");
    await expect(resultContactAction).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: testInfo.outputPath(`result-first-viewport-${width}.png`) });
    await resultContactAction.focus();
    await page.keyboard.press("Enter");
    const resultContact = page.locator("#income-contact");
    await expect(resultContact.getByRole("heading", { name: "Domluvit úvodní hovor", exact: true })).toBeFocused();
    await expect(resultContact.getByLabel("Jméno a příjmení", { exact: true })).toBeInViewport();
    await expect(page.locator("[data-income-test-result]")).toBeVisible();
    await expect(page.locator("[data-income-early-contact]")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Období pro porovnání", exact: true })
      .getByRole("radio", { name: "6 měsíců", exact: true })).toBeChecked();
    await page.screenshot({ path: testInfo.outputPath(`result-contact-${width}.png`) });
    await resultContact.getByRole("button", { name: "Zavřít formulář", exact: true }).click();
    await expect(resultContactAction).toBeFocused();
    await expect(resultContactAction).toBeInViewport({ ratio: 1 });
    const a = page.locator('[data-income-scenario="A"]');
    const b = page.locator('[data-income-scenario="B"]');
    await expect(a).toContainText(/15\s000 Kč/u);
    await expect(a).toContainText(/30\s000 Kč/u);
    await expect(a.locator("strong")).toHaveText("4");
    await expect(b.locator("strong")).toHaveText("12");
    await expect(page.locator("#income-contact")).toHaveCount(0);
    expect(posts).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const stored = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, location.href]));
    expect(stored).not.toMatch(/incomeA|incomeB|mortgagePayment|45000|35000|60000/u);
    await advisorAndFooter(page);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`result-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Domluvit úvodní hovor", exact: true }).click();
    await expect(page.locator("#income-contact-title")).toBeFocused();
    const headingBounds = await page.locator("#income-contact-title").boundingBox();
    expect(headingBounds?.y).toBeGreaterThanOrEqual(0);
    expect(headingBounds?.y).toBeLessThan(160);
    await expect(page.getByLabel("Jméno a příjmení", { exact: true })).toBeInViewport();
    await page.getByRole("button", { name: "Zavřít formulář", exact: true }).click();
    await expect(page.locator("#income-callback-action")).toBeFocused();
    for (const href of ["mailto:info@pokornydavid.cz", "tel:+420731830897"]) {
      const contactLink = page.locator(`[data-component="site-footer"] a[href="${href}"]`);
      const bounds = await contactLink.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    expect(posts).toEqual([]);
  });
}

test("without JavaScript the calculator cannot submit financial values to a URL or server", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${test.info().project.use.baseURL}${path}`);
    await expect(page.getByLabel("Čistý příjem A", { exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Pokračovat", exact: true })).toBeDisabled();
    expect(new URL(page.url()).search).toBe("");
    // Chromium's script-disabled context can expose an empty noscript locator;
    // assert the server fallback as well as genuinely disabled browser controls.
    expect(await response?.text()).toMatch(/<noscript>[^]*?JavaScript[^]*?<\/noscript>/u);
  } finally { await context.close(); }
});

test("adjustments recompute independent scenarios; changing original income stays valid", async ({ page }) => {
  await openTest(page);
  await calculate(page);
  await page.getByText("Vyzkoušet jinou variantu", { exact: true }).click();
  await page.getByLabel("Kolik by zůstalo z příjmu A", { exact: true }).fill("20000");
  await page.getByRole("button", { name: "Přepočítat varianty", exact: true }).click();
  await expect(page.locator('[data-income-scenario="A"]')).toContainText("Bez měsíčního schodku");
  await expect(page.locator('[data-income-scenario="A"] strong')).toHaveText(/^5\s000\sKč$/u);
  await expect(page.locator('[data-income-scenario="A"]').getByRole("img")).toHaveCount(0);
  await expect(page.locator('[data-income-scenario="B"] strong')).toHaveText("12");
  await page.getByRole("button", { name: "Upravit všechny údaje", exact: true }).click();
  await calculate(page, "10000", "35000");
  await expect(page.locator('[data-income-scenario="A"] h3')).toHaveText("Vypadne příjem A");
});

test("a budget covered by either income shows monthly balances and invites a conversation before adjustments", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const posts: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      posts.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  await openTest(page);
  await calculate(page, "30000", "25000", {
    mortgagePayment: "16000", essentialCosts: "6000", reserve: "20000", targetMonths: 12,
  });
  await expect(page.locator("#income-result-title")).toHaveText("V obou variantách výdaje pokryjete.");
  const a = page.locator('[data-income-scenario="A"]');
  const b = page.locator('[data-income-scenario="B"]');
  await expect(a.locator("strong")).toHaveText(/^3\s000\sKč$/u);
  await expect(b.locator("strong")).toHaveText(/^8\s000\sKč$/u);
  for (const scenario of [a, b]) {
    await expect(scenario).toContainText("Měsíčně vám zbývá");
    await expect(scenario).toContainText("Bez měsíčního schodku");
    await expect(scenario.getByRole("img")).toHaveCount(0);
    await expect(scenario.getByText(/^Rezerva na /u)).toHaveCount(0);
    await expect(scenario.getByText("K této rezervě chybí", { exact: true })).toHaveCount(0);
  }
  const consultation = page.locator("[data-income-consultation]");
  await expect(consultation.getByRole("heading", { level: 2 })).toHaveText("Projděme váš výsledek společně.");
  const invite = consultation.getByRole("button", { name: "Domluvit úvodní hovor", exact: true });
  await expect(invite).toBeVisible();
  await expect(page.locator("#income-contact")).toHaveCount(0);
  await advisorAndFooter(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    const [inviteBox, adjustmentsBox] = await Promise.all([
      invite.boundingBox(),
      page.getByText("Vyzkoušet jinou variantu", { exact: true }).boundingBox(),
    ]);
    expect(inviteBox).not.toBeNull();
    expect(adjustmentsBox).not.toBeNull();
    expect(inviteBox!.y + inviteBox!.height).toBeLessThan(adjustmentsBox!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`no-deficit-${width}.png`), fullPage: true });
  }
  expect(posts).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, location.href])))
    .not.toMatch(/incomeA|incomeB|mortgagePayment|30000|25000|16000|20000/u);
});

test("explicit email and callback actions have different payloads; a lost response retries the same request", async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/income-test/", async (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return route.abort("failed");
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      status: "accepted", receiptId: "42b8b4e7-53a5-41ea-aab9-6e78e250d720", intent: requests.at(-1)?.intent, delivery: "queued",
    }) });
  });
  await openTest(page);
  await calculate(page);
  await page.getByRole("button", { name: "Poslat výsledek e-mailem", exact: true }).click();
  const contact = page.locator("#income-contact");
  await expect(contact.getByLabel("Telefon", { exact: true })).toHaveCount(0);
  await contact.getByLabel("Jméno a příjmení").fill("Testovací návštěvník");
  await contact.getByLabel("E-mail", { exact: true }).fill("visitor@example.test");
  await contact.getByRole("button", { name: "Poslat výsledek e-mailem", exact: true }).click();
  await expect(contact.getByRole("alert")).toContainText("nepodařilo potvrdit");
  await contact.getByRole("button", { name: "Poslat výsledek e-mailem", exact: true }).click();
  await expect(contact.getByRole("status")).toContainText("Děkuji, žádost o výsledek jsem přijal.");
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).not.toHaveProperty("phone");
  expect(requests[0].intent).toBe("email_result");
  expect(requests[0].calculation).toEqual({ incomeA: 45000, incomeB: 35000, mortgagePayment: 25000, essentialCosts: 25000, reserve: 60000, targetMonths: 6, remainingIncomeA: 0, remainingIncomeB: 0 });
  await contact.getByRole("button", { name: "Zpět k výsledku", exact: true }).click();
  await page.getByRole("button", { name: "Domluvit úvodní hovor", exact: true }).click();
  await contact.getByLabel("Jméno a příjmení").fill("Testovací návštěvník");
  await contact.getByLabel("E-mail", { exact: true }).fill("visitor@example.test");
  await contact.getByRole("button", { name: "Požádat o zavolání", exact: true }).click();
  await expect(contact.getByLabel("Telefon", { exact: true })).toBeFocused();
  expect(requests).toHaveLength(2);
  await contact.getByLabel("Telefon", { exact: true }).fill("+420 777 111 222");
  await expect(contact.getByLabel("Kdy se vám hodí zavolat")).toBeHidden();
  await contact.getByText("Doplnit čas nebo poznámku (nepovinné)", { exact: true }).click();
  await contact.getByLabel("Kdy se vám hodí zavolat").selectOption("afternoon");
  await contact.getByLabel("Co chcete doplnit").fill("Chci projít varianty pro naši domácnost.");
  await accessible(page);
  await contact.getByRole("button", { name: "Požádat o zavolání", exact: true }).click();
  await expect(contact.getByRole("status")).toContainText("Děkuji za zprávu.");
  expect(requests[2].intent).toBe("callback");
  expect(requests[2].phone).toBe("+420 777 111 222");
  expect(requests[2].preferredCallTime).toBe("afternoon");
  expect(requests[2].note).toBe("Chci projít varianty pro naši domácnost.");
  expect(requests[2].requestId).not.toBe(requests[0].requestId);
  expect(await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, location.href])))
    .not.toMatch(/visitor|777|incomeA|45000/u);
});

test("an expired retry explains recovery without silently creating a second request", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00Z"));
  let attempts = 0;
  await page.route("**/api/income-test/", async (route) => { attempts++; await route.abort("failed"); });
  await openTest(page);
  await calculate(page);
  await page.getByRole("button", { name: "Poslat výsledek e-mailem", exact: true }).click();
  const contact = page.locator("#income-contact");
  await contact.getByLabel("Jméno a příjmení").fill("Testovací návštěvník");
  await contact.getByLabel("E-mail", { exact: true }).fill("visitor@example.test");
  const submit = contact.getByRole("button", { name: "Poslat výsledek e-mailem", exact: true });
  await submit.click();
  await expect(contact.getByRole("alert")).toContainText("nepodařilo potvrdit");
  await page.clock.setFixedTime(new Date("2026-10-09T10:29:00Z"));
  await submit.click();
  await expect.poll(() => attempts).toBe(2);
  await expect(submit).toBeEnabled();
  await page.clock.setFixedTime(new Date("2026-10-09T10:31:00Z"));
  await submit.click();
  await expect(contact.getByRole("alert")).toContainText("Platnost tohoto pokusu vypršela");
  expect(attempts).toBe(2);
  await expect(page.locator("[data-income-test-result]")).toBeVisible();
});
