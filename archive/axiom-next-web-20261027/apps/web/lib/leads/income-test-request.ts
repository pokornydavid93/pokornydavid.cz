import { createRandomUuid } from "../random-id.ts";
import { validateIncomeTestInput, type IncomeTestInput, type NormalizedIncomeTestInput } from "../income-test/contract.ts";
import { isValidLeadEmail, isValidPhone, normalizePhone } from "./lead-contract.ts";

export type IncomeTestIntent = "email_result" | "callback";
export type IncomeTestContact = Readonly<{ name: string; email: string; phone?: string; preferredCallTime?: "" | "morning" | "afternoon" | "evening" | "any"; note?: string }>;
type CalculationIntent<Input> =
  | Readonly<{ intent: "email_result"; calculation: Input }>
  | Readonly<{ intent: "callback"; calculation?: Input }>;
export type IncomeTestRequest = IncomeTestContact & CalculationIntent<NormalizedIncomeTestInput> & Readonly<{
  privacyNoticeVersion: string; requestId: string; submittedAt: string;
}>;
export type IncomeTestRequestDraft = IncomeTestContact & CalculationIntent<IncomeTestInput> & Readonly<{
  privacyNoticeVersion: string;
}>;
export type IncomeTestSubmitResult =
  | Readonly<{ status: "accepted"; receiptId: string; intent: IncomeTestIntent; delivery: "queued" | "accepted" }>
  | Readonly<{ status: "error"; reason: "invalid" | "unavailable" | "conflict" | "rate-limited" }>;
export type IncomeTestSubmissionIdentity = Readonly<{ key: string; requestId: string; submittedAt: string }>;

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const BASE_KEYS = ["intent", "name", "email", "privacyNoticeVersion", "requestId", "submittedAt"];
const CALLBACK_KEYS = ["phone", "preferredCallTime", "note"];
export function incomeTestContactErrors(contact: IncomeTestContact, intent: IncomeTestIntent) {
  const errors: Partial<Record<keyof IncomeTestContact, string>> = {};
  if (!contact.name.trim() || [...contact.name.trim()].length > 80 || /[\u0000-\u001f\u007f]/u.test(contact.name)) errors.name = "Vyplňte jméno do 80 znaků.";
  if (!isValidLeadEmail(contact.email.trim())) errors.email = "Zadejte platný e-mail.";
  if (intent === "callback" && (!isValidPhone(contact.phone ?? "") || !/^[+0-9 ().-]+$/u.test(contact.phone?.trim() ?? ""))) errors.phone = "Zadejte telefon ve formátu 731 830 897 nebo +420…";
  if (contact.preferredCallTime !== undefined && !["", "morning", "afternoon", "evening", "any"].includes(contact.preferredCallTime)) errors.preferredCallTime = "Vyberte čas kontaktu.";
  if (contact.note !== undefined && ([...contact.note.trim()].length > 500 || /[\u0000-\u0009\u000b-\u001f\u007f]/u.test(contact.note))) errors.note = "Zpráva může mít nejvýše 500 znaků.";
  return errors;
}
export function parseIncomeTestRequest(value: unknown, noticeVersion: string, now = Date.now()): IncomeTestRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.intent !== "email_result" && data.intent !== "callback") return null;
  const allowed = [...BASE_KEYS, "calculation", ...(data.intent === "callback" ? CALLBACK_KEYS : [])];
  if (Object.keys(data).some((key) => !allowed.includes(key)) || BASE_KEYS.some((key) => !(key in data))) return null;
  if (["name", "email", "privacyNoticeVersion", "requestId", "submittedAt"].some((key) => typeof data[key] !== "string")
    || CALLBACK_KEYS.some((key) => key in data && typeof data[key] !== "string")) return null;
  const request = data as unknown as IncomeTestRequest;
  const hasCalculation = Object.hasOwn(data, "calculation");
  const calculation = hasCalculation ? validateIncomeTestInput(data.calculation) : null;
  if ((data.intent === "email_result" && !hasCalculation) || (calculation !== null && !calculation.success)) return null;
  if (request.privacyNoticeVersion !== noticeVersion || !REQUEST_ID.test(request.requestId)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(request.submittedAt)) return null;
  const submittedAt = Date.parse(request.submittedAt);
  if (!Number.isFinite(submittedAt) || submittedAt < now - 30 * 60_000 || submittedAt > now + 2 * 60_000 || Object.keys(incomeTestContactErrors(request, request.intent)).length) return null;
  const common = { name: request.name.trim(), email: request.email.trim(), privacyNoticeVersion: request.privacyNoticeVersion,
    requestId: request.requestId, submittedAt: request.submittedAt };
  if (request.intent === "email_result") {
    if (!calculation?.success) return null;
    return { ...common, intent: "email_result", calculation: calculation.data };
  }
  return { ...common, intent: "callback", phone: normalizePhone(request.phone ?? ""), preferredCallTime: request.preferredCallTime ?? "", note: request.note?.trim() ?? "",
    ...(calculation?.success ? { calculation: calculation.data } : {}) };
}
/** Keep in memory only. A changed action, contact or calculation gets a new ID. */
export function incomeTestSubmissionIdentity(previous: IncomeTestSubmissionIdentity | null, request: IncomeTestRequestDraft,
  createId: () => string = createRandomUuid, now: () => string = () => new Date().toISOString()): IncomeTestSubmissionIdentity {
  const calculation = request.calculation === undefined ? null : validateIncomeTestInput(request.calculation);
  const key = JSON.stringify([request.intent, request.name.trim(), request.email.trim(),
    request.intent === "callback" ? [normalizePhone(request.phone ?? ""), request.preferredCallTime ?? "", request.note?.trim() ?? ""] : null,
    calculation?.success ? calculation.data : request.calculation ?? null, request.privacyNoticeVersion]);
  return previous?.key === key ? previous : { key, requestId: createId(), submittedAt: now() };
}
