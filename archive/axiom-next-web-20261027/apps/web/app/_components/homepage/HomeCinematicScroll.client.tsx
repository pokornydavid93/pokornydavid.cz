"use client";

import { useEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { createReadableScrollFade } from "./readableScrollFade";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

const DESKTOP_MEDIA_QUERY = "(min-width: 900px)";

type MotionChapter = {
  section: HTMLElement;
  name: string;
};

export default function HomeCinematicScroll() {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const flow = controller?.closest<HTMLElement>("[data-home-cinematic-flow]");

    if (!controller || !flow) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

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

      const footer = document.querySelector<HTMLElement>(
        '[data-component="site-footer"]',
      );
      const chapters = [
        [flow.querySelector<HTMLElement>('[data-home-module="profile"]'), "profile"],
        [flow.querySelector<HTMLElement>('[data-home-module="situations"]'), "situations"],
        [flow.querySelector<HTMLElement>('[data-home-module="process"]'), "process"],
        [flow.querySelector<HTMLElement>('[data-home-module="references"]'), "references"],
        [flow.querySelector<HTMLElement>('[data-home-module="evidence"]'), "evidence"],
        [flow.querySelector<HTMLElement>('[data-home-module="insights"]'), "insights"],
        [flow.querySelector<HTMLElement>('[data-home-module="faq"]'), "faq"],
        [flow.querySelector<HTMLElement>('[data-home-module="final-action"]'), "final-action"],
        [footer, "footer"],
      ]
        .filter((entry): entry is [HTMLElement, string] => Boolean(entry[0]))
        .map(([section, name]) => ({ section, name } satisfies MotionChapter));

      const setChapterState = (chapter: MotionChapter, state: string) => {
        chapter.section.dataset.cinematicMotion = state;
      };
      const resetChapterStates = () => {
        for (const chapter of chapters) {
          delete chapter.section.dataset.cinematicMotion;
          delete chapter.section.dataset.cinematicProgress;
          if (chapter.name === "situations") {
            delete chapter.section.dataset.situationSceneMode;
            delete chapter.section.dataset.situationSelectorMotion;
          }
          if (chapter.name === "evidence") {
            delete chapter.section.dataset.evidenceMotion;
            delete chapter.section.dataset.evidenceMotionState;
          }
          if (chapter.name === "insights") {
            delete chapter.section.dataset.insightsMotion;
          }
          if (chapter.name === "faq") {
            delete chapter.section.dataset.faqMotion;
            delete chapter.section.dataset.faqMotionState;
          }
        }
      };
      const matchMedia = gsap.matchMedia();

      matchMedia.add(
        {
          compact: "(max-width: 899px)",
          desktop: DESKTOP_MEDIA_QUERY,
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

          if (conditions.forcedColors || conditions.reducedMotion) {
            controller.dataset.state = conditions.reducedMotion
              ? "reduced-motion"
              : "forced-colors";
            for (const chapter of chapters) setChapterState(chapter, "static");
            const evidence = flow.querySelector<HTMLElement>(
              '[data-home-module="evidence"]',
            );
            if (evidence) {
              evidence.dataset.evidenceMotionState = "complete";
            }
            const faq = flow.querySelector<HTMLElement>(
              '[data-home-module="faq"]',
            );
            if (faq) {
              faq.dataset.faqMotionState = "complete";
            }
            return () => resetChapterStates();
          }

          const isDesktop = Boolean(conditions.desktop);
          let evidenceFocusCleanup = () => {};
          let insightsFocusCleanup = () => {};
          let faqFocusCleanup = () => {};
          const context = gsap.context(() => {
            const evidence = flow.querySelector<HTMLElement>(
              '[data-home-module="evidence"]',
            );
            const faq = flow.querySelector<HTMLElement>(
              '[data-home-module="faq"]',
            );
            const insights = flow.querySelector<HTMLElement>(
              '[data-home-module="insights"]',
            );
            const finalAction = flow.querySelector<HTMLElement>(
              '[data-home-module="final-action"]',
            );
            const createScrollTimeline = ({
              end = isDesktop ? "clamp(top 30%)" : "clamp(top 48%)",
              id,
              readableFade,
              section,
              start = isDesktop ? "clamp(top 86%)" : "clamp(top 91%)",
              trigger = section,
            }: {
              end?: string;
              id: string;
              readableFade?: ReturnType<typeof createReadableScrollFade>;
              section: HTMLElement;
              start?: string;
              trigger?: HTMLElement;
            }) => {
              const chapter = chapters.find(({ section: item }) => item === section);
              const syncChapterProgress = (progress: number) => {
                if (!chapter) return;

                chapter.section.dataset.cinematicProgress = progress.toFixed(3);
                if (progress >= 0.995) {
                  setChapterState(chapter, "visible");
                  if (chapter.name === "evidence") {
                    chapter.section.dataset.evidenceMotionState = "complete";
                  }
                  if (chapter.name === "faq") {
                    chapter.section.dataset.faqMotionState = "complete";
                  }
                } else if (progress <= 0.005) {
                  setChapterState(chapter, "waiting");
                  if (chapter.name === "evidence") {
                    chapter.section.dataset.evidenceMotionState = "waiting";
                  }
                  if (chapter.name === "faq") {
                    chapter.section.dataset.faqMotionState = "waiting";
                  }
                } else {
                  setChapterState(chapter, "entering");
                  if (chapter.name === "evidence") {
                    chapter.section.dataset.evidenceMotionState = "revealing";
                  }
                  if (chapter.name === "faq") {
                    chapter.section.dataset.faqMotionState = "revealing";
                  }
                }
              };

              return gsap.timeline({
                defaults: { ease: "none" },
                scrollTrigger: {
                  end,
                  id,
                  invalidateOnRefresh: true,
                  refreshPriority: chapter ? chapters.indexOf(chapter) : 0,
                  scrub: isDesktop ? 0.55 : 0.28,
                  start,
                  trigger,
                  onLeave: () => {
                    readableFade?.finish();
                    if (!chapter) return;
                    setChapterState(chapter, "visible");
                    chapter.section.dataset.cinematicProgress = "1.000";
                    if (chapter.name === "evidence") {
                      chapter.section.dataset.evidenceMotionState = "complete";
                    }
                    if (chapter.name === "faq") {
                      chapter.section.dataset.faqMotionState = "complete";
                    }
                  },
                  onLeaveBack: () => {
                    readableFade?.update(0);
                    if (!chapter) return;
                    setChapterState(chapter, "waiting");
                    chapter.section.dataset.cinematicProgress = "0.000";
                    if (chapter.name === "evidence") {
                      chapter.section.dataset.evidenceMotionState = "waiting";
                    }
                    if (chapter.name === "faq") {
                      chapter.section.dataset.faqMotionState = "waiting";
                    }
                  },
                  onRefresh: (self) => {
                    readableFade?.refresh(self.progress);
                    syncChapterProgress(self.progress);
                  },
                  onUpdate: (self) => {
                    readableFade?.update(self.progress);
                    syncChapterProgress(self.progress);
                  },
                },
              });
            };

            if (evidence) {
              const rules = gsap.utils.toArray<HTMLElement>(
                evidence.querySelectorAll("[data-evidence-reveal-rule]"),
              );
              const eyebrowInk = evidence.querySelector<HTMLElement>(
                "[data-evidence-eyebrow-ink]",
              );
              const headingInks = gsap.utils.toArray<HTMLElement>(
                evidence.querySelectorAll("[data-evidence-word-ink]"),
              );
              const leadInk = evidence.querySelector<HTMLElement>(
                "[data-evidence-lead-ink]",
              );
              const rows = gsap.utils.toArray<HTMLElement>(
                evidence.querySelectorAll("[data-evidence-row]"),
              );

              const evidenceChapter = chapters.find(
                ({ section }) => section === evidence,
              );

              if (
                rules.length === 2
                && eyebrowInk
                && headingInks.length > 0
                && leadInk
                && rows.length > 0
              ) {
                gsap.set(rules, {
                  opacity: 0.14,
                  scaleX: 0,
                  transformOrigin: "0% 50%",
                  willChange: "transform, opacity",
                });
                gsap.set(eyebrowInk, {
                  opacity: 0,
                  willChange: "transform, opacity",
                  x: isDesktop ? -18 : -12,
                });
                gsap.set(headingInks, {
                  opacity: 0,
                  rotationX: isDesktop ? -10 : 0,
                  transformOrigin: "50% 100%",
                  transformPerspective: 700,
                  willChange: "transform, opacity",
                  yPercent: 115,
                });
                gsap.set(leadInk, {
                  opacity: 0,
                  willChange: "transform, opacity",
                  yPercent: 90,
                });
                gsap.set(rows, {
                  opacity: 0,
                  willChange: "transform, opacity",
                  y: isDesktop ? 38 : 24,
                });

                evidence.dataset.evidenceMotion = "enhanced";
                evidence.dataset.evidenceMotionState = "waiting";
                const animatedElements = [
                  ...rules,
                  eyebrowInk,
                  ...headingInks,
                  leadInk,
                  ...rows,
                ];
                const evidenceTimeline = createScrollTimeline({
                  end: isDesktop ? "clamp(top 24%)" : "clamp(top 34%)",
                  id: "home-cinematic-evidence-scroll",
                  section: evidence,
                  start: isDesktop ? "clamp(top 94%)" : "clamp(top 96%)",
                });

                evidenceTimeline
                  .to(rules, {
                    duration: isDesktop ? 1.08 : 0.82,
                    ease: "power3.inOut",
                    opacity: 0.72,
                    scaleX: 1,
                  }, 0)
                  .to(eyebrowInk, {
                    duration: isDesktop ? 0.72 : 0.62,
                    ease: "power3.out",
                    opacity: 1,
                    x: 0,
                  }, isDesktop ? 0.1 : 0.05)
                  .to(headingInks, {
                    duration: isDesktop ? 0.9 : 0.72,
                    ease: "power4.out",
                    opacity: 1,
                    rotationX: 0,
                    stagger: { amount: isDesktop ? 0.22 : 0.14 },
                    yPercent: 0,
                  }, isDesktop ? 0.16 : 0.08)
                  .to(leadInk, {
                    duration: isDesktop ? 0.82 : 0.7,
                    ease: "power4.out",
                    opacity: 1,
                    yPercent: 0,
                  }, isDesktop ? 0.26 : 0.18)
                  .to(rows, {
                    duration: isDesktop ? 1 : 0.8,
                    ease: "power4.out",
                    opacity: 1,
                    stagger: isDesktop ? 0.12 : 0.08,
                    y: 0,
                  }, isDesktop ? 0.38 : 0.28)
                  .set(animatedElements, { willChange: "auto" });

                const settleEvidenceForFocus = () => {
                  evidenceTimeline.progress(1);
                  evidence.dataset.evidenceMotionState = "complete";
                  if (evidenceChapter) {
                    setChapterState(evidenceChapter, "visible");
                    evidenceChapter.section.dataset.cinematicProgress = "1.000";
                  }
                };
                evidence.addEventListener("focusin", settleEvidenceForFocus, {
                  capture: true,
                  once: true,
                });
                evidenceFocusCleanup = () => {
                  evidence.removeEventListener(
                    "focusin",
                    settleEvidenceForFocus,
                    true,
                  );
                };
              } else {
                evidence.dataset.evidenceMotionState = "complete";
              }
            }

            if (faq) {
              const rules = gsap.utils.toArray<HTMLElement>(
                faq.querySelectorAll("[data-faq-reveal-rule]"),
              );
              const eyebrowInk = faq.querySelector<HTMLElement>(
                "[data-faq-eyebrow-ink]",
              );
              const headingInks = gsap.utils.toArray<HTMLElement>(
                faq.querySelectorAll("[data-faq-word-ink]"),
              );
              const leadInk = faq.querySelector<HTMLElement>(
                "[data-faq-lead-ink]",
              );
              const rows = gsap.utils.toArray<HTMLElement>(
                faq.querySelectorAll("[data-faq-reveal-row]"),
              );
              const privacyNote = faq.querySelector<HTMLElement>(
                "[data-faq-privacy-note]",
              );
              const faqChapter = chapters.find(
                ({ section }) => section === faq,
              );
              const animatedElements = [
                ...rules,
                ...(eyebrowInk ? [eyebrowInk] : []),
                ...headingInks,
                ...(leadInk ? [leadInk] : []),
                ...rows,
                ...(privacyNote ? [privacyNote] : []),
              ];

              if (
                rules.length === 2
                && eyebrowInk
                && headingInks.length > 0
                && leadInk
                && rows.length > 0
                && privacyNote
              ) {
                gsap.set(rules, {
                  opacity: 0.14,
                  scaleX: 0,
                  transformOrigin: "0% 50%",
                  willChange: "transform, opacity",
                });
                gsap.set(eyebrowInk, {
                  clipPath: "inset(0% 100% 0% 0%)",
                  willChange: "clip-path, transform, opacity",
                  x: isDesktop ? -18 : -12,
                });
                gsap.set(headingInks, {
                  rotationX: isDesktop ? -10 : 0,
                  transformOrigin: "50% 100%",
                  transformPerspective: 700,
                  willChange: "transform, opacity",
                  yPercent: 115,
                });
                gsap.set(leadInk, {
                  willChange: "transform, opacity",
                  yPercent: 90,
                });
                gsap.set(rows, {
                  clipPath: "inset(0% 0% 100% 0%)",
                  willChange: "clip-path, transform, opacity",
                  y: isDesktop ? 38 : 24,
                });
                gsap.set(privacyNote, {
                  clipPath: "inset(0% 0% 100% 0%)",
                  willChange: "clip-path, transform, opacity",
                  y: isDesktop ? 24 : 16,
                });

                const readableFade = createReadableScrollFade(
                  gsap,
                  [eyebrowInk, ...headingInks, leadInk, ...rows, privacyNote],
                  isDesktop ? 0.36 : 0.28,
                );
                faq.dataset.faqMotion = "enhanced";
                faq.dataset.faqMotionState = "waiting";
                const faqTimeline = createScrollTimeline({
                  end: isDesktop ? "clamp(bottom 48%)" : "clamp(bottom 56%)",
                  id: "home-cinematic-faq-scroll",
                  readableFade,
                  section: faq,
                  start: isDesktop ? "clamp(top 82%)" : "clamp(top 90%)",
                });

                faqTimeline
                  .to(rules, {
                    duration: isDesktop ? 1.08 : 0.82,
                    ease: "power3.inOut",
                    opacity: 0.72,
                    scaleX: 1,
                  }, 0)
                  .to(eyebrowInk, {
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: isDesktop ? 0.72 : 0.62,
                    ease: "power3.out",
                    x: 0,
                  }, isDesktop ? 0.1 : 0.05)
                  .to(headingInks, {
                    duration: isDesktop ? 0.9 : 0.72,
                    ease: "power4.out",
                    rotationX: 0,
                    stagger: { amount: isDesktop ? 0.22 : 0.14 },
                    yPercent: 0,
                  }, isDesktop ? 0.16 : 0.08)
                  .to(leadInk, {
                    duration: isDesktop ? 0.82 : 0.7,
                    ease: "power4.out",
                    yPercent: 0,
                  }, isDesktop ? 0.26 : 0.18)
                  .to(rows, {
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: isDesktop ? 1 : 0.8,
                    ease: "power4.out",
                    stagger: isDesktop ? 0.12 : 0.08,
                    y: 0,
                  }, isDesktop ? 0.38 : 0.28)
                  .to(privacyNote, {
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: isDesktop ? 0.72 : 0.62,
                    ease: "power3.out",
                    y: 0,
                  }, isDesktop ? 0.76 : 0.58)
                  .set(animatedElements, { willChange: "auto" });

                const settleFaqForFocus = () => {
                  readableFade.finish();
                  faqTimeline.progress(1);
                  faq.dataset.faqMotionState = "complete";
                  if (faqChapter) {
                    setChapterState(faqChapter, "visible");
                    faqChapter.section.dataset.cinematicProgress = "1.000";
                  }
                };
                faq.addEventListener("focusin", settleFaqForFocus, {
                  capture: true,
                  once: true,
                });
                faqFocusCleanup = () => {
                  readableFade.kill();
                  faq.removeEventListener("focusin", settleFaqForFocus, true);
                };
              } else {
                faq.dataset.faqMotionState = "complete";
              }
            }

            if (insights) {
              const eyebrow = insights.querySelector<HTMLElement>(
                '[data-home-articles-intro="heading"] span[data-home-articles-intro-item]',
              );
              const heading = insights.querySelector<HTMLElement>(
                '[data-home-articles-intro="heading"] h2',
              );
              const contextCopy = insights.querySelector<HTMLElement>(
                '[data-home-articles-intro="context"]',
              );
              const primaryMedia = insights.querySelector<HTMLElement>(
                '[data-home-article-media-reveal="primary"]',
              );
              const primaryCopy = insights.querySelector<HTMLElement>(
                '[data-home-article-copy-reveal="primary"]',
              );
              const secondaryMedia = gsap.utils.toArray<HTMLElement>(
                insights.querySelectorAll(
                  '[data-home-article-media-reveal="secondary"]',
                ),
              );
              const secondaryCopy = gsap.utils.toArray<HTMLElement>(
                insights.querySelectorAll(
                  '[data-home-article-copy-reveal="secondary"]',
                ),
              );
              const archiveLink = insights.querySelector<HTMLElement>(
                "[data-home-articles-footer]",
              );
              const insightsChapter = chapters.find(
                ({ section }) => section === insights,
              );

              if (
                eyebrow
                && heading
                && contextCopy
                && primaryMedia
                && primaryCopy
                && secondaryMedia.length === 2
                && secondaryCopy.length === 2
                && archiveLink
              ) {
                const copyTargets = [
                  eyebrow,
                  contextCopy,
                  primaryCopy,
                  ...secondaryCopy,
                  archiveLink,
                ];
                const mediaTargets = [primaryMedia, ...secondaryMedia];
                const allTargets = [heading, ...copyTargets, ...mediaTargets];

                gsap.set(eyebrow, {
                  autoAlpha: 0,
                  willChange: "transform, opacity",
                  y: isDesktop ? 10 : 8,
                });
                gsap.set(heading, {
                  autoAlpha: 0,
                  clipPath: "inset(0% 0% 100% 0%)",
                  willChange: "clip-path, transform, opacity",
                  y: isDesktop ? 20 : 14,
                });
                gsap.set(contextCopy, {
                  autoAlpha: 0,
                  willChange: "transform, opacity",
                  y: isDesktop ? 14 : 10,
                });
                gsap.set(mediaTargets, {
                  autoAlpha: 0,
                  clipPath: "inset(100% 0% 0% 0%)",
                  transformOrigin: "50% 100%",
                  willChange: "clip-path, transform, opacity",
                });
                gsap.set(primaryMedia, { scale: 1.04 });
                gsap.set(secondaryMedia, { scale: 1.025 });
                gsap.set([primaryCopy, ...secondaryCopy, archiveLink], {
                  autoAlpha: 0,
                  willChange: "transform, opacity",
                  y: 12,
                });

                insights.dataset.insightsMotion = "editorial-reveal";
                const insightsTimeline = createScrollTimeline({
                  end: isDesktop ? "clamp(top 38%)" : "clamp(top 54%)",
                  id: "home-cinematic-insights",
                  section: insights,
                  start: isDesktop ? "clamp(top 88%)" : "clamp(top 92%)",
                });

                insightsTimeline
                  .to(eyebrow, {
                    autoAlpha: 1,
                    duration: 0.16,
                    ease: "power2.out",
                    y: 0,
                  }, 0)
                  .to(heading, {
                    autoAlpha: 1,
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: 0.3,
                    ease: "power3.out",
                    y: 0,
                  }, 0.03)
                  .to(contextCopy, {
                    autoAlpha: 1,
                    duration: 0.24,
                    ease: "power2.out",
                    y: 0,
                  }, 0.16)
                  .to(primaryMedia, {
                    autoAlpha: 1,
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: 0.38,
                    ease: "power3.out",
                    scale: 1,
                  }, 0.27)
                  .to(primaryCopy, {
                    autoAlpha: 1,
                    duration: 0.27,
                    ease: "power2.out",
                    y: 0,
                  }, 0.39)
                  .to(secondaryMedia[0], {
                    autoAlpha: 1,
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: 0.29,
                    ease: "power3.out",
                    scale: 1,
                  }, 0.46)
                  .to(secondaryCopy[0], {
                    autoAlpha: 1,
                    duration: 0.24,
                    ease: "power2.out",
                    y: 0,
                  }, 0.54)
                  .to(secondaryMedia[1], {
                    autoAlpha: 1,
                    clipPath: "inset(0% 0% 0% 0%)",
                    duration: 0.29,
                    ease: "power3.out",
                    scale: 1,
                  }, 0.62)
                  .to(secondaryCopy[1], {
                    autoAlpha: 1,
                    duration: 0.24,
                    ease: "power2.out",
                    y: 0,
                  }, 0.7)
                  .to(archiveLink, {
                    autoAlpha: 1,
                    duration: 0.18,
                    ease: "power2.out",
                    y: 0,
                  }, 0.82)
                  .set(allTargets, { willChange: "auto" }, 1);

                const settleInsightsForFocus = () => {
                  insightsTimeline.progress(1);
                  if (insightsChapter) {
                    setChapterState(insightsChapter, "visible");
                    insightsChapter.section.dataset.cinematicProgress = "1.000";
                  }
                };
                insights.addEventListener("focusin", settleInsightsForFocus, {
                  capture: true,
                  once: true,
                });
                insightsFocusCleanup = () => {
                  insights.removeEventListener(
                    "focusin",
                    settleInsightsForFocus,
                    true,
                  );
                };
              }
            }

            if (finalAction) {
              const finalTargets = [
                finalAction.querySelector<HTMLElement>("[data-action-band-copy]"),
                finalAction.querySelector<HTMLElement>("[data-action-band-aside]"),
              ].filter((target): target is HTMLElement => Boolean(target));

              if (finalTargets.length > 0) {
                gsap.set(finalTargets, {
                  willChange: "transform",
                  y: isDesktop ? 30 : 18,
                });
                createScrollTimeline({
                  end: isDesktop ? "clamp(bottom 48%)" : "clamp(bottom 56%)",
                  id: "home-cinematic-final-action",
                  section: finalAction,
                })
                  .to(finalTargets, {
                    duration: 0.78,
                    ease: "power4.out",
                    stagger: 0.1,
                    y: 0,
                  })
                  .set(finalTargets, { willChange: "auto" });
              }
            }

            if (footer) {
              const footerInner = footer.querySelector<HTMLElement>(
                '[data-layout="container"]',
              );
              const footerBlocks = footerInner
                ? Array.from(footerInner.children).filter(
                  (child): child is HTMLElement => child instanceof HTMLElement,
                )
                : [];

              if (footerBlocks.length > 0) {
                gsap.set(footerBlocks, {
                  willChange: "transform",
                  y: isDesktop ? 28 : 18,
                });
                createScrollTimeline({
                  end: isDesktop ? "clamp(bottom 60%)" : "clamp(bottom 68%)",
                  id: "home-cinematic-footer",
                  section: footer,
                  start: isDesktop ? "clamp(top 90%)" : "clamp(top 94%)",
                })
                  .to(footerBlocks, {
                    duration: 0.82,
                    ease: "power4.out",
                    stagger: 0.09,
                    y: 0,
                  })
                  .set(footerBlocks, { willChange: "auto" });
              }
            }

            for (const chapter of chapters) {
              if (
                [
                  "profile",
                  "situations",
                  "process",
                  "references",
                ].includes(chapter.name)
              ) {
                setChapterState(chapter, "owned-scene");
              } else if (!chapter.section.dataset.cinematicMotion) {
                setChapterState(chapter, "waiting");
              }
            }
            controller.dataset.state = "ready";
            controller.dataset.mode = isDesktop ? "cinematic" : "compact";
          }, flow);

          return () => {
            evidenceFocusCleanup();
            insightsFocusCleanup();
            faqFocusCleanup();
            context.revert();
          };
        },
      );

      cleanup = () => {
        matchMedia.revert();
        resetChapterStates();
        delete controller.dataset.mode;
        delete controller.dataset.state;
        ScrollTrigger.refresh();
      };
      ScrollTrigger.refresh();
    };

    const frame = window.requestAnimationFrame(() => {
      void init();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      data-home-cinematic-scroll
      data-state="loading"
      hidden
      ref={controllerRef}
    />
  );
}
