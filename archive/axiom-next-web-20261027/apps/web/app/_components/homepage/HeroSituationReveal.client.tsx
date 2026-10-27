"use client";

import { useEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import {
  getViewportCoverCircle,
  HOME_CIRCLE_REVEAL_EASE,
  HOME_CIRCLE_REVEAL_SPAN,
} from "./homeCircleReveal";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

const TRANSITION_TARGET_SELECTOR = "[data-hero-transition-target]";
const HANDOFF_DURATION = 1.9;
const CIRCLE_REVEAL_END = HOME_CIRCLE_REVEAL_SPAN;
const STRUCTURE_REVEAL_START = 0.42;
const PORTRAIT_REVEAL_START = 0.5;
const HEADLINE_REVEAL_START = 0.64;
const COPY_REVEAL_START = 1.03;
const MOTION_SETTLED_AT = HANDOFF_DURATION;
const DOORWAY_REVEAL_DURATION = 0.32;
const HANDOFF_ACTIVE_EPSILON = 0.001;
const AUTOPLAY_INTENT_GRACE_MS = 160;
const AUTOPLAY_LANDING_GUARD_MS = 420;
const AUTOPLAY_TRIGGER_OVERSCAN = 32;
const AUTOPLAY_WHEEL_THRESHOLD = 4;

type ProfilePhase =
  | "circle"
  | "structure"
  | "portrait"
  | "headline"
  | "copy"
  | "complete";
type AutoplayState =
  | "hero"
  | "tracking"
  | "settling-forward"
  | "settling-reverse"
  | "profile";
type AutoplayDirection = -1 | 1;
type AutoplayDriver = "lenis" | "native";
type HeroPresentation = "interactive" | "frozen" | "hidden";

function getProfilePhase(progress: number): ProfilePhase {
  if (progress < STRUCTURE_REVEAL_START / HANDOFF_DURATION) return "circle";
  if (progress < PORTRAIT_REVEAL_START / HANDOFF_DURATION) return "structure";
  if (progress < HEADLINE_REVEAL_START / HANDOFF_DURATION) return "portrait";
  if (progress < COPY_REVEAL_START / HANDOFF_DURATION) return "headline";
  if (progress < MOTION_SETTLED_AT / HANDOFF_DURATION) return "copy";
  return "complete";
}

export default function HeroProfileHandoff() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const hero = controller?.closest<HTMLElement>("[data-cinematic-home-hero]");
    const target = document.querySelector<HTMLElement>(TRANSITION_TARGET_SELECTOR);

    if (!controller || !hero || !target) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let resizeLandingFrame = 0;
    const onViewportResize = () => {
      if (controller.dataset.playbackState !== "idle-profile") return;
      if (resizeLandingFrame) {
        window.cancelAnimationFrame(resizeLandingFrame);
      }
      resizeLandingFrame = window.requestAnimationFrame(() => {
        resizeLandingFrame = window.requestAnimationFrame(() => {
          resizeLandingFrame = 0;
          if (cancelled) return;
          const landing = hero.offsetHeight + 1;
          const lenis = window.__lenis;
          if (lenis?.scrollTo) {
            lenis.scrollTo(landing, {
              force: true,
              immediate: true,
            });
          } else {
            window.scrollTo(0, landing);
          }
        });
      });
    };
    window.addEventListener("resize", onViewportResize, { passive: true });

    const init = async () => {
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
      if (!gsap || !ScrollTrigger) return;

      gsap.registerPlugin(ScrollTrigger);

      const matchMedia = gsap.matchMedia();
      matchMedia.add(
        {
          cinematicViewport: "(min-width: 1041px)",
          naturalViewport: "(max-width: 1040px)",
          finePointer: "(hover: hover) and (pointer: fine)",
          reducedMotion: DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
          forcedColors: "(forced-colors: active)",
        },
        (mediaContext) => {
          const conditions = mediaContext.conditions as {
            cinematicViewport?: boolean;
            naturalViewport?: boolean;
            finePointer?: boolean;
            reducedMotion?: boolean;
            forcedColors?: boolean;
          };
          const cinematic =
            conditions.cinematicViewport
            && conditions.finePointer
            && !conditions.reducedMotion
            && !conditions.forcedColors;

          if (!cinematic) {
            gsap.set(target, {
              clearProps:
                "clipPath,minHeight,position,transform,transformOrigin,willChange,zIndex",
            });
            gsap.set(hero, {
              clearProps: "pointerEvents,visibility",
            });
            controller.dataset.scenePhase = "static";
            controller.dataset.reveal = "static";
            controller.dataset.state = conditions.reducedMotion
              ? "reduced-motion"
              : conditions.forcedColors
                ? "forced-colors"
                : "natural-flow";
            controller.dataset.autoplayState = "bypassed";
            controller.dataset.playbackState = "bypassed";
            controller.dataset.active = "false";
            target.dataset.profileHandoffAutoplayState = "bypassed";
            target.dataset.profileHandoffMode =
              conditions.reducedMotion || conditions.forcedColors
                ? "static"
                : "natural-flow";
            target.dataset.profileHandoffPlaybackState = "bypassed";
            hero.removeAttribute("data-hero-handoff-frozen");
            delete target.dataset.heroTransitionLayer;
            hero.inert = false;
            target.inert = false;

            return () => {
              delete controller.dataset.active;
              delete controller.dataset.autoplayState;
              delete controller.dataset.playbackState;
              delete controller.dataset.scenePhase;
              delete controller.dataset.reveal;
              delete controller.dataset.state;
              delete target.dataset.profileHandoffAutoplayState;
              delete target.dataset.profileHandoffMode;
              delete target.dataset.profileHandoffPlaybackState;
              hero.inert = false;
              target.inert = false;
            };
          }

          const initializationScrollY = window.scrollY;
          let initialScrollRestoreFrame = 0;
          const context = gsap.context(() => {
            const portraitFrame = target.querySelector<HTMLElement>(
              "[data-profile-portrait-frame]",
            );
            const portraitMedia = target.querySelector<HTMLElement>(
              "[data-profile-portrait-media]",
            );
            const portraitReveal = portraitFrame ?? portraitMedia;
            const heading = target.querySelector<HTMLElement>(
              "[data-profile-heading]",
            );
            const headingLines = Array.from(
              target.querySelectorAll<HTMLElement>("[data-profile-title-line]"),
            );
            const headingLineInks = Array.from(
              target.querySelectorAll<HTMLElement>(
                "[data-profile-title-line-ink]",
              ),
            );
            const headlineMotionTargets = [
              heading,
              ...headingLines,
              ...headingLineInks,
            ].filter(
              (item): item is HTMLElement => Boolean(item),
            );
            const leadStory = target.querySelector<HTMLElement>(
              '[data-profile-story="lead"]',
            );
            const trust = target.querySelector<HTMLElement>(
              "[data-profile-detail]",
            );
            const quote = target.querySelector<HTMLElement>(
              "[data-profile-quote]",
            );
            const quoteCopy = target.querySelector<HTMLElement>(
              "[data-profile-quote-copy]",
            );
            const quoteSentences = Array.from(
              target.querySelectorAll<HTMLElement>(
                "[data-profile-quote-sentence-ink]",
              ),
            );
            const introductionInk = target.querySelector<HTMLElement>(
              "[data-profile-introduction-ink]",
            );
            const narrativeRule = target.querySelector<HTMLElement>(
              "[data-profile-narrative-rule]",
            );
            const quoteRule = target.querySelector<HTMLElement>(
              "[data-profile-quote-rule]",
            );
            const metaRule = target.querySelector<HTMLElement>(
              "[data-profile-meta-rule]",
            );
            const aboutLink = target.querySelector<HTMLElement>(
              "[data-profile-about-link]",
            );
            const aboutIcon = target.querySelector<HTMLElement>(
              "[data-profile-about-icon]",
            );
            const narrative = [
              leadStory,
              quote,
              trust,
            ].filter((item): item is HTMLElement => Boolean(item));
            const animatedCopy = [
              ...headlineMotionTargets,
              ...narrative,
              aboutLink,
              quoteCopy,
              ...quoteSentences,
              introductionInk,
              narrativeRule,
              quoteRule,
              metaRule,
              aboutIcon,
            ].filter((item): item is HTMLElement => Boolean(item));
            const animatedPortrait = [
              portraitReveal,
              portraitMedia,
            ].filter((item): item is HTMLElement => Boolean(item));

            let heroPresentation: HeroPresentation | null = null;
            let profilePhase: ProfilePhase | null = null;
            let autoplayState: AutoplayState | null = null;
            const setHeroPresentation = (presentation: HeroPresentation) => {
              if (heroPresentation === presentation) return;
              heroPresentation = presentation;
              hero.inert = presentation !== "interactive";
              target.inert = presentation !== "hidden";
              gsap.set(hero, {
                pointerEvents:
                  presentation === "interactive" ? "auto" : "none",
                visibility: presentation === "hidden" ? "hidden" : "visible",
              });
            };
            const setPhase = (phase: ProfilePhase) => {
              if (profilePhase === phase) return;
              profilePhase = phase;
              controller.dataset.scenePhase = phase;
              target.dataset.profileHandoffPhase = phase;
            };
            const setAutoplayState = (state: AutoplayState) => {
              if (autoplayState === state) return;
              autoplayState = state;
              const playbackState = state === "hero"
                ? "idle-hero"
                : state === "profile"
                  ? "idle-profile"
                  : state === "settling-forward"
                    ? "autoplay-forward"
                    : state === "settling-reverse"
                      ? "autoplay-reverse"
                      : "tracking";

              controller.dataset.autoplayState = state;
              controller.dataset.playbackState = playbackState;
              target.dataset.profileHandoffAutoplayState = state;
              target.dataset.profileHandoffPlaybackState = playbackState;
            };
            const readCircleGeometry = () => {
              const width = document.documentElement.clientWidth || window.innerWidth;
              const height = window.innerHeight;

              return getViewportCoverCircle(width, height, {
                x: 0.5,
                y: 1,
              });
            };
            const syncTargetGeometry = () => {
              gsap.set(target, {
                minHeight: `${Math.max(hero.offsetHeight, window.innerHeight)}px`,
              });
            };

            syncTargetGeometry();
            gsap.set(target, {
              clipPath: () => readCircleGeometry().start,
              force3D: true,
              position: "relative",
              transformOrigin: "50% 50%",
              willChange: "transform, clip-path",
              y: () => -hero.offsetHeight,
              zIndex: 8,
            });
            if (portraitReveal) {
              gsap.set(portraitReveal, {
                opacity: 0,
                visibility: "hidden",
                willChange: "transform, opacity",
                y: 38,
              });
            }
            if (portraitMedia) {
              gsap.set(portraitMedia, {
                clipPath: "inset(100% 0% 0% 0%)",
                scale: 0.985,
                transformOrigin: "50% 100%",
                willChange: "clip-path, transform",
                y: 30,
              });
            }
            if (heading) {
              gsap.set(heading, {
                opacity: 0,
                willChange: "transform, opacity",
              });
            }
            if (headingLineInks.length > 0) {
              gsap.set(headingLineInks, {
                clipPath: "inset(0% 0% 100% 0%)",
                opacity: 0,
                rotationX: -12,
                transformOrigin: "0% 100%",
                transformPerspective: 700,
                willChange: "transform, opacity",
                yPercent: 42,
              });
            }
            if (leadStory) {
              gsap.set(leadStory, {
                opacity: 0,
                willChange: "opacity",
              });
            }
            if (introductionInk) {
              gsap.set(introductionInk, {
                opacity: 0,
                willChange: "transform, opacity",
                yPercent: 108,
              });
            }
            if (narrativeRule) {
              gsap.set(narrativeRule, {
                opacity: 0.14,
                scaleX: 0,
                transformOrigin: "0% 50%",
                willChange: "transform, opacity",
              });
            }
            if (trust) {
              gsap.set(trust, {
                opacity: 0,
                willChange: "transform, opacity",
                y: 14,
              });
            }
            if (quote) {
              gsap.set(quote, {
                opacity: 0,
                willChange: "opacity",
              });
            }
            if (quoteSentences.length > 0) {
              gsap.set(quoteSentences, {
                opacity: 0,
                rotationX: -8,
                transformOrigin: "0% 100%",
                transformPerspective: 700,
                willChange: "transform, opacity",
                yPercent: 108,
              });
            }
            if (quoteRule) {
              gsap.set(quoteRule, {
                opacity: 0.2,
                scaleY: 0,
                transformOrigin: "50% 0%",
                willChange: "transform, opacity",
              });
            }
            if (metaRule) {
              gsap.set(metaRule, {
                opacity: 0.14,
                scaleX: 0,
                transformOrigin: "0% 50%",
                willChange: "transform, opacity",
              });
            }
            if (aboutLink) {
              gsap.set(aboutLink, {
                clipPath: "inset(0% 0% 100% 0%)",
                opacity: 0,
                willChange: "clip-path, transform, opacity",
                y: 18,
              });
            }
            if (aboutIcon) {
              gsap.set(aboutIcon, {
                opacity: 0,
                x: -6,
                willChange: "transform, opacity",
              });
            }
            setPhase("circle");
            setAutoplayState("hero");
            setHeroPresentation("interactive");
            controller.dataset.active = "false";

            let settleDirection: AutoplayDirection | null = null;
            let driverKind: AutoplayDriver | null = null;
            let nativeScrollTween: ReturnType<typeof gsap.to> | null = null;
            let lastIntent: {
              at: number;
              direction: AutoplayDirection;
            } | null = null;
            let queuedDriveFrame = 0;
            let refreshDriveFrame = 0;
            let profileLandingScrollY: number | null = null;
            let profileLandingGuardUntil = 0;
            let runId = 0;
            let timeline: ReturnType<typeof gsap.timeline> | null = null;

            const setDriverKind = (kind: AutoplayDriver | null) => {
              driverKind = kind;
              if (kind) {
                controller.dataset.autoplayDriver = kind;
              } else {
                delete controller.dataset.autoplayDriver;
              }
            };
            const syncIdleState = (progress: number) => {
              if (progress <= HANDOFF_ACTIVE_EPSILON) {
                profileLandingScrollY = null;
                profileLandingGuardUntil = 0;
                controller.dataset.active = "false";
                setAutoplayState("hero");
                setHeroPresentation("interactive");
                hero.removeAttribute("data-hero-handoff-frozen");
                return;
              }

              hero.setAttribute("data-hero-handoff-frozen", "");
              if (progress >= 1 - HANDOFF_ACTIVE_EPSILON) {
                const trigger = timeline?.scrollTrigger;
                if (
                  trigger
                  && Math.abs(window.scrollY - (trigger.end + 1))
                    <= AUTOPLAY_TRIGGER_OVERSCAN
                ) {
                  profileLandingScrollY = window.scrollY;
                }
                controller.dataset.active = "false";
                setAutoplayState("profile");
                setHeroPresentation("hidden");
                return;
              }

              controller.dataset.active = "true";
              setAutoplayState("tracking");
              setHeroPresentation("frozen");
            };
            const scrollImmediately = (destination: number) => {
              const lenis = window.__lenis;
              if (lenis?.scrollTo) {
                lenis.scrollTo(destination, {
                  force: true,
                  immediate: true,
                });
              } else {
                window.scrollTo(0, destination);
              }
            };
            const cancelOwnedDriver = () => {
              runId += 1;
              if (queuedDriveFrame) {
                window.cancelAnimationFrame(queuedDriveFrame);
                queuedDriveFrame = 0;
              }
              nativeScrollTween?.kill();
              nativeScrollTween = null;

              if (driverKind === "lenis") {
                window.__lenis?.scrollTo(window.scrollY, {
                  force: true,
                  immediate: true,
                });
              }
              setDriverKind(null);
            };
            const finishDrive = (
              token: number,
              direction: AutoplayDirection,
            ) => {
              if (token !== runId || settleDirection !== direction) return;
              const trigger = timeline?.scrollTrigger;
              if (!trigger) return;

              const landing = direction > 0
                ? trigger.start + hero.offsetHeight + 1
                : Math.max(0, trigger.start - 1);

              scrollImmediately(landing);
              ScrollTrigger.update();

              settleDirection = null;
              nativeScrollTween = null;
              lastIntent = null;
              setDriverKind(null);
              controller.dataset.active = "false";

              if (direction > 0) {
                profileLandingScrollY = landing;
                profileLandingGuardUntil =
                  window.performance.now() + AUTOPLAY_LANDING_GUARD_MS;
                hero.setAttribute("data-hero-handoff-frozen", "");
                setAutoplayState("profile");
                setHeroPresentation("hidden");
              } else {
                profileLandingScrollY = null;
                profileLandingGuardUntil = 0;
                hero.removeAttribute("data-hero-handoff-frozen");
                setAutoplayState("hero");
                setHeroPresentation("interactive");
              }
            };
            const introOwnsViewport = () => {
              const state = document.documentElement.dataset.homeIntroState;
              return state === "pending"
                || state === "active"
                || state === "fallback-exit";
            };
            const drive = (direction: AutoplayDirection) => {
              const trigger = timeline?.scrollTrigger;
              if (
                !trigger
                || introOwnsViewport()
                || document.body.hasAttribute("data-modal-open")
              ) {
                return;
              }

              cancelOwnedDriver();
              settleDirection = direction;
              if (direction < 0) {
                profileLandingScrollY = null;
                profileLandingGuardUntil = 0;
              }
              const token = ++runId;
              const destination = direction > 0
                ? trigger.end
                : trigger.start;
              const segment = Math.max(1, trigger.end - trigger.start);
              const remaining = Math.min(
                1,
                Math.abs(destination - window.scrollY) / segment,
              );
              const duration = gsap.utils.clamp(
                0.48,
                1.68,
                0.24 + 1.44 * remaining,
              );
              const complete = () => finishDrive(token, direction);

              controller.dataset.active = "true";
              setAutoplayState(
                direction > 0
                  ? "settling-forward"
                  : "settling-reverse",
              );
              setHeroPresentation("frozen");
              hero.setAttribute("data-hero-handoff-frozen", "");

              const lenis = window.__lenis;
              if (lenis?.scrollTo) {
                setDriverKind("lenis");
                lenis.scrollTo(destination, {
                  duration,
                  easing: gsap.parseEase("sine.inOut"),
                  force: true,
                  lock: true,
                  onComplete: complete,
                });
                return;
              }

              const scrollProxy = { y: window.scrollY };
              setDriverKind("native");
              nativeScrollTween = gsap.to(scrollProxy, {
                duration,
                ease: "sine.inOut",
                overwrite: true,
                y: destination,
                onUpdate: () => {
                  window.scrollTo(0, scrollProxy.y);
                  ScrollTrigger.update();
                },
                onComplete: complete,
              });
            };
            const claimIntent = (direction: AutoplayDirection) => {
              const trigger = timeline?.scrollTrigger;
              if (
                !trigger
                || introOwnsViewport()
                || document.body.hasAttribute("data-modal-open")
              ) {
                return false;
              }

              if (settleDirection !== null) {
                if (settleDirection !== direction) {
                  drive(direction);
                }
                return true;
              }

              const scrollY = window.scrollY;
              if (
                scrollY < trigger.start - AUTOPLAY_TRIGGER_OVERSCAN
                || scrollY > trigger.end + AUTOPLAY_TRIGGER_OVERSCAN
              ) {
                return false;
              }

              const progress = trigger.progress;
              if (
                (direction > 0 && progress >= 1 - HANDOFF_ACTIVE_EPSILON)
                || (direction < 0 && progress <= HANDOFF_ACTIVE_EPSILON)
              ) {
                if (direction > 0) {
                  profileLandingScrollY = null;
                  profileLandingGuardUntil = 0;
                }
                return false;
              }

              drive(direction);
              return true;
            };
            const queueDrive = (direction: AutoplayDirection) => {
              if (queuedDriveFrame) {
                window.cancelAnimationFrame(queuedDriveFrame);
              }
              queuedDriveFrame = window.requestAnimationFrame(() => {
                queuedDriveFrame = 0;
                drive(direction);
              });
            };
            const recordIntent = (direction: AutoplayDirection) => {
              lastIntent = {
                at: window.performance.now(),
                direction,
              };
            };
            const onWheelIntent = (event: WheelEvent) => {
              if (event.defaultPrevented || event.ctrlKey || introOwnsViewport()) {
                return;
              }

              const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 16
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                  ? window.innerHeight
                  : 1;
              const deltaX = event.deltaX * multiplier;
              const deltaY = event.deltaY * multiplier;
              if (
                deltaY === 0
                || Math.abs(deltaY) < Math.abs(deltaX)
              ) {
                return;
              }

              const direction: AutoplayDirection = deltaY > 0 ? 1 : -1;
              recordIntent(direction);
              if (
                Math.abs(deltaY) < AUTOPLAY_WHEEL_THRESHOLD
              ) {
                const isTrailingLandingIntent =
                  direction > 0
                  && settleDirection === null
                  && profileLandingScrollY !== null
                  && window.performance.now() <= profileLandingGuardUntil
                  && Math.abs(window.scrollY - profileLandingScrollY) <= 2;
                if (isTrailingLandingIntent) {
                  event.preventDefault();
                  return;
                }
                if (claimIntent(direction)) event.preventDefault();
                return;
              }
              if (claimIntent(direction)) event.preventDefault();
            };
            const isInteractiveTarget = (eventTarget: EventTarget | null) => {
              if (!(eventTarget instanceof HTMLElement)) return false;
              return Boolean(
                eventTarget.closest(
                  "a, button, input, textarea, select, summary, "
                    + "[contenteditable]:not([contenteditable='false']), "
                    + "[role='button'], [role='textbox']",
                ),
              );
            };
            const onKeyIntent = (event: KeyboardEvent) => {
              if (
                event.defaultPrevented
                || event.ctrlKey
                || event.metaKey
                || event.altKey
                || introOwnsViewport()
                || isInteractiveTarget(event.target)
              ) {
                return;
              }

              let direction: AutoplayDirection | null = null;
              if (
                event.key === "ArrowDown"
                || event.key === "PageDown"
                || (event.key === " " && !event.shiftKey)
              ) {
                direction = 1;
              } else if (
                event.key === "ArrowUp"
                || event.key === "PageUp"
                || (event.key === " " && event.shiftKey)
              ) {
                direction = -1;
              }

              if (direction === null) return;
              recordIntent(direction);
              if (claimIntent(direction)) event.preventDefault();
            };
            const onRefresh = () => {
              window.dispatchEvent(new Event("site-visual-layout-change"));
              const direction = settleDirection;
              const shouldRestoreProfileLanding =
                direction === null
                && profileLandingScrollY !== null
                && Math.abs(window.scrollY - profileLandingScrollY) <= 2;
              if (direction === null && !shouldRestoreProfileLanding) {
                const progress = timeline?.scrollTrigger?.progress;
                if (progress !== undefined) syncIdleState(progress);
              }
              if (direction === null && !shouldRestoreProfileLanding) return;
              if (refreshDriveFrame) {
                window.cancelAnimationFrame(refreshDriveFrame);
              }
              refreshDriveFrame = window.requestAnimationFrame(() => {
                refreshDriveFrame = 0;
                if (direction !== null && settleDirection === direction) {
                  drive(direction);
                  return;
                }
                if (
                  settleDirection === null
                  && profileLandingScrollY !== null
                  && Math.abs(window.scrollY - profileLandingScrollY) <= 2
                ) {
                  const trigger = timeline?.scrollTrigger;
                  if (!trigger) return;
                  const landing = trigger.end + 1;
                  scrollImmediately(landing);
                  profileLandingScrollY = landing;
                  ScrollTrigger.update();
                }
              });
            };
            const onNativePositionChange = () => {
              if (
                settleDirection === null
                && profileLandingScrollY !== null
                && Math.abs(window.scrollY - profileLandingScrollY) > 2
              ) {
                profileLandingScrollY = null;
                profileLandingGuardUntil = 0;
              }
            };

            timeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                anticipatePin: 1,
                end: () => `+=${hero.offsetHeight}`,
                id: "home-hero-profile-handoff",
                invalidateOnRefresh: true,
                onRefreshInit: syncTargetGeometry,
                pin: hero,
                pinSpacing: false,
                scrub: true,
                onRefresh,
                start: "top top",
                trigger: hero,
                onEnter: (self) => {
                  if (settleDirection === null) {
                    syncIdleState(self.progress);
                  }
                },
                onEnterBack: (self) => {
                  if (settleDirection === null) {
                    syncIdleState(self.progress);
                  }
                },
                onLeave: (self) => {
                  if (settleDirection === null) {
                    syncIdleState(self.progress);
                  }
                },
                onLeaveBack: (self) => {
                  if (settleDirection === null) {
                    syncIdleState(self.progress);
                  }
                },
                onUpdate: (self) => {
                  const progress = self.progress;
                  if (settleDirection === null) {
                    syncIdleState(progress);

                    if (
                      progress > HANDOFF_ACTIVE_EPSILON
                      && progress < 1 - HANDOFF_ACTIVE_EPSILON
                      && lastIntent
                    ) {
                      const intentAge =
                        window.performance.now() - lastIntent.at;
                      const direction = lastIntent.direction;
                      if (intentAge <= AUTOPLAY_INTENT_GRACE_MS) {
                        lastIntent = null;
                        queueDrive(direction);
                      } else {
                        lastIntent = null;
                      }
                    }
                  }
                  hero.toggleAttribute(
                    "data-hero-handoff-frozen",
                    progress > HANDOFF_ACTIVE_EPSILON,
                  );
                  controller.dataset.circleProgress = Math.min(
                    1,
                    progress / (CIRCLE_REVEAL_END / HANDOFF_DURATION),
                  ).toFixed(3);
                  controller.dataset.sceneProgress = progress.toFixed(3);
                  target.dataset.profileHandoffProgress = progress.toFixed(3);
                  setPhase(getProfilePhase(progress));
                },
              },
            });

            timeline.fromTo(target, {
              y: () => -hero.offsetHeight,
            }, {
              duration: HANDOFF_DURATION,
              immediateRender: true,
              y: 0,
            }, 0);
            timeline.fromTo(target, {
              clipPath: () => readCircleGeometry().start,
            }, {
              clipPath: () => readCircleGeometry().end,
              duration: CIRCLE_REVEAL_END,
              ease: HOME_CIRCLE_REVEAL_EASE,
              immediateRender: true,
            }, 0);
            timeline.set(target, { clipPath: "none" }, CIRCLE_REVEAL_END);
            timeline.addLabel("structure", STRUCTURE_REVEAL_START);
            timeline.addLabel("portrait", PORTRAIT_REVEAL_START);
            timeline.addLabel("identity", HEADLINE_REVEAL_START);
            timeline.addLabel("narrative", COPY_REVEAL_START - 0.07);
            timeline.addLabel("proof", 1.2);
            timeline.addLabel("resolve", 1.36);
            // Keep the last reveal inside the handoff duration. Extending the
            // timeline even by a frame changes its scroll-to-time ratio and
            // makes the full profile surface drift away from the viewport top.
            timeline.addLabel(
              "doorway",
              HANDOFF_DURATION - DOORWAY_REVEAL_DURATION,
            );

            if (portraitReveal) {
              timeline.set(
                portraitReveal,
                { visibility: "visible" },
                "portrait",
              );
              timeline.to(portraitReveal, {
                duration: 0.68,
                ease: "power4.out",
                opacity: 1,
                y: 0,
              }, "portrait");
            }
            if (portraitMedia) {
              timeline.to(portraitMedia, {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 0.88,
                ease: "power4.out",
                scale: 1,
                y: 0,
              }, "portrait+=0.02");
            }
            if (heading) {
              timeline.to(heading, {
                duration: 0.18,
                ease: "power2.out",
                opacity: 1,
              }, "identity");
            }
            if (headingLineInks.length > 0) {
              timeline.to(headingLineInks, {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 0.74,
                ease: "power4.out",
                opacity: 1,
                rotationX: 0,
                stagger: 0.06,
                yPercent: 0,
              }, "identity+=0.02");
            }
            if (narrativeRule) {
              timeline.to(narrativeRule, {
                duration: 0.84,
                ease: "power3.inOut",
                opacity: 0.68,
                scaleX: 1,
              }, "narrative-=0.04");
            }
            if (leadStory) {
              timeline.to(leadStory, {
                duration: 0.2,
                ease: "power2.out",
                opacity: 1,
              }, "narrative");
            }
            const storyInks = [introductionInk].filter(
              (item): item is HTMLElement => Boolean(item),
            );
            if (storyInks.length > 0) {
              timeline.to(storyInks, {
                duration: 0.62,
                ease: "power4.out",
                opacity: 1,
                stagger: 0.08,
                yPercent: 0,
              }, "narrative+=0.02");
            }
            if (quote) {
              timeline.to(quote, {
                duration: 0.18,
                ease: "power2.out",
                opacity: 1,
              }, "proof");
            }
            if (quoteRule) {
              timeline.to(quoteRule, {
                duration: 0.5,
                ease: "power3.inOut",
                opacity: 1,
                scaleY: 1,
              }, "proof");
            }
            if (quoteSentences.length > 0) {
              timeline.to(quoteSentences, {
                duration: 0.5,
                ease: "power4.out",
                opacity: 1,
                rotationX: 0,
                stagger: 0.06,
                yPercent: 0,
              }, "proof+=0.04");
            }
            if (metaRule) {
              timeline.to(metaRule, {
                duration: 0.42,
                ease: "power3.inOut",
                opacity: 0.64,
                scaleX: 1,
              }, "resolve");
            }
            if (trust) {
              timeline.to(trust, {
                duration: 0.42,
                ease: "power4.out",
                opacity: 1,
                y: 0,
              }, "resolve+=0.04");
            }
            if (aboutLink) {
              timeline.to(aboutLink, {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: DOORWAY_REVEAL_DURATION,
                ease: "power4.out",
                opacity: 1,
                y: 0,
              }, "doorway");
            }
            if (aboutIcon) {
              timeline.to(aboutIcon, {
                duration: 0.27,
                ease: "expo.out",
                opacity: 1,
                x: 0,
              }, "doorway+=0.02");
            }
            timeline.set(
              [
                ...animatedPortrait,
                ...animatedCopy,
              ].filter(Boolean),
              { willChange: "auto" },
              MOTION_SETTLED_AT,
            );
            timeline.set(target, { zIndex: "auto" }, HANDOFF_DURATION);

            const modalObserver = new MutationObserver(() => {
              if (
                !document.body.hasAttribute("data-modal-open")
                || settleDirection === null
              ) {
                return;
              }

              cancelOwnedDriver();
              settleDirection = null;
              const progress = timeline?.scrollTrigger?.progress ?? 0;
              syncIdleState(progress);
            });
            modalObserver.observe(document.body, {
              attributes: true,
              attributeFilter: ["data-modal-open"],
            });

            window.addEventListener("wheel", onWheelIntent, {
              capture: true,
              passive: false,
            });
            window.addEventListener("keydown", onKeyIntent, {
              capture: true,
            });
            window.addEventListener("scroll", onNativePositionChange, {
              passive: true,
            });

            controller.dataset.reveal = "circle";
            controller.dataset.drive = "intent-autoplay";
            controller.dataset.state = "ready";
            target.dataset.heroTransitionLayer = "true";
            target.dataset.profileHandoffDrive = "intent-autoplay";
            target.dataset.profileHandoffMode = "cinematic";

            return () => {
              window.removeEventListener("wheel", onWheelIntent, true);
              window.removeEventListener("keydown", onKeyIntent, true);
              window.removeEventListener("scroll", onNativePositionChange);
              modalObserver.disconnect();
              if (refreshDriveFrame) {
                window.cancelAnimationFrame(refreshDriveFrame);
                refreshDriveFrame = 0;
              }
              cancelOwnedDriver();
              settleDirection = null;
              timeline.scrollTrigger?.kill();
              timeline.kill();
              gsap.set(target, {
                clearProps:
                  "clipPath,minHeight,position,transform,transformOrigin,willChange,zIndex",
              });
              gsap.set(
                [
                  ...animatedPortrait,
                  ...animatedCopy,
                ].filter(Boolean),
                {
                  clearProps:
                    "clipPath,opacity,perspective,transform,transformOrigin,visibility,willChange",
                },
              );
              gsap.set(hero, {
                clearProps: "pointerEvents,visibility",
              });
              hero.removeAttribute("data-hero-handoff-frozen");
              delete controller.dataset.active;
              delete controller.dataset.autoplayDriver;
              delete controller.dataset.autoplayState;
              delete controller.dataset.circleProgress;
              delete controller.dataset.drive;
              delete controller.dataset.playbackState;
              delete controller.dataset.reveal;
              delete controller.dataset.scenePhase;
              delete controller.dataset.sceneProgress;
              delete controller.dataset.state;
              delete target.dataset.heroTransitionLayer;
              delete target.dataset.profileHandoffAutoplayState;
              delete target.dataset.profileHandoffDrive;
              delete target.dataset.profileHandoffMode;
              delete target.dataset.profileHandoffPhase;
              delete target.dataset.profileHandoffPlaybackState;
              delete target.dataset.profileHandoffProgress;
              hero.inert = false;
              target.inert = false;
            };
          }, hero);

          if (initializationScrollY > 2) {
            initialScrollRestoreFrame = window.requestAnimationFrame(() => {
              initialScrollRestoreFrame = 0;
              if (window.scrollY <= 2) {
                const lenis = window.__lenis;
                if (lenis?.scrollTo) {
                  lenis.scrollTo(initializationScrollY, {
                    force: true,
                    immediate: true,
                  });
                } else {
                  window.scrollTo(0, initializationScrollY);
                }
              }
              ScrollTrigger.update();
            });
          }

          return () => {
            if (initialScrollRestoreFrame) {
              window.cancelAnimationFrame(initialScrollRestoreFrame);
            }
            context.revert();
          };
        },
      );

      cleanup = () => {
        matchMedia.revert();
        ScrollTrigger.refresh();
      };
      ScrollTrigger.refresh();
    };

    const frame = window.requestAnimationFrame(() => {
      void init().catch(() => {
        controller.dataset.state = "natural-flow";
        controller.dataset.autoplayState = "bypassed";
        controller.dataset.playbackState = "bypassed";
        controller.dataset.scenePhase = "static";
        controller.dataset.reveal = "static";
        target.dataset.profileHandoffAutoplayState = "bypassed";
        target.dataset.profileHandoffMode = "natural-flow";
        target.dataset.profileHandoffPlaybackState = "bypassed";
        hero.inert = false;
        target.inert = false;
      });
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onViewportResize);
      window.cancelAnimationFrame(frame);
      if (resizeLandingFrame) {
        window.cancelAnimationFrame(resizeLandingFrame);
      }
      cleanup?.();
      hero.inert = false;
      target.inert = false;
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-hero-profile-handoff
      data-hero-situation-reveal
      data-circle-progress="0.000"
      data-autoplay-state="loading"
      data-playback-state="loading"
      data-reveal="loading"
      data-scene-phase="loading"
      data-scene-progress="0.000"
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
