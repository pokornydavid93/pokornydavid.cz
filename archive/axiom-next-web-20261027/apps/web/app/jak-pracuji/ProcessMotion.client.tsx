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

const MOTION_CLEAR_PROPS =
  "opacity,transform,transformOrigin,visibility,willChange";

export default function ProcessMotion() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const root = controller?.closest<HTMLElement>("[data-process-page]");

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

      const hero = root.querySelector<HTMLElement>("[data-process-hero]");
      const heroCopy = root.querySelector<HTMLElement>(
        "[data-process-hero-copy]",
      );
      const heroSilk = hero?.querySelector<HTMLElement>(
        "[data-react-bits-silk]",
      );
      const media = gsap.matchMedia();

      media.add(
        {
          compact: DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndBelow,
          desktop: DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndUp,
          forcedColors: "(forced-colors: active)",
          reducedMotion: DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
        },
        (mediaContext) => {
          const conditions = mediaContext.conditions as {
            compact?: boolean;
            desktop?: boolean;
            forcedColors?: boolean;
            reducedMotion?: boolean;
          };

          const context = gsap.context(() => {
            if (conditions.reducedMotion || conditions.forcedColors) {
              gsap.set([heroCopy, heroSilk].filter(Boolean), {
                clearProps: MOTION_CLEAR_PROPS,
              });
              delete controller.dataset.profile;
              controller.dataset.state = conditions.reducedMotion
                ? "reduced-motion"
                : "forced-colors";
              return;
            }

            if (conditions.compact || !conditions.desktop) {
              gsap.set([heroCopy, heroSilk].filter(Boolean), {
                clearProps: MOTION_CLEAR_PROPS,
              });
              delete controller.dataset.profile;
              controller.dataset.state = "natural-flow";
              return;
            }

            if (hero && (heroSilk || heroCopy)) {
              const heroDepth = gsap.timeline({
                defaults: { ease: DESIGN_PRIMITIVE_GSAP_EASES.linear },
                scrollTrigger: {
                  end: "bottom top",
                  id: "process-hero-depth",
                  invalidateOnRefresh: true,
                  scrub: 0.8,
                  start: "top top",
                  trigger: hero,
                },
              });

              if (heroSilk) {
                heroDepth.fromTo(
                  heroSilk,
                  {
                    scale: 1.015,
                    transformOrigin: "50% 50%",
                  },
                  { duration: 1, scale: 1.065 },
                  0,
                );
              }

              if (heroCopy) {
                heroDepth.fromTo(
                  heroCopy,
                  { autoAlpha: 1, y: 0 },
                  { autoAlpha: 0.84, duration: 1, y: -30 },
                  0,
                );
              }
            }

            controller.dataset.profile = "editorial-ledger";
            controller.dataset.state = "ready";
          }, root);

          return () => context.revert();
        },
      );

      const refreshFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });

      cleanup = () => {
        window.cancelAnimationFrame(refreshFrame);
        media.revert();
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
      data-process-motion
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
