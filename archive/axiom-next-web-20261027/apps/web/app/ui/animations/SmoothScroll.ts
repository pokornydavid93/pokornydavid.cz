"use client";
import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";
import {
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
  designPrimitiveEaseOutQuart,
} from "@/app/theme/design-primitives";

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.smoothScroll,
      easing: designPrimitiveEaseOutQuart,
      wheelMultiplier: 1,   // rychlost scroll kolečkem
      touchMultiplier: 1.5, // můžeš snížit/zesílit na mobilech
      orientation: "vertical",
      gestureOrientation: "vertical",
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return null;
}
