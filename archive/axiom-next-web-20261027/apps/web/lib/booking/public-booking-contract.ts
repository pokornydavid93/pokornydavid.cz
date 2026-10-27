import { parseContractJson } from "@axiom-dp/contracts/canonical-json";

export const PUBLIC_BOOKING_SCHEMA_VERSION = 1 as const;
export const PUBLIC_BOOKING_MAX_SLOTS = 12;

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const BOOKING_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SOURCE_RECEIPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SLOT_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{16,2048}$/u;
const RFC3339_UTC_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/u;

export const PUBLIC_BOOKING_MODES = [
  "phone",
  "video",
  "in_person",
] as const;

export type PublicBookingMode = (typeof PUBLIC_BOOKING_MODES)[number];

export type PublicBookingSlot = Readonly<{
  slot_token: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  mode: PublicBookingMode;
}>;

export type PublicBookingReadyResult = Readonly<{
  schema_version: 1;
  status: "ready";
  slots: readonly PublicBookingSlot[];
}>;

export type PublicBookingReservationRequest = Readonly<{
  schema_version: 1;
  idempotency_key: string;
  source_receipt_id: string;
  slot_token: string;
}>;

export type SerializedPublicBookingReservationRequest = string & {
  readonly __publicBookingReservationRequest: unique symbol;
};

export type PublicBookingConfirmedResult = Readonly<{
  schema_version: 1;
  status: "confirmed";
  booking_id: string;
  slot: PublicBookingSlot;
}>;

export type PublicBookingConflictResult = Readonly<{
  schema_version: 1;
  status: "conflict";
}>;

export type PublicBookingUnavailableResult = Readonly<{
  schema_version: 1;
  status: "unavailable";
}>;

export type PublicBookingAvailabilityResult =
  | PublicBookingReadyResult
  | PublicBookingUnavailableResult;

export type PublicBookingReservationResult =
  | PublicBookingConfirmedResult
  | PublicBookingConflictResult
  | PublicBookingUnavailableResult;

export type PublicBookingContractErrorCode =
  | "invalid_request"
  | "invalid_response";

export class PublicBookingContractError extends Error {
  readonly code: PublicBookingContractErrorCode;

  constructor(code: PublicBookingContractErrorCode) {
    super(`Public booking contract ${code.replaceAll("_", " ")}.`);
    this.name = "PublicBookingContractError";
    this.code = code;
  }
}

export const PUBLIC_BOOKING_CONFLICT_RESULT: PublicBookingConflictResult =
  Object.freeze({
    schema_version: PUBLIC_BOOKING_SCHEMA_VERSION,
    status: "conflict",
  });

export const PUBLIC_BOOKING_UNAVAILABLE_RESULT: PublicBookingUnavailableResult =
  Object.freeze({
    schema_version: PUBLIC_BOOKING_SCHEMA_VERSION,
    status: "unavailable",
  });

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: UnknownRecord, expected: readonly string[]) {
  const actual = Object.keys(value);
  return (
    actual.length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function isCanonicalUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value !== value.trim()) return false;

  const match = RFC3339_UTC_PATTERN.exec(value);
  if (!match) return false;

  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return false;

  const normalized = new Date(milliseconds).toISOString();
  if (match[7] === undefined) {
    return normalized.replace(".000Z", "Z") === value;
  }

  const millisecondFraction = match[7].padEnd(3, "0").slice(0, 3);
  const comparable = value.replace(/\.\d{1,9}Z$/u, `.${millisecondFraction}Z`);
  return normalized === comparable;
}

function isIanaTimezone(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 100 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function isMode(value: unknown): value is PublicBookingMode {
  return (
    typeof value === "string" &&
    (PUBLIC_BOOKING_MODES as readonly string[]).includes(value)
  );
}

function assertSlot(
  value: unknown,
  failure: PublicBookingContractErrorCode,
): PublicBookingSlot {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "slot_token",
      "starts_at",
      "ends_at",
      "timezone",
      "mode",
    ]) ||
    typeof value.slot_token !== "string" ||
    !SLOT_TOKEN_PATTERN.test(value.slot_token) ||
    !isCanonicalUtcTimestamp(value.starts_at) ||
    !isCanonicalUtcTimestamp(value.ends_at) ||
    Date.parse(value.ends_at) <= Date.parse(value.starts_at) ||
    !isIanaTimezone(value.timezone) ||
    !isMode(value.mode)
  ) {
    throw new PublicBookingContractError(failure);
  }

  return Object.freeze({
    slot_token: value.slot_token,
    starts_at: value.starts_at,
    ends_at: value.ends_at,
    timezone: value.timezone,
    mode: value.mode,
  });
}

function parseStrictJson(
  source: string,
  failure: PublicBookingContractErrorCode,
) {
  if (typeof source !== "string") {
    throw new PublicBookingContractError(failure);
  }

  try {
    return parseContractJson(source) as unknown;
  } catch {
    throw new PublicBookingContractError(failure);
  }
}

export function assertPublicBookingReservationRequest(
  value: unknown,
): PublicBookingReservationRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schema_version",
      "idempotency_key",
      "source_receipt_id",
      "slot_token",
    ]) ||
    value.schema_version !== PUBLIC_BOOKING_SCHEMA_VERSION ||
    typeof value.idempotency_key !== "string" ||
    !IDEMPOTENCY_KEY_PATTERN.test(value.idempotency_key) ||
    typeof value.source_receipt_id !== "string" ||
    !SOURCE_RECEIPT_ID_PATTERN.test(value.source_receipt_id) ||
    typeof value.slot_token !== "string" ||
    !SLOT_TOKEN_PATTERN.test(value.slot_token)
  ) {
    throw new PublicBookingContractError("invalid_request");
  }

  return Object.freeze({
    schema_version: PUBLIC_BOOKING_SCHEMA_VERSION,
    idempotency_key: value.idempotency_key,
    source_receipt_id: value.source_receipt_id,
    slot_token: value.slot_token,
  });
}

export function serializePublicBookingReservationRequest(
  value: unknown,
): SerializedPublicBookingReservationRequest {
  const request = assertPublicBookingReservationRequest(value);
  return JSON.stringify({
    schema_version: request.schema_version,
    idempotency_key: request.idempotency_key,
    source_receipt_id: request.source_receipt_id,
    slot_token: request.slot_token,
  }) as SerializedPublicBookingReservationRequest;
}

export function parsePublicBookingReservationRequestJson(
  source: string,
): PublicBookingReservationRequest {
  return assertPublicBookingReservationRequest(
    parseStrictJson(source, "invalid_request"),
  );
}

export function parsePublicBookingReadyJson(
  source: string,
): PublicBookingReadyResult {
  const value = parseStrictJson(source, "invalid_response");
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "status", "slots"]) ||
    value.schema_version !== PUBLIC_BOOKING_SCHEMA_VERSION ||
    value.status !== "ready" ||
    !Array.isArray(value.slots) ||
    value.slots.length > PUBLIC_BOOKING_MAX_SLOTS
  ) {
    throw new PublicBookingContractError("invalid_response");
  }

  const slotTokens = new Set<string>();
  const slots = value.slots.map((candidate) => {
    const slot = assertSlot(candidate, "invalid_response");
    if (slotTokens.has(slot.slot_token)) {
      throw new PublicBookingContractError("invalid_response");
    }
    slotTokens.add(slot.slot_token);
    return slot;
  });

  return Object.freeze({
    schema_version: PUBLIC_BOOKING_SCHEMA_VERSION,
    status: "ready",
    slots: Object.freeze(slots),
  });
}

export function parsePublicBookingReservationResultJson(
  source: string,
): PublicBookingConfirmedResult | PublicBookingConflictResult {
  const value = parseStrictJson(source, "invalid_response");
  if (!isRecord(value) || value.schema_version !== PUBLIC_BOOKING_SCHEMA_VERSION) {
    throw new PublicBookingContractError("invalid_response");
  }

  if (
    value.status === "conflict" &&
    hasExactKeys(value, ["schema_version", "status"])
  ) {
    return PUBLIC_BOOKING_CONFLICT_RESULT;
  }

  if (
    value.status !== "confirmed" ||
    !hasExactKeys(value, ["schema_version", "status", "booking_id", "slot"]) ||
    typeof value.booking_id !== "string" ||
    !BOOKING_ID_PATTERN.test(value.booking_id)
  ) {
    throw new PublicBookingContractError("invalid_response");
  }

  return Object.freeze({
    schema_version: PUBLIC_BOOKING_SCHEMA_VERSION,
    status: "confirmed",
    booking_id: value.booking_id,
    slot: assertSlot(value.slot, "invalid_response"),
  });
}
