"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const PointTerrainCanvas = dynamic(
  () => import("./ProcessTerrainCanvas.client"),
  { ssr: false },
);

type ReferencesCtaWaveBackdropProps = {
  className?: string;
};

export default function ReferencesCtaWaveBackdrop({
  className,
}: ReferencesCtaWaveBackdropProps) {
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
      data-references-wave-host
      ref={hostRef}
    >
      {shouldRender ? <PointTerrainCanvas variant="references" /> : null}
    </div>
  );
}
