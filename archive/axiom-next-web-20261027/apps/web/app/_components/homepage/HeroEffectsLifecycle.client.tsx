"use client";

import {
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import {
  HERO_PORTRAIT_WEBGL_MEDIA_QUERY,
  HERO_SILK_WEBGL_MEDIA_QUERY,
  loadHeroPortraitWarpRuntime,
  preloadHeroEffectRuntimes,
} from "./HeroEffectsRuntime";
import {
  HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE,
  HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
} from "./HomepageIntro.constants";

export const HERO_SILK_ENABLE_ATTRIBUTE = "data-hero-silk-enabled";
export const HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE =
  "data-hero-portrait-warp-enabled";
export const HERO_EFFECTS_READY_ATTRIBUTE = "data-hero-effects-ready";
export const HERO_EFFECTS_READY_EVENT = "home:hero-effects-ready";
export const HERO_EFFECTS_MODE_ATTRIBUTE = "data-hero-effects-mode";
export const HERO_EFFECTS_PREWARM_ATTRIBUTE = "data-hero-effects-prewarm";
export const HERO_EFFECTS_PREWARM_EVENT = "home:hero-effects-prewarm";
export const HERO_EFFECTS_TIMEOUT_EVENT = "home:hero-effects-timeout";

const INTRO_OWNED_STATES = new Set([
  "active",
  "fallback-exit",
  "pending",
]);

const STATIC_HANDOFF_READY_STATES = new Set([
  "forced-colors",
  "reduced-motion",
  "static-fallback",
  "webgl-fallback",
  "webgl-timeout",
]);

type HeroEffectsReadyMode = "static" | "webgl";

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout?: number },
  ) => number;
};

type NavigatorWithHints = Navigator & {
  connection?: {
    saveData?: boolean;
  };
  deviceMemory?: number;
};

type HeroEffectAttribute =
  | typeof HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE
  | typeof HERO_SILK_ENABLE_ATTRIBUTE;

const introOwnsViewport = () => INTRO_OWNED_STATES.has(
  document.documentElement.dataset.homeIntroState ?? "",
);

const hasWebGlApi = () => (
  typeof window.WebGLRenderingContext !== "undefined"
  || typeof window.WebGL2RenderingContext !== "undefined"
);

/**
 * Keeps WebGL as a progressive enhancement. The semantic hero and portrait
 * are server-rendered. This controller uses short idle slices for decorative
 * canvases and publishes a readiness contract for the critical Silk layer.
 * The portrait renderer is deliberately kept out of the boot path and starts
 * only after the semantic Hero reveal has settled.
 */
export default function HeroEffectsLifecycle({
  enablePortraitWarp = true,
}: {
  enablePortraitWarp?: boolean;
}) {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const hero = marker?.closest<HTMLElement>("[data-cinematic-home-hero]");
    if (!marker || !hero) return undefined;

    const idleWindow = window as IdleWindow;
    const navigatorHints = navigator as NavigatorWithHints;
    const motionQuery = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
    const portraitWebGlQuery = window.matchMedia(
      HERO_PORTRAIT_WEBGL_MEDIA_QUERY,
    );
    const silkWebGlQuery = window.matchMedia(HERO_SILK_WEBGL_MEDIA_QUERY);
    const constrainedDevice = (
      navigatorHints.connection?.saveData === true
      || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2)
      || (
        typeof navigatorHints.deviceMemory === "number"
        && navigatorHints.deviceMemory <= 2
      )
    );

    let animationFrame = 0;
    let disposed = false;
    let fallbackTimer = 0;
    let idleHandle = 0;
    let isVisible = false;
    let modulePreloadFrame = 0;
    let modulePreloadIdleHandle = 0;
    let modulePreloadInFlight = false;
    let modulePreloadReady = false;
    let modulePreloadStarted = false;
    let modulePreloadTimer = 0;
    let prewarmReleased = hero.hasAttribute(HERO_EFFECTS_PREWARM_ATTRIBUTE);
    let portraitEnhancementFrame = 0;
    let portraitEnhancementIdleHandle = 0;
    let portraitEnhancementTimer = 0;
    let portraitModuleInFlight = false;
    let portraitRuntimeFailed = false;
    let revealSettled = hero.hasAttribute(
      HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE,
    );
    let publishedReadyMode: HeroEffectsReadyMode | null = null;
    let requestedStaticState: string | null = null;
    let runtimeFailed = false;
    let runtimeFallbackState = "webgl-fallback";
    let scheduledStage: "effects" | null = null;
    let staticSettleFrame = 0;
    let staticStableFrames = 0;

    const setLifecycleState = (state: string) => {
      hero.dataset.heroEffectsState = state;

      const mode: HeroEffectsReadyMode | null = state === "ready"
        ? "webgl"
        : STATIC_HANDOFF_READY_STATES.has(state)
          ? "static"
          : null;

      if (!mode) {
        hero.removeAttribute(HERO_EFFECTS_READY_ATTRIBUTE);
        hero.removeAttribute(HERO_EFFECTS_MODE_ATTRIBUTE);
        publishedReadyMode = null;
        return;
      }

      hero.setAttribute(HERO_EFFECTS_MODE_ATTRIBUTE, mode);
      hero.setAttribute(HERO_EFFECTS_READY_ATTRIBUTE, "true");
      if (publishedReadyMode === mode) return;
      publishedReadyMode = mode;
      window.dispatchEvent(new CustomEvent(HERO_EFFECTS_READY_EVENT, {
        detail: { hero, mode },
      }));
    };

    const cancelScheduledStage = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      if (idleHandle && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
        idleHandle = 0;
      }
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = 0;
      }
      scheduledStage = null;
    };

    const cancelPortraitEnhancement = () => {
      if (portraitEnhancementFrame) {
        window.cancelAnimationFrame(portraitEnhancementFrame);
        portraitEnhancementFrame = 0;
      }
      if (
        portraitEnhancementIdleHandle
        && idleWindow.cancelIdleCallback
      ) {
        idleWindow.cancelIdleCallback(portraitEnhancementIdleHandle);
        portraitEnhancementIdleHandle = 0;
      }
      if (portraitEnhancementTimer) {
        window.clearTimeout(portraitEnhancementTimer);
        portraitEnhancementTimer = 0;
      }
    };

    const enhancementsAllowed = () => (
      !motionQuery.matches
      && !forcedColorsQuery.matches
      && !constrainedDevice
      && hasWebGlApi()
      && silkWebGlQuery.matches
    );

    const scheduleRuntimeModulePreload = () => {
      if (
        modulePreloadReady
        || modulePreloadStarted
        || !enhancementsAllowed()
      ) return;

      modulePreloadStarted = true;
      modulePreloadFrame = window.requestAnimationFrame(() => {
        modulePreloadFrame = 0;
        const preload = () => {
          modulePreloadIdleHandle = 0;
          modulePreloadTimer = 0;
          modulePreloadInFlight = true;
          void preloadHeroEffectRuntimes({
            includePortrait: false,
          }).then((loaded) => {
            modulePreloadInFlight = false;
            modulePreloadReady = loaded;
            if (!loaded) {
              runtimeFailed = true;
              runtimeFallbackState = "webgl-fallback";
            }
            if (!disposed) advance();
          });
        };
        if (idleWindow.requestIdleCallback) {
          modulePreloadIdleHandle = idleWindow.requestIdleCallback(
            preload,
            { timeout: 350 },
          );
        } else {
          modulePreloadTimer = window.setTimeout(preload, 32);
        }
      });
    };

    const cancelRuntimeModulePreload = () => {
      if (modulePreloadFrame) {
        window.cancelAnimationFrame(modulePreloadFrame);
        modulePreloadFrame = 0;
      }
      if (modulePreloadIdleHandle && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(modulePreloadIdleHandle);
        modulePreloadIdleHandle = 0;
      }
      if (modulePreloadTimer) {
        window.clearTimeout(modulePreloadTimer);
        modulePreloadTimer = 0;
      }
      if (!modulePreloadInFlight && !modulePreloadReady) {
        modulePreloadStarted = false;
      }
    };

    const cancelStaticSettlement = () => {
      if (staticSettleFrame) {
        window.cancelAnimationFrame(staticSettleFrame);
        staticSettleFrame = 0;
      }
      requestedStaticState = null;
      staticStableFrames = 0;
    };

    const disableEnhancements = (state: string) => {
      cancelScheduledStage();
      cancelPortraitEnhancement();
      cancelRuntimeModulePreload();
      if (requestedStaticState !== state) staticStableFrames = 0;
      requestedStaticState = state;
      hero.removeAttribute(HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE);
      hero.removeAttribute(HERO_SILK_ENABLE_ATTRIBUTE);
      hero.removeAttribute("data-hero-portrait-warp-ready");
      hero.removeAttribute("data-hero-silk-ready");
      setLifecycleState("settling-static");

      const settle = () => {
        staticSettleFrame = 0;
        const runtimeStillMounted = Boolean(hero.querySelector(
          "[data-hero-silk-host] [data-silk-backdrop]:not([data-hero-effect-placeholder]), "
          + "[data-hero-portrait-warp]:not([data-hero-effect-placeholder])",
        ));
        const enableRequestStillPresent = hero.hasAttribute(
          HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE,
        ) || hero.hasAttribute(HERO_SILK_ENABLE_ATTRIBUTE);

        staticStableFrames = runtimeStillMounted || enableRequestStillPresent
          ? 0
          : staticStableFrames + 1;
        if (staticStableFrames >= 2) {
          setLifecycleState(requestedStaticState ?? state);
          return;
        }
        staticSettleFrame = window.requestAnimationFrame(settle);
      };

      if (!staticSettleFrame) {
        staticSettleFrame = window.requestAnimationFrame(settle);
      }
    };

    const schedulePortraitEnhancement = () => {
      if (
        disposed
        || !enablePortraitWarp
        || portraitModuleInFlight
        || portraitRuntimeFailed
        || hero.hasAttribute(HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE)
        || !revealSettled
        || !portraitWebGlQuery.matches
        || !enhancementsAllowed()
        || !isVisible
        || hero.getAttribute(HERO_EFFECTS_MODE_ATTRIBUTE) !== "webgl"
      ) return;

      cancelPortraitEnhancement();
      portraitEnhancementFrame = window.requestAnimationFrame(() => {
        portraitEnhancementFrame = 0;
        const load = () => {
          portraitEnhancementIdleHandle = 0;
          portraitEnhancementTimer = 0;
          portraitModuleInFlight = true;
          void loadHeroPortraitWarpRuntime().then(() => {
            portraitModuleInFlight = false;
            if (
              disposed
              || !enablePortraitWarp
              || !revealSettled
              || !portraitWebGlQuery.matches
              || !enhancementsAllowed()
              || !isVisible
              || hero.getAttribute(HERO_EFFECTS_MODE_ATTRIBUTE) !== "webgl"
            ) return;
            hero.setAttribute(HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE, "true");
          }).catch(() => {
            portraitModuleInFlight = false;
            portraitRuntimeFailed = true;
            hero.removeAttribute(HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE);
          });
        };

        if (idleWindow.requestIdleCallback) {
          portraitEnhancementIdleHandle = idleWindow.requestIdleCallback(
            load,
            { timeout: 900 },
          );
        } else {
          portraitEnhancementTimer = window.setTimeout(load, 80);
        }
      });
    };

    const scheduleAtIdle = (
      stage: "effects",
      callback: () => void,
    ) => {
      if (scheduledStage === stage) return;
      cancelScheduledStage();
      scheduledStage = stage;
      setLifecycleState(
        introOwnsViewport()
          ? "prewarming-effects-idle"
          : "waiting-effects-idle",
      );

      const waitForIdleAfterPaint = () => {
        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = 0;
          const run = () => {
            idleHandle = 0;
            fallbackTimer = 0;
            scheduledStage = null;
            callback();
          };

          if (idleWindow.requestIdleCallback) {
            idleHandle = idleWindow.requestIdleCallback(run, { timeout: 350 });
            return;
          }

          // One short task after paint is a safe fallback on Safari versions
          // without requestIdleCallback.
          fallbackTimer = window.setTimeout(run, 48);
        });
      };

      // The intro explicitly releases this stage after the logo draw, so one
      // extra frame is enough to keep the release itself composited cleanly.
      if (introOwnsViewport()) {
        waitForIdleAfterPaint();
      } else {
        fallbackTimer = window.setTimeout(() => {
          fallbackTimer = 0;
          waitForIdleAfterPaint();
        }, 180);
      }
    };

    const silkHasSettled = () => {
      const silk = hero.querySelector<HTMLElement>(
        "[data-hero-silk-host] [data-silk-backdrop]",
      );
      return {
        failed: silk?.dataset.state === "fallback"
          && !silk.hasAttribute("data-hero-effect-placeholder"),
        ready: hero.getAttribute("data-hero-silk-ready") === "true"
          || silk?.dataset.state === "ready",
      };
    };

    const advance = () => {
      if (!enhancementsAllowed()) {
        const state = motionQuery.matches
          ? "reduced-motion"
          : forcedColorsQuery.matches
            ? "forced-colors"
            : "static-fallback";
        disableEnhancements(state);
        return;
      }

      if (runtimeFailed) {
        disableEnhancements(runtimeFallbackState);
        return;
      }

      cancelStaticSettlement();

      if (!enablePortraitWarp || !portraitWebGlQuery.matches || !revealSettled) {
        cancelPortraitEnhancement();
        hero.removeAttribute(HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE);
        hero.removeAttribute("data-hero-portrait-warp-ready");
      }

      const introActive = introOwnsViewport();
      const prewarmAllowed = !introActive
        || prewarmReleased
        || hero.hasAttribute(HERO_EFFECTS_PREWARM_ATTRIBUTE);
      if (!prewarmAllowed) {
        cancelScheduledStage();
        setLifecycleState("waiting-prewarm");
        return;
      }

      if (!isVisible) {
        cancelScheduledStage();
        setLifecycleState(
          introOwnsViewport()
            ? "prewarming-waiting-visibility"
            : "waiting-visibility",
        );
        return;
      }

      if (!modulePreloadReady) {
        cancelScheduledStage();
        scheduleRuntimeModulePreload();
        setLifecycleState(
          introOwnsViewport()
            ? "prewarming-modules"
            : "loading-modules",
        );
        return;
      }

      if (
        !hero.hasAttribute(HERO_SILK_ENABLE_ATTRIBUTE)
      ) {
        scheduleAtIdle("effects", () => {
          if (!enhancementsAllowed() || !isVisible) {
            advance();
            return;
          }
          hero.setAttribute(HERO_SILK_ENABLE_ATTRIBUTE, "true");
          setLifecycleState(
            introOwnsViewport() ? "prewarming-effects" : "loading-effects",
          );
        });
        return;
      }

      const silk = silkHasSettled();
      if (silk.failed) {
        runtimeFailed = true;
        runtimeFallbackState = "webgl-fallback";
        disableEnhancements("webgl-fallback");
        return;
      }

      if (silk.ready) {
        setLifecycleState("ready");
        schedulePortraitEnhancement();
      } else {
        setLifecycleState(
          introOwnsViewport() ? "prewarming-effects" : "loading-effects",
        );
      }
    };

    const heroObserver = new MutationObserver(advance);
    heroObserver.observe(hero, {
      attributeFilter: [
        HERO_EFFECTS_PREWARM_ATTRIBUTE,
        HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE,
        "data-hero-portrait-warp-ready",
        "data-hero-silk-ready",
      ],
      attributes: true,
    });

    const effectObserver = new MutationObserver(() => {
      const portraitEffect = hero.querySelector<HTMLElement>(
        "[data-hero-portrait-warp]:not([data-hero-effect-placeholder])",
      );
      if (portraitEffect?.dataset.state === "fallback") {
        portraitRuntimeFailed = true;
        hero.removeAttribute(HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE);
        hero.removeAttribute("data-hero-portrait-warp-ready");
      }
      advance();
    });
    const silkHost = hero.querySelector<HTMLElement>("[data-hero-silk-host]");
    const portrait = hero.querySelector<HTMLElement>("[data-hero-portrait]");
    if (silkHost) effectObserver.observe(silkHost, {
      attributeFilter: ["data-state"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    if (portrait) effectObserver.observe(portrait, {
      attributeFilter: ["data-state"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    const introObserver = new MutationObserver(advance);
    introObserver.observe(document.documentElement, {
      attributeFilter: ["data-home-intro-state"],
      attributes: true,
    });

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? true;
        advance();
      },
      { rootMargin: "120px" },
    );
    intersectionObserver.observe(hero);

    const handleCapabilityChange = () => advance();
    const handleIntroComplete = () => advance();
    const handlePrewarm = () => {
      prewarmReleased = true;
      advance();
    };
    const handleHeroRevealSettled = () => {
      revealSettled = true;
      schedulePortraitEnhancement();
    };
    const handleTimeout = () => {
      runtimeFailed = true;
      runtimeFallbackState = "webgl-timeout";
      disableEnhancements(runtimeFallbackState);
    };
    motionQuery.addEventListener("change", handleCapabilityChange);
    forcedColorsQuery.addEventListener("change", handleCapabilityChange);
    portraitWebGlQuery.addEventListener("change", handleCapabilityChange);
    silkWebGlQuery.addEventListener("change", handleCapabilityChange);
    window.addEventListener("home:intro-complete", handleIntroComplete);
    window.addEventListener(HERO_EFFECTS_PREWARM_EVENT, handlePrewarm);
    window.addEventListener(HERO_EFFECTS_TIMEOUT_EVENT, handleTimeout);
    window.addEventListener(
      HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
      handleHeroRevealSettled,
    );

    setLifecycleState(
      introOwnsViewport() ? "waiting-prewarm" : "waiting-visibility",
    );
    advance();

    return () => {
      disposed = true;
      cancelScheduledStage();
      cancelPortraitEnhancement();
      cancelStaticSettlement();
      cancelRuntimeModulePreload();
      heroObserver.disconnect();
      effectObserver.disconnect();
      introObserver.disconnect();
      intersectionObserver.disconnect();
      motionQuery.removeEventListener("change", handleCapabilityChange);
      forcedColorsQuery.removeEventListener("change", handleCapabilityChange);
      portraitWebGlQuery.removeEventListener("change", handleCapabilityChange);
      silkWebGlQuery.removeEventListener("change", handleCapabilityChange);
      window.removeEventListener("home:intro-complete", handleIntroComplete);
      window.removeEventListener(HERO_EFFECTS_PREWARM_EVENT, handlePrewarm);
      window.removeEventListener(HERO_EFFECTS_TIMEOUT_EVENT, handleTimeout);
      window.removeEventListener(
        HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
        handleHeroRevealSettled,
      );
      hero.removeAttribute(HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE);
      hero.removeAttribute(HERO_SILK_ENABLE_ATTRIBUTE);
      hero.removeAttribute(HERO_EFFECTS_READY_ATTRIBUTE);
      hero.removeAttribute(HERO_EFFECTS_MODE_ATTRIBUTE);
      delete hero.dataset.heroEffectsState;
    };
  }, [enablePortraitWarp]);

  return (
    <span
      aria-hidden="true"
      data-hero-effects-lifecycle
      hidden
      ref={markerRef}
    />
  );
}

export function useHeroEffectEnabled(
  hostRef: RefObject<HTMLElement | null>,
  attribute: HeroEffectAttribute,
) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const hero = host?.closest<HTMLElement>("[data-cinematic-home-hero]");
    if (!host || !hero) return undefined;

    const sync = () => setEnabled(hero.hasAttribute(attribute));
    const observer = new MutationObserver(sync);
    observer.observe(hero, {
      attributeFilter: [attribute],
      attributes: true,
    });
    sync();

    return () => observer.disconnect();
  }, [attribute, hostRef]);

  return enabled;
}
