"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ProcessTerrainCanvas = dynamic(
  () => import("./ProcessTerrainCanvas.client"),
  { ssr: false },
);

type ProcessTerrainBackdropProps = {
  className?: string;
};

export default function ProcessTerrainBackdrop({
  className,
}: ProcessTerrainBackdropProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || shouldRender) return undefined;

    if (!("IntersectionObserver" in window)) {
      const fallbackTimer = setTimeout(() => setShouldRender(true), 0);
      return () => clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShouldRender(true);
      observer.disconnect();
    }, { rootMargin: "500px 0px" });

    observer.observe(host);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div
      aria-hidden="true"
      className={className}
      data-process-terrain-host
      ref={hostRef}
    >
      {shouldRender ? <ProcessTerrainCanvas /> : null}
    </div>
  );
}
