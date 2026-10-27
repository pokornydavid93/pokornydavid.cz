"use client";

import { useState } from "react";
import Checkbox from "../forms/Checkbox";
import Button from "../primitives/Button";
import Surface from "../primitives/Surface";
import type { ConsentDecision, ConsentSnapshot } from "./ConsentStore";
import s from "./domain.module.css";

export type ConsentPreferencesProps = {
  snapshot: ConsentSnapshot;
  pending: ConsentDecision | null;
  error: boolean;
  onDecision: (decision: ConsentDecision) => void;
  onClose: () => void;
};

export default function ConsentPreferences({
  error,
  onClose,
  onDecision,
  pending,
  snapshot,
}: ConsentPreferencesProps) {
  const [analytics, setAnalytics] = useState(snapshot.analytics);

  return (
    <Surface as="section" className={s.consentPreferences} componentName="consent-preferences" surface="card-dark" tone="dark">
      <header>
        <span className={s.eyebrow}>Preference</span>
        <h3>Nastavení analytických cookies</h3>
        <p>Nezbytné nastavení je vždy aktivní. Analytiku lze kdykoli povolit nebo znovu odvolat.</p>
      </header>

      <div className={s.consentCategories}>
        <Checkbox checked disabled hint="Uchovává pouze samotnou volbu a zajišťuje základní provoz." name="essential-cookies">
          Nezbytné nastavení
        </Checkbox>
        <Checkbox checked={analytics} hint="Souhrnné statistiky návštěvnosti bez reklamních signálů." name="analytics-cookies" onChange={(event) => setAnalytics(event.currentTarget.checked)}>
          Analytika
        </Checkbox>
      </div>

      {error ? <p aria-live="assertive" className={s.consentError}>Volbu se nepodařilo uložit. Zkuste to znovu.</p> : null}

      <div className={s.cookieActions}>
        <Button disabled={pending !== null} loading={pending !== null} onClick={() => onDecision(analytics ? "all" : "essential")} variant="secondary">
          Uložit preference
        </Button>
        <Button disabled={pending !== null} onClick={() => onDecision("essential")} variant="secondary">
          Odvolat analytiku
        </Button>
        <Button disabled={pending !== null} onClick={onClose} variant="quiet">Zavřít</Button>
      </div>
    </Surface>
  );
}
