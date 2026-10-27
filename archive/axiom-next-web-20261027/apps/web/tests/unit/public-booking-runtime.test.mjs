import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PUBLIC_BOOKING_MAX_SLOTS,
  PublicBookingContractError,
  parsePublicBookingReadyJson,
  parsePublicBookingReservationRequestJson,
  parsePublicBookingReservationResultJson,
  serializePublicBookingReservationRequest,
} from "../../lib/booking/public-booking-contract.ts";
import {
  PUBLIC_BOOKING_MAX_RESPONSE_BYTES,
  PUBLIC_BOOKING_KEY_ENV,
  PUBLIC_BOOKING_ORIGIN_ENV,
  PUBLIC_BOOKING_RESERVATIONS_PATH,
  PUBLIC_BOOKING_RUNTIME_MODE_ENV,
  PUBLIC_BOOKING_SLOTS_PATH,
  PUBLIC_BOOKING_TIMEOUT_ENV,
  PublicBookingConfigurationError,
  createDevelopmentPublicBookingRuntime,
  createPublicBookingHttpRuntime,
  parsePublicBookingProductionConfig,
  resolvePublicBookingRuntimeMode,
} from "../../lib/booking/public-booking-runtime.server.ts";

const IDEMPOTENCY_KEY = "2d6cdf60-2964-48b7-a1e4-6b44f7ecce5c";
const SECOND_IDEMPOTENCY_KEY = "d068c0a2-6472-436e-bc86-5d9d4678c6a9";
const RECEIPT_ID = "01991ff0-c2b1-74bd-a99d-b728e61b46bf";
const SECOND_RECEIPT_ID = "01991ff0-c2b1-74bd-a99d-b728e61b46c0";
const BOOKING_ID = "2aa92a50-b891-5eb2-8ee5-8e40249acbef";
const BOOKING_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

function slot(overrides = {}) {
  return {
    slot_token: "slot.v1.abcdefghijklmnopqrstuvwxyz0123456789",
    starts_at: "2026-09-10T08:00:00.000Z",
    ends_at: "2026-09-10T08:30:00.000Z",
    timezone: "Europe/Prague",
    mode: "phone",
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    schema_version: 1,
    idempotency_key: IDEMPOTENCY_KEY,
    source_receipt_id: RECEIPT_ID,
    slot_token: slot().slot_token,
    ...overrides,
  };
}

function jsonResponse(source, status = 200, headers = {}) {
  return new Response(
    typeof source === "string" ? source : JSON.stringify(source),
    {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    },
  );
}

function config(overrides = {}) {
  return {
    origin: "https://booking.example.test",
    slotsEndpointUrl: `https://booking.example.test${PUBLIC_BOOKING_SLOTS_PATH}`,
    reservationsEndpointUrl:
      `https://booking.example.test${PUBLIC_BOOKING_RESERVATIONS_PATH}`,
    bookingKey: BOOKING_KEY,
    timeoutMs: 5_000,
    ...overrides,
  };
}

describe("public booking wire contract", () => {
  it("serializes the exact reservation request and parses it back", () => {
    const serialized = serializePublicBookingReservationRequest(request());
    assert.equal(
      serialized,
      `{"schema_version":1,"idempotency_key":"${IDEMPOTENCY_KEY}","source_receipt_id":"${RECEIPT_ID}","slot_token":"${slot().slot_token}"}`,
    );
    assert.deepEqual(parsePublicBookingReservationRequestJson(serialized), request());
  });

  it("rejects request additions, malformed identities and duplicate JSON keys", () => {
    const invalid = [
      { ...request(), internal_contact_id: RECEIPT_ID },
      request({ schema_version: 2 }),
      request({ idempotency_key: RECEIPT_ID }),
      request({ source_receipt_id: "receipt-1" }),
      request({ slot_token: "short" }),
    ];

    for (const candidate of invalid) {
      assert.throws(
        () => serializePublicBookingReservationRequest(candidate),
        PublicBookingContractError,
      );
    }

    assert.throws(
      () =>
        parsePublicBookingReservationRequestJson(
          `{"schema_version":1,"schema_version":1,"idempotency_key":"${IDEMPOTENCY_KEY}","source_receipt_id":"${RECEIPT_ID}","slot_token":"${slot().slot_token}"}`,
        ),
      PublicBookingContractError,
    );
  });

  it("accepts at most twelve exact, unique slots", () => {
    const slots = Array.from({ length: PUBLIC_BOOKING_MAX_SLOTS }, (_, index) =>
      slot({
        slot_token: `slot.v1.${String(index).padStart(2, "0")}.abcdefghijklmnopqrstuvwxyz`,
        starts_at: `2026-09-${String(10 + index).padStart(2, "0")}T08:00:00Z`,
        ends_at: `2026-09-${String(10 + index).padStart(2, "0")}T08:30:00Z`,
        mode: index % 2 === 0 ? "phone" : "video",
      }),
    );

    const parsed = parsePublicBookingReadyJson(
      JSON.stringify({ schema_version: 1, status: "ready", slots }),
    );
    assert.equal(parsed.status, "ready");
    assert.equal(parsed.slots.length, PUBLIC_BOOKING_MAX_SLOTS);
    assert.ok(Object.isFrozen(parsed));
    assert.ok(Object.isFrozen(parsed.slots));
  });

  it("rejects oversized, duplicate, malformed and leaky slot lists", () => {
    const invalidSlots = [
      [...Array.from({ length: PUBLIC_BOOKING_MAX_SLOTS }, (_, index) =>
        slot({ slot_token: `slot.v1.${index}.abcdefghijklmnopqrstuvwxyz` })), slot()],
      [slot(), slot()],
      [slot({ ends_at: "2026-09-10T07:30:00.000Z" })],
      [slot({ starts_at: "2026-02-30T08:00:00Z" })],
      [slot({ timezone: "Not/A_Timezone" })],
      [slot({ mode: "chat" })],
      [slot({ private_resource_id: RECEIPT_ID })],
    ];

    for (const slots of invalidSlots) {
      assert.throws(
        () => parsePublicBookingReadyJson(
          JSON.stringify({ schema_version: 1, status: "ready", slots }),
        ),
        PublicBookingContractError,
      );
    }

    assert.throws(
      () =>
        parsePublicBookingReadyJson(
          '{"schema_version":1,"status":"ready","status":"ready","slots":[]}',
        ),
      PublicBookingContractError,
    );
    assert.throws(
      () =>
        parsePublicBookingReadyJson(
          '{"schema_version":1,"status":"ready","slots":[]} trailing',
        ),
      PublicBookingContractError,
    );
  });

  it("parses only exact confirmed and conflict results", () => {
    assert.deepEqual(
      parsePublicBookingReservationResultJson(JSON.stringify({
        schema_version: 1,
        status: "confirmed",
        booking_id: BOOKING_ID,
        slot: slot(),
      })),
      {
        schema_version: 1,
        status: "confirmed",
        booking_id: BOOKING_ID,
        slot: slot(),
      },
    );
    assert.deepEqual(
      parsePublicBookingReservationResultJson(
        '{"schema_version":1,"status":"conflict"}',
      ),
      { schema_version: 1, status: "conflict" },
    );

    for (const value of [
      { schema_version: 1, status: "unavailable" },
      { schema_version: 1, status: "conflict", reason: "occupied" },
      {
        schema_version: 1,
        status: "confirmed",
        booking_id: "not-a-booking-id",
        slot: slot(),
      },
    ]) {
      assert.throws(
        () => parsePublicBookingReservationResultJson(JSON.stringify(value)),
        PublicBookingContractError,
      );
    }
  });
});

describe("public booking production configuration", () => {
  it("selects durable in production and forbids memory there", () => {
    assert.equal(resolvePublicBookingRuntimeMode({ NODE_ENV: "production" }), "durable");
    assert.equal(resolvePublicBookingRuntimeMode({ NODE_ENV: "development" }), "memory");
    assert.equal(resolvePublicBookingRuntimeMode({
      NODE_ENV: "development",
      [PUBLIC_BOOKING_RUNTIME_MODE_ENV]: "durable",
    }), "durable");

    for (const environment of [
      { NODE_ENV: "production", [PUBLIC_BOOKING_RUNTIME_MODE_ENV]: "memory" },
      { NODE_ENV: "development", [PUBLIC_BOOKING_RUNTIME_MODE_ENV]: " memory" },
      { NODE_ENV: "test", [PUBLIC_BOOKING_RUNTIME_MODE_ENV]: "automatic" },
    ]) {
      assert.throws(
        () => resolvePublicBookingRuntimeMode(environment),
        PublicBookingConfigurationError,
      );
    }
  });

  it("derives fixed endpoints from an HTTPS or loopback-only origin", () => {
    assert.deepEqual(
      parsePublicBookingProductionConfig({
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test/",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
      }),
      config(),
    );
    assert.deepEqual(
      parsePublicBookingProductionConfig({
        [PUBLIC_BOOKING_ORIGIN_ENV]: "http://127.0.0.1:8080",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
        [PUBLIC_BOOKING_TIMEOUT_ENV]: "250",
      }),
      {
        origin: "http://127.0.0.1:8080",
        slotsEndpointUrl: `http://127.0.0.1:8080${PUBLIC_BOOKING_SLOTS_PATH}`,
        reservationsEndpointUrl:
          `http://127.0.0.1:8080${PUBLIC_BOOKING_RESERVATIONS_PATH}`,
        bookingKey: BOOKING_KEY,
        timeoutMs: 250,
      },
    );
  });

  it("fails closed for absent, ambiguous or unsafe configuration", () => {
    for (const environment of [
      {},
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test",
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: "too-short",
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: `${BOOKING_KEY}=`,
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: `${BOOKING_KEY.slice(0, -1)}9`,
      },
      { [PUBLIC_BOOKING_ORIGIN_ENV]: " http://127.0.0.1:8080" },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "http://booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test/base",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://user@booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test?target=x",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
        [PUBLIC_BOOKING_TIMEOUT_ENV]: "249",
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
        [PUBLIC_BOOKING_TIMEOUT_ENV]: "10001",
      },
      {
        [PUBLIC_BOOKING_ORIGIN_ENV]: "https://booking.example.test",
        [PUBLIC_BOOKING_KEY_ENV]: BOOKING_KEY,
        [PUBLIC_BOOKING_TIMEOUT_ENV]: "0500",
      },
    ]) {
      assert.throws(
        () => parsePublicBookingProductionConfig(environment),
        PublicBookingConfigurationError,
      );
    }
  });

  it("does not let a caller replace either fixed HTTP endpoint", () => {
    assert.throws(
      () => createPublicBookingHttpRuntime(config({
        reservationsEndpointUrl: "https://attacker.example/reserve",
      })),
      PublicBookingConfigurationError,
    );
    assert.throws(
      () => createPublicBookingHttpRuntime(config({
        origin: "http://booking.example.test",
        slotsEndpointUrl:
          `http://booking.example.test${PUBLIC_BOOKING_SLOTS_PATH}`,
        reservationsEndpointUrl:
          `http://booking.example.test${PUBLIC_BOOKING_RESERVATIONS_PATH}`,
      })),
      PublicBookingConfigurationError,
    );
  });
});

describe("development public booking adapter", () => {
  it("generates a bounded deterministic, PII-free slot set", async () => {
    const options = { now: () => Date.parse("2026-09-02T12:00:00.000Z") };
    const first = createDevelopmentPublicBookingRuntime(options);
    const second = createDevelopmentPublicBookingRuntime(options);
    const firstResult = await first.listSlots();
    const secondResult = await second.listSlots();

    assert.deepEqual(firstResult, secondResult);
    assert.equal(firstResult.status, "ready");
    assert.equal(firstResult.slots.length, 6);
    assert.ok(firstResult.slots.length <= PUBLIC_BOOKING_MAX_SLOTS);
    const serialized = JSON.stringify(firstResult);
    assert.doesNotMatch(serialized, /name|email|phone_number|contact_id/iu);
  });

  it("confirms once, replays exactly and conflicts after the slot is claimed", async () => {
    const runtime = createDevelopmentPublicBookingRuntime({
      now: () => Date.parse("2026-09-02T12:00:00.000Z"),
    });
    const ready = await runtime.listSlots();
    assert.equal(ready.status, "ready");
    const candidate = ready.slots[0];
    assert.ok(candidate);

    const reservation = request({ slot_token: candidate.slot_token });
    const confirmed = await runtime.reserve(reservation);
    assert.equal(confirmed.status, "confirmed");
    assert.deepEqual(await runtime.reserve(reservation), confirmed);

    const after = await runtime.listSlots();
    assert.equal(after.status, "ready");
    assert.equal(after.slots.length, ready.slots.length - 1);
    assert.ok(!after.slots.some((item) => item.slot_token === candidate.slot_token));

    assert.deepEqual(
      await runtime.reserve(request({
        idempotency_key: SECOND_IDEMPOTENCY_KEY,
        source_receipt_id: SECOND_RECEIPT_ID,
        slot_token: candidate.slot_token,
      })),
      { schema_version: 1, status: "conflict" },
    );
    assert.deepEqual(
      await runtime.reserve(request({
        slot_token: ready.slots[1].slot_token,
      })),
      { schema_version: 1, status: "unavailable" },
    );
  });
});

describe("HTTP public booking adapter", () => {
  it("requests ready slots with bounded, no-redirect server semantics", async () => {
    const calls = [];
    const runtime = createPublicBookingHttpRuntime(config(), async (...args) => {
      calls.push(args);
      return jsonResponse({ schema_version: 1, status: "ready", slots: [slot()] });
    });

    const result = await runtime.listSlots();
    assert.equal(result.status, "ready");
    assert.equal(calls[0][0], config().slotsEndpointUrl);
    assert.equal(calls[0][1].method, "GET");
    assert.deepEqual(calls[0][1].headers, {
      Accept: "application/json",
      "X-Axiom-Booking-Key": BOOKING_KEY,
    });
    assert.equal(calls[0][1].cache, "no-store");
    assert.equal(calls[0][1].credentials, "omit");
    assert.equal(calls[0][1].redirect, "error");
    assert.ok(calls[0][1].signal instanceof AbortSignal);
  });

  it("posts only the exact reservation body and preserves idempotency", async () => {
    const calls = [];
    const runtime = createPublicBookingHttpRuntime(config(), async (...args) => {
      calls.push(args);
      return jsonResponse({
        schema_version: 1,
        status: "confirmed",
        booking_id: BOOKING_ID,
        slot: slot(),
      }, 201);
    });

    const result = await runtime.reserve(request());
    assert.equal(result.status, "confirmed");
    assert.equal(calls[0][0], config().reservationsEndpointUrl);
    assert.equal(calls[0][1].method, "POST");
    assert.deepEqual(calls[0][1].headers, {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": IDEMPOTENCY_KEY,
      "X-Axiom-Booking-Key": BOOKING_KEY,
    });
    assert.deepEqual(JSON.parse(calls[0][1].body), request());
    assert.equal(Object.keys(JSON.parse(calls[0][1].body)).length, 4);
  });

  it("maps a canonical 409 response to conflict", async () => {
    const runtime = createPublicBookingHttpRuntime(config(), async () =>
      jsonResponse({ schema_version: 1, status: "conflict" }, 409),
    );
    assert.deepEqual(await runtime.reserve(request()), {
      schema_version: 1,
      status: "conflict",
    });
  });

  it("fails closed to unavailable for transport, status and strict-contract errors", async () => {
    const outcomes = [
      async () => { throw new Error("network unavailable"); },
      async () => new Response("private", { status: 503 }),
      async () => jsonResponse(
        '{"schema_version":1,"status":"ready","status":"ready","slots":[]}',
      ),
      async () => new Response("{}", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
      async () => jsonResponse("{}", 200, {
        "Content-Length": String(PUBLIC_BOOKING_MAX_RESPONSE_BYTES + 1),
      }),
      async () => new Response(new Uint8Array([0xff]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ];

    for (const fetchImplementation of outcomes) {
      const runtime = createPublicBookingHttpRuntime(
        config(),
        fetchImplementation,
      );
      assert.deepEqual(await runtime.listSlots(), {
        schema_version: 1,
        status: "unavailable",
      });
    }
  });

  it("does not accept status/body mismatches", async () => {
    const confirmedAsConflict = createPublicBookingHttpRuntime(
      config(),
      async () => jsonResponse({
        schema_version: 1,
        status: "confirmed",
        booking_id: BOOKING_ID,
        slot: slot(),
      }, 409),
    );
    const conflictAsSuccess = createPublicBookingHttpRuntime(
      config(),
      async () => jsonResponse({ schema_version: 1, status: "conflict" }, 200),
    );

    assert.equal((await confirmedAsConflict.reserve(request())).status, "unavailable");
    assert.equal((await conflictAsSuccess.reserve(request())).status, "unavailable");
  });
});
