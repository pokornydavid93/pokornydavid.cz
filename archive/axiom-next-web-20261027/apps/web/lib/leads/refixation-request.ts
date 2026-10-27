import {
  resolveFixationBucket,
  type FixationBucket,
  type RefixationPath,
} from "./refixation-bucket.ts";

export const REFIXATION_FUNNEL_ID = "mortgage-refixation";

export const REMAINING_BALANCE_BANDS = [
  "under-1m",
  "1-2m",
  "2-4m",
  "4-6m",
  "over-6m",
  "prefer-not",
] as const;

export const REFIXATION_PRIORITIES = [
  "lower-or-keep-payment",
  "longer-certainty",
  "repay-faster",
  "compare-options",
  "unknown",
] as const;

export const CALLBACK_WINDOWS = [
  "morning",
  "midday",
  "afternoon",
  "evening",
] as const;

export const ATTRIBUTION_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
] as const;

export type RemainingBalanceBand = (typeof REMAINING_BALANCE_BANDS)[number];
export type RefixationPriority = (typeof REFIXATION_PRIORITIES)[number];
export type CallbackWindow = (typeof CALLBACK_WINDOWS)[number];
export type RefixationAttributionField = (typeof ATTRIBUTION_FIELDS)[number];
export type RefixationAttribution = Partial<Record<RefixationAttributionField, string>>;

export type RefixationFieldId =
  | "fixationDate"
  | "remainingBalanceBand"
  | "priority"
  | "name"
  | "phone"
  | "email"
  | "callbackWindow";

export type RefixationFormState = {
  status:
    | "idle"
    | "invalid"
    | "provider-unavailable"
    | "rate-limited"
    | "duplicate-or-ambiguous"
    | "accepted";
  attempt: number;
  errors: Partial<Record<RefixationFieldId, string>>;
  idempotencyKey: string;
  submittedAt?: string;
  result?: {
    fixationBucket: FixationBucket;
    refixationPath: RefixationPath;
    callbackWindow: CallbackWindow;
  };
};

export type RefixationValidationMessages = Record<RefixationFieldId, string>;

export type NormalizedRefixationRequest = {
  funnelId: typeof REFIXATION_FUNNEL_ID;
  name: string;
  phone: string;
  email: string;
  callbackWindow: CallbackWindow;
  fixationBucket: FixationBucket;
  refixationPath: RefixationPath;
  fixationMonth?: number;
  fixationYear?: number;
  remainingBalanceBand: RemainingBalanceBand;
  priority: RefixationPriority;
  attribution?: RefixationAttribution;
  privacyNoticeVersion: string;
  submittedAt: string;
  idempotencyKey: string;
};

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const balanceBands = new Set<string>(REMAINING_BALANCE_BANDS);
const priorities = new Set<string>(REFIXATION_PRIORITIES);
const callbackWindows = new Set<string>(CALLBACK_WINDOWS);

const readString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/gu, " ");
const containsControlCharacters = (value: string) => /[\u0000-\u001f\u007f]/u.test(value);

const readInteger = (formData: FormData, key: string) => {
  const raw = readString(formData, key).trim();
  if (!/^\d+$/u.test(raw)) return null;
  return Number.parseInt(raw, 10);
};

const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/gu, "");
  return `${hasLeadingPlus ? "+" : ""}${digits}`;
};

const readAttribution = (formData: FormData): RefixationAttribution | undefined => {
  const attribution: RefixationAttribution = {};
  for (const field of ATTRIBUTION_FIELDS) {
    const value = normalizeWhitespace(readString(formData, field));
    if (!value || value.length > 160 || containsControlCharacters(value)) continue;
    attribution[field] = value;
  }
  return Object.keys(attribution).length > 0 ? attribution : undefined;
};

export const createRefixationFormState = (
  idempotencyKey: string,
): RefixationFormState => ({
  status: "idle",
  attempt: 0,
  errors: {},
  idempotencyKey,
});

export function validateRefixationRequest(
  formData: FormData,
  messages: RefixationValidationMessages,
  baseDate = new Date(),
  previousSubmittedAt?: string,
) {
  const fixationDateKnown = readString(formData, "fixationDateKnown") !== "unknown";
  const fixationMonth = fixationDateKnown ? readInteger(formData, "fixationMonth") : null;
  const fixationYear = fixationDateKnown ? readInteger(formData, "fixationYear") : null;
  const bucketResult = resolveFixationBucket(
    {
      month: fixationMonth,
      year: fixationYear,
      unknown: !fixationDateKnown,
    },
    baseDate,
  );
  const remainingBalanceBand = readString(formData, "remainingBalanceBand").trim();
  const priority = readString(formData, "priority").trim();
  const name = normalizeWhitespace(readString(formData, "name"));
  const phone = normalizePhone(readString(formData, "phone"));
  const email = readString(formData, "email").trim().toLocaleLowerCase("cs-CZ");
  const callbackWindow = readString(formData, "callbackWindow").trim();
  const idempotencyKey = readString(formData, "idempotencyKey").trim();
  const privacyNoticeVersion = readString(formData, "privacyNoticeVersion").trim();
  const honeypot = readString(formData, "website").trim();
  const submittedAt = previousSubmittedAt ?? new Date().toISOString();
  const submittedTime = Date.parse(submittedAt);
  const submittedAtValid = Number.isFinite(submittedTime)
    && new Date(submittedTime).toISOString() === submittedAt
    && submittedTime <= Date.now() + 2 * 60 * 1000
    && submittedTime >= Date.now() - 30 * 60 * 1000;
  const errors: Partial<Record<RefixationFieldId, string>> = {};

  if (
    fixationDateKnown &&
    (bucketResult.bucket === "unknown" || fixationMonth === null || fixationYear === null)
  ) {
    errors.fixationDate = messages.fixationDate;
  }

  if (!balanceBands.has(remainingBalanceBand)) {
    errors.remainingBalanceBand = messages.remainingBalanceBand;
  }

  if (!priorities.has(priority)) {
    errors.priority = messages.priority;
  }

  if (!name || name.length > 80 || containsControlCharacters(name)) {
    errors.name = messages.name;
  }

  const phoneDigits = phone.replace(/\D/gu, "");
  if (!phone || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = messages.phone;
  }

  if (
    !email ||
    email.length > 254 ||
    containsControlCharacters(email) ||
    !EMAIL_PATTERN.test(email)
  ) {
    errors.email = messages.email;
  }

  if (!callbackWindows.has(callbackWindow)) {
    errors.callbackWindow = messages.callbackWindow;
  }

  const valid =
    Object.keys(errors).length === 0 &&
    IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey) &&
    privacyNoticeVersion.length > 0 &&
    privacyNoticeVersion.length <= 80 &&
    submittedAtValid &&
    honeypot.length === 0;

  const normalized = valid
    ? ({
        funnelId: REFIXATION_FUNNEL_ID,
        name,
        phone,
        email,
        callbackWindow: callbackWindow as CallbackWindow,
        fixationBucket: bucketResult.bucket,
        refixationPath: bucketResult.path,
        ...(fixationDateKnown && fixationMonth && fixationYear
          ? { fixationMonth, fixationYear }
          : {}),
        remainingBalanceBand: remainingBalanceBand as RemainingBalanceBand,
        priority: priority as RefixationPriority,
        attribution: readAttribution(formData),
        privacyNoticeVersion,
        submittedAt,
        idempotencyKey,
      } satisfies NormalizedRefixationRequest)
    : null;

  return {
    errors,
    honeypotTriggered: honeypot.length > 0,
    idempotencyKeyValid: IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey),
    normalized,
    bucketResult,
  };
}
