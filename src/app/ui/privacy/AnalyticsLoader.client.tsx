"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { disableGaRuntime } from "./gaCleanup";

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

type AnalyticsLoaderProps = {
  gaId?: string;
};

export default function AnalyticsLoader({ gaId }: AnalyticsLoaderProps) {
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  const measurementId = gaId?.trim();

  useEffect(() => {
    const initialConsent = readConsent();
    setConsent(initialConsent);

    if (initialConsent === "rejected") {
      disableGaRuntime(measurementId);
    }

    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<ConsentChoice>;
      if (customEvent.detail === "accepted" || customEvent.detail === "rejected") {
        setConsent(customEvent.detail);
        if (customEvent.detail === "rejected") {
          disableGaRuntime(measurementId);
        }
        return;
      }

      const updatedConsent = readConsent();
      setConsent(updatedConsent);
      if (updatedConsent === "rejected") {
        disableGaRuntime(measurementId);
      }
    };

    window.addEventListener("cookie-consent-changed", handleConsentChange);
    return () => {
      window.removeEventListener("cookie-consent-changed", handleConsentChange);
    };
  }, [measurementId]);

  const shouldLoad = Boolean(measurementId) && consent === "accepted";

  if (!shouldLoad || !measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
