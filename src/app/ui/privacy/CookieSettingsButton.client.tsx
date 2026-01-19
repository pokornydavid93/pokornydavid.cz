"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import styles from "./CookieSettingsButton.module.css";
import { deleteGaCookies, disableGaRuntime } from "./gaCleanup";

const STORAGE_KEY = "cookie_consent_v1";
type ConsentChoice = "accepted" | "rejected";

const readConsent = (): ConsentChoice | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "accepted" || stored === "rejected") {
    return stored;
  }

  return null;
};

export default function CookieSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();

  useEffect(() => {
    setConsent(readConsent());

    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<ConsentChoice>;
      if (customEvent.detail === "accepted" || customEvent.detail === "rejected") {
        setConsent(customEvent.detail);
        return;
      }

      setConsent(readConsent());
    };

    window.addEventListener("cookie-consent-changed", handleConsentChange);
    return () => {
      window.removeEventListener("cookie-consent-changed", handleConsentChange);
    };
  }, []);

  const updateConsent = (decision: ConsentChoice) => {
    window.localStorage.setItem(STORAGE_KEY, decision);
    setConsent(decision);
    window.dispatchEvent(
      new CustomEvent("cookie-consent-changed", { detail: decision })
    );

    if (decision === "rejected") {
      deleteGaCookies();
      disableGaRuntime(gaId);
      try {
        window.location.reload();
      } catch {
        // Ignore reload issues in restricted environments.
      }
    }
  };

  const resetConsent = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
    window.dispatchEvent(new CustomEvent("cookie-consent-changed"));
  };

  const statusLabel =
    consent === "accepted"
      ? "Povoleno"
      : consent === "rejected"
      ? "Zakázáno"
      : "Nezvoleno";

  if (consent === null) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={styles.fab}
        aria-label="Nastaveni cookies"
      >
        <Cookie className={styles.icon} />
      </button>

      {isOpen ? (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.title}>Nastaveni cookies</div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.closeButton}
              aria-label="Zavrit panel"
            >
              <X className={styles.closeIcon} />
            </button>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusLabel}>Analytické cookies (GA4)</div>
            <div className={styles.statusValue}>{statusLabel}</div>
            <div className={styles.statusDescription}>
              Můžeme měřit anonymní návštěvnost (GA4), abychom věděli, co funguje?
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => updateConsent("rejected")}
              className={styles.secondaryButton}
            >
              Nesouhlasím
            </button>
            <button
              type="button"
              onClick={() => updateConsent("accepted")}
              className={styles.primaryButton}
            >
              Souhlasím
            </button>

        
          </div>
          <Link href="/cookies-a-mereni" className={styles.policyLink}>
            Zobrazit zásady cookies
          </Link>
        </div>
      ) : null}
    </div>
  );
}
