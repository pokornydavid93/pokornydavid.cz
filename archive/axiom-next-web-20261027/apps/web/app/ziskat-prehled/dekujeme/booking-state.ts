import type { PublicBookingSlot } from "../../../lib/booking/public-booking-contract";

export type OverviewBookingState =
  | Readonly<{
      status: "ready";
      slots: readonly PublicBookingSlot[];
    }>
  | Readonly<{
      status: "conflict";
      slots: readonly PublicBookingSlot[];
    }>
  | Readonly<{
      status: "unavailable";
      slots: readonly PublicBookingSlot[];
    }>
  | Readonly<{
      status: "confirmed";
      bookingId: string;
      slot: PublicBookingSlot;
    }>;

export const UNAVAILABLE_BOOKING_STATE: OverviewBookingState = Object.freeze({
  status: "unavailable",
  slots: Object.freeze([]),
});
