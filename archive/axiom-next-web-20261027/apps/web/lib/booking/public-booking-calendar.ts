import {
  createAxiomBookingIcs,
  createAxiomGoogleCalendarUrl,
} from "@axiom/web-core/calendar";
import type {
  PublicBookingConfirmedResult,
  PublicBookingMode,
  PublicBookingSlot,
} from "./public-booking-contract.ts";

export const publicBookingModeLabels: Readonly<
  Record<PublicBookingMode, string>
> = Object.freeze({
  phone: "Telefonicky",
  video: "Online hovor",
  in_person: "Osobně",
});

export type PublicBookingDayGroup = Readonly<{
  key: string;
  label: string;
  slots: readonly PublicBookingSlot[];
}>;

const capitalizeFirst = (value: string) =>
  value.length === 0 ? value : `${value[0]?.toLocaleUpperCase("cs-CZ")}${value.slice(1)}`;

const dateKey = (slot: PublicBookingSlot) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: slot.timezone,
    year: "numeric",
  }).formatToParts(new Date(slot.starts_at));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
};

export function formatPublicBookingDay(slot: PublicBookingSlot) {
  return capitalizeFirst(
    new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "long",
      timeZone: slot.timezone,
      weekday: "long",
    }).format(new Date(slot.starts_at)),
  );
}

export function formatPublicBookingDate(slot: PublicBookingSlot) {
  return capitalizeFirst(
    new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "long",
      timeZone: slot.timezone,
      weekday: "long",
      year: "numeric",
    }).format(new Date(slot.starts_at)),
  );
}

export function formatPublicBookingTime(slot: PublicBookingSlot) {
  const formatter = new Intl.DateTimeFormat("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: slot.timezone,
  });
  return `${formatter.format(new Date(slot.starts_at))}–${formatter.format(new Date(slot.ends_at))}`;
}

export function groupPublicBookingSlots(
  slots: readonly PublicBookingSlot[],
): readonly PublicBookingDayGroup[] {
  const sorted = [...slots].sort(
    (left, right) => Date.parse(left.starts_at) - Date.parse(right.starts_at),
  );
  const groups = new Map<string, PublicBookingSlot[]>();

  for (const slot of sorted) {
    const key = `${slot.timezone}:${dateKey(slot)}`;
    const group = groups.get(key);
    if (group) group.push(slot);
    else groups.set(key, [slot]);
  }

  return Object.freeze(
    [...groups.entries()].map(([key, daySlots]) =>
      Object.freeze({
        key,
        label: formatPublicBookingDay(daySlots[0]!),
        slots: Object.freeze(daySlots),
      }),
    ),
  );
}

const modeDescription: Readonly<Record<PublicBookingMode, string>> =
  Object.freeze({
    phone: "V domluvený čas vám zavolám.",
    video: "Podrobnosti k online hovoru obdržíte samostatně.",
    in_person: "Podrobnosti k místu setkání obdržíte samostatně.",
  });

export function createPublicBookingGoogleCalendarUrl(slot: PublicBookingSlot) {
  return createAxiomGoogleCalendarUrl(slot, {
    title: "Konzultace s Davidem Pokorným",
    details: `Domluvený termín finanční konzultace. ${modeDescription[slot.mode]}`,
  });
}

export function createPublicBookingIcs(
  booking: Pick<PublicBookingConfirmedResult, "booking_id" | "slot">,
  generatedAt = new Date(),
) {
  return createAxiomBookingIcs(
    { schema_version: 1, status: "confirmed", ...booking },
    {
      title: "Konzultace s Davidem Pokorným",
      description: `Domluvený termín finanční konzultace. ${modeDescription[booking.slot.mode]}`,
      location: publicBookingModeLabels[booking.slot.mode],
      organizer_domain: "booking.pokornydavid.cz",
      now: generatedAt,
    },
  );
}
