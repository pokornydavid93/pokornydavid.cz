"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import s from "./liquidLines.module.css";

const LiquidLinesCanvas = dynamic(
  () => import("./LiquidLinesCanvas.client"),
  { ssr: false },
);

export default function LiquidLinesBackdrop() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
    const motionQuery = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    let observer: IntersectionObserver | null = null;

    const stopObserving = () => {
      observer?.disconnect();
      observer = null;
    };

    const syncEnhancement = () => {
      stopObserving();

      if (forcedColorsQuery.matches) {
        host.dataset.state = "forced-colors";
        setShouldRender(false);
        return;
      }

      if (motionQuery.matches) {
        host.dataset.state = "static";
        setShouldRender(false);
        return;
      }

      host.dataset.state = "fallback";
      if (!("IntersectionObserver" in window)) {
        setShouldRender(true);
        return;
      }

      observer = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldRender(true);
        stopObserving();
      }, { rootMargin: "600px 0px" });
      observer.observe(host);
    };

    syncEnhancement();
    forcedColorsQuery.addEventListener("change", syncEnhancement);
    motionQuery.addEventListener("change", syncEnhancement);

    return () => {
      stopObserving();
      forcedColorsQuery.removeEventListener("change", syncEnhancement);
      motionQuery.removeEventListener("change", syncEnhancement);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={s.backdrop}
      data-process-liquid-lines
      data-liquid-lines
      data-renderer="liquid-lines-static"
      data-state="fallback"
      ref={hostRef}
    >
      {shouldRender ? <LiquidLinesCanvas /> : null}
    </div>
  );
}
