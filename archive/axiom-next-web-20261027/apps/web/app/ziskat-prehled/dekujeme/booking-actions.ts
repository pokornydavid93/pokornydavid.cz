"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getPublicBookingRuntime } from "../../../lib/booking/public-booking-runtime.server";
import {
  getOverviewRuntime,
  isProductionProviderUnavailable,
} from "../../../lib/leads/runtime.server";
import { OVERVIEW_RECEIPT_COOKIE } from "../../../lib/leads/receipt-cookie";
import {
  UNAVAILABLE_BOOKING_STATE,
  type OverviewBookingState,
} from "./booking-state";

const SLOT_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{16,2048}$/u;

function deriveIdempotencyKey(receiptToken: string, slotToken: string) {
  // The signed/high-entropy receipt never crosses the Client Component boundary.
  // Derivation makes retries stable across processes without another browser secret.
  const bytes = createHash("sha256")
    .update("overview-booking-idempotency-v1\0")
    .update(receiptToken)
    .update("\0")
    .update(slotToken)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

async function refreshedConflictState(
  runtime: ReturnType<typeof getPublicBookingRuntime>,
): Promise<OverviewBookingState> {
  const availability = await runtime.listSlots();
  return availability.status === "ready"
    ? { status: "conflict", slots: availability.slots }
    : { status: "conflict", slots: Object.freeze([]) };
}

export async function reserveOverviewBooking(
  _previousState: OverviewBookingState,
  formData: FormData,
): Promise<OverviewBookingState> {
  const submittedSlotTokens = formData.getAll("slotToken");
  const slotToken = submittedSlotTokens[0];
  if (
    submittedSlotTokens.length !== 1 ||
    typeof slotToken !== "string" ||
    !SLOT_TOKEN_PATTERN.test(slotToken)
  ) {
    return UNAVAILABLE_BOOKING_STATE;
  }

  const cookieStore = await cookies();
  const receiptToken = cookieStore.get(OVERVIEW_RECEIPT_COOKIE)?.value;
  if (!receiptToken) return UNAVAILABLE_BOOKING_STATE;

  try {
    const overviewRuntime = getOverviewRuntime();
    const receipt = await overviewRuntime.receipts.read(receiptToken);
    if (!receipt) return UNAVAILABLE_BOOKING_STATE;

    const bookingRuntime = getPublicBookingRuntime();
    const result = await bookingRuntime.reserve({
      schema_version: 1,
      idempotency_key: deriveIdempotencyKey(receiptToken, slotToken),
      source_receipt_id: receipt.id,
      slot_token: slotToken,
    });

    if (result.status === "confirmed") {
      return {
        status: "confirmed",
        bookingId: result.booking_id,
        slot: result.slot,
      };
    }
    if (result.status === "conflict") {
      return await refreshedConflictState(bookingRuntime);
    }
    return UNAVAILABLE_BOOKING_STATE;
  } catch (error) {
    if (isProductionProviderUnavailable(error)) {
      return UNAVAILABLE_BOOKING_STATE;
    }
    // Booking is an optional follow-up to an already accepted lead. Fail closed
    // without turning a scheduling outage into a duplicate intake submission.
    return UNAVAILABLE_BOOKING_STATE;
  }
}
