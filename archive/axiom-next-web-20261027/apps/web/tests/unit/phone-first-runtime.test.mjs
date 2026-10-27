import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

const {
  PHONE_FIRST_ALLOWED_CTA_IDS,
  PHONE_FIRST_INTAKE_ORIGIN_ENV,
  PHONE_FIRST_INTAKE_PATH,
  PHONE_FIRST_RECEIPT_SECRET_ENV,
  PHONE_FIRST_RECEIPT_SECRET_FILE_ENV,
  PHONE_FIRST_RUNTIME_MODE_ENV,
  PHONE_FIRST_TIMEOUT_ENV,
  PhoneFirstConfigurationError,
  PhoneFirstSubmissionError,
  buildPhoneFirstWireRequest,
  createPhoneFirstHttpSink,
  createSignedOverviewReceiptStore,
  parsePhoneFirstProductionConfig,
  resolvePhoneFirstRuntimeMode,
} = await import("../../lib/leads/phone-first-runtime.ts");
const {
  isAllowedLeadCta,
  leadTopicOfferingKeys,
} = await import("../../lib/leads/lead-contract.ts");
const { resolveOverviewSubmittedAt } = await import(
  "../../lib/leads/submission-identity.ts"
);

const SECRET = "test-only-secret-with-more-than-thirty-two-bytes";
const IDEMPOTENCY_KEY = "2d6cdf60-2964-48b7-a1e4-6b44f7ecce5c";
const RECEIPT_ID = "123e4567-e89b-12d3-a456-426614174000";
const SUBMITTED_AT = "2026-08-20T10:20:30.123Z";

const configEnvironment = (overrides = {}) => ({
  [PHONE_FIRST_INTAKE_ORIGIN_ENV]: "https://lead-api.example.test",
  [PHONE_FIRST_RECEIPT_SECRET_ENV]: SECRET,
  ...overrides,
});

const normalizedRequest = (overrides = {}) => ({
  intent: "housing",
  topic: "mortgage",
  phone: "+420731830897",
  email: "david@example.cz",
  firstName: "David Pokorný",
  preferredCallTime: "afternoon",
  source: {
    route: "/ziskat-prehled/",
    cta: "service-mortgage",
    context: "service-detail",
  },
  privacyNoticeVersion: "overview-contact-v1",
  submittedAt: SUBMITTED_AT,
  idempotencyKey: IDEMPOTENCY_KEY,
  ...overrides,
});

const assertFailure = async (operation, failure) => {
  await assert.rejects(operation, (error) => {
    assert.ok(error instanceof PhoneFirstSubmissionError);
    assert.equal(error.failure, failure);
    assert.equal(error.message, "Phone-first submission was not accepted.");
    return true;
  });
};

describe("phone-first production configuration", () => {
  it("uses the durable adapter in production and only by explicit opt-in elsewhere", () => {
    assert.equal(resolvePhoneFirstRuntimeMode({ NODE_ENV: "production" }), "durable");
    assert.equal(resolvePhoneFirstRuntimeMode({ NODE_ENV: "development" }), "memory");
    assert.equal(resolvePhoneFirstRuntimeMode({
      NODE_ENV: "development",
      [PHONE_FIRST_RUNTIME_MODE_ENV]: "durable",
    }), "durable");
    assert.equal(resolvePhoneFirstRuntimeMode({
      NODE_ENV: "test",
      [PHONE_FIRST_RUNTIME_MODE_ENV]: "memory",
    }), "memory");

    for (const environment of [
      { NODE_ENV: "production", [PHONE_FIRST_RUNTIME_MODE_ENV]: "memory" },
      { NODE_ENV: "development", [PHONE_FIRST_RUNTIME_MODE_ENV]: " durable" },
      { NODE_ENV: "test", [PHONE_FIRST_RUNTIME_MODE_ENV]: "automatic" },
    ]) {
      assert.throws(
        () => resolvePhoneFirstRuntimeMode(environment),
        PhoneFirstConfigurationError,
      );
    }
  });

  it("builds only the fixed endpoint and applies a bounded default timeout", () => {
    const config = parsePhoneFirstProductionConfig(configEnvironment());
    assert.deepEqual(config, {
      endpointUrl: `https://lead-api.example.test${PHONE_FIRST_INTAKE_PATH}`,
      receiptHmacSecret: Buffer.from(SECRET),
      timeoutMs: 5_000,
    });

    const loopback = parsePhoneFirstProductionConfig(configEnvironment({
      [PHONE_FIRST_INTAKE_ORIGIN_ENV]: "http://127.0.0.1:8080/",
      [PHONE_FIRST_TIMEOUT_ENV]: "250",
    }));
    assert.equal(
      loopback.endpointUrl,
      `http://127.0.0.1:8080${PHONE_FIRST_INTAKE_PATH}`,
    );
    assert.equal(loopback.timeoutMs, 250);
  });

  it("loads the target receipt secret from one owner-only exact 32-byte file", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "pokornydavid-receipt-secret-"));
    const secretPath = path.join(directory, "receipt.key");
    const linkPath = path.join(directory, "receipt-link.key");
    const secret = Buffer.alloc(32, 0x5a);
    writeFileSync(secretPath, secret, { mode: 0o600 });
    symlinkSync(secretPath, linkPath);
    try {
      const environment = configEnvironment({
        [PHONE_FIRST_RECEIPT_SECRET_ENV]: undefined,
        [PHONE_FIRST_RECEIPT_SECRET_FILE_ENV]: secretPath,
      });
      const config = parsePhoneFirstProductionConfig(environment);
      assert.deepEqual(Buffer.from(config.receiptHmacSecret), secret);
      assert.throws(() => parsePhoneFirstProductionConfig({
        ...environment,
        [PHONE_FIRST_RECEIPT_SECRET_ENV]: SECRET,
      }), PhoneFirstConfigurationError);
      assert.throws(() => parsePhoneFirstProductionConfig({
        ...environment,
        [PHONE_FIRST_RECEIPT_SECRET_FILE_ENV]: linkPath,
      }), PhoneFirstConfigurationError);
      writeFileSync(secretPath, Buffer.alloc(31), { mode: 0o600 });
      assert.throws(() => parsePhoneFirstProductionConfig(environment), PhoneFirstConfigurationError);
    } finally {
      secret.fill(0);
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails closed for absent, ambiguous or unsafe configuration", () => {
    const invalidEnvironments = [
      {},
      configEnvironment({ [PHONE_FIRST_RECEIPT_SECRET_ENV]: "too-short" }),
      configEnvironment({
        [PHONE_FIRST_INTAKE_ORIGIN_ENV]: "http://lead-api.example.test",
      }),
      configEnvironment({
        [PHONE_FIRST_INTAKE_ORIGIN_ENV]: "https://lead-api.example.test/base",
      }),
      configEnvironment({
        [PHONE_FIRST_INTAKE_ORIGIN_ENV]: "https://lead-api.example.test?target=x",
      }),
      configEnvironment({ [PHONE_FIRST_TIMEOUT_ENV]: "249" }),
      configEnvironment({ [PHONE_FIRST_TIMEOUT_ENV]: "10001" }),
      configEnvironment({ [PHONE_FIRST_TIMEOUT_ENV]: "0500" }),
    ];

    for (const environment of invalidEnvironments) {
      assert.throws(
        () => parsePhoneFirstProductionConfig(environment),
        PhoneFirstConfigurationError,
      );
    }
  });
});

describe("phone-first retry identity", () => {
  it("reuses the server-carried first-attempt timestamp for an exact retry", () => {
    const first = resolveOverviewSubmittedAt(
      undefined,
      () => new Date(SUBMITTED_AT),
    );
    const retry = resolveOverviewSubmittedAt(
      first.submittedAt,
      () => new Date("2026-08-21T11:22:33.444Z"),
    );

    assert.deepEqual(first, { submittedAt: SUBMITTED_AT, valid: true });
    assert.deepEqual(retry, first);
  });

  it("fails closed when a carried retry timestamp is not canonical", () => {
    const result = resolveOverviewSubmittedAt(
      "2026-08-20T12:20:30.123+02:00",
    );
    assert.equal(result.valid, false);
  });
});

describe("phone-first request contract", () => {
  it("serializes the exact snake-case wire without the idempotency key", () => {
    assert.deepEqual(buildPhoneFirstWireRequest(normalizedRequest()), {
      schema_version: 1,
      intent: "housing",
      topic: "mortgage",
      offering_key: "hypoteka-a-financovani",
      phone: "+420731830897",
      first_name: "David Pokorný",
      preferred_call_time: "afternoon",
      source: {
        route: "/ziskat-prehled/",
        cta: "service-mortgage",
        context: "service-detail",
      },
      privacy_notice_version: "overview-contact-v1",
      submitted_at: SUBMITTED_AT,
    });
  });

  it("derives every offering key from the closed topic map", () => {
    const topicIntents = {
      "financial-plan": "overview",
      mortgage: "housing",
      "property-sale": "housing",
      "business-financing": "financing",
      "income-protection": "protection",
      "property-insurance": "protection",
      "vehicle-insurance": "protection",
      "liability-insurance": "protection",
      investments: "future",
      "mortgage-refixation": "housing",
    };
    assert.deepEqual(leadTopicOfferingKeys, {
      "financial-plan": "financni-plan",
      mortgage: "hypoteka-a-financovani",
      "property-sale": "prodej-nemovitosti",
      "business-financing": "spotrebitelske-a-podnikatelske-uvery",
      "income-protection": "zajisteni-prijmu",
      "property-insurance": "pojisteni-majetku",
      "vehicle-insurance": "pojisteni-vozidla",
      "liability-insurance": "pojisteni-odpovednosti",
      investments: "investice-a-sporeni",
      "mortgage-refixation": "hypoteka-a-financovani",
    });

    const manifest = JSON.parse(readFileSync(
      new URL("../../content/axiom/services.v1.json", import.meta.url),
      "utf8",
    ));
    const manifestTopicKeys = Object.fromEntries(manifest.items.map((item) => [
      item.presentation.lead_topic,
      item.key,
    ]));
    const {
      "mortgage-refixation": refixationOfferingKey,
      ...manifestBoundTopicKeys
    } = leadTopicOfferingKeys;
    assert.equal(manifest.items.length, 9);
    assert.deepEqual(manifestBoundTopicKeys, manifestTopicKeys);
    assert.equal(refixationOfferingKey, manifestTopicKeys.mortgage);

    for (const [topic, offeringKey] of Object.entries(leadTopicOfferingKeys)) {
      const wire = buildPhoneFirstWireRequest(normalizedRequest({
        intent: topicIntents[topic],
        topic,
      }));
      assert.equal(wire.offering_key, offeringKey, topic);
    }
  });

  it("omits absent optional keys and permits an optional note for every intent", () => {
    const minimal = buildPhoneFirstWireRequest({
      intent: "overview",
      phone: "731830897",
      email: "david@example.cz",
      source: { route: "/ziskat-prehled/" },
      privacyNoticeVersion: "overview-contact-v1",
      submittedAt: "2026-08-20T10:20:30Z",
      idempotencyKey: IDEMPOTENCY_KEY,
    });
    assert.deepEqual(Object.keys(minimal), [
      "schema_version",
      "intent",
      "phone",
      "source",
      "privacy_notice_version",
      "submitted_at",
    ]);
    assert.equal(JSON.stringify(minimal).includes("null"), false);

    const unsureRequest = normalizedRequest({
      intent: "unsure",
      situationNote: "Nevím, kde začít.\nProsím o krátký hovor.",
    });
    delete unsureRequest.topic;
    assert.equal(
      buildPhoneFirstWireRequest(unsureRequest).situation_note,
      "Nevím, kde začít.\nProsím o krátký hovor.",
    );
    assert.equal(
      buildPhoneFirstWireRequest(normalizedRequest({
        situationNote: "Rád bych probral hypotéku.",
      })).situation_note,
      "Rád bych probral hypotéku.",
    );
  });

  it("rejects values the lead-api contract cannot accept", () => {
    const invalid = [
      normalizedRequest({ phone: "+420 731 830 897" }),
      normalizedRequest({ email: "david@localhost" }),
      normalizedRequest({ idempotencyKey: IDEMPOTENCY_KEY.toUpperCase() }),
      normalizedRequest({ topic: "investments" }),
      normalizedRequest({ situationNote: "" }),
      normalizedRequest({ situationNote: "A".repeat(501) }),
      normalizedRequest({ firstName: " David" }),
      normalizedRequest({ submittedAt: "2026-02-30T10:20:30Z" }),
      normalizedRequest({ source: { route: "/ziskat-prehled" } }),
      normalizedRequest({ source: {
        route: "/ziskat-prehled/",
        cta: "unregistered-cta",
      } }),
      normalizedRequest({ unexpected: "field" }),
    ];
    for (const input of invalid) {
      assert.throws(
        () => buildPhoneFirstWireRequest(input),
        PhoneFirstSubmissionError,
      );
    }
  });

  it("keeps the adapter CTA registry aligned with the live form registry", () => {
    assert.equal(PHONE_FIRST_ALLOWED_CTA_IDS.length, 42);
    for (const cta of PHONE_FIRST_ALLOWED_CTA_IDS) {
      assert.equal(isAllowedLeadCta(cta), true, cta);
    }
  });
});

describe("phone-first HTTP sink", () => {
  it("posts the exact JSON contract with no-store, timeout and idempotency", async () => {
    const calls = [];
    const sink = createPhoneFirstHttpSink(
      parsePhoneFirstProductionConfig(configEnvironment({
        [PHONE_FIRST_TIMEOUT_ENV]: "900",
      })),
      async (...args) => {
        calls.push(args);
        return new Response(JSON.stringify({
          schema_version: 1,
          status: "accepted",
          receipt_id: RECEIPT_ID,
        }), {
          status: 202,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      },
    );

    assert.deepEqual(await sink.submit(normalizedRequest()), {
      reference: RECEIPT_ID,
    });
    assert.equal(calls.length, 1);
    const [url, init] = calls[0];
    assert.equal(
      url,
      `https://lead-api.example.test${PHONE_FIRST_INTAKE_PATH}`,
    );
    assert.equal(init.method, "POST");
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "omit");
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    assert.deepEqual(init.headers, {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": IDEMPOTENCY_KEY,
    });
    assert.deepEqual(JSON.parse(init.body), buildPhoneFirstWireRequest(normalizedRequest()));
    assert.equal(Object.hasOwn(JSON.parse(init.body), "idempotency_key"), false);
  });

  it("maps only 409 and 429 to their public form states", async () => {
    for (const [status, failure] of [[409, "duplicate"], [429, "rate-limited"]]) {
      const sink = createPhoneFirstHttpSink(
        parsePhoneFirstProductionConfig(configEnvironment()),
        async () => new Response("closed", { status }),
      );
      await assertFailure(() => sink.submit(normalizedRequest()), failure);
    }
  });

  it("closes every other status and transport failure as unavailable", async () => {
    for (const fetchImplementation of [
      async () => new Response("invalid", { status: 400 }),
      async () => new Response("unavailable", { status: 503 }),
      async () => { throw new DOMException("timed out", "AbortError"); },
    ]) {
      const sink = createPhoneFirstHttpSink(
        parsePhoneFirstProductionConfig(configEnvironment()),
        fetchImplementation,
      );
      await assertFailure(() => sink.submit(normalizedRequest()), "unavailable");
    }
  });

  it("strictly validates and bounds the accepted response", async (context) => {
    const invalidResponses = [
      new Response(JSON.stringify({
        schema_version: 1,
        status: "accepted",
        receipt_id: RECEIPT_ID,
      }), { status: 202, headers: { "Content-Type": "text/plain" } }),
      new Response("not-json", {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(
        `{"schema_version":1,"status":"accepted","status":"accepted","receipt_id":"${RECEIPT_ID}"}`,
        { status: 202, headers: { "Content-Type": "application/json" } },
      ),
      new Response(JSON.stringify({
        schema_version: 1,
        status: "accepted",
        receipt_id: RECEIPT_ID,
        extra: true,
      }), { status: 202, headers: { "Content-Type": "application/json" } }),
      new Response(JSON.stringify({
        status: "accepted",
        schema_version: 1,
        receipt_id: RECEIPT_ID,
      }), { status: 202, headers: { "Content-Type": "application/json" } }),
      new Response(JSON.stringify({
        schema_version: 1,
        status: "accepted",
        receipt_id: RECEIPT_ID.toUpperCase(),
      }), { status: 202, headers: { "Content-Type": "application/json" } }),
      new Response(new Uint8Array([0xff]), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
      new Response("x".repeat(4_097), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(null, {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
    ];

    for (const response of invalidResponses) {
      await context.test(response.headers.get("content-type") ?? "empty body", async () => {
        const sink = createPhoneFirstHttpSink(
          parsePhoneFirstProductionConfig(configEnvironment()),
          async () => response,
        );
        await assertFailure(() => sink.submit(normalizedRequest()), "unavailable");
      });
    }
  });
});

describe("stateless signed production receipts", () => {
  it("authenticates a short-lived receipt containing no raw contact PII", async () => {
    let now = Date.parse(SUBMITTED_AT);
    const store = createSignedOverviewReceiptStore(
      { receiptHmacSecret: SECRET },
      () => now,
    );
    const receiptToken = await store.create({
      status: "accepted",
      intent: "housing",
      topic: "mortgage",
      maskedPhone: "+420 ••• ••• 897",
      source: {
        route: "/ziskat-prehled/",
        cta: "service-mortgage",
        context: "service-detail",
      },
      createdAt: SUBMITTED_AT,
    }, 900, RECEIPT_ID);

    const encodedPayload = receiptToken.split(".")[1];
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    assert.deepEqual(Object.keys(payload), [
      "schema_version",
      "kind",
      "receipt_id",
      "status",
      "intent",
      "topic",
      "masked_phone",
      "source",
      "issued_at",
      "expires_at",
    ]);
    assert.equal(JSON.stringify(payload).includes("+420731830897"), false);
    assert.equal(JSON.stringify(payload).includes("David Pokorný"), false);
    assert.equal(JSON.stringify(payload).includes("Nevím"), false);
    assert.equal(JSON.stringify(payload).includes(IDEMPOTENCY_KEY), false);
    assert.equal(JSON.stringify(payload).includes(SECRET), false);

    assert.deepEqual(await store.read(receiptToken), {
      id: RECEIPT_ID,
      status: "accepted",
      intent: "housing",
      topic: "mortgage",
      maskedPhone: "+420 ••• ••• 897",
      source: {
        route: "/ziskat-prehled/",
        cta: "service-mortgage",
        context: "service-detail",
      },
      createdAt: "2026-08-20T10:20:30.000Z",
    });

    const replacement = receiptToken.endsWith("A") ? "B" : "A";
    assert.equal(await store.read(`${receiptToken.slice(0, -1)}${replacement}`), null);
    now += 900_000;
    assert.equal(await store.read(receiptToken), null);
  });

  it("uses a signed receipt-bound claim marker instead of server memory", async () => {
    const now = Date.parse(SUBMITTED_AT);
    const createStore = () => createSignedOverviewReceiptStore(
      { receiptHmacSecret: SECRET },
      () => now,
    );
    const receiptToken = await createStore().create({
      status: "accepted",
      intent: "overview",
      maskedPhone: "••• ••• 897",
      source: { route: "/ziskat-prehled/" },
      createdAt: SUBMITTED_AT,
    }, 900, RECEIPT_ID);

    const firstClaim = await createStore().claimAnalytics(receiptToken);
    assert.equal(firstClaim.status, "claimed");
    assert.equal(firstClaim.marker.maxAge, 900);
    const secondClaim = await createStore().claimAnalytics(
      receiptToken,
      firstClaim.marker.value,
    );
    assert.deepEqual(secondClaim, { status: "already-claimed" });

    const tampered = `${firstClaim.marker.value.slice(0, -1)}A`;
    assert.equal(
      (await createStore().claimAnalytics(receiptToken, tampered)).status,
      "claimed",
    );
    assert.deepEqual(await createStore().claimAnalytics("invalid"), {
      status: "missing",
    });
  });
});
