"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ProcessTimelineEnhancer = () => {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-process-timeline]");
    if (!root) return;

    const ctx = gsap.context(() => {
      const steps = root.querySelector<HTMLElement>("[data-process-steps]");
      const rail = root.querySelector<HTMLElement>("[data-process-rail-fill]");
      if (!steps || !rail) return;

      const points = Array.from(
        root.querySelectorAll<HTMLElement>("[data-process-point]")
      );
      const bodies = Array.from(
        root.querySelectorAll<HTMLElement>("[data-process-body]")
      );

      // INIT
      gsap.set(rail, { scaleY: 0, transformOrigin: "top" });
      gsap.set(points, { scale: 0 });
      gsap.set(bodies, { y: 28, autoAlpha: 0 });

      const stepDuration = 1;
      const totalDuration = points.length * stepDuration;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: steps,
          start: "top 85%",
          end: () => `+=${Math.max(steps.scrollHeight, window.innerHeight)}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // RAIL
      tl.to(
        rail,
        {
          scaleY: 1,
          ease: "none",
          duration: totalDuration,
        },
        0
      );

      // STEPS
      points.forEach((point, i) => {
        const body = bodies[i];
        const t = i * stepDuration;

        tl.to(
          point,
          {
            scale: 1,
            ease: "back.out(1.6)",
            duration: 0.6,
          },
          t
        );

        if (body) {
          tl.to(
            body,
            {
              y: 0,
              autoAlpha: 1,
              ease: "power2.out",
              duration: 0.6,
            },
            t + 0.15
          );
        }
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return null;
};

export default ProcessTimelineEnhancer;
