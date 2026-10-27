"use client";

import { useEffect } from "react";
import s from "../../../home.critical.module.css";

type GsapModule = typeof import("gsap");
type ScrollTriggerModule = typeof import("gsap/ScrollTrigger");
type GsapStatic = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

function requestIdle(cb: () => void, timeout = 1500) {
  const w = window as unknown as {
    requestIdleCallback?: (fn: () => void, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }

  const t = window.setTimeout(cb, 350);
  return () => window.clearTimeout(t);
}

export default function HeroProcessHandoff() {
  useEffect(() => {
    let killed = false;
    let initStarted = false;
    let cleanup: null | (() => void) = null;

    const init = async () => {
      if (killed || initStarted) return;
      initStarted = true;

      const heroSection = document.querySelector<HTMLElement>("#hero");
      const processSection = document.querySelector<HTMLElement>("#process");

      if (!heroSection || !processSection) return;

      const handoffRoot = processSection.closest<HTMLElement>("[data-handoff-root]");
      const handoffPin = processSection.parentElement as HTMLElement | null;
      const heroRoot = heroSection.querySelector<HTMLElement>(`.${s.heroCont}`);
      const heroSurfaceGlow = heroSection.querySelector<HTMLElement>(
        `.${s.heroSurfaceGlow}`
      );
      const heroSurfaceTexture = heroSection.querySelector<HTMLElement>(
        `.${s.heroSurfaceTexture}`
      );
      const heroBackground = heroSection.querySelector<HTMLElement>(`.${s.bgLayer}`);
      const heroContent = heroSection.querySelector<HTMLElement>(
        `.${s.heroDefaultContent}`
      );
      const heroMedia = heroSection.querySelector<HTMLElement>(`.${s.heroMediaCol}`);
      const heroImage = heroSection.querySelector<HTMLElement>(`.${s.heroImg}`);
      const processTimeline = processSection.querySelector<HTMLElement>(
        "[data-process-timeline]"
      );
      const processHeader = processSection.querySelector<HTMLElement>(
        "[data-process-handoff-content] > *:first-child"
      );
      const processSpine = processSection.querySelector<HTMLElement>(
        "[data-process-diagram-stage]"
      );

      if (!heroRoot || !processTimeline) return;

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

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 821px)", () => {
        const ctx = gsap.context(() => {
          const prev = {
            handoffRootPosition: handoffRoot?.style.position ?? "",
            handoffRootZIndex: handoffRoot?.style.zIndex ?? "",
            handoffPinPosition: handoffPin?.style.position ?? "",
            handoffPinZIndex: handoffPin?.style.zIndex ?? "",
            heroSectionPosition: heroSection.style.position,
            heroSectionZIndex: heroSection.style.zIndex,
            heroRootOverflow: heroRoot.style.overflow,
            heroRootZIndex: heroRoot.style.zIndex,
            heroSurfaceGlowTransform: heroSurfaceGlow?.style.transform ?? "",
            heroSurfaceGlowWillChange: heroSurfaceGlow?.style.willChange ?? "",
            heroSurfaceTextureTransform: heroSurfaceTexture?.style.transform ?? "",
            heroSurfaceTextureWillChange: heroSurfaceTexture?.style.willChange ?? "",
            heroBackgroundTransform: heroBackground?.style.transform ?? "",
            heroBackgroundWillChange: heroBackground?.style.willChange ?? "",
            heroContentTransform: heroContent?.style.transform ?? "",
            heroContentWillChange: heroContent?.style.willChange ?? "",
            heroMediaTransform: heroMedia?.style.transform ?? "",
            heroMediaWillChange: heroMedia?.style.willChange ?? "",
            heroImageTransform: heroImage?.style.transform ?? "",
            heroImageTransformOrigin: heroImage?.style.transformOrigin ?? "",
            heroImageWillChange: heroImage?.style.willChange ?? "",
            processSectionPosition: processSection.style.position,
            processSectionZIndex: processSection.style.zIndex,
            processTimelinePosition: processTimeline.style.position,
            processTimelineZIndex: processTimeline.style.zIndex,
            processTimelineWillChange: processTimeline.style.willChange,
            processHeaderWillChange: processHeader?.style.willChange ?? "",
            processSpineWillChange: processSpine?.style.willChange ?? "",
          };

          if (handoffRoot) {
            handoffRoot.style.position = "relative";
            handoffRoot.style.zIndex = "80";
          }
          if (handoffPin) {
            handoffPin.style.position = "relative";
            handoffPin.style.zIndex = "90";
          }

          heroSection.style.position = "relative";
          heroSection.style.zIndex = "1";
          heroRoot.style.overflow = "hidden";
          heroRoot.style.zIndex = "1";
          processSection.style.position = "relative";
          processSection.style.zIndex = "90";
          processTimeline.style.position = "relative";
          processTimeline.style.zIndex = "90";

          const processLift = () => Math.min(130, Math.round(window.innerHeight * 0.14));
          const contentParallax = () => -Math.min(190, Math.round(window.innerHeight * 0.2));
          const backgroundParallax = () =>
            -Math.min(86, Math.round(window.innerHeight * 0.09));
          const surfaceGlowParallax = () => -Math.min(92, Math.round(window.innerHeight * 0.1));
          const surfaceTextureParallax = () =>
            -Math.min(112, Math.round(window.innerHeight * 0.12));
          const imageParallax = () => -Math.min(150, Math.round(window.innerHeight * 0.16));
          const mediaParallax = () => -Math.min(56, Math.round(window.innerHeight * 0.06));

          const parallaxTargets = [
            heroSurfaceGlow,
            heroSurfaceTexture,
            heroBackground,
            heroContent,
            heroMedia,
            heroImage,
          ].filter(Boolean) as HTMLElement[];

          gsap.set([processTimeline, processHeader, processSpine, ...parallaxTargets], {
            clearProps: "transform,opacity,visibility,filter",
          });
          if (heroSurfaceGlow) heroSurfaceGlow.style.willChange = "transform";
          if (heroSurfaceTexture) heroSurfaceTexture.style.willChange = "transform";
          if (heroBackground) heroBackground.style.willChange = "transform";
          if (heroContent) heroContent.style.willChange = "transform";
          if (heroMedia) heroMedia.style.willChange = "transform";
          if (heroImage) {
            heroImage.style.willChange = "transform";
            heroImage.style.transformOrigin = "50% 100%";
          }
          gsap.set(processTimeline, {
            y: processLift,
            scale: 0.988,
            autoAlpha: 0.9,
            transformOrigin: "50% 0%",
            willChange: "transform,opacity",
          });
          gsap.set(processHeader, {
            y: 46,
            autoAlpha: 0.62,
            willChange: "transform,opacity",
          });
          gsap.set(processSpine, {
            y: 0,
            autoAlpha: 0.62,
            willChange: "transform,opacity",
          });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: heroSection,
              start: "top top",
              end: () => `+=${Math.round(window.innerHeight * 1.05)}`,
              scrub: 0.55,
              invalidateOnRefresh: true,
              onEnter: () => {
                document.documentElement.classList.add("hero-process-handoff-active");
              },
              onEnterBack: () => {
                document.documentElement.classList.add("hero-process-handoff-active");
              },
              onLeave: () => {
                document.documentElement.classList.remove("hero-process-handoff-active");
              },
              onLeaveBack: () => {
                document.documentElement.classList.remove("hero-process-handoff-active");
              },
            },
          });

          tl.to(
              heroSurfaceGlow,
              {
                x: 18,
                y: surfaceGlowParallax,
                scale: 1.06,
                ease: "none",
                duration: 1,
              },
              0
            )
            .to(
              heroSurfaceTexture,
              {
                x: 14,
                y: surfaceTextureParallax,
                scale: 1.07,
                ease: "none",
                duration: 1,
              },
              0
            )
            .to(
              heroContent,
              {
                y: contentParallax,
                ease: "none",
                duration: 1,
              },
              0
            )
            .to(
              heroBackground,
              {
                y: backgroundParallax,
                scale: 1.05,
                ease: "none",
                duration: 1,
              },
              0
            )
            .to(
              heroMedia,
              {
                y: mediaParallax,
                ease: "none",
                duration: 1,
              },
              0
            )
            .to(
              heroImage,
              {
                y: imageParallax,
                scale: 1.09,
                ease: "none",
                duration: 1,
              },
              0
            )
            .to(
              processTimeline,
              {
                y: 0,
                scale: 1,
                autoAlpha: 1,
                ease: "power2.out",
                duration: 0.86,
              },
              0.12
            )
            .to(
              processHeader,
              {
                y: 0,
                autoAlpha: 1,
                ease: "power2.out",
                duration: 0.52,
              },
              0.24
            )
            .to(
              processSpine,
              {
                y: 0,
                autoAlpha: 1,
                ease: "power2.out",
                duration: 0.52,
              },
              0.34
            );

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
            document.documentElement.classList.remove("hero-process-handoff-active");

            if (handoffRoot) {
              handoffRoot.style.position = prev.handoffRootPosition;
              handoffRoot.style.zIndex = prev.handoffRootZIndex;
            }
            if (handoffPin) {
              handoffPin.style.position = prev.handoffPinPosition;
              handoffPin.style.zIndex = prev.handoffPinZIndex;
            }
            heroSection.style.position = prev.heroSectionPosition;
            heroSection.style.zIndex = prev.heroSectionZIndex;
            heroRoot.style.overflow = prev.heroRootOverflow;
            heroRoot.style.zIndex = prev.heroRootZIndex;
            if (heroSurfaceGlow) {
              heroSurfaceGlow.style.transform = prev.heroSurfaceGlowTransform;
              heroSurfaceGlow.style.willChange = prev.heroSurfaceGlowWillChange;
            }
            if (heroSurfaceTexture) {
              heroSurfaceTexture.style.transform = prev.heroSurfaceTextureTransform;
              heroSurfaceTexture.style.willChange = prev.heroSurfaceTextureWillChange;
            }
            if (heroBackground) {
              heroBackground.style.transform = prev.heroBackgroundTransform;
              heroBackground.style.willChange = prev.heroBackgroundWillChange;
            }
            if (heroContent) {
              heroContent.style.transform = prev.heroContentTransform;
              heroContent.style.willChange = prev.heroContentWillChange;
            }
            if (heroMedia) {
              heroMedia.style.transform = prev.heroMediaTransform;
              heroMedia.style.willChange = prev.heroMediaWillChange;
            }
            if (heroImage) {
              heroImage.style.transform = prev.heroImageTransform;
              heroImage.style.transformOrigin = prev.heroImageTransformOrigin;
              heroImage.style.willChange = prev.heroImageWillChange;
            }
            processSection.style.position = prev.processSectionPosition;
            processSection.style.zIndex = prev.processSectionZIndex;
            processTimeline.style.position = prev.processTimelinePosition;
            processTimeline.style.zIndex = prev.processTimelineZIndex;
            processTimeline.style.willChange = prev.processTimelineWillChange;
            if (processHeader) processHeader.style.willChange = prev.processHeaderWillChange;
            if (processSpine) processSpine.style.willChange = prev.processSpineWillChange;

            gsap.set([processTimeline, processHeader, processSpine, ...parallaxTargets], {
              clearProps: "transform,opacity,visibility,filter",
            });
          };
        });

        return () => ctx.revert();
      });

      cleanup = () => {
        mm.revert();
        ScrollTrigger.refresh();
      };
    };

    const cancelIdle = requestIdle(init, 1200);

    return () => {
      killed = true;
      cancelIdle();
      cleanup?.();
    };
  }, []);

  return null;
}
