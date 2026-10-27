import { expect, test, type Page } from "@playwright/test";
import { WEB_PRIVACY_NOTICE_VERSION } from "../../lib/privacy/policy";

async function rejectOptionalAnalytics(page: Page) {
  const reject = page.getByRole("button", { name: "Ne, díky", exact: true });
  if (await reject.isVisible()) await reject.click();
}

test.beforeEach(async ({ page }) => {
  // All form POSTs are intercepted: this suite cannot submit a real lead or email.
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
});

test("article callback uses a notice and keeps screening answers out of the lead", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route(/\/api\/article-screening\/?$/u, async (route) => {
    expect(route.request().method()).toBe("POST");
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { status: "accepted", receiptId: "16cddaba-362a-4b0e-81af-5a2782759cf4" } });
  });
  await page.goto("/clanky/zdrazilo-vam-pojisteni/");
  await rejectOptionalAnalytics(page);
  const screening = page.locator("#screening");
  await screening.locator('[data-screening-action="start"]').click();
  for (let step = 0; step < 10; step++) {
    if (await screening.getAttribute("data-screening-phase") === "review") break;
    const question = screening.locator("fieldset");
    await expect(question).toBeVisible();
    await question.locator('input[type="radio"], input[type="checkbox"]').first().check();
    await screening.locator('[data-screening-action="next"]').click();
  }
  await expect(screening).toHaveAttribute("data-screening-phase", "review");
  await screening.locator('[data-screening-action="contact"]').click();

  await expect(screening.locator('input[name="consent"]')).toHaveCount(0);
  await expect(screening.locator('textarea[name="note"]')).toHaveCount(0);
  await expect(screening.locator('[aria-invalid="true"]')).toHaveCount(0);
  expect(submitted).toBeUndefined();
  await expect(screening.locator("[data-form-privacy-notice]"))
    .toHaveAttribute("data-form-privacy-notice", WEB_PRIVACY_NOTICE_VERSION);
  await expect(screening.getByRole("link", { name: "Jak zpracovávám osobní údaje" }))
    .toHaveAttribute("href", "/zasady-zpracovani-osobnich-udaju/");

  const submit = screening.locator('[data-screening-action="submit"]');
  await submit.click();
  await expect(screening.locator('input[name="name"]')).toBeFocused();
  await expect(screening.getByText("Vyplňte jméno.", { exact: true })).toBeVisible();
  expect(submitted).toBeUndefined();

  await screening.locator('input[name="name"]').fill("Test kontakt");
  await screening.locator('input[name="email"]').fill("privacy-test@example.invalid");
  await screening.locator('input[name="phone"]').fill("+420 777 123 456");
  await screening.locator('[data-screening-action="back"]').click();
  await screening.locator('[data-screening-action="contact"]').click();
  await expect(screening.locator('input[name="name"]')).toHaveValue("Test kontakt");
  await expect(screening.locator('[aria-invalid="true"]')).toHaveCount(0);
  expect(submitted).toBeUndefined();
  await submit.click();
  await expect(screening.getByRole("heading", { name: "Děkuji, ozvu se vám." })).toBeVisible();
  expect(submitted).toBeDefined();
  expect(Object.keys(submitted!).sort()).toEqual(["articleSlug", "email", "name", "phone", "privacyNoticeVersion", "requestId", "screeningType", "submittedAt"]);
  expect(submitted!.privacyNoticeVersion).toBe(WEB_PRIVACY_NOTICE_VERSION);
  expect(submitted!.articleSlug).toBe("zdrazilo-vam-pojisteni");
  expect(submitted!.screeningType).toBe("insurance-price-check");
});

test("overview contact step shows the same revision without a consent checkbox", async ({ page }) => {
  await page.goto("/ziskat-prehled/");
  await rejectOptionalAnalytics(page);
  await page.getByRole("radio", { name: "Chci se zorientovat ve svých financích", exact: true }).check();
  await page.getByRole("button", { name: "Pokračovat ke kontaktu", exact: true }).click();
  const form = page.locator("form");
  await expect(form.locator('input[name="privacyNoticeVersion"]'))
    .toHaveValue(WEB_PRIVACY_NOTICE_VERSION);
  await expect(form.locator("[data-form-privacy-notice]"))
    .toHaveAttribute("data-form-privacy-notice", WEB_PRIVACY_NOTICE_VERSION);
  await expect(form.locator("[data-form-privacy-notice]"))
    .toContainText("Odesláním vás nepřihlašuji k newsletteru.");
  await expect(form.getByRole("checkbox")).toHaveCount(0);
});

async function expectFinancialScreeningStaysLocal(page: Page) {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/lead", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      json: { ok: true, created: true, deduped: false, message: "Test receipt" },
    });
  });
  await page.goto("/funnels/mortgage-income-drop-check/");
  await rejectOptionalAnalytics(page);
  await page.getByRole("button", { name: "Spustit kontrolu", exact: true }).click();
  for (let step = 0; step < 10; step++) {
    const choices = page.locator('[data-axiom-node-id$="_choices"]');
    if (!await choices.count()) break;
    await choices.getByRole("button").first().click();
    await page.getByRole("button", { name: /^(Pokračovat|Zobrazit výsledek)$/u }).click();
  }
  await page.getByRole("button", {
    name: /^(Chci konkrétní kontrolu|Ověřit konkrétní nastavení|Nechat si to zkontrolovat)$/u,
  }).click();
  await expect(page.getByText(/Odpovědi a orientační výsledek této kontroly zůstávají ve vašem prohlížeči/u))
    .toBeVisible();
  await page.getByLabel("Jméno", { exact: true }).fill("Test kontakt");
  await page.getByLabel("E-mail", { exact: true }).fill("privacy-test@example.invalid");
  await page.getByLabel("Telefon", { exact: true }).fill("+420 777 123 456");
  await page.getByLabel(/Beru na vědomí informace o zpracování osobních údajů/u).check();
  expect(submitted).toBeUndefined();
  await page.getByRole("button", { name: "Získat konkrétní kontrolu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Děkuji za kontakt. Ozvu se vám." })).toBeVisible();
  expect(Object.keys(submitted!).sort()).toEqual(["email", "message", "name", "phone", "privacy_notice_version", "source", "topic"]);
  expect(submitted!.privacy_notice_version).toBe(WEB_PRIVACY_NOTICE_VERSION);
  expect(String(submitted!.message).split("\n")).toEqual([
    "Žádám o kontakt k hypotéce a ochraně příjmu.",
    "Funnel: mortgage_income_drop_check",
  ]);
}

test("mortgage callback keeps financial screening values local", async ({ page }) => {
  await expectFinancialScreeningStaysLocal(page);
});

test("mortgage choices stay clickable with reduced motion after the contact route", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ziskat-prehled/");
  await rejectOptionalAnalytics(page);
  await page.getByRole("radio", { name: "Chci se zorientovat ve svých financích", exact: true }).check();
  await page.getByRole("button", { name: "Pokračovat ke kontaktu", exact: true }).click();
  await expectFinancialScreeningStaysLocal(page);
});
