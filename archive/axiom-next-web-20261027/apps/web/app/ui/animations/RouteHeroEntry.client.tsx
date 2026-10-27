"use client";

import { useEffect } from "react";

/** The entrance itself is CSS, so it never waits for client hydration. */
export default function RouteHeroEntry() {
  useEffect(() => {
    const revealFocusedContent = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      let part = event.target.closest("[data-route-hero-entry]");
      while (part) {
        for (const animation of part.getAnimations()) {
          if ("animationName" in animation && animation.animationName === "route-hero-enter") {
            // Finish instead of removing the animation: blurring must not replay it.
            animation.finish();
          }
        }
        part = part.parentElement?.closest("[data-route-hero-entry]") ?? null;
      }
    };

    document.addEventListener("focusin", revealFocusedContent, true);
    return () => document.removeEventListener("focusin", revealFocusedContent, true);
  }, []);

  return null;
}
