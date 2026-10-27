"use client";

import { useEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { createReadableScrollFade } from "./readableScrollFade";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

const TARGET_SELECTOR = "[data-profile-situation-transition-target]";
const ENTRY_ID = "home-situations-editorial-entry";
const LEDGER_ROW_ID = "home-situations-ledger-row";

type EntryPhase = "waiting" | "intro" | "copy" | "ledger" | "complete";

function getEntryPhase(progress: number): EntryPhase {
  if (progress <= 0) return "waiting";
  if (progress < 0.28) return "intro";
  if (progress < 0.52) return "copy";
  if (progress < 1) return "ledger";
  return "complete";
}

export default function ProfileSituationReveal() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const flow = controller?.closest<HTMLElement>(
      "[data-hero-transition-flow]",
    );
    const target = flow?.querySelector<HTMLElement>(TARGET_SELECTOR);

    if (!controller || !flow || !target) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const setControllerState = (
      state: "forced-colors" | "natural-flow" | "ready" | "reduced-motion",
      phase: EntryPhase,
    ) => {
      const complete = phase === "complete";
      controller.dataset.active = "false";
      controller.dataset.drive = "natural-scroll";
      controller.dataset.entryState = complete ? "complete" : phase;
      controller.dataset.playbackState = state === "ready"
        ? "scroll-linked"
        : "static";
      controller.dataset.reveal = state === "ready"
        ? "editorial-rise"
        : "static";
      controller.dataset.scenePhase = phase;
      controller.dataset.sceneProgress = complete ? "1.000" : "0.000";
      controller.dataset.state = state;

      target.dataset.profileSituationHandoffMode = "natural-flow";
      target.dataset.profileSituationHandoffPlaybackState = state === "ready"
        ? "scroll-linked"
        : "static";
      target.dataset.situationEntryState = complete ? "complete" : phase;
      target.inert = false;
    };

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
          const introHeading = target.querySelector<HTMLElement>(
            "[data-situation-intro-heading]",
          );
          const lead = target.querySelector<HTMLElement>(
            "[data-situation-intro-copy]",
          );
          const stats = target.querySelector<HTMLElement>(
            "[data-situation-stats]",
          );
          const animatedContent = [introHeading, lead, stats]
            .filter((item): item is HTMLElement => Boolean(item));
          const eyebrowInk = target.querySelector<HTMLElement>(
            "[data-situation-eyebrow-ink]",
          );
          const titleTokenInks = Array.from(
            target.querySelectorAll<HTMLElement>(
              "[data-situation-title-token-ink]",
            ),
          );
          const leadInk = target.querySelector<HTMLElement>(
            "[data-situation-lead-ink]",
          );
          const stageRule = target.querySelector<HTMLElement>(
            "[data-situation-stage-rule]",
          );
          const granularContent = [
            eyebrowInk,
            ...titleTokenInks,
            leadInk,
            stageRule,
          ].filter((item): item is HTMLElement => Boolean(item));

          const settle = (
            state: "forced-colors" | "natural-flow" | "ready" | "reduced-motion",
          ) => {
            gsap.set(animatedContent, {
              clearProps: "opacity,transform,transformOrigin,willChange",
            });
            gsap.set(granularContent, {
              clearProps:
                "clipPath,opacity,transform,transformOrigin,visibility,willChange",
            });
            setControllerState(state, "complete");
          };

          if (
            conditions.reducedMotion
            || conditions.forcedColors
            || animatedContent.length === 0
          ) {
            settle(
              conditions.reducedMotion
                ? "reduced-motion"
                : conditions.forcedColors
                  ? "forced-colors"
                  : "natural-flow",
            );
            return undefined;
          }

          const directLanding = Boolean(
            target.id && window.location.hash.slice(1) === target.id,
          );
          const alreadyEntered =
            target.getBoundingClientRect().top <= window.innerHeight * 0.82;

          if (directLanding || alreadyEntered) {
            settle("ready");
            return undefined;
          }

          const isDesktop = Boolean(conditions.desktop);
          const timeline = gsap.timeline({
            paused: true,
            defaults: { ease: "power3.out" },
            onComplete: () => {
              controller.dataset.active = "false";
              controller.dataset.entryState = "complete";
              controller.dataset.scenePhase = "complete";
              controller.dataset.sceneProgress = "1.000";
              target.dataset.situationEntryState = "complete";
            },
            onReverseComplete: () => {
              controller.dataset.active = "false";
              controller.dataset.entryState = "waiting";
              controller.dataset.scenePhase = "waiting";
              controller.dataset.sceneProgress = "0.000";
              target.dataset.situationEntryState = "waiting";
            },
            onStart: () => {
              controller.dataset.active = "true";
              controller.dataset.entryState = "revealing";
              target.dataset.situationEntryState = "revealing";
              gsap.set(animatedContent, {
                willChange: "transform, opacity",
              });
              gsap.set(granularContent, {
                willChange: "transform, opacity, clip-path",
              });
            },
            onUpdate: () => {
              const progress = timeline.progress();
              const phase = getEntryPhase(progress);
              controller.dataset.scenePhase = phase;
              controller.dataset.sceneProgress = progress.toFixed(3);
              target.dataset.situationEntryState = phase;
            },
          });
          timeline.addLabel("intro", 0);
          timeline.addLabel("copy", isDesktop ? 0.08 : 0.06);
          timeline.addLabel("ledger", isDesktop ? 0.14 : 0.1);

          if (introHeading) {
            gsap.set(introHeading, {
              opacity: 0,
              x: isDesktop ? -12 : -6,
              y: isDesktop ? 30 : 20,
            });
            timeline.to(introHeading, {
              duration: isDesktop ? 0.62 : 0.5,
              opacity: 1,
              x: 0,
              y: 0,
            }, "intro");
          }
          if (eyebrowInk) {
            gsap.set(eyebrowInk, { yPercent: 115 });
            timeline.to(eyebrowInk, {
              duration: isDesktop ? 0.56 : 0.46,
              yPercent: 0,
            }, "intro+=0.04");
          }
          if (titleTokenInks.length > 0) {
            gsap.set(titleTokenInks, { yPercent: 112 });
            timeline.to(titleTokenInks, {
              duration: isDesktop ? 0.68 : 0.54,
              stagger: isDesktop ? 0.045 : 0.032,
              yPercent: 0,
            }, "intro+=0.08");
          }
          if (lead) {
            gsap.set(lead, {
              opacity: 0,
              x: isDesktop ? 12 : 6,
              y: isDesktop ? 24 : 16,
            });
            timeline.to(lead, {
              duration: isDesktop ? 0.6 : 0.48,
              opacity: 1,
              x: 0,
              y: 0,
            }, "copy");
          }
          if (leadInk) {
            gsap.set(leadInk, { yPercent: 108 });
            timeline.to(leadInk, {
              duration: isDesktop ? 0.64 : 0.5,
              yPercent: 0,
            }, "copy+=0.03");
          }
          if (stats) {
            gsap.set(stats, { opacity: 0, y: isDesktop ? 18 : 12 });
            timeline.to(stats, {
              duration: isDesktop ? 0.6 : 0.48,
              opacity: 1,
              y: 0,
            }, "copy+=0.12");
          }
          if (stageRule) {
            gsap.set(stageRule, { scaleX: 0 });
            timeline.to(stageRule, {
              duration: isDesktop ? 0.9 : 0.68,
              scaleX: 1,
            }, "ledger+=0.03");
          }

          const entryTrigger = ScrollTrigger.create({
            animation: timeline,
            end: isDesktop ? "clamp(top 48%)" : "clamp(top 56%)",
            id: ENTRY_ID,
            invalidateOnRefresh: true,
            onEnter: () => {
              controller.dataset.active = "true";
              controller.dataset.entryState = "revealing";
              target.dataset.situationEntryState = "revealing";
            },
            onEnterBack: () => {
              controller.dataset.active = "true";
              controller.dataset.entryState = "revealing";
              target.dataset.situationEntryState = "revealing";
            },
            scrub: isDesktop ? 0.24 : 0.18,
            start: isDesktop ? "clamp(top 97%)" : "clamp(top 96%)",
            trigger: target,
          });

          // Reveal every part of each decision. Disclosure sizing stays owned
          // by CSS; its inner content follows the scroll at its own position.
          const ledgerRows = Array.from(
            target.querySelectorAll<HTMLElement>("[data-situation-row]"),
          );
          const ledgerTimelines: gsap.core.Timeline[] = [];
          const disclosureTimelines = new Map<HTMLElement, gsap.core.Timeline[]>();
          const additionalTimelines: gsap.core.Timeline[] = [];
          const readableFades = new Map<
            gsap.core.Timeline,
            ReturnType<typeof createReadableScrollFade>
          >();
          const ledgerAnimatedElements: HTMLElement[] = [];
          const choiceRail = target.querySelector<HTMLElement>(
            "[data-situation-choice-rail]",
          );

          const initializeDisclosure = (row: HTMLElement, index: number) => {
            if (row.dataset.active !== "true" || disclosureTimelines.has(row)) return;

            const panelTimelines: gsap.core.Timeline[] = [];
            disclosureTimelines.set(row, panelTimelines);
            for (const group of row.querySelectorAll<HTMLElement>(
              "[data-situation-panel-reveal]",
            )) {
              const content = Array.from(group.querySelectorAll<HTMLElement>([
                "[data-situation-panel-label-ink]",
                "[data-situation-topic-ink]",
                "[data-situation-start-ink]",
                "[data-situation-service] > span",
                "[data-situation-panel-action]",
              ].join(",")));
              if (content.length === 0) continue;

              gsap.set(content, {
                y: isDesktop ? 14 : 7,
              });
              ledgerAnimatedElements.push(...content);
              const panelFade = createReadableScrollFade(
                gsap, content, isDesktop ? 0.36 : 0.28,
              );
              const panelTimeline = gsap.timeline({
                defaults: { ease: "power3.out" },
                scrollTrigger: {
                  end: isDesktop ? "clamp(bottom 88%)" : "clamp(bottom 92%)",
                  id: `${LEDGER_ROW_ID}-${index + 1}-panel-${panelTimelines.length + 1}`,
                  invalidateOnRefresh: true,
                  onRefresh: (self) => panelFade.refresh(self.progress),
                  onUpdate: (self) => panelFade.update(self.progress),
                  scrub: isDesktop ? 0.24 : 0.16,
                  start: isDesktop ? "clamp(top 94%)" : "clamp(top 96%)",
                  trigger: group,
                },
              }).to(content, {
                duration: isDesktop ? 0.62 : 0.44,
                stagger: isDesktop ? 0.06 : 0.04,
                y: 0,
              });
              readableFades.set(panelTimeline, panelFade);
              panelTimelines.push(panelTimeline);
              additionalTimelines.push(panelTimeline);
            }
          };

          if (choiceRail && ledgerRows.length > 0) {
            ledgerRows.forEach((row, index) => {
              const rule = row.querySelector<HTMLElement>(
                "[data-situation-choice-rule]",
              );
              const indexLabel = row.querySelector<HTMLElement>(
                "[data-situation-choice-index]",
              );
              const contextLabel = row.querySelector<HTMLElement>(
                "[data-situation-choice-context]",
              );
              const titleInk = row.querySelector<HTMLElement>(
                "[data-situation-choice-ink] > span",
              );
              const summary = row.querySelector<HTMLElement>(
                "[data-situation-choice-summary]",
              );
              const count = row.querySelector<HTMLElement>(
                "[data-situation-choice-count]",
              );
              const arrow = row.querySelector<HTMLElement>(
                "[data-situation-choice-marker] svg",
              );
              const supportingCopy = [
                indexLabel, contextLabel, titleInk, summary, count,
              ].filter((element): element is HTMLElement => Boolean(element));

              if (rule && index > 0) {
                gsap.set(rule, {
                  opacity: isDesktop ? 0.3 : 0.55,
                  scaleX: isDesktop ? 0 : 0.18,
                  transformOrigin: "0% 50%",
                });
                ledgerAnimatedElements.push(rule);
              }
              if (supportingCopy.length > 0) {
                gsap.set(supportingCopy, {
                  y: isDesktop ? 14 : 7,
                });
                ledgerAnimatedElements.push(...supportingCopy);
              }
              if (arrow) {
                gsap.set(arrow, {
                  opacity: isDesktop ? 0.28 : 0.55,
                  x: isDesktop ? 12 : 6,
                });
                ledgerAnimatedElements.push(arrow);
              }

              const rowFade = createReadableScrollFade(
                gsap, supportingCopy, isDesktop ? 0.36 : 0.28,
              );
              const rowTimeline = gsap.timeline({
                defaults: { ease: "power3.out" },
                scrollTrigger: {
                  end: isDesktop ? "clamp(top 58%)" : "clamp(top 72%)",
                  id: `${LEDGER_ROW_ID}-${index + 1}`,
                  invalidateOnRefresh: true,
                  onRefresh: (self) => rowFade.refresh(self.progress),
                  onUpdate: (self) => rowFade.update(self.progress),
                  scrub: isDesktop ? 0.24 : 0.16,
                  start: isDesktop ? "clamp(top 88%)" : "clamp(top 94%)",
                  trigger: row,
                },
              });
              readableFades.set(rowTimeline, rowFade);

              if (rule && index > 0) {
                rowTimeline.to(rule, {
                  duration: isDesktop ? 0.76 : 0.5,
                  opacity: 1,
                  scaleX: 1,
                }, 0);
              }
              const meta = [indexLabel, contextLabel].filter(
                (element): element is HTMLElement => Boolean(element),
              );
              if (meta.length > 0) {
                rowTimeline.to(meta, {
                  duration: isDesktop ? 0.58 : 0.42,
                  y: 0,
                }, isDesktop ? 0.08 : 0.04);
              }
              if (titleInk) {
                rowTimeline.to(titleInk, {
                  duration: isDesktop ? 0.68 : 0.48,
                  y: 0,
                }, isDesktop ? 0.1 : 0.06);
              }
              if (summary) {
                rowTimeline.to(summary, {
                  duration: isDesktop ? 0.66 : 0.46,
                  y: 0,
                }, isDesktop ? 0.18 : 0.08);
              }
              if (count) {
                rowTimeline.to(count, {
                  duration: isDesktop ? 0.52 : 0.4,
                  y: 0,
                }, isDesktop ? 0.23 : 0.1);
              }
              if (arrow) {
                rowTimeline.to(arrow, {
                  duration: isDesktop ? 0.62 : 0.44,
                  opacity: 1,
                  x: 0,
                }, isDesktop ? 0.24 : 0.12);
              }

              ledgerTimelines.push(rowTimeline);

              initializeDisclosure(row, index);
            });
            target.dataset.situationLedgerMotion = "scroll-linked";
          }

          // Closed disclosures remain CSS-only. Their DOM is already present,
          // but measuring and animating it is useful only after the row opens.
          const disclosureObserver = new MutationObserver((records) => {
            for (const { target: changed } of records) {
              if (!(changed instanceof HTMLElement)
                || !changed.matches("[data-situation-row]")) continue;
              const index = ledgerRows.indexOf(changed);
              if (index < 0 || changed.dataset.active !== "true"
                || disclosureTimelines.has(changed)) continue;
              mediaContext.add(() => initializeDisclosure(changed, index));
            }
          });
          if (choiceRail) {
            disclosureObserver.observe(choiceRail, {
              attributeFilter: ["data-active"],
              attributes: true,
              subtree: true,
            });
          }

          const utility = target.querySelector<HTMLElement>(
            "[data-situation-utility]",
          );
          let utilityTimeline: gsap.core.Timeline | undefined;
          if (utility) {
            gsap.set(utility, {
              y: isDesktop ? 14 : 7,
            });
            ledgerAnimatedElements.push(utility);
            const utilityFade = createReadableScrollFade(
              gsap, [utility], isDesktop ? 0.36 : 0.28,
            );
            utilityTimeline = gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: {
                end: "clamp(bottom 88%)",
                id: `${LEDGER_ROW_ID}-utility`,
                invalidateOnRefresh: true,
                onRefresh: (self) => utilityFade.refresh(self.progress),
                onUpdate: (self) => utilityFade.update(self.progress),
                scrub: isDesktop ? 0.24 : 0.16,
                start: "clamp(top 94%)",
                trigger: utility,
              },
            }).to(utility, { duration: 0.6, y: 0 });
            readableFades.set(utilityTimeline, utilityFade);
            additionalTimelines.push(utilityTimeline);
          }

          const refreshLedgerAfterDisclosure = (event: TransitionEvent) => {
            if (event.propertyName === "grid-template-rows") {
              ScrollTrigger.refresh();
            }
          };
          choiceRail?.addEventListener(
            "transitionend",
            refreshLedgerAfterDisclosure,
            true,
          );

          const focusHeldTimelines = new Set<gsap.core.Timeline>();
          let focusReleaseFrame = 0;
          const releaseFocusReveal = () => {
            for (const focusedTimeline of focusHeldTimelines) {
              focusedTimeline.scrollTrigger?.enable(false);
              focusedTimeline.scrollTrigger?.update();
            }
            focusHeldTimelines.clear();
          };
          const holdFocusReveal = (focusedTimeline: gsap.core.Timeline) => {
            // Pause the scrub tween as well as its trigger so native focus
            // scrolling cannot fade the control again after this event.
            focusedTimeline.scrollTrigger?.disable(false);
            focusedTimeline.progress(1);
            readableFades.get(focusedTimeline)?.finish();
            focusHeldTimelines.add(focusedTimeline);
          };
          const settleForFocus = (event: FocusEvent) => {
            releaseFocusReveal();
            timeline.progress(1);
            const keyboardFocus = event.target instanceof Element
              && event.target.matches(":focus-visible");
            if (keyboardFocus) holdFocusReveal(timeline);
            const focusedRow = event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-situation-row]")
              : null;
            const focusedRowIndex = focusedRow
              ? ledgerRows.indexOf(focusedRow)
              : -1;
            if (focusedRow && focusedRowIndex >= 0) {
              mediaContext.add(() => initializeDisclosure(focusedRow, focusedRowIndex));
              const rowTimeline = ledgerTimelines[focusedRowIndex];
              if (rowTimeline) {
                readableFades.get(rowTimeline)?.finish();
                if (keyboardFocus) holdFocusReveal(rowTimeline);
                else rowTimeline.progress(1);
              }
              for (const panelTimeline of disclosureTimelines.get(focusedRow) ?? []) {
                readableFades.get(panelTimeline)?.finish();
                if (
                  keyboardFocus
                  && event.target instanceof Node
                  && panelTimeline.scrollTrigger?.trigger?.contains(event.target)
                ) {
                  holdFocusReveal(panelTimeline);
                } else {
                  panelTimeline.progress(1);
                }
              }
            } else if (event.target instanceof Node && utility?.contains(event.target)) {
              if (utilityTimeline) readableFades.get(utilityTimeline)?.finish();
              if (keyboardFocus && utilityTimeline) holdFocusReveal(utilityTimeline);
              else utilityTimeline?.progress(1);
            }
          };
          const resumeAfterFocus = () => {
            window.cancelAnimationFrame(focusReleaseFrame);
            focusReleaseFrame = window.requestAnimationFrame(() => {
              if (!target.contains(document.activeElement)) releaseFocusReveal();
            });
          };
          target.addEventListener("focusin", settleForFocus, {
            capture: true,
          });
          target.addEventListener("focusout", resumeAfterFocus, true);
          document.addEventListener("pointerdown", releaseFocusReveal, true);
          setControllerState("ready", "waiting");

          return () => {
            disclosureObserver.disconnect();
            target.removeEventListener("focusin", settleForFocus, true);
            target.removeEventListener("focusout", resumeAfterFocus, true);
            document.removeEventListener("pointerdown", releaseFocusReveal, true);
            window.cancelAnimationFrame(focusReleaseFrame);
            focusHeldTimelines.clear();
            choiceRail?.removeEventListener(
              "transitionend",
              refreshLedgerAfterDisclosure,
              true,
            );
            for (const rowTimeline of [...ledgerTimelines, ...additionalTimelines]) {
              readableFades.get(rowTimeline)?.kill();
              rowTimeline.scrollTrigger?.kill();
              rowTimeline.kill();
            }
            gsap.set(ledgerAnimatedElements, {
              clearProps: "opacity,transform,transformOrigin",
            });
            delete target.dataset.situationLedgerMotion;
            entryTrigger.kill();
            timeline.kill();
            gsap.set(animatedContent, {
              clearProps: "opacity,transform,transformOrigin,willChange",
            });
            gsap.set(granularContent, {
              clearProps:
                "clipPath,opacity,transform,transformOrigin,visibility,willChange",
            });
            delete target.dataset.situationEntryState;
            target.inert = false;
          };
        },
      );

      cleanup = () => {
        matchMedia.revert();
        ScrollTrigger.getById(ENTRY_ID)?.kill();
        delete controller.dataset.active;
        delete controller.dataset.drive;
        delete controller.dataset.entryState;
        delete controller.dataset.playbackState;
        delete controller.dataset.reveal;
        delete controller.dataset.scenePhase;
        delete controller.dataset.sceneProgress;
        delete controller.dataset.state;
        delete target.dataset.profileSituationHandoffMode;
        delete target.dataset.profileSituationHandoffPlaybackState;
        delete target.dataset.situationEntryState;
        target.inert = false;
      };
      ScrollTrigger.refresh();
    };

    const pageMain = target.closest<HTMLElement>("main");
    let initStarted = false;
    const startInit = () => {
      if (cancelled || initStarted || pageMain?.inert) return;
      initStarted = true;
      introObserver.disconnect();
      void init().catch(() => {
        setControllerState("natural-flow", "complete");
      });
    };
    const introObserver = new MutationObserver(startInit);
    if (pageMain) {
      introObserver.observe(pageMain, {
        attributeFilter: ["inert"],
        attributes: true,
      });
    }
    const frame = window.requestAnimationFrame(startInit);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      introObserver.disconnect();
      cleanup?.();
      target.inert = false;
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-active="false"
      data-drive="natural-scroll"
      data-entry-state="loading"
      data-playback-state="bypassed"
      data-profile-situations-handoff
      data-reveal="loading"
      data-scene-phase="loading"
      data-scene-progress="0.000"
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
