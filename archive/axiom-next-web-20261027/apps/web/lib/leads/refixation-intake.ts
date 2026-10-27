import type { ProjectHostingFormCommand } from "@axiom/next/project-hosting-form";
import type { NormalizedRefixationRequest } from "./refixation-request.ts";

const balanceLabels = {
  "under-1m": "méně než 1 mil. Kč", "1-2m": "1–2 mil. Kč", "2-4m": "2–4 mil. Kč",
  "4-6m": "4–6 mil. Kč", "over-6m": "více než 6 mil. Kč", "prefer-not": "neuvedeno",
} as const;
const priorityLabels = {
  "lower-or-keep-payment": "snížit nebo udržet splátku", "longer-certainty": "delší jistota",
  "repay-faster": "rychlejší splacení", "compare-options": "porovnat možnosti", "unknown": "upřesnit při kontaktu",
} as const;
const callbackLabels = { morning: "dopoledne", midday: "poledne", afternoon: "odpoledne", evening: "večer" } as const;

/** Refixation is a housing consultation; its answers stay in the encrypted CRM summary. */
export function refixationIntakeCommand(input: NormalizedRefixationRequest, publicHostname: string): ProjectHostingFormCommand {
  const fixation = input.fixationMonth && input.fixationYear
    ? `${input.fixationMonth}/${input.fixationYear}` : "termín neznámý";
  return {
    schema_version: 1, form_id: "phone-first-consultation", public_hostname: publicHostname,
    request_id: input.idempotencyKey, intent: "housing", topic: "mortgage-refixation",
    situation_note: `Refixace hypotéky. Konec fixace: ${fixation}. Zůstatek: ${balanceLabels[input.remainingBalanceBand]}. Priorita: ${priorityLabels[input.priority]}. Kontakt: ${callbackLabels[input.callbackWindow]}.`,
    phone: input.phone, email: input.email, first_name: input.name,
    preferred_call_time: input.callbackWindow === "midday" ? "" : input.callbackWindow,
    source_context: "funnel", source_cta: "mortgage-refixation-submit",
    privacy_notice_version: input.privacyNoticeVersion, submitted_at: input.submittedAt,
  };
}
