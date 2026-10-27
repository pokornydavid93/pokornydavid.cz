"use client";

import { useEffect, useRef } from "react";
import {
  DESIGN_PRIMITIVE_GSAP_EASES,
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
} from "@/app/theme/design-primitives";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

const FORCED_COLORS_QUERY = "(forced-colors: active)";

export default function ReferencesHeroMotion() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const root = controller?.closest<HTMLElement>("[data-reference-page]");

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

      const hero = root.querySelector<HTMLElement>("[data-reference-hero]");
      const heroComposition = hero?.querySelector<HTMLElement>(
        "[data-reference-hero-part='quote']",
      )?.parentElement?.closest<HTMLElement>("figure")?.parentElement;
      const heroSilk = hero?.querySelector<HTMLElement>(
        "[data-react-bits-silk]",
      );
      const media = gsap.matchMedia();

      media.add(
        {
          compact: DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndBelow,
          desktop: DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndUp,
          forcedColors: FORCED_COLORS_QUERY,
          reducedMotion: DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
        },
        (mediaContext) => {
          const conditions = mediaContext.conditions as {
            compact?: boolean;
            desktop?: boolean;
            forcedColors?: boolean;
            reducedMotion?: boolean;
          };

          if (conditions.reducedMotion || conditions.forcedColors) {
            controller.dataset.state = conditions.reducedMotion
              ? "reduced-motion"
              : "forced-colors";
            return;
          }

          const compact = Boolean(conditions.compact || !conditions.desktop);
          if (conditions.desktop && hero && (heroSilk || heroComposition)) {
            const depthTimeline = gsap.timeline({
              defaults: { ease: DESIGN_PRIMITIVE_GSAP_EASES.linear },
              scrollTrigger: {
                end: "bottom top",
                invalidateOnRefresh: true,
                scrub: 0.65,
                start: "top top",
                trigger: hero,
              },
            });

            if (heroSilk) {
              depthTimeline.fromTo(
                heroSilk,
                {
                  scale: 1.015,
                  transformOrigin: "62% 46%",
                  yPercent: -1.5,
                },
                { duration: 1, scale: 1.055, yPercent: 5 },
                0,
              );
            }

            if (heroComposition) {
              depthTimeline.fromTo(
                heroComposition,
                { autoAlpha: 1, y: 0 },
                { autoAlpha: 0.9, duration: 1, y: -22 },
                0,
              );
            }
          }

          controller.dataset.state = compact ? "compact-ready" : "ready";
        },
        root,
      );

      cleanup = () => {
        media.revert();
      };
    };

    void init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-reference-hero-motion
      data-state="pending"
      hidden
      ref={controllerRef}
    />
  );
}
