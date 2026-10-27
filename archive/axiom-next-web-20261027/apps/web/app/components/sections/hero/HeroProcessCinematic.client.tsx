"use client";

import { useEffect, useRef } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import heroStyles from "../../../home.critical.module.css";
import s from "./HeroProcessCinematic.module.css";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion).matches;

const isDesktop = () =>
  typeof window !== "undefined" &&
  window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndUp).matches;

const ABOUT_HANDOFF_SNAP_PROGRESS = 0.34;
const ABOUT_HANDOFF_SNAP_START = 0.008;

const uniqueElements = (items: Array<HTMLElement | null | undefined>) => {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];

  items.forEach((item) => {
    if (!item || seen.has(item)) return;
    seen.add(item);
    result.push(item);
  });

  return result;
};

export default function HeroProcessCinematic() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || !isDesktop()) return undefined;

    const heroSection = root.closest<HTMLElement>("#hero");
    const processWorld = root.querySelector<HTMLElement>(
      "[data-cinematic-process-world]",
    );
    const heroCanvasTargets = uniqueElements([
      heroSection?.querySelector<HTMLElement>(`.${heroStyles.heroDefaultContent}`),
      heroSection?.querySelector<HTMLElement>(`.${heroStyles.heroMediaCol}`),
      processWorld,
    ]);
    const syncProcessWorldOrigin = () => {
      if (!processWorld) return;

      const originX = Math.round(
        Math.min(1480, Math.max(1220, window.innerWidth * 0.78)),
      );

      processWorld.style.setProperty("--cinematic-grid-origin-x", `${originX}px`);
      processWorld.style.setProperty("--cinematic-grid-origin-y", "0px");
    };

    heroCanvasTargets.forEach((target) => {
      target.dataset.cinematicGridBound = "true";
    });
    syncProcessWorldOrigin();
    window.addEventListener("resize", syncProcessWorldOrigin);

    let killed = false;
    let cleanup: (() => void) | null = null;

    const init = async () => {
      if (killed) return;

      const pinLayer = root.closest<HTMLElement>("[data-cinematic-pin-layer]");

      if (!heroSection || !pinLayer) return;

      const [gsapMod, stMod] = await Promise.all([
        import("gsap") as Promise<GsapModule & { default?: GsapStatic }>,
        import("gsap/ScrollTrigger") as Promise<
          ScrollTriggerModule & { default?: ScrollTriggerStatic }
        >,
      ]);

      const gsap = gsapMod.gsap ?? gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;

      if (!gsap || !ScrollTrigger || killed) return;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const heroCopy = heroSection.querySelector<HTMLElement>(
          `.${heroStyles.heroDefaultContent}`,
        );
        const heroMedia = heroSection.querySelector<HTMLElement>(
          `.${heroStyles.heroMediaCol}`,
        );
        const processIntroParts = Array.from(
          root.querySelectorAll<HTMLElement>("[data-cinematic-process-heading-part]"),
        );
        const timelineHold = { progress: 0 };
        const heroCopyClearAt = 0.18;
        const processRevealStart = 0.045;
        const processHeadingGap = 0.038;

        gsap.set(root, {
          autoAlpha: 1,
          force3D: true,
          willChange: "transform, opacity",
        });
        gsap.set(processIntroParts, {
          autoAlpha: 0,
          y: 18,
          scale: 0.992,
          willChange: "transform, opacity",
        });
        if (heroMedia) {
          gsap.set(heroMedia, {
            filter: "none",
          });
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: heroSection,
            start: "top top",
            end: "bottom top",
            scrub: 0.18,
            pin: pinLayer,
            pinSpacing: false,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            snap: {
              snapTo: (value, self) => {
                if (
                  (self?.direction ?? 1) > 0 &&
                  value >= ABOUT_HANDOFF_SNAP_START &&
                  value < ABOUT_HANDOFF_SNAP_PROGRESS
                ) {
                  return ABOUT_HANDOFF_SNAP_PROGRESS;
                }

                if ((self?.direction ?? 1) < 0 && value > 0 && value <= 0.16) {
                  return 0;
                }

                return value;
              },
              delay: 0.035,
              duration: { min: 0.95, max: 1.35 },
              ease: "power3.out",
              inertia: false,
            },
            onEnter: () => {
              document.documentElement.classList.add("hero-process-cinematic-active");
            },
            onEnterBack: () => {
              document.documentElement.classList.add("hero-process-cinematic-active");
            },
            onLeave: () => {
              document.documentElement.classList.remove(
                "hero-process-cinematic-active",
              );
            },
            onLeaveBack: () => {
              document.documentElement.classList.remove(
                "hero-process-cinematic-active",
              );
            },
          },
          defaults: { ease: "none", overwrite: "auto" },
        });

        timeline.to(timelineHold, { progress: 1, duration: 1 }, 0);

        if (heroCopy) {
          timeline.to(
            heroCopy,
            {
              autoAlpha: 0,
              duration: 0.16,
              ease: "sine.out",
            },
            heroCopyClearAt,
          );
        }

        processIntroParts.forEach((part, index) => {
          timeline.fromTo(
            part,
            {
              autoAlpha: 0,
              y: 18 + index * 4,
              scale: 0.992,
            },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.18,
              ease: "power2.out",
            },
            processRevealStart + index * processHeadingGap,
          );
        });

        return () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
          document.documentElement.classList.remove(
            "hero-process-cinematic-active",
          );
        };
      }, root);

      cleanup = () => {
        ctx.revert();
        ScrollTrigger.refresh();
      };
      ScrollTrigger.refresh();
    };

    const initFrame = window.requestAnimationFrame(() => {
      void init();
    });

    return () => {
      killed = true;
      window.cancelAnimationFrame(initFrame);
      cleanup?.();
      window.removeEventListener("resize", syncProcessWorldOrigin);
      heroCanvasTargets.forEach((target) => {
        delete target.dataset.cinematicGridBound;
        target.style.removeProperty("--cinematic-grid-origin-x");
        target.style.removeProperty("--cinematic-grid-origin-y");
      });
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={s.cinematic}
      data-cinematic-hero-process
      data-surface-tone="dark"
    >
      <div className={s.container}>
        <div
          className={s.layout}
          data-cinematic-grid-bound="true"
          data-cinematic-process-world
        >
          <div className={s.copyColumn}>
            <div
              className={s.processIntro}
              data-grid-occlusion="about-handoff-copy"
              data-grid-occlusion-feather="34"
              data-grid-occlusion-padding-x="32"
              data-grid-occlusion-padding-y="22"
              data-grid-occlusion-radius="34"
              data-grid-occlusion-strength="0.86"
            >
              <p className={s.eyebrow} data-cinematic-process-heading-part>
                KDO JSEM
              </p>
              <h2
                aria-label="Finance mají dávat klid. Ne další otázky."
                data-cinematic-process-heading-part
              >
                <span className={s.processTitleLineAccent}>
                  Finance mají dávat klid.
                </span>
                <span className={s.processTitleLine}>Ne další otázky.</span>
              </h2>
              <p data-cinematic-process-heading-part>
                Jmenuji se David Pokorný. Pomohu vám zorientovat se v
                hypotéce, pojištění, rezervách i investicích tak, aby věděli,
                co řešit teď a co může počkat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
