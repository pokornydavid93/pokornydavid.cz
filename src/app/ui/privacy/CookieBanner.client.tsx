"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import styles from "./CookieBanner.module.css";
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

export default function CookieBanner() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);
  const isVisibleRef = useRef(true);
  const isDismissingRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);
  const consent = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      const handler = () => onStoreChange();
      window.addEventListener("cookie-consent-changed", handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("cookie-consent-changed", handler);
        window.removeEventListener("storage", handler);
      };
    },
    readConsent,
    () => null
  );

  const commitDecision = (decision: ConsentChoice) => {
    window.localStorage.setItem(STORAGE_KEY, decision);
    window.dispatchEvent(
      new CustomEvent("cookie-consent-changed", { detail: decision }),
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

  useEffect(() => {
    if (consent !== null || !bannerRef.current) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mediaQuery.matches;
    lastScrollYRef.current = window.scrollY;
    isVisibleRef.current = true;

    if (prefersReducedMotionRef.current) {
      gsap.set(bannerRef.current, { y: "0%", autoAlpha: 1 });
    } else {
      gsap.fromTo(
        bannerRef.current,
        { y: "100%", autoAlpha: 0 },
        { y: "0%", autoAlpha: 1, duration: 1, ease: "power3.out" },
      );
    }

    const threshold = 8;
    const showDelay = 0.12;

    const handleScroll = () => {
      if (!bannerRef.current || isDismissingRef.current) {
        return;
      }

      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      if (Math.abs(delta) < threshold) {
        return;
      }

      lastScrollYRef.current = currentY;
      const shouldHide = delta > 0;

      if (shouldHide && isVisibleRef.current) {
        isVisibleRef.current = false;
        if (prefersReducedMotionRef.current) {
          gsap.set(bannerRef.current, { y: "100%", autoAlpha: 0 });
          return;
        }
        gsap.to(bannerRef.current, {
          y: "100%",
          autoAlpha: 0,
          duration: 1,
          ease: "power2.out",
        });
      } else if (!shouldHide && !isVisibleRef.current) {
        isVisibleRef.current = true;
        if (prefersReducedMotionRef.current) {
          gsap.set(bannerRef.current, { y: "0%", autoAlpha: 1 });
          return;
        }
        gsap.to(bannerRef.current, {
          y: "0%",
          autoAlpha: 1,
          duration: 1,
          ease: "power2.out",
          delay: showDelay,
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [consent]);

  const handleDecision = (decision: ConsentChoice) => {
    if (isDismissingRef.current) {
      return;
    }

    isDismissingRef.current = true;

    if (prefersReducedMotionRef.current || !bannerRef.current) {
      commitDecision(decision);
      return;
    }

    gsap.to(bannerRef.current, {
      y: "100%",
      autoAlpha: 0,
      duration: 0.3,
      ease: "power2.out",
      onComplete: () => {
        commitDecision(decision);
      },
    });
  };

  if (consent !== null) {
    return null;
  }

  return (
    <div ref={bannerRef} className={styles.banner}>
      <div className={styles.panel}>
        <div className={styles.copy}>
         Můžeme měřit anonymní návštěvnost (GA4), abychom věděli, co funguje?
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => handleDecision("rejected")}
            className={styles.secondaryButton}
          >
           Nesouhlasím
          </button>
          <button
            type="button"
            onClick={() => handleDecision("accepted")}
            className={styles.primaryButton}
          >
           Souhlasím
          </button>
        </div>
      </div>
    </div>
  );
}
