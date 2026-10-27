"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { AxiomWebPrivacyConfiguration } from "@axiom/web-core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie, X } from "lucide-react";
import IconButton from "@/app/ui/primitives/IconButton";
import styles from "./CookieSettingsButton.module.css";
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
import { COOKIE_SETTINGS_OPEN_EVENT } from "./cookieSettings";

const HIDE_THRESHOLD_PX = 5;
const TOP_REVEAL_PX = 24;

export default function CookieSettingsButton({ configuration }: { configuration: AxiomWebPrivacyConfiguration }) {
  const pathname = usePathname();
  const isInternalDesignRoute = pathname?.startsWith("/design-language");
  const isAboutRoute = pathname === "/kdo-jsem" || pathname === "/kdo-jsem/";
  const isOverviewRoute = pathname === "/ziskat-prehled" || pathname?.startsWith("/ziskat-prehled/");
  const [isOpen, setIsOpen] = useState(false);
  const [persistenceFailed, setPersistenceFailed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [aboutHeroVisible, setAboutHeroVisible] = useState(false);
  const panelId = useId();
  const titleId = useId();

  const lastYRef = useRef(0);
  const tickingRef = useRef(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const gaId = configuration.analytics_mode === "ga4_only" || configuration.analytics_mode === "axiom_and_ga4" ? configuration.ga4_measurement_id?.trim() : undefined;
  const policy = useMemo(() => ({
    version: configuration.consent_policy_version,
    acceptedTtlDays: configuration.consent_grant_ttl_days,
    rejectedTtlDays: configuration.consent_reject_ttl_days,
  } as const), [configuration.consent_grant_ttl_days, configuration.consent_policy_version, configuration.consent_reject_ttl_days]);
  configureCookieConsent(policy);

  const consent = useSyncExternalStore(
    subscribeCookieConsent,
    readCookieConsent,
    getServerCookieConsent,
  );

  // Hide/show FAB při scrollování (ale nikdy neschovávej když je panel otevřený)
  useEffect(() => {
    lastYRef.current = window.scrollY || 0;

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const dy = y - lastYRef.current;

        if (isOpen) {
          setHidden(false);
        } else if (y <= TOP_REVEAL_PX) {
          setHidden(false);
        } else if (Math.abs(dy) >= HIDE_THRESHOLD_PX) {
          setHidden(dy > 0);
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isOpen]);

  useEffect(() => {
    const openSettings = () => {
      setHidden(false);
      setIsOpen(true);
    };

    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
    return () =>
      window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      returnFocusRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isAboutRoute) return undefined;

    const hero = document.querySelector<HTMLElement>(
      "[data-about-hero-chapter]",
    );

    if (!hero) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setAboutHeroVisible(entry?.isIntersecting ?? false),
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [isAboutRoute]);

  const updateConsent = (decision: CookieConsentChoice) => {
    const persisted = updateCookieConsent(decision, policy);
    setPersistenceFailed(!persisted);

    if (decision === "rejected") {
      clearAxiomMeasurementSession();
      deleteGaCookies();
      disableGaRuntime(gaId);
      try {
        if (persisted) window.location.reload();
      } catch {
        // ignore
      }
    }
  };

  const measurementDisabled = configuration.analytics_mode === "disabled";
  const isAnalyticsEnabled = !measurementDisabled && consent === "accepted";
  const isAboutHeroOccluding = isAboutRoute && aboutHeroVisible;
  const shouldHide = !isOpen && (hidden || isAboutHeroOccluding);

  if (
    isInternalDesignRoute ||
    pathname?.startsWith("/funnels/") ||
    (!measurementDisabled && consent === null && !isOpen)
  ) {
    return null;
  }

  return (
    <div
      className={styles.wrapper}
      data-about-hero-occluded={isAboutHeroOccluding ? "true" : undefined}
      data-cookie-settings
      data-cookie-settings-open={isOpen ? "true" : undefined}
      data-overview-route={isOverviewRoute ? "true" : undefined}
      data-surface-tone="dark"
    >
      {isOverviewRoute ? (
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          className={styles.inlineButton}
          onClick={() => setIsOpen((prev) => !prev)}
          type="button"
        >
          <Cookie aria-hidden="true" className={styles.inlineIcon} />
          Nastavení cookies
        </button>
      ) : (
        <IconButton
          onClick={() => setIsOpen((prev) => !prev)}
          className={`${styles.fab} ${shouldHide ? styles.fabHidden : ""}`}
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-hidden={shouldHide ? true : undefined}
          icon={<Cookie className={styles.icon} />}
          label="Nastavení cookies"
          tabIndex={shouldHide ? -1 : undefined}
        />
      )}

      {isOpen ? (
        <div
          aria-labelledby={titleId}
          className={styles.panel}
          id={panelId}
          role="region"
        >
          <div className={styles.header}>
            <div>
              <div className={styles.title} id={titleId}>
                Soukromí a cookies
              </div>
              <p className={styles.subtitle}>{measurementDisabled ? "Volitelné měření je vypnuté." : "Analytiku můžete kdykoli změnit."}</p>
            </div>
            <IconButton
              data-cursor-no-frame
              data-cursor-no-magnetic
              onClick={() => {
                setIsOpen(false);
                returnFocusRef.current?.focus({ preventScroll: true });
              }}
              className={styles.closeButton}
              icon={<X className={styles.closeIcon} />}
              label="Zavřít panel"
            />
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <div>
                <div className={styles.statusLabel}>{measurementDisabled ? "Volitelné měření" : configuration.analytics_mode === "ga4_only" ? "Google Analytics 4" : configuration.analytics_mode === "axiom_and_ga4" ? "Analytika Axiom + GA4" : "Analytika Axiom"}</div>
                <div className={styles.statusDescription}>
                  {measurementDisabled ? "Web funguje bez analytiky." : configuration.analytics_mode === "ga4_only"
                    ? "Statistiky návštěvnosti. Bez reklamních signálů."
                    : "Návštěvy, aktivní čas a průchod webem. Bez obsahu kontaktních a finančních polí."}
                </div>
              </div>
              <div className={styles.statusValue}>
                {isAnalyticsEnabled ? "Zapnuto" : "Vypnuto"}
              </div>
            </div>
          </div>

          {persistenceFailed ? <p className={styles.subtitle} role="status">
            Vaši volbu se nepodařilo zapamatovat. Analytika je v této kartě{" "}
            {isAnalyticsEnabled ? "zapnutá" : "vypnutá"}. Při dalším otevření webu nastavení zkontrolujte.
          </p> : null}

          {!measurementDisabled ? <button
            type="button"
            onClick={() =>
              updateConsent(isAnalyticsEnabled ? "rejected" : "accepted")
            }
            className={styles.switchButton}
            role="switch"
            aria-checked={isAnalyticsEnabled}
          >
            <span className={styles.switchText}>
              {isAnalyticsEnabled ? "Vypnout analytiku" : "Zapnout analytiku"}
            </span>
            <span className={styles.switchTrack} aria-hidden>
              <span className={styles.switchThumb} />
            </span>
          </button> : null}

          <Link href={getSiteUrl(configuration.cookie_policy_path)} className={styles.policyLink}>
            Více o cookies
          </Link>
        </div>
      ) : null}
    </div>
  );
}
