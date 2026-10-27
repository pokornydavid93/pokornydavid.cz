import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

type SubmitBody = {
  consent?: {
    analytics?: boolean;
    marketing?: boolean;
    source?: string;
  };
  destination?: string;
  payload?: Record<string, unknown>;
  release_id?: string;
  request_id?: string;
  route_path?: string;
};

const captureEvidence = async (
  page: Page,
  filename: string,
) => {
  const directory = process.env.AXIOM_CAPTURE_EVIDENCE_DIR?.trim();
  if (!directory) return;
  await page.screenshot({
    fullPage: true,
    path: path.join(directory, filename),
  });
};

const acceptanceViewports = [
  { height: 844, name: "mobile", width: 390 },
  { height: 1024, name: "tablet", width: 768 },
  { height: 900, name: "desktop", width: 1440 },
  { height: 1080, name: "wide", width: 1920 },
] as const;

test("keeps explicit analytics consent available on a public funnel route", async ({
  page,
}) => {
  await page.goto("/funnels/mortgage-income-drop-check", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("region", { name: "Nastavení cookies" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Souhlasím", exact: true }),
  ).toBeVisible();
  await captureEvidence(page, "funnel-consent-public-route.png");
});

for (const acceptanceViewport of acceptanceViewports) {
  test(`canonical pending remains retryable and only projected delivery reaches thank-you (${acceptanceViewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize(acceptanceViewport);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const requests: SubmitBody[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.route("**/e2e-runtime/forms/**", async (route) => {
      const requestBody = route.request().postDataJSON() as SubmitBody;
      requests.push(requestBody);
      const attempt = requests.length;
      await route.fulfill({
        body: JSON.stringify(
          attempt === 1
            ? {
                ok: false,
                status: "pending",
                submission_id: "70000000-0000-4000-8000-000000000010",
              }
            : attempt === 2
              ? {
                  ok: false,
                  status: "retry_wait",
                  submission_id: "70000000-0000-4000-8000-000000000010",
                }
            : {
                canonical_contact_id: "70000000-0000-4000-8000-000000000011",
                canonical_inquiry_id: "70000000-0000-4000-8000-000000000012",
                ok: true,
                request_id: requestBody.request_id,
                status: "projected",
                submission_id: "70000000-0000-4000-8000-000000000010",
                terminal_receipt_id: "70000000-0000-4000-8000-000000000013",
              },
        ),
        contentType: "application/json",
        status: attempt < 3 ? 202 : 200,
      });
    });

    await page.goto(
      "/e2e-funnel-canonical?utm_source=e2e&utm_campaign=canonical-runtime",
      { waitUntil: "networkidle" },
    );

    const rejectCookies = page.getByRole("button", {
      name: "Nesouhlasím",
      exact: true,
    });
    await expect(rejectCookies).toBeVisible();
    await rejectCookies.click();
    await expect(
      page.getByRole("region", { name: "Nastavení cookies" }),
    ).toHaveCount(0);

    await page.getByLabel("Jméno").fill("Canonical Browser");
    await page.getByLabel("E-mail").fill("canonical-browser@example.cz");
    await page.getByLabel("Telefon").fill("+420 731 830 897");
    await page
      .getByLabel(/Beru na vědomí informace o zpracování osobních údajů/u)
      .check();

    const submit = page.getByRole("button", { name: /Získat konkrétní kontrolu/u });
    await submit.click();

    await expect(page.getByTestId("canonical-funnel-route")).toHaveText(
      "lead_capture",
    );
    await expect(page.locator('[data-axiom-form-delivery-status="pending"]')).toHaveRole(
      "alert",
    );
    await expect(
      page.getByText(
        "Kontakt jsme přijali a dokončujeme jeho bezpečné předání.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByText("Odesláno", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Hotovo/u })).toHaveCount(0);
    expect(requests).toHaveLength(1);

    const firstRequestId = requests[0]?.request_id;
    expect(firstRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(requests[0]).toMatchObject({
      consent: {
        analytics: false,
        marketing: false,
        source: "cookie_consent_v1:rejected",
      },
      destination: "canonical_inquiry",
      release_id: "70000000-0000-4000-8000-000000000003",
      route_path: "lead_capture",
    });
    expect(requests[0]?.payload).toMatchObject({
      email: "canonical-browser@example.cz",
      first_name: "Canonical Browser",
      privacy_acknowledged: true,
    });

    const eventsAfterPending = await page.evaluate(
      () =>
        (
          window as Window & {
            __axiomCanonicalFunnelEvents?: Array<{ event: string }>;
          }
        ).__axiomCanonicalFunnelEvents ?? [],
    );
    expect(eventsAfterPending.map(({ event }) => event)).not.toContain("form_submit");
    expect(eventsAfterPending.map(({ event }) => event)).not.toContain("thank_you_view");

    await submit.click();

    await expect(page.getByTestId("canonical-funnel-route")).toHaveText(
      "lead_capture",
    );
    await expect(
      page.locator('[data-axiom-form-delivery-status="retry_wait"]'),
    ).toHaveRole("alert");
    await expect(
      page.getByText(
        "Předání zatím nebylo dokončeno. Zkuste odeslání znovu; údaje nezdvojíme.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1]?.request_id).toBe(firstRequestId);
    await expect(page.getByText("Odesláno", { exact: true })).toHaveCount(0);
    await page.mouse.move(1, 1);
    await captureEvidence(
      page,
      `funnel-canonical-intake-retry-wait-${acceptanceViewport.name}.png`,
    );

    await submit.click();

    await expect(page.getByTestId("canonical-funnel-route")).toHaveText("thank_you");
    await expect(page.getByText("Odesláno", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Hotovo/u })).toBeVisible();
    await captureEvidence(
      page,
      `funnel-canonical-intake-projected-${acceptanceViewport.name}.png`,
    );
    expect(requests).toHaveLength(3);
    expect(requests[2]?.request_id).toBe(firstRequestId);

    const routes = await page.evaluate(
      () =>
        (
          window as Window & { __axiomCanonicalFunnelRoutes?: string[] }
        ).__axiomCanonicalFunnelRoutes ?? [],
    );
    expect(routes).toEqual(["lead_capture", "thank_you"]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
