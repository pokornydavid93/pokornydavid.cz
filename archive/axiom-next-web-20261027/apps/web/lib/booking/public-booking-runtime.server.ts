import { createHash } from "node:crypto";

import {
  PUBLIC_BOOKING_UNAVAILABLE_RESULT,
  parsePublicBookingReadyJson,
  parsePublicBookingReservationResultJson,
  serializePublicBookingReservationRequest,
  type PublicBookingAvailabilityResult,
  type PublicBookingConfirmedResult,
  type PublicBookingMode,
  type PublicBookingReadyResult,
  type PublicBookingReservationRequest,
  type PublicBookingReservationResult,
  type PublicBookingSlot,
} from "./public-booking-contract.ts";

export const PUBLIC_BOOKING_SLOTS_PATH = "/public/booking/slots/v1";
export const PUBLIC_BOOKING_RESERVATIONS_PATH =
  "/public/booking/reservations/v1";
export const PUBLIC_BOOKING_RUNTIME_MODE_ENV = "AXIOM_PUBLIC_BOOKING_RUNTIME";
export const PUBLIC_BOOKING_ORIGIN_ENV = "AXIOM_PUBLIC_BOOKING_ORIGIN";
export const PUBLIC_BOOKING_KEY_ENV = "AXIOM_PUBLIC_BOOKING_KEY";
export const PUBLIC_BOOKING_TIMEOUT_ENV = "AXIOM_PUBLIC_BOOKING_TIMEOUT_MS";
export const PUBLIC_BOOKING_MAX_RESPONSE_BYTES = 64 * 1024;

const DEFAULT_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 10_000;
const JSON_CONTENT_TYPE_PATTERN =
  /^application\/json(?:\s*;\s*charset=utf-8)?$/iu;
const CONTENT_LENGTH_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const BOOKING_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const MAX_RESPONSE_BYTES_TEXT = String(PUBLIC_BOOKING_MAX_RESPONSE_BYTES);

function isCanonicalPublicBookingKey(value: string): boolean {
  if (!BOOKING_KEY_PATTERN.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length === 32 && decoded.toString("base64url") === value;
}

export type PublicBookingRuntimeMode = "memory" | "durable";

export type PublicBookingProductionConfig = Readonly<{
  origin: string;
  slotsEndpointUrl: string;
  reservationsEndpointUrl: string;
  bookingKey: string;
  timeoutMs: number;
}>;

export interface PublicBookingRuntime {
  listSlots(): Promise<PublicBookingAvailabilityResult>;
  reserve(
    request: PublicBookingReservationRequest,
  ): Promise<PublicBookingReservationResult>;
}

export class PublicBookingConfigurationError extends Error {
  constructor() {
    super("Public booking production configuration is invalid.");
    this.name = "PublicBookingConfigurationError";
  }
}

const configurationError = (): never => {
  throw new PublicBookingConfigurationError();
};

const isLoopbackHostname = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "[::1]";

export function resolvePublicBookingRuntimeMode(
  environment: Record<string, string | undefined>,
): PublicBookingRuntimeMode {
  const configuredMode = environment[PUBLIC_BOOKING_RUNTIME_MODE_ENV];
  const production = environment.NODE_ENV === "production";

  if (configuredMode === undefined || configuredMode === "") {
    return production ? "durable" : "memory";
  }
  if (configuredMode !== configuredMode.trim()) return configurationError();
  if (configuredMode === "durable") return "durable";
  if (configuredMode === "memory" && !production) return "memory";
  return configurationError();
}

export function parsePublicBookingProductionConfig(
  environment: Record<string, string | undefined>,
): PublicBookingProductionConfig {
  const rawOrigin = environment[PUBLIC_BOOKING_ORIGIN_ENV];
  const bookingKey = environment[PUBLIC_BOOKING_KEY_ENV];
  const rawTimeout = environment[PUBLIC_BOOKING_TIMEOUT_ENV];

  if (
    !rawOrigin ||
    rawOrigin !== rawOrigin.trim() ||
    rawOrigin.length > 2_048
  ) {
    return configurationError();
  }
  if (
    !bookingKey ||
    bookingKey !== bookingKey.trim() ||
    !isCanonicalPublicBookingKey(bookingKey)
  ) {
    return configurationError();
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(rawOrigin);
  } catch {
    return configurationError();
  }

  const canonicalOrigin = rawOrigin.endsWith("/")
    ? rawOrigin.slice(0, -1)
    : rawOrigin;
  if (
    canonicalOrigin !== parsedOrigin.origin ||
    (parsedOrigin.protocol !== "https:" &&
      !(parsedOrigin.protocol === "http:" &&
        isLoopbackHostname(parsedOrigin.hostname))) ||
    parsedOrigin.username !== "" ||
    parsedOrigin.password !== "" ||
    (parsedOrigin.pathname !== "/" && parsedOrigin.pathname !== "") ||
    parsedOrigin.search !== "" ||
    parsedOrigin.hash !== ""
  ) {
    return configurationError();
  }

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (rawTimeout !== undefined) {
    if (!/^[1-9][0-9]*$/u.test(rawTimeout)) return configurationError();
    timeoutMs = Number(rawTimeout);
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < MIN_TIMEOUT_MS ||
      timeoutMs > MAX_TIMEOUT_MS
    ) {
      return configurationError();
    }
  }

  const origin = parsedOrigin.origin;
  return Object.freeze({
    origin,
    slotsEndpointUrl: `${origin}${PUBLIC_BOOKING_SLOTS_PATH}`,
    reservationsEndpointUrl: `${origin}${PUBLIC_BOOKING_RESERVATIONS_PATH}`,
    bookingKey,
    timeoutMs,
  });
}

function exceedsResponseLimit(value: string) {
  return (
    !CONTENT_LENGTH_PATTERN.test(value) ||
    value.length > MAX_RESPONSE_BYTES_TEXT.length ||
    (value.length === MAX_RESPONSE_BYTES_TEXT.length &&
      value > MAX_RESPONSE_BYTES_TEXT)
  );
}

async function cancelResponse(response: Response) {
  await response.body?.cancel().catch(() => undefined);
}

async function readBoundedJsonSource(response: Response): Promise<string> {
  if (
    !JSON_CONTENT_TYPE_PATTERN.test(response.headers.get("content-type") ?? "")
  ) {
    await cancelResponse(response);
    throw new Error("invalid_response");
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && exceedsResponseLimit(declaredLength)) {
    await cancelResponse(response);
    throw new Error("invalid_response");
  }
  if (response.body === null) throw new Error("invalid_response");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > PUBLIC_BOOKING_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("invalid_response");
      }
      chunks.push(value);
    }
  } catch {
    throw new Error("invalid_response");
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new Error("invalid_response");
  }
}

async function fetchWithTimeout(
  fetchImplementation: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  return fetchImplementation(url, {
    ...init,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export function createPublicBookingHttpRuntime(
  config: PublicBookingProductionConfig,
  fetchImplementation: typeof fetch = globalThis.fetch,
): PublicBookingRuntime {
  if (
    !config ||
    typeof config !== "object" ||
    typeof config.slotsEndpointUrl !== "string" ||
    typeof config.reservationsEndpointUrl !== "string" ||
    !Number.isSafeInteger(config.timeoutMs) ||
    config.timeoutMs < MIN_TIMEOUT_MS ||
    config.timeoutMs > MAX_TIMEOUT_MS ||
    typeof fetchImplementation !== "function"
  ) {
    return configurationError();
  }

  let canonicalConfig: PublicBookingProductionConfig;
  try {
    canonicalConfig = parsePublicBookingProductionConfig({
      [PUBLIC_BOOKING_ORIGIN_ENV]: config.origin,
      [PUBLIC_BOOKING_KEY_ENV]: config.bookingKey,
      [PUBLIC_BOOKING_TIMEOUT_ENV]: String(config.timeoutMs),
    });
  } catch {
    return configurationError();
  }
  if (
    config.slotsEndpointUrl !== canonicalConfig.slotsEndpointUrl ||
    config.reservationsEndpointUrl !== canonicalConfig.reservationsEndpointUrl ||
    config.bookingKey !== canonicalConfig.bookingKey
  ) {
    return configurationError();
  }

  return Object.freeze({
    async listSlots(): Promise<PublicBookingAvailabilityResult> {
      try {
        const response = await fetchWithTimeout(
          fetchImplementation,
          canonicalConfig.slotsEndpointUrl,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "X-Axiom-Booking-Key": canonicalConfig.bookingKey,
            },
          },
          canonicalConfig.timeoutMs,
        );

        if (response.status !== 200) {
          await cancelResponse(response);
          return PUBLIC_BOOKING_UNAVAILABLE_RESULT;
        }

        return parsePublicBookingReadyJson(await readBoundedJsonSource(response));
      } catch {
        return PUBLIC_BOOKING_UNAVAILABLE_RESULT;
      }
    },

    async reserve(
      request: PublicBookingReservationRequest,
    ): Promise<PublicBookingReservationResult> {
      let body: string;
      try {
        body = serializePublicBookingReservationRequest(request);
      } catch {
        return PUBLIC_BOOKING_UNAVAILABLE_RESULT;
      }

      try {
        const response = await fetchWithTimeout(
          fetchImplementation,
          canonicalConfig.reservationsEndpointUrl,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "Idempotency-Key": request.idempotency_key,
              "X-Axiom-Booking-Key": canonicalConfig.bookingKey,
            },
            body,
          },
          canonicalConfig.timeoutMs,
        );

        if (
          response.status !== 200 &&
          response.status !== 201 &&
          response.status !== 409
        ) {
          await cancelResponse(response);
          return PUBLIC_BOOKING_UNAVAILABLE_RESULT;
        }

        const result = parsePublicBookingReservationResultJson(
          await readBoundedJsonSource(response),
        );
        if (response.status === 409) {
          return result.status === "conflict"
            ? result
            : PUBLIC_BOOKING_UNAVAILABLE_RESULT;
        }
        return result.status === "confirmed"
          ? result
          : PUBLIC_BOOKING_UNAVAILABLE_RESULT;
      } catch {
        return PUBLIC_BOOKING_UNAVAILABLE_RESULT;
      }
    },
  });
}

type DevelopmentRuntimeOptions = Readonly<{
  now?: () => number;
  timezone?: string;
}>;

function deterministicUuid(seed: string) {
  const bytes = createHash("sha256").update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function createDevelopmentSlots(
  now: number,
  timezone: string,
): readonly PublicBookingSlot[] {
  const base = new Date(now);
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + 1);

  const definitions: readonly Readonly<{
    dayOffset: number;
    hour: number;
    mode: PublicBookingMode;
  }>[] = [
    { dayOffset: 0, hour: 8, mode: "phone" },
    { dayOffset: 0, hour: 10, mode: "video" },
    { dayOffset: 0, hour: 13, mode: "phone" },
    { dayOffset: 1, hour: 8, mode: "video" },
    { dayOffset: 1, hour: 11, mode: "in_person" },
    { dayOffset: 2, hour: 9, mode: "phone" },
  ];

  return Object.freeze(
    definitions.map(({ dayOffset, hour, mode }) => {
      const startsAt = new Date(base);
      startsAt.setUTCDate(startsAt.getUTCDate() + dayOffset);
      startsAt.setUTCHours(hour);
      const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1_000);
      const starts_at = startsAt.toISOString();
      const ends_at = endsAt.toISOString();
      const digest = createHash("sha256")
        .update(`${starts_at}\0${ends_at}\0${timezone}\0${mode}`)
        .digest("base64url");
      return Object.freeze({
        slot_token: `dev.v1.${digest}`,
        starts_at,
        ends_at,
        timezone,
        mode,
      });
    }),
  );
}

export function createDevelopmentPublicBookingRuntime(
  options: DevelopmentRuntimeOptions = {},
): PublicBookingRuntime {
  const now = options.now ?? Date.now;
  const timezone = options.timezone ?? "Europe/Prague";
  const slots = createDevelopmentSlots(now(), timezone);
  const slotsByToken = new Map(slots.map((slot) => [slot.slot_token, slot]));
  const claimedSlots = new Map<string, string>();
  const idempotentResults = new Map<
    string,
    Readonly<{ fingerprint: string; result: PublicBookingConfirmedResult }>
  >();

  return Object.freeze({
    async listSlots(): Promise<PublicBookingReadyResult> {
      return Object.freeze({
        schema_version: 1,
        status: "ready",
        slots: Object.freeze(
          slots.filter((slot) => !claimedSlots.has(slot.slot_token)),
        ),
      });
    },

    async reserve(
      request: PublicBookingReservationRequest,
    ): Promise<PublicBookingReservationResult> {
      try {
        serializePublicBookingReservationRequest(request);
      } catch {
        return PUBLIC_BOOKING_UNAVAILABLE_RESULT;
      }

      const fingerprint = createHash("sha256")
        .update(`${request.source_receipt_id}\0${request.slot_token}`)
        .digest("base64url");
      const replay = idempotentResults.get(request.idempotency_key);
      if (replay) {
        return replay.fingerprint === fingerprint
          ? replay.result
          : PUBLIC_BOOKING_UNAVAILABLE_RESULT;
      }

      const slot = slotsByToken.get(request.slot_token);
      if (!slot || claimedSlots.has(request.slot_token)) {
        return Object.freeze({ schema_version: 1, status: "conflict" });
      }

      const result: PublicBookingConfirmedResult = Object.freeze({
        schema_version: 1,
        status: "confirmed",
        booking_id: deterministicUuid(
          `${request.idempotency_key}\0${fingerprint}`,
        ),
        slot,
      });
      claimedSlots.set(request.slot_token, fingerprint);
      idempotentResults.set(
        request.idempotency_key,
        Object.freeze({ fingerprint, result }),
      );
      return result;
    },
  });
}

const developmentRuntimeSymbol = Symbol.for(
  "axiom.public-booking.development-runtime",
);

export function getPublicBookingRuntime(
  environment: Record<string, string | undefined> = process.env,
): PublicBookingRuntime {
  if (resolvePublicBookingRuntimeMode(environment) === "durable") {
    return createPublicBookingHttpRuntime(
      parsePublicBookingProductionConfig(environment),
    );
  }

  const globalScope = globalThis as typeof globalThis & {
    [developmentRuntimeSymbol]?: PublicBookingRuntime;
  };
  globalScope[developmentRuntimeSymbol] ??=
    createDevelopmentPublicBookingRuntime();
  return globalScope[developmentRuntimeSymbol];
}
