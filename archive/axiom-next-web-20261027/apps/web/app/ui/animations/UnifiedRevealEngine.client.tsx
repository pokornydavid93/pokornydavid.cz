"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { compileAnimation } from "./reveal/animationCompiler";
import type { RevealMode } from "./reveal/types";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type ScrollTriggerInstance = import("gsap/ScrollTrigger").ScrollTrigger;

const GROUP_SELECTOR = "[data-route-reveal-group]";
const GROUP_ITEM_SELECTOR = "[data-route-reveal-item]";
const GROUP_RULE_SELECTOR = "[data-route-reveal-rule]";
const GROUP_MEDIA_SELECTOR = "[data-route-reveal-media]";
const ITEM_SELECTOR = "[data-reveal-engine-item]";
const MOTION_CLEAR_PROPS =
  "opacity,rotationX,scale,transform,transformOrigin,transformPerspective,visibility,willChange,x,y,yPercent";

type RevealState = "entering" | "static" | "visible" | "waiting";

function getOwnedElements(group: HTMLElement, selector: string) {
  return Array.from(group.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.closest<HTMLElement>(GROUP_SELECTOR) === group,
  );
}

function setRevealState(
  element: HTMLElement,
  state: RevealState,
  progress?: number,
) {
  element.dataset.routeRevealState = state;

  if (progress === undefined) {
    delete element.dataset.routeRevealProgress;
    return;
  }

  element.dataset.routeRevealProgress = progress.toFixed(3);
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readMode(value: string | undefined): RevealMode {
  return value === "toggle" || value === "play" ? value : "once";
}

function uniqueElements(elements: HTMLElement[]) {
  return Array.from(new Set(elements));
}

function smoothScrollCatchUp(
  timeline: ReturnType<GsapStatic["timeline"]>,
  ease = "none",
) {
  const scrubTween = timeline.scrollTrigger?.getTween();
  if (!scrubTween) return;

  // Let fast wheel gestures unfold over the whole catch-up duration.
  scrubTween.vars.ease = ease;
  scrubTween.invalidate();
}

export default function UnifiedRevealEngine() {
  const pathname = usePathname();
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return undefined;
    // Recovery navigation must stay readable without waiting for a scroll reveal.
    if (
      /^\/test-jednoho-prijmu(?:\/|$)/u.test(pathname) ||
      document.querySelector('main[data-template="system"]') ||
      // The homepage's own controllers also own its footer. There is nothing
      // for this engine to animate: avoid importing/registering ScrollTrigger,
      // refreshing every other controller and observing the entire DOM.
      (pathname === "/" &&
        document.querySelector("[data-home-cinematic-flow]") &&
        !document.querySelector(`${GROUP_SELECTOR}, ${ITEM_SELECTOR}`))
    ) {
      controller.dataset.state = "static";
      controller.dataset.route = pathname;
      return undefined;
    }
    const excludesStagedMotion = pathname === "/" || /^\/(clanky|blog)(\/|$)/u.test(pathname);

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    controller.dataset.state = "loading";
    controller.dataset.route = pathname;

    const init = async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
        import("gsap/ScrollTrigger") as Promise<
          ScrollTriggerModule & { default?: ScrollTriggerStatic }
        >,
      ]);

      if (cancelled) return;

      const gsap = gsapModule.gsap ?? gsapModule.default;
      const ScrollTrigger =
        scrollTriggerModule.ScrollTrigger ?? scrollTriggerModule.default;

      if (!gsap || !ScrollTrigger) {
        controller.dataset.state = "unavailable";
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const groups = Array.from(
        document.querySelectorAll<HTMLElement>(GROUP_SELECTOR),
      );
      const declarativeItems = Array.from(
        document.querySelectorAll<HTMLElement>(ITEM_SELECTOR),
      ).filter((element) => !element.closest(GROUP_SELECTOR));
      const footer = document.querySelector<HTMLElement>(
        '[data-component="site-footer"]',
      );
      const homepageOwnsFooter = Boolean(
        document.querySelector("[data-home-cinematic-flow]"),
      );
      const matchMedia = gsap.matchMedia();
      const focusCleanups: Array<() => void> = [];

      const settleForFocus = (
        element: HTMLElement,
        settle: () => void,
      ) => {
        element.addEventListener("focusin", settle, {
          capture: true,
          once: true,
        });
        focusCleanups.push(() => {
          element.removeEventListener("focusin", settle, true);
        });
      };

      matchMedia.add(
        {
          compact: "(max-width: 899px)",
          desktop: "(min-width: 900px)",
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
          const isDesktop = Boolean(conditions.desktop);
          const useStaticMotion = Boolean(
            conditions.reducedMotion || conditions.forcedColors,
          );
          const stagedFocusCleanups: Array<() => void> = [];

          const setStatic = (elements: HTMLElement[]) => {
            if (elements.length === 0) return;
            gsap.set(elements, {
              autoAlpha: 1,
              clearProps: MOTION_CLEAR_PROPS,
            });
          };

          if (useStaticMotion) {
            for (const group of groups) {
              const items = getOwnedElements(group, GROUP_ITEM_SELECTOR);
              const rules = getOwnedElements(group, GROUP_RULE_SELECTOR);
              const media = getOwnedElements(group, GROUP_MEDIA_SELECTOR);
              setStatic(items.length > 0 ? items : [group]);
              setStatic(rules);
              setStatic(media);
              setRevealState(group, "static", 1);
            }

            for (const element of declarativeItems) {
              const scope = element.dataset.revealScope;
              const targets = scope
                ? Array.from(element.querySelectorAll<HTMLElement>(scope))
                : [element];
              setStatic(targets.length > 0 ? targets : [element]);
              element.dataset.revealState = "static";
            }

            if (footer && !homepageOwnsFooter) {
              const blocks = Array.from(
                footer.querySelectorAll<HTMLElement>(
                  ':scope > [data-layout="container"] > *',
                ),
              );
              setStatic(blocks);
              setRevealState(footer, "static", 1);
            }

            controller.dataset.mode = isDesktop ? "cinematic" : "compact";
            controller.dataset.profile = "unified-editorial-depth";
            controller.dataset.state = conditions.reducedMotion
              ? "reduced-motion"
              : "forced-colors";
            return;
          }

          for (const [index, group] of groups.entries()) {
            const ownedItems = getOwnedElements(group, GROUP_ITEM_SELECTOR);
            const rules = getOwnedElements(group, GROUP_RULE_SELECTOR);
            const media = getOwnedElements(group, GROUP_MEDIA_SELECTOR);
            const isRow = group.dataset.routeRevealGroup === "row";
            // Opt in by scene, keeping the existing choreography on other routes.
            const usesStagedReveal = !excludesStagedMotion && group.closest<HTMLElement>(
              "[data-route-reveal-profile]",
            )?.dataset.routeRevealProfile === "staged";
            // A frame may own only rules while its children reveal independently.
            // Never transform that frame and its nested content at the same time.
            const items = ownedItems.length > 0
              ? ownedItems
              : usesStagedReveal && rules.length > 0 ? [] : [group];
            const preservesScale = group.dataset.routeRevealScale === "none";
            const preservesTransform =
              group.dataset.routeRevealTransform === "none";
            const allTargets = uniqueElements([...rules, ...items, ...media]);
            const stagedEndRatio = isRow
              ? (isDesktop ? 0.6 : 0.62)
              : (isDesktop ? 0.56 : 0.6);
            // Above-the-fold copy is already in the reading area on arrival.
            // A clamped zero-length trigger must never hide it until the first scroll.
            if (usesStagedReveal &&
              group.getBoundingClientRect().top + window.scrollY < window.innerHeight * stagedEndRatio
            ) {
              setStatic(allTargets);
              setRevealState(group, "visible", 1);
              continue;
            }
            const travel = preservesTransform
              ? 0
              : usesStagedReveal
                ? (isDesktop ? (isRow ? 64 : 80) : (isRow ? 44 : 52))
                : isDesktop
                  ? (isRow ? 54 : 72)
                  : (isRow ? 28 : 38);
            const initialScale = preservesScale || preservesTransform
              ? 1
              : usesStagedReveal
                ? (isDesktop ? 0.97 : 0.98)
                : isDesktop
                ? isRow
                  ? 0.988
                  : 0.975
                : 0.992;
            const initialRotation = preservesTransform
              ? 0
              : usesStagedReveal
                ? (isDesktop ? 12 : 8)
                : isDesktop
                ? isRow
                  ? 2.5
                  : 5
                : 0;
            const depthFor = (target: HTMLElement) => {
              if (!usesStagedReveal) return 1;
              switch (target.dataset.routeRevealItem) {
                case "meta": return 0.65;
                case "body": return 0.72;
                case "control": return 0.55;
                case "detail": return 0.85;
                default: return 1;
              }
            };
            const stagger = usesStagedReveal
              ? Math.min(isDesktop ? 0.06 : 0.045, 0.24 / Math.max(1, items.length - 1))
              : isDesktop ? 0.11 : 0.065;

            if (rules.length > 0) {
              gsap.set(rules, {
                opacity: usesStagedReveal ? 0.16 : 0.08,
                scaleX: usesStagedReveal ? 0.22 : 0,
                transformOrigin: "0% 50%",
                willChange: "transform, opacity",
              });
            }

            if (items.length > 0) {
              gsap.set(items, {
                opacity: 0,
                force3D: true,
                rotationX: (_: number, target: HTMLElement) => initialRotation * depthFor(target),
                scale: initialScale,
                transformOrigin: usesStagedReveal || !isDesktop ? "0% 100%" : "50% 100%",
                transformPerspective: 1_100,
                willChange: "transform, opacity",
                y: (_: number, target: HTMLElement) => travel * depthFor(target),
              });
            }

            if (media.length > 0) {
              gsap.set(media, {
                force3D: true,
                scale: isDesktop ? 1.045 : 1.02,
                transformOrigin: "50% 50%",
                willChange: "transform",
                yPercent: isDesktop ? 3.5 : 1.5,
              });
            }

            setRevealState(group, "waiting", 0);

            const syncProgress = (progress: number) => {
              if (progress >= 0.995) {
                setRevealState(group, "visible", 1);
              } else if (progress <= 0.005) {
                setRevealState(group, "waiting", 0);
              } else {
                setRevealState(group, "entering", progress);
              }
            };
            const syncTriggerProgress = (trigger: ScrollTriggerInstance) => {
              if (usesStagedReveal && group.contains(document.activeElement)) {
                // Native focus scrolling can restart the scrub after focusin.
                // Stop it after ScrollTrigger updates, keeping the focused copy readable.
                trigger.getTween()?.pause();
                trigger.animation?.progress(1);
                setRevealState(group, "visible", 1);
                return;
              }
              syncProgress(trigger.progress);
            };

            const timeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                end: usesStagedReveal
                  ? isRow
                    ? (isDesktop ? "clamp(top 60%)" : "clamp(top 62%)")
                    : (isDesktop ? "clamp(top 56%)" : "clamp(top 60%)")
                  : isRow
                    ? (isDesktop ? "clamp(top 58%)" : "clamp(top 64%)")
                    : (isDesktop ? "clamp(top 38%)" : "clamp(top 54%)"),
                id: `unified-reveal-group-${index + 1}`,
                invalidateOnRefresh: true,
                onLeave: () => setRevealState(group, "visible", 1),
                onLeaveBack: (self) => usesStagedReveal
                  ? syncTriggerProgress(self)
                  : setRevealState(group, "waiting", 0),
                onRefresh: syncTriggerProgress,
                onUpdate: syncTriggerProgress,
                refreshPriority: index,
                scrub: usesStagedReveal
                  ? (isDesktop ? 0.5 : 0.36)
                  : (isDesktop ? 0.85 : 0.5),
                start: usesStagedReveal
                  ? "clamp(top 100%)"
                  : (isDesktop ? "clamp(top 88%)" : "clamp(top 92%)"),
                trigger: group,
              },
            });

            timeline.addLabel("signal", 0);

            if (rules.length > 0) {
              timeline.to(
                rules,
                {
                  duration: usesStagedReveal ? 0.9 : isDesktop ? 1.12 : 0.84,
                  ease: usesStagedReveal ? "power1.out" : "power3.inOut",
                  opacity: 0.72,
                  scaleX: 1,
                },
                "signal",
              );
            }

            timeline.addLabel(
              "content",
              rules.length > 0 && !usesStagedReveal ? (isDesktop ? 0.14 : 0.08) : 0,
            );
            if (items.length > 0) {
              if (usesStagedReveal) {
                // Reading becomes possible before the longer spatial movement
                // finishes. Keep that movement visible throughout the scroll.
                timeline.to(items, {
                  opacity: 1,
                  duration: 0.58,
                  ease: "power1.out",
                  stagger,
                }, "content");
              }
              timeline.to(
                items,
                {
                  ...(!usesStagedReveal ? { opacity: 1 } : {}),
                  duration: usesStagedReveal ? 1 : isDesktop ? 1.18 : 0.84,
                  ease: usesStagedReveal ? "power1.inOut" : "power2.inOut",
                  rotationX: 0,
                  scale: 1,
                  stagger,
                  y: 0,
                },
                "content",
              );
            }

            if (media.length > 0) {
              timeline.to(
                media,
                {
                  duration: usesStagedReveal ? 1 : isDesktop ? 1.36 : 0.9,
                  ease: usesStagedReveal ? "power1.out" : "power2.inOut",
                  scale: 1,
                  yPercent: 0,
                },
                usesStagedReveal ? "content" : "content+=0.08",
              );
            }

            timeline.set(allTargets, { willChange: "auto" });
            smoothScrollCatchUp(timeline, usesStagedReveal ? "power2.out" : "none");
            if (usesStagedReveal) {
              // A filtered list can rebuild at any scroll position. Restore its
              // actual progress before paint instead of flashing through zero.
              timeline.progress(group.contains(document.activeElement)
                ? 1
                : timeline.scrollTrigger?.progress ?? 0);
            }
            const holdForFocus = () => {
              timeline.scrollTrigger?.getTween()?.pause();
              timeline.progress(1);
              if (usesStagedReveal) setRevealState(group, "visible", 1);
            };
            if (usesStagedReveal) {
              let releaseFrame = 0;
              const releaseFocus = () => {
                window.cancelAnimationFrame(releaseFrame);
                releaseFrame = window.requestAnimationFrame(() => {
                  if (group.contains(document.activeElement)) return;
                  const progress = timeline.scrollTrigger?.progress ?? 0;
                  timeline.scrollTrigger?.getTween()?.pause();
                  timeline.progress(progress);
                  syncProgress(progress);
                });
              };
              group.addEventListener("focusin", holdForFocus, true);
              group.addEventListener("focusout", releaseFocus, true);
              if (group.contains(document.activeElement)) holdForFocus();
              stagedFocusCleanups.push(() => {
                window.cancelAnimationFrame(releaseFrame);
                group.removeEventListener("focusin", holdForFocus, true);
                group.removeEventListener("focusout", releaseFocus, true);
              });
            } else {
              settleForFocus(group, holdForFocus);
            }
          }

          for (const [index, element] of declarativeItems.entries()) {
            if (element.dataset.revealDisabled === "true") {
              setStatic([element]);
              element.dataset.revealState = "static";
              continue;
            }

            const scope = element.dataset.revealScope;
            let scopedTargets: HTMLElement[] = [];
            if (scope) {
              try {
                scopedTargets = Array.from(
                  element.querySelectorAll<HTMLElement>(scope),
                );
              } catch {
                scopedTargets = [];
              }
            }
            const targets = scopedTargets.length > 0 ? scopedTargets : [element];
            const offset = readNumber(
              element.dataset.revealOffset,
              isDesktop ? 72 : 38,
            );
            const compiled = compileAnimation(
              element.dataset.revealAnimation ?? "bottom",
              { offset: isDesktop ? offset : Math.min(offset * 0.56, 42) },
            );
            const mode = readMode(element.dataset.revealMode);
            const duration = readNumber(
              element.dataset.revealDuration,
              isDesktop ? 0.86 : 0.64,
            );
            const delay = readNumber(element.dataset.revealDelay, 0);
            const stagger = readNumber(element.dataset.revealStagger, 0);
            const itemIndex = readNumber(element.dataset.revealIndex, 0);
            const ease = element.dataset.revealEase || "power4.out";
            const usesVerticalTravel = "y" in compiled.from;
            const from = {
              ...compiled.from,
              force3D: true,
              rotationX: usesVerticalTravel && isDesktop ? 3.5 : 0,
              scale: compiled.from.scale ?? (usesVerticalTravel ? 0.985 : 1),
              transformOrigin: "50% 100%",
              transformPerspective: 1_000,
              willChange: "transform, opacity",
            };
            const to = {
              ...compiled.to,
              rotationX: 0,
              scale: compiled.to.scale ?? 1,
            };

            gsap.set(targets, from);
            element.dataset.revealState = "waiting";

            const timeline = gsap.timeline({
              paused: true,
              onComplete: () => {
                element.dataset.revealState = "visible";
                gsap.set(targets, { clearProps: "willChange" });
              },
              onReverseComplete: () => {
                element.dataset.revealState = "waiting";
              },
            });

            timeline.to(
              targets,
              {
                ...to,
                delay: delay + itemIndex * stagger,
                duration,
                ease,
                stagger,
              },
              0,
            );

            const play = () => {
              element.dataset.revealState = "entering";
              timeline.play();
            };
            const reverse = () => {
              element.dataset.revealState = "entering";
              timeline.reverse();
            };
            let hasPlayed = false;

            ScrollTrigger.create({
              id: `unified-reveal-item-${index + 1}`,
              invalidateOnRefresh: true,
              markers: element.dataset.revealDebug === "true",
              onEnter: () => {
                if (mode === "once" && hasPlayed) return;
                hasPlayed = true;
                play();
              },
              onEnterBack: () => {
                if (mode === "once" && hasPlayed) return;
                hasPlayed = true;
                play();
              },
              onLeave: () => {
                if (mode === "toggle") reverse();
              },
              onLeaveBack: () => {
                if (mode === "toggle") reverse();
              },
              refreshPriority: groups.length + index,
              start: element.dataset.revealStart || "top 90%",
              trigger: element,
            });

            settleForFocus(element, () => {
              hasPlayed = true;
              timeline.progress(1);
              element.dataset.revealState = "visible";
            });
          }

          if (footer && !homepageOwnsFooter) {
            const footerInner = footer.querySelector<HTMLElement>(
              '[data-layout="container"]',
            );
            const footerBlocks = footerInner
              ? Array.from(footerInner.children).filter(
                  (child): child is HTMLElement =>
                    child instanceof HTMLElement,
                )
              : [];

            if (footerBlocks.length > 0) {
              gsap.set(footerBlocks, {
                opacity: 0.2,
                force3D: true,
                scale: isDesktop ? 0.985 : 0.995,
                transformOrigin: "50% 100%",
                willChange: "transform, opacity",
                y: isDesktop ? 42 : 24,
              });
              setRevealState(footer, "waiting", 0);

              const syncFooterProgress = (progress: number) => {
                if (progress >= 0.995) {
                  setRevealState(footer, "visible", 1);
                } else if (progress <= 0.005) {
                  setRevealState(footer, "waiting", 0);
                } else {
                  setRevealState(footer, "entering", progress);
                }
              };

              const footerTimeline = gsap
                .timeline({
                  defaults: { ease: "none" },
                  scrollTrigger: {
                    end: isDesktop
                      ? "clamp(bottom 60%)"
                      : "clamp(bottom 68%)",
                    id: "unified-reveal-footer",
                    invalidateOnRefresh: true,
                    onLeave: () => setRevealState(footer, "visible", 1),
                    onLeaveBack: () => setRevealState(footer, "waiting", 0),
                    onRefresh: (self) => syncFooterProgress(self.progress),
                    onUpdate: (self) => syncFooterProgress(self.progress),
                    refreshPriority: groups.length + declarativeItems.length,
                    scrub: isDesktop ? 0.85 : 0.5,
                    start: isDesktop
                      ? "clamp(top 90%)"
                      : "clamp(top 94%)",
                    trigger: footer,
                  },
                })
                .to(footerBlocks, {
                  opacity: 1,
                  duration: 1,
                  ease: "power4.out",
                  scale: 1,
                  stagger: 0.09,
                  y: 0,
                })
                .set(footerBlocks, { willChange: "auto" });
              smoothScrollCatchUp(footerTimeline);
            }
          }

          controller.dataset.mode = isDesktop ? "cinematic" : "compact";
          controller.dataset.profile = "unified-editorial-depth";
          controller.dataset.state = "ready";
          return () => {
            for (const removeListener of stagedFocusCleanups) removeListener();
          };
        },
      );

      const handleRefresh = () => ScrollTrigger.refresh();
      let rescanFrame = 0;
      const revealObserver = new MutationObserver(() => {
        const nextGroups = Array.from(
          document.querySelectorAll<HTMLElement>(GROUP_SELECTOR),
        );
        const nextItems = Array.from(
          document.querySelectorAll<HTMLElement>(ITEM_SELECTOR),
        ).filter((element) => !element.closest(GROUP_SELECTOR));

        if (
          nextGroups.length === groups.length &&
          nextGroups.every((group, index) => group === groups[index]) &&
          nextItems.length === declarativeItems.length &&
          nextItems.every((item, index) => item === declarativeItems[index])
        ) {
          return;
        }

        window.cancelAnimationFrame(rescanFrame);
        rescanFrame = window.requestAnimationFrame(() => {
          if (cancelled) return;

          cleanup?.();
          cleanup = undefined;
          controller.dataset.state = "loading";
          void init().catch(() => {
            if (!cancelled) controller.dataset.state = "unavailable";
          });
        });
      });

      window.addEventListener("handoff:refresh", handleRefresh);
      revealObserver.observe(document.body, { childList: true, subtree: true });

      cleanup = () => {
        window.cancelAnimationFrame(rescanFrame);
        revealObserver.disconnect();
        window.removeEventListener("handoff:refresh", handleRefresh);
        for (const removeListener of focusCleanups) removeListener();
        matchMedia.revert();
        for (const group of groups) {
          delete group.dataset.routeRevealProgress;
          delete group.dataset.routeRevealState;
        }
        for (const element of declarativeItems) {
          delete element.dataset.revealState;
        }
        if (footer && !homepageOwnsFooter) {
          delete footer.dataset.routeRevealProgress;
          delete footer.dataset.routeRevealState;
        }
        ScrollTrigger.refresh();
      };

      controller.dataset.groups = String(groups.length);
      controller.dataset.items = String(declarativeItems.length);
      document.documentElement.dataset.revealEngine = "unified";

      window.requestAnimationFrame(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
    };

    const frame = window.requestAnimationFrame(() => {
      void init().catch(() => {
        if (!cancelled) controller.dataset.state = "unavailable";
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      cleanup?.();
      delete document.documentElement.dataset.revealEngine;
      delete controller.dataset.groups;
      delete controller.dataset.items;
      delete controller.dataset.mode;
      delete controller.dataset.profile;
      delete controller.dataset.route;
    };
  }, [pathname]);

  return (
    <span
      aria-hidden="true"
      data-route-editorial-reveal
      data-state="loading"
      data-unified-reveal-engine
      hidden
      ref={controllerRef}
    />
  );
}
