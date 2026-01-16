"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { RevealMode } from "./types";

type CompiledAnimationLike =
  | {
      from?: gsap.TweenVars;
      to?: gsap.TweenVars;
    }
  | null
  | undefined;

type Args = {
  enabled?: boolean;
  root: HTMLElement | null;
  compiledAnimation: CompiledAnimationLike;
  duration: number;
  ease?: gsap.TweenVars["ease"];
  delay: number;
  stagger?: number;
  index?: number;
  mode: RevealMode;
  disabled: boolean;
  scope?: string;
};

function applyInitialState(el: HTMLElement, compiledAnimation: CompiledAnimationLike) {
  // kill anything running on this element
  gsap.killTweensOf(el);

  const base: gsap.TweenVars = {
    autoAlpha: 0,
    y: 24,
    willChange: "transform,opacity",
  };

  if (compiledAnimation && typeof compiledAnimation === "object") {
    if ("from" in compiledAnimation && compiledAnimation.from) {
      gsap.set(el, { ...base, ...(compiledAnimation.from as gsap.TweenVars) });
      return;
    }
  }

  gsap.set(el, base);
}

function play(
  el: HTMLElement,
  compiledAnimation: CompiledAnimationLike,
  vars: gsap.TweenVars
) {
  // kill anything running on this element
  gsap.killTweensOf(el);

  if (compiledAnimation && typeof compiledAnimation === "object") {
    if ("from" in compiledAnimation && "to" in compiledAnimation) {
      return gsap.fromTo(
        el,
        (compiledAnimation.from ?? {}) as gsap.TweenVars,
        { ...((compiledAnimation.to ?? {}) as gsap.TweenVars), ...vars }
      );
    }
  }

  return gsap.to(el, { autoAlpha: 1, y: 0, ...vars });
}

function isInViewport(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;

  // “aspoň trochu viditelné”
  return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
}

export function useRevealIO({
  enabled = true,
  root,
  compiledAnimation,
  duration,
  ease,
  delay,
  stagger,
  index,
  mode,
  disabled,
}: Args) {
  const playedRef = useRef(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const tweenRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    if (!enabled || disabled || !root) return;

    playedRef.current = false;

    // initial state
    applyInitialState(root, compiledAnimation);

    const run = () => {
      const d =
        delay +
        (typeof index === "number" && typeof stagger === "number"
          ? index * stagger
          : 0);

      // kill old tween if any
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }

      tweenRef.current = play(root, compiledAnimation, {
        duration,
        ease,
        delay: d,
        overwrite: "auto",
        onStart: () => {
          // jistota proti “neviditelným” elementům
          gsap.set(root, { autoAlpha: 1 });
        },
        onComplete: () => {
          // leaving only safe clears
          gsap.set(root, { clearProps: "willChange" });
        },
      });
    };

    const onIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.target !== root) continue;

        // debug log (ponech si to teď)
        // console.log("[IO]", root.id, entry.isIntersecting, entry.intersectionRatio);

        if (entry.isIntersecting) {
          if (mode === "once") {
            if (playedRef.current) return;
            playedRef.current = true;
            run();

            // disconnect až PO startu animace
            obsRef.current?.disconnect();
            obsRef.current = null;
          } else {
            run();
          }
        } else if (mode === "toggle") {
          playedRef.current = false;
          applyInitialState(root, compiledAnimation);
        }
      }
    };

    const createObserver = () => {
      obsRef.current?.disconnect();
      obsRef.current = null;

      const obs = new IntersectionObserver(onIntersect, {
        root: null,
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.01,
      });

      obs.observe(root);
      obsRef.current = obs;

      // 🔥 kritický fallback: pokud je už ve viewportu, IO to někdy “neodpálí”
      if (mode !== "once" || !playedRef.current) {
        if (isInViewport(root)) {
          if (mode === "once") playedRef.current = true;
          run();
          if (mode === "once") {
            obs.disconnect();
            obsRef.current = null;
          }
        }
      }
    };

    createObserver();

    const onRefresh = () => {
      // pokud už bylo přehráno (once), nedělej nic
      if (mode === "once" && playedRef.current) return;

      // re-apply initial state + observer
      applyInitialState(root, compiledAnimation);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          createObserver();
        });
      });
    };

    window.addEventListener("handoff:refresh", onRefresh);

    return () => {
      window.removeEventListener("handoff:refresh", onRefresh);

      obsRef.current?.disconnect();
      obsRef.current = null;

      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }

      // ❌ NE clearProps all – to ti zabíjí stav a dělá random výsledky
      gsap.killTweensOf(root);
      gsap.set(root, { clearProps: "willChange" });
    };
  }, [
    enabled,
    disabled,
    root,
    compiledAnimation,
    duration,
    ease,
    delay,
    stagger,
    index,
    mode,
  ]);
}
