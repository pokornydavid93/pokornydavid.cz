"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE,
  HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
} from "./HomepageIntro.constants";

const HeroSituationReveal = dynamic(() => import("./HeroSituationReveal.client"), {
  loading: () => null,
  ssr: false,
});
const HomeCinematicScroll = dynamic(
  () => import("./HomeCinematicScroll.client"),
  { loading: () => null, ssr: false },
);
const ProcessReveal = dynamic(() => import("./ProcessReveal.client"), {
  loading: () => null,
  ssr: false,
});
const ProfileSituationReveal = dynamic(
  () => import("./ProfileSituationReveal.client"),
  { loading: () => null, ssr: false },
);
const SituationOrientationReveal = dynamic(
  () => import("./SituationOrientationReveal.client"),
  { loading: () => null, ssr: false },
);

type DeferredStage = "hero" | "situations" | "orientation" | "process" | "chapters";

const STAGE_TARGETS: Record<Exclude<DeferredStage, "hero">, string> = {
  situations: "[data-home-module=\"situations\"]",
  orientation: "[data-orientation-surface]",
  process: "[data-process-transition-target]",
  chapters: [
    "[data-home-module=\"evidence\"]",
    "[data-home-module=\"insights\"]",
    "[data-home-module=\"faq\"]",
    "[data-home-module=\"final-action\"]",
    "[data-component=\"site-footer\"]",
  ].join(","),
};

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
};

function heroRevealHasSettled() {
  const hero = document.querySelector<HTMLElement>(
    "[data-cinematic-home-hero]",
  );
  return Boolean(
    hero?.hasAttribute(HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE),
  );
}

function useDeferredMotionStage(stage: DeferredStage) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;

    const idleWindow = window as IdleWindow;
    let animationFrame = 0;
    let fallbackTimer = 0;
    let idleHandle = 0;
    let released = false;
    let approaching = stage === "hero";

    const cancelScheduledRelease = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (idleHandle && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      animationFrame = 0;
      fallbackTimer = 0;
      idleHandle = 0;
    };

    const mount = () => {
      if (released) return;
      released = true;
      cancelScheduledRelease();
      setReady(true);
    };

    const scheduleRelease = () => {
      if (released || !approaching || !heroRevealHasSettled()) return;
      cancelScheduledRelease();

      if (stage === "hero") {
        animationFrame = window.requestAnimationFrame(mount);
        return;
      }

      // Instantiate each scene before it approaches the reading area. Loading
      // every offscreen controller on the same timer created redundant global
      // refreshes and a startup task burst even when the visitor stayed here.
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        if (idleWindow.requestIdleCallback) {
          idleHandle = idleWindow.requestIdleCallback(mount, { timeout: 250 });
        } else {
          fallbackTimer = window.setTimeout(mount, 0);
        }
      });
    };

    const hero = document.querySelector<HTMLElement>(
      "[data-cinematic-home-hero]",
    );
    const revealObserver = new MutationObserver(scheduleRelease);
    if (hero) {
      revealObserver.observe(hero, {
        attributeFilter: [HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE],
        attributes: true,
      });
    }
    window.addEventListener(
      HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
      scheduleRelease,
    );
    let intersectionObserver: IntersectionObserver | undefined;
    if (stage !== "hero") {
      const targets = document.querySelectorAll(STAGE_TARGETS[stage]);
      if (targets.length > 0) {
        intersectionObserver = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          approaching = true;
          intersectionObserver?.disconnect();
          scheduleRelease();
        }, { rootMargin: "200% 0px" });
        for (const target of targets) intersectionObserver.observe(target);
      } else {
        approaching = true;
      }
    }
    scheduleRelease();

    return () => {
      released = true;
      cancelScheduledRelease();
      revealObserver.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener(
        HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
        scheduleRelease,
      );
    };
  }, [ready, stage]);

  return ready;
}

export function DeferredHeroSituationReveal() {
  return useDeferredMotionStage("hero") ? <HeroSituationReveal /> : null;
}

export function DeferredHomeCinematicScroll() {
  return useDeferredMotionStage("chapters") ? <HomeCinematicScroll /> : null;
}

export function DeferredProcessReveal() {
  return useDeferredMotionStage("process") ? <ProcessReveal /> : null;
}

export function DeferredSituationOrientationReveal() {
  return useDeferredMotionStage("orientation")
    ? <SituationOrientationReveal />
    : null;
}

export function DeferredProfileSituationReveal() {
  return useDeferredMotionStage("situations")
    ? <ProfileSituationReveal />
    : null;
}
