"use client";

import gsap from "gsap";
import { preload } from "react-dom";
import { useId, useLayoutEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import LogoMark, {
  LOGO_MARK_PATH,
  LOGO_MARK_VIEWBOX,
} from "../../svgr/LogoMark";
import {
  HERO_EFFECTS_MODE_ATTRIBUTE,
  HERO_EFFECTS_PREWARM_EVENT,
  HERO_EFFECTS_READY_ATTRIBUTE,
} from "./HeroEffectsLifecycle.client";
import {
  HOMEPAGE_HERO_REVEAL_STARTED_ATTRIBUTE,
  HOMEPAGE_HERO_REVEAL_START_EVENT,
  HOMEPAGE_HERO_SILK_POSTER_SRC,
  HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
  HOMEPAGE_INTRO_TIMING,
  HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE,
} from "./HomepageIntro.constants";
import s from "./HomepageIntro.module.css";

// One geometric route reveals the exact original filled mark. It completes
// the P before continuing into the D; the guide itself is never visible.
const LOGO_REVEAL_GUIDE =
  "M 65 135.15 C 101.5 135.15 122.08 116.4 122.08 93.15 C 122.08 69.9 102.4 51.43 78 51.43 L 53.35 51.43 L 53.35 174.5 L 11.69 174.5 L 11.69 11.52 L 78 11.52 C 125.3 11.52 163.65 48 163.65 93.15 C 163.65 138.3 125.3 174.95 78 174.95";

const LOGO_GEOMETRY = {
  height: 186.3,
  width: 175.60001,
} as const;

// Keep the aperture's horizontal axis on the mark's geometric center while
// anchoring it inside the solid upper cross-stroke. The exact path can then
// grow into a full-viewport aperture without the previous left-edge bias; no
// circle or surrogate reveal shape is involved.
const LOGO_APERTURE_ORIGIN = {
  safeRadius: 9,
  x: LOGO_GEOMETRY.width / 2,
  y: 52,
} as const;

const INTRO_LOGO_APERTURE = {
  borderFadeDuration: 0.28,
  borderFadeStart: 0.78,
  borderRevealDuration: 0.18,
  borderRevealStart: 0.05,
  cutoutDuration: 0.2,
  scaleDelay: 0.07,
  scaleDuration: 1.05,
} as const;

const INTRO_LOGO_APERTURE_END = Math.max(
  INTRO_LOGO_APERTURE.cutoutDuration,
  INTRO_LOGO_APERTURE.borderRevealStart
    + INTRO_LOGO_APERTURE.borderRevealDuration,
  INTRO_LOGO_APERTURE.scaleDelay + INTRO_LOGO_APERTURE.scaleDuration,
  INTRO_LOGO_APERTURE.borderFadeStart
    + INTRO_LOGO_APERTURE.borderFadeDuration,
);
const INTRO_EXIT_SAFETY_PADDING = 0.6;

const INTRO_LOGO_ACTIVATION = {
  ambientPeakDuration: 0.86,
  drawDuration: 1.55,
  drawEase: "sine.inOut",
  headDashLength: 0.064,
  headFadeDuration: 0.2,
  headFadeStart: 1.31,
  settleDelay: 0.024,
  settleDuration: 0.22,
} as const;

const INTRO_LOGO_SPARKS = {
  burstProgress: [
    0.04,
    0.115,
    0.19,
    0.265,
    0.34,
    0.415,
    0.49,
    0.565,
    0.64,
    0.715,
    0.79,
    0.865,
    0.94,
  ],
  particleBanks: 6,
  particlesPerBurst: 10,
} as const;

const SPARK_PARTICLES = [
  { angle: -70, distance: 34, duration: 0.37, length: 9 },
  { angle: -54, distance: 48, duration: 0.45, length: 12 },
  { angle: -38, distance: 62, duration: 0.52, length: 15 },
  { angle: -22, distance: 72, duration: 0.56, length: 10 },
  { angle: -8, distance: 52, duration: 0.47, length: 16 },
  { angle: 8, distance: 68, duration: 0.54, length: 8 },
  { angle: 23, distance: 57, duration: 0.49, length: 13 },
  { angle: 39, distance: 46, duration: 0.43, length: 11 },
  { angle: 55, distance: 36, duration: 0.38, length: 8 },
  { angle: 70, distance: 29, duration: 0.35, length: 6 },
] as const;

const SPARK_PARTICLE_COUNT =
  INTRO_LOGO_SPARKS.particleBanks
  * INTRO_LOGO_SPARKS.particlesPerBurst;

type GuidePoint = {
  angle: number;
  x: number;
  y: number;
};

function svgParticleTransform(
  x: number, y: number, rotation: number, scaleX: number,
  originX: number, originY: number,
) {
  const radians = rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // Match GSAP's bbox-relative transformOrigin="0 0". These fixed SVG
  // shapes have known bounds, so no hidden getBBox/temporary SVG is needed.
  const a = cos * scaleX;
  const b = sin * scaleX;
  const c = -sin;
  const d = cos;
  return `matrix(${a} ${b} ${c} ${d} ${x + originX - originX * a - originY * c} ${y + originY - originX * b - originY * d})`;
}

const delay = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

function waitForPaint(signal: AbortSignal, frames = 1) {
  return new Promise<void>((resolve) => {
    let frame = 0;
    let remaining = frames;
    const settle = () => {
      if (frame) window.cancelAnimationFrame(frame);
      signal.removeEventListener("abort", settle);
      resolve();
    };
    const advance = () => {
      frame = 0;
      if (signal.aborted) {
        settle();
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        settle();
        return;
      }
      frame = window.requestAnimationFrame(advance);
    };

    signal.addEventListener("abort", settle, { once: true });
    frame = window.requestAnimationFrame(advance);
  });
}

type HeroVisualMode = "static" | "webgl";

function readHeroVisualMode(hero: HTMLElement | null): HeroVisualMode | null {
  const committedMode = document.documentElement.getAttribute(
    HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE,
  );
  if (committedMode === "static" || committedMode === "webgl") {
    return committedMode;
  }
  if (!hero) return "static";
  if (
    hero.getAttribute(HERO_EFFECTS_READY_ATTRIBUTE) === "true"
    && hero.getAttribute(HERO_EFFECTS_MODE_ATTRIBUTE) === "webgl"
    && hero.getAttribute("data-hero-silk-ready") === "true"
  ) {
    return "webgl";
  }
  if (
    hero.getAttribute(HERO_EFFECTS_READY_ATTRIBUTE) === "true"
    && hero.getAttribute(HERO_EFFECTS_MODE_ATTRIBUTE) === "static"
  ) {
    return "static";
  }
  return null;
}

function waitForHeroPosterReadiness(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const poster = new Image();
    let settled = false;

    const cleanup = () => {
      poster.onload = null;
      poster.onerror = null;
      signal.removeEventListener("abort", finish);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const decode = () => {
      if (settled) return;
      if (typeof poster.decode !== "function") {
        finish();
        return;
      }
      void poster.decode().catch(() => undefined).then(finish);
    };

    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) {
      finish();
      return;
    }

    poster.decoding = "async";
    poster.fetchPriority = "high";
    poster.onload = decode;
    poster.onerror = finish;
    poster.src = HOMEPAGE_HERO_SILK_POSTER_SRC;

    if (poster.complete) decode();
  });
}

type HomepageIntroWindow = Window & {
  __pokornyHomeIntroBootstrap?: (intro: Element) => boolean;
  __pokornyHomeIntroBootstrapCleanup?: () => void;
  __pokornyHomeIntroBootstrapSkip?: (event: KeyboardEvent) => void;
  __pokornyHomeIntroFallbackCompleteTimer?: number;
  __pokornyHomeIntroFallbackTimer?: number;
  __pokornyHomeIntroOverlayStartedAt?: number;
  __pokornyHomeIntroStartedAt?: number;
};

export default function HomepageIntroMotion() {
  preload(HOMEPAGE_HERO_SILK_POSTER_SRC, {
    as: "image",
    fetchPriority: "high",
    type: "image/avif",
  });

  const instanceId = useId().replaceAll(":", "");
  const logoMaskId = `home-intro-logo-mask-${instanceId}`;
  const logoEnergyMaskId = `home-intro-logo-energy-mask-${instanceId}`;
  const apertureMaskId = `home-intro-aperture-mask-${instanceId}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const markStageRef = useRef<HTMLDivElement | null>(null);
  const logoGuideRef = useRef<SVGPathElement | null>(null);
  const logoHeadGuideRef = useRef<SVGPathElement | null>(null);
  const logoHeadRef = useRef<SVGPathElement | null>(null);
  const logoAfterglowRef = useRef<SVGPathElement | null>(null);
  const cuttingHeadRef = useRef<SVGGElement | null>(null);
  const sparkRefs = useRef<Array<SVGGElement | null>>([]);
  const ambientRef = useRef<HTMLSpanElement | null>(null);
  const aperturePositionRef = useRef<SVGGElement | null>(null);
  const apertureScaleRef = useRef<SVGGElement | null>(null);
  const apertureBorderPositionRef = useRef<SVGGElement | null>(null);
  const apertureBorderScaleRef = useRef<SVGGElement | null>(null);
  const veilRef = useRef<SVGSVGElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const markStage = markStageRef.current;
    const logoMark = markStage?.querySelector<SVGSVGElement>(
      "[data-home-intro-mark]",
    );
    const logoGhost = markStage?.querySelector<SVGSVGElement>(
      "[data-home-intro-mark-ghost]",
    );
    const logoGuide = logoGuideRef.current;
    const logoHeadGuide = logoHeadGuideRef.current;
    const logoHead = logoHeadRef.current;
    const logoAfterglow = logoAfterglowRef.current;
    const cuttingHead = cuttingHeadRef.current;
    const sparks = sparkRefs.current.filter(
      (spark): spark is SVGGElement => spark !== null,
    );
    const ambient = ambientRef.current;
    const aperturePosition = aperturePositionRef.current;
    const apertureScale = apertureScaleRef.current;
    const apertureBorderPosition = apertureBorderPositionRef.current;
    const apertureBorderScale = apertureBorderScaleRef.current;
    const veil = veilRef.current;
    if (
      !root ||
      !markStage ||
      !logoMark ||
      !logoGhost ||
      !logoGuide ||
      !logoHeadGuide ||
      !logoHead ||
      !logoAfterglow ||
      !cuttingHead ||
      sparks.length !== SPARK_PARTICLE_COUNT ||
      !ambient ||
      !aperturePosition ||
      !apertureScale ||
      !apertureBorderPosition ||
      !apertureBorderScale ||
      !veil
    ) {
      return undefined;
    }

    let cancelled = false;
    let completed = false;
    let exiting = false;
    let runtimeTimedOut = false;
    let activationTimeline: gsap.core.Timeline | null = null;
    let exitTimeline: gsap.core.Timeline | null = null;
    let absoluteSafetyTimer = 0;
    let exitSafetyTimer = 0;
    let fallbackFinishTimer = 0;
    let postIntroFocusTimer = 0;
    let postIntroFocusObserver: MutationObserver | null = null;
    let context: gsap.Context | null = null;
    const entranceController = new AbortController();
    const backgroundInertState = new Map<HTMLElement, boolean>();
    const introWindow = window as HomepageIntroWindow;
    const bootstrapped = introWindow.__pokornyHomeIntroBootstrap?.(root);
    if (!bootstrapped) {
      const startedAt = window.performance.now();
      introWindow.__pokornyHomeIntroStartedAt = startedAt;
      introWindow.__pokornyHomeIntroOverlayStartedAt = startedAt;
      document.documentElement.dataset.homeIntroState = "pending";
      document.documentElement.removeAttribute(
        HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
      );
      document.documentElement.removeAttribute(
        HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE,
      );
    }
    const bootstrapState = document.documentElement.dataset.homeIntroState;
    const reduceMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    ).matches;
    const hero = document.querySelector<HTMLElement>("[data-cinematic-home-hero]");
    const animationStartedAt =
      introWindow.__pokornyHomeIntroOverlayStartedAt ??
      introWindow.__pokornyHomeIntroStartedAt ??
      window.performance.now();
    const fallbackStartedAt =
      introWindow.__pokornyHomeIntroOverlayStartedAt ?? animationStartedAt;
    const now = window.performance.now();
    const elapsedAtHydration = Math.max(0, now - animationStartedAt);
    const fallbackElapsedAtHydration = Math.max(0, now - fallbackStartedAt);
    const cssFallbackStart = reduceMotion
      ? HOMEPAGE_INTRO_TIMING.reducedMotionReadinessLimit
      : HOMEPAGE_INTRO_TIMING.fallbackExitStart;
    const cssFallbackDuration = reduceMotion
      ? HOMEPAGE_INTRO_TIMING.reducedMotionExitDuration
      : HOMEPAGE_INTRO_TIMING.fallbackExitDuration;
    const fallbackAlreadyComplete =
      bootstrapState === "fallback-complete" ||
      fallbackElapsedAtHydration >= cssFallbackStart + cssFallbackDuration;
    const fallbackExitInProgress =
      !fallbackAlreadyComplete &&
      (bootstrapState === "fallback-exit" ||
        fallbackElapsedAtHydration >= cssFallbackStart);

    if (!fallbackExitInProgress && !fallbackAlreadyComplete) {
      window.clearTimeout(introWindow.__pokornyHomeIntroFallbackTimer);
      window.clearTimeout(introWindow.__pokornyHomeIntroFallbackCompleteTimer);
      window.clearTimeout(exitSafetyTimer);
    }

    const makeBackgroundInert = (element: HTMLElement) => {
      if (
        element === root ||
        element.contains(root) ||
        ["LINK", "NOSCRIPT", "SCRIPT", "STYLE"].includes(element.tagName) ||
        backgroundInertState.has(element)
      ) {
        return;
      }
      backgroundInertState.set(element, element.inert);
      element.inert = true;
    };
    Array.from(document.body.children).forEach((element) => {
      if (element instanceof HTMLElement) makeBackgroundInert(element);
    });
    const backgroundObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) makeBackgroundInert(node);
        });
      });
    });
    backgroundObserver.observe(document.body, { childList: true });

    const restoreBackgroundInteraction = () => {
      backgroundObserver.disconnect();
      backgroundInertState.forEach((wasInert, element) => {
        if (!wasInert && element.isConnected) element.inert = false;
      });
      backgroundInertState.clear();
    };

    const clearHeroIntroState = () => {
      hero?.removeAttribute("data-home-intro-active");
      hero?.removeAttribute("data-hero-handoff-frozen");
      hero?.removeAttribute(HOMEPAGE_HERO_REVEAL_STARTED_ATTRIBUTE);
      // The veil is already display:none here. CSSPlugin's clearProps for
      // transforms reparses every SVG, including a temporary visible clone
      // when getBBox cannot measure a hidden spark. These are owned styles;
      // remove them directly and invalidate the cache for a later replay.
      const animatedElements = [
        logoMark,
        logoGhost,
        logoHead,
        logoAfterglow,
        cuttingHead,
        ...sparks,
        ambient,
        markStage,
        aperturePosition,
        apertureScale,
        apertureBorderPosition,
        apertureBorderScale,
        veil,
      ];
      for (const element of animatedElements) {
        for (const property of [
          "animation", "opacity", "transform", "visibility", "will-change",
          "translate", "rotate", "scale",
        ]) {
          element.style.removeProperty(property);
        }
        if (element._gsap) element._gsap.uncache = 1;
      }
      logoGuide.setAttribute("stroke-dashoffset", "1");
      logoHeadGuide.setAttribute("stroke-dashoffset", "0");
      cuttingHead.removeAttribute("transform");
      for (const spark of sparks) spark.removeAttribute("transform");
      aperturePosition.removeAttribute("transform");
      apertureScale.removeAttribute("transform");
      apertureBorderPosition.removeAttribute("transform");
      apertureBorderScale.removeAttribute("transform");
    };

    const announceComplete = (skipped: boolean) => {
      window.dispatchEvent(
        new CustomEvent("home:intro-complete", {
          detail: {
            skipped,
            fallback: !skipped && (fallbackAlreadyComplete || fallbackExitInProgress || runtimeTimedOut),
          },
        }),
      );
    };

    const hide = (skipped: boolean) => {
      if (completed) return;
      completed = true;
      if (skipped) {
        document.documentElement.setAttribute(
          HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
          "true",
        );
      }
      const activeElement = document.activeElement;
      const introHadFocus = skipped && (
        root.contains(activeElement)
        || activeElement === document.body
        || activeElement === document.documentElement
      );
      document.documentElement.dataset.homeIntroState = "complete";
      root.dataset.homeIntroPhase = "complete";
      window.clearTimeout(absoluteSafetyTimer);
      window.clearTimeout(exitSafetyTimer);
      window.clearTimeout(fallbackFinishTimer);
      window.clearTimeout(introWindow.__pokornyHomeIntroFallbackTimer);
      window.clearTimeout(introWindow.__pokornyHomeIntroFallbackCompleteTimer);
      introWindow.__pokornyHomeIntroBootstrapCleanup?.();
      entranceController.abort();
      activationTimeline?.kill();
      activationTimeline = null;

      // Hide the outgoing layer before restoring the incoming scene's normal
      // stacking so there can be no one-frame green flash at handoff.
      root.style.opacity = "0";
      root.style.visibility = "hidden";
      root.style.display = "none";
      root.style.pointerEvents = "none";
      clearHeroIntroState();
      restoreBackgroundInteraction();
      if (introHadFocus) {
        window.requestAnimationFrame(() => {
          const focusTarget = document.getElementById("home-hero-title")
            ?? document.querySelector<HTMLElement>("main");
          if (!focusTarget) return;
          const focusIfUnclaimed = (target: HTMLElement) => {
            const activeElement = document.activeElement;
            if (
              activeElement
              && activeElement !== document.body
              && activeElement !== root
              && activeElement !== focusTarget
              && activeElement !== target
            ) {
              return;
            }
            if (activeElement === target) return;
            const hadTabIndex = target.hasAttribute("tabindex");
            if (!hadTabIndex) target.tabIndex = -1;
            target.focus({ preventScroll: true });
            if (!hadTabIndex) {
              target.addEventListener("blur", () => {
                target.removeAttribute("tabindex");
              }, { once: true });
            }
          };
          const heroMotionIsReady = () => document.querySelector<HTMLElement>(
            '[data-hero-profile-handoff][data-state="ready"]',
          );
          const settleFocus = (stableFallback = false) => {
            postIntroFocusObserver?.disconnect();
            postIntroFocusObserver = null;
            if (postIntroFocusTimer) {
              window.clearTimeout(postIntroFocusTimer);
              postIntroFocusTimer = 0;
            }
            const stableTarget = stableFallback && !heroMotionIsReady()
              ? document.querySelector<HTMLElement>("main") ?? focusTarget
              : focusTarget;
            focusIfUnclaimed(stableTarget);
          };

          // The deferred hero ScrollTrigger mounts immediately after the intro
          // and briefly reparents the focused heading into its pin spacer.
          // Focus once now, then restore it after that owned DOM move only when
          // the visitor has not intentionally focused something else.
          focusIfUnclaimed(focusTarget);
          if (heroMotionIsReady()) return;
          postIntroFocusObserver = new MutationObserver(() => {
            if (heroMotionIsReady()) settleFocus();
          });
          postIntroFocusObserver.observe(document.body, {
            attributeFilter: ["data-state"],
            attributes: true,
            childList: true,
            subtree: true,
          });
          postIntroFocusTimer = window.setTimeout(
            () => settleFocus(true),
            1_500,
          );
        });
      }
      announceComplete(skipped);
    };

    const finish = (immediate = false, skipped = immediate) => {
      if (completed || cancelled) return;

      if (immediate) {
        exiting = true;
        activationTimeline?.kill();
        activationTimeline = null;
        exitTimeline?.kill();
        hide(skipped);
        return;
      }
      if (exiting) return;
      exiting = true;
      window.clearTimeout(absoluteSafetyTimer);
      window.clearTimeout(introWindow.__pokornyHomeIntroFallbackTimer);
      window.clearTimeout(introWindow.__pokornyHomeIntroFallbackCompleteTimer);

      if (reduceMotion) {
        root.dataset.homeIntroPhase = "reduced-exit";
        gsap.set(root, { pointerEvents: "none" });
        exitTimeline = gsap.timeline({ onComplete: () => hide(false) }).to(
          root,
          {
            autoAlpha: 0,
            duration: HOMEPAGE_INTRO_TIMING.reducedMotionExitDuration / 1_000,
            ease: "none",
          },
        );
        return;
      }

      root.dataset.homeIntroPhase = "logo-cutout";
      gsap.set(root, { pointerEvents: "none" });

      if (!hero) {
        exitTimeline = gsap.timeline({ onComplete: () => hide(false) }).to(
          root,
          { autoAlpha: 0, duration: 0.28, ease: "power2.out" },
        );
        return;
      }

      const viewportBounds = root.getBoundingClientRect();
      const markBounds = markStage.getBoundingClientRect();
      const baseScale = markBounds.width / LOGO_GEOMETRY.width;
      const apertureAnchor = {
        x: markBounds.left + LOGO_APERTURE_ORIGIN.x * baseScale,
        y: markBounds.top + LOGO_APERTURE_ORIGIN.y * baseScale,
      };
      const farthestCornerDistance = Math.max(
        Math.hypot(apertureAnchor.x, apertureAnchor.y),
        Math.hypot(
          viewportBounds.width - apertureAnchor.x,
          apertureAnchor.y,
        ),
        Math.hypot(
          apertureAnchor.x,
          viewportBounds.height - apertureAnchor.y,
        ),
        Math.hypot(
          viewportBounds.width - apertureAnchor.x,
          viewportBounds.height - apertureAnchor.y,
        ),
      );
      const coverScale = (
        farthestCornerDistance / LOGO_APERTURE_ORIGIN.safeRadius
      ) * 1.08;

      gsap.set(veil, { animation: "none" });
      gsap.set(aperturePosition, {
        attr: {
          transform: `translate(${apertureAnchor.x} ${apertureAnchor.y})`,
        },
      });
      gsap.set(apertureBorderPosition, {
        attr: {
          transform: `translate(${apertureAnchor.x} ${apertureAnchor.y})`,
        },
      });
      gsap.set(apertureScale, {
        attr: { transform: `scale(${baseScale})` },
        opacity: 1,
      });
      gsap.set(apertureBorderScale, {
        attr: { transform: `scale(${baseScale})` },
        opacity: 0,
        willChange: "opacity",
      });
      gsap.set(logoMark, { opacity: 1, willChange: "opacity" });
      gsap.set(logoGhost, { willChange: "opacity" });
      // The same entrance now runs through the opening aperture instead of
      // waiting behind an already empty veil for a second sequential reveal.
      hero.setAttribute(HOMEPAGE_HERO_REVEAL_STARTED_ATTRIBUTE, "true");
      window.dispatchEvent(new CustomEvent(HOMEPAGE_HERO_REVEAL_START_EVENT, {
        detail: { hero },
      }));
      const completeAfterFinalRevealPaint = () => {
        void Promise.race([
          waitForPaint(entranceController.signal, 2),
          delay(180),
        ]).then(() => {
          if (!cancelled) hide(false);
        });
      };
      // The watchdog must follow the authored timeline. A fixed one-second
      // cutoff used to be able to hide a deliberately slower reveal before
      // its final composited frame had landed, which presented as a hitch.
      exitSafetyTimer = window.setTimeout(
        () => hide(false),
        (INTRO_LOGO_APERTURE_END + INTRO_EXIT_SAFETY_PADDING) * 1_000,
      );

      exitTimeline = gsap
        .timeline({
          defaults: { overwrite: "auto" },
          onComplete: completeAfterFinalRevealPaint,
        })
        .to(
          [logoMark, logoGhost, ambient],
          {
            opacity: 0,
            duration: INTRO_LOGO_APERTURE.cutoutDuration,
            ease: "sine.inOut",
          },
          0,
        )
        .to(
          apertureBorderScale,
          {
            opacity: 0.78,
            duration: INTRO_LOGO_APERTURE.borderRevealDuration,
            ease: "power1.out",
          },
          INTRO_LOGO_APERTURE.borderRevealStart,
        )
        .call(() => {
          root.dataset.homeIntroPhase = "hero-reveal";
        }, [], INTRO_LOGO_APERTURE.cutoutDuration * 0.72)
        .to(
          [apertureScale, apertureBorderScale],
          {
            attr: { transform: `scale(${coverScale})` },
            duration: INTRO_LOGO_APERTURE.scaleDuration,
            ease: "power2.inOut",
          },
          INTRO_LOGO_APERTURE.scaleDelay,
        )
        .to(
          apertureBorderScale,
          {
            opacity: 0,
            duration: INTRO_LOGO_APERTURE.borderFadeDuration,
            ease: "power2.in",
          },
          INTRO_LOGO_APERTURE.borderFadeStart,
        );
    };

    const playLogoActivation = () => new Promise<void>((resolve) => {
      if (cancelled || completed || entranceController.signal.aborted) {
        resolve();
        return;
      }

      let hasSettled = false;
      const settle = () => {
        if (hasSettled) return;
        hasSettled = true;
        entranceController.signal.removeEventListener("abort", handleAbort);
        activationTimeline = null;
        resolve();
      };
      const handleAbort = () => {
        activationTimeline?.kill();
        activationTimeline = null;
        settle();
      };
      const settleStart =
        INTRO_LOGO_ACTIVATION.drawDuration
        + INTRO_LOGO_ACTIVATION.settleDelay;
      const headTravel = -(1 - INTRO_LOGO_ACTIVATION.headDashLength);
      const drawEase = gsap.parseEase(INTRO_LOGO_ACTIVATION.drawEase);
      const guideLength = logoHeadGuide.getTotalLength();
      const guideSampleCount = 144;
      const guideSamples = Array.from(
        { length: guideSampleCount + 1 },
        (_, index) => logoHeadGuide.getPointAtLength(
          guideLength * (index / guideSampleCount),
        ),
      );
      const readGuidePoint = (progress: number): GuidePoint => {
        const samplePosition = Math.min(
          guideSampleCount - Number.EPSILON,
          Math.max(0, progress) * guideSampleCount,
        );
        const sampleIndex = Math.floor(samplePosition);
        const interpolation = samplePosition - sampleIndex;
        const current = guideSamples[sampleIndex];
        const next = guideSamples[Math.min(sampleIndex + 1, guideSampleCount)];
        const tangentStart = guideSamples[Math.max(0, sampleIndex - 1)];
        const tangentEnd = guideSamples[
          Math.min(guideSampleCount, sampleIndex + 2)
        ];

        return {
          angle: Math.atan2(
            tangentEnd.y - tangentStart.y,
            tangentEnd.x - tangentStart.x,
          ) * (180 / Math.PI),
          x: current.x + (next.x - current.x) * interpolation,
          y: current.y + (next.y - current.y) * interpolation,
        };
      };
      const cuttingProgress = { value: 0 };
      const positionCuttingHead = () => {
        const point = readGuidePoint(cuttingProgress.value);
        // This SVG group is owned only by the cutting head. Writing its exact
        // matrix avoids allocating a GSAP set tween on every animation frame.
        cuttingHead.setAttribute("transform", svgParticleTransform(
          point.x, point.y, point.angle, 1, -9.5, -9.5,
        ));
      };
      const sparkStates = sparks.map(() => ({
        opacity: 0, rotation: 0, scaleX: 1, x: 0, y: 0,
      }));
      const renderedSparkStates = sparks.map((_, index) => {
        const particle = SPARK_PARTICLES[index % INTRO_LOGO_SPARKS.particlesPerBurst];
        return {
          opacity: -1,
          originX: -particle.length,
          originY: -(particle.length > 12 ? 1.55 : particle.length > 8 ? 1.25 : 1),
          rotation: Number.NaN,
          scaleX: Number.NaN,
          x: Number.NaN,
          y: Number.NaN,
        };
      });
      const renderSparks = () => {
        for (let index = 0; index < sparks.length; index += 1) {
          const spark = sparks[index];
          const state = sparkStates[index];
          const rendered = renderedSparkStates[index];
          // GSAP keeps advancing the numeric model for every recycled bank.
          // An invisible particle needs no matrix/trigonometry or DOM write;
          // apply its latest pose before making it visible on the next burst.
          if (state.opacity > 0 && (
            rendered.x !== state.x
            || rendered.y !== state.y
            || rendered.rotation !== state.rotation
            || rendered.scaleX !== state.scaleX
          )) {
            spark.setAttribute("transform", svgParticleTransform(
              state.x, state.y, state.rotation, state.scaleX,
              rendered.originX, rendered.originY,
            ));
            rendered.x = state.x;
            rendered.y = state.y;
            rendered.rotation = state.rotation;
            rendered.scaleX = state.scaleX;
          }
          if (rendered.opacity !== state.opacity) {
            spark.style.opacity = String(state.opacity);
            rendered.opacity = state.opacity;
          }
        }
      };

      const addSparkBurst = (
        timeline: gsap.core.Timeline,
        progress: number,
        burstIndex: number,
      ) => {
        const burstTime = progress * INTRO_LOGO_ACTIVATION.drawDuration;
        const point = readGuidePoint(drawEase(progress));
        const particleBank = burstIndex % INTRO_LOGO_SPARKS.particleBanks;
        const burstParticles = sparkStates.slice(
          particleBank * INTRO_LOGO_SPARKS.particlesPerBurst,
          (particleBank + 1) * INTRO_LOGO_SPARKS.particlesPerBurst,
        );

        burstParticles.forEach((spark, particleIndex) => {
          const particle = SPARK_PARTICLES[particleIndex];
          const particleDelay = particleIndex * 0.004;
          const burstBias = (burstIndex % 2 === 0 ? -1 : 1)
            * (particleIndex % 2 === 0 ? 4 : 2);
          const direction = point.angle + 180 + particle.angle + burstBias;
          const directionRadians = direction * (Math.PI / 180);
          const startX = point.x + Math.cos(directionRadians) * 1.9;
          const startY = point.y + Math.sin(directionRadians) * 1.9;
          const endX = point.x
            + Math.cos(directionRadians) * particle.distance;
          const endY = point.y
            + Math.sin(directionRadians) * particle.distance;
          const launchTime = burstTime + particleDelay;
          const fadeDuration = Math.max(0.15, particle.duration * 0.32);

          timeline
            .fromTo(
              spark,
              {
                opacity: 0,
                rotation: direction,
                scaleX: 0.2,
                x: startX,
                y: startY,
              },
              {
                duration: 0.035,
                ease: "power2.out",
                immediateRender: false,
                opacity: 1,
                scaleX: 1,
              },
              launchTime,
            )
            .to(
              spark,
              {
                duration: particle.duration,
                ease: "power2.out",
                scaleX: 0.54,
                x: endX,
                y: endY,
              },
              launchTime + 0.025,
            )
            .to(
              spark,
              {
                duration: fadeDuration,
                ease: "power2.in",
                opacity: 0,
              },
              launchTime + particle.duration * 0.68,
            );
        });
      };

      entranceController.signal.addEventListener("abort", handleAbort, {
        once: true,
      });
      root.setAttribute("data-home-intro-play", "true");
      root.dataset.homeIntroPhase = "draw-begin";

      const createTimeline = () => {
        activationTimeline = gsap
          .timeline({
            defaults: { overwrite: "auto" },
            onComplete: settle,
            // Numeric models keep CSSPlugin from measuring hidden SVG groups
            // (getBBox + detached-clone fallback) for every recycled burst.
            onUpdate: renderSparks,
          })
          .set(markStage, {
            force3D: true,
            scale: 0.985,
            transformOrigin: "50% 50%",
            willChange: "transform",
          }, 0)
          .set(logoGuide, { attr: { "stroke-dashoffset": 1 } }, 0)
          .set(logoHeadGuide, { attr: { "stroke-dashoffset": 0 } }, 0)
          .set([logoHead, logoAfterglow, cuttingHead, ...sparks], {
            opacity: 0,
          }, 0)
          .call(positionCuttingHead, [], 0)
          .to(
            logoGuide,
            {
              duration: INTRO_LOGO_ACTIVATION.drawDuration,
              ease: INTRO_LOGO_ACTIVATION.drawEase,
              attr: { "stroke-dashoffset": 0 },
            },
            0,
          )
          .to(
            cuttingProgress,
            {
              duration: INTRO_LOGO_ACTIVATION.drawDuration,
              ease: INTRO_LOGO_ACTIVATION.drawEase,
              onUpdate: positionCuttingHead,
              value: 1,
            },
            0,
          )
          .to(
            logoHeadGuide,
            {
              duration: INTRO_LOGO_ACTIVATION.drawDuration,
              ease: INTRO_LOGO_ACTIVATION.drawEase,
              attr: { "stroke-dashoffset": headTravel },
            },
            0,
          )
          .to(
            markStage,
            {
              duration: INTRO_LOGO_ACTIVATION.drawDuration,
              ease: INTRO_LOGO_ACTIVATION.drawEase,
              scale: 1,
            },
            0,
          )
          .to(
            ambient,
            {
              duration: INTRO_LOGO_ACTIVATION.ambientPeakDuration,
              ease: "power2.out",
              opacity: 1,
            },
            0,
          )
          .to(logoHead, {
            duration: 0.1,
            ease: "power2.out",
            opacity: 1,
          }, 0)
          .to(logoAfterglow, {
            duration: 0.18,
            ease: "power2.out",
            opacity: 0.32,
          }, 0)
          .to(cuttingHead, {
            duration: 0.1,
            ease: "power2.out",
            opacity: 1,
          }, 0)
          .call(() => {
            root.dataset.homeIntroPhase = "draw-active";
          }, [], 0.08)
          .to(
            logoHead,
            {
              duration: INTRO_LOGO_ACTIVATION.headFadeDuration,
              ease: "power2.out",
              opacity: 0,
            },
            INTRO_LOGO_ACTIVATION.headFadeStart,
          )
          .to(
            logoAfterglow,
            {
              duration: INTRO_LOGO_ACTIVATION.headFadeDuration + 0.02,
              ease: "power2.out",
              opacity: 0,
            },
            INTRO_LOGO_ACTIVATION.headFadeStart + 0.02,
          )
          .to(
            cuttingHead,
            {
              duration: INTRO_LOGO_ACTIVATION.headFadeDuration,
              ease: "power2.out",
              opacity: 0,
            },
            INTRO_LOGO_ACTIVATION.headFadeStart,
          )
          .addLabel("draw-complete", INTRO_LOGO_ACTIVATION.drawDuration)
          .call(() => {
            root.dataset.homeIntroPhase = "draw-complete";
          }, [], "draw-complete")
          .addLabel("settle", settleStart)
          .call(() => {
            root.dataset.homeIntroPhase = "settle";
          }, [], "settle")
          .to(
            ambient,
            {
              duration: INTRO_LOGO_ACTIVATION.settleDuration,
              ease: "power2.out",
              opacity: 0.34,
            },
            "settle",
          )
          .call(() => {
            markStage.style.removeProperty("will-change");
          }, [], `settle+=${
            INTRO_LOGO_ACTIVATION.settleDuration
          }`)
          .call(() => {
            root.dataset.homeIntroPhase = "settled";
          }, [], `settle+=${INTRO_LOGO_ACTIVATION.settleDuration}`);

        INTRO_LOGO_SPARKS.burstProgress.forEach((progress, burstIndex) => {
          if (activationTimeline) {
            addSparkBurst(activationTimeline, progress, burstIndex);
          }
        });
      };

      if (context) context.add(createTimeline);
      else createTimeline();
    });

    context = gsap.context(() => {
      const currentBootstrapState =
        document.documentElement.dataset.homeIntroState;
      if (
        bootstrapState === "skip"
        || currentBootstrapState === "skip"
        || document.documentElement.hasAttribute(
          HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
        )
      ) {
        hide(true);
        return;
      }
      if (
        fallbackAlreadyComplete
        || currentBootstrapState === "fallback-complete"
      ) {
        hide(false);
        return;
      }
      if (
        fallbackExitInProgress
        || currentBootstrapState === "fallback-exit"
      ) return;

      document.documentElement.dataset.homeIntroState = "active";
      root.dataset.homeIntroPhase = "entrance";
      root.setAttribute("data-home-intro-managed", "");
      root.style.opacity = "1";
      root.style.visibility = "inherit";
      root.style.display = "grid";
      hero?.setAttribute("data-home-intro-active", "");
      hero?.setAttribute("data-hero-handoff-frozen", "");
    }, root);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finish(true, true);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    introWindow.__pokornyHomeIntroBootstrapCleanup?.();

    if (!completed && !fallbackAlreadyComplete) {
      const fallbackTotal = cssFallbackStart + cssFallbackDuration;
      absoluteSafetyTimer = window.setTimeout(
        () => {
          document.documentElement.setAttribute(
            HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE,
            "static",
          );
          // Once React owns the intro the bootstrap timer is cleared. This
          // deadline must release its veil/inert state as well as the poster;
          // otherwise an interrupted timeline can leave readable content inert.
          runtimeTimedOut = true;
          finish(true, false);
        },
        Math.max(0, fallbackTotal - fallbackElapsedAtHydration),
      );
    }

    if (!completed && fallbackExitInProgress) {
      const fallbackTotal = cssFallbackStart + cssFallbackDuration;
      fallbackFinishTimer = window.setTimeout(
        () => hide(false),
        Math.max(0, fallbackTotal - fallbackElapsedAtHydration),
      );
    } else if (!completed && !fallbackAlreadyComplete) {
      const posterReady = Promise.race([
        waitForHeroPosterReadiness(entranceController.signal),
        delay(Math.max(0, cssFallbackStart - fallbackElapsedAtHydration)),
      ]);
      const minimum = reduceMotion
        ? HOMEPAGE_INTRO_TIMING.reducedMotionMinimum
        : HOMEPAGE_INTRO_TIMING.minimum;
      const experienceReady = (async () => {
        // Allow the prepared DOM an initial paint opportunity, then start
        // this critical visible sequence without waiting for an idle slice.
        await waitForPaint(entranceController.signal, 2);
        if (!reduceMotion) {
          if (cancelled || completed) return;
          await playLogoActivation();
          if (cancelled || completed) return;
          // The mark has already settled before the last spark's authored
          // timeline ends. No extra frame barrier is needed for this marker;
          // the decoded-poster handoff below still retains its two frames.
          root.setAttribute("data-home-intro-logo-ready", "true");
        }

        if (cancelled || completed) return;
        hero?.setAttribute("data-hero-effects-prewarm", "true");
        window.dispatchEvent(new CustomEvent(HERO_EFFECTS_PREWARM_EVENT));

        // The frame-zero poster is already the exact enhancement fallback.
        // Decode it alongside the logo; downloading/compiling WebGL must not
        // gate reading the semantic hero. Its first frame stays frozen until
        // the veil has left, so adopting a late renderer does not jump phase.
        await posterReady;
        if (cancelled || completed) return;
        document.documentElement.setAttribute(
          HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE,
          readHeroVisualMode(hero) ?? "static",
        );
        await waitForPaint(entranceController.signal, 2);
      })();

      void Promise.all([
        delay(Math.max(0, minimum - elapsedAtHydration)),
        experienceReady,
      ]).then(() => finish(false));
    }

    return () => {
      cancelled = true;
      entranceController.abort();
      window.clearTimeout(absoluteSafetyTimer);
      window.clearTimeout(exitSafetyTimer);
      window.clearTimeout(fallbackFinishTimer);
      window.clearTimeout(postIntroFocusTimer);
      postIntroFocusObserver?.disconnect();
      window.removeEventListener("keydown", handleKeyDown, true);
      activationTimeline?.kill();
      exitTimeline?.kill();
      clearHeroIntroState();
      restoreBackgroundInteraction();
      context?.revert();
      window.queueMicrotask(() => {
        if (
          root.isConnected ||
          !introWindow.__pokornyHomeIntroBootstrapCleanup
        ) {
          return;
        }
        introWindow.__pokornyHomeIntroBootstrapCleanup();
      });
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={s.intro}
      data-home-intro
      data-home-intro-play="pending"
      data-lenis-prevent
      data-nav-material="hero-glass"
      data-nav-theme="dark"
      ref={rootRef}
    >
      <svg
        aria-hidden="true"
        className={s.veil}
        data-home-intro-reveal="logo-aperture"
        data-home-intro-veil
        focusable="false"
        preserveAspectRatio="none"
        ref={veilRef}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask
            className={s.apertureMask}
            height="100%"
            id={apertureMaskId}
            maskContentUnits="userSpaceOnUse"
            maskUnits="userSpaceOnUse"
            width="100%"
            x="0"
            y="0"
          >
            <rect
              className={s.apertureMaskBase}
              height="100%"
              width="100%"
              x="0"
              y="0"
            />
            <g
              data-home-intro-aperture-position
              ref={aperturePositionRef}
            >
              <g
                className={s.apertureScale}
                data-home-intro-aperture
                ref={apertureScaleRef}
              >
                <g
                  transform={`translate(${-LOGO_APERTURE_ORIGIN.x} ${-LOGO_APERTURE_ORIGIN.y})`}
                >
                  <path
                    className={s.apertureShape}
                    d={LOGO_MARK_PATH}
                    data-home-intro-aperture-shape
                  />
                </g>
              </g>
            </g>
          </mask>
        </defs>
        <rect
          className={s.veilSurface}
          data-home-intro-veil-surface
          height="100%"
          mask={`url(#${apertureMaskId})`}
          width="100%"
          x="0"
          y="0"
        />
        <g
          data-home-intro-aperture-border-position
          ref={apertureBorderPositionRef}
        >
          <g
            className={s.apertureBorderScale}
            data-home-intro-aperture-border
            ref={apertureBorderScaleRef}
          >
            <g
              transform={`translate(${-LOGO_APERTURE_ORIGIN.x} ${-LOGO_APERTURE_ORIGIN.y})`}
            >
              <path
                className={s.apertureBorderShape}
                d={LOGO_MARK_PATH}
                data-home-intro-aperture-border-shape
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </g>
        </g>
      </svg>
      <div aria-hidden="true" className={s.lockup}>
        <span
          className={s.ambientBloom}
          data-home-intro-ambient
          ref={ambientRef}
        />
        <div
          className={s.markStage}
          data-home-intro-mark-stage
          ref={markStageRef}
        >
          <LogoMark
            className={s.logoGhost}
            data-home-intro-mark-ghost
            focusable="false"
          />
          <LogoMark
            className={s.logoMark}
            data-home-intro-mark
            focusable="false"
            pathProps={{
              className: s.logoPath,
              mask: `url(#${logoMaskId})`,
            }}
          >
            <defs>
              <mask
                className={s.logoMask}
                height="226.3"
                id={logoMaskId}
                maskContentUnits="userSpaceOnUse"
                maskUnits="userSpaceOnUse"
                width="215.6"
                x="-20"
                y="-20"
              >
                <path
                  className={s.logoRevealGuide}
                  d={LOGO_REVEAL_GUIDE}
                  data-home-intro-logo-guide
                  pathLength="1"
                  ref={logoGuideRef}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                />
              </mask>
            </defs>
          </LogoMark>
          <svg
            aria-hidden="true"
            className={s.logoEnergy}
            data-home-intro-logo-energy
            focusable="false"
            viewBox={LOGO_MARK_VIEWBOX}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask
                className={s.logoMask}
                height="226.3"
                id={logoEnergyMaskId}
                maskContentUnits="userSpaceOnUse"
                maskUnits="userSpaceOnUse"
                width="215.6"
                x="-20"
                y="-20"
              >
                <path
                  className={s.logoHeadGuide}
                  d={LOGO_REVEAL_GUIDE}
                  data-home-intro-logo-head-guide
                  pathLength="1"
                  ref={logoHeadGuideRef}
                  strokeDasharray={`${INTRO_LOGO_ACTIVATION.headDashLength} ${
                    1 - INTRO_LOGO_ACTIVATION.headDashLength
                  }`}
                  strokeDashoffset="0"
                />
              </mask>
            </defs>
            <path
              className={s.logoAfterglow}
              d={LOGO_MARK_PATH}
              data-home-intro-logo-afterglow
              mask={`url(#${logoEnergyMaskId})`}
              ref={logoAfterglowRef}
            />
            <path
              className={s.logoHead}
              d={LOGO_MARK_PATH}
              data-home-intro-logo-head
              mask={`url(#${logoEnergyMaskId})`}
              ref={logoHeadRef}
            />
            <g
              className={s.cuttingHead}
              data-home-intro-cutting-head
              ref={cuttingHeadRef}
            >
              <circle className={s.cuttingHalo} cx="0" cy="0" r="9.5" />
              <circle className={s.cuttingRing} cx="0" cy="0" r="4.2" />
              <circle className={s.cuttingCore} cx="0" cy="0" r="2.1" />
            </g>
            <g aria-hidden="true" data-home-intro-sparks>
              {Array.from({ length: SPARK_PARTICLE_COUNT }, (_, index) => {
                const particle = SPARK_PARTICLES[
                  index % INTRO_LOGO_SPARKS.particlesPerBurst
                ];

                return (
                  <g
                    className={s.spark}
                    data-home-intro-spark
                    key={`spark-${index}`}
                    ref={(node) => {
                      sparkRefs.current[index] = node;
                    }}
                  >
                    <line
                      className={s.sparkTrail}
                      vectorEffect="non-scaling-stroke"
                      x1="0"
                      x2={-particle.length}
                      y1="0"
                      y2="0"
                    />
                    <circle
                      className={s.sparkEmber}
                      cx="0"
                      cy="0"
                      r={particle.length > 12
                        ? 1.55
                        : particle.length > 8
                          ? 1.25
                          : 1}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

    </div>
  );
}
