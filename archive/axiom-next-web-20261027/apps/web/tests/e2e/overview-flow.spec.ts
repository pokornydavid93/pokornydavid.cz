import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function rejectAnalytics(page: Page) {
  const reject = page.getByRole("button", { name: "Nesouhlasím", exact: true });
  await reject.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (await reject.isVisible().catch(() => false)) await reject.click();
}

async function waitForInteractiveForm(page: Page) {
  await expect(page.locator('form[data-overview-interactive="true"]'))
    .toBeAttached();
}

async function openContactStep(
  page: Page,
  intent = "Chci mít přehled o svých financích",
) {
  await page.getByRole("radio", { name: intent, exact: true }).check();
  await page.getByRole("button", { name: "Doplnit kontakt", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Kam vám můžu zavolat?" }),
  ).toBeAttached();
  await expect(page.locator("#overview-phone")).toBeVisible();
  await expect(page.locator("#overview-phone")).toBeFocused();
  await expect(page.locator("#overview-email")).toBeVisible();
  await expect(page.locator("#overview-email")).toHaveAttribute("required", "");
  await expect(page.locator('input[name="preferredCallTime"]')).toHaveCount(0);
  await expect(page.getByText("Kam vám mohu zavolat?", { exact: true }))
    .toHaveCount(0);
  await expect(page.getByText("Odpovím vám osobně", { exact: true }))
    .toHaveCount(0);
}

async function submitPhone(page: Page, phone = "+420 731 830 897") {
  await page.locator("#overview-phone").fill(phone);
  await page.locator("#overview-email").fill("klient@example.cz");
  await page
    .getByRole("button", { name: "Zavolejte mi", exact: true })
    .click();
  await page.waitForURL("**/ziskat-prehled/dekujeme/");
}

async function expectDirectThankYouRedirect(page: Page) {
  await page.context().clearCookies();
  await page.goto("/ziskat-prehled/dekujeme/");
  await expect(page).toHaveURL(/\/ziskat-prehled\/$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Co právě potřebujete vyřešit?",
    }),
  ).toBeAttached();
  await expect(page.getByText("Vyberte, co se vás týká. Podrobnosti spolu probereme při úvodním hovoru.")).toBeVisible();
}

test.describe("two-step callback request flow", () => {
  test("keeps global, homepage and footer entry points general but traceable", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const headerCta = page.locator(
      '[data-analytics-event="home_primary_cta_click"][data-analytics-placement="header"]',
    ).first();
    const heroCta = page.locator(
      '[data-analytics-event="home_primary_cta_click"][data-analytics-placement="hero"]',
    ).first();
    await expect(headerCta).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=header&cta=header-primary",
    );
    await expect(heroCta).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=homepage&cta=home-hero",
    );
    await expect(
      page.getByRole("contentinfo").getByRole("link", {
        name: "Získat přehled",
        exact: true,
      }).first(),
    ).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=footer&cta=footer-primary",
    );

    for (const cta of [
      headerCta,
      heroCta,
      page.getByRole("contentinfo").getByRole("link", {
        name: "Získat přehled",
        exact: true,
      }).first(),
    ]) {
      const href = await cta.getAttribute("href");
      const url = new URL(href!, "http://127.0.0.1:3000");
      expect(url.searchParams.has("intent")).toBe(false);
      expect(url.searchParams.has("topic")).toBe(false);
    }

    await page.goto("/sluzby/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-services-catalog-escape]")).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=services&intent=unsure&cta=unsure-priorities",
    );
  });

  test("reflows across desktop, tablet and mobile widths", async ({ browser }) => {
    test.setTimeout(120_000);
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 430, height: 932 },
      { width: 390, height: 844 },
      { width: 375, height: 812 },
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto("/ziskat-prehled/", {
        waitUntil: "domcontentloaded",
      });
      await rejectAnalytics(page);

      await expect(
        page.getByRole("radio", {
          name: "Chci mít přehled o svých financích",
        }),
      ).toBeAttached();
      await expect(page.getByRole("radio")).toHaveCount(6);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);

      await page.goto(
        "/ziskat-prehled/?intent=housing&topic=mortgage&source=service-detail&cta=service-mortgage",
        { waitUntil: "domcontentloaded" },
      );
      await expect(page.locator("#overview-phone")).toBeVisible();
      await expect(page.locator("#overview-email")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
      await context.close();
    }
  });

  test("keeps the custom cursor and CTA icon stable on the form route", async ({
    page,
  }) => {
    await page.goto("/ziskat-prehled/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);
    await waitForInteractiveForm(page);
    await page.getByRole("radio", {
      name: "Chci mít přehled o svých financích",
      exact: true,
    }).check();

    const button = page.getByRole("button", { name: "Doplnit kontakt", exact: true });
    const before = await button.boundingBox();
    expect(before).not.toBeNull();
    await button.hover({ position: { x: 8, y: 8 } });
    await expect(page.locator("[data-custom-cursor]")).toHaveAttribute("data-cursor-visible", "true");
    await expect(page.locator("[data-custom-cursor]")).toHaveAttribute("data-cursor-icon", "hand");
    await expect(button.locator("[data-cursor-interaction-zone]")).toHaveCount(0);

    const after = await button.boundingBox();
    const geometry = await button.evaluate((element) => {
      const buttonRect = element.getBoundingClientRect();
      const icon = Array.from(element.children).find((child) =>
        child.getAttribute("aria-hidden") === "true" && child.querySelector("svg")
      );
      const iconRect = icon?.getBoundingClientRect();

      return {
        cursor: getComputedStyle(element).cursor,
        customCursorReady: document.documentElement.classList.contains("custom-cursor-ready"),
        iconBackground: icon ? getComputedStyle(icon).backgroundColor : null,
        iconCenterX: iconRect ? iconRect.left + iconRect.width / 2 : null,
        buttonCenterX: buttonRect.left + buttonRect.width / 2,
      };
    });

    expect(after).not.toBeNull();
    expect(after!.width).toBeCloseTo(before!.width, 1);
    expect(after!.height).toBeCloseTo(before!.height, 1);
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(3.5);
    expect(geometry.cursor).toBe("none");
    expect(geometry.customCursorReady).toBe(true);
    expect(geometry.iconBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(geometry.iconCenterX).toBeGreaterThan(geometry.buttonCenterX);
  });

  test("opens step one without a valid prefill", async ({ page }) => {
    await page.goto(
      "/ziskat-prehled/?intent=unknown&topic=unknown&source=unknown",
      { waitUntil: "networkidle" },
    );
    await rejectAnalytics(page);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Co právě potřebujete vyřešit?",
      }),
    ).toBeVisible();
    await expect(page.getByText("Vyberte, co se vás týká. Podrobnosti spolu probereme při úvodním hovoru.")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await expect(
      page.getByRole("button", { name: "Doplnit kontakt", exact: true }),
    ).toBeDisabled();
    await expect(page.locator('input[name="sourceContext"]')).toHaveValue(
      "direct",
    );
    await expect(page.locator('input[name="intent"]:checked')).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Hlavní navigace" }),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-component="site-header"] a[href^="tel:"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('main aside[aria-label="Přímý kontakt"]'),
    ).toHaveCount(0);
  });

  test("ignores invalid topics and never derives context from an invalid intent", async ({
    page,
  }) => {
    await page.goto(
      "/ziskat-prehled/?intent=housing&topic=vehicle-insurance&source=service-detail&cta=service-vehicle-insurance",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.locator('input[name="intent"]')).toHaveValue("housing");
    await expect(page.locator('input[name="topic"]')).toHaveCount(0);
    await expect(page.getByText("Bydlení a hypotéka", { exact: true }))
      .toBeVisible();

    await page.goto(
      "/ziskat-prehled/?intent=not-allowed&topic=mortgage&source=service-detail&cta=service-mortgage",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await expect(page.locator('input[name="intent"]:checked')).toHaveCount(0);
    await expect(page.locator('input[name="topic"]')).toHaveCount(0);
  });

  test("allowlists canonical context and supports legacy CTA parameters", async ({
    page,
  }) => {
    const canonicalCases = [
      ["overview", "Přehled o financích"],
      ["housing", "Bydlení a hypotéka"],
      ["financing", "Financování většího výdaje"],
      ["protection", "Pojištění"],
      ["future", "Rezerva a investice"],
      ["unsure", "Nevím, čím začít"],
    ] as const;

    for (const [intent, label] of canonicalCases) {
      await page.goto(
        `/ziskat-prehled/?intent=${intent}&source=services`,
        { waitUntil: "domcontentloaded" },
      );
      await rejectAnalytics(page);
      await expect(page.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        intent === "unsure" ? "1" : "2",
      );
      await expect(page.locator('input[name="sourceContext"]')).toHaveValue(
        "services",
      );
      await expect(page.getByText(label, { exact: true })).toBeVisible();
      if (intent === "unsure") {
        await expect(page.getByRole("radio", {
          name: "Nevím, čím začít",
        })).toBeChecked();
        await expect(page.locator("#overview-situation-note")).toBeDisabled();
        await page.getByRole("button", { name: "Doplnit podrobnosti" }).click();
        await expect(page.locator("#overview-situation-note")).toBeEnabled();
        await expect(page.locator("#overview-situation-note")).not.toBeFocused();
        await expect(
          page.getByRole("button", { name: "Doplnit kontakt", exact: true }),
        ).toBeEnabled();
      } else {
        await expect(page.locator('input[name="intent"]')).toHaveValue(intent);
      }
    }

    await page.goto(
      "/ziskat-prehled/?situation=kontrola-pojisteni&src=home-situations",
    );
    await expect(page.locator('input[name="intent"]')).toHaveValue(
      "protection",
    );
    await expect(page.locator('input[name="topic"]')).toHaveValue(
      "property-insurance",
    );
    await expect(page.locator('input[name="sourceContext"]')).toHaveValue(
      "homepage",
    );
    await expect(
      page.getByText("Pojištění", { exact: true }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/u,
    );
  });

  test("offers an optional note for every area and preserves it across steps", async ({
    page,
  }) => {
    await page.goto("/ziskat-prehled/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);
    await waitForInteractiveForm(page);

    await page.getByRole("radio", {
      name: "Řeším bydlení nebo hypotéku",
    }).check();
    const note = page.locator("#overview-situation-note");
    await expect(note).toBeDisabled();
    await page.getByRole("button", { name: "Doplnit podrobnosti" }).click();
    await expect(note).toBeEnabled();
    await expect(note).toHaveAttribute("maxlength", "500");
    await note.fill("Řeším více smluv a zároveň vyšší splátku hypotéky.");
    await expect(page.getByText("50/500", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Doplnit kontakt" }),
    ).toBeEnabled();

    await page
      .getByRole("radio", {
        name: "Chci mít přehled o svých financích",
      })
      .check();
    await expect(note).toBeEnabled();
    await expect(note).toHaveValue(
      "Řeším více smluv a zároveň vyšší splátku hypotéky.",
    );
    await page.getByRole("button", { name: "Skrýt poznámku" }).click();
    await expect(note).toBeDisabled();
    const inactiveFields = await page.locator("form").evaluate((form) =>
      Array.from(new FormData(form as HTMLFormElement).keys()),
    );
    expect(inactiveFields).not.toContain("situationNote");

    await page.getByRole("button", { name: "Upravit poznámku" }).click();
    await expect(note).toHaveValue(
      "Řeším více smluv a zároveň vyšší splátku hypotéky.",
    );
    await page.getByRole("button", { name: "Doplnit kontakt" }).click();
    await expect(page.locator('input[name="situationNote"]')).toHaveValue(
      "Řeším více smluv a zároveň vyšší splátku hypotéky.",
    );
  });

  test("preserves state across Change, Back and browser history", async ({
    page,
  }) => {
    await page.goto("/ziskat-prehled/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);

    await openContactStep(
      page,
      "Potřebuji financovat větší výdaj",
    );
    await expect(page.locator("#overview-phone")).toBeFocused();
    await page.locator("#overview-phone").fill("731 222 333");
    await page.locator("#overview-email").fill("petr@example.cz");
    await page.locator("#overview-first-name").fill("Petr");

    await page.getByRole("button", { name: "Vybrat jiné téma" }).click();
    const selectedIntent = page.getByRole("radio", {
      name: "Potřebuji financovat větší výdaj",
    });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Co právě potřebujete vyřešit?",
      }),
    ).toBeAttached();
    await expect(selectedIntent).toBeFocused();
    await expect(selectedIntent).toBeChecked();

    await page.getByRole("button", { name: "Doplnit kontakt" }).click();
    await expect(page.locator("#overview-phone")).toHaveValue("731 222 333");
    await expect(page.locator("#overview-email")).toHaveValue("petr@example.cz");
    await expect(page.locator("#overview-first-name")).toHaveValue("Petr");
    await expect(page.getByRole("group", {
      name: "Kdy se vám obvykle hodí krátký hovor?",
    })).toHaveCount(0);
    await page.goBack();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Co právě potřebujete vyřešit?",
      }),
    ).toBeAttached();
    await expect(selectedIntent).toBeFocused();
  });

  test("keeps a concrete topic through Change and clears it only after another area is selected", async ({
    page,
  }) => {
    await page.goto(
      "/ziskat-prehled/?intent=housing&topic=mortgage-refixation&source=article&cta=quick-refixation-check",
      { waitUntil: "domcontentloaded" },
    );
    await waitForInteractiveForm(page);

    await expect(page.getByText("Řešíte", { exact: true })).toBeVisible();
    await expect(page.getByText("Konkrétně", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Konec fixace hypotéky", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Vybrat jiné téma", exact: true }).click();
    await expect(
      page.getByRole("radio", { name: "Řeším bydlení nebo hypotéku" }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Doplnit kontakt" }).click();
    await expect(
      page.getByText("Konec fixace hypotéky", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Vybrat jiné téma", exact: true }).click();
    await page.getByRole("radio", {
      name: "Chci vyřešit pojištění",
    }).check();
    await page.getByRole("button", { name: "Doplnit kontakt" }).click();
    await expect(page.locator('input[name="topic"]')).toHaveCount(0);
    await expect(
      page.getByText("Konec fixace hypotéky", { exact: true }),
    ).toHaveCount(0);
  });

  test("requires valid phone and email and submits only active values", async ({
    page,
  }) => {
    await page.goto(
      "/ziskat-prehled/?intent=housing&topic=mortgage&source=service-detail&cta=service-mortgage",
      { waitUntil: "networkidle" },
    );
    await rejectAnalytics(page);
    await waitForInteractiveForm(page);

    await expect(page.getByText("Bydlení a hypotéka", { exact: true }))
      .toBeVisible();
    await expect(page.getByRole("radio", { name: "Telefonicky" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("radio", { name: "E-mailem" })).toHaveCount(0);
    await expect(page.locator("#overview-email")).toBeVisible();

    const submit = page.getByRole("button", {
      name: "Zavolejte mi",
    });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(
      page.getByText("Chyba: Zadejte prosím platné telefonní číslo."),
    ).toBeVisible();
    await expect(
      page.getByText("Chyba: Zadejte prosím platnou e-mailovou adresu."),
    ).toBeVisible();
    await page.locator("#overview-phone").fill("123");
    await page.locator("#overview-phone").blur();
    await expect(
      page.getByText("Chyba: Zadejte prosím platné telefonní číslo."),
    ).toBeVisible();
    await expect(submit).toBeEnabled();

    await page.locator("#overview-phone").fill("+420 731 830 897");
    await page.locator("#overview-email").fill("neplatny-email");
    await page.locator("#overview-email").blur();
    await expect(
      page.getByText("Chyba: Zadejte prosím platnou e-mailovou adresu."),
    ).toBeVisible();
    await page.locator("#overview-email").fill("petr@example.cz");
    await page.locator("#overview-first-name").fill("Petr");
    await expect(submit).toBeEnabled();

    const submittedFields = await page.locator("form").evaluate((form) =>
      Array.from(new FormData(form as HTMLFormElement).entries()).map(
        ([key, value]) => [key, String(value)],
      ),
    );
    expect(submittedFields).toContainEqual(["intent", "housing"]);
    expect(submittedFields).toContainEqual(["topic", "mortgage"]);
    expect(submittedFields).toContainEqual(["phone", "+420 731 830 897"]);
    expect(submittedFields).toContainEqual(["email", "petr@example.cz"]);
    expect(submittedFields).toContainEqual(["firstName", "Petr"]);
    expect(submittedFields.some(([key]) => key === "preferredCallTime"))
      .toBe(false);
    expect(submittedFields).toContainEqual(["sourceContext", "service-detail"]);
    expect(submittedFields).toContainEqual([
      "sourceCta",
      "service-mortgage",
    ]);
    expect(
      submittedFields.some(([key]) => key === "preferredContactChannel"),
    ).toBe(false);
    expect(submittedFields.some(([key]) => key === "situationNote")).toBe(
      false,
    );
  });

  test("keeps values after a server rejection and allows retry", async ({
    page,
  }) => {
    await page.goto(
      "/ziskat-prehled/?intent=unsure&source=process&cta=process-hero",
      { waitUntil: "networkidle" },
    );
    await rejectAnalytics(page);
    await page.getByRole("button", { name: "Doplnit kontakt" }).click();
    await page.locator("#overview-phone").fill("+420 731 222 333");
    await page.locator("#overview-email").fill("jana@example.cz");
    await page.locator("#overview-first-name").fill("Jana");
    await page.locator("#overview-website").evaluate(
      (input: HTMLInputElement) => {
        input.value = "bot";
      },
    );
    await page
      .getByRole("button", { name: "Zavolejte mi" })
      .click();

    const serverAlert = page
      .getByRole("alert")
      .filter({ hasText: "Odeslání se nepodařilo" });
    await expect(serverAlert).toContainText(
      "Formulář se teď nepodařilo odeslat.",
    );
    await expect(page.locator("#overview-phone")).toHaveValue(
      "+420 731 222 333",
    );
    await expect(page.locator("#overview-email")).toHaveValue("jana@example.cz");
    await expect(page.locator("#overview-first-name")).toHaveValue("Jana");
    await expect(serverAlert.getByRole("link")).toHaveCount(1);
    await expect(serverAlert.getByRole("link")).toHaveAttribute(
      "href",
      /^tel:/u,
    );

    await page.locator("#overview-website").evaluate(
      (input: HTMLInputElement) => {
        input.value = "";
      },
    );
    await page
      .getByRole("button", { name: "Zavolejte mi" })
      .click();
    await page.waitForURL("**/ziskat-prehled/dekujeme/");
  });

  test("disables submission immediately and sends one action request", async ({
    page,
  }) => {
    await page.goto(
      "/ziskat-prehled/?intent=overview&source=homepage&cta=home-hero",
      { waitUntil: "networkidle" },
    );
    await rejectAnalytics(page);
    await page.locator("#overview-phone").fill("+420 731 830 897");
    await page.locator("#overview-email").fill("klient@example.cz");

    let actionPosts = 0;
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) {
        actionPosts += 1;
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
      await route.continue();
    });

    const submit = page.locator('button[type="submit"]');
    const success = page.waitForURL("**/ziskat-prehled/dekujeme/");
    await submit.evaluate((button: HTMLButtonElement) => button.click());
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(submit).toHaveText("Odesílám…");
    await submit.click({ force: true, noWaitAfter: true });
    await success;
    expect(actionPosts).toBe(1);
  });

  test("shows a receipt-gated callback success state", async ({ page }) => {
    await page.goto(
      "/ziskat-prehled/?intent=protection&topic=income-protection&source=homepage&cta=home-final",
      { waitUntil: "networkidle" },
    );
    await rejectAnalytics(page);
    await submitPhone(page);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Děkuji. Ozvu se vám.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("POPTÁVKA PŘIJATA", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Během následujících 24 hodin vám zavolám\./u),
    ).toBeVisible();
    await expect(page.locator('[data-email-status="unavailable"]')).toContainText(
      "Vaši poptávku jsem ale přijal.",
    );
    await expect(page.getByText(/Telefon ·|•••/u)).toHaveCount(0);
    await expect(page.getByText(/rezervace|rezervovat|termín konzultace/iu)).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(page.url()).not.toContain("731");
    await expectDirectThankYouRedirect(page);
  });

  test("opens a safe development preview of the thank-you page", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/ziskat-prehled/dekujeme/?nahled=1", {
      waitUntil: "networkidle",
    });
    await rejectAnalytics(page);

    await expect(page.locator('[data-preview="true"]')).toBeVisible();
    await expect(
      page.getByText("Náhled stránky · Nic nebylo odesláno"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Děkuji. Ozvu se vám." }),
    ).toBeVisible();
    await expect(page.getByText(/24 hodin vám zavolám/u)).toBeVisible();
    await expect(page.locator('[data-email-status="queued"]')).toContainText(
      "Shrnutí toho, co jste zadali, vám právě posílám e-mailem.",
    );
    await expect(page.getByRole("heading", { level: 2, name: "Mohlo by vás zajímat" }))
      .toBeVisible();
    await expect(page.getByRole("link", { name: /Pokračovat na webu/u }))
      .toHaveAttribute("href", "/");
    await expect(page.locator('a[href^="/clanky/"]')).toHaveCount(3);
    await expect(page.getByText(/Telefon ·|•••|rezervace|rezervovat|termín konzultace/iu)).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    expect((await page.context().cookies()).some(
      (cookie) => cookie.name === "overview_receipt_v1",
    )).toBe(false);

    await page.goto("/ziskat-prehled/dekujeme/");
    await expect(page).toHaveURL(/\/ziskat-prehled\/$/u);
  });

  test("is keyboard-accessible, axe-clean, reduced-motion aware and mobile-safe", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/ziskat-prehled/", { waitUntil: "networkidle" });
    await rejectAnalytics(page);

    const firstStepAccessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(firstStepAccessibility.violations).toEqual([]);

    const firstRadio = page.getByRole("radio", {
      name: "Chci mít přehled o svých financích",
    });
    await firstRadio.focus();
    await page.keyboard.press("ArrowUp");
    await expect(
      page.getByRole("radio", { name: "Nevím, čím začít" }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Doplnit podrobnosti" }).click();
    await expect(page.locator("#overview-situation-note")).toBeEnabled();
    await page.locator("#overview-situation-note").fill("Krátký vlastní popis.");
    await page.getByRole("button", { name: "Doplnit kontakt" }).click();
    await page.getByRole("button", { name: "Nastavení cookies", exact: true }).click();
    await expect(page.getByRole("region", { name: "Soukromí a cookies" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Soukromí a cookies" })).toHaveCount(0);
    await page.locator("#overview-phone").fill("+420 731 830 897");
    await page.locator("#overview-email").fill("klient@example.cz");

    const motion = await page
      .locator('[data-overview-step="2"] section')
      .evaluate((element) => ({
        animationName: getComputedStyle(element).animationName,
        overflow:
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      }));
    expect(motion.animationName).toBe("none");
    expect(motion.overflow).toBeLessThanOrEqual(0);

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await context.close();
  });

  test("emits consent-gated enum-only analytics without personal data", async ({
    page,
  }) => {
    const events: unknown[][] = [];
    await page.exposeFunction("__recordOverviewEvent", (event: unknown[]) => {
      events.push(event);
    });
    await page.addInitScript(() => {
      const target = window as typeof window & {
        __recordOverviewEvent?: (event: unknown[]) => void;
      };
      Object.defineProperty(window, "dataLayer", {
        configurable: false,
        value: {
          push(entry: ArrayLike<unknown>) {
            target.__recordOverviewEvent?.(Array.from(entry));
            return 1;
          },
        },
        writable: false,
      });
      window.gtag = (...args: unknown[]) => target.__recordOverviewEvent?.(args);
    });
    await page.route("https://www.googletagmanager.com/**", (route) =>
      route.abort());
    await page.goto("/ziskat-prehled/?source=article", {
      waitUntil: "networkidle",
    });
    await waitForInteractiveForm(page);
    await page.getByRole("button", { name: "Souhlasím", exact: true }).click();

    await page
      .getByRole("radio", { name: "Nevím, čím začít" })
      .check();
    await page.getByRole("button", { name: "Doplnit podrobnosti" }).click();
    await page
      .locator("#overview-situation-note")
      .fill("Tento soukromý popis se nesmí odeslat do analytiky.");
    await page.getByRole("button", { name: "Doplnit kontakt" }).click();
    await page.locator("#overview-phone").fill("123");
    await page.getByRole("button", { name: "Zavolejte mi" }).click();
    await expect(page.getByText(
      "Chyba: Zadejte prosím platné telefonní číslo.",
    )).toBeVisible();
    await page.locator("#overview-phone").fill("+420 731 555 666");
    await page.locator("#overview-email").fill("soukromy@example.cz");
    await page.locator("#overview-first-name").fill("SoukroméJméno");
    await page
      .getByRole("button", { name: "Zavolejte mi" })
      .click();
    await page.waitForURL("**/ziskat-prehled/dekujeme/");

    await expect
      .poll(() => events.some((event) => event[1] === "lead_submit_success"))
      .toBe(true);
    const serialized = JSON.stringify(events);
    expect(serialized).toContain("lead_form_view");
    expect(serialized).toContain("lead_intent_selected");
    expect(serialized).toContain("lead_step_completed");
    expect(serialized).toContain("lead_contact_step_view");
    expect(serialized).toContain("lead_submit_attempt");
    expect(serialized).toContain("lead_validation_error");
    expect(serialized).toContain("lead_submit_success");
    expect(serialized).toContain("article");
    expect(serialized).not.toContain("731");
    expect(serialized).not.toContain("soukromy@example.cz");
    expect(serialized).not.toContain("SoukroméJméno");
    expect(serialized).not.toContain("Tento soukromý popis");
  });
});
