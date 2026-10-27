"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";

const TARGET_SELECTOR = "[data-orientation-surface]";
const TRIGGER_ID = "home-situation-orientation-scroll";

const clearControllerState = (controller: HTMLElement) => {
  delete controller.dataset.phase;
  delete controller.dataset.progress;
  delete controller.dataset.sequence;
  delete controller.dataset.state;
};

const restoreStaticState = (target: HTMLElement) => {
  delete target.dataset.orientationMotion;
  delete target.dataset.orientationMotionState;

  const animatedElements = target.querySelectorAll<HTMLElement>([
    "[data-orientation-rule]",
    "[data-orientation-word-ink]",
    "[data-orientation-description-ink]",
    "[data-orientation-action-rail]",
  ].join(","));

  for (const element of animatedElements) {
    element.style.removeProperty("clip-path");
    element.style.removeProperty("opacity");
    element.style.removeProperty("perspective");
    element.style.removeProperty("transform");
    element.style.removeProperty("transform-origin");
    element.style.removeProperty("will-change");
  }
};

export default function SituationOrientationReveal() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const flow = controller?.closest<HTMLElement>("[data-hero-transition-flow]");
    const target = flow?.querySelector<HTMLElement>(TARGET_SELECTOR);

    if (!controller || !target) return undefined;

    controller.dataset.state = "initializing";

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const settle = (
      state: "fallback" | "forced-colors" | "reduced-motion",
    ) => {
      restoreStaticState(target);
      target.dataset.orientationMotionState = "complete";
      controller.dataset.phase = "complete";
      controller.dataset.progress = "1.000";
      controller.dataset.sequence = "static";
      controller.dataset.state = state;
    };

    const init = () => {
      try {
        if (cancelled) return;

        gsap.registerPlugin(ScrollTrigger);
        const matchMedia = gsap.matchMedia();

        matchMedia.add(
          {
            all: "all",
            compact: "(max-width: 720px)",
            forcedColors: "(forced-colors: active)",
            reducedMotion: DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
          },
          (mediaContext) => {
            const conditions = mediaContext.conditions as {
              all?: boolean;
              compact?: boolean;
              forcedColors?: boolean;
              reducedMotion?: boolean;
            };

            if (conditions.reducedMotion || conditions.forcedColors) {
              settle(
                conditions.reducedMotion ? "reduced-motion" : "forced-colors",
              );
              return () => clearControllerState(controller);
            }

            const context = gsap.context(() => {
              const rules = gsap.utils.toArray<HTMLElement>(
                target.querySelectorAll("[data-orientation-rule]"),
              );
              const headingInks = gsap.utils.toArray<HTMLElement>(
                target.querySelectorAll("[data-orientation-word-ink]"),
              );
              const descriptionInk = target.querySelector<HTMLElement>(
                "[data-orientation-description-ink]",
              );
              const actionRail = target.querySelector<HTMLElement>(
                "[data-orientation-action-rail]",
              );
              const compact = conditions.compact === true;

              if (
                rules.length !== 2
                || headingInks.length === 0
                || !descriptionInk
                || !actionRail
              ) {
                settle("fallback");
                return;
              }

              gsap.set(rules, {
                opacity: 0.14,
                scaleX: 0,
                transformOrigin: "0% 50%",
                willChange: "transform, opacity",
              });
              gsap.set(headingInks, {
                opacity: 0,
                rotationX: compact ? 0 : -10,
                transformOrigin: "50% 100%",
                transformPerspective: 700,
                willChange: "transform, opacity",
                yPercent: 115,
              });
              gsap.set(descriptionInk, {
                opacity: 0,
                willChange: "transform, opacity",
                yPercent: 90,
              });
              gsap.set(actionRail, {
                clipPath: "inset(0% 0% 100% 0%)",
                opacity: 0,
                willChange: "clip-path, transform, opacity",
                y: compact ? 24 : 38,
              });

              target.dataset.orientationMotion = "enhanced";
              target.dataset.orientationMotionState = "waiting";
              controller.dataset.phase = "waiting";
              controller.dataset.progress = "0.000";
              controller.dataset.sequence = "scroll-linked";
              controller.dataset.state = "ready";

              const timeline = gsap.timeline({
                onComplete: () => {
                  target.dataset.orientationMotionState = "complete";
                  controller.dataset.phase = "complete";
                  controller.dataset.progress = "1.000";
                  controller.dataset.state = "complete";
                },
                onReverseComplete: () => {
                  target.dataset.orientationMotionState = "waiting";
                  controller.dataset.phase = "waiting";
                  controller.dataset.progress = "0.000";
                  controller.dataset.state = "ready";
                },
                onStart: () => {
                  target.dataset.orientationMotionState = "revealing";
                  controller.dataset.phase = "reveal";
                  controller.dataset.progress = "0.120";
                },
                onUpdate: function onUpdate() {
                  controller.dataset.progress = this.progress().toFixed(3);
                },
                scrollTrigger: {
                  end: compact ? "clamp(bottom 56%)" : "clamp(bottom 48%)",
                  id: TRIGGER_ID,
                  invalidateOnRefresh: true,
                  scrub: compact ? 0.24 : 0.4,
                  start: compact ? "top 90%" : "top 82%",
                  trigger: target,
                },
              });

              timeline
                .to(rules, {
                  duration: compact ? 0.82 : 1.08,
                  ease: "power3.inOut",
                  opacity: 0.72,
                  scaleX: 1,
                }, 0)
                .to(headingInks, {
                  duration: compact ? 0.72 : 0.9,
                  ease: "power4.out",
                  opacity: 1,
                  rotationX: 0,
                  stagger: { amount: compact ? 0.14 : 0.22 },
                  yPercent: 0,
                }, compact ? 0.08 : 0.16)
                .to(descriptionInk, {
                  duration: compact ? 0.7 : 0.82,
                  ease: "power4.out",
                  opacity: 1,
                  yPercent: 0,
                }, compact ? 0.18 : 0.26)
                .to(actionRail, {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: compact ? 0.8 : 1,
                  ease: "power4.out",
                  opacity: 1,
                  y: 0,
                }, compact ? 0.28 : 0.38);

              const settleForFocus = () => {
                timeline.progress(1);
                target.dataset.orientationMotionState = "complete";
                controller.dataset.phase = "complete";
                controller.dataset.progress = "1.000";
              };
              target.addEventListener("focusin", settleForFocus, {
                capture: true,
                once: true,
              });

              return () => {
                target.removeEventListener("focusin", settleForFocus, true);
                timeline.scrollTrigger?.kill();
                timeline.kill();
                restoreStaticState(target);
              };
            }, target);

            return () => context.revert();
          },
        );

        cleanup = () => {
          matchMedia.revert();
          ScrollTrigger.getById(TRIGGER_ID)?.kill();
          restoreStaticState(target);
          clearControllerState(controller);
        };
        ScrollTrigger.refresh();
      } catch {
        if (!cancelled) settle("fallback");
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-orientation-reveal
      data-phase="loading"
      data-progress="0.000"
      data-sequence="loading"
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
