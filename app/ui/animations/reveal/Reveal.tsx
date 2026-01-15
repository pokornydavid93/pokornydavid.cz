"use client";

import React, {
  useCallback,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { compileAnimation } from "./animationCompiler";
import { resolvePreset, type RevealPresetName } from "./presets";
import { useReveal } from "./useReveal";
import type { RevealMode, RevealPreset } from "./types";

export type TweenVars = gsap.TweenVars;

type RenderProp = (args: {
  ref: (node: HTMLElement | null) => void;
}) => React.ReactElement;

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
  className,
  ...rest
}: RevealProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const [el, setEl] = useState<HTMLElement | null>(null);

  const presetConfig = useMemo(() => resolvePreset(preset), [preset]);

  const resolvedMode: RevealMode =
    mode ??
    presetConfig?.mode ??
    (typeof once === "boolean" ? (once ? "once" : "toggle") : "once");

  const resolvedAnimation =
    animation ?? presetConfig?.animation ?? from ?? "bottom";

  const resolvedDuration = duration ?? presetConfig?.duration ?? 0.9;
  const resolvedDelay = delay ?? presetConfig?.delay ?? 0;
  const resolvedEase = ease ?? presetConfig?.ease ?? "power3.out";
  const resolvedStart = start ?? presetConfig?.start ?? "top 95%";
  const resolvedOffset = offset ?? presetConfig?.offset ?? 120;
  const resolvedStagger = stagger ?? presetConfig?.stagger;
  const resolvedScope = scope ?? presetConfig?.scope;
  const resolvedDebug = debug ?? presetConfig?.debug ?? false;
  const resolvedDisabled = disabled ?? presetConfig?.disabled ?? false;

  const compiledAnimation = useMemo(
    () => compileAnimation(resolvedAnimation, { offset: resolvedOffset }),
    [resolvedAnimation, resolvedOffset]
  );

  const setRef = useCallback((node: HTMLElement | null) => {
    setEl(node);
  }, []);

  useReveal({
    root: el,
    compiledAnimation,
    duration: resolvedDuration,
    ease: resolvedEase,
    delay: resolvedDelay,
    start: resolvedStart,
    stagger: resolvedStagger,
    index,
    mode: resolvedMode,
    disabled: resolvedDisabled,
    debug: resolvedDebug,
    scope: resolvedScope,
  });

  if (typeof children === "function") {
    return children({ ref: setRef });
  }

  return (
    <Tag ref={setRef} className={className} {...rest}>
      {children}
    </Tag>
  );
}
