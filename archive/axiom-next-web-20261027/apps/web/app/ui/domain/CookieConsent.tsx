"use client";

import { useState, useSyncExternalStore } from "react";
import Button from "../primitives/Button";
import Notice from "../primitives/Notice";
import ConsentBanner from "./ConsentBanner";
import ConsentPreferences from "./ConsentPreferences";
import {
  createConsentStore,
  type ConsentDecision,
  type ConsentStore,
} from "./ConsentStore";

export type { ConsentDecision, ConsentStore } from "./ConsentStore";

export type CookieConsentProps = {
  policyHref: string;
  onDecision?: (decision: ConsentDecision) => void | Promise<void>;
  initialOpen?: boolean;
  initialView?: "banner" | "preferences";
  store?: ConsentStore;
};

export default function CookieConsent({
  initialOpen = true,
  initialView = "banner",
  onDecision,
  policyHref,
  store: providedStore,
}: CookieConsentProps) {
  const [internalStore] = useState(() => createConsentStore());
  const store = providedStore ?? internalStore;
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [open, setOpen] = useState(initialOpen);
  const [view, setView] = useState(initialView);
  const [pending, setPending] = useState<ConsentDecision | null>(null);
  const [error, setError] = useState(false);
  const [confirmation, setConfirmation] = useState<ConsentDecision | null>(null);

  const decide = async (decision: ConsentDecision) => {
    setPending(decision);
    setError(false);
    try {
      await onDecision?.(decision);
      store.decide(decision);
      setConfirmation(decision);
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setPending(null);
    }
  };

  if (!open) {
    return confirmation ? (
      <div data-component="cookie-consent" data-state="saved">
        <Notice live="polite" title="Nastavení cookies bylo uloženo" tone="success">
          Analytika je {snapshot.analytics ? "povolená" : "vypnutá"}. Volbu můžete kdykoli změnit.
        </Notice>
        <Button onClick={() => {
          setView("preferences");
          setOpen(true);
        }} variant="quiet">
          Změnit nastavení
        </Button>
      </div>
    ) : null;
  }

  return (
    <div data-component="cookie-consent" data-state={view}>
      {view === "banner" ? (
        <ConsentBanner
          error={error}
          onDecision={(decision) => void decide(decision)}
          onOpenPreferences={() => setView("preferences")}
          pending={pending}
          policyHref={policyHref}
        />
      ) : (
        <ConsentPreferences
          error={error}
          onClose={() => setOpen(false)}
          onDecision={(decision) => void decide(decision)}
          pending={pending}
          snapshot={snapshot}
        />
      )}
    </div>
  );
}
