"use client";

import { useId } from "react";
import Button from "../primitives/Button";
import Link from "../primitives/Link";
import Surface from "../primitives/Surface";
import type { ConsentDecision } from "./ConsentStore";
import s from "./domain.module.css";

export type ConsentBannerProps = {
  policyHref: string;
  pending: ConsentDecision | null;
  error: boolean;
  onDecision: (decision: ConsentDecision) => void;
  onOpenPreferences: () => void;
};

export default function ConsentBanner({
  error,
  onDecision,
  onOpenPreferences,
  pending,
  policyHref,
}: ConsentBannerProps) {
  const titleId = useId();

  return (
    <Surface
      as="section"
      aria-labelledby={titleId}
      aria-modal="false"
      className={s.cookieConsent}
      componentName="consent-banner"
      role="dialog"
      surface="card-dark"
      tone="dark"
    >
      <div>
        <span className={s.eyebrow}>Soukromí</span>
        <h3 id={titleId}>Nastavení analytických cookies</h3>
        <p>
          Nezbytné uložení zajišťuje provoz. Analytiku spustím pouze po vašem souhlasu.
          {" "}<Link href={policyHref} variant="text">Podrobnosti o měření</Link>
        </p>
        {error ? <p aria-live="assertive" className={s.consentError}>Volbu se nepodařilo uložit. Zkuste to znovu.</p> : null}
      </div>
      <div className={s.cookieActions}>
        <Button disabled={pending !== null} loading={pending === "essential"} onClick={() => onDecision("essential")} variant="secondary">
          Pouze nezbytné
        </Button>
        <Button disabled={pending !== null} loading={pending === "all"} onClick={() => onDecision("all")} variant="secondary">
          Povolit analytiku
        </Button>
        <Button disabled={pending !== null} onClick={onOpenPreferences} variant="quiet">
          Nastavit preference
        </Button>
      </div>
    </Surface>
  );
}
