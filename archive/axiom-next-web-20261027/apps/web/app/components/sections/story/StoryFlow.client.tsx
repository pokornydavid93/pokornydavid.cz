"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
} from "@/app/theme/design-primitives";
import heroStyles from "../../../home.critical.module.css";
import CinematicGridPan, {
  CINEMATIC_GRID_PAN_UPDATE,
  type CinematicGridPanDebugDetail,
} from "./CinematicGridPan.client";
import { cinematicGridPanSegments } from "./cinematicMotion";
import s from "./storyFlow.module.css";

type StoryFlowProps = {
  children: React.ReactNode;
};

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

type StoryPanelId = "hero" | "process" | "video" | "proof" | "first-step";
type StoryChapterId = "situation" | "process" | "video" | "proof" | "first-step";
type StoryNavSection = "hero" | "process" | "video" | "testimonials" | "lead-form";

type StoryChapter = {
  id: StoryChapterId;
  panel: StoryPanelId;
  label: string;
  navSection: StoryNavSection;
  hash: string;
  hashes: readonly string[];
};

const storyChapters = [
  {
    id: "situation",
    panel: "hero",
    label: "Situace",
    navSection: "hero",
    hash: "#hero",
    hashes: ["#hero"],
  },
  {
    id: "video",
    panel: "video",
    label: "Video",
    navSection: "video",
    hash: "#video",
    hashes: ["#video"],
  },
  {
    id: "process",
    panel: "process",
    label: "Jak pracuji",
    navSection: "process",
    hash: "#jak-pracuji",
    hashes: ["#jak-pracuji", "#process", "#plan", "#navrh-reseni", "#dlouhodoba-pece"],
  },
] as const satisfies readonly StoryChapter[];

type StorySection = StoryChapterId;

const storyChapterByHash = new Map<string, StoryChapter>(
  storyChapters.flatMap((chapter) =>
    chapter.hashes.map((hash) => [hash, chapter] as const),
  ),
);

const processHashProgress: Record<string, number> = {
  "#jak-pracuji": 0,
  "#process": 0,
  "#plan": 0.82,
  "#navrh-reseni": 0.82,
  "#dlouhodoba-pece": 1,
};

const processHashTarget: Record<string, string> = {
  "#jak-pracuji": "#jak-pracuji",
  "#process": "#process",
  "#plan": "#navrh-reseni",
  "#navrh-reseni": "#navrh-reseni",
  "#dlouhodoba-pece": "#dlouhodoba-pece",
};

const SHOW_CINEMATIC_DEBUG = process.env.NODE_ENV !== "production";

const defaultDebugState: CinematicGridPanDebugDetail = {
  active: false,
  progress: 0,
  x: 0,
  y: 0,
  scene: "idle",
  scrollY: 0,
};

type StoryFlowApi = {
  getActiveSection: () => StorySection | null;
  scrollToHash: (hash: string) => boolean;
};

type LenisLike = {
  scrollTo?: (
    target: number | string | Element,
    options?: { immediate?: boolean; force?: boolean },
  ) => void;
};

type ProcessTimelineController = {
  complete: () => void;
  refresh: () => void;
  reset: () => void;
  setProgress: (progress: number, options?: { animate?: boolean }) => void;
};

declare global {
  interface Window {
    __processTimelineController?: ProcessTimelineController;
    __storyFlow?: StoryFlowApi;
  }
}

function requestIdle(cb: () => void, timeout = 1500) {
  const w = window as unknown as {
    requestIdleCallback?: (fn: () => void, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }

  const t = window.setTimeout(cb, 350);
  return () => window.clearTimeout(t);
}

const scrollToY = (top: number) => {
  const safeTop = Math.max(0, Math.round(top));
  const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;

  if (lenis?.scrollTo) {
    lenis.scrollTo(safeTop, { immediate: false, force: true });
    return;
  }

  window.scrollTo({ top: safeTop, left: 0, behavior: "auto" });
};

const getDocumentTop = (target: HTMLElement) =>
  window.scrollY + target.getBoundingClientRect().top;

const getScrollOffset = () => (window.innerWidth >= 821 ? 96 : 74);

const getTargetScrollTop = (target: HTMLElement, hash: string) => {
  const top = getDocumentTop(target);
  if (hash === "#hero") return top;

  return Math.max(0, top - getScrollOffset());
};

const uniqueElements = (...groups: Array<Array<HTMLElement | null | undefined>>) => {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];

  groups.flat().forEach((element) => {
    if (!element || seen.has(element)) return;
    seen.add(element);
    result.push(element);
  });

  return result;
};

const getPanelMotionGroups = (panel: HTMLElement) => {
  const panelId = panel.dataset.storyPanel as StoryPanelId | undefined;

  if (panelId === "hero") {
    if (panel.querySelector("[data-cinematic-hero-process]")) {
      return {
        primary: [],
        secondary: [],
        cards: [],
      };
    }

    return {
      primary: uniqueElements(
        [panel.querySelector<HTMLElement>(`.${heroStyles.heroDefaultContent}`)],
      ),
      secondary: uniqueElements(
        [panel.querySelector<HTMLElement>(`.${heroStyles.heroMediaCol}`)],
      ),
      cards: [],
    };
  }

  if (panelId === "process") {
    return {
      primary: [],
      secondary: [],
      cards: [],
    };
  }

  if (panelId === "video") {
    return {
      primary: uniqueElements([
        panel.querySelector<HTMLElement>("[data-video-copy]"),
      ]),
      secondary: uniqueElements([
        panel.querySelector<HTMLElement>("[data-video-frame]"),
        panel.querySelector<HTMLElement>("[data-video-info-card]"),
      ]),
      cards: uniqueElements(
        Array.from(panel.querySelectorAll<HTMLElement>("[data-video-cta-part]")),
      ),
    };
  }

  if (panelId === "proof") {
    return {
      primary: uniqueElements([
        panel.querySelector<HTMLElement>(`.${s.storyChapterCopy}`),
      ]),
      secondary: [],
      cards: uniqueElements(
        Array.from(panel.querySelectorAll<HTMLElement>("[data-story-proof-cards] > *")),
      ),
    };
  }

  if (panelId === "first-step") {
    return {
      primary: uniqueElements([
        panel.querySelector<HTMLElement>(`.${s.storyChapterCopy}`),
      ]),
      secondary: uniqueElements([
        panel.querySelector<HTMLElement>(`.${s.firstStepCard}`),
      ]),
      cards: uniqueElements([
        panel.querySelector<HTMLElement>("[data-story-first-step-cta]"),
      ]),
    };
  }

  return {
    primary: [],
    secondary: [],
    cards: [],
  };
};

const getStoryMotionProfile = (panel: HTMLElement) => {
  const panelId = panel.dataset.storyPanel as StoryPanelId | undefined;

  if (panelId === "process") {
    return {
      enterStart: "top 104%",
      enterEnd: "top 38%",
      exitStart: "bottom 86%",
      exitEnd: "bottom 50%",
      scrub: 0.42,
      primaryFromY: 128,
      secondaryFromY: 210,
      cardFromY: 214,
      exitPrimaryY: -168,
      exitSecondaryY: -230,
      exitCardY: -188,
      enterOpacity: 0.36,
      exitOpacity: 0.28,
      cardStagger: 0.09,
    };
  }

  if (panelId === "hero") {
    return {
      enterStart: "top 108%",
      enterEnd: "top 30%",
      exitStart: "top -2%",
      exitEnd: "bottom 34%",
      scrub: 0.38,
      primaryFromY: 160,
      secondaryFromY: 220,
      cardFromY: 240,
      exitPrimaryY: -240,
      exitSecondaryY: -320,
      exitCardY: -260,
      enterOpacity: 0.54,
      exitOpacity: 0.5,
      cardStagger: 0.06,
    };
  }

  if (panelId === "video") {
    return {
      enterStart: "top 96%",
      enterEnd: "top 30%",
      exitStart: "bottom 82%",
      exitEnd: "bottom 34%",
      scrub: 0.4,
      primaryFromY: 112,
      secondaryFromY: 178,
      cardFromY: 210,
      exitPrimaryY: -132,
      exitSecondaryY: -168,
      exitCardY: -190,
      enterOpacity: 0.18,
      exitOpacity: 0.56,
      cardStagger: 0.06,
    };
  }

  return {
    enterStart: "top 106%",
    enterEnd: "top 34%",
    exitStart: "top -6%",
    exitEnd: "bottom 36%",
    scrub: 0.42,
    primaryFromY: 150,
    secondaryFromY: 220,
    cardFromY: 250,
    exitPrimaryY: -210,
    exitSecondaryY: -270,
    exitCardY: -230,
    enterOpacity: 0.46,
    exitOpacity: 0.56,
    cardStagger: 0.07,
  };
};

function CinematicDebugMeter() {
  const [state, setState] =
    useState<CinematicGridPanDebugDetail>(defaultDebugState);

  useEffect(() => {
    if (!SHOW_CINEMATIC_DEBUG) return undefined;

    const root = document.querySelector<HTMLElement>("[data-story-root]");
    if (!root) return undefined;

    const readDataset = () => {
      const progress = Number.parseFloat(
        root.dataset.cinematicGridPanProgress ?? "0",
      );
      const x = Number.parseFloat(root.dataset.cinematicGridPanX ?? "0");
      const y = Number.parseFloat(root.dataset.cinematicGridPanY ?? "0");

      setState({
        active: root.dataset.cinematicGridPanActive === "true",
        progress: Number.isFinite(progress) ? progress : 0,
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        scene: root.dataset.cinematicGridPanScene ?? "idle",
        scrollY: Math.round(window.scrollY || window.pageYOffset || 0),
      });
    };

    const handleUpdate = (event: Event) => {
      setState((event as CustomEvent<CinematicGridPanDebugDetail>).detail);
    };

    readDataset();
    root.addEventListener(CINEMATIC_GRID_PAN_UPDATE, handleUpdate);
    window.addEventListener("scroll", readDataset, { passive: true });
    window.addEventListener("resize", readDataset);

    return () => {
      root.removeEventListener(CINEMATIC_GRID_PAN_UPDATE, handleUpdate);
      window.removeEventListener("scroll", readDataset);
      window.removeEventListener("resize", readDataset);
    };
  }, []);

  if (!SHOW_CINEMATIC_DEBUG) return null;

  const progressPercent = `${(state.progress * 100).toFixed(1)}%`;
  const coordinateLine = `p=${state.progress.toFixed(4)} x=${state.x.toFixed(
    0,
  )} y=${state.y.toFixed(0)}`;

  return (
    <aside
      className={s.debugMeter}
      aria-label="Cinematic scene coordinates"
      data-cinematic-debug-meter
    >
      <div className={s.debugMeterHeader}>
        <span>Camera meter</span>
        <strong>{state.active ? "active" : "inactive"}</strong>
      </div>
      <div className={s.debugMeterGrid}>
        <span>scene</span>
        <code>{state.scene}</code>
        <span>progress</span>
        <code>{progressPercent}</code>
        <span>x</span>
        <code>{state.x.toFixed(0)}</code>
        <span>y</span>
        <code>{state.y.toFixed(0)}</code>
        <span>scroll</span>
        <code>{state.scrollY}</code>
      </div>
      <code className={s.debugMeterCopy}>{coordinateLine}</code>
    </aside>
  );
}

export default function StoryFlow({ children }: StoryFlowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeSectionRef = useRef<StorySection | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let killed = false;
    let cleanupMotion: null | (() => void) = null;

    const storyPanels = Array.from(
      root.querySelectorAll<HTMLElement>("[data-story-panel]"),
    );
    let lockedSection: StorySection | null = null;
    let activeLockUntil = 0;

    const getChapter = (section: StorySection | null) =>
      section ? storyChapters.find((chapter) => chapter.id === section) : undefined;

    const setActiveSection = (nextSection: StorySection | null) => {
      if (activeSectionRef.current === nextSection) return;

      activeSectionRef.current = nextSection;
      const chapter = getChapter(nextSection);

      if (chapter) {
        root.dataset.storyActiveSection = chapter.id;
        root.dataset.storyActivePanel = chapter.panel;
      } else {
        delete root.dataset.storyActiveSection;
        delete root.dataset.storyActivePanel;
      }

      storyPanels.forEach((panel) => {
        panel.dataset.storyActive =
          chapter && panel.dataset.storyPanel === chapter.panel ? "true" : "false";
      });

      window.dispatchEvent(
        new CustomEvent("storyflow:sectionchange", {
          detail: {
            section: nextSection,
            chapter: nextSection,
            panel: chapter?.panel ?? null,
            navSection: chapter?.navSection ?? null,
          },
        }),
      );
    };

    const lockActiveSection = (nextSection: StorySection | null) => {
      lockedSection = nextSection;
      activeLockUntil = nextSection ? performance.now() + 1100 : 0;
      setActiveSection(nextSection);
    };

    const isRootInView = () => {
      const rect = root.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3;
    };

    const readActiveFromViewport = () => {
      if (lockedSection && performance.now() < activeLockUntil) {
        setActiveSection(lockedSection);
        return;
      }
      lockedSection = null;

      if (!isRootInView()) {
        setActiveSection(null);
        return;
      }

      let best: { id: StoryChapterId; distance: number } | null = null;
      let intersectingChapter: StoryChapterId | null = null;
      const anchorY = window.innerHeight * 0.44;

      for (const chapter of storyChapters) {
        const panel = root.querySelector<HTMLElement>(
          `[data-story-panel="${chapter.panel}"]`,
        );
        if (!panel) continue;

        const rect = panel.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

        if (rect.top <= anchorY && rect.bottom >= anchorY) {
          intersectingChapter = chapter.id;
          continue;
        }

        const distance = Math.abs(rect.top - anchorY);
        if (!best || distance < best.distance) {
          best = { id: chapter.id, distance };
        }
      }

      setActiveSection(intersectingChapter ?? best?.id ?? null);
    };

    const observer = new IntersectionObserver(
      () => readActiveFromViewport(),
      {
        root: null,
        rootMargin: "-36% 0px -42% 0px",
        threshold: [0, 0.18, 0.34, 0.52, 0.7],
      },
    );

    storyPanels.forEach((panel) => observer.observe(panel));
    window.addEventListener("scroll", readActiveFromViewport, { passive: true });
    window.addEventListener("resize", readActiveFromViewport);

    const scrollToDocumentTarget = (
      hash: string,
      nextSection: StorySection | null = null,
    ) => {
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return false;

      scrollToY(getTargetScrollTop(target, hash));
      lockActiveSection(nextSection);
      return true;
    };

    const scrollToProcessTarget = (hash: string) => {
      const progress = processHashProgress[hash];
      const targetSelector = processHashTarget[hash] ?? hash;
      const target =
        document.querySelector<HTMLElement>(targetSelector) ??
        document.querySelector<HTMLElement>("#jak-pracuji") ??
        document.querySelector<HTMLElement>("#process");

      if (!target || typeof progress !== "number") return false;

      scrollToY(getTargetScrollTop(target, hash));
      lockActiveSection("process");
      window.requestAnimationFrame(() => {
        window.__processTimelineController?.setProgress(progress, {
          animate: false,
        });
      });
      return true;
    };

    const storyApi: StoryFlowApi = {
      getActiveSection: () => activeSectionRef.current,
      scrollToHash: (hash) => {
        if (!hash.startsWith("#")) return false;

        if (hash in processHashProgress) {
          return scrollToProcessTarget(hash);
        }

        const chapter = storyChapterByHash.get(hash);
        if (chapter) {
          return scrollToDocumentTarget(chapter.hash, chapter.id);
        }

        return scrollToDocumentTarget(hash);
      },
    };

    window.__storyFlow = storyApi;
    root.dataset.storyReady = "true";
    window.dispatchEvent(new Event("storyflow:ready"));
    readActiveFromViewport();

    const initMotion = async () => {
      const reduceMotion =
        window.matchMedia?.(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion)
          ?.matches ?? false;
      const supportsDesktopMotion = window.matchMedia?.(
        DESIGN_PRIMITIVE_MEDIA_QUERIES.mediaTabletAndUp,
      )?.matches;
      if (killed || reduceMotion || !supportsDesktopMotion) return;

      const [gsapMod, stMod] = await Promise.all([
        import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
        import("gsap/ScrollTrigger") as Promise<
          ScrollTriggerModule & { default?: ScrollTriggerStatic }
        >,
      ]);

      const gsap = gsapMod.gsap ?? gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;
      if (!gsap || !ScrollTrigger || killed) return;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const setupHeroProcessHandoff = () => {
          const heroPanel = root.querySelector<HTMLElement>(
            '[data-story-panel="hero"]',
          );
          const processPanel = root.querySelector<HTMLElement>(
            '[data-story-panel="process"]',
          );
          if (!heroPanel || !processPanel) return;

          const heroGroups = getPanelMotionGroups(heroPanel);
          const processGroups = getPanelMotionGroups(processPanel);
          const heroPrimary = heroGroups.primary;
          const heroSecondary = heroGroups.secondary;
          const processHeading = processGroups.primary;
          const processCards = processGroups.cards;
          const veil = root.querySelector<HTMLElement>("[data-story-handoff-veil]");

          const handoffTargets = uniqueElements(
            heroPrimary,
            heroSecondary,
            processHeading,
            processCards,
            [veil],
          );

          if (!handoffTargets.length) return;

          gsap.set(handoffTargets, {
            force3D: true,
            transformOrigin: "50% 52%",
            willChange: "transform, opacity",
          });

          if (veil) {
            gsap.set(veil, {
              autoAlpha: 0,
              scaleY: 0.94,
              y: 76,
            });
          }

          const handoffTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: processPanel,
              start: "top 74%",
              end: "top 28%",
              scrub: 0.44,
              invalidateOnRefresh: true,
            },
            defaults: { ease: "none", overwrite: "auto" },
          });

          if (veil) {
            handoffTimeline
              .to(
                veil,
                {
                  autoAlpha: 0.14,
                  scaleY: 1,
                  y: 0,
                  duration: 0.4,
                  ease: "sine.out",
                },
                0,
              )
              .to(
                veil,
                {
                  autoAlpha: 0.03,
                  scaleY: 0.96,
                  y: -68,
                  duration: 0.68,
                  ease: "sine.inOut",
                },
                0.4,
              );
          }

          if (heroPrimary.length) {
            handoffTimeline.to(
              heroPrimary,
              {
                autoAlpha: 0.1,
                scale: 0.98,
                y: -224,
                duration: 0.82,
                ease: "sine.inOut",
              },
              0,
            );
          }

          if (heroSecondary.length) {
            handoffTimeline.to(
              heroSecondary,
              {
                autoAlpha: 0.14,
                scale: 0.972,
                y: -302,
                duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.reveal,
                ease: "sine.inOut",
              },
              0,
            );
          }

          if (processHeading.length) {
            processHeading.forEach((part, itemIndex) => {
              handoffTimeline.fromTo(
                part,
                {
                  autoAlpha: 0.08,
                  scale: 0.986,
                  y: 92 + itemIndex * 24,
                },
                {
                  autoAlpha: 1,
                  scale: 1,
                  y: 0,
                  duration: 0.48,
                  ease: "power2.out",
                },
                0.16 + itemIndex * 0.055,
              );
            });
          }

          if (processCards.length) {
            processCards.forEach((card, itemIndex) => {
              handoffTimeline.fromTo(
                card,
                {
                  autoAlpha: itemIndex === 0 ? 0.28 : 0.08,
                  scale: 0.974,
                  x: (itemIndex - (processCards.length - 1) / 2) * 34,
                  y: 174 + itemIndex * 76,
                },
                {
                  autoAlpha: 1,
                  scale: 1,
                  x: 0,
                  y: 0,
                  duration: 0.56,
                  ease: "power2.out",
                },
                0.34 + itemIndex * 0.135,
              );
            });
          }
        };

        const setupProcessVideoHandoff = () => {
          const videoPanel = root.querySelector<HTMLElement>(
            '[data-story-panel="video"]',
          );
          if (!videoPanel) return;

          const videoGridItem = videoPanel.querySelector<HTMLElement>(
            "[data-video-grid-item]",
          );
          const videoPayload = videoPanel.querySelector<HTMLElement>(
            "[data-video-grid-payload]",
          );
          const videoFrame = videoPanel.querySelector<HTMLElement>("[data-video-frame]");
          const videoTargets = uniqueElements([videoGridItem], [
            videoPayload,
            videoFrame,
          ]);

          if (!videoTargets.length) return;

          const videoSceneTarget = videoPayload ?? videoFrame;

          gsap.set(videoPanel, {
            autoAlpha: 1,
            pointerEvents: "none",
          });
          if (videoGridItem) {
            gsap.set(videoGridItem, {
              force3D: true,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (videoSceneTarget) {
            gsap.set(videoSceneTarget, {
              autoAlpha: 0,
              y: 56,
              scale: 0.992,
              force3D: true,
              transformOrigin: "50% 50%",
              willChange: "transform, opacity",
            });
          }

          const videoSceneGate = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.36,
              invalidateOnRefresh: true,
            },
            defaults: { ease: "none", overwrite: "auto" },
          });

          if (videoSceneTarget) {
            videoSceneGate.to(
              videoSceneTarget,
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.18,
                ease: "power2.out",
              },
              0.335,
            );
          }

          videoSceneGate.set(
            videoPanel,
            {
              pointerEvents: "auto",
            },
            0.39,
          );
        };

        storyPanels.forEach((panel, index) => {
          const panelId = panel.dataset.storyPanel as StoryPanelId | undefined;
          const groups = getPanelMotionGroups(panel);
          const motion = getStoryMotionProfile(panel);
          const useHeroProcessEnter = panelId === "process";
          const useHeroProcessExit = panelId === "hero";
          const useProcessVideoEnter = panelId === "video";
          const useProcessVideoExit = panelId === "process";
          const useVideoExit = panelId === "video";
          const allTargets = uniqueElements(
            groups.primary,
            groups.secondary,
            groups.cards,
          );

          if (!allTargets.length) return;

          gsap.set(allTargets, {
            force3D: true,
            transformOrigin: "50% 50%",
            willChange: "transform, opacity",
          });

          if (index > 0 && !useHeroProcessEnter && !useProcessVideoEnter) {
            const enterTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: panel,
                start: motion.enterStart,
                end: motion.enterEnd,
                scrub: motion.scrub,
              },
              defaults: { ease: "sine.out", overwrite: "auto" },
            });

            if (groups.primary.length) {
              enterTimeline.fromTo(
                groups.primary,
                { autoAlpha: motion.enterOpacity, y: motion.primaryFromY, scale: 0.982 },
                {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 1,
                  stagger: groups.primary.length > 1 ? 0.055 : 0,
                },
                0,
              );
            }

            if (groups.secondary.length) {
              enterTimeline.fromTo(
                groups.secondary,
                { autoAlpha: motion.enterOpacity, y: motion.secondaryFromY, scale: 0.982 },
                {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 1,
                  stagger: groups.secondary.length > 1 ? 0.075 : 0,
                },
                0.04,
              );
            }

            if (groups.cards.length) {
              enterTimeline.fromTo(
                groups.cards,
                {
                  autoAlpha: 0.38,
                  x: (itemIndex) => (itemIndex - (groups.cards.length - 1) / 2) * 28,
                  y: (itemIndex) => motion.cardFromY + itemIndex * 30,
                  scale: 0.972,
                },
                {
                  autoAlpha: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.reveal,
                  stagger: motion.cardStagger,
                },
                0.08,
              );
            }
          }

          if (useHeroProcessExit || useProcessVideoExit || useVideoExit) return;

          const exitTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: panel,
              start: motion.exitStart,
              end: motion.exitEnd,
              scrub: motion.scrub,
            },
            defaults: { ease: "sine.inOut", overwrite: "auto" },
          });

          if (groups.primary.length) {
            exitTimeline.to(
              groups.primary,
              {
                autoAlpha: motion.exitOpacity,
                y: motion.exitPrimaryY,
                scale: 0.986,
                duration: 1,
              },
              0,
            );
          }

          if (groups.secondary.length) {
            exitTimeline.to(
              groups.secondary,
              {
                autoAlpha: motion.exitOpacity,
                y: motion.exitSecondaryY,
                scale: 0.985,
                duration: 1,
              },
              0,
            );
          }

          if (groups.cards.length) {
            exitTimeline.to(
              groups.cards,
              {
                autoAlpha: motion.exitOpacity,
                y: (itemIndex) => motion.exitCardY - itemIndex * 18,
                scale: 0.985,
                duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.reveal,
                stagger: 0.025,
              },
              0,
            );
          }
        });

        if (!root.querySelector("[data-cinematic-hero-process]")) {
          setupHeroProcessHandoff();
        }
        setupProcessVideoHandoff();

        const firstStepCta = root.querySelector<HTMLElement>(
          "[data-story-first-step-cta]",
        );
        if (firstStepCta) {
          gsap.fromTo(
            firstStepCta,
            { scale: 0.985 },
            {
              scale: 1.018,
              repeat: 1,
              yoyo: true,
              duration: 0.28,
              ease: "sine.inOut",
              scrollTrigger: {
                trigger: firstStepCta,
                start: "top 72%",
                once: true,
              },
            },
          );
        }
      }, root);

      cleanupMotion = () => {
        ctx.revert();
        ScrollTrigger.refresh();
      };
      ScrollTrigger.refresh();
    };

    const cancelIdle = requestIdle(initMotion);

    return () => {
      killed = true;
      cancelIdle();
      cleanupMotion?.();
      observer.disconnect();
      window.removeEventListener("scroll", readActiveFromViewport);
      window.removeEventListener("resize", readActiveFromViewport);
      if (window.__storyFlow === storyApi) {
        delete window.__storyFlow;
      }
      delete root.dataset.storyReady;
      delete root.dataset.storyActiveSection;
      delete root.dataset.storyActivePanel;
      storyPanels.forEach((panel) => delete panel.dataset.storyActive);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={s.storyRoot}
      data-story-root
      data-surface-tone="dark"
    >
      <div aria-hidden="true" className={s.storyBackdrop} data-story-backdrop>
        <CinematicGridPan
          className={s.cinematicGridPan}
          rootSelector="[data-story-root]"
          segments={cinematicGridPanSegments}
        />
      </div>
      <div className={s.storyStage} data-story-stage>
        {React.Children.map(children, (child, index) => {
          const panelId = React.isValidElement<{ id?: string }>(child)
            ? child.props.id
            : undefined;

          return (
            <div
              className={s.storyPanel}
              data-story-panel={panelId ?? `panel-${index}`}
              key={panelId ?? index}
            >
              {child}
            </div>
          );
        })}
        <div
          aria-hidden="true"
          className={s.storyHandoffVeil}
          data-story-handoff-veil
        />
      </div>
      <CinematicDebugMeter />
    </div>
  );
}
