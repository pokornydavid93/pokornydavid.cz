import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPublicBookingGoogleCalendarUrl,
  createPublicBookingIcs,
  formatPublicBookingDate,
  formatPublicBookingTime,
  groupPublicBookingSlots,
} from "../../lib/booking/public-booking-calendar.ts";

const BOOKING_ID = "2aa92a50-b891-5eb2-8ee5-8e40249acbef";

const slot = (overrides = {}) => ({
  slot_token: "slot.v1.abcdefghijklmnopqrstuvwxyz0123456789",
  starts_at: "2026-09-10T08:00:00.000Z",
  ends_at: "2026-09-10T08:30:00.000Z",
  timezone: "Europe/Prague",
  mode: "phone",
  ...overrides,
});

describe("public booking calendar presentation", () => {
  it("sorts slots and groups them by their local calendar day", () => {
    const groups = groupPublicBookingSlots([
      slot({
        slot_token: "slot.v1.third.abcdefghijklmnopqrstuvwxyz",
        starts_at: "2026-09-11T07:00:00.000Z",
        ends_at: "2026-09-11T07:30:00.000Z",
      }),
      slot({
        slot_token: "slot.v1.second.abcdefghijklmnopqrstuvwxyz",
        starts_at: "2026-09-10T10:00:00.000Z",
        ends_at: "2026-09-10T10:30:00.000Z",
      }),
      slot(),
    ]);

    assert.equal(groups.length, 2);
    assert.equal(groups[0].label, "Čtvrtek 10. září");
    assert.deepEqual(
      groups[0].slots.map((item) => item.starts_at),
      ["2026-09-10T08:00:00.000Z", "2026-09-10T10:00:00.000Z"],
    );
    assert.equal(groups[1].label, "Pátek 11. září");
    assert.equal(formatPublicBookingTime(slot()), "10:00–10:30");
    assert.equal(formatPublicBookingDate(slot()), "Čtvrtek 10. září 2026");
  });

  it("creates a fixed Google Calendar template without contact data", () => {
    const url = new URL(createPublicBookingGoogleCalendarUrl(slot()));
    assert.equal(url.origin, "https://calendar.google.com");
    assert.equal(url.pathname, "/calendar/render");
    assert.equal(url.searchParams.get("action"), "TEMPLATE");
    assert.equal(
      url.searchParams.get("dates"),
      "20260910T080000Z/20260910T083000Z",
    );
    assert.equal(url.searchParams.get("ctz"), "Europe/Prague");
    assert.doesNotMatch(url.toString(), /email|telefon|731|receipt/iu);
  });

  it("emits a CRLF, folded and PII-free RFC5545 event", () => {
    const source = createPublicBookingIcs(
      { booking_id: BOOKING_ID, slot: slot() },
      new Date("2026-09-02T12:34:56.000Z"),
    );

    assert.ok(source.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
    assert.ok(source.endsWith("END:VCALENDAR\r\n"));
    assert.match(source, /\r\nDTSTAMP:20260902T123456Z\r\n/u);
    assert.match(source, /\r\nDTSTART:20260910T080000Z\r\n/u);
    assert.match(source, /\r\nDTEND:20260910T083000Z\r\n/u);
    assert.match(
      source,
      new RegExp(`\\r\\nUID:${BOOKING_ID}@booking\\.pokornydavid\\.cz\\r\\n`, "u"),
    );
    assert.doesNotMatch(source.replaceAll("\r\n", ""), /\n/u);
    assert.ok(
      source.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75),
    );
    assert.doesNotMatch(source, /mailto|masked|receipt|phone_number/iu);
  });
});
