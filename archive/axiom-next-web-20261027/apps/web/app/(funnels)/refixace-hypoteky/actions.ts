"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { AxiomRuntimeError } from "@axiom/web-core/runtime";
import {
  createRefixationFormState,
  validateRefixationRequest,
  type RefixationFormState,
} from "@/lib/leads/refixation-request";
import {
  getRefixationRuntime,
  isRefixationProductionProviderUnavailable,
} from "@/lib/leads/refixation-runtime.server";

const RECEIPT_TTL_SECONDS = 15 * 60;
const IDEMPOTENCY_TTL_SECONDS = 30 * 60;

const validationMessages = {
  fixationDate: "Vyberte měsíc a rok konce fixace, nebo označte, že termín neznáte.",
  remainingBalanceBand: "Vyberte orientační pásmo zůstatku hypotéky.",
  priority: "Vyberte hlavní prioritu pro další fixaci.",
  name: "Doplňte jméno, pod kterým vás mohu kontaktovat.",
  phone: "Doplňte telefon v použitelném formátu.",
  email: "Doplňte platnou e-mailovou adresu.",
  callbackWindow: "Vyberte preferované časové okno pro callback.",
};

const nextState = (
  previousState: RefixationFormState,
  input: Partial<RefixationFormState>,
): RefixationFormState => ({
  ...previousState,
  ...input,
  attempt: previousState.attempt + 1,
});

const getDevelopmentRateKey = async () => {
  const requestHeaders = await headers();
  const fingerprint = `${requestHeaders.get("user-agent") ?? "unknown"}|${
    requestHeaders.get("accept-language") ?? "unknown"
  }`;
  return `refixation:${createHash("sha256").update(fingerprint).digest("hex")}`;
};

export async function createInitialRefixationState(): Promise<RefixationFormState> {
  return createRefixationFormState(randomUUID());
}

export async function submitRefixationLead(
  previousState: RefixationFormState,
  formData: FormData,
): Promise<RefixationFormState> {
  const result = validateRefixationRequest(formData, validationMessages, new Date(), previousState.submittedAt);

  if (!result.normalized) {
    const securityFailure =
      result.honeypotTriggered || !result.idempotencyKeyValid;
    return nextState(previousState, {
      status: securityFailure ? "duplicate-or-ambiguous" : "invalid",
      errors: securityFailure ? {} : result.errors,
      result: undefined,
    });
  }

  let runtime: ReturnType<typeof getRefixationRuntime>;
  try {
    runtime = getRefixationRuntime();
  } catch (error) {
    if (isRefixationProductionProviderUnavailable(error)) {
      return nextState(previousState, {
        status: "provider-unavailable",
        errors: {},
        result: undefined,
        submittedAt: result.normalized.submittedAt,
      });
    }
    throw error;
  }

  if (runtime.kind === "durable") {
    try {
      await runtime.submit(result.normalized);
      return nextState(previousState, {
        status: "accepted", errors: {}, submittedAt: result.normalized.submittedAt,
        result: {
          fixationBucket: result.normalized.fixationBucket,
          refixationPath: result.normalized.refixationPath,
          callbackWindow: result.normalized.callbackWindow,
        },
      });
    } catch (error) {
      return nextState(previousState, {
        status: error instanceof AxiomRuntimeError && error.status === 429 ? "rate-limited"
          : error instanceof AxiomRuntimeError && error.status === 409 ? "duplicate-or-ambiguous" : "provider-unavailable",
        errors: {}, result: undefined, submittedAt: result.normalized.submittedAt,
      });
    }
  }

  const rate = await runtime.rateLimit.consume(await getDevelopmentRateKey());
  if (!rate.allowed) {
    return nextState(previousState, {
      status: "rate-limited",
      errors: {},
      result: undefined,
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
      result: undefined,
    });
  }

  try {
    await runtime.sink.submit(result.normalized);
  } catch {
    await runtime.idempotency.fail(result.normalized.idempotencyKey, true);
    return nextState(previousState, {
      status: "provider-unavailable",
      errors: {},
      result: undefined,
    });
  }

  try {
    const receiptId = await runtime.receipts.create(
      {
        status: "accepted",
        funnelId: result.normalized.funnelId,
        fixationBucket: result.normalized.fixationBucket,
        refixationPath: result.normalized.refixationPath,
        callbackWindow: result.normalized.callbackWindow,
        createdAt: new Date().toISOString(),
      },
      RECEIPT_TTL_SECONDS,
    );
    await runtime.idempotency.complete(
      result.normalized.idempotencyKey,
      receiptId,
    );
  } catch {
    await runtime.idempotency.fail(result.normalized.idempotencyKey, false);
    return nextState(previousState, {
      status: "duplicate-or-ambiguous",
      errors: {},
      result: undefined,
    });
  }

  return nextState(previousState, {
    status: "accepted",
    errors: {},
    result: {
      fixationBucket: result.normalized.fixationBucket,
      refixationPath: result.normalized.refixationPath,
      callbackWindow: result.normalized.callbackWindow,
    },
  });
}
