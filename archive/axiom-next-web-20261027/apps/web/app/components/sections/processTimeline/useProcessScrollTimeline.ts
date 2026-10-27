"use client";

import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";

type ProcessTimelineController = {
  complete: () => void;
  refresh: () => void;
  reset: () => void;
  setProgress: (progress: number, options?: { animate?: boolean }) => void;
};

declare global {
  interface Window {
    __processTimelineController?: ProcessTimelineController;
  }
}

type UseProcessScrollTimelineOptions = {
  rootRef: RefObject<HTMLElement | null>;
};

const TIMELINE_COMPLETE_AT = 0.96;
const PROCESS_EXIT_COMPLETE_AT = 1.16;
const PROCESS_CARD_SHEEN_YAW_DEGREES = 7.6;
const HEADER_PART_ENTRIES = [
  { start: 0, end: 0.065, y: 92, blur: 1.4, scale: 0.012 },
  { start: 0.025, end: 0.115, y: 154, blur: 2.2, scale: 0.026 },
  { start: 0.052, end: 0.145, y: 118, blur: 1.8, scale: 0.018 },
] as const;
const HEADER_PART_EXITS = [
  { start: 0.14, end: 0.24, y: -92, blur: 1.4, scale: 0.012 },
  { start: 0.18, end: 0.31, y: -154, blur: 2.2, scale: 0.026 },
  { start: 0.23, end: 0.36, y: -118, blur: 1.8, scale: 0.018 },
] as const;
const CTA_PART_ENTRIES = [
  { start: 0.91, end: 0.955, y: 58, blur: 1.2, scale: 0.01 },
  { start: 0.925, end: 0.97, y: 102, blur: 1.8, scale: 0.02 },
  { start: 0.94, end: 0.985, y: 80, blur: 1.5, scale: 0.014 },
  { start: 0.955, end: 0.995, y: 62, blur: 1.2, scale: 0.012 },
] as const;
const CTA_PART_EXITS = [
  { start: 1.0, end: 1.075, y: -86, blur: 1.4, scale: 0.012 },
  { start: 1.012, end: 1.092, y: -132, blur: 2.1, scale: 0.022 },
  { start: 1.024, end: 1.108, y: -104, blur: 1.8, scale: 0.016 },
  { start: 1.036, end: 1.12, y: -76, blur: 1.5, scale: 0.014 },
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const smoothstep = (value: number) => value * value * (3 - 2 * value);

function getRangeProgress(progress: number, start: number, end: number) {
  if (end <= start) return progress >= end ? 1 : 0;

  return smoothstep(clamp01((progress - start) / (end - start)));
}

function getHeaderPreRollStartY(viewportHeight: number, stickyStartY: number) {
  return Math.min(
    viewportHeight * 0.86,
    stickyStartY + viewportHeight * 0.76
  );
}

function getRouteFillProgress(progress: number, revealPoints: number[]) {
  if (revealPoints.length < 2) return clamp01(progress);

  if (progress <= revealPoints[0]) return 0;

  for (let index = 1; index < revealPoints.length; index += 1) {
    const previousPoint = revealPoints[index - 1] ?? 0;
    const nextPoint = revealPoints[index] ?? 1;

    if (progress <= nextPoint) {
      const segmentProgress = clamp01(
        (progress - previousPoint) / (nextPoint - previousPoint)
      );
      return ((index - 1) + segmentProgress) / (revealPoints.length - 1);
    }
  }

  return 1;
}

function readRevealAt(element: Element, fallback: number) {
  const value = Number((element as HTMLElement).dataset.processRevealAt);
  return Number.isFinite(value) ? value : fallback;
}

function readStepIndex(element: Element, fallback: number) {
  const value = Number((element as HTMLElement).dataset.processStepIndex);
  return Number.isFinite(value) ? value : fallback;
}

function getActiveIndex(progress: number, revealPoints: number[]) {
  let activeIndex = 0;

  revealPoints.forEach((point, index) => {
    if (progress >= point - 0.035) {
      activeIndex = index;
    }
  });

  return activeIndex;
}

function resetProcessCardSheenTurn(card: HTMLElement) {
  card.style.setProperty("--process-card-tilt", "0");
  card.style.removeProperty("--process-card-depth-shadow-x");
  card.style.removeProperty("--process-card-depth-shadow-y");
  card.style.removeProperty("--process-card-depth-shadow-blur");
  card.style.removeProperty("--process-card-depth-shadow-alpha");
  card.style.removeProperty("--process-card-edge-left");
  card.style.removeProperty("--process-card-edge-right");
  card.style.removeProperty("--process-card-corner-pull");
  card.style.removeProperty("--process-card-anchor-pressure");
  card.style.removeProperty("transform");
  card.style.removeProperty("transform-origin");
}

function applyProcessCardSheenTurn(
  card: HTMLElement,
  amount: number,
  sweep: number
) {
  const turn = clamp01(amount);
  const sweepProgress = clamp01(sweep);
  const sweepDirection = sweepProgress * 2 - 1;
  const leftCatch = clamp01((0.5 - sweepProgress) * 2) * turn;
  const rightCatch = clamp01((sweepProgress - 0.5) * 2) * turn;
  const yaw = sweepDirection * PROCESS_CARD_SHEEN_YAW_DEGREES * turn;

  card.style.setProperty("--process-card-tilt", turn.toFixed(3));

  if (turn <= 0) {
    resetProcessCardSheenTurn(card);
    return;
  }

  card.style.setProperty(
    "--process-card-depth-shadow-x",
    `${(2.5 * (yaw / PROCESS_CARD_SHEEN_YAW_DEGREES)).toFixed(2)}px`
  );
  card.style.setProperty(
    "--process-card-depth-shadow-y",
    `${(18 + 6 * turn).toFixed(2)}px`
  );
  card.style.setProperty(
    "--process-card-depth-shadow-blur",
    `${(42 + 24 * turn).toFixed(2)}px`
  );
  card.style.setProperty(
    "--process-card-depth-shadow-alpha",
    (0.18 + 0.06 * turn).toFixed(3)
  );
  card.style.setProperty("--process-card-edge-left", leftCatch.toFixed(3));
  card.style.setProperty("--process-card-edge-right", rightCatch.toFixed(3));
  card.style.setProperty("--process-card-corner-pull", "0");
  card.style.setProperty("--process-card-anchor-pressure", "0");

  card.style.transform = [
    "perspective(860px)",
    "translate3d(0, 0, 0)",
    `rotateY(${yaw.toFixed(3)}deg)`,
  ].join(" ");
  card.style.transformOrigin = "50% 50%";
}

const DESKTOP_STEP_REVEALS = [
  { start: 0.2, end: 0.46, x: 0, y: 420, rotate: -1.2 },
  { start: 0.3, end: 0.56, x: 0, y: 450, rotate: 0.6 },
  { start: 0.4, end: 0.66, x: 0, y: 420, rotate: 1.2 },
];
const FALLBACK_DESKTOP_STEP_REVEAL = {
  start: 0.4,
  end: 0.66,
  x: 0,
  y: 420,
  rotate: 1.2,
};

const HEADER_SETTLE = { start: 0, end: 0.145 };
const HEADER_PRE_ROLL_COMPLETE_AT = 0.11;
const CENTER_CARD_LIFT = { start: 0.79, end: 0.94 };
const SIDE_CARD_LIFT = { start: 0.815, end: 0.985 };
const CENTER_CARD_FADE = { start: 0.795, end: 0.95 };
const SIDE_CARD_FADE = { start: 0.815, end: 0.985 };
const CTA_BLOCK_ENTRY = { start: 0.905, end: 0.965, y: 250 };
const CTA_BLOCK_EXIT = { start: 0.995, end: 1.12, y: -148 };

export function useProcessScrollTimeline({
  rootRef,
}: UseProcessScrollTimelineOptions) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let frame = 0;
    let scrollFrame = 0;
    let progressValue = 0;
    let reducedMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion
    ).matches;

    const getProgressItems = () =>
      Array.from(root.querySelectorAll<HTMLElement>("[data-process-progress-item]"));

    const getProgressFills = () =>
      Array.from(root.querySelectorAll<HTMLElement>("[data-process-progress-fill]"));

    const getRouteBoard = () =>
      root.querySelector<HTMLElement>("[data-process-route-board]");

    const getRouteSteps = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>("[data-process-diagram-step]")
      );

    const getMobileCards = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>("[data-process-mobile-card]")
      );

    const getTimeline = () =>
      root.closest<HTMLElement>("[data-process-timeline]");

    const getStickyStage = () =>
      getTimeline()?.querySelector<HTMLElement>(
        "[data-process-handoff-content]"
      ) ?? null;

    const getHeader = () =>
      getTimeline()?.querySelector<HTMLElement>("[data-process-header]") ??
      null;

    const getHeaderParts = () => {
      const timeline = getTimeline();

      return timeline
        ? Array.from(
            timeline.querySelectorAll<HTMLElement>(
              "[data-process-heading-part]"
            )
          )
        : [];
    };

    const getProcessCta = () =>
      getTimeline()?.querySelector<HTMLElement>("[data-process-cta]") ?? null;

    const getProcessCtaParts = () => {
      const processCta = getProcessCta();

      return processCta
        ? Array.from(
            processCta.querySelectorAll<HTMLElement>(
              "[data-process-cta-part]"
            )
          )
        : [];
    };

    const getRevealPoints = () =>
      getProgressItems()
        .map((item, index) => readRevealAt(item, index / 3))
        .sort((a, b) => a - b);

    const isVisibleTarget = (
      element: HTMLElement | null
    ): element is HTMLElement => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const getScrollTarget = () => {
      const routeBoard = getRouteBoard();
      if (isVisibleTarget(routeBoard)) return routeBoard;

      return root;
    };

    const isDesktopLayout = () =>
      window.matchMedia("(min-width: 921px)").matches;

    const readScrollProgress = () => {
      const timeline = getTimeline();
      const viewportHeight = window.innerHeight || 1;

      if (isVisibleTarget(timeline)) {
        const rect = timeline.getBoundingClientRect();
        const stickyStage = getStickyStage();
        const stickyStageHeight =
          stickyStage?.getBoundingClientRect().height ?? viewportHeight;
        const stickyStageStyle = window.getComputedStyle(
          stickyStage ?? timeline
        );
        const stickyTop = Number.parseFloat(
          stickyStageStyle.top || stickyStageStyle.getPropertyValue("top")
        );
        const startY = Number.isFinite(stickyTop)
          ? stickyTop
          : viewportHeight * 0.1;
        const travelDistance = Math.max(1, rect.height - stickyStageHeight);

        if (isDesktopLayout()) {
          const preRollStartY = getHeaderPreRollStartY(viewportHeight, startY);

          if (rect.top > startY) {
            const preRollDistance = Math.max(1, preRollStartY - startY);
            return clamp01(
              ((preRollStartY - rect.top) / preRollDistance) *
                HEADER_PRE_ROLL_COMPLETE_AT
            );
          }

          const pinnedProgress = (startY - rect.top) / travelDistance;
          return clamp(
            HEADER_PRE_ROLL_COMPLETE_AT +
              pinnedProgress * (1 - HEADER_PRE_ROLL_COMPLETE_AT),
            0,
            PROCESS_EXIT_COMPLETE_AT
          );
        }

        return clamp01((startY - rect.top) / travelDistance);
      }

      const target = getScrollTarget();
      const rect = target.getBoundingClientRect();
      const startY = viewportHeight * 0.52;
      const endY = viewportHeight * -0.38;
      const travelDistance = Math.max(1, startY - endY);
      const centerY = rect.top + rect.height / 2;

      return clamp01((startY - centerY) / travelDistance);
    };

    const applyRouteState = (progress: number) => {
      const revealPoints = getRevealPoints();
      const activeIndex = getActiveIndex(progress, revealPoints);

      const compactFillProgress = clamp01(
        (progress - (revealPoints[0] ?? 0.08)) /
          (TIMELINE_COMPLETE_AT - (revealPoints[0] ?? 0.08))
      );
      const routeFillProgress = getRouteFillProgress(progress, revealPoints);
      const routeBoard = getRouteBoard();

      root.style.setProperty(
        "--process-route-progress",
        routeFillProgress.toFixed(4)
      );
      routeBoard?.style.setProperty(
        "--process-route-progress",
        routeFillProgress.toFixed(4)
      );

      gsap.set(getProgressFills(), {
        scaleX: compactFillProgress,
      });

      getProgressItems().forEach((item, fallbackIndex) => {
        const index = readStepIndex(item, fallbackIndex);
        const state =
          index < activeIndex
            ? "done"
            : index === activeIndex
              ? "active"
              : "upcoming";
        item.dataset.progressState = state;
        if (state === "active") {
          item.setAttribute("aria-current", "step");
        } else {
          item.removeAttribute("aria-current");
        }

        item.closest<HTMLElement>("[data-process-diagram-step]")?.setAttribute(
          "data-progress-state",
          state
        );
      });

      return { activeIndex };
    };

    const applyDesktop = (progress: number) => {
      const { activeIndex } = applyRouteState(progress);
      const routeSteps = getRouteSteps();
      const processCta = getProcessCta();
      const processCtaParts = getProcessCtaParts();
      const header = getHeader();
      const headerParts = getHeaderParts();
      const introProgress = getRangeProgress(
        progress,
        HEADER_SETTLE.start,
        HEADER_SETTLE.end
      );
      const headerIntroOffset = Math.min(
        72,
        Math.max(38, window.innerHeight * 0.075)
      );
      const centerCardLift = Math.min(
        520,
        Math.max(450, window.innerHeight * 0.57)
      );
      const sideCardLift = Math.min(
        360,
        Math.max(316, window.innerHeight * 0.39)
      );
      const ctaViewportCenterOffset = -Math.min(
        44,
        Math.max(30, window.innerHeight * 0.045)
      );
      const ctaBlockEntryProgress = getRangeProgress(
        progress,
        CTA_BLOCK_ENTRY.start,
        CTA_BLOCK_ENTRY.end
      );
      const ctaBlockExitProgress = getRangeProgress(
        progress,
        CTA_BLOCK_EXIT.start,
        CTA_BLOCK_EXIT.end
      );
      const ctaBlockOpacity =
        ctaBlockEntryProgress * (1 - ctaBlockExitProgress);
      const ctaBlockY =
        ctaViewportCenterOffset +
        CTA_BLOCK_ENTRY.y * (1 - ctaBlockEntryProgress) +
        CTA_BLOCK_EXIT.y * ctaBlockExitProgress;
      let prePinHeaderLift = 0;

      if (header) {
        const timeline = getTimeline();
        const stickyStage = getStickyStage();
        const stageStyle = window.getComputedStyle(stickyStage ?? header);
        const stickyTop = Number.parseFloat(
          stageStyle.top || stageStyle.getPropertyValue("top")
        );
        const stickyStartY = Number.isFinite(stickyTop)
          ? stickyTop
          : window.innerHeight * 0.1;
        const preRollStartY = getHeaderPreRollStartY(
          window.innerHeight || 1,
          stickyStartY
        );
        const timelineTop =
          timeline?.getBoundingClientRect().top ?? stickyStartY;

        if (timelineTop > stickyStartY) {
          const prePinProgress = clamp01(
            (preRollStartY - timelineTop) /
              Math.max(1, preRollStartY - stickyStartY)
          );
          const maxPrePinLift = Math.min(
            150,
            Math.max(92, window.innerHeight * 0.17)
          );

          prePinHeaderLift = maxPrePinLift * (1 - smoothstep(prePinProgress));
        }
      }

      if (header) {
        gsap.set(header, {
          autoAlpha: 1,
          filter: "blur(0px)",
          scale: 1,
          transformOrigin: "50% 50%",
          y: (1 - introProgress) * headerIntroOffset - prePinHeaderLift,
          yPercent: -50,
        });
      }

      headerParts.forEach((part, index) => {
        const entry =
          HEADER_PART_ENTRIES[index] ??
          HEADER_PART_ENTRIES[HEADER_PART_ENTRIES.length - 1];
        const exit =
          HEADER_PART_EXITS[index] ??
          HEADER_PART_EXITS[HEADER_PART_EXITS.length - 1];
        const entryProgress = getRangeProgress(
          progress,
          entry.start,
          entry.end
        );
        const entryVisibilityEnd =
          entry.start + (entry.end - entry.start) * 0.72;
        const entryVisibleProgress = getRangeProgress(
          progress,
          entry.start,
          entryVisibilityEnd
        );
        const exitProgress = getRangeProgress(progress, exit.start, exit.end);
        const opacity = entryVisibleProgress * (1 - exitProgress);
        const entryOffset = entry.y * (1 - entryProgress);
        const exitOffset = exit.y * exitProgress;
        const blur =
          entry.blur * (1 - entryProgress) + exit.blur * exitProgress;
        const scale =
          1 -
          entry.scale * (1 - entryProgress) -
          exit.scale * exitProgress;

        gsap.set(part, {
          filter: `blur(${blur.toFixed(3)}px)`,
          opacity,
          scale,
          transformOrigin: "50% 45%",
          visibility:
            entryVisibleProgress < 0.02 || exitProgress > 0.98
              ? "hidden"
              : "visible",
          y: entryOffset + exitOffset,
        });
      });

      gsap.set(root, {
        y: 0,
      });

      routeSteps.forEach((step, index) => {
        const reveal =
          DESKTOP_STEP_REVEALS[index] ??
          DESKTOP_STEP_REVEALS[DESKTOP_STEP_REVEALS.length - 1] ??
          FALLBACK_DESKTOP_STEP_REVEAL;
        const stepProgress = getRangeProgress(
          progress,
          reveal.start,
          reveal.end
        );
        const partProgressBase = clamp01(stepProgress * 1.08);
        const card = step.querySelector<HTMLElement>(
          "[data-process-mobile-card]"
        );
        const parts = Array.from(
          step.querySelectorAll<HTMLElement>("[data-process-card-part]")
        );
        const travel = 1 - stepProgress;
        const activeDistance = Math.abs(index - activeIndex);
        const focus = clamp01(stepProgress * (activeDistance === 0 ? 1 : 0.28));
        const sheenTravel = clamp01((progress - reveal.end) / 0.18);
        const sheenStart = getRangeProgress(
          progress,
          reveal.end,
          reveal.end + 0.025
        );
        const sheenFade =
          1 -
          getRangeProgress(progress, reveal.end + 0.13, reveal.end + 0.24);
        const sheen = clamp01(sheenStart * sheenFade);
        const sheenTiltProgress = clamp01((progress - reveal.end) / 0.24);
        const sheenTilt =
          Math.sin(sheenTiltProgress * Math.PI) * sheenStart * sheenFade;
        const cardTilt = sheen > 0.01 && sheenTilt > 0.001 ? sheenTilt : 0;
        const cardLiftProgress =
          index === 1
            ? getRangeProgress(
                progress,
                CENTER_CARD_LIFT.start,
                CENTER_CARD_LIFT.end
              )
            : getRangeProgress(
                progress,
                SIDE_CARD_LIFT.start,
                SIDE_CARD_LIFT.end
              );
        const cardLift =
          (index === 1 ? centerCardLift : sideCardLift) * cardLiftProgress;
        const cardFadeProgress =
          index === 1
            ? getRangeProgress(
                progress,
                CENTER_CARD_FADE.start,
                CENTER_CARD_FADE.end
              )
            : getRangeProgress(
                progress,
                SIDE_CARD_FADE.start,
                SIDE_CARD_FADE.end
              );
        const cardOpacity =
          Math.min(1, stepProgress * 1.15) * (1 - cardFadeProgress);
        const cardOutBlur = cardFadeProgress * 10;
        const cardOutScale = 1 - cardFadeProgress * 0.035;

        gsap.set(step, {
          autoAlpha: cardOpacity,
          filter: `blur(${((1 - stepProgress) * 8 + cardOutBlur).toFixed(
            3
          )}px)`,
          pointerEvents:
            stepProgress > 0.98 && cardFadeProgress < 0.06 ? "auto" : "none",
          rotate: reveal.rotate * travel,
          scale: (0.9 + stepProgress * 0.1) * cardOutScale,
          transformOrigin: "50% 62%",
          x: reveal.x * travel,
          y: reveal.y * travel - cardLift,
          zIndex: index === 1 ? 2 : 1,
        });

        card?.style.setProperty("--process-card-focus", focus.toFixed(3));
        card?.style.setProperty("--process-card-sheen", sheen.toFixed(3));
        card?.style.setProperty(
          "--process-card-sheen-x",
          `${-26 + sheenTravel * 58}%`
        );
        card?.style.setProperty(
          "--process-card-sheen-y",
          `${12 - sheenTravel * 24}%`
        );
        if (card) {
          applyProcessCardSheenTurn(card, cardTilt, sheenTravel);
        }

        parts.forEach((part, partIndex) => {
          const partProgress = getRangeProgress(
            progress,
            reveal.start + 0.05 + partIndex * 0.024,
            reveal.end
          );

          gsap.set(part, {
            autoAlpha: Math.min(1, partProgressBase * partProgress * 1.1),
            filter: `blur(${(1 - partProgress) * 4}px)`,
            y: (1 - partProgress) * 18,
          });
        });
      });

      if (processCta) {
        gsap.set(processCta, {
          autoAlpha: ctaBlockOpacity,
          filter: `blur(${(
            (1 - ctaBlockEntryProgress) * 3.2 +
            ctaBlockExitProgress * 1.6
          ).toFixed(3)}px)`,
          pointerEvents:
            ctaBlockEntryProgress > 0.92 && ctaBlockExitProgress < 0.08
              ? "auto"
              : "none",
          scale:
            0.984 +
            ctaBlockEntryProgress * 0.016 -
            ctaBlockExitProgress * 0.012,
          transformOrigin: "50% 50%",
          y: ctaBlockY,
          zIndex: 4,
        });
      }

      processCtaParts.forEach((part, index) => {
        const entry =
          CTA_PART_ENTRIES[index] ??
          CTA_PART_ENTRIES[CTA_PART_ENTRIES.length - 1];
        const exit =
          CTA_PART_EXITS[index] ??
          CTA_PART_EXITS[CTA_PART_EXITS.length - 1];
        const entryProgress = getRangeProgress(
          progress,
          entry.start,
          entry.end
        );
        const entryVisibilityEnd =
          entry.start + (entry.end - entry.start) * 0.72;
        const entryVisibleProgress = getRangeProgress(
          progress,
          entry.start,
          entryVisibilityEnd
        );
        const exitProgress = getRangeProgress(progress, exit.start, exit.end);
        const opacity = entryVisibleProgress * (1 - exitProgress);
        const entryOffset = entry.y * (1 - entryProgress);
        const exitOffset = exit.y * exitProgress;
        const blur =
          entry.blur * (1 - entryProgress) + exit.blur * exitProgress;
        const scale =
          1 -
          entry.scale * (1 - entryProgress) -
          exit.scale * exitProgress;

        gsap.set(part, {
          filter: `blur(${blur.toFixed(3)}px)`,
          opacity,
          scale,
          transformOrigin: "50% 45%",
          visibility:
            entryVisibleProgress < 0.02 || exitProgress > 0.98
              ? "hidden"
              : "visible",
          y: entryOffset + exitOffset,
        });
      });
    };

    const applyMobile = (progress: number) => {
      applyRouteState(progress);

      const header = getHeader();
      if (header) {
        gsap.set(header, {
          autoAlpha: 1,
          clearProps: "filter,scale,transform,transformOrigin,y",
        });
      }

      gsap.set(getHeaderParts(), {
        opacity: 1,
        visibility: "visible",
        clearProps: "filter,scale,transform,transformOrigin,y",
      });

      getRouteSteps().forEach((step) => {
        gsap.set(step, {
          autoAlpha: 1,
          clearProps: "filter,rotate,scale,transformOrigin,x,y,pointerEvents",
        });
      });

      gsap.set(root, {
        clearProps: "transform",
      });

      getMobileCards().forEach((card) => {
        card.style.setProperty("--process-card-focus", "0");
        card.style.setProperty("--process-card-sheen", "0");
        card.style.setProperty("--process-card-sheen-x", "-120%");
        card.style.setProperty("--process-card-sheen-y", "0%");
        resetProcessCardSheenTurn(card);
        gsap.set(card, {
          autoAlpha: 1,
          clearProps: "rotateX,rotateY,transformPerspective,transformOrigin,z",
          filter: "blur(0px)",
          scale: 1,
          y: 0,
        });
      });

      const processCta = getProcessCta();
      if (processCta) {
        gsap.set(processCta, {
          autoAlpha: 1,
          clearProps: "filter,pointerEvents,scale,transformOrigin,y",
        });
      }

      gsap.set(getProcessCtaParts(), {
        opacity: 1,
        visibility: "visible",
        clearProps: "filter,scale,transform,transformOrigin,y",
      });
    };

    const applyProgress = (nextProgress: number) => {
      progressValue = clamp(nextProgress, 0, PROCESS_EXIT_COMPLETE_AT);
      const effectiveProgress = reducedMotion ? 0.96 : progressValue;

      if (isDesktopLayout()) {
        applyDesktop(effectiveProgress);
      } else {
        applyMobile(effectiveProgress);
      }
    };

    const syncFromScroll = () => {
      applyProgress(readScrollProgress());
    };

    const scheduleScrollSync = () => {
      if (scrollFrame) return;

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        syncFromScroll();
      });
    };

    const refresh = () => {
      reducedMotion = window.matchMedia(
        DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion
      ).matches;
      syncFromScroll();
    };

    const controller: ProcessTimelineController = {
      complete: () => applyProgress(1),
      refresh,
      reset: () => applyProgress(0),
      setProgress: (progress) => applyProgress(progress),
    };

    frame = window.requestAnimationFrame(() => {
      refresh();
      window.__processTimelineController = controller;
      window.dispatchEvent(new Event("process-timeline:ready"));
    });

    const handleResize = () => {
      refresh();
    };

    window.addEventListener("scroll", scheduleScrollSync, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frame);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", scheduleScrollSync);
      window.removeEventListener("resize", handleResize);
      if (window.__processTimelineController === controller) {
        delete window.__processTimelineController;
      }
    };
  }, [rootRef]);
}
