"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import {
  HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE,
  HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
  HOMEPAGE_HERO_REVEAL_STARTED_ATTRIBUTE,
  HOMEPAGE_HERO_REVEAL_START_EVENT,
  HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
} from "./HomepageIntro.constants";

type IntroCompleteDetail = {
  fallback?: boolean;
  skipped?: boolean;
};

const INTRO_OWNED_STATES = new Set(["active", "fallback-exit", "pending"]);

const clearAnimatedState = (
  hero: HTMLElement,
  controller: HTMLElement,
) => {
  const targets = hero.querySelectorAll<HTMLElement>([
    "[data-hero-heading-line-inner]",
    "[data-hero-lead]",
    "[data-hero-actions]",
    "[data-hero-portrait]",
  ].join(","));
  const header = hero.querySelector<HTMLElement>('[data-header-instance="hero"]');
  const headerInner = header?.querySelector<HTMLElement>(
    "[data-header-motion-inner]",
  );

  // This runs after the entrance timeline is stopped/completed. Reset only
  // its owned styles without making CSSPlugin read layout to parse a new
  // identity transform. A subsequent entrance/handoff must read fresh values.
  for (const target of targets) {
    for (const property of [
      "clip-path", "opacity", "perspective", "transform", "transform-origin",
      "visibility", "will-change", "translate", "rotate", "scale",
    ]) {
      target.style.removeProperty(property);
    }
    if (target._gsap) target._gsap.uncache = 1;
  }
  header?.style.removeProperty("clip-path");
  header?.style.removeProperty("--hero-nav-reveal-y");
  header?.removeAttribute("data-hero-nav-entering");
  if (headerInner) headerInner.inert = false;
  delete hero.dataset.heroIntroMotion;
  controller.dataset.phase = "complete";
  controller.dataset.state = "static";
};

export default function HeroIntroReveal() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const controller = controllerRef.current;
    const hero = controller?.closest<HTMLElement>(
      "[data-cinematic-home-hero]",
    );
    if (!controller || !hero) return undefined;

    let revealPublished = false;
    const publishRevealSettled = () => {
      if (revealPublished) return;
      revealPublished = true;
      hero.setAttribute(HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE, "true");
      window.dispatchEvent(new CustomEvent(
        HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
        { detail: { hero } },
      ));
    };
    hero.removeAttribute(HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE);

    const headlineLines = [...hero.querySelectorAll<HTMLElement>(
      "[data-hero-heading-line-inner]",
    )];
    const lead = hero.querySelector<HTMLElement>("[data-hero-lead]");
    const actions = hero.querySelector<HTMLElement>("[data-hero-actions]");
    const portrait = hero.querySelector<HTMLElement>("[data-hero-portrait]");
    const header = hero.querySelector<HTMLElement>(
      '[data-header-instance="hero"]',
    );
    const headerInner = header?.querySelector<HTMLElement>(
      "[data-header-motion-inner]",
    );
    if (
      headlineLines.length !== 2
      || !lead
      || !actions
    ) {
      clearAnimatedState(hero, controller);
      controller.dataset.state = "incomplete";
      publishRevealSettled();
      return undefined;
    }

    const reduceMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    ).matches;
    const forcedColors = window.matchMedia("(forced-colors: active)").matches;
    if (reduceMotion || forcedColors) {
      clearAnimatedState(hero, controller);
      controller.dataset.state = reduceMotion
        ? "reduced-motion"
        : "forced-colors";
      publishRevealSettled();
      return undefined;
    }

    let cancelled = false;
    let started = false;
    let timeline: gsap.core.Timeline | null = null;
    const context = gsap.context(() => undefined, hero);
    const preparationStyles = new Map<
      HTMLElement,
      Map<string, { value: string; priority: string }>
    >();
    const prepareStyles = (
      target: HTMLElement,
      properties: Record<string, string>,
    ) => {
      const original = new Map<string, { value: string; priority: string }>();
      for (const [property, value] of Object.entries(properties)) {
        original.set(property, {
          value: target.style.getPropertyValue(property),
          priority: target.style.getPropertyPriority(property),
        });
        target.style.setProperty(property, value);
      }
      preparationStyles.set(target, original);
      if (target._gsap) target._gsap.uncache = 1;
    };
    const prepareEntrance = (target: HTMLElement, x: number) => {
      prepareStyles(target, {
        opacity: "0",
        visibility: "hidden",
        transform: `translate(${x}px, 0px)`,
        "will-change": "transform,opacity",
      });
    };

    controller.dataset.phase = "waiting";
    controller.dataset.sequence = "portrait,promise,context,action,navigation";
    controller.dataset.state = "ready";

    // These entrance targets have no authored transform; the scene offset
    // belongs to their parent. Set the known hidden pose without asking
    // CSSPlugin to parse five transforms during hydration. GSAP reads the
    // prepared pose when the unchanged entrance actually starts.
    const copyTravel = Math.min(160, Math.max(72, window.innerWidth * 0.11));
    const portraitTravel = Math.min(220, Math.max(92, window.innerWidth * 0.14));
    hero.dataset.heroIntroMotion = "prepared";
    for (const line of headlineLines) prepareEntrance(line, -copyTravel);
    prepareEntrance(lead, -copyTravel * 0.68);
    prepareEntrance(actions, -copyTravel * 0.5);
    if (portrait) prepareEntrance(portrait, portraitTravel);
    if (header) {
      header.dataset.heroNavEntering = "true";
      if (headerInner) headerInner.inert = true;
      prepareStyles(header, {
        "--hero-nav-reveal-y": "-18px",
        "clip-path": "inset(0 0 100% 0)",
      });
    }

    const finishImmediately = (state = "static") => {
      if (cancelled) return;
      timeline?.kill();
      timeline = null;
      clearAnimatedState(hero, controller);
      controller.dataset.state = state;
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      publishRevealSettled();
    };

    const play = () => {
      if (started || cancelled) return;
      started = true;

      context.add(() => {
        const portraitVisible = Boolean(
          portrait && getComputedStyle(portrait).display !== "none",
        );
        const copyStart = portraitVisible ? 0.64 : 0;
        hero.dataset.heroIntroMotion = "enhanced";
        controller.dataset.phase = portraitVisible ? "portrait" : "promise";
        controller.dataset.sequence = portraitVisible
          ? "portrait,promise,context,action,navigation"
          : "promise,context,action,navigation";
        controller.dataset.state = "playing";

        timeline = gsap.timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            clearAnimatedState(hero, controller);
            hero.dataset.heroIntroMotion = "complete";
            controller.dataset.phase = "complete";
            controller.dataset.state = "complete";
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
            publishRevealSettled();
          },
        });

        if (portraitVisible && portrait) {
          timeline
            .addLabel("portrait", 0)
            .call(() => {
              controller.dataset.phase = "portrait";
            }, [], "portrait")
            .to(portrait, {
              autoAlpha: 1,
              duration: 0.18,
              ease: "power2.out",
            }, "portrait")
            .to(portrait, {
              duration: 1.08,
              ease: "power3.out",
              x: 0,
            }, "portrait");
        }

        timeline
          .addLabel("promise", copyStart)
          .call(() => {
            controller.dataset.phase = "promise";
          }, [], "promise")
          .to(headlineLines, {
            autoAlpha: 1,
            duration: 0.96,
            ease: "power3.out",
            stagger: 0.09,
            x: 0,
          }, "promise")
          .addLabel("context", copyStart + 0.42)
          .call(() => {
            controller.dataset.phase = "context";
          }, [], "context")
          .to(lead, {
            autoAlpha: 1,
            duration: 0.72,
            ease: "power3.out",
            x: 0,
          }, "context")
          .addLabel("action", copyStart + 0.64)
          .call(() => {
            controller.dataset.phase = "action";
          }, [], "action")
          .to(actions, {
            autoAlpha: 1,
            duration: 0.68,
            ease: "power3.out",
            x: 0,
          }, "action")
          .addLabel("navigation", copyStart + 1.06)
          .call(() => {
            controller.dataset.phase = "navigation";
          }, [], "navigation");

        if (header) {
          timeline.to(header, {
            "--hero-nav-reveal-y": "0px",
            clipPath: "inset(0 0 0% 0)",
            duration: 0.56,
            ease: "power3.out",
          }, "navigation");
        }

        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleResize, { passive: true });
      });
    };

    const handleScroll = () => {
      if (!timeline || window.scrollY < Math.min(160, hero.offsetHeight * 0.1)) {
        return;
      }
      timeline.progress(1);
    };

    const handleResize = () => {
      if (timeline) finishImmediately("resized");
    };

    const handleIntroComplete = (event: Event) => {
      const { fallback = false, skipped = false } = (
        event as CustomEvent<IntroCompleteDetail>
      ).detail ?? {};
      if (skipped || fallback) {
        started = true;
        finishImmediately(skipped ? "skipped" : "fallback");
        return;
      }
      // Prepared styles already cover the aperture. Start in the same task as
      // the veil handoff so the first visible frame belongs to this timeline.
      play();
    };

    window.addEventListener("home:intro-complete", handleIntroComplete);
    const handleRevealStart = () => play();
    window.addEventListener(HOMEPAGE_HERO_REVEAL_START_EVENT, handleRevealStart);
    if (hero.hasAttribute(HOMEPAGE_HERO_REVEAL_STARTED_ATTRIBUTE)) play();

    // The bootstrap can finish its CSS-only fallback without the React intro
    // ever dispatching an event. Release every prepared element in that case.
    const introStateObserver = new MutationObserver(() => {
      if (started || cancelled) return;
      const state = document.documentElement.dataset.homeIntroState;
      const skipped = document.documentElement.hasAttribute(
        HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
      );
      if (state === "fallback-complete" || state === "skip" || state === "complete") {
        started = true;
        finishImmediately(
          skipped || state === "skip" ? "skipped"
            : state === "fallback-complete" ? "fallback" : "already-complete",
        );
      }
    });
    introStateObserver.observe(document.documentElement, {
      attributeFilter: ["data-home-intro-state"],
      attributes: true,
    });

    const introState = document.documentElement.dataset.homeIntroState ?? "";
    if (!INTRO_OWNED_STATES.has(introState)) {
      const skipped = document.documentElement.hasAttribute(
        HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
      );
      if (introState === "fallback-complete" || introState === "skip" || introState === "complete") {
        started = true;
        finishImmediately(
          skipped || introState === "skip" ? "skipped"
            : introState === "fallback-complete" ? "fallback" : "already-complete",
        );
      } else {
        // No intro owns the viewport, as on a client navigation. A layout
        // effect still prepares the scene before the first paint.
        play();
      }
    }

    return () => {
      cancelled = true;
      window.removeEventListener("home:intro-complete", handleIntroComplete);
      window.removeEventListener(HOMEPAGE_HERO_REVEAL_START_EVENT, handleRevealStart);
      introStateObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      timeline?.kill();
      context.revert();
      // Direct preparation is outside GSAP's style saver. Restore only its
      // owned properties after reverting the timeline, including StrictMode
      // replay before the entrance has ever started.
      for (const [target, properties] of preparationStyles) {
        for (const [property, { value, priority }] of properties) {
          if (value) target.style.setProperty(property, value, priority);
          else target.style.removeProperty(property);
        }
        if (target._gsap) target._gsap.uncache = 1;
      }
      if (headerInner) headerInner.inert = false;
      header?.removeAttribute("data-hero-nav-entering");
      delete hero.dataset.heroIntroMotion;
      hero.removeAttribute(HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE);
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-hero-intro-reveal
      data-phase="loading"
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
