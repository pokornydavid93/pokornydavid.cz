"use client";

import { CalendarCheck } from "lucide-react";
import { useId, useState } from "react";
import Button from "../primitives/Button";
import Link from "../primitives/Link";
import Notice from "../primitives/Notice";
import Surface from "../primitives/Surface";
import CalendarProviderAdapter, {
  type CalendarProvider,
  type CalendarProviderFailure,
  type CalendarProviderState,
} from "./CalendarProviderAdapter";
import s from "./domain.module.css";
import { toneForSurface, type DomainSurfaceRole } from "./surfaceTone";

export type BookingProvider = CalendarProvider;

export type BookingPanelProps = {
  provider?: BookingProvider;
  privacyAccepted: boolean;
  privacyWithdrawn?: boolean;
  fallbackHref: string;
  onPrivacyRequest?: () => void;
  onPrivacyWithdraw?: () => void;
  providerFailure?: CalendarProviderFailure;
  title?: string;
  surface?: DomainSurfaceRole;
};

export default function BookingPanel({
  fallbackHref,
  onPrivacyRequest,
  onPrivacyWithdraw,
  privacyAccepted,
  privacyWithdrawn = false,
  provider,
  providerFailure,
  surface = "card-light",
  title = "Vyberte si termín konzultace",
}: BookingPanelProps) {
  const titleId = useId();
  const [providerState, setProviderState] = useState<CalendarProviderState>("loading");
  const state = privacyWithdrawn
    ? "withdrawn"
    : !privacyAccepted || !provider
      ? "blocked"
      : providerFailure ?? providerState;

  return (
    <Surface
      as="section"
      aria-labelledby={titleId}
      className={s.bookingPanel}
      componentName="booking-panel"
      data-state={state}
      surface={surface}
      tone={toneForSurface(surface)}
    >
      <header>
        <span className={s.eyebrow}>Rezervace</span>
        <h3 id={titleId}>{title}</h3>
      </header>

      {state === "blocked" ? (
        <Notice title="Externí kalendář čeká na povolení" tone="info">
          Kalendář se načte až po potvrzení. Přímý kontakt zůstává vždy dostupný.
        </Notice>
      ) : null}
      {state === "loading" ? <p aria-live="polite">Načítám dostupné termíny…</p> : null}
      {state === "provider-error" ? (
        <Notice live="assertive" title="Kalendář se nepodařilo načíst" tone="error">
          Poskytovatel vrátil chybu. Použijte přímou náhradní cestu pod panelem.
        </Notice>
      ) : null}
      {state === "network-blocked" ? (
        <Notice live="assertive" title="Síť blokuje externí kalendář" tone="error">
          Zkontrolujte síťové omezení nebo použijte přímou náhradní cestu.
        </Notice>
      ) : null}
      {state === "withdrawn" ? (
        <Notice title="Povolení kalendáře bylo odvoláno" tone="info">
          Externí obsah byl odebrán. Přímý kontakt zůstává dostupný.
        </Notice>
      ) : null}

      {privacyAccepted && !privacyWithdrawn && provider ? (
        <CalendarProviderAdapter
          failure={providerFailure}
          onStateChange={setProviderState}
          provider={provider}
        />
      ) : null}

      <div className={s.bookingActions}>
        {(!privacyAccepted || privacyWithdrawn) && onPrivacyRequest ? (
          <Button onClick={onPrivacyRequest} startIcon={<CalendarCheck />} type="button" variant="secondary">
            {privacyWithdrawn ? "Znovu povolit kalendář" : "Povolit kalendář"}
          </Button>
        ) : null}
        {privacyAccepted && onPrivacyWithdraw ? (
          <Button onClick={onPrivacyWithdraw} type="button" variant="quiet">
            Odvolat povolení
          </Button>
        ) : null}
        <Link href={fallbackHref} variant="secondary-action">Domluvit termín přímo</Link>
      </div>
    </Surface>
  );
}
