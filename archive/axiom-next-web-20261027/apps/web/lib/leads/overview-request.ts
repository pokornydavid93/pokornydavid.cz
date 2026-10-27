import {
  isAllowedLeadCta,
  isLeadIntent,
  isLeadSourceContext,
  isLeadTopic,
  isPreferredCallTime,
  isValidLeadEmail,
  isValidPhone,
  normalizePhone,
  topicIntent,
  type LeadFormPayload,
  type LeadIntent,
  type LeadSourceContext,
  type LeadTopic,
  type PreferredCallTime,
} from "./lead-contract.ts";
import { resolveOverviewSubmittedAt } from "./submission-identity.ts";

export type OverviewFieldId =
  | "intent"
  | "situationNote"
  | "phone"
  | "email"
  | "firstName"
  | "preferredCallTime";

export type OverviewFormValues = {
  intent: string;
  topic: string;
  situationNote: string;
  phone: string;
  email: string;
  firstName: string;
  preferredCallTime: string;
  sourceContext: string;
  sourceCta: string;
  campaignHandle?: string;
};

export type OverviewFormState = {
  status:
    | "idle"
    | "invalid"
    | "provider-unavailable"
    | "rate-limited"
    | "duplicate-or-ambiguous";
  attempt: number;
  values: OverviewFormValues;
  errors: Partial<Record<OverviewFieldId, string>>;
  idempotencyKey: string;
  submittedAt?: string;
};

export type OverviewValidationMessages = {
  intent: string;
  situationNote: string;
  phone: string;
  email: string;
  firstName: string;
  preferredCallTime: string;
};

export type NormalizedOverviewRequest = LeadFormPayload & {
  campaignHandle?: string;
  privacyNoticeVersion: string;
  submittedAt: string;
  idempotencyKey: string;
};

const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const CAMPAIGN_HANDLE_PATTERN = /^[a-z2-7]{26}$/u;

const readString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/gu, " ");
export const isValidOverviewEmail = isValidLeadEmail;
const normalizeMultiline = (value: string) =>
  value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[^\S\n]+/gu, " "))
    .join("\n")
    .trim();
const containsControlCharacters = (value: string) =>
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);

export const createOverviewFormState = ({
  campaignHandle,
  cta,
  idempotencyKey,
  intent = "",
  source = "direct",
  topic,
}: {
  campaignHandle?: string;
  cta?: string;
  idempotencyKey: string;
  intent?: LeadIntent | "";
  source?: LeadSourceContext;
  topic?: LeadTopic;
}): OverviewFormState => ({
  status: "idle",
  attempt: 0,
  idempotencyKey,
  errors: {},
  values: {
    intent,
    topic: topic ?? "",
    situationNote: "",
    phone: "",
    email: "",
    firstName: "",
    preferredCallTime: "",
    sourceContext: source,
    sourceCta: cta ?? "",
    campaignHandle: campaignHandle ?? "",
  },
});

export function validateOverviewRequest(
  formData: FormData,
  messages: OverviewValidationMessages,
  expectedPrivacyNoticeVersion: string,
  existingSubmittedAt?: string,
) {
  const values: OverviewFormValues = {
    intent: readString(formData, "intent").trim(),
    topic: readString(formData, "topic").trim(),
    situationNote: normalizeMultiline(readString(formData, "situationNote")),
    phone: readString(formData, "phone").trim(),
    email: readString(formData, "email").trim(),
    firstName: normalizeWhitespace(readString(formData, "firstName")),
    preferredCallTime: readString(formData, "preferredCallTime").trim(),
    sourceContext: readString(formData, "sourceContext").trim(),
    sourceCta: readString(formData, "sourceCta").trim(),
    campaignHandle: readString(formData, "campaignHandle").trim(),
  };
  const errors: Partial<Record<OverviewFieldId, string>> = {};

  const intent = isLeadIntent(values.intent) ? values.intent : undefined;
  if (!intent) errors.intent = messages.intent;

  if (
    values.situationNote.length > 500
    || containsControlCharacters(values.situationNote)
  ) {
    errors.situationNote = messages.situationNote;
  }

  if (!isValidPhone(values.phone)) errors.phone = messages.phone;
  if (!isValidOverviewEmail(values.email)) errors.email = messages.email;

  if (
    values.firstName.length > 80
    || containsControlCharacters(values.firstName)
  ) {
    errors.firstName = messages.firstName;
  }

  const preferredCallTime = values.preferredCallTime
    ? isPreferredCallTime(values.preferredCallTime)
      ? values.preferredCallTime
      : undefined
    : undefined;
  if (values.preferredCallTime && !preferredCallTime) {
    errors.preferredCallTime = messages.preferredCallTime;
  }

  const submittedTopic = values.topic && isLeadTopic(values.topic)
    ? values.topic
    : undefined;
  const topic = submittedTopic && intent && topicIntent[submittedTopic] === intent
    ? submittedTopic
    : undefined;

  const idempotencyKey = readString(formData, "idempotencyKey").trim();
  const privacyNoticeVersion = readString(formData, "privacyNoticeVersion").trim();
  const honeypot = readString(formData, "website").trim();
  const sourceContext = isLeadSourceContext(values.sourceContext)
    ? values.sourceContext
    : "direct";
  const sourceCta = isAllowedLeadCta(values.sourceCta)
    ? values.sourceCta
    : undefined;
  const campaignHandleValid = !values.campaignHandle || CAMPAIGN_HANDLE_PATTERN.test(values.campaignHandle);
  const submittedAtIdentity = resolveOverviewSubmittedAt(existingSubmittedAt);

  const valid = Object.keys(errors).length === 0
    && IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
    && privacyNoticeVersion === expectedPrivacyNoticeVersion
    && submittedAtIdentity.valid
    && honeypot.length === 0
    && campaignHandleValid;

  const normalized = valid && intent ? {
    intent,
    ...(topic ? { topic } : {}),
    ...(values.situationNote
      ? { situationNote: values.situationNote }
      : {}),
    phone: normalizePhone(values.phone),
    email: values.email,
    ...(values.firstName ? { firstName: values.firstName } : {}),
    ...(preferredCallTime
      ? { preferredCallTime: preferredCallTime as PreferredCallTime }
      : {}),
    source: {
      route: "/ziskat-prehled/",
      ...(sourceCta ? { cta: sourceCta } : {}),
      ...(sourceContext !== "direct" ? { context: sourceContext } : {}),
    },
    privacyNoticeVersion,
    submittedAt: submittedAtIdentity.submittedAt,
    idempotencyKey,
    ...(values.campaignHandle ? { campaignHandle: values.campaignHandle } : {}),
  } satisfies NormalizedOverviewRequest : null;

  return {
    errors,
    honeypotTriggered: honeypot.length > 0,
    idempotencyKeyValid: IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey),
    privacyNoticeVersionValid: privacyNoticeVersion === expectedPrivacyNoticeVersion,
    submittedAtValid: submittedAtIdentity.valid,
    campaignHandleValid,
    normalized,
    values: {
      ...values,
      sourceContext,
      sourceCta: sourceCta ?? "",
      topic: topic ?? "",
    },
  };
}
