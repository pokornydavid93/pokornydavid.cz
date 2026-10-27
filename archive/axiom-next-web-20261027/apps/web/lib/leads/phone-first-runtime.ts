import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  openSync,
  readSync,
} from "node:fs";
import path from "node:path";

import type { NormalizedOverviewRequest } from "./overview-request";
import { isValidLeadEmail, leadTopicOfferingKeys } from "./lead-contract.ts";
import type {
  LeadIntent,
  LeadOfferingKey,
  LeadSource,
  LeadSourceContext,
  LeadTopic,
  PreferredCallTime,
} from "./lead-contract";

export const PHONE_FIRST_INTAKE_PATH =
  "/public/intake/pokornydavid/phone-first/v1";
export const PHONE_FIRST_INTAKE_ORIGIN_ENV =
  "POKORNYDAVID_PHONE_FIRST_INTAKE_ORIGIN";
export const PHONE_FIRST_RECEIPT_SECRET_ENV =
  "POKORNYDAVID_PHONE_FIRST_RECEIPT_HMAC_SECRET";
export const PHONE_FIRST_RECEIPT_SECRET_FILE_ENV =
  "POKORNYDAVID_PHONE_FIRST_RECEIPT_HMAC_SECRET_FILE";
export const PHONE_FIRST_TIMEOUT_ENV =
  "POKORNYDAVID_PHONE_FIRST_TIMEOUT_MS";
export const PHONE_FIRST_RUNTIME_MODE_ENV =
  "POKORNYDAVID_PHONE_FIRST_RUNTIME";

const DEFAULT_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 4_096;
const MAX_RECEIPT_TTL_SECONDS = 15 * 60;
const CLOCK_SKEW_SECONDS = 60;

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const RECEIPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const CANONICAL_PHONE_PATTERN = /^\+?[0-9]{9,15}$/u;
const MASKED_PHONE_PATTERN = /^(?:\+[0-9]{1,6} )?••• ••• [0-9]{3}$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

const INTENTS = new Set<LeadIntent>([
  "overview",
  "housing",
  "financing",
  "protection",
  "future",
  "unsure",
]);
const TOPIC_INTENTS = new Map<LeadTopic, LeadIntent>([
  ["financial-plan", "overview"],
  ["mortgage", "housing"],
  ["property-sale", "housing"],
  ["business-financing", "financing"],
  ["income-protection", "protection"],
  ["property-insurance", "protection"],
  ["vehicle-insurance", "protection"],
  ["liability-insurance", "protection"],
  ["investments", "future"],
  ["mortgage-refixation", "housing"],
]);
const PREFERRED_CALL_TIMES = new Set<PreferredCallTime>([
  "morning",
  "afternoon",
  "evening",
  "any",
]);
const SOURCE_CONTEXTS = new Set<LeadSourceContext>([
  "direct",
  "header",
  "homepage",
  "services",
  "service-detail",
  "article",
  "funnel",
  "references",
  "about",
  "process",
  "footer",
]);
export const PHONE_FIRST_ALLOWED_CTA_IDS = [
  "header-primary",
  "footer-primary",
  "home-header",
  "home-hero",
  "home-profile",
  "home-process",
  "home-references",
  "home-situation",
  "home-situations",
  "home-final",
  "situation-mortgage-refixation",
  "situation-new-housing",
  "situation-insurance-review",
  "situation-income-protection",
  "situation-investing",
  "unsure-priorities",
  "services-hero",
  "services-final",
  "service-financial-plan",
  "service-mortgage",
  "service-property-sale",
  "service-business-financing",
  "service-income-protection",
  "service-property-insurance",
  "service-vehicle-insurance",
  "service-liability-insurance",
  "service-investments",
  "article-inline",
  "article-screening",
  "article-final",
  "article-inline-check",
  "article-screening-check",
  "article-sticky-check",
  "article-final-check",
  "quick-refixation-check",
  "article-mortgage-refixation",
  "process-hero",
  "process-final",
  "about-hero",
  "about-final",
  "references-final",
  "funnel-primary",
] as const;
const ALLOWED_CTA_IDS = new Set<string>(PHONE_FIRST_ALLOWED_CTA_IDS);

type PhoneFirstWireRequest = {
  schema_version: 1;
  intent: LeadIntent;
  topic?: LeadTopic;
  offering_key?: LeadOfferingKey;
  situation_note?: string;
  phone: string;
  first_name?: string;
  preferred_call_time?: PreferredCallTime;
  source: {
    route: "/ziskat-prehled/";
    cta?: string;
    context?: LeadSourceContext;
  };
  privacy_notice_version: string;
  submitted_at: string;
};

export type PhoneFirstProductionConfig = Readonly<{
  endpointUrl: string;
  receiptHmacSecret: Uint8Array;
  timeoutMs: number;
}>;

export type SignedOverviewReceipt = {
  id: string;
  status: "accepted";
  intent: LeadIntent;
  topic?: LeadTopic;
  maskedPhone: string;
  source: LeadSource;
  createdAt: string;
};

export type SignedOverviewReceiptInput = Omit<SignedOverviewReceipt, "id"> & {
  analyticsClaimedAt?: string;
};

export type AnalyticsClaimResult =
  | { status: "missing" | "already-claimed" }
  | {
      status: "claimed";
      marker?: { value: string; maxAge: number };
    };

export class PhoneFirstConfigurationError extends Error {
  constructor() {
    super("Phone-first production configuration is invalid.");
    this.name = "PhoneFirstConfigurationError";
  }
}

export type PhoneFirstSubmissionFailure =
  | "duplicate"
  | "rate-limited"
  | "unavailable";

export class PhoneFirstSubmissionError extends Error {
  readonly failure: PhoneFirstSubmissionFailure;

  constructor(failure: PhoneFirstSubmissionFailure) {
    super("Phone-first submission was not accepted.");
    this.name = "PhoneFirstSubmissionError";
    this.failure = failure;
  }
}

const configurationError = (): never => {
  throw new PhoneFirstConfigurationError();
};

export type PhoneFirstRuntimeMode = "memory" | "durable";

export function resolvePhoneFirstRuntimeMode(
  environment: Record<string, string | undefined>,
): PhoneFirstRuntimeMode {
  const configuredMode = environment[PHONE_FIRST_RUNTIME_MODE_ENV];
  const production = environment.NODE_ENV === "production";

  if (configuredMode === undefined || configuredMode === "") {
    return production ? "durable" : "memory";
  }
  if (configuredMode !== configuredMode.trim()) return configurationError();
  if (configuredMode === "durable") return "durable";
  if (configuredMode === "memory" && !production) return "memory";
  return configurationError();
}

const isLoopbackHostname = (hostname: string) =>
  hostname === "localhost"
  || hostname === "127.0.0.1"
  || hostname === "[::1]";

export function parsePhoneFirstProductionConfig(
  environment: Record<string, string | undefined>,
): PhoneFirstProductionConfig {
  const rawOrigin = environment[PHONE_FIRST_INTAKE_ORIGIN_ENV];
  const receiptHmacSecretEnvironment = environment[PHONE_FIRST_RECEIPT_SECRET_ENV];
  const receiptHmacSecretFile = environment[PHONE_FIRST_RECEIPT_SECRET_FILE_ENV];
  const rawTimeout = environment[PHONE_FIRST_TIMEOUT_ENV];

  if (
    !rawOrigin
    || rawOrigin !== rawOrigin.trim()
    || rawOrigin.length > 2_048
    || Boolean(receiptHmacSecretEnvironment) === Boolean(receiptHmacSecretFile)
  ) {
    return configurationError();
  }

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return configurationError();
  }

  const canonicalOrigin = rawOrigin.endsWith("/")
    ? rawOrigin.slice(0, -1)
    : rawOrigin;
  if (
    canonicalOrigin !== origin.origin
    || origin.username
    || origin.password
    || origin.pathname !== "/"
    || origin.search
    || origin.hash
    || (
      origin.protocol !== "https:"
      && !(origin.protocol === "http:" && isLoopbackHostname(origin.hostname))
    )
  ) {
    return configurationError();
  }

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (rawTimeout !== undefined) {
    if (!/^[1-9][0-9]*$/u.test(rawTimeout)) return configurationError();
    timeoutMs = Number(rawTimeout);
    if (
      !Number.isSafeInteger(timeoutMs)
      || timeoutMs < MIN_TIMEOUT_MS
      || timeoutMs > MAX_TIMEOUT_MS
    ) {
      return configurationError();
    }
  }

  let receiptHmacSecret: Uint8Array;
  if (receiptHmacSecretFile) {
    try {
      receiptHmacSecret = readPrivateReceiptSecret(receiptHmacSecretFile);
    } catch {
      return configurationError();
    }
  } else {
    if (
      !receiptHmacSecretEnvironment
      || receiptHmacSecretEnvironment !== receiptHmacSecretEnvironment.trim()
      || Buffer.byteLength(receiptHmacSecretEnvironment, "utf8") < 32
      || Buffer.byteLength(receiptHmacSecretEnvironment, "utf8") > 4_096
    ) {
      return configurationError();
    }
    receiptHmacSecret = Buffer.from(receiptHmacSecretEnvironment, "utf8");
  }

  return {
    endpointUrl: `${origin.origin}${PHONE_FIRST_INTAKE_PATH}`,
    receiptHmacSecret,
    timeoutMs,
  };
}

const readPrivateReceiptSecret = (filePath: string): Uint8Array => {
  if (
    !path.isAbsolute(filePath)
    || path.normalize(filePath) !== filePath
    || filePath !== filePath.trim()
  ) {
    throw new PhoneFirstConfigurationError();
  }
  let descriptor: number | undefined;
  let secret: Buffer | undefined;
  try {
    descriptor = openSync(
      filePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const before = fstatSync(descriptor);
    if (
      !before.isFile()
      || before.uid !== process.geteuid?.()
      || before.nlink !== 1
      || (before.mode & 0o777) !== 0o600
      || before.size !== 32
    ) {
      throw new PhoneFirstConfigurationError();
    }
    secret = Buffer.alloc(32);
    let offset = 0;
    while (offset < secret.length) {
      const count = readSync(
        descriptor,
        secret,
        offset,
        secret.length - offset,
        offset,
      );
      if (count === 0) {
        secret.fill(0);
        throw new PhoneFirstConfigurationError();
      }
      offset += count;
    }
    const after = fstatSync(descriptor);
    for (const field of [
      "dev",
      "ino",
      "size",
      "mtimeMs",
      "ctimeMs",
      "nlink",
      "mode",
      "uid",
    ] as const) {
      if (before[field] !== after[field]) {
        secret.fill(0);
        throw new PhoneFirstConfigurationError();
      }
    }
    return secret;
  } catch (error) {
    secret?.fill(0);
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => allowed.has(key));
};

const containsTextControl = (value: string) =>
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);

const canonicalSingleLine = (value: string) =>
  value.trim().replace(/\s+/gu, " ");

const canonicalMultiline = (value: string) =>
  value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map(canonicalSingleLine)
    .join("\n")
    .trim();

const isCanonicalTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/u.exec(
    value,
  );
  if (!match) return false;
  const [, year, month, day, hour, minute, second, fraction = ""] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const [numericYear, numericMonth, numericDay, numericHour, numericMinute, numericSecond] = parts;
  if (
    numericMonth < 1
    || numericMonth > 12
    || numericHour > 23
    || numericMinute > 59
    || numericSecond > 59
  ) {
    return false;
  }
  const milliseconds = Number(`${fraction}000`.slice(0, 3));
  const parsed = new Date(0);
  parsed.setUTCFullYear(
    numericYear,
    numericMonth - 1,
    numericDay,
  );
  parsed.setUTCHours(numericHour, numericMinute, numericSecond, milliseconds);
  return parsed.getUTCFullYear() === numericYear
    && parsed.getUTCMonth() === numericMonth - 1
    && parsed.getUTCDate() === numericDay
    && parsed.getUTCHours() === numericHour
    && parsed.getUTCMinutes() === numericMinute
    && parsed.getUTCSeconds() === numericSecond;
};

const isValidSource = (source: unknown): source is LeadSource => {
  if (
    !isRecord(source)
    || !hasExactKeys(source, ["route"], ["cta", "context"])
    || source.route !== "/ziskat-prehled/"
  ) {
    return false;
  }
  if (
    Object.hasOwn(source, "cta")
    && (typeof source.cta !== "string" || !ALLOWED_CTA_IDS.has(source.cta))
  ) {
    return false;
  }
  return !Object.hasOwn(source, "context")
    || (typeof source.context === "string"
      && SOURCE_CONTEXTS.has(source.context as LeadSourceContext));
};

const invalidSubmission = (): never => {
  throw new PhoneFirstSubmissionError("unavailable");
};

export function buildPhoneFirstWireRequest(
  input: NormalizedOverviewRequest,
): PhoneFirstWireRequest {
  if (
    !isRecord(input)
    || !hasExactKeys(
      input,
      [
        "intent",
        "phone",
        "email",
        "source",
        "privacyNoticeVersion",
        "submittedAt",
        "idempotencyKey",
      ],
      ["topic", "situationNote", "firstName", "preferredCallTime"],
    )
    || typeof input.intent !== "string"
    || !INTENTS.has(input.intent as LeadIntent)
    || typeof input.phone !== "string"
    || !CANONICAL_PHONE_PATTERN.test(input.phone)
    || typeof input.email !== "string"
    || !isValidLeadEmail(input.email)
    || input.phone.length > 32
    || typeof input.privacyNoticeVersion !== "string"
    || input.privacyNoticeVersion.length === 0
    || input.privacyNoticeVersion.length > 128
    || input.privacyNoticeVersion.trim() !== input.privacyNoticeVersion
    || containsTextControl(input.privacyNoticeVersion)
    || !isCanonicalTimestamp(input.submittedAt)
    || typeof input.idempotencyKey !== "string"
    || !IDEMPOTENCY_KEY_PATTERN.test(input.idempotencyKey)
    || !isValidSource(input.source)
  ) {
    return invalidSubmission();
  }

  const intent = input.intent as LeadIntent;
  if (Object.hasOwn(input, "topic")) {
    if (
      typeof input.topic !== "string"
      || TOPIC_INTENTS.get(input.topic as LeadTopic) !== intent
    ) {
      return invalidSubmission();
    }
  }
  if (Object.hasOwn(input, "situationNote")) {
    if (
      typeof input.situationNote !== "string"
      || input.situationNote.length === 0
      || input.situationNote.length > 500
      || containsTextControl(input.situationNote)
      || canonicalMultiline(input.situationNote) !== input.situationNote
    ) {
      return invalidSubmission();
    }
  }
  if (Object.hasOwn(input, "firstName")) {
    if (
      typeof input.firstName !== "string"
      || input.firstName.length === 0
      || input.firstName.length > 80
      || containsTextControl(input.firstName)
      || canonicalSingleLine(input.firstName) !== input.firstName
    ) {
      return invalidSubmission();
    }
  }
  if (Object.hasOwn(input, "preferredCallTime")) {
    if (
      typeof input.preferredCallTime !== "string"
      || !PREFERRED_CALL_TIMES.has(input.preferredCallTime as PreferredCallTime)
    ) {
      return invalidSubmission();
    }
  }

  return {
    schema_version: 1,
    intent,
    ...(input.topic
      ? {
          topic: input.topic,
          offering_key: leadTopicOfferingKeys[input.topic],
        }
      : {}),
    ...(input.situationNote ? { situation_note: input.situationNote } : {}),
    phone: input.phone,
    ...(input.firstName ? { first_name: input.firstName } : {}),
    ...(input.preferredCallTime
      ? { preferred_call_time: input.preferredCallTime }
      : {}),
    source: {
      route: "/ziskat-prehled/",
      ...(input.source.cta ? { cta: input.source.cta } : {}),
      ...(input.source.context ? { context: input.source.context } : {}),
    },
    privacy_notice_version: input.privacyNoticeVersion,
    submitted_at: input.submittedAt,
  };
}

type JsonCursor = { index: number; depth: number };

const parseDuplicateFreeJson = (source: string) => {
  const cursor: JsonCursor = { index: 0, depth: 0 };
  const skipWhitespace = () => {
    while (/\s/u.test(source[cursor.index] ?? "")) cursor.index += 1;
  };
  const parseString = () => {
    if (source[cursor.index] !== '"') throw new SyntaxError();
    const start = cursor.index;
    cursor.index += 1;
    while (cursor.index < source.length) {
      const character = source[cursor.index];
      if (character === '"') {
        cursor.index += 1;
        return JSON.parse(source.slice(start, cursor.index)) as string;
      }
      if (character === "\\") cursor.index += 1;
      cursor.index += 1;
    }
    throw new SyntaxError();
  };
  const parseValue = (): void => {
    skipWhitespace();
    if (cursor.depth > 32) throw new SyntaxError();
    if (source[cursor.index] === '"') {
      parseString();
      return;
    }
    if (source[cursor.index] === "{") {
      cursor.depth += 1;
      cursor.index += 1;
      skipWhitespace();
      const keys = new Set<string>();
      if (source[cursor.index] === "}") {
        cursor.index += 1;
        cursor.depth -= 1;
        return;
      }
      while (cursor.index < source.length) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) throw new SyntaxError();
        keys.add(key);
        skipWhitespace();
        if (source[cursor.index] !== ":") throw new SyntaxError();
        cursor.index += 1;
        parseValue();
        skipWhitespace();
        if (source[cursor.index] === "}") {
          cursor.index += 1;
          cursor.depth -= 1;
          return;
        }
        if (source[cursor.index] !== ",") throw new SyntaxError();
        cursor.index += 1;
      }
      throw new SyntaxError();
    }
    if (source[cursor.index] === "[") {
      cursor.depth += 1;
      cursor.index += 1;
      skipWhitespace();
      if (source[cursor.index] === "]") {
        cursor.index += 1;
        cursor.depth -= 1;
        return;
      }
      while (cursor.index < source.length) {
        parseValue();
        skipWhitespace();
        if (source[cursor.index] === "]") {
          cursor.index += 1;
          cursor.depth -= 1;
          return;
        }
        if (source[cursor.index] !== ",") throw new SyntaxError();
        cursor.index += 1;
      }
      throw new SyntaxError();
    }
    const start = cursor.index;
    while (
      cursor.index < source.length
      && !/[\s,\]}]/u.test(source[cursor.index] ?? "")
    ) {
      cursor.index += 1;
    }
    if (start === cursor.index) throw new SyntaxError();
    JSON.parse(source.slice(start, cursor.index));
  };

  parseValue();
  skipWhitespace();
  if (cursor.index !== source.length) throw new SyntaxError();
  return JSON.parse(source) as unknown;
};

const readBoundedResponseBody = async (response: Response) => {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null
    && (!/^(?:0|[1-9][0-9]*)$/u.test(declaredLength)
      || Number(declaredLength) > MAX_RESPONSE_BYTES)
  ) {
    throw new PhoneFirstSubmissionError("unavailable");
  }
  if (!response.body) throw new PhoneFirstSubmissionError("unavailable");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new PhoneFirstSubmissionError("unavailable");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof PhoneFirstSubmissionError) throw error;
    throw new PhoneFirstSubmissionError("unavailable");
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new PhoneFirstSubmissionError("unavailable");
  }
};

const isStrictJsonContentType = (value: string | null) =>
  value !== null
  && /^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(value);

const parseAcceptedResponse = async (response: Response) => {
  if (!isStrictJsonContentType(response.headers.get("content-type"))) {
    throw new PhoneFirstSubmissionError("unavailable");
  }
  const raw = await readBoundedResponseBody(response);
  let decoded: unknown;
  try {
    decoded = parseDuplicateFreeJson(raw);
  } catch {
    throw new PhoneFirstSubmissionError("unavailable");
  }
  if (
    !isRecord(decoded)
    || !hasExactKeys(decoded, ["schema_version", "status", "receipt_id"])
    || Object.keys(decoded).join("\0") !== "schema_version\0status\0receipt_id"
    || decoded.schema_version !== 1
    || decoded.status !== "accepted"
    || typeof decoded.receipt_id !== "string"
    || !RECEIPT_ID_PATTERN.test(decoded.receipt_id)
  ) {
    throw new PhoneFirstSubmissionError("unavailable");
  }
  return decoded.receipt_id;
};

export function createPhoneFirstHttpSink(
  config: PhoneFirstProductionConfig,
  fetchImplementation: typeof fetch = globalThis.fetch,
) {
  return {
    async submit(input: NormalizedOverviewRequest) {
      const wireRequest = buildPhoneFirstWireRequest(input);
      let response: Response;
      try {
        response = await fetchImplementation(config.endpointUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Idempotency-Key": input.idempotencyKey,
          },
          body: JSON.stringify(wireRequest),
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal: AbortSignal.timeout(config.timeoutMs),
        });
      } catch {
        throw new PhoneFirstSubmissionError("unavailable");
      }

      if (response.status === 409) {
        await response.body?.cancel().catch(() => undefined);
        throw new PhoneFirstSubmissionError("duplicate");
      }
      if (response.status === 429) {
        await response.body?.cancel().catch(() => undefined);
        throw new PhoneFirstSubmissionError("rate-limited");
      }
      if (response.status !== 202) {
        await response.body?.cancel().catch(() => undefined);
        throw new PhoneFirstSubmissionError("unavailable");
      }

      return { reference: await parseAcceptedResponse(response) };
    },
  };
}

const toCanonicalBase64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64url");

const decodeCanonicalBase64Url = (value: string) => {
  if (!BASE64URL_PATTERN.test(value)) throw new SyntaxError();
  const decoded = Buffer.from(value, "base64url");
  if (toCanonicalBase64Url(decoded) !== value) throw new SyntaxError();
  return decoded;
};

const signToken = (
  secret: Uint8Array,
  purpose: "receipt" | "analytics-claim",
  payload: Record<string, unknown>,
) => {
  const encodedPayload = toCanonicalBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = createHmac("sha256", secret)
    .update(`pokornydavid-phone-first:${purpose}:v1\0${encodedPayload}`)
    .digest();
  return `v1.${encodedPayload}.${toCanonicalBase64Url(signature)}`;
};

const verifyToken = (
  secret: Uint8Array,
  purpose: "receipt" | "analytics-claim",
  token: string,
) => {
  if (token.length > 3_500) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  try {
    const signature = decodeCanonicalBase64Url(parts[2]);
    if (signature.byteLength !== 32) return null;
    const expected = createHmac("sha256", secret)
      .update(`pokornydavid-phone-first:${purpose}:v1\0${parts[1]}`)
      .digest();
    if (!timingSafeEqual(signature, expected)) return null;
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
      decodeCanonicalBase64Url(parts[1]),
    );
    const payload = parseDuplicateFreeJson(decoded);
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
};

const isValidSignedSource = (value: unknown): value is LeadSource =>
  isValidSource(value);

const readReceiptPayload = (
  secret: Uint8Array,
  token: string,
  nowSeconds: number,
) => {
  const payload = verifyToken(secret, "receipt", token);
  if (
    !payload
    || !hasExactKeys(
      payload,
      [
        "schema_version",
        "kind",
        "receipt_id",
        "status",
        "intent",
        "masked_phone",
        "source",
        "issued_at",
        "expires_at",
      ],
      ["topic"],
    )
    || payload.schema_version !== 1
    || payload.kind !== "overview-receipt"
    || payload.status !== "accepted"
    || typeof payload.receipt_id !== "string"
    || !RECEIPT_ID_PATTERN.test(payload.receipt_id)
    || typeof payload.intent !== "string"
    || !INTENTS.has(payload.intent as LeadIntent)
    || typeof payload.masked_phone !== "string"
    || !MASKED_PHONE_PATTERN.test(payload.masked_phone)
    || !isValidSignedSource(payload.source)
    || !Number.isSafeInteger(payload.issued_at)
    || !Number.isSafeInteger(payload.expires_at)
  ) {
    return null;
  }

  const issuedAt = payload.issued_at as number;
  const expiresAt = payload.expires_at as number;
  if (
    issuedAt < 0
    || expiresAt <= issuedAt
    || expiresAt - issuedAt > MAX_RECEIPT_TTL_SECONDS
    || issuedAt > nowSeconds + CLOCK_SKEW_SECONDS
    || expiresAt <= nowSeconds
  ) {
    return null;
  }

  if (Object.hasOwn(payload, "topic")) {
    if (
      typeof payload.topic !== "string"
      || TOPIC_INTENTS.get(payload.topic as LeadTopic)
        !== payload.intent as LeadIntent
    ) {
      return null;
    }
  }

  return {
    receipt: {
      id: payload.receipt_id,
      status: "accepted" as const,
      intent: payload.intent as LeadIntent,
      ...(payload.topic ? { topic: payload.topic as LeadTopic } : {}),
      maskedPhone: payload.masked_phone,
      source: payload.source,
      createdAt: new Date(issuedAt * 1_000).toISOString(),
    },
    expiresAt,
  };
};

export function createSignedOverviewReceiptStore(
  config: Pick<PhoneFirstProductionConfig, "receiptHmacSecret">,
  now: () => number = Date.now,
) {
  const secret = config.receiptHmacSecret;
  return {
    async create(
      input: SignedOverviewReceiptInput,
      ttlSeconds: number,
      acceptedReference?: string,
    ) {
      const nowSeconds = Math.floor(now() / 1_000);
      if (
        !acceptedReference
        || !RECEIPT_ID_PATTERN.test(acceptedReference)
        || !Number.isSafeInteger(ttlSeconds)
        || ttlSeconds <= 0
        || ttlSeconds > MAX_RECEIPT_TTL_SECONDS
        || input.status !== "accepted"
        || !INTENTS.has(input.intent)
        || (input.topic !== undefined
          && TOPIC_INTENTS.get(input.topic) !== input.intent)
        || !MASKED_PHONE_PATTERN.test(input.maskedPhone)
        || !isValidSignedSource(input.source)
        || !isCanonicalTimestamp(input.createdAt)
        || input.analyticsClaimedAt !== undefined
      ) {
        throw new PhoneFirstSubmissionError("unavailable");
      }

      return signToken(secret, "receipt", {
        schema_version: 1,
        kind: "overview-receipt",
        receipt_id: acceptedReference,
        status: "accepted",
        intent: input.intent,
        ...(input.topic ? { topic: input.topic } : {}),
        masked_phone: input.maskedPhone,
        source: input.source,
        issued_at: nowSeconds,
        expires_at: nowSeconds + ttlSeconds,
      });
    },
    async read(token: string) {
      return readReceiptPayload(secret, token, Math.floor(now() / 1_000))?.receipt
        ?? null;
    },
    async claimAnalytics(
      receiptToken: string,
      existingMarker?: string,
    ): Promise<AnalyticsClaimResult> {
      const nowSeconds = Math.floor(now() / 1_000);
      const receiptPayload = readReceiptPayload(secret, receiptToken, nowSeconds);
      if (!receiptPayload) return { status: "missing" };

      const receiptDigest = createHash("sha256")
        .update(receiptToken)
        .digest("base64url");
      if (existingMarker) {
        const marker = verifyToken(secret, "analytics-claim", existingMarker);
        if (
          marker
          && hasExactKeys(marker, [
            "schema_version",
            "kind",
            "receipt_id",
            "receipt_digest",
            "issued_at",
            "expires_at",
          ])
          && marker.schema_version === 1
          && marker.kind === "analytics-claim"
          && marker.receipt_id === receiptPayload.receipt.id
          && marker.receipt_digest === receiptDigest
          && Number.isSafeInteger(marker.issued_at)
          && Number.isSafeInteger(marker.expires_at)
          && (marker.issued_at as number) <= nowSeconds + CLOCK_SKEW_SECONDS
          && (marker.expires_at as number) === receiptPayload.expiresAt
          && (marker.expires_at as number) > nowSeconds
        ) {
          return { status: "already-claimed" };
        }
      }

      const value = signToken(secret, "analytics-claim", {
        schema_version: 1,
        kind: "analytics-claim",
        receipt_id: receiptPayload.receipt.id,
        receipt_digest: receiptDigest,
        issued_at: nowSeconds,
        expires_at: receiptPayload.expiresAt,
      });
      return {
        status: "claimed",
        marker: {
          value,
          maxAge: Math.max(1, receiptPayload.expiresAt - nowSeconds),
        },
      };
    },
  };
}
