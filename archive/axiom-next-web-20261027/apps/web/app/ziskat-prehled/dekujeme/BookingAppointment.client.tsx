"use client";

import {
  CalendarDays,
  Check,
  Clock3,
  Download,
  ExternalLink,
  MapPin,
  PhoneCall,
  Video,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  createPublicBookingGoogleCalendarUrl,
  createPublicBookingIcs,
  formatPublicBookingDate,
  formatPublicBookingTime,
  groupPublicBookingSlots,
  publicBookingModeLabels,
} from "../../../lib/booking/public-booking-calendar";
import type {
  PublicBookingMode,
  PublicBookingSlot,
} from "../../../lib/booking/public-booking-contract";
import { trackAnalyticsEvent } from "../../../lib/analytics/track.client";
import { reserveOverviewBooking } from "./booking-actions";
import type { OverviewBookingState } from "./booking-state";
import s from "./bookingAppointment.module.css";

const modeIcons: Readonly<Record<PublicBookingMode, typeof PhoneCall>> = {
  phone: PhoneCall,
  video: Video,
  in_person: MapPin,
};
const modeConfirmation: Readonly<Record<PublicBookingMode, string>> = {
  phone: "V domluvený čas vám zavolám.",
  video: "Odkaz k online hovoru obdržíte samostatně.",
  in_person: "Podrobnosti k místu setkání obdržíte samostatně.",
};
const EMPTY_SLOTS: readonly PublicBookingSlot[] = Object.freeze([]);

function CalendarConfirmation({
  bookingId,
  slot,
}: {
  bookingId: string;
  slot: PublicBookingSlot;
}) {
  const googleCalendarUrl = createPublicBookingGoogleCalendarUrl(slot);

  const downloadCalendarEvent = () => {
    const contents = createPublicBookingIcs({
      booking_id: bookingId,
      slot,
    });
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/calendar;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "konzultace-s-davidem-pokornym.ics";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <section
      aria-live="polite"
      aria-labelledby="booking-confirmed-title"
      className={`${s.bookingShell} ${s.confirmation}`}
      data-booking-status="confirmed"
    >
      <div aria-hidden="true" className={s.confirmationMark}>
        <Check />
      </div>
      <div className={s.confirmationBody}>
        <span className={s.eyebrow}>TERMÍN POTVRZEN</span>
        <h2 id="booking-confirmed-title">Máme domluveno.</h2>
        <p className={s.confirmedDate}>
          {formatPublicBookingDate(slot)} · {formatPublicBookingTime(slot)}
        </p>
        <p className={s.confirmedMode}>
          {publicBookingModeLabels[slot.mode]}. {modeConfirmation[slot.mode]}
        </p>
      </div>

      <div aria-label="Přidat termín do kalendáře" className={s.calendarActions}>
        <a
          className={s.googleCalendarAction}
          href={googleCalendarUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <CalendarDays aria-hidden="true" />
          <span>Přidat do Google Kalendáře</span>
          <ExternalLink aria-hidden="true" />
        </a>
        <button
          className={s.downloadCalendarAction}
          onClick={downloadCalendarEvent}
          type="button"
        >
          <Download aria-hidden="true" />
          <span>Stáhnout událost .ics</span>
        </button>
      </div>
    </section>
  );
}

function SlotOption({ slot }: { slot: PublicBookingSlot }) {
  const ModeIcon = modeIcons[slot.mode];
  return (
    <label className={s.slotOption}>
      <input
        className={s.slotInput}
        name="slotToken"
        required
        type="radio"
        value={slot.slot_token}
      />
      <span className={s.slotSurface}>
        <span className={s.slotTime}>{formatPublicBookingTime(slot)}</span>
        <span className={s.slotMode}>
          <ModeIcon aria-hidden="true" />
          {publicBookingModeLabels[slot.mode]}
        </span>
        <span aria-hidden="true" className={s.slotCheck}>
          <Check />
        </span>
      </span>
    </label>
  );
}

export default function BookingAppointment({
  initialState,
  preview = false,
}: {
  initialState: OverviewBookingState;
  preview?: boolean;
}) {
  const [actionState, formAction, pending] = useActionState(
    reserveOverviewBooking,
    initialState,
  );
  const startedAnalyticsRef = useRef(false);
  const completedAnalyticsRef = useRef(false);

  const slots = "slots" in actionState ? actionState.slots : EMPTY_SLOTS;
  const groups = useMemo(() => groupPublicBookingSlots(slots), [slots]);

  useEffect(() => {
    if (actionState.status !== "confirmed" || completedAnalyticsRef.current) {
      return;
    }
    completedAnalyticsRef.current = trackAnalyticsEvent({
      name: "booking_complete",
      source: "thank-you",
    });
  }, [actionState.status]);

  if (actionState.status === "confirmed") {
    return (
      <CalendarConfirmation
        bookingId={actionState.bookingId}
        slot={actionState.slot}
      />
    );
  }

  if (actionState.status === "unavailable") {
    return (
      <section
        aria-labelledby="booking-title"
        className={`${s.bookingShell} ${s.unavailable}`}
        data-booking-status="unavailable"
      >
        <CalendarDays aria-hidden="true" className={s.unavailableIcon} />
        <div>
          <span className={s.eyebrow}>TERMÍN HOVORU</span>
          <h2 id="booking-title">Volné časy teď nelze načíst.</h2>
          <p>
            Vaši poptávku jsem přijal a ozvu se vám telefonicky. Nemusíte nic
            odesílat znovu.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="booking-title"
      className={s.bookingShell}
      data-booking-status={actionState.status}
    >
      <header className={s.bookingHeader}>
        <div>
          <span className={s.eyebrow}>VOLITELNÝ DALŠÍ KROK</span>
          <h2 id="booking-title">Vyberte si přesný čas konzultace.</h2>
          <p>
            Pokud nechcete čekat, rezervujte si rovnou konkrétní čas. Poptávka
            už je přijatá — výběr termínu je navíc.
          </p>
        </div>
        <span className={s.timezoneNote}>
          <Clock3 aria-hidden="true" />
          Čas v Česku
        </span>
      </header>

      {actionState.status === "conflict" ? (
        <div className={s.conflictNotice} role="alert">
          <strong>Tento čas mezitím obsadil někdo jiný.</strong>
          <span>Aktualizovali jsme nabídku. Vyberte prosím jiný termín.</span>
        </div>
      ) : null}

      {groups.length > 0 ? (
        <form
          action={preview ? undefined : formAction}
          className={s.bookingForm}
          onChange={(event) => {
            if (preview) return;
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || target.name !== "slotToken") {
              return;
            }
            if (!startedAnalyticsRef.current) {
              startedAnalyticsRef.current = trackAnalyticsEvent({
                name: "booking_start",
                source: "thank-you",
              });
            }
          }}
          onSubmit={preview ? (event) => event.preventDefault() : undefined}
        >
          <div className={s.dayList}>
            {groups.map((group) => (
              <fieldset className={s.dayGroup} disabled={pending} key={group.key}>
                <legend>{group.label}</legend>
                <div className={s.slotGrid}>
                  {group.slots.map((slot) => (
                    <SlotOption key={slot.slot_token} slot={slot} />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className={s.bookingFooter}>
            <p>
              {preview
                ? "Náhled termínů. Potvrzení rezervace je vypnuté."
                : "Termín je závazný až po potvrzení. Bez registrace a bez sdílení kalendáře."}
            </p>
            <button
              aria-busy={pending || undefined}
              className={s.confirmAction}
              disabled={pending || preview}
              type="submit"
            >
              {pending ? "Potvrzuji…" : "Potvrdit termín"}
            </button>
          </div>
        </form>
      ) : (
        <div className={s.noSlots} role="status">
          <CalendarDays aria-hidden="true" />
          <div>
            <strong>Nejbližší termíny jsou právě obsazené.</strong>
            <span>Vaši poptávku jsem přijal a ozvu se vám telefonicky.</span>
          </div>
        </div>
      )}
    </section>
  );
}
