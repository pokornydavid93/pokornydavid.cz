import assert from "node:assert/strict";
import test from "node:test";

import { articleScreeningTopics, parseArticleScreeningRequest, screeningSubmissionIdentity } from "../../lib/leads/article-screening-request.ts";
import { acceptArticleScreening } from "../../lib/leads/article-screening-service.ts";
import { handleArticleScreeningPost } from "../../lib/leads/article-screening-http.ts";
import { isCanonicalProjectPublicHost } from "../../lib/leads/project-public-host.ts";

const noticeVersion = "privacy-notice-2026-09-30";
const timestamp = "2026-09-30T12:00:00.000Z";
const now = Date.parse(timestamp);
const requestId = "16cddaba-362a-4b0e-81af-5a2782759cf4";
const receiptId = "26cddaba-362a-4b0e-81af-5a2782759cf4";
const publicHostname = "p-7eaon7ah22pzd6ydy7iq.syllcode.com";
const request = {
  articleSlug: "zdrazilo-vam-pojisteni",
  screeningType: "insurance-price-check",
  name: " David Pokorný ",
  email: " david@example.cz ",
  phone: "+420 731 830 897",
  privacyNoticeVersion: noticeVersion,
  requestId,
  submittedAt: timestamp,
};
const parsedRequest = () => parseArticleScreeningRequest(request, noticeVersion, now);
const articleFor = (slug, type) => ({
  slug,
  title: "Zdražilo vám pojištění? Neplaťte automaticky víc.",
  sections: [{ id: "porovnani", blocks: [{ type: "interactiveTool", tool: "screening", screeningType: type }] }],
});
const receiptFor = (intent = "protection") => ({
  schema_version: 1,
  status: "accepted",
  receipt_id: receiptId,
  intent,
  masked_phone: "••• 897",
  confirmation_email_status: "queued",
  owner_notification_email_status: "queued",
  created_at: timestamp,
});

test("public host syntax supports the exact custom domain without normalizing forged authorities", () => {
  for (const hostname of [publicHostname, "pokornydavid.cz", "www.pokornydavid.cz", "finance-2.example"]) {
    assert.equal(isCanonicalProjectPublicHost(hostname), true, hostname);
  }
  for (const hostname of [
    "", "localhost", "Pokornydavid.cz", "*.pokornydavid.cz", "pokornydavid.cz.",
    "127.0.0.1", "[::1]", "example.123", "a..cz", "-advisor.cz", "advisor-.cz",
    "pokornydavid.cz:443", "pokornydavid.cz/path", "user@pokornydavid.cz",
    "pokornydavid.cz\nX-Evil: yes", "pokornydavid.cz\x00", "pokornydavid.cz ", "českefinance.cz",
    `${"a".repeat(64)}.cz`, `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`,
  ]) assert.equal(isCanonicalProjectPublicHost(hostname), false, hostname);
});

test("the browser intake accepts only contact and bounded public tool identity", () => {
  const parsed = parsedRequest();
  assert.ok(parsed);
  assert.equal(parsed.name, "David Pokorný");
  assert.equal(parsed.email, "david@example.cz");
  assert.equal(parsed.phone, "+420731830897");
  for (const key of ["answers", "review", "score", "articleTitle", "topic", "intent", "workspaceId", "releaseRef", "article_context"]) {
    assert.equal(parseArticleScreeningRequest({ ...request, [key]: "untrusted" }, noticeVersion, now), null, key);
  }
  const missing = { ...request };
  delete missing.email;
  assert.equal(parseArticleScreeningRequest(missing, noticeVersion, now), null);
  assert.equal(parseArticleScreeningRequest(null, noticeVersion, now), null);
  assert.equal(parseArticleScreeningRequest([request], noticeVersion, now), null);
});

test("browser validation rejects unknown tools, invalid contact, stale notice and stale identity", () => {
  for (const patch of [
    { screeningType: "constructor" },
    { screeningType: "unknown" },
    { articleSlug: "../clanky" },
    { articleSlug: "a".repeat(161) },
    { name: "x".repeat(81) },
    { name: "David\nPokorný" },
    { email: "not-an-email" },
    { phone: "call-me-731830897" },
    { privacyNoticeVersion: "privacy-notice-2026-05-05" },
    { requestId: requestId.replace("4b0e", "5b0e") },
    { submittedAt: "invalid" },
    { submittedAt: "September 30, 2026 12:00:00" },
    { submittedAt: new Date(now - 30 * 60_000 - 1).toISOString() },
    { submittedAt: new Date(now + 2 * 60_000 + 1).toISOString() },
  ]) assert.equal(parseArticleScreeningRequest({ ...request, ...patch }, noticeVersion, now), null, JSON.stringify(patch));
});

test("a lost response reuses the exact contact-bound UUID and timestamp", () => {
  const { requestId: ignoredId, submittedAt: ignoredDate, ...input } = request;
  void ignoredId;
  void ignoredDate;
  let generated = 0;
  const identity = screeningSubmissionIdentity(null, input, () => { generated += 1; return requestId; }, () => timestamp);
  const retry = screeningSubmissionIdentity(identity, { ...input, phone: "+420731830897", name: "David Pokorný", email: "david@example.cz" }, () => { throw new Error("retry must not acquire a new UUID"); }, () => { throw new Error("retry must retain its original timestamp"); });
  assert.equal(retry, identity);
  assert.equal(generated, 1);
  const changed = screeningSubmissionIdentity(identity, { ...input, email: "other@example.cz" }, () => receiptId, () => "2026-09-30T12:01:00.000Z");
  assert.notEqual(changed.requestId, identity.requestId);
  assert.notEqual(changed.submittedAt, identity.submittedAt);
});

for (const [type, topic] of Object.entries(articleScreeningTopics)) {
  test(`server resolves authored article and topic for ${type}`, async () => {
    const normalized = { ...parsedRequest(), screeningType: type };
    const article = articleFor(normalized.articleSlug, type);
    let captured;
    const result = await acceptArticleScreening(normalized, {
      publicHostname,
      articleBySlug: async (slug) => { assert.equal(slug, normalized.articleSlug); return article; },
      intake: { submit: async (command) => { captured = command; return receiptFor(topic.intent); } },
    });
    assert.deepEqual(result, { status: "accepted", receiptId });
    assert.equal(captured.form_id, "article-screening");
    assert.equal(captured.intent, topic.intent);
    assert.equal(captured.topic, topic.topic);
    assert.equal(captured.source_context, "article");
    assert.equal(captured.source_cta, "article-screening-check");
    assert.equal(captured.request_id, requestId);
    assert.equal(captured.submitted_at, timestamp);
    assert.deepEqual(captured.article_context, { slug: article.slug, title: article.title, screening_type: type });
    assert.equal(captured.first_name, "David Pokorný");
    assert.equal(captured.email, "david@example.cz");
    assert.equal(captured.phone, "+420731830897");
    assert.equal(captured.situation_note, "");
    assert.equal(captured.preferred_call_time, "");
    assert.equal(Object.hasOwn(captured, "answers"), false);
    assert.equal(Object.hasOwn(captured, "review"), false);
    assert.equal(Object.hasOwn(captured, "score"), false);
    assert.equal(Object.hasOwn(captured, "workspace_id"), false);
    assert.equal(Object.hasOwn(captured, "release_ref"), false);
  });
}

test("a removed article or mismatched published screening never reaches intake", async () => {
  for (const article of [
    null,
    { ...articleFor(request.articleSlug, request.screeningType), slug: "different-article" },
    articleFor(request.articleSlug, "income-protection"),
    { slug: request.articleSlug, title: "Article", sections: [{ blocks: [{ type: "paragraph", text: "screening" }] }] },
    { slug: request.articleSlug, title: "Article", sections: undefined },
  ]) {
    let calls = 0;
    const result = await acceptArticleScreening(parsedRequest(), {
      publicHostname,
      articleBySlug: async () => article,
      intake: { submit: async () => { calls += 1; return receiptFor(); } },
    });
    assert.deepEqual(result, { status: "error", reason: "invalid" });
    assert.equal(calls, 0);
  }
});

test("legacy article screening is supported only when semantic sections do not provide the renderer", async () => {
  for (const article of [
    { slug: request.articleSlug, title: "Older authored article", articleFlow: { screening: { type: request.screeningType } } },
    { ...articleFor(request.articleSlug, request.screeningType), articleFlow: { screening: { type: "income-protection" } } },
  ]) {
    const result = await acceptArticleScreening(parsedRequest(), {
      publicHostname,
      articleBySlug: async () => article,
      intake: { submit: async () => receiptFor() },
    });
    assert.deepEqual(result, { status: "accepted", receiptId });
  }
  const semanticArticle = { ...articleFor(request.articleSlug, "income-protection"), articleFlow: { screening: { type: request.screeningType } } };
  let calls = 0;
  assert.deepEqual(await acceptArticleScreening(parsedRequest(), {
    publicHostname,
    articleBySlug: async () => semanticArticle,
    intake: { submit: async () => { calls += 1; return receiptFor(); } },
  }), { status: "error", reason: "invalid" });
  assert.equal(calls, 0);
});

test("an accepted inquiry replay remains accepted after notification status fields disappear", async () => {
  for (const omittedFields of [
    ["confirmation_email_status"],
    ["owner_notification_email_status"],
    ["confirmation_email_status", "owner_notification_email_status"],
  ]) {
    const receipt = receiptFor();
    for (const field of omittedFields) delete receipt[field];
    const result = await acceptArticleScreening(parsedRequest(), {
      publicHostname,
      articleBySlug: async () => articleFor(request.articleSlug, request.screeningType),
      intake: { submit: async () => receipt },
    });
    assert.deepEqual(result, { status: "accepted", receiptId }, omittedFields.join(", "));
  }
});

test("CRM acceptance rejects a receipt for a different inquiry intent or contact", async () => {
  for (const patch of [
    { intent: "housing" },
    { masked_phone: "••• 123" },
  ]) {
    const result = await acceptArticleScreening(parsedRequest(), {
      publicHostname,
      articleBySlug: async () => articleFor(request.articleSlug, request.screeningType),
      intake: { submit: async () => ({ ...receiptFor(), ...patch }) },
    });
    assert.deepEqual(result, { status: "error", reason: "unavailable" }, JSON.stringify(patch));
  }
});

function httpRequest(body = JSON.stringify({ ...request, submittedAt: new Date().toISOString() }), extraHeaders = {}) {
  return new Request(`https://${publicHostname}/api/article-screening`, {
    method: "POST",
    headers: { "content-type": "application/json", host: publicHostname, origin: `https://${publicHostname}`, ...extraHeaders },
    body,
  });
}

test("HTTP acceptance requires the current notice and sends only a no-store receipt", async () => {
  let calls = 0;
  const response = await handleArticleScreeningPost(httpRequest(), {
    noticeVersion,
    submit: async (input, hostname) => {
      calls += 1;
      assert.equal(hostname, publicHostname);
      assert.deepEqual(Object.keys(input).sort(), Object.keys(request).sort());
      return { status: "accepted", receiptId };
    },
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { status: "accepted", receiptId });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.has("access-control-allow-origin"), false);
});

test("a custom domain remains exact through the same-origin boundary and SDK intake command", async () => {
  const hostname = "pokornydavid.cz";
  let command;
  const response = await handleArticleScreeningPost(httpRequest(undefined, {
    host: "runtime.internal",
    "x-forwarded-host": hostname,
    origin: `https://${hostname}`,
  }), {
    noticeVersion,
    submit: (input, receivedHostname) => acceptArticleScreening(input, {
      publicHostname: receivedHostname,
      articleBySlug: async () => articleFor(input.articleSlug, input.screeningType),
      intake: { submit: async (value) => { command = value; return receiptFor(); } },
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(command.public_hostname, hostname);
  assert.deepEqual(await response.json(), { status: "accepted", receiptId });
  let calls = 0;
  const rejected = await handleArticleScreeningPost(httpRequest(undefined, {
    "x-forwarded-host": hostname,
    origin: `https://${publicHostname}`,
  }), { noticeVersion, submit: async () => { calls += 1; return { status: "accepted", receiptId }; } });
  assert.equal(rejected.status, 400);
  assert.equal(calls, 0);
});

test("HTTP boundary rejects cross-origin, missing origin, non-JSON and untrusted extra answers before intake", async () => {
  const currentRequest = { ...request, submittedAt: new Date().toISOString() };
  for (const invalidRequest of [
    httpRequest(undefined, { origin: "" }),
    httpRequest(undefined, { origin: "null" }),
    httpRequest(undefined, { origin: "https://attacker.example" }),
    httpRequest(undefined, { origin: `https://${publicHostname}:444` }),
    httpRequest(undefined, { "content-type": "text/plain" }),
    httpRequest(undefined, { "x-forwarded-host": "attacker.example" }),
    httpRequest("{"),
    httpRequest(JSON.stringify({ ...currentRequest, answers: { insurance: "Auto" } })),
    httpRequest(JSON.stringify({ ...currentRequest, privacyNoticeVersion: "stale" })),
    new Request(`https://${publicHostname}/api/article-screening`, { method: "POST", headers: { host: publicHostname, origin: `https://${publicHostname}`, "content-type": "application/json" } }),
  ]) {
    let calls = 0;
    const response = await handleArticleScreeningPost(invalidRequest, { noticeVersion, submit: async () => { calls += 1; return { status: "accepted", receiptId }; } });
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
    assert.deepEqual(await response.json(), { status: "error", reason: "invalid" });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.has("access-control-allow-origin"), false);
  }
});

test("the HTTP body limit counts actual UTF-8 bytes across chunks and cancels overflow", async () => {
  const encoder = new TextEncoder();
  const base = JSON.stringify({ ...request, submittedAt: new Date().toISOString() });
  const baseBytes = encoder.encode(base);
  for (const length of [4096, 4097]) {
    const body = new Uint8Array(length);
    body.fill(32);
    body.set(baseBytes);
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(body.slice(0, 2048));
        controller.enqueue(body.slice(2048));
        if (length === 4096) controller.close();
      },
      cancel() { cancelled = true; },
    });
    const request = new Request(`https://${publicHostname}/api/article-screening`, {
      method: "POST", headers: { "content-type": "application/json", host: publicHostname, origin: `https://${publicHostname}` }, body: stream, duplex: "half",
    });
    let calls = 0;
    const response = await handleArticleScreeningPost(request, { noticeVersion, submit: async () => { calls += 1; return { status: "accepted", receiptId }; } });
    assert.equal(response.status, length === 4096 ? 201 : 400);
    assert.equal(calls, length === 4096 ? 1 : 0);
    assert.equal(cancelled, length === 4097);
  }
  const brokenUtf8 = new Request(`https://${publicHostname}/api/article-screening`, {
    method: "POST", headers: { "content-type": "application/json", host: publicHostname, origin: `https://${publicHostname}` }, body: new Uint8Array([0xff]),
  });
  assert.equal((await handleArticleScreeningPost(brokenUtf8, { noticeVersion, submit: async () => { throw new Error("invalid UTF-8 must not reach intake"); } })).status, 400);
});

test("HTTP provider failures cannot masquerade as invalid user input or accepted leads", async () => {
  const failed = await handleArticleScreeningPost(httpRequest(), { noticeVersion, submit: async () => { throw new Error("private provider error must not escape"); } });
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { status: "error", reason: "unavailable" });
  for (const [reason, expectedStatus] of [["invalid", 400], ["unavailable", 503], ["conflict", 409], ["rate-limited", 429]]) {
    const response = await handleArticleScreeningPost(httpRequest(), { noticeVersion, submit: async () => ({ status: "error", reason }) });
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(await response.json(), { status: "error", reason });
  }
});
