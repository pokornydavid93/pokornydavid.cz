"use client";

import { useEffect, useRef } from "react";
import {
  DESIGN_PRIMITIVE_GSAP_EASES,
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
} from "@/app/theme/design-primitives";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type SplitTextModule = typeof import("gsap/SplitText");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type SplitTextStatic = typeof import("gsap/SplitText").SplitText;
type SplitTextInstance = InstanceType<SplitTextStatic>;

const restoreAttribute = (
  element: Element | null,
  name: string,
  value: string | null,
) => {
  if (!element) return;

  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
};

export default function AboutMotion() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const root = controller?.closest<HTMLElement>("[data-about-page]");

    if (!controller || !root) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const [gsapModule, scrollTriggerModule, splitTextModule] = await Promise.all([
        import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
        import("gsap/ScrollTrigger") as Promise<
          ScrollTriggerModule & { default?: ScrollTriggerStatic }
        >,
        import("gsap/SplitText") as Promise<
          SplitTextModule & { default?: SplitTextStatic }
        >,
      ]);

      if (cancelled) return;

      const gsap = gsapModule.gsap ?? gsapModule.default;
      const ScrollTrigger =
        scrollTriggerModule.ScrollTrigger ?? scrollTriggerModule.default;
      const SplitText = splitTextModule.SplitText ?? splitTextModule.default;

      if (!gsap || !ScrollTrigger || !SplitText) {
        controller.dataset.state = "unavailable";
        return;
      }

      gsap.registerPlugin(ScrollTrigger, SplitText);

      const manifesto = root.querySelector<HTMLElement>(
        "[data-about-manifesto]",
      );
      const diagram = root.querySelector<HTMLElement>("[data-about-diagram]");
      const principles = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-about-principle]"),
      );
      const agreements = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-about-agreement-row]"),
      );
      const originalManifestoState =
        manifesto?.getAttribute("data-active-principle") ?? null;
      const originalDiagramState =
        diagram?.getAttribute("data-active-principle") ?? null;
      const originalManifestoLayer =
        manifesto?.getAttribute("data-active-layer") ?? null;
      const originalDiagramLayer =
        diagram?.getAttribute("data-active-layer") ?? null;
      const originalPrincipleStates = principles.map((principle) =>
        principle.getAttribute("data-about-principle-state"),
      );
      const originalPrincipleMotion = principles.map((principle) =>
        principle.getAttribute("data-about-principle-motion"),
      );
      const originalPrincipleRevealStates = principles.map((principle) =>
        principle.getAttribute("data-about-principle-reveal-state"),
      );
      const originalAgreementMotion = agreements.map((agreement) =>
        agreement.getAttribute("data-about-agreement-motion"),
      );
      const originalAgreementRevealStates = agreements.map((agreement) =>
        agreement.getAttribute("data-about-agreement-reveal-state"),
      );
      const originalControllerProfile = controller.getAttribute("data-profile");
      const matchMedia = gsap.matchMedia();
      let refreshFrame: number | undefined;
      let activeMediaCleanup: (() => void) | undefined;

      const cancelRefresh = () => {
        if (refreshFrame !== undefined) window.cancelAnimationFrame(refreshFrame);
        refreshFrame = undefined;
      };

      const scheduleRefresh = () => {
        if (cancelled || refreshFrame !== undefined) return;
        refreshFrame = window.requestAnimationFrame(() => {
          refreshFrame = undefined;
          if (!cancelled) ScrollTrigger.refresh();
        });
      };

      const restoreMotionState = () => {
        restoreAttribute(
          manifesto,
          "data-active-principle",
          originalManifestoState,
        );
        restoreAttribute(diagram, "data-active-principle", originalDiagramState);
        restoreAttribute(
          manifesto,
          "data-active-layer",
          originalManifestoLayer,
        );
        restoreAttribute(diagram, "data-active-layer", originalDiagramLayer);
        principles.forEach((principle, index) => {
          restoreAttribute(
            principle,
            "data-about-principle-state",
            originalPrincipleStates[index] ?? null,
          );
          restoreAttribute(
            principle,
            "data-about-principle-motion",
            originalPrincipleMotion[index] ?? null,
          );
          restoreAttribute(
            principle,
            "data-about-principle-reveal-state",
            originalPrincipleRevealStates[index] ?? null,
          );
        });
        agreements.forEach((agreement, index) => {
          restoreAttribute(
            agreement,
            "data-about-agreement-motion",
            originalAgreementMotion[index] ?? null,
          );
          restoreAttribute(
            agreement,
            "data-about-agreement-reveal-state",
            originalAgreementRevealStates[index] ?? null,
          );
        });
        restoreAttribute(controller, "data-profile", originalControllerProfile);
      };

      cleanup = () => {
        cancelRefresh();
        matchMedia.revert();
        activeMediaCleanup?.();
        restoreMotionState();
      };

      matchMedia.add(
        {
          desktop: DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndUp,
          compact: DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndBelow,
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
          const splits: SplitTextInstance[] = [];
          let disposed = false;
          const cleanupMedia = () => {
            if (disposed) return;
            disposed = true;
            cancelRefresh();
            splits.forEach((split) => split.revert());
            restoreMotionState();
            activeMediaCleanup = undefined;
          };
          activeMediaCleanup = cleanupMedia;

          const run = () => {
            const setPrincipleState = (
              state: string,
              layer: "foundation" | "goals" | "whole",
            ) => {
              if (manifesto) {
                manifesto.dataset.activePrinciple = state;
                manifesto.dataset.activeLayer = layer;
              }
              if (diagram) {
                diagram.dataset.activePrinciple = state;
                diagram.dataset.activeLayer = layer;
              }
            };

            const settlePrinciples = () => {
              setPrincipleState("all", "whole");
              principles.forEach((principle) => {
                principle.dataset.aboutPrincipleState = "visible";
                principle.dataset.aboutPrincipleRevealState = "visible";
              });
            };

            if (conditions.reducedMotion || conditions.forcedColors) {
              settlePrinciples();
              agreements.forEach((agreement) => {
                agreement.dataset.aboutAgreementRevealState = "visible";
              });
              controller.dataset.state = conditions.reducedMotion
                ? "reduced-motion"
                : "forced-colors";
              return;
            }

            const activatePrinciple = (activeIndex: number) => {
              const activeLayer = principles[activeIndex]?.dataset.planStepLayer;
              const layer =
                activeLayer === "goals" || activeLayer === "whole"
                  ? activeLayer
                  : "foundation";

              setPrincipleState(String(activeIndex + 1), layer);
              principles.forEach((principle, index) => {
                principle.dataset.aboutPrincipleState =
                  index === activeIndex ? "active" : "idle";
              });
            };

            if (conditions.desktop && principles.length > 0) {
              activatePrinciple(0);
              principles.forEach((principle, index) => {
                ScrollTrigger.create({
                  end: "bottom 42%",
                  id: `about-principle-${index + 1}`,
                  invalidateOnRefresh: true,
                  onEnter: () => activatePrinciple(index),
                  onEnterBack: () => activatePrinciple(index),
                  start: "top 58%",
                  trigger: principle,
                });
              });
            } else {
              settlePrinciples();
            }

            const compact = Boolean(conditions.compact);
            const setupRowReveal = (
              row: HTMLElement,
              index: number,
              kind: "principle" | "agreement",
            ) => {
              const profile =
                kind === "principle"
                  ? {
                      titlePart: "title",
                      copyPart: "copy",
                      linePart: "title-line",
                      metadataPart: "label",
                      motion: "scroll-linked",
                      refreshOffset: 0,
                    }
                  : {
                      titlePart: "expected",
                      copyPart: "description",
                      linePart: "expected-line",
                      metadataPart: "eyebrow-row",
                      motion: "staged",
                      refreshOffset: principles.length,
                    };
              // Shared staged rows own their text and rules; retain only the
              // principle-state choreography in this controller.
              if (
                row.hasAttribute("data-route-reveal-group") &&
                row.closest<HTMLElement>("[data-route-reveal-profile]")
                  ?.dataset.routeRevealProfile === "staged"
              ) return;

              const prefix = `data-about-${kind}`;
              const motionAttribute = `${prefix}-motion`;
              const revealAttribute = `${prefix}-reveal-state`;
              const rule = row.querySelector<HTMLElement>(`[${prefix}-rule]`);
              const number = row.querySelector<HTMLElement>(`[${prefix}-index]`);
              const labels = Array.from(
                row.querySelectorAll<HTMLElement>(
                  `[${prefix}-${profile.metadataPart}]`,
                ),
              );
              const expectedLabel =
                kind === "agreement"
                  ? row.querySelector<HTMLElement>(
                      '[data-about-agreement-label="expected"]',
                    )
                  : null;
              const descriptionLabel =
                kind === "agreement"
                  ? row.querySelector<HTMLElement>(
                      '[data-about-agreement-label="description"]',
                    )
                  : null;
              const title = row.querySelector<HTMLElement>(
                `[${prefix}-${profile.titlePart}]`,
              );
              const copy = row.querySelector<HTMLElement>(
                `[${prefix}-${profile.copyPart}]`,
              );

              if (
                !rule ||
                !number ||
                labels.length === 0 ||
                !title ||
                !copy ||
                (kind === "agreement" && (!expectedLabel || !descriptionLabel))
              )
                return;
              const metadata = [number, ...labels];

              const syncRevealState = (progress: number) => {
                if (disposed || cancelled) return;
                const state =
                  progress >= 0.999
                    ? "visible"
                    : progress <= 0.001
                      ? "waiting"
                      : "revealing";
                if (row.getAttribute(revealAttribute) !== state)
                  row.setAttribute(revealAttribute, state);
              };

              row.setAttribute(motionAttribute, profile.motion);
              row.setAttribute(revealAttribute, "waiting");
              splits.push(
                SplitText.create(title, {
                  type: "lines",
                  mask: "lines",
                  tag: "span",
                  linesClass: `about-${kind}-line`,
                  aria: "auto",
                  autoSplit: true,
                  onSplit: (split) => {
                    if (disposed || cancelled) return;
                    split.lines.forEach((line) =>
                      line.setAttribute(`${prefix}-${profile.linePart}`, ""),
                    );

                    const timeline = gsap.timeline({
                      defaults: {
                        ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
                      },
                      onUpdate: function (this: ReturnType<GsapStatic["timeline"]>) {
                        syncRevealState(this.progress());
                      },
                      scrollTrigger: {
                        id: `about-${kind}-reveal-${index + 1}`,
                        trigger: row,
                        start: compact ? "top 96%" : "top 94%",
                        end: compact ? "top 70%" : "top 58%",
                        scrub: compact ? 0.5 : 0.85,
                        invalidateOnRefresh: true,
                        refreshPriority: -(profile.refreshOffset + index),
                        onRefresh: (trigger) => {
                          if (trigger.animation)
                            syncRevealState(trigger.animation.progress());
                        },
                      },
                    });

                    // Initialize every staggered target before the row starts.
                    timeline.set(
                      metadata,
                      { opacity: 0, y: compact ? 6 : 10, immediateRender: true },
                      0,
                    );
                    timeline.set(
                      split.lines,
                      { autoAlpha: 0, y: compact ? 10 : 24, immediateRender: true },
                      0,
                    );
                    if (expectedLabel && descriptionLabel) {
                      timeline.set(
                        [expectedLabel, descriptionLabel],
                        { opacity: 0, y: compact ? 6 : 10, immediateRender: true },
                        0,
                      );
                    }
                    timeline.fromTo(
                      rule,
                      { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" },
                      { autoAlpha: 0.64, scaleX: 1, duration: 0.2 },
                      0,
                    );
                    timeline.to(
                      metadata,
                      {
                        opacity: 1,
                        y: 0,
                        duration: 0.34,
                        stagger: 0.04,
                      },
                      0.1,
                    );
                    timeline.to(
                      split.lines,
                      {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.48,
                        stagger: { amount: 0.08 },
                      },
                      0.24,
                    );
                    if (expectedLabel) {
                      timeline.to(
                        expectedLabel,
                        { opacity: 1, y: 0, duration: 0.34 },
                        0.24,
                      );
                    }
                    timeline.fromTo(
                      copy,
                      { opacity: 0, y: compact ? 6 : 10 },
                      { opacity: 1, y: 0, duration: 0.32 },
                      0.68,
                    );
                    if (descriptionLabel) {
                      timeline.to(
                        descriptionLabel,
                        { opacity: 1, y: 0, duration: 0.32 },
                        0.68,
                      );
                    }

                    const scrubTween = timeline.scrollTrigger?.getTween();
                    if (scrubTween) {
                      // Spread all reveal stages across the full catch-up duration.
                      scrubTween.vars.ease = DESIGN_PRIMITIVE_GSAP_EASES.linear;
                      scrubTween.invalidate();
                    }

                    // A fixed total duration keeps completed rows complete on re-split.
                    scheduleRefresh();
                    return timeline;
                  },
                }),
              );
            };

            principles.forEach((principle, index) =>
              setupRowReveal(principle, index, "principle"),
            );
            agreements.forEach((agreement, index) =>
              setupRowReveal(agreement, index, "agreement"),
            );

            controller.dataset.profile = compact ? "compact" : "desktop";
            controller.dataset.state = "ready";
          };

          run();

          return cleanupMedia;
        },
        root,
      );

      scheduleRefresh();
    };

    void init().catch(() => {
      cleanup?.();
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
      data-about-motion
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
