import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  formatOverviewConfirmationEmail,
  queueOverviewConfirmationEmailWithDependencies,
} = await import("../../lib/leads/confirmation-email.ts");
const {
  createOverviewConfirmationEmailToken,
  readOverviewConfirmationEmailStatus,
} = await import("../../lib/leads/overview-confirmation-email.ts");
const { validateOverviewRequest } = await import("../../lib/leads/overview-request.ts");

const RECEIPT_ID = "123e4567-e89b-42d3-a456-426614174000";
const WORKSPACE_ID = "123e4567-e89b-42d3-a456-426614174001";
const SENDER_ID = "123e4567-e89b-42d3-a456-426614174002";
const TOKEN = "test-mail-workflow-token-with-more-than-32-bytes";

const request = {
  intent: "housing",
  topic: "mortgage",
  situationNote: "Potřebuji porovnat dvě nabídky.",
  phone: "+420731830897",
  email: "klient@example.cz",
  firstName: "Jana",
  preferredCallTime: "afternoon",
  source: { route: "/ziskat-prehled/" },
  privacyNoticeVersion: "privacy-notice-2026-05-05",
  submittedAt: "2026-09-30T10:00:00.000Z",
  idempotencyKey: "2d6cdf60-2964-48b7-a1e4-6b44f7ecce5c",
};

const environment = {
  NODE_ENV: "production",
  AXIOM_MAIL_WORKFLOW_BASE_URL: "https://control.example.cz",
  AXIOM_MAIL_WORKFLOW_TOKEN: TOKEN,
  AXIOM_MAIL_WORKFLOW_WORKSPACE_ID: WORKSPACE_ID,
  AXIOM_MAIL_WORKFLOW_SENDER_IDENTITY_ID: SENDER_ID,
};

const acceptedReceipt = (deliveryState = "queued") => new Response(JSON.stringify({
  schema_version: 1,
  messages: [{
    role: "lead_confirmation",
    message_id: "123e4567-e89b-42d3-a456-426614174003",
    thread_id: "123e4567-e89b-42d3-a456-426614174004",
    delivery_ids: ["123e4567-e89b-42d3-a456-426614174005"],
    delivery_states: [deliveryState],
    replayed: false,
  }],
}), { status: 201, headers: { "Content-Type": "application/json" } });

describe("overview confirmation email", () => {
  it("requires a valid email in the server-normalized lead payload", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      intent: "housing",
      phone: "+420 731 830 897",
      email: " klient@example.cz ",
      sourceContext: "direct",
      idempotencyKey: request.idempotencyKey,
      privacyNoticeVersion: request.privacyNoticeVersion,
    })) form.set(key, value);
    const messages = {
      intent: "intent", situationNote: "note", phone: "phone",
      email: "email", firstName: "name", preferredCallTime: "time",
    };
    const accepted = validateOverviewRequest(
      form, messages, request.privacyNoticeVersion, request.submittedAt,
    );
    assert.equal(accepted.normalized.email, "klient@example.cz");
    assert.equal(accepted.normalized.phone, request.phone);

    for (const invalid of [
      "", "a@localhost", "a b@example.cz", ".a@example.cz", "a..b@example.cz",
      "žaneta@example.cz", `${"a".repeat(65)}@example.cz`, "a@example..cz",
    ]) {
      form.set("email", invalid);
      const rejected = validateOverviewRequest(
        form, messages, request.privacyNoticeVersion, request.submittedAt,
      );
      assert.equal(rejected.normalized, null);
      assert.equal(rejected.errors.email, "email");
    }
  });

  it("confirms receipt and next steps without duplicating personal or financial fields", () => {
    const message = formatOverviewConfirmationEmail();
    assert.match(message.subject, /Potvrzení žádosti/u);
    assert.match(message.text, /Žádost jsem přijal/u);
    assert.match(message.text, /24 hodin/u);
    for (const value of [
      "Bydlení nebo nemovitost",
      "Hypotéka a bydlení",
      request.situationNote,
      request.phone,
      request.email,
      request.firstName,
      "Odpoledne",
    ]) assert.ok(!message.text.includes(value), value);
    assert.ok(!message.text.includes(request.source.route));
    assert.match(message.text, /Vaše osobní údaje a právo na námitku/u);
    assert.match(message.text, /Správcem je David Pokorný, IČO 09016236/u);
    assert.match(message.text, /https:\/\/pokornydavid\.cz\/zasady-zpracovani-osobnich-udaju\//u);
    assert.match(message.text, /nepřihlašujete k newsletteru/u);
  });

  it("queues one idempotent message through the existing Axiom Mail workflow", async () => {
    let captured;
    const status = await queueOverviewConfirmationEmailWithDependencies(
      request,
      RECEIPT_ID,
      environment,
      async (url, init) => {
        captured = { url, init };
        return acceptedReceipt();
      },
    );
    assert.equal(status, "queued");
    assert.equal(captured.url, "https://control.example.cz/internal/mail/workflows/lead-created");
    assert.equal(captured.init.headers["Idempotency-Key"], `lead-created:overview:${RECEIPT_ID}`);
    assert.equal(captured.init.headers["X-Axiom-Mail-Receipt-Delivery-States"], "1");
    assert.equal(captured.init.headers.Authorization, `Bearer ${TOKEN}`);
    const payload = JSON.parse(captured.init.body);
    assert.equal(payload.source_id, RECEIPT_ID);
    assert.equal(payload.messages.length, 1);
    assert.equal(payload.messages[0].role, "lead_confirmation");
    assert.equal(payload.messages[0].to[0].email, request.email);
    assert.equal(payload.messages[0].text_body, formatOverviewConfirmationEmail().text);
    for (const value of [request.situationNote, request.phone, request.firstName, "Odpoledne"]) {
      assert.ok(!JSON.stringify(payload).includes(value), value);
    }
  });

  it("never claims queueing without configuration or a valid workflow receipt", async () => {
    let calls = 0;
    const fetchStub = async () => { calls++; return acceptedReceipt(); };
    assert.equal(await queueOverviewConfirmationEmailWithDependencies(
      request, RECEIPT_ID, {}, fetchStub,
    ), "unavailable");
    assert.equal(calls, 0);
    assert.equal(await queueOverviewConfirmationEmailWithDependencies(
      request, RECEIPT_ID, environment,
      async () => new Response("unavailable", { status: 503 }),
    ), "unavailable");
    assert.equal(await queueOverviewConfirmationEmailWithDependencies(
      request, RECEIPT_ID, environment,
      async () => new Response(JSON.stringify({ schema_version: 1, messages: [] }), { status: 201 }),
    ), "unavailable");
    assert.equal(await queueOverviewConfirmationEmailWithDependencies(
      request, RECEIPT_ID, environment,
      async () => acceptedReceipt("suppressed"),
    ), "unavailable");
  });

  it("retries a transient failure with the same idempotency key", async () => {
    const keys = [];
    const status = await queueOverviewConfirmationEmailWithDependencies(
      request, RECEIPT_ID, environment,
      async (_url, init) => {
        keys.push(init.headers["Idempotency-Key"]);
        return keys.length === 1
          ? new Response("retry", { status: 503 })
          : acceptedReceipt();
      },
    );
    assert.equal(status, "queued");
    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
  });

  it("binds the thank-you claim to the accepted receipt", () => {
    const signed = createOverviewConfirmationEmailToken(RECEIPT_ID, TOKEN);
    assert.equal(readOverviewConfirmationEmailStatus(signed, RECEIPT_ID, TOKEN), "queued");
    assert.equal(readOverviewConfirmationEmailStatus(signed, WORKSPACE_ID, TOKEN), "unavailable");
    assert.equal(readOverviewConfirmationEmailStatus(signed, RECEIPT_ID, `${TOKEN}x`), "unavailable");
    assert.equal(readOverviewConfirmationEmailStatus(undefined, RECEIPT_ID, TOKEN), "unavailable");
  });
});
