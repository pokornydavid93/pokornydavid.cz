import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CompiledAnimation, RevealMode } from "./types";

gsap.registerPlugin(ScrollTrigger);

type UseRevealOptions = {
  root: HTMLElement | null;
  compiledAnimation: CompiledAnimation;
  duration: number;
  ease?: gsap.TweenVars["ease"];
  delay: number;
  start: string;
  stagger?: number;
  index?: number;
  mode: RevealMode;
  disabled?: boolean;
  debug?: boolean;
  scope?: string;
};

export function useReveal({
  root,
  compiledAnimation,
  duration,
  ease,
  delay,
  start,
  stagger,
  index,
  mode,
  disabled,
  debug,
  scope,
}: UseRevealOptions) {
  useLayoutEffect(() => {
    if (!root || disabled) return;

    const ctx = gsap.context(() => {
      const scopedTargets =
        scope && root
          ? Array.from(root.querySelectorAll<HTMLElement>(scope))
          : [];

      const targets = scopedTargets.length > 0 ? scopedTargets : [root];

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const { from, to, meta } = compiledAnimation;

      if (prefersReducedMotion) {
        targets.forEach((target) => {
          gsap.set(target, {
            ...to,
            opacity: 1,
            clearProps: meta.usesTransform ? "transform" : undefined,
          });
        });
        return;
      }

      const timelines: gsap.core.Timeline[] = [];
      const computeDelay = (targetIndex: number) => {
        if (typeof index === "number" && typeof stagger === "number") {
          return delay + index * stagger;
        }

        if (typeof stagger === "number") {
          return delay + targetIndex * stagger;
        }

        return delay;
      };

      targets.forEach((target, targetIndex) => {
        gsap.set(target, {
          ...from,
        });

        const timeline = gsap.timeline({ paused: true });

        timeline.to(target, {
          ...to,
          duration,
          delay: computeDelay(targetIndex),
          ease,
          clearProps: meta.usesTransform ? "transform" : undefined,
        });

        timelines.push(timeline);
      });

      let trigger: ScrollTrigger | null = null;
      let hasPlayed = false;
      let remaining = timelines.length;

      const playAll = () => timelines.forEach((timeline) => timeline.play());
      const reverseAll = () =>
        timelines.forEach((timeline) => timeline.reverse());

      const handleComplete = () => {
        remaining -= 1;
        if (remaining === 0 && trigger) {
          trigger.kill();
        }
      };

      if (mode === "once") {
        timelines.forEach((timeline) => {
          timeline.eventCallback("onComplete", handleComplete);
        });
      }

      trigger = ScrollTrigger.create({
        trigger: root,
        start,
        markers: debug,
        onEnter: () => {
          if (mode === "once") {
            if (hasPlayed) return;
            hasPlayed = true;
          }
          playAll();
        },
        onEnterBack: () => {
          if (mode === "once") {
            if (hasPlayed) return;
            hasPlayed = true;
            playAll();
            return;
          }

          playAll();
        },
        onLeave: () => {
          if (mode === "toggle") {
            reverseAll();
          }
        },
        onLeaveBack: () => {
          if (mode === "toggle") {
            reverseAll();
          }
        },
      });
    }, root);

    return () => ctx.revert();
  }, [
    root,
    compiledAnimation,
    duration,
    ease,
    delay,
    start,
    mode,
    debug,
    scope,
    disabled,
    stagger,
    index,
  ]);
}
