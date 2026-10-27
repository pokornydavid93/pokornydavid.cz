"use client";

import { useEffect, useRef } from "react";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export default function ServicesMotion() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const root = controller?.closest<HTMLElement>("[data-services-page]");

    if (!controller || !root) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
        import("gsap/ScrollTrigger") as Promise<
          ScrollTriggerModule & { default?: ScrollTriggerStatic }
        >,
      ]);

      if (cancelled) return;

      const gsap = gsapModule.gsap ?? gsapModule.default;
      const ScrollTrigger =
        scrollTriggerModule.ScrollTrigger ?? scrollTriggerModule.default;

      if (!gsap || !ScrollTrigger) {
        controller.dataset.state = "unavailable";
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const accordion = root.querySelector<HTMLElement>(
        "[data-services-accordion]",
      );
      let resizeObserver: ResizeObserver | undefined;
      let refreshTimer = 0;

      if (accordion && "ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(() => {
          window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => {
            ScrollTrigger.refresh();
          }, 80);
        });
        resizeObserver.observe(accordion);
        // Equal-height panels can swap without changing the total catalog height.
        // Their individual rows still move, so refresh the reveal positions too.
        accordion.querySelectorAll<HTMLElement>(
          "[data-services-accordion-item]",
        ).forEach((row) => resizeObserver?.observe(row));
      }

      controller.dataset.state = "ready";

      const refreshFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });

      cleanup = () => {
        window.cancelAnimationFrame(refreshFrame);
        window.clearTimeout(refreshTimer);
        resizeObserver?.disconnect();
      };
    };

    void init().catch(() => {
      if (!cancelled) controller.dataset.state = "unavailable";
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-services-motion
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
