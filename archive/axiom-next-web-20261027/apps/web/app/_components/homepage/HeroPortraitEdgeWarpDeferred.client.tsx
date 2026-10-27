"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import {
  HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE,
  useHeroEffectEnabled,
} from "./HeroEffectsLifecycle.client";
import { loadHeroPortraitWarpRuntime } from "./HeroEffectsRuntime";

type HeroPortraitEdgeWarpDeferredProps = {
  className?: string;
  motionChannel: string;
};

const HeroPortraitEdgeWarp = dynamic(
  loadHeroPortraitWarpRuntime,
  {
    loading: () => (
      <div
        aria-hidden="true"
        data-hero-effect-placeholder
        data-hero-portrait-warp
        data-state="loading"
      >
        <canvas data-hero-portrait-warp-canvas hidden />
      </div>
    ),
    ssr: false,
  },
);

export default function HeroPortraitEdgeWarpDeferred({
  className,
  motionChannel,
}: HeroPortraitEdgeWarpDeferredProps) {
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const effectEnabled = useHeroEffectEnabled(
    placeholderRef,
    HERO_PORTRAIT_WARP_ENABLE_ATTRIBUTE,
  );

  if (effectEnabled) {
    return (
      <HeroPortraitEdgeWarp
        className={className}
        motionChannel={motionChannel}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={className}
      data-hero-effect-placeholder
      data-hero-portrait-warp
      data-silk-motion-channel={motionChannel}
      data-state="fallback"
      ref={placeholderRef}
    >
      <canvas data-hero-portrait-warp-canvas hidden />
    </div>
  );
}
