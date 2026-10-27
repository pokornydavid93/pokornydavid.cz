"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "@studio-freight/lenis";
import {
  DESIGN_PRIMITIVE_BREAKPOINT_NUMBERS,
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
  designPrimitiveEaseOutQuart,
} from "@/app/theme/design-primitives";
import {
  HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE,
  HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
} from "@/app/_components/homepage/HomepageIntro.constants";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

const HOME_PATH = "/";

type Props = {
  children: React.ReactNode;
  minWidth?: number;
  enabled?: boolean;

  /**
   * If true, delays Lenis init until the browser is idle.
   */
  deferInit?: boolean;
};

declare global {
  interface Window {
    __lenis?: Lenis;
    __lenis_cleanup__?: () => void;
  }
}

function requestIdle(cb: () => void, timeout = 1500): () => void {
  if ("requestIdleCallback" in window && typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => cb(), { timeout });
    return () => window.cancelIdleCallback?.(id);
  }

  const t = window.setTimeout(cb, 1);
  return () => window.clearTimeout(t);
}

function requestAfterFrameAndIdle(
  cb: () => void,
  deferUntilIdle: boolean,
): () => void {
  let cleanupIdle: null | (() => void) = null;
  let frame = window.requestAnimationFrame(() => {
    frame = 0;
    if (deferUntilIdle) {
      cleanupIdle = requestIdle(cb, 1500);
      return;
    }

    cb();
  });

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    cleanupIdle?.();
  };
}

function homepageHeroRevealHasSettled(): boolean {
  const hero = document.querySelector<HTMLElement>(
    "[data-cinematic-home-hero]",
  );
  return !hero || hero.hasAttribute(HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE);
}

export default function LenisProvider({
  children,
  minWidth = DESIGN_PRIMITIVE_BREAKPOINT_NUMBERS.smoothScrollMin,
  enabled = true,
  deferInit = true,
}: Props) {
  const pathname = usePathname();
  const usesNativeScrolling = /^\/test-jednoho-prijmu(?:\/|$)/u.test(pathname);
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);
  const cleanupIdleRef = useRef<null | (() => void)>(null);
  const releaseHomepageGateRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!enabled || usesNativeScrolling) return;
    if (typeof window === "undefined") return;

    // respect reduced motion
    const reduceMotion =
      window.matchMedia?.(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion)
        ?.matches ?? false;
    if (reduceMotion) return;

    // avoid mobile / touch devices
    if (window.innerWidth < minWidth) return;

    // avoid double-init
    if (lenisRef.current) return;

    let disposed = false;
    let initializing = false;

    const init = async () => {
      if (disposed || initializing || lenisRef.current) return;
      initializing = true;

      // Keep native-scrolling devices free of the smooth-scroll library. Import
      // only after the same capability and homepage reveal gates as its runtime.
      let LenisConstructor: typeof import("@studio-freight/lenis").default;
      try {
        LenisConstructor = (await import("@studio-freight/lenis")).default;
      } catch {
        initializing = false;
        return;
      }
      if (
        disposed ||
        lenisRef.current ||
        window.innerWidth < minWidth ||
        window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion).matches
      ) return;

      const lenis = new LenisConstructor({
        duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.smoothScroll,
        easing: designPrimitiveEaseOutQuart,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.0,
      });

      lenisRef.current = lenis;
      window.__lenis = lenis;
      let destroyed = false;
      let removeScrollTriggerSync: null | (() => void) = null;
      let removeGsapTickerSync: null | (() => void) = null;

      const raf = (time: number) => {
        // pause when tab not visible -> less CPU + less potential forced reflow
        if (document.visibilityState === "visible") {
          lenis.raf(time);
        }
        rafRef.current = requestAnimationFrame(raf);
      };

      rafRef.current = requestAnimationFrame(raf);

      void Promise.all([
        import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
        import("gsap/ScrollTrigger") as Promise<
          ScrollTriggerModule & { default?: ScrollTriggerStatic }
        >,
      ])
        .then(([gsapMod, stMod]) => {
          if (destroyed || lenisRef.current !== lenis) return;

          const gsap = gsapMod.gsap ?? gsapMod.default;
          const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;
          if (!gsap || !ScrollTrigger) return;

          gsap.registerPlugin(ScrollTrigger);

          const syncLenisToGsapTicker = (time: number) => {
            if (document.visibilityState === "visible") {
              lenis.raf(time * 1000);
            }
          };

          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }

          gsap.ticker.add(syncLenisToGsapTicker);
          gsap.ticker.lagSmoothing(0);
          removeGsapTickerSync = () => {
            gsap.ticker.remove(syncLenisToGsapTicker);
          };

          const updateScrollTrigger = () => ScrollTrigger.update();
          lenis.on("scroll", updateScrollTrigger);
          removeScrollTriggerSync = () => {
            lenis.off("scroll", updateScrollTrigger);
          };

          requestAnimationFrame(() => {
            if (!destroyed) ScrollTrigger.refresh();
          });
        })
        .catch(() => {});

      // Pause Lenis when modal is open
      const syncModalState = () => {
        const hasModal = document.body.hasAttribute("data-modal-open");
        if (hasModal) lenis.stop();
        else lenis.start();
      };

      syncModalState();

      const obs = new MutationObserver(syncModalState);
      obs.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-modal-open"],
      });

      const onVis = () => syncModalState();
      document.addEventListener("visibilitychange", onVis);

      const cleanup = () => {
        destroyed = true;
        removeScrollTriggerSync?.();
        removeScrollTriggerSync = null;
        removeGsapTickerSync?.();
        removeGsapTickerSync = null;

        obs.disconnect();
        document.removeEventListener("visibilitychange", onVis);

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;

        lenis.destroy();
        lenisRef.current = null;
        delete window.__lenis;
      };

      window.__lenis_cleanup__ = cleanup;
    };

    const scheduleInit = (afterHomepageIntro = false) => {
      cleanupIdleRef.current?.();
      cleanupIdleRef.current = afterHomepageIntro
        ? requestAfterFrameAndIdle(init, deferInit)
        : deferInit
          ? requestIdle(init, 1500)
          : null;

      if (!afterHomepageIntro && !deferInit) init();
    };

    let homepageGateReleased = false;
    let heroRevealObserver: MutationObserver | null = null;

    const removeHomepageGate = () => {
      window.removeEventListener(
        HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
        releaseAfterHeroReveal,
      );
      heroRevealObserver?.disconnect();
      heroRevealObserver = null;
      releaseHomepageGateRef.current = null;
    };

    const releaseHomepageGate = (force = false) => {
      if (homepageGateReleased) return;
      if (!force && !homepageHeroRevealHasSettled()) return;

      homepageGateReleased = true;
      removeHomepageGate();
      scheduleInit(true);
    };

    function releaseAfterHeroReveal() {
      releaseHomepageGate();
    }

    if (
      window.location.pathname === HOME_PATH &&
      !homepageHeroRevealHasSettled()
    ) {
      releaseHomepageGateRef.current = () => releaseHomepageGate(true);
      window.addEventListener(
        HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
        releaseAfterHeroReveal,
      );

      const hero = document.querySelector<HTMLElement>(
        "[data-cinematic-home-hero]",
      );
      if (hero) {
        heroRevealObserver = new MutationObserver(() => releaseHomepageGate());
        heroRevealObserver.observe(hero, {
          attributeFilter: [HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE],
          attributes: true,
        });
      }
    } else {
      scheduleInit();
    }

    return () => {
      disposed = true;
      removeHomepageGate();
      cleanupIdleRef.current?.();
      cleanupIdleRef.current = null;

      window.__lenis_cleanup__?.();
      delete window.__lenis_cleanup__;
    };
  }, [enabled, minWidth, deferInit, usesNativeScrolling]);

  useEffect(() => {
    if (pathname !== HOME_PATH) releaseHomepageGateRef.current?.();
  }, [pathname]);

  return <>{children}</>;
}
