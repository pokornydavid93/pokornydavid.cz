"use client";

import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

type Props = {
  children: React.ReactNode;
  minWidth?: number;
  enabled?: boolean;
};

export default function LenisProvider({
  children,
  minWidth = 1024,
  enabled = true,
}: Props) {
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // respect reduced motion
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduceMotion) return;

    // avoid mobile / touch devices (best UX + perf)
    if (window.innerWidth < minWidth) return;

    // avoid double-init
    if (lenisRef.current) return;

    const lenis = new Lenis({
      duration: 5.05,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.0,
      lerp: 0.085,
    });

    lenisRef.current = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    const raf = (time: number) => {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    // Pause Lenis when modal is open (prevents weird scroll)
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

    return () => {
      obs.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, [enabled, minWidth]);

  return <>{children}</>;
}
