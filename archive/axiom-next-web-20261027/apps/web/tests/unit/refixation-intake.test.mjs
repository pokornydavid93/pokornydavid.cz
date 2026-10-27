import assert from "node:assert/strict";
import { test } from "node:test";
import { refixationIntakeCommand } from "../../lib/leads/refixation-intake.ts";
import { validateRefixationRequest } from "../../lib/leads/refixation-request.ts";

const input = {
  funnelId: "mortgage-refixation", name: "Testovací kontakt", phone: "+420777123456",
  email: "contact@example.test", callbackWindow: "midday", fixationBucket: "active", refixationPath: "active-audit",
  fixationMonth: 12, fixationYear: 2026, remainingBalanceBand: "2-4m", priority: "compare-options",
  privacyNoticeVersion: "privacy-notice-2026-09-30", submittedAt: new Date().toISOString(),
  idempotencyKey: "ab222222-2222-4222-8222-222222222222", attribution: { gclid: "private-ad-identifier" },
};

test("refixation uses the admitted consultation protocol and preserves inquiry details in its protected summary", () => {
  const command = refixationIntakeCommand(input, "preview.pokornydavid.cz");
  assert.equal(command.form_id, "phone-first-consultation");
  assert.equal(command.intent, "housing");
  assert.equal(command.topic, "mortgage-refixation");
  assert.match(command.situation_note, /12\/2026/);
  assert.match(command.situation_note, /2–4 mil/);
  assert.match(command.situation_note, /porovnat možnosti/);
  assert.match(command.situation_note, /poledne/);
  assert.equal(command.email, input.email);
  assert.equal(command.request_id, input.idempotencyKey);
  assert.equal(command.submitted_at, input.submittedAt);
  assert.ok(command.situation_note.length < 500);
  assert.ok(!JSON.stringify(command).includes(input.attribution.gclid));
});

test("unknown fixation keeps its meaning and repeated attempts preserve the exact accepted request timestamp", () => {
  const unknown = { ...input, fixationMonth: undefined, fixationYear: undefined };
  assert.match(refixationIntakeCommand(unknown, "preview.pokornydavid.cz").situation_note, /termín neznámý/);
  const form = new FormData();
  Object.entries({ fixationDateKnown: "unknown", remainingBalanceBand: "2-4m", priority: "compare-options",
    name: input.name, phone: input.phone, email: input.email, callbackWindow: "midday",
    idempotencyKey: input.idempotencyKey, privacyNoticeVersion: input.privacyNoticeVersion }).forEach(([key, value]) => form.set(key, value));
  const messages = Object.fromEntries(["fixationDate", "remainingBalanceBand", "priority", "name", "phone", "email", "callbackWindow"].map(key => [key, key]));
  const result = validateRefixationRequest(form, messages, new Date(), input.submittedAt);
  assert.equal(result.normalized?.submittedAt, input.submittedAt);
  assert.equal(validateRefixationRequest(form, messages, new Date(), "invalid").normalized, null);
  assert.equal(validateRefixationRequest(form, messages, new Date(), new Date(Date.now() - 31 * 60 * 1000).toISOString()).normalized, null);
});
