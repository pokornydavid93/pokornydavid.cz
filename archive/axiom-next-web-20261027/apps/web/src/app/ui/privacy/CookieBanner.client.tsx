"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { AxiomWebPrivacyConfiguration } from "@axiom/web-core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";
import Button from "@/app/ui/primitives/Button";
import styles from "./CookieBanner.module.css";
import {
  CookieConsentChoice,
  configureCookieConsent,
  getServerCookieConsent,
  readCookieConsent,
  subscribeCookieConsent,
  updateCookieConsent,
} from "./cookieConsent";
import { deleteGaCookies, disableGaRuntime } from "./gaCleanup";
import { clearAxiomMeasurementSession } from "@/lib/analytics/axiom-first-party.client";
import { getSiteUrl } from "@/lib/site";

const REASSURANCE_TEXT = "Žádné šmírování";

export default function CookieBanner({ configuration }: { configuration: AxiomWebPrivacyConfiguration }) {
  const pathname = usePathname();
  const isInternalDesignRoute = pathname?.startsWith("/design-language");
  const policy = useMemo(() => ({
    version: configuration.consent_policy_version,
    acceptedTtlDays: configuration.consent_grant_ttl_days,
    rejectedTtlDays: configuration.consent_reject_ttl_days,
  } as const), [configuration.consent_grant_ttl_days, configuration.consent_policy_version, configuration.consent_reject_ttl_days]);
  configureCookieConsent(policy);
  const [hasMounted, setHasMounted] = useState(false);
  const consent = useSyncExternalStore(
    subscribeCookieConsent,
    readCookieConsent,
    getServerCookieConsent,
  );
  const gaId = configuration.analytics_mode === "ga4_only" || configuration.analytics_mode === "axiom_and_ga4" ? configuration.ga4_measurement_id?.trim() : undefined;
  const reassuranceIndex = configuration.banner_description.indexOf(REASSURANCE_TEXT);

  useEffect(() => {
    let isActive = true;
    const frame = window.requestAnimationFrame(() => {
      if (!isActive) return;
      setHasMounted(true);
    });
    return () => {
      isActive = false;
      window.cancelAnimationFrame(frame);
    };
  }, [policy]);

  const updateConsent = (decision: CookieConsentChoice) => {
    updateCookieConsent(decision, policy);

    if (decision === "rejected") {
      clearAxiomMeasurementSession();
      deleteGaCookies();
      disableGaRuntime(gaId);
    }
  };

  if (!hasMounted) return null;
  if (isInternalDesignRoute || configuration.analytics_mode === "disabled" || consent !== null) {
    return null;
  }

  return (
    <div className={styles.banner} role="region" aria-label="Nastavení cookies">
      <div className={styles.panel} data-surface-tone="dark">
        <span className={styles.illustration} aria-hidden="true">
          <Cookie className={styles.cookieIcon} data-cookie-banner-icon />
        </span>
        <h2 className={styles.title}>{configuration.banner_title}</h2>
        <p className={styles.copy}>
          {reassuranceIndex < 0 ? configuration.banner_description : (
            <>
              {configuration.banner_description.slice(0, reassuranceIndex)}
              <strong className={styles.reassurance}>{REASSURANCE_TEXT}</strong>
              {configuration.banner_description.slice(reassuranceIndex + REASSURANCE_TEXT.length)}
            </>
          )}{" "}
          <Link href={getSiteUrl(configuration.cookie_policy_path)} className={styles.link}>
            Více o cookies
          </Link>
        </p>
        <div className={styles.actions}>
          <Button
            className={styles.choiceButton}
            onClick={() => updateConsent("accepted")}
            variant="secondary"
          >
            Jasně, souhlasím
          </Button>
          <Button
            className={styles.choiceButton}
            onClick={() => updateConsent("rejected")}
            variant="secondary"
          >
            Ne, díky
          </Button>
        </div>
      </div>
    </div>
  );
}
