"use client";

import { useEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import {
  addGsapTextReveal,
  clearGsapTextReveal,
  getGsapTextRevealTargets,
  prepareGsapTextReveal,
} from "./GsapTextReveal.client";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export default function FinalContactReveal() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const stage = controller?.closest<HTMLElement>("[data-final-contact-stage]");
    const footer = stage?.querySelector<HTMLElement>("[data-final-contact-footer]");
    const footerSurface = footer?.querySelector<HTMLElement>(
      "[data-final-contact-footer-surface]",
    );
    const rules = stage
      ? Array.from(stage.querySelectorAll<HTMLElement>("[data-final-contact-rule]"))
      : [];
    const textTargets = stage ? getGsapTextRevealTargets(stage) : [];
    const footerTargets = footer ? getGsapTextRevealTargets(footer) : [];
    const footerTargetSet = new Set(footerTargets);
    const primaryTargets = textTargets.filter(
      (target) => !footerTargetSet.has(target),
    );

    if (
      !controller
      || !stage
      || !footer
      || !footerSurface
      || rules.length !== 2
      || primaryTargets.length === 0
      || footerTargets.length === 0
    ) {
      return undefined;
    }

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const init = async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
        import("gsap/ScrollTrigger") as Promise<
          ScrollTriggerModule & { default?: ScrollTriggerStatic }
        >,
      ]);
      if (cancelled) return;

      const gsap = gsapModule.gsap ?? gsapModule.default;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger
        ?? scrollTriggerModule.default;
      if (!gsap || !ScrollTrigger) return;

      gsap.registerPlugin(ScrollTrigger);
      const matchMedia = gsap.matchMedia();

      matchMedia.add(
        {
          compact: "(max-width: 899px)",
          desktop: "(min-width: 900px)",
          forcedColors: "(forced-colors: active)",
          reducedMotion: DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
        },
        (mediaContext) => {
          const conditions = mediaContext.conditions as {
            compact?: boolean;
            forcedColors?: boolean;
            reducedMotion?: boolean;
          };

          if (conditions.forcedColors || conditions.reducedMotion) {
            controller.dataset.state = conditions.reducedMotion
              ? "reduced-motion"
              : "forced-colors";
            gsap.set(rules, { scaleX: 1 });
            gsap.set(footerSurface, { scaleY: 1 });
            return () => {
              gsap.set(rules, { clearProps: "transform" });
              gsap.set(footerSurface, { clearProps: "transform" });
            };
          }

          const context = gsap.context(() => {
            prepareGsapTextReveal(gsap, textTargets);
            gsap.set(rules, {
              scaleX: 0,
              willChange: "transform",
            });
            gsap.set(footerSurface, {
              scaleY: 0,
              transformOrigin: "50% 100%",
              willChange: "transform",
            });

            const timeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                end: conditions.compact ? "top 28%" : "top 22%",
                id: "home-final-contact-reveal",
                invalidateOnRefresh: true,
                scrub: conditions.compact ? 0.28 : 0.5,
                start: conditions.compact ? "top 92%" : "top 88%",
                trigger: stage,
                onEnter: () => {
                  controller.dataset.phase = "revealing";
                },
                onEnterBack: () => {
                  controller.dataset.phase = "revealing";
                },
                onLeave: () => {
                  controller.dataset.phase = "complete";
                },
                onLeaveBack: () => {
                  controller.dataset.phase = "waiting";
                },
                onUpdate: (self) => {
                  controller.dataset.progress = self.progress.toFixed(3);
                },
              },
            });

            timeline.to(rules[0], {
              duration: 0.16,
              ease: "power2.out",
              scaleX: 1,
            }, 0);
            addGsapTextReveal(timeline, primaryTargets, 0.08);
            timeline.to(footerSurface, {
              duration: 0.24,
              ease: "power2.out",
              scaleY: 1,
            }, 0.48);
            timeline.to(rules[1], {
              duration: 0.16,
              ease: "power2.out",
              scaleX: 1,
            }, 0.5);
            addGsapTextReveal(timeline, footerTargets, 0.62);
            timeline.set(
              [footerSurface, ...rules, ...textTargets],
              { willChange: "auto" },
              1,
            );

            controller.dataset.state = "ready";
            controller.dataset.phase = "waiting";

            return () => {
              timeline.scrollTrigger?.kill();
              timeline.kill();
              clearGsapTextReveal(gsap, textTargets);
              gsap.set(rules, { clearProps: "transform,willChange" });
              gsap.set(footerSurface, {
                clearProps: "transform,transformOrigin,willChange",
              });
              delete controller.dataset.phase;
              delete controller.dataset.progress;
            };
          }, stage);

          return () => context.revert();
        },
      );

      cleanup = () => {
        matchMedia.revert();
        delete controller.dataset.phase;
        delete controller.dataset.progress;
        delete controller.dataset.state;
        ScrollTrigger.refresh();
      };
      ScrollTrigger.refresh();
    };

    const frame = window.requestAnimationFrame(() => {
      void init();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-final-contact-reveal
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
