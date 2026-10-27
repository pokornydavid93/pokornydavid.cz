"use client";

import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import type gsap from "gsap";
import {
  DESIGN_PRIMITIVE_GSAP_EASES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
  DESIGN_PRIMITIVE_REVEAL_OFFSETS,
} from "@/app/theme/design-primitives";
import { resolvePreset, type RevealPresetName } from "./presets";
import type { RevealMode, RevealPreset } from "./types";

export type TweenVars = gsap.TweenVars;

type RenderProp = (args: {
  ref: (node: HTMLElement | null) => void;
}) => React.ReactElement;

export type RevealEngine = "scrolltrigger" | "io";

type RevealProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode | RenderProp;
  animation?: string;
  from?: string;
  preset?: RevealPresetName | RevealPreset;
  mode?: RevealMode;
  once?: boolean;
  scope?: string;
  delay?: number;
  duration?: number;
  ease?: TweenVars["ease"];
  disabled?: boolean;
  start?: string;
  offset?: number;
  index?: number;
  stagger?: number;
  debug?: boolean;
  engine?: RevealEngine;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "ref" | "children" | "className">;

export function Reveal<T extends ElementType = "div">({
  as,
  children,
  animation,
  from = "bottom",
  preset,
  mode,
  once,
  scope,
  delay,
  duration,
  ease,
  disabled,
  start,
  offset,
  index,
  stagger,
  debug,
  engine = "scrolltrigger",
  className,
  ...rest
}: RevealProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const presetConfig = resolvePreset(preset);

  const resolvedMode: RevealMode =
    mode ??
    presetConfig?.mode ??
    (typeof once === "boolean" ? (once ? "once" : "toggle") : "once");

  const resolvedAnimation =
    animation ?? presetConfig?.animation ?? from ?? "bottom";

  const resolvedDuration =
    duration ??
    presetConfig?.duration ??
    DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.reveal;
  const resolvedDelay = delay ?? presetConfig?.delay ?? 0;
  const resolvedEase =
    ease ?? presetConfig?.ease ?? DESIGN_PRIMITIVE_GSAP_EASES.out;
  const resolvedStart = start ?? presetConfig?.start ?? "top 95%";
  const resolvedOffset =
    offset ?? presetConfig?.offset ?? DESIGN_PRIMITIVE_REVEAL_OFFSETS.medium;
  const resolvedStagger = stagger ?? presetConfig?.stagger;
  const resolvedScope = scope ?? presetConfig?.scope;
  const resolvedDebug = debug ?? presetConfig?.debug ?? false;
  const resolvedDisabled = disabled ?? presetConfig?.disabled ?? false;

  const revealAttributes = {
    "data-reveal-animation": resolvedAnimation,
    "data-reveal-debug": resolvedDebug ? "true" : undefined,
    "data-reveal-delay": resolvedDelay,
    "data-reveal-disabled": resolvedDisabled ? "true" : undefined,
    "data-reveal-duration": resolvedDuration,
    "data-reveal-ease":
      typeof resolvedEase === "string" ? resolvedEase : undefined,
    "data-reveal-engine-item": "",
    "data-reveal-index": index,
    "data-reveal-mode": resolvedMode,
    "data-reveal-offset": resolvedOffset,
    "data-reveal-scope": resolvedScope,
    "data-reveal-stagger": resolvedStagger,
    "data-reveal-start":
      start ?? presetConfig?.start ?? (engine === "io" ? "top 88%" : resolvedStart),
    "data-reveal-trigger": engine,
  };

  if (typeof children === "function") {
    return children({
      ref: (node) => {
        if (!node) return;

        for (const [name, value] of Object.entries(revealAttributes)) {
          if (value === undefined) {
            node.removeAttribute(name);
          } else {
            node.setAttribute(name, String(value));
          }
        }

        window.dispatchEvent(new Event("handoff:refresh"));
      },
    });
  }

  return (
    <Tag className={className} {...rest} {...revealAttributes}>
      {children}
    </Tag>
  );
}
