"use client";

import type { CSSProperties } from "react";

import styles from "./RouteTransition.module.css";
import type { RouteTransitionPhase, RouteTransitionTone } from "./routeTransition.types";

type RouteTransitionOverlayProps = {
  originX: number;
  originY: number;
  phase: RouteTransitionPhase;
  reducedMotion: boolean;
  scale: number;
  tone: RouteTransitionTone;
  useSnapshotReveal: boolean;
};

type RouteTransitionStyle = CSSProperties & {
  "--route-transition-origin-x": string;
  "--route-transition-origin-y": string;
  "--route-transition-scale": string;
};

export default function RouteTransitionOverlay({
  originX,
  originY,
  phase,
  reducedMotion,
  scale,
  tone,
  useSnapshotReveal,
}: RouteTransitionOverlayProps) {
  const isActive = phase !== "idle";

  return (
    <div
      className={[
        styles.overlay,
        isActive ? styles.overlayActive : "",
        phase === "cover" ? styles.cover : "",
        phase === "reveal" ? styles.reveal : "",
        reducedMotion ? styles.reduced : "",
        useSnapshotReveal ? styles.snapshotMode : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-route-transition-overlay
      data-route-transition-phase={phase}
      data-route-transition-tone={tone}
      aria-hidden="true"
      style={
        {
          "--route-transition-origin-x": `${originX}px`,
          "--route-transition-origin-y": `${originY}px`,
          "--route-transition-scale": String(scale),
        } as RouteTransitionStyle
      }
    >
      <div className={styles.scrim} />
      <div className={styles.lens} />
    </div>
  );
}
