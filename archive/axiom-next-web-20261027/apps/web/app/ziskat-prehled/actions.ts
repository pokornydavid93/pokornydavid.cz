"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { overviewFlowContent } from "../content/overview-flow";
import {
  validateOverviewRequest,
  type OverviewFormState,
} from "../../lib/leads/overview-request";
import {
  getPhoneFirstSubmissionFailure,
  getOverviewRuntime,
  isProductionProviderUnavailable,
} from "../../lib/leads/runtime.server";
import { OVERVIEW_RECEIPT_COOKIE } from "../../lib/leads/receipt-cookie";
import { queueOverviewConfirmationEmail } from "../../lib/leads/confirmation-email.server";
import {
  createOverviewConfirmationEmailToken,
  OVERVIEW_CONFIRMATION_EMAIL_COOKIE,
} from "../../lib/leads/overview-confirmation-email";

const RECEIPT_TTL_SECONDS = 15 * 60;
const IDEMPOTENCY_TTL_SECONDS = 30 * 60;

const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/gu, "");
  const localDigits = digits.slice(-9);
  const countryCode = phone.startsWith("+") && digits.length > localDigits.length
    ? `+${digits.slice(0, digits.length - localDigits.length)} `
    : "";
  return `${countryCode}••• ••• ${digits.slice(-3)}`;
};

const nextState = (
  previousState: OverviewFormState,
  input: Partial<OverviewFormState>,
): OverviewFormState => ({
  ...previousState,
  ...input,
  attempt: previousState.attempt + 1,
});

const getDevelopmentRateKey = async () => {
  const requestHeaders = await headers();
  const fingerprint = `${requestHeaders.get("user-agent") ?? "unknown"}|${requestHeaders.get("accept-language") ?? "unknown"}`;
  return `dev:${createHash("sha256").update(fingerprint).digest("hex")}`;
};

export async function submitOverviewRequest(
  previousState: OverviewFormState,
  formData: FormData,
): Promise<OverviewFormState> {
  const result = validateOverviewRequest(
    formData,
    overviewFlowContent.validation,
    overviewFlowContent.collectionNotice.version,
    previousState.submittedAt,
  );

  if (!result.normalized) {
    const securityFailure = result.honeypotTriggered
      || !result.idempotencyKeyValid
      || !result.privacyNoticeVersionValid
      || !result.submittedAtValid
      || !result.campaignHandleValid;
    return nextState(previousState, {
      status: securityFailure ? "duplicate-or-ambiguous" : "invalid",
      errors: securityFailure ? {} : result.errors,
      values: result.values,
    });
  }

  let runtime: ReturnType<typeof getOverviewRuntime>;
  try {
    runtime = getOverviewRuntime();
  } catch (error) {
    if (isProductionProviderUnavailable(error)) {
      return nextState(previousState, {
        status: "provider-unavailable",
        errors: {},
        values: result.values,
        submittedAt: result.normalized.submittedAt,
      });
    }
    throw error;
  }

  if (runtime.kind === "development") {
    const rate = await runtime.rateLimit.consume(await getDevelopmentRateKey());
    if (!rate.allowed) {
      return nextState(previousState, {
        status: "rate-limited",
        errors: {},
        values: result.values,
        submittedAt: result.normalized.submittedAt,
      });
    }

    const acquired = await runtime.idempotency.acquire(
      result.normalized.idempotencyKey,
      IDEMPOTENCY_TTL_SECONDS,
    );
    if (acquired === "duplicate") {
      return nextState(previousState, {
        status: "duplicate-or-ambiguous",
        errors: {},
        values: result.values,
        submittedAt: result.normalized.submittedAt,
      });
    }
  }

  let submission: Awaited<ReturnType<typeof runtime.sink.submit>>;
  try {
    submission = await runtime.sink.submit(result.normalized);
  } catch (error) {
    if (runtime.kind === "development") {
      await runtime.idempotency.fail(result.normalized.idempotencyKey, true);
    }
    const failure = getPhoneFirstSubmissionFailure(error);
    return nextState(previousState, {
      status: failure === "duplicate"
        ? "duplicate-or-ambiguous"
        : failure === "rate-limited"
          ? "rate-limited"
          : "provider-unavailable",
      errors: {},
      values: result.values,
      submittedAt: result.normalized.submittedAt,
    });
  }

  let receiptId: string;
  try {
    receiptId = await runtime.receipts.create(
      {
        status: "accepted",
        intent: result.normalized.intent,
        ...(result.normalized.topic ? { topic: result.normalized.topic } : {}),
        maskedPhone: maskPhone(result.normalized.phone),
        source: result.normalized.source,
        createdAt: new Date().toISOString(),
      },
      RECEIPT_TTL_SECONDS,
      submission.reference,
    );
    if (runtime.kind === "development") {
      await runtime.idempotency.complete(result.normalized.idempotencyKey, receiptId);
    }
  } catch {
    // The sink already accepted this lead. Keep the idempotency lock so a
    // receipt failure cannot turn an uncertain result into a duplicate lead.
    if (runtime.kind === "development") {
      await runtime.idempotency.fail(result.normalized.idempotencyKey, false);
    }
    return nextState(previousState, {
      status: "duplicate-or-ambiguous",
      errors: {},
      values: result.values,
      submittedAt: result.normalized.submittedAt,
    });
  }

  const cookieStore = await cookies();
  const confirmationEmailStatus = runtime.kind === "durable"
    && runtime.confirmationEmailSource === "intake"
    ? submission.confirmationEmailStatus ?? "unavailable"
    : await queueOverviewConfirmationEmail(result.normalized, submission.reference);
  const legacyEmailQueued = confirmationEmailStatus === "queued"
    && !(runtime.kind === "durable" && runtime.confirmationEmailSource === "intake");
  cookieStore.set(OVERVIEW_RECEIPT_COOKIE, receiptId, {
    httpOnly: true,
    maxAge: RECEIPT_TTL_SECONDS,
    path: "/ziskat-prehled",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(
    OVERVIEW_CONFIRMATION_EMAIL_COOKIE,
    legacyEmailQueued
      ? createOverviewConfirmationEmailToken(
          receiptId,
          process.env.AXIOM_MAIL_WORKFLOW_TOKEN!,
        )
      : "",
    {
      httpOnly: true,
      maxAge: legacyEmailQueued ? RECEIPT_TTL_SECONDS : 0,
      path: "/ziskat-prehled",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  redirect("/ziskat-prehled/dekujeme/");
}
