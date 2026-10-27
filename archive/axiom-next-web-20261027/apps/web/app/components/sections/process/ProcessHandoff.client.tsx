"use client";

import React, { useEffect, useRef } from "react";
import {
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
} from "@/app/theme/design-primitives";
import s from "./ProcessHandoff.module.css";

type ProcessHandoffProps = {
  children: React.ReactNode;
};

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

export default function ProcessHandoff({ children }: ProcessHandoffProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let killed = false;
    let initStarted = false;

    const root = rootRef.current;
    if (!root) return;

    const processSection = root.querySelector<HTMLElement>("#process");
    const handoffSection = root.querySelector<HTMLElement>("#about");
    const videoSection = root.querySelector<HTMLElement>("#video");
    const belowSection = document.querySelector<HTMLElement>("#handoff-below");
    if (!processSection || !handoffSection || !videoSection || !belowSection) {
      return;
    }

    const fireRevealRefresh = () => {
      window.dispatchEvent(new Event("handoff:refresh"));
    };

    let cleanup: null | (() => void) = null;

    const init = async () => {
      try {
        if (killed || initStarted) return;
        initStarted = true;

        const gsapMod = (await import("gsap")) as GsapModule & {
          default?: GsapStatic;
        };
        const stMod = (await import("gsap/ScrollTrigger")) as ScrollTriggerModule & {
          default?: ScrollTriggerStatic;
        };

        const gsap = gsapMod.gsap ?? gsapMod.default;
        const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;
        if (!gsap || !ScrollTrigger) return;

        gsap.registerPlugin(ScrollTrigger);
        if (killed) return;

        const mm = gsap.matchMedia();

        mm.add(`${DESIGN_PRIMITIVE_MEDIA_QUERIES.noReducedMotion} and ${DESIGN_PRIMITIVE_MEDIA_QUERIES.mediaTabletAndUp}`, () => {
          const ctx = gsap.context(() => {
            const pinElement =
              root.querySelector<HTMLElement>("[data-handoff-pin]") ?? root;
            const firstHandoffChild =
              handoffSection.firstElementChild instanceof HTMLElement
                ? handoffSection.firstElementChild
                : null;
            const handoffContent =
              handoffSection.querySelector<HTMLElement>("[data-handoff-content]") ??
              handoffSection.querySelector<HTMLElement>(
                "[data-process-handoff-content]"
              ) ??
              firstHandoffChild;
            const processTree =
              processSection.querySelector<HTMLElement>("[data-process-tree]") ??
              processSection.querySelector<HTMLElement>("[data-process-steps]");
            const videoCopy = videoSection.querySelector<HTMLElement>("[data-video-copy]");
            const videoFrame = videoSection.querySelector<HTMLElement>("[data-video-frame]");
            const videoCard = videoSection.querySelector<HTMLElement>("[data-video-card]");
            const videoPlay = videoSection.querySelector<HTMLElement>("[data-video-play]");
            const videoNote = videoSection.querySelector<HTMLElement>("[data-video-note]");

            const prev = {
              pinPosition: pinElement.style.position,
              pinZIndex: pinElement.style.zIndex,
              pinMinHeight: pinElement.style.minHeight,
              pinOverflow: pinElement.style.overflow,

              processPosition: processSection.style.position,
              processZIndex: processSection.style.zIndex,
              processOverflow: processSection.style.overflow,
              processTransform: processSection.style.transform,
              processWillChange: processSection.style.willChange,
              processTreeTransform: processTree?.style.transform ?? "",
              processTreeOpacity: processTree?.style.opacity ?? "",
              processTreeVisibility: processTree?.style.visibility ?? "",
              processTreeFilter: processTree?.style.filter ?? "",
              processTreeWillChange: processTree?.style.willChange ?? "",

              videoTransform: videoSection.style.transform,
              videoFilter: videoSection.style.filter,
              videoWillChange: videoSection.style.willChange,
              videoPosition: videoSection.style.position,
              videoZIndex: videoSection.style.zIndex,
              videoOpacity: videoSection.style.opacity,
              videoVisibility: videoSection.style.visibility,

              handoffTransform: handoffSection.style.transform,
              handoffFilter: handoffSection.style.filter,
              handoffClipPath: handoffSection.style.clipPath,
              handoffWillChange: handoffSection.style.willChange,
              handoffPosition: handoffSection.style.position,
              handoffOpacity: handoffSection.style.opacity,
              handoffVisibility: handoffSection.style.visibility,
              handoffZIndex: handoffSection.style.zIndex,
              handoffContentTransform: handoffContent?.style.transform ?? "",
              handoffContentOpacity: handoffContent?.style.opacity ?? "",
              handoffContentVisibility: handoffContent?.style.visibility ?? "",
              handoffContentFilter: handoffContent?.style.filter ?? "",
              handoffContentWillChange: handoffContent?.style.willChange ?? "",
            };

            pinElement.style.position = "relative";
            pinElement.style.zIndex = "1";
            pinElement.style.minHeight = "";
            pinElement.style.overflow = "visible";
            processSection.style.position = "relative";
            processSection.style.zIndex = "1";
            processSection.style.overflow = "visible";
            handoffSection.style.position = "relative";
            handoffSection.style.zIndex = "3";
            videoSection.style.position = "relative";
            videoSection.style.zIndex = "4";

            const processDim = document.createElement("div");
            processDim.style.position = "absolute";
            processDim.style.inset = "0";
            processDim.style.pointerEvents = "none";
            processDim.style.background = "var(--overlay-dialog-underlay)";
            processDim.style.boxShadow =
              "inset -160px 0 180px var(--surface-shadow-soft), inset 0 0 0 1px var(--overlay-border)";
            processDim.style.opacity = "0";
            processDim.style.willChange = "opacity";
            processDim.style.zIndex = "8";
            processSection.appendChild(processDim);

            const aboutEdge = document.createElement("div");
            aboutEdge.style.position = "absolute";
            aboutEdge.style.top = "0";
            aboutEdge.style.bottom = "0";
            aboutEdge.style.left = "-1px";
            aboutEdge.style.width = "clamp(90px, 12vw, 190px)";
            aboutEdge.style.pointerEvents = "none";
            aboutEdge.style.background = "var(--border-emphasis-subtle)";
            aboutEdge.style.filter = "blur(0.2px)";
            aboutEdge.style.opacity = "0";
            aboutEdge.style.willChange = "opacity";
            aboutEdge.style.zIndex = "9";
            handoffSection.appendChild(aboutEdge);

            const dim = document.createElement("div");
            dim.style.position = "absolute";
            dim.style.inset = "0";
            dim.style.pointerEvents = "none";
            dim.style.background = "var(--overlay-image-scrim)";
            dim.style.boxShadow =
              "inset 0 0 0 1px var(--overlay-border), inset 0 -120px 160px var(--surface-shadow-soft)";
            dim.style.opacity = "0";
            dim.style.willChange = "opacity";
            dim.style.zIndex = "5";
            handoffSection.appendChild(dim);

            const setHandoffActive = (active: boolean) => {
              document.documentElement.classList.toggle("handoff-active", active);
            };

            gsap.set(processTree, { willChange: "transform,opacity,filter" });
            gsap.set(handoffSection, {
              xPercent: 0,
              y: 0,
              autoAlpha: 1,
              filter: "blur(0px)",
              clipPath: "inset(0% 0% 0% 0%)",
              willChange: "transform,opacity,filter,clip-path",
            });
            gsap.set(handoffContent, {
              x: 0,
              y: 0,
              autoAlpha: 1,
              filter: "blur(0px)",
              willChange: "transform,opacity,filter",
            });
            gsap.set(videoSection, {
              x: 0,
              y: 0,
              autoAlpha: 1,
              willChange: "transform,opacity,filter",
            });
            gsap.set(videoFrame, {
              x: -58,
              y: 0,
              scale: 0.982,
              autoAlpha: 0.72,
              willChange: "transform,opacity",
            });
            gsap.set(videoCard, {
              clipPath: "inset(7% 4% round 24px)",
              willChange: "clip-path",
            });
            gsap.set(videoCopy, {
              x: -28,
              y: 0,
              autoAlpha: 0,
              willChange: "transform,opacity",
            });
            gsap.set(videoPlay, {
              scale: 0.94,
              autoAlpha: 0,
              willChange: "transform,opacity",
            });
            gsap.set(videoNote, {
              x: -12,
              y: 0,
              autoAlpha: 0.65,
              willChange: "transform,opacity",
            });

            const processToAboutTl = gsap.timeline({
              scrollTrigger: {
                trigger: handoffSection,
                start: "top bottom",
                end: "top top",
                scrub: true,
                invalidateOnRefresh: true,
                refreshPriority: 2,
                onEnter: () => setHandoffActive(true),
                onEnterBack: () => setHandoffActive(true),
                onLeave: () => {
                  setHandoffActive(false);
                  fireRevealRefresh();
                },
                onLeaveBack: () => {
                  setHandoffActive(false);
                  gsap.set(processTree, {
                    xPercent: 0,
                    scale: 1,
                    autoAlpha: 1,
                    filter: "blur(0px)",
                  });
                  gsap.set([processDim, aboutEdge], { opacity: 0 });
                  fireRevealRefresh();
                },
              },
            });

            processToAboutTl
              .fromTo(
                handoffSection,
                {
                  xPercent: 104,
                  y: () => -window.innerHeight,
                  autoAlpha: 1,
                  filter: "blur(7px)",
                  clipPath: "inset(0% 0% 0% 8%)",
                },
                {
                  xPercent: 0,
                  y: 0,
                  filter: "blur(0px)",
                  clipPath: "inset(0% 0% 0% 0%)",
                  ease: "none",
                  duration: 1,
                  immediateRender: false,
                },
                0
              )
              .to(
                processTree,
                {
                  xPercent: -9,
                  scale: 0.968,
                  autoAlpha: 0.34,
                  filter: "blur(5px)",
                  ease: "none",
                  duration: 1,
                },
                0
              )
              .to(
                processDim,
                {
                  opacity: 1,
                  ease: "none",
                  duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.reveal,
                },
                0
              )
              .fromTo(
                aboutEdge,
                { opacity: 0.88 },
                { opacity: 0, ease: "none", duration: 0.55 },
                0.45
              );

            const aboutToVideoTl = gsap.timeline({
              scrollTrigger: {
                trigger: videoSection,
                start: "top bottom",
                end: "top top",
                scrub: true,
                invalidateOnRefresh: true,
                refreshPriority: 1,
                onEnter: () => setHandoffActive(true),
                onEnterBack: () => setHandoffActive(true),
                onLeave: () => {
                  setHandoffActive(false);
                  gsap.set(handoffSection, {
                    xPercent: 0,
                    y: 0,
                    autoAlpha: 1,
                    filter: "blur(0px)",
                    clipPath: "inset(0% 0% 0% 0%)",
                  });
                  gsap.set(videoSection, { x: 0, y: 0, autoAlpha: 1 });
                  fireRevealRefresh();
                },
                onLeaveBack: () => {
                  setHandoffActive(false);
                  gsap.set(videoSection, { x: 0, y: 0, autoAlpha: 1 });
                  gsap.set(dim, { opacity: 0 });
                  fireRevealRefresh();
                },
              },
            });

            aboutToVideoTl
              .fromTo(
                videoSection,
                {
                  x: () => -Math.round(window.innerWidth * 1.06),
                  y: () => -window.innerHeight,
                  autoAlpha: 1,
                },
                {
                  x: 0,
                  y: 0,
                  autoAlpha: 1,
                  ease: "none",
                  duration: 1,
                  immediateRender: false,
                },
                0
              )
              .to(
                handoffSection,
                {
                  y: () => window.innerHeight,
                  autoAlpha: 0.18,
                  filter: "blur(3px)",
                  ease: "none",
                  duration: 1,
                },
                0
              )
              .to(
                handoffContent,
                {
                  x: 28,
                  y: 0,
                  autoAlpha: 0.42,
                  filter: "blur(2.5px)",
                  ease: "none",
                  duration:
                    DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.smoothScroll,
                },
                0
              )
              .to(
                videoFrame,
                {
                  x: 0,
                  y: 0,
                  scale: 1,
                  autoAlpha: 1,
                  ease: "none",
                  duration: 0.62,
                },
                0.18
              )
              .to(
                videoCard,
                {
                  clipPath: "inset(0% 0% round 24px)",
                  ease: "none",
                  duration: 0.7,
                },
                0.18
              )
              .to(dim, { opacity: 1, ease: "none", duration: 0.82 }, 0.18)
              .to(
                videoCopy,
                {
                  x: 0,
                  y: 0,
                  autoAlpha: 1,
                  ease: "none",
                  duration: 0.42,
                },
                0.58
              )
              .to(
                videoNote,
                {
                  x: 0,
                  y: 0,
                  autoAlpha: 1,
                  ease: "none",
                  duration: 0.34,
                },
                0.66
              )
              .to(
                videoPlay,
                {
                  scale: 1,
                  autoAlpha: 1,
                  ease: "none",
                  duration: 0.35,
                },
                0.72
              );

            const videoToBelowTl = gsap.timeline({
              scrollTrigger: {
                trigger: belowSection,
                start: "top bottom",
                end: "top top",
                scrub: true,
                invalidateOnRefresh: true,
                refreshPriority: 0,
                onEnter: () => setHandoffActive(true),
                onEnterBack: () => setHandoffActive(true),
                onLeave: () => {
                  setHandoffActive(false);
                  gsap.set(videoSection, {
                    x: 0,
                    y: 0,
                    autoAlpha: 1,
                    filter: "brightness(1) saturate(1)",
                  });
                  fireRevealRefresh();
                },
                onLeaveBack: () => {
                  setHandoffActive(false);
                  gsap.set(videoSection, {
                    x: 0,
                    y: 0,
                    autoAlpha: 1,
                    filter: "brightness(1) saturate(1)",
                  });
                  fireRevealRefresh();
                },
              },
            });

            videoToBelowTl
              .to(
                videoSection,
                {
                  y: () => window.innerHeight,
                  filter: "brightness(0.82) saturate(0.9)",
                  ease: "none",
                  duration: 1,
                },
                0
              )
              .to(
                videoFrame,
                {
                  y: -32,
                  scale: 0.985,
                  ease: "none",
                  duration: 1,
                },
                0
              );

            return () => {
              processToAboutTl.scrollTrigger?.kill();
              aboutToVideoTl.scrollTrigger?.kill();
              videoToBelowTl.scrollTrigger?.kill();
              processToAboutTl.kill();
              aboutToVideoTl.kill();
              videoToBelowTl.kill();

              processDim.remove();
              aboutEdge.remove();
              dim.remove();

              document.documentElement.classList.remove("handoff-active");

              pinElement.style.position = prev.pinPosition;
              pinElement.style.zIndex = prev.pinZIndex;
              pinElement.style.minHeight = prev.pinMinHeight;
              pinElement.style.overflow = prev.pinOverflow;

              processSection.style.position = prev.processPosition;
              processSection.style.zIndex = prev.processZIndex;
              processSection.style.overflow = prev.processOverflow;
              processSection.style.transform = prev.processTransform;
              processSection.style.willChange = prev.processWillChange;
              if (processTree) {
                processTree.style.transform = prev.processTreeTransform;
                processTree.style.opacity = prev.processTreeOpacity;
                processTree.style.visibility = prev.processTreeVisibility;
                processTree.style.filter = prev.processTreeFilter;
                processTree.style.willChange = prev.processTreeWillChange;
              }

              videoSection.style.transform = prev.videoTransform;
              videoSection.style.filter = prev.videoFilter;
              videoSection.style.willChange = prev.videoWillChange;
              videoSection.style.position = prev.videoPosition;
              videoSection.style.zIndex = prev.videoZIndex;
              videoSection.style.opacity = prev.videoOpacity;
              videoSection.style.visibility = prev.videoVisibility;

              handoffSection.style.transform = prev.handoffTransform;
              handoffSection.style.filter = prev.handoffFilter;
              handoffSection.style.clipPath = prev.handoffClipPath;
              handoffSection.style.willChange = prev.handoffWillChange;
              handoffSection.style.position = prev.handoffPosition;
              handoffSection.style.opacity = prev.handoffOpacity;
              handoffSection.style.visibility = prev.handoffVisibility;
              handoffSection.style.zIndex = prev.handoffZIndex;
              if (handoffContent) {
                handoffContent.style.transform = prev.handoffContentTransform;
                handoffContent.style.opacity = prev.handoffContentOpacity;
                handoffContent.style.visibility = prev.handoffContentVisibility;
                handoffContent.style.filter = prev.handoffContentFilter;
                handoffContent.style.willChange = prev.handoffContentWillChange;
              }
            };
          }, root);

          return () => ctx.revert();
        });

        cleanup = () => {
          mm.revert();
          fireRevealRefresh();
          ScrollTrigger.refresh();
        };
      } catch {
        // Keep the page usable if animation setup fails.
      }
    };

    const cancelIdle = requestIdle(init);

    return () => {
      killed = true;
      cancelIdle();
      cleanup?.();
    };
  }, []);

  return (
    <div ref={rootRef} className={s.handoffRoot} data-handoff-root>
      <div className={s.handoffPin} data-handoff-pin>
        {children}
      </div>
    </div>
  );
}
