"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import silkStyles from "../effects/ReactBitsSilk.module.css";
import {
  HERO_SILK_ENABLE_ATTRIBUTE,
  useHeroEffectEnabled,
} from "./HeroEffectsLifecycle.client";
import { loadHeroSilkRuntime } from "./HeroEffectsRuntime";

const ReactBitsSilk = dynamic(
  loadHeroSilkRuntime,
  {
    loading: () => <HeroSilkFallback state="loading" />,
    ssr: false,
  },
);

type HeroSilkProps = {
  className?: string;
  foregroundSelector?: string;
  interiorImageSelector?: string;
  motionChannel?: string;
};

function HeroSilkFallback({ state = "fallback" }: { state?: "fallback" | "loading" }) {
  return (
    <div
      aria-hidden="true"
      className={silkStyles.root}
      data-hero-effect-placeholder
      data-silk-backdrop
      data-state={state}
    >
      <span className={silkStyles.static} data-silk-static />
      <canvas data-hero-silk-placeholder hidden />
    </div>
  );
}

export default function HeroSilk({
  className,
  foregroundSelector,
  interiorImageSelector,
  motionChannel,
}: HeroSilkProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const effectEnabled = useHeroEffectEnabled(
    hostRef,
    HERO_SILK_ENABLE_ATTRIBUTE,
  );

  useEffect(() => {
    const host = hostRef.current;
    const hero = host?.closest<HTMLElement>("[data-cinematic-home-hero]");
    if (!host || !hero) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const heroRect = hero.getBoundingClientRect();
      host.style.setProperty("--hero-silk-left", "0px");
      host.style.setProperty(
        "--hero-silk-width",
        `${Math.max(1, heroRect.width)}px`,
      );
    };
    const scheduleMeasure = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };
    const resizeObserver = new ResizeObserver(scheduleMeasure);

    resizeObserver.observe(hero);
    scheduleMeasure();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={className}
      data-hero-silk-host
      ref={hostRef}
    >
      {effectEnabled ? (
        <ReactBitsSilk
          foregroundSelector={foregroundSelector}
          interiorImageSelector={interiorImageSelector}
          motionChannel={motionChannel}
          noiseIntensity={0.55}
          pauseAttribute="data-hero-handoff-frozen"
          readyAttribute="data-hero-silk-ready"
          readyTargetSelector="[data-cinematic-home-hero]"
        />
      ) : (
        <HeroSilkFallback />
      )}
    </div>
  );
}
