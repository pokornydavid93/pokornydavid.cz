import { isValidLeadEmail, isValidPhone, normalizePhone, type LeadIntent, type LeadTopic } from "./lead-contract.ts";

export const articleScreeningTopics = {
  "mortgage-fixation": { intent: "housing", topic: "mortgage-refixation" },
  "investment-plan": { intent: "future", topic: "investments" },
  "insurance-price-check": { intent: "protection", topic: "property-insurance" },
  "income-protection": { intent: "protection", topic: "income-protection" },
} as const satisfies Record<string, { intent: LeadIntent; topic: LeadTopic }>;

export type ArticleScreeningType = keyof typeof articleScreeningTopics;
export type ScreeningContact = Readonly<{ name: string; email: string; phone: string }>;
export type ArticleScreeningRequest = ScreeningContact & Readonly<{
  articleSlug: string;
  screeningType: ArticleScreeningType;
  privacyNoticeVersion: string;
  requestId: string;
  submittedAt: string;
}>;
export type ArticleScreeningResult =
  | Readonly<{ status: "accepted"; receiptId: string }>
  | Readonly<{ status: "error"; reason: "invalid" | "unavailable" | "conflict" | "rate-limited" }>;

export const SCREENING_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const REQUEST_KEYS = ["name", "email", "phone", "articleSlug", "screeningType", "privacyNoticeVersion", "requestId", "submittedAt"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isArticleScreeningType(value: string): value is ArticleScreeningType {
  return Object.hasOwn(articleScreeningTopics, value);
}

export function screeningContactErrors(contact: ScreeningContact) {
  const errors: Partial<Record<keyof ScreeningContact, string>> = {};
  const name = contact.name.trim();
  if (!name) errors.name = "Vyplňte jméno.";
  else if ([...name].length > 80 || /[\u0000-\u001f\u007f]/u.test(name)) errors.name = "Zadejte jméno do 80 znaků.";
  if (!contact.email.trim()) errors.email = "Vyplňte e-mail.";
  else if (!isValidLeadEmail(contact.email.trim())) errors.email = "E-mail není ve správném tvaru.";
  if (!isValidPhone(contact.phone) || !/^[+0-9 ().-]+$/u.test(contact.phone.trim())) {
    errors.phone = "Zadejte telefon ve formátu 731 830 897 nebo +420…";
  }
  return errors;
}

export function parseArticleScreeningRequest(value: unknown, noticeVersion: string, now = Date.now()): ArticleScreeningRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== REQUEST_KEYS.length || REQUEST_KEYS.some((key) => typeof data[key] !== "string")) return null;
  const request = data as unknown as ArticleScreeningRequest;
  if (!isArticleScreeningType(request.screeningType) || request.articleSlug.length > 160 || !SLUG_PATTERN.test(request.articleSlug)
    || request.privacyNoticeVersion !== noticeVersion || !SCREENING_REQUEST_ID_PATTERN.test(request.requestId)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(request.submittedAt)) return null;
  const submittedAt = Date.parse(request.submittedAt);
  if (!Number.isFinite(submittedAt) || submittedAt < now - 30 * 60_000 || submittedAt > now + 2 * 60_000
    || Object.keys(screeningContactErrors(request)).length) return null;
  return { ...request, name: request.name.trim(), email: request.email.trim(), phone: normalizePhone(request.phone) };
}

/** Keep the original identity after a lost response, including unchanged retries. */
export function screeningSubmissionIdentity(
  previous: Readonly<{ key: string; requestId: string; submittedAt: string }> | null,
  request: Omit<ArticleScreeningRequest, "requestId" | "submittedAt">,
  createId: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
) {
  const key = JSON.stringify([request.articleSlug, request.screeningType, request.privacyNoticeVersion,
    request.name.trim(), request.email.trim(), normalizePhone(request.phone)]);
  return previous?.key === key ? previous : { key, requestId: createId(), submittedAt: now() };
}
