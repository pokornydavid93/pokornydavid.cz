import type { ProjectHostingFormClient, ProjectHostingIncomeTestContext } from "@axiom/next/project-hosting-form";
import type { IncomeTestRequest, IncomeTestSubmitResult } from "./income-test-request.ts";

export async function acceptIncomeTest(request: IncomeTestRequest, dependencies: Readonly<{
  publicHostname: string; intake: Pick<ProjectHostingFormClient, "submit">;
}>): Promise<IncomeTestSubmitResult> {
  const input = request.calculation;
  // Missing input represents an explicit early callback, never a zero-filled
  // calculation. A result email always requires the complete validated input.
  if (request.intent === "email_result" && !input) return { status: "error", reason: "invalid" };
  const wireInput = input ? {
    income_a: input.incomeA, income_b: input.incomeB, mortgage_payment: input.mortgagePayment,
    essential_costs: input.essentialCosts, reserve: input.reserve, target_months: input.targetMonths,
    remaining_income_a: input.remainingIncomeA, remaining_income_b: input.remainingIncomeB,
  } : undefined;
  const context: ProjectHostingIncomeTestContext = request.intent === "email_result"
    ? { action: "email_result", input: wireInput! }
    : { action: "callback", ...(wireInput ? { input: wireInput } : {}) };
  const receipt = await dependencies.intake.submit({
    schema_version: 1, form_id: "income-test", public_hostname: dependencies.publicHostname,
    request_id: request.requestId, intent: "housing", topic: "mortgage",
    situation_note: request.intent === "callback" ? request.note ?? "" : "",
    phone: request.intent === "callback" ? request.phone ?? "" : "", email: request.email, first_name: request.name,
    preferred_call_time: request.intent === "callback" ? request.preferredCallTime ?? "" : "",
    source_context: "funnel", source_cta: request.intent === "callback" ? "income-test-callback" : "income-test-result",
    privacy_notice_version: request.privacyNoticeVersion, submitted_at: request.submittedAt,
    income_test: context,
  });
  if (receipt.intent !== "housing" || receipt.request_kind !== request.intent
    || (request.intent === "callback" && receipt.masked_phone.slice(-3) !== request.phone?.slice(-3))
    || (request.intent === "email_result" && receipt.masked_phone !== "")) return { status: "error", reason: "unavailable" };
  return { status: "accepted", receiptId: receipt.receipt_id, intent: request.intent,
    delivery: receipt.confirmation_email_status === "queued" ? "queued" : "accepted" };
}
