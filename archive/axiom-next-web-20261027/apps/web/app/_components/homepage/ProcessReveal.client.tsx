"use client";

import { useEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

const deleteControllerState = (controller: HTMLElement) => {
  delete controller.dataset.activeStep;
  delete controller.dataset.motion;
  delete controller.dataset.phase;
  delete controller.dataset.progress;
  delete controller.dataset.sequence;
  delete controller.dataset.state;
};

const restoreStaticState = (target: HTMLElement) => {
  delete target.dataset.processMotion;
  const animatedElements = target.querySelectorAll<HTMLElement>([
    "[data-process-header]",
    "[data-process-detail]",
    "[data-process-intro-word-ink]",
    "[data-process-detail-word-ink]",
    "[data-process-step-rule]",
    "[data-process-role-ink]",
    "[data-process-step-copy]",
    "[data-process-title]",
    "[data-process-word-ink]",
    "[data-process-support-ink]",
    "[data-process-index-ink]",
    "[data-process-result-rule]",
    "[data-process-result-eyebrow-ink]",
    "[data-process-result-title]",
    "[data-process-result-word-ink]",
    "[data-process-result-description-ink]",
    "[data-process-action-rail]",
    "[data-process-video-rail]",
  ].join(","));

  for (const element of animatedElements) {
    element.style.removeProperty("clip-path");
    element.style.removeProperty("opacity");
    element.style.removeProperty("perspective");
    element.style.removeProperty("transform");
    element.style.removeProperty("transform-origin");
    element.style.removeProperty("visibility");
    element.style.removeProperty("will-change");
  }
};

export default function ProcessReveal() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const target = controller?.closest<HTMLElement>(
      "[data-process-transition-target]",
    );

    if (!controller || !target) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const init = async () => {
      try {
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
        if (!gsap || !ScrollTrigger) {
          restoreStaticState(target);
          controller.dataset.state = "fallback";
          controller.dataset.sequence = "static";
          controller.dataset.phase = "complete";
          controller.dataset.progress = "1.000";
          return;
        }

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

            if (conditions.forcedColors || conditions.reducedMotion) {
              restoreStaticState(target);
              controller.dataset.state = conditions.reducedMotion
                ? "reduced-motion"
                : "forced-colors";
              controller.dataset.sequence = "static";
              controller.dataset.phase = "complete";
              controller.dataset.progress = "1.000";
              return () => deleteControllerState(controller);
            }

            const context = gsap.context(() => {
              const intro = target.querySelector<HTMLElement>(
                "[data-process-intro]",
              );
              const steps = gsap.utils.toArray<HTMLElement>(
                target.querySelectorAll("[data-process-step]"),
              );
              const result = target.querySelector<HTMLElement>(
                "[data-process-result]",
              );
              const outcome = target.querySelector<HTMLElement>(
                "[data-process-outcome]",
              );

              if (!intro || steps.length !== 3 || !result || !outcome) {
                controller.dataset.state = "incomplete";
                controller.dataset.sequence = "static";
                return;
              }

              const introHeading = intro.querySelector<HTMLElement>(
                "[data-process-header]",
              );
              const detail = intro.querySelector<HTMLElement>(
                "[data-process-detail]",
              );
              const outcomeItems = [...outcome.querySelectorAll<HTMLElement>(
                "[data-process-action-rail], [data-process-video-rail]",
              )];
              const resultRule = result.querySelector<HTMLElement>(
                "[data-process-result-rule]",
              );
              const resultEyebrowInk = result.querySelector<HTMLElement>(
                "[data-process-result-eyebrow-ink]",
              );
              const resultTitle = result.querySelector<HTMLElement>(
                "[data-process-result-title]",
              );
              const resultDescriptionInk = result.querySelector<HTMLElement>(
                "[data-process-result-description-ink]",
              );
              const compact = conditions.compact === true;

              const rowMotion = steps.map((step) => ({
                copy: step.querySelector<HTMLElement>(
                  "[data-process-step-copy]",
                ),
                indexInk: step.querySelector<HTMLElement>(
                  "[data-process-index-ink]",
                ),
                roleInk: step.querySelector<HTMLElement>(
                  "[data-process-role-ink]",
                ),
                rules: [...step.querySelectorAll<HTMLElement>(
                  "[data-process-step-rule]",
                )],
                step,
              }));

              const setProgress = (value: number) => {
                const current = Number(controller.dataset.progress ?? 0);
                controller.dataset.progress = Math.max(current, value)
                  .toFixed(3);
              };
              const setStepPhase = (index: number) => {
                const activeStep = Number(controller.dataset.activeStep ?? 0);
                if (index + 1 < activeStep) return;
                controller.dataset.activeStep = String(index + 1);
                controller.dataset.phase = `step-${index + 1}`;
              };
              gsap.set(introHeading, {
                opacity: 0,
                willChange: "transform, opacity",
                y: compact ? 10 : 14,
              });
              gsap.set(detail, {
                opacity: 0,
                willChange: "transform, opacity",
                y: compact ? 12 : 18,
              });
              for (const row of rowMotion) {
                gsap.set(row.roleInk, {
                  opacity: 0,
                  willChange: "transform, opacity",
                  y: compact ? 10 : 14,
                });
                gsap.set(row.rules, {
                  opacity: 0.14,
                  scaleX: 0,
                  transformOrigin: "0% 50%",
                  willChange: "transform, opacity",
                });
                gsap.set(row.copy, {
                  opacity: 0,
                  willChange: "transform, opacity",
                  y: compact ? 14 : 18,
                });
                gsap.set(row.indexInk, {
                  opacity: 0,
                  willChange: "transform, opacity",
                  y: compact ? 8 : 10,
                });
              }
              gsap.set(resultRule, {
                opacity: 0.14,
                scaleX: 0,
                transformOrigin: "0% 50%",
                willChange: "transform, opacity",
              });
              gsap.set(resultEyebrowInk, {
                opacity: 0,
                willChange: "transform, opacity",
                y: compact ? 8 : 10,
              });
              gsap.set(resultTitle, {
                opacity: 0,
                willChange: "transform, opacity",
                y: compact ? 14 : 18,
              });
              gsap.set(resultDescriptionInk, {
                opacity: 0,
                willChange: "transform, opacity",
                y: compact ? 10 : 14,
              });
              gsap.set(outcomeItems, {
                willChange: "transform",
                y: compact ? 12 : 18,
              });

              target.dataset.processMotion = "enhanced";
              controller.dataset.state = "ready";
              controller.dataset.motion = "scroll-register";
              controller.dataset.sequence = "scroll-linked";
              controller.dataset.phase = "waiting";
              controller.dataset.progress = "0.000";

              const timelines: ReturnType<typeof gsap.timeline>[] = [];

              const introTimeline = gsap.timeline({
                onComplete: () => {
                  setProgress(0.2);
                },
                onReverseComplete: () => {
                  controller.dataset.phase = "waiting";
                  controller.dataset.progress = "0.000";
                },
                onStart: () => {
                  controller.dataset.phase = "intro";
                },
                scrollTrigger: {
                  end: compact ? "clamp(bottom 58%)" : "clamp(bottom 48%)",
                  id: "home-process-intro-scroll",
                  invalidateOnRefresh: true,
                  scrub: compact ? 0.24 : 0.4,
                  start: compact ? "top 90%" : "top 84%",
                  trigger: intro,
                },
              });
              introTimeline
                .to(introHeading, {
                  duration: compact ? 0.46 : 0.54,
                  ease: "power3.out",
                  opacity: 1,
                  y: 0,
                }, 0)
                .to(detail, {
                  duration: compact ? 0.52 : 0.62,
                  ease: "power3.out",
                  opacity: 1,
                  y: 0,
                }, compact ? 0.08 : 0.1);
              timelines.push(introTimeline);

              rowMotion.forEach((row, index) => {
                const rowTimeline = gsap.timeline({
                  onComplete: () => {
                    setProgress(0.35 + index * 0.2);
                  },
                  onReverseComplete: () => {
                    controller.dataset.activeStep = String(Math.max(0, index));
                    controller.dataset.phase = index === 0
                      ? "intro"
                      : `step-${index}`;
                  },
                  onStart: () => setStepPhase(index),
                  scrollTrigger: {
                    end: compact ? "clamp(bottom 58%)" : "clamp(bottom 48%)",
                    id: `home-process-row-${index + 1}-scroll`,
                    invalidateOnRefresh: true,
                    scrub: compact ? 0.24 : 0.4,
                    start: compact ? "top 88%" : "top 82%",
                    trigger: row.step,
                  },
                });

                rowTimeline
                  .to(row.rules, {
                    duration: compact ? 0.62 : 0.74,
                    ease: "power3.inOut",
                    opacity: 0.7,
                    scaleX: 1,
                  }, 0)
                  .to(row.roleInk, {
                    duration: compact ? 0.44 : 0.52,
                    ease: "power3.out",
                    opacity: 1,
                    y: 0,
                  }, compact ? 0.04 : 0.07)
                  .to(row.copy, {
                    duration: compact ? 0.54 : 0.64,
                    ease: "power3.out",
                    opacity: 1,
                    y: 0,
                  }, compact ? 0.08 : 0.11)
                  .to(row.indexInk, {
                    duration: compact ? 0.38 : 0.44,
                    ease: "power3.out",
                    opacity: 1,
                    y: 0,
                  }, compact ? 0.1 : 0.14);
                timelines.push(rowTimeline);
              });

              const resultTimeline = gsap.timeline({
                onComplete: () => {
                  setProgress(0.86);
                },
                onReverseComplete: () => {
                  controller.dataset.phase = "step-3";
                },
                onStart: () => {
                  controller.dataset.activeStep = "3";
                  controller.dataset.phase = "result";
                  setProgress(0.78);
                },
                scrollTrigger: {
                  end: compact ? "clamp(bottom 58%)" : "clamp(bottom 48%)",
                  id: "home-process-result-scroll",
                  invalidateOnRefresh: true,
                  scrub: compact ? 0.24 : 0.4,
                  start: compact ? "top 90%" : "top 80%",
                  trigger: result,
                },
              });
              resultTimeline
                .to(resultRule, {
                  duration: compact ? 0.62 : 0.74,
                  ease: "power3.inOut",
                  opacity: 0.64,
                  scaleX: 1,
                }, 0)
                .to(resultEyebrowInk, {
                  duration: compact ? 0.44 : 0.52,
                  ease: "power3.out",
                  opacity: 1,
                  y: 0,
                }, compact ? 0.04 : 0.07)
                .to(resultTitle, {
                  duration: compact ? 0.54 : 0.64,
                  ease: "power3.out",
                  opacity: 1,
                  y: 0,
                }, compact ? 0.08 : 0.11)
                .to(resultDescriptionInk, {
                  duration: compact ? 0.5 : 0.58,
                  ease: "power3.out",
                  opacity: 1,
                  y: 0,
                }, compact ? 0.12 : 0.16);
              timelines.push(resultTimeline);

              const outcomeTimeline = gsap.timeline({
                onComplete: () => {
                  controller.dataset.activeStep = "3";
                  controller.dataset.phase = "complete";
                  controller.dataset.progress = "1.000";
                },
                onReverseComplete: () => {
                  controller.dataset.phase = "result";
                  controller.dataset.progress = "0.920";
                },
                onStart: () => {
                  controller.dataset.activeStep = "3";
                  controller.dataset.phase = "cta";
                  setProgress(0.92);
                },
                scrollTrigger: {
                  end: compact ? "clamp(bottom 58%)" : "clamp(bottom 48%)",
                  id: "home-process-outcome-scroll",
                  invalidateOnRefresh: true,
                  scrub: compact ? 0.24 : 0.4,
                  start: compact ? "top 90%" : "top 82%",
                  trigger: outcome,
                },
              });
              outcomeTimeline.to(outcomeItems, {
                duration: compact ? 0.5 : 0.62,
                ease: "power3.out",
                stagger: compact ? 0.08 : 0.1,
                y: 0,
              });
              timelines.push(outcomeTimeline);

              return () => {
                for (const timeline of timelines) {
                  timeline.scrollTrigger?.kill();
                  timeline.kill();
                }
                delete target.dataset.processMotion;
                deleteControllerState(controller);
              };
            }, target);

            return () => context.revert();
          },
        );

        cleanup = () => {
          matchMedia.revert();
          deleteControllerState(controller);
        };
        ScrollTrigger.refresh();
      } catch {
        if (!cancelled) {
          restoreStaticState(target);
          controller.dataset.state = "fallback";
          controller.dataset.sequence = "static";
          controller.dataset.phase = "complete";
          controller.dataset.progress = "1.000";
        }
      }
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
      data-process-reveal
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
