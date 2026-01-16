"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import s from "./video.module.css";

gsap.registerPlugin(ScrollTrigger);

type VideoScrollPinProps = {
  video: React.ReactNode;
  next: React.ReactNode;
};

const VideoScrollPin = ({ video, next }: VideoScrollPinProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const videoEl = videoRef.current;
    const nextEl = nextRef.current;
    if (!root || !videoEl || !nextEl) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(min-width: 821px)", () => {
      const ctx = gsap.context(() => {
        gsap.set(nextEl, { y: 140, autoAlpha: 0 });
        gsap.set(videoEl, { filter: "brightness(1) saturate(1)" });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: videoEl,
            start: "bottom bottom",
            end: "+=560",
            scrub: true,
            pin: videoEl,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to(
          nextEl,
          {
            y: -60,
            autoAlpha: 1,
            ease: "power3.out",
            duration: 1,
          },
          0
        ).to(
          videoEl,
          {
            filter: "brightness(0.82) saturate(0.9)",
            ease: "power2.out",
            duration: 1,
          },
          0
        );
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <div className={s.scrollPinRoot} ref={rootRef}>
      <div className={s.scrollPinVideo} ref={videoRef}>
        {video}
      </div>
      <div className={s.scrollPinNext} ref={nextRef}>
        {next}
      </div>
    </div>
  );
};

export default VideoScrollPin;
