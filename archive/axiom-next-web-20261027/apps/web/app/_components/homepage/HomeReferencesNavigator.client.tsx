"use client";

import Image from "next/image";
import { Send } from "lucide-react";
import { Fragment, useEffect, useRef } from "react";
import type { FeaturedTestimonial } from "@/app/content/testimonials";
import { SERVICE_CONFIG } from "@/app/content/service-labels";
import {
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
} from "@/app/theme/design-primitives";
import type { HomePageContent } from "@/lib/homepage/types";
import Link from "@/app/ui/primitives/Link";
import s from "./homePinnedTestimonials.module.css";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type GsapMatchMedia = ReturnType<GsapStatic["matchMedia"]>;

type HomeReferencesNavigatorProps = {
  description: string;
  eyebrow: string;
  outro: HomePageContent["references"]["outro"];
  testimonials: readonly FeaturedTestimonial[];
  title: string;
};

const REDUCED_MOTION_QUERY = DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion;
const FORCED_COLORS_QUERY = "(forced-colors: active)";
const ANIMATED_SELECTOR = [
  "[data-reference-intro-eyebrow]",
  "[data-reference-title-ink]",
  "[data-reference-intro-description]",
  "[data-reference-card]",
  "[data-reference-card-topline]",
  "[data-reference-card-body]",
  "[data-reference-theme]",
  "[data-references-conversion-rule]",
  "[data-references-conversion-word-ink]",
  "[data-references-conversion-description-ink]",
  "[data-references-conversion-action-rail]",
].join(",");

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toLocaleUpperCase("cs-CZ");
}

function clearInlineAnimationStyles(root: HTMLElement) {
  for (const element of root.querySelectorAll<HTMLElement>(ANIMATED_SELECTOR)) {
    element.style.removeProperty("clip-path");
    element.style.removeProperty("opacity");
    element.style.removeProperty("perspective");
    element.style.removeProperty("transform");
    element.style.removeProperty("transform-origin");
    element.style.removeProperty("visibility");
    element.style.removeProperty("will-change");
    element.style.removeProperty("z-index");
  }
}

function restoreStaticState(
  root: HTMLElement,
  cards: readonly HTMLElement[],
  links: readonly HTMLAnchorElement[],
  mode: "reduced" | "static",
) {
  root.dataset.motion = mode;
  root.dataset.layout = "list";
  root.dataset.playbackState = "static";
  root.dataset.scrollControl = "natural";
  root.dataset.activeIndex = "0";
  root.dataset.activeTestimonial = cards[0]?.dataset.testimonialId ?? "";
  root.dataset.sceneActive = "false";
  delete root.dataset.sceneProgress;
  delete root.dataset.scenePhase;
  clearInlineAnimationStyles(root);

  for (const [index, card] of cards.entries()) {
    card.toggleAttribute("data-active", index === 0);
    card.inert = false;
  }
  for (const link of links) link.removeAttribute("tabindex");

  const conversion = root.querySelector<HTMLElement>(
    "[data-references-conversion]",
  );
  if (conversion) {
    delete conversion.dataset.referencesConversionMotion;
    conversion.dataset.referencesConversionMotionState = "complete";
  }
}

export default function HomeReferencesNavigator({
  description,
  eyebrow,
  outro,
  testimonials,
  title,
}: HomeReferencesNavigatorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cards = root
      ? Array.from(root.querySelectorAll<HTMLElement>("[data-reference-card]"))
      : [];
    const links = cards
      .map((card) =>
        card.querySelector<HTMLAnchorElement>("[data-testimonial-source]"),
      )
      .filter((link): link is HTMLAnchorElement => link !== null);

    if (!root || cards.length < 2) {
      return undefined;
    }

    let cancelled = false;
    let initializationStarted = false;
    let approachRequested = false;
    let media: GsapMatchMedia | null = null;
    let lastAnnouncedIndex = -1;
    let observer: IntersectionObserver | null = null;
    let refreshCurrentMotion: (() => void) | null = null;
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const forcedColors = window.matchMedia(FORCED_COLORS_QUERY);
    const prefersStatic = () => reducedMotion.matches || forcedColors.matches;
    const restorePreferredStaticState = () => {
      restoreStaticState(
        root,
        cards,
        links,
        reducedMotion.matches ? "reduced" : "static",
      );
    };

    const setActiveReference = (index: number) => {
      const activeIndex = clamp(index, 0, cards.length - 1);
      const activeCard = cards[activeIndex];
      const author = activeCard
        ?.querySelector<HTMLElement>("cite")
        ?.textContent?.trim();

      root.dataset.activeIndex = String(activeIndex);
      root.dataset.activeTestimonial = activeCard?.dataset.testimonialId ?? "";

      for (const [cardIndex, card] of cards.entries()) {
        const isActive = cardIndex === activeIndex;
        card.toggleAttribute("data-active", isActive);
        card.inert = false;
        delete card.dataset.visualPosition;
      }

      for (const link of links) link.removeAttribute("tabindex");

      if (lastAnnouncedIndex !== activeIndex) {
        lastAnnouncedIndex = activeIndex;
        const liveRegion = root.querySelector<HTMLElement>(
          "[data-reference-live]",
        );
        if (liveRegion) {
          liveRegion.textContent =
            `Zobrazena recenze ${activeIndex + 1} z ${cards.length}${
              author ? `, ${author}` : ""
            }.`;
        }
      }
    };

    const initialize = async () => {
      if (cancelled || initializationStarted || prefersStatic()) return;
      initializationStarted = true;
      try {
        const [gsapModule, scrollTriggerModule] = await Promise.all([
          import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
          import("gsap/ScrollTrigger") as Promise<
            ScrollTriggerModule & { default?: ScrollTriggerStatic }
          >,
        ]);
        if (cancelled) return;
        if (prefersStatic()) {
          initializationStarted = false;
          restorePreferredStaticState();
          return;
        }

        const gsap = gsapModule.gsap ?? gsapModule.default;
        const ScrollTrigger =
          scrollTriggerModule.ScrollTrigger ?? scrollTriggerModule.default;
        if (!gsap || !ScrollTrigger) {
          restoreStaticState(root, cards, links, "static");
          return;
        }

        gsap.registerPlugin(ScrollTrigger);
        media = gsap.matchMedia();
        media.add(
          {
            desktop: "(min-width: 1024px)",
            compact:
              "(max-width: 1023px), (max-height: 699px), (hover: none), (pointer: coarse)",
            forcedColors: FORCED_COLORS_QUERY,
            reducedMotion: REDUCED_MOTION_QUERY,
          },
          (mediaContext) => {
            const conditions = mediaContext.conditions as {
              desktop?: boolean;
              compact?: boolean;
              forcedColors?: boolean;
              reducedMotion?: boolean;
            };

            if (conditions.forcedColors || conditions.reducedMotion) {
              restoreStaticState(
                root,
                cards,
                links,
                conditions.reducedMotion ? "reduced" : "static",
              );
              return undefined;
            }

            const compact = conditions.compact === true;
            const intro = root.querySelector<HTMLElement>(
              "[data-reference-section-intro]",
            );
            const introEyebrow = root.querySelector<HTMLElement>(
              "[data-reference-intro-eyebrow]",
            );
            const titleInks = Array.from(
              root.querySelectorAll<HTMLElement>("[data-reference-title-ink]"),
            );
            const introDescription = root.querySelector<HTMLElement>(
              "[data-reference-intro-description]",
            );
            const conversion = root.querySelector<HTMLElement>(
              "[data-references-conversion]",
            );
            const conversionRules = conversion
              ? Array.from(
                  conversion.querySelectorAll<HTMLElement>(
                    "[data-references-conversion-rule]",
                  ),
                )
              : [];
            const conversionWords = conversion
              ? Array.from(
                  conversion.querySelectorAll<HTMLElement>(
                    "[data-references-conversion-word-ink]",
                  ),
                )
              : [];
            const conversionDescription = conversion?.querySelector<HTMLElement>(
              "[data-references-conversion-description-ink]",
            ) ?? null;
            const conversionAction = conversion?.querySelector<HTMLElement>(
              "[data-references-conversion-action-rail]",
            ) ?? null;

            const introTimeline = intro
              && introEyebrow
              && titleInks.length > 0
              && introDescription
              ? gsap.timeline({
                  scrollTrigger: {
                    end: "clamp(bottom 48%)",
                    id: "home-references-intro",
                    scrub: compact ? 0.24 : 0.4,
                    start: "clamp(top 90%)",
                    trigger: intro,
                  },
                })
              : null;

            if (introTimeline && introEyebrow && introDescription) {
              gsap.set(introEyebrow, {
                clipPath: "inset(0% 100% 0% 0%)",
                opacity: 0,
                x: compact ? -12 : -20,
              });
              gsap.set(titleInks, {
                opacity: 0,
                rotationX: compact ? 0 : -10,
                transformOrigin: "50% 100%",
                transformPerspective: 760,
                yPercent: 118,
              });
              gsap.set(introDescription, {
                clipPath: "inset(0% 0% 100% 0%)",
                opacity: 0,
                y: compact ? 20 : 30,
              });
              introTimeline
                .to(introEyebrow, {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: 0.46,
                  ease: "power3.out",
                  opacity: 1,
                  x: 0,
                }, 0)
                .to(titleInks, {
                  duration: 0.72,
                  ease: "power4.out",
                  opacity: 1,
                  rotationX: 0,
                  stagger: compact ? 0.06 : 0.09,
                  yPercent: 0,
                }, 0.08)
                .to(introDescription, {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: 0.62,
                  ease: "power3.out",
                  opacity: 1,
                  y: 0,
                }, 0.24);
            }

            const conversionTimeline = conversion
              && conversionRules.length === 2
              && conversionWords.length > 0
              && conversionDescription
              && conversionAction
              ? gsap.timeline({
                  onComplete: () => {
                    conversion.dataset.referencesConversionMotionState =
                      "complete";
                  },
                  onReverseComplete: () => {
                    conversion.dataset.referencesConversionMotionState =
                      "waiting";
                  },
                  onStart: () => {
                    conversion.dataset.referencesConversionMotionState =
                      "revealing";
                  },
                  scrollTrigger: {
                    end: "clamp(bottom 48%)",
                    id: "home-references-conversion",
                    invalidateOnRefresh: true,
                    onEnter: () => {
                      conversion.dataset.referencesConversionMotionState =
                        "revealing";
                    },
                    onEnterBack: () => {
                      conversion.dataset.referencesConversionMotionState =
                        "revealing";
                    },
                    onLeave: () => {
                      conversion.dataset.referencesConversionMotionState =
                        "complete";
                    },
                    onLeaveBack: () => {
                      conversion.dataset.referencesConversionMotionState =
                        "waiting";
                    },
                    onUpdate: (self) => {
                      conversion.dataset.referencesConversionMotionState =
                        self.progress >= 0.999
                          ? "complete"
                          : self.progress <= 0.001
                            ? "waiting"
                            : "revealing";
                    },
                    scrub: compact ? 0.24 : 0.4,
                    start: compact ? "top 90%" : "top 82%",
                    trigger: conversion,
                  },
                })
              : null;

            if (
              conversion
              && conversionTimeline
              && conversionDescription
              && conversionAction
            ) {
              gsap.set(conversionRules, {
                opacity: 0.14,
                scaleX: 0,
                transformOrigin: "0% 50%",
              });
              gsap.set(conversionWords, { opacity: 0, yPercent: 110 });
              gsap.set(conversionDescription, { opacity: 0, yPercent: 70 });
              gsap.set(conversionAction, {
                clipPath: "inset(0% 0% 100% 0%)",
                opacity: 0,
                y: compact ? 24 : 38,
              });
              conversion.dataset.referencesConversionMotion = "enhanced";
              conversion.dataset.referencesConversionMotionState = "waiting";
              conversionTimeline
                .to(conversionRules, {
                  duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.reveal,
                  ease: "power3.inOut",
                  opacity: 0.72,
                  scaleX: 1,
                }, 0)
                .to(conversionWords, {
                  duration: 0.74,
                  ease: "power4.out",
                  opacity: 1,
                  stagger: { amount: 0.18 },
                  yPercent: 0,
                }, 0.12)
                .to(conversionDescription, {
                  duration: 0.72,
                  ease: "power4.out",
                  opacity: 1,
                  yPercent: 0,
                }, 0.24)
                .to(conversionAction, {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: 0.78,
                  ease: "power4.out",
                  opacity: 1,
                  y: 0,
                }, 0.34);
            }

            const revealConversionForFocus = () => {
              conversionTimeline?.scrollTrigger?.getTween()?.pause();
              conversionTimeline?.progress(1);
              if (conversion) {
                conversion.dataset.referencesConversionMotionState =
                  "complete";
              }
            };
            conversion?.addEventListener("focusin", revealConversionForFocus, {
              capture: true,
              once: true,
            });

            root.dataset.layout = "list";
            root.dataset.motion = "natural-editorial";
            root.dataset.playbackState = "scroll";
            root.dataset.scrollControl = "natural";
            root.dataset.sceneActive = "false";
            root.dataset.scenePhase = "natural";
            delete root.dataset.sceneProgress;
            const activateReference = (index: number) => {
              const activeIndex = clamp(index, 0, cards.length - 1);
              setActiveReference(activeIndex);
            };

            activateReference(0);

            const cardTimelines = cards.map((card, index) => {
              const topline = card.querySelector<HTMLElement>(
                "[data-reference-card-topline]",
              );
              const body = card.querySelector<HTMLElement>(
                "[data-reference-card-body]",
              );

              if (topline) {
                gsap.set(topline, {
                  x: compact ? -12 : -20,
                });
              }
              if (body) {
                gsap.set(body, {
                  y: compact ? 20 : 30,
                });
              }

              const timeline = gsap.timeline({
                scrollTrigger: {
                  end: "clamp(bottom 48%)",
                  id: `home-reference-natural-${index + 1}`,
                  scrub: compact ? 0.24 : 0.4,
                  start: "clamp(top 90%)",
                  trigger: card,
                },
              });

              if (topline) {
                timeline.to(topline, {
                  duration: 0.46,
                  ease: "power3.out",
                  x: 0,
                }, 0);
              }
              if (body) {
                timeline.to(body, {
                  duration: 0.62,
                  ease: "power3.out",
                  y: 0,
                }, 0.08);
              }

              return timeline;
            });
            const activeTriggers = cards.map((card, index) =>
              ScrollTrigger.create({
                end: "clamp(bottom 55%)",
                id: `home-reference-active-${index + 1}`,
                onEnter: () => activateReference(index),
                onEnterBack: () => activateReference(index),
                onLeaveBack: () => activateReference(Math.max(0, index - 1)),
                start: "clamp(top 55%)",
                trigger: card,
              }),
            );

            // A hash jump, restored scroll position or keyboard focus can arrive
            // while imports are pending. Settle to the actual scroll position
            // before painting, without a scrub tween starting from hidden text.
            const refreshAndSettle = () => {
              ScrollTrigger.refresh();
              ScrollTrigger.update();
              for (const timeline of [
                introTimeline,
                conversionTimeline,
                ...cardTimelines,
              ]) {
                const trigger = timeline?.scrollTrigger;
                if (!timeline || !trigger) continue;
                trigger.getTween()?.progress(1);
                timeline.progress(trigger.progress);
              }
              if (conversion?.contains(document.activeElement)) {
                revealConversionForFocus();
              }
            };
            refreshCurrentMotion = refreshAndSettle;
            refreshAndSettle();

            return () => {
              refreshCurrentMotion = null;
              introTimeline?.kill();
              conversionTimeline?.kill();
              for (const timeline of cardTimelines) timeline.kill();
              for (const trigger of activeTriggers) trigger.kill();
              conversion?.removeEventListener(
                "focusin",
                revealConversionForFocus,
                true,
              );
              clearInlineAnimationStyles(root);
            };
          },
        );

      } catch {
        if (!cancelled) restorePreferredStaticState();
      }
    };

    const requestApproach = () => {
      approachRequested = true;
      observer?.disconnect();
      observer = null;
      void initialize();
    };
    const handlePreferenceChange = () => {
      // Once initialized, GSAP matchMedia owns preference and breakpoint cleanup.
      if (media) return;
      restorePreferredStaticState();
      if (approachRequested) void initialize();
    };
    const handleReferenceAnchor = () => {
      let target: HTMLElement | null = null;
      try {
        target = document.getElementById(
          decodeURIComponent(window.location.hash.slice(1)),
        );
      } catch {
        return;
      }
      if (target && (root.contains(target) || target.contains(root))) {
        requestApproach();
      }
    };
    const handlePageShow = () => {
      handleReferenceAnchor();
      refreshCurrentMotion?.();
    };

    restorePreferredStaticState();
    reducedMotion.addEventListener("change", handlePreferenceChange);
    forcedColors.addEventListener("change", handlePreferenceChange);
    root.addEventListener("focusin", requestApproach, true);
    window.addEventListener("hashchange", handleReferenceAnchor);
    window.addEventListener("pageshow", handlePageShow);
    // The complete native list and links stay usable before motion is needed.
    // Observing approach avoids loading/registering ScrollTrigger in the hero.
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) requestApproach();
      }, { rootMargin: "200% 0px" });
      observer.observe(root);
    } else {
      requestApproach();
    }
    handleReferenceAnchor();

    return () => {
      cancelled = true;
      observer?.disconnect();
      reducedMotion.removeEventListener("change", handlePreferenceChange);
      forcedColors.removeEventListener("change", handlePreferenceChange);
      root.removeEventListener("focusin", requestApproach, true);
      window.removeEventListener("hashchange", handleReferenceAnchor);
      window.removeEventListener("pageshow", handlePageShow);
      media?.revert();
      restoreStaticState(root, cards, links, "static");
    };
  }, [testimonials]);

  const total = testimonials.length;
  const titleLines = title.split("\n");

  return (
    <div
      aria-label="Vybrané zkušenosti klientů"
      className={s.root}
      data-active-index="0"
      data-home-testimonials
      data-layout="list"
      data-motion="static"
      data-playback-state="static"
      data-reference-carousel
      data-reference-testimonials
      data-scene-active="false"
      data-scroll-control="natural"
      ref={rootRef}
    >
      <div
        className={s.stage}
        data-nav-section="light"
        data-reference-carousel-stage
      >
        <header className={s.sceneHeader} data-reference-section-intro>
          <span className={s.eyebrow} data-reference-intro-eyebrow>
            {eyebrow}
          </span>
          <h2 id="home-references-title">
            {titleLines.map((line, index) => (
              <span
                className={s.titleLineMask}
                data-reference-title-mask
                key={line}
              >
                <span
                  className={index === 0 ? s.titlePrimary : s.titleSecondary}
                  data-reference-title-ink
                >
                  {line}
                  {index < titleLines.length - 1 ? " " : null}
                </span>
              </span>
            ))}
          </h2>
          <p
            className={s.sceneDescription}
            data-reference-intro-description
            id="home-references-description"
          >
            {description}
          </p>
        </header>

        <div className={s.readerStage} data-reference-reader-stage>
          <div
            aria-describedby="home-references-description"
            className={s.gallery}
            data-reference-gallery
          >
            <ul
              className={s.cardCollection}
              data-reference-card-collection
              role="list"
            >
              {testimonials.map((testimonial, index) => {
                const position = testimonial.order;
                const author = testimonial.client.name;
                const authorId = `home-reference-author-${testimonial.id}`;
                const themeId = `home-reference-theme-${testimonial.id}`;
                const rating = testimonial.rating ?? 5;
                const serviceLabels = testimonial.client.serviceKeys
                  .slice(0, 2)
                  .map((serviceKey) => SERVICE_CONFIG[serviceKey].shortLabel);

                return (
                  <li key={testimonial.id}>
                    <article
                      aria-labelledby={`${themeId} ${authorId}`}
                      className={s.cardSlot}
                      data-cursor="external"
                      data-cursor-click-target="[data-testimonial-source]"
                      data-cursor-frame-target="[data-testimonial-source]"
                      data-cursor-icon="external"
                      data-cursor-split-core
                      data-active={index === 0 ? "" : undefined}
                      data-home-reference={testimonial.id}
                      data-position={position}
                      data-reference-card
                      data-testimonial-id={testimonial.id}
                    >
                      <div className={s.card} data-reference-card-surface>
                        <div
                          className={s.cardTopline}
                          data-reference-card-topline
                        >
                          <span aria-hidden="true" className={s.rowIndex}>
                            {String(position).padStart(2, "0")}
                          </span>
                          <span
                            className={s.cardTheme}
                            data-reference-theme
                            id={themeId}
                          >
                            {testimonial.theme}
                          </span>
                          <span aria-hidden="true" className={s.rowRule} />
                        </div>

                        <div
                          className={s.cardBody}
                          data-reference-card-body
                        >
                          <blockquote
                            cite={testimonial.sourceUrl}
                            className={s.quote}
                          >
                            <span
                              aria-hidden="true"
                              className={s.quoteMark}
                              data-reference-quote-mark
                            >
                              “
                            </span>
                            <p data-reference-quote-ink>
                              {testimonial.excerpt}
                            </p>
                          </blockquote>

                          <footer
                            className={s.cardFooter}
                            data-reference-card-footer
                          >
                            <div
                              className={s.identity}
                              data-testimonial-services
                            >
                              <span
                                aria-hidden="true"
                                className={s.monogram}
                                data-testimonial-avatar={
                                  testimonial.client.portrait?.src
                                }
                              >
                                {testimonial.client.portrait ? (
                                  <picture>
                                    <source
                                      srcSet={testimonial.client.portrait.srcSet}
                                      sizes="(max-width: 767px) 44px, 48px"
                                    />
                                  <Image
                                    alt=""
                                    className={s.monogramImage}
                                    data-testimonial-avatar-image
                                    fill
                                    sizes="52px"
                                    src={testimonial.client.portrait.src}
                                    style={{
                                      objectPosition:
                                        testimonial.client.portrait.objectPosition
                                        ?? "50% 50%",
                                    }}
                                  />
                                  </picture>
                                ) : (
                                  getInitials(author)
                                )}
                              </span>
                              <div className={s.identityCopy}>
                                <cite className={s.author} id={authorId}>
                                  {author}
                                </cite>
                                <span className={s.serviceLabels}>
                                  <span className={s.servicePrefix}>
                                    Řešili jsme:
                                  </span>{" "}
                                  {serviceLabels.join(" · ")}
                                </span>
                              </div>
                            </div>

                            <a
                              aria-label={
                                `Otevřít Google recenzi od ${author}, ` +
                                `hodnocení ${rating} z 5, v nové kartě`
                              }
                              className={s.sourceLink}
                              data-cursor="external"
                              data-cursor-control="button"
                              data-cursor-icon="external"
                              data-cursor-split-core
                              data-testimonial-source
                              href={testimonial.sourceUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <span className={s.sourceLinkCopy}>
                                <span className={s.rating}>
                                  <span
                                    aria-hidden="true"
                                    data-review-rating={rating}
                                  >
                                    {Array.from(
                                      { length: rating },
                                      (_, starIndex) => (
                                        <span data-rating-star key={starIndex}>
                                          ★
                                        </span>
                                      ),
                                    )}
                                  </span>
                                  <span className={s.visuallyHidden}>
                                    Hodnocení {rating} z 5
                                  </span>
                                </span>
                                <span aria-hidden="true">Google recenze</span>
                              </span>
                              <span
                                aria-hidden="true"
                                className={s.googleBadge}
                                data-google-review-logo
                              >
                                <Image
                                  alt=""
                                  data-cursor-icon-source
                                  height={17}
                                  src="/googleLogo.svg"
                                  width={17}
                                />
                              </span>
                            </a>
                          </footer>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <section
          aria-labelledby="home-references-conversion-title"
          className={s.conversionBridge}
          data-references-conversion
          data-references-cta-stage
          data-surface-tone="action"
        >
          <span
            aria-hidden="true"
            className={s.conversionRule}
            data-edge="top"
            data-references-conversion-rule
          />
          <div className={s.conversionCopy}>
            <h3
              aria-label={outro.title}
              id="home-references-conversion-title"
            >
              {outro.title.split(/\s+/u).map((word, index, words) => (
                <Fragment key={`${word}-${index}`}>
                  <span aria-hidden="true" className={s.conversionWord}>
                    <span data-references-conversion-word-ink>{word}</span>
                  </span>
                  {index < words.length - 1 ? " " : null}
                </Fragment>
              ))}
            </h3>
            <p>
              <span className={s.conversionDescriptionMask}>
                <span data-references-conversion-description-ink>
                  {outro.description}
                </span>
              </span>
            </p>
          </div>
          <Link
            aria-label={outro.cta.label}
            className={s.conversionAction}
            data-analytics-destination={outro.cta.href}
            data-analytics-event="home_primary_cta_click"
            data-analytics-placement="references"
            data-analytics-source={outro.cta.source}
            data-cta-composition="docked"
            data-cursor="action"
            data-cursor-icon="send"
            data-cursor-label="POPSAT SITUACI • ZAČÍT PRVNÍM KROKEM •"
            data-cursor-magnetic="true"
            data-references-conversion-action-rail
            href={outro.cta.href}
            variant="primary-action"
          >
            <span>{outro.cta.label}</span>
            <span aria-hidden="true" data-cta-icon-shell>
              <span data-cta-icon-motion>
                <Send aria-hidden="true" data-cta-icon="paper-plane" />
              </span>
            </span>
          </Link>
          <span
            aria-hidden="true"
            className={s.conversionRule}
            data-edge="bottom"
            data-references-conversion-rule
          />
        </section>
      </div>

      <p
        aria-atomic="true"
        aria-live="polite"
        className={s.visuallyHidden}
        data-reference-live
      >
        {`Zobrazena recenze 1 z ${total}${
          testimonials[0]?.client.name
            ? `, ${testimonials[0].client.name}`
            : ""
        }.`}
      </p>
    </div>
  );
}
