"use client";

/*
 * Adapted from React Bits — Silk.
 * Source: https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Silk/Silk.tsx
 *
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, and distribute the Software as
 * part of an application, website, or product, provided that this copyright
 * notice and permission notice are included. The Software may not be sold,
 * sublicensed, or redistributed as a component, bundle, or ported version.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

import { useEffect, useRef, useState } from "react";
import { createSilkRenderer, SilkVector2, SilkVector4 } from "./silkRenderer";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import {
  HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE,
  HOMEPAGE_HERO_REVEAL_SETTLED_EVENT,
  HOMEPAGE_INTRO_TIMING,
} from "../homepage/HomepageIntro.constants";
import {
  beginReactBitsSilkMotionChannel,
  endReactBitsSilkMotionChannel,
  publishReactBitsSilkMotion,
  REACT_BITS_SILK_PATTERN_GLSL,
} from "./reactBitsSilkMotion";
import s from "./ReactBitsSilk.module.css";

type NormalizedRgb = [number, number, number];

export type ReactBitsSilkProps = {
  className?: string;
  color?: string;
  foregroundSelector?: string;
  interiorImageSelector?: string;
  maxDpr?: number;
  maxFps?: number;
  motionChannel?: string;
  noiseIntensity?: number;
  pauseAttribute?: string;
  readyAttribute?: string;
  readyTargetSelector?: string;
  rotation?: number;
  scale?: number;
  speed?: number;
};

// The base material retains the public React Bits output. The optional hero
// photograph shares its phase, but contributes only its own sampled colors.
const fragmentShader = /* glsl */ `
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3  uColor;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uRotation;
  uniform float uNoiseIntensity;

  #ifdef HERO_INTERIOR_SCENE
    uniform sampler2D uInterior;
    uniform vec4 uInteriorRect;
    uniform vec4 uInteriorCrop;
    uniform vec2 uInteriorDisplacementPixels;
    uniform vec2 uInteriorParallaxPixels;
    uniform vec2 uScenePointer;
    uniform vec2 uViewportSize;
    uniform float uInteriorReady;
  #endif

  const float e = 2.71828182845904523536;

  float noise(vec2 texCoord) {
    float G = e;
    vec2  r = (G * sin(G * texCoord));
    return fract(r.x * r.y * (1.0 + texCoord.x));
  }

  ${REACT_BITS_SILK_PATTERN_GLSL}

  void main() {
    float rnd = noise(gl_FragCoord.xy);
    float silkPhase = reactBitsSilkPhase(
      vUv,
      uTime,
      uSpeed,
      uScale,
      uRotation
    );
    float silkWave = sin(silkPhase);
    float pattern = 0.6 + 0.4 * silkWave;
    vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
    col.a = 1.0;

    #ifdef HERO_INTERIOR_SCENE
      if (uInteriorReady > 0.5) {
        vec2 sceneTopUv = vec2(vUv.x, 1.0 - vUv.y);
        vec2 roomSizePixels = max(uInteriorRect.zw * uViewportSize, vec2(1.0));
        vec2 roomTopUv = (
          (sceneTopUv - uInteriorRect.xy) * uViewportSize
        ) / roomSizePixels;

        if (roomTopUv.x >= 0.0 && roomTopUv.x <= 1.0) {
          // Every existing Silk crest drives both axes through the same
          // scalar height. A quadrature axis would rotate the room instead
          // of continuing the visible folds through its unchanged material.
          vec2 displacement = vec2(silkWave)
            * uInteriorDisplacementPixels / roomSizePixels;
          vec2 sampleRoomTopUv = roomTopUv + displacement
            - uScenePointer * uInteriorParallaxPixels / roomSizePixels;
          vec2 sampleTopUv = clamp(
            uInteriorCrop.xy + sampleRoomTopUv * uInteriorCrop.zw,
            vec2(0.0001), vec2(0.9999)
          );
          vec4 interior = texture2D(
            uInterior, vec2(sampleTopUv.x, 1.0 - sampleTopUv.y)
          );
          // This shader and the legacy Silk output compose in display RGB.
          // The texture keeps the photograph's encoded RGB bytes, avoiding a
          // decode/re-encode roundtrip and any material color multiplication.
          // Keep the horizontal material boundary fixed. Sampling clamps the
          // small motion overscan; room color never fades into Silk vertically.
          float roomMask = smoothstep(0.0, 0.38, roomTopUv.x);
          col.rgb = mix(col.rgb, interior.rgb, roomMask * interior.a);
        }
      }
    #endif

    gl_FragColor = col;
  }
`;

const hexToNormalizedRgb = (hex: string): NormalizedRgb => {
  const clean = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(clean)) return [34 / 255, 79 / 255, 16 / 255];
  return [
    Number.parseInt(clean.slice(0, 2), 16) / 255,
    Number.parseInt(clean.slice(2, 4), 16) / 255,
    Number.parseInt(clean.slice(4, 6), 16) / 255,
  ];
};

const resolveSilkColor = (color?: string): NormalizedRgb => {
  if (color) return hexToNormalizedRgb(color);

  const channels = getComputedStyle(document.documentElement)
    .getPropertyValue("--brand-forest-rgb")
    .split(",")
    .map((value) => Number.parseFloat(value.trim()) / 255);

  return channels.length === 3 && channels.every(Number.isFinite)
    ? channels as NormalizedRgb
    : [34 / 255, 79 / 255, 16 / 255];
};

export default function ReactBitsSilk({
  className,
  color,
  foregroundSelector,
  interiorImageSelector,
  maxDpr,
  maxFps,
  motionChannel,
  noiseIntensity = 1.5,
  pauseAttribute,
  readyAttribute = "data-silk-ready",
  readyTargetSelector,
  rotation = 0,
  scale = 1,
  speed = 5,
}: ReactBitsSilkProps = {}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
    const syncMotionPreference = () => {
      setMotionAllowed(!motionQuery.matches && !forcedColorsQuery.matches);
    };

    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);
    forcedColorsQuery.addEventListener("change", syncMotionPreference);

    return () => {
      motionQuery.removeEventListener("change", syncMotionPreference);
      forcedColorsQuery.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return undefined;

    const readyTarget = readyTargetSelector
      ? shell.closest<HTMLElement>(readyTargetSelector)
      : shell.parentElement;
    const publishStaticFallback = (state: "fallback" | "static") => {
      shell.dataset.state = state;
      shell.removeAttribute("data-silk-paused");
      readyTarget?.removeAttribute(readyAttribute);
      if (interiorImageSelector) {
        readyTarget?.removeAttribute("data-hero-interior-ready");
      }
    };

    if (!motionAllowed) {
      publishStaticFallback("static");
      return () => readyTarget?.removeAttribute(readyAttribute);
    }

    shell.dataset.state = "loading";
    readyTarget?.removeAttribute(readyAttribute);
    let renderer: ReturnType<typeof createSilkRenderer>;

    try {
      renderer = createSilkRenderer(canvas, fragmentShader, Boolean(interiorImageSelector));
    } catch {
      publishStaticFallback("fallback");
      return () => readyTarget?.removeAttribute(readyAttribute);
    }

    const interiorImage = interiorImageSelector
      ? readyTarget?.querySelector<HTMLImageElement>(interiorImageSelector) ?? null
      : null;
    const foreground = foregroundSelector
      ? readyTarget?.querySelector<HTMLElement>(foregroundSelector) ?? null
      : null;
    const originalForegroundTransform = foreground?.style.transform ?? "";
    const finePointerQuery = interiorImageSelector
      ? window.matchMedia("(hover: hover) and (pointer: fine)")
      : null;
    const interiorDisplacementTarget = new SilkVector2(12, 7);
    const uniforms = {
      uColor: { value: resolveSilkColor(color) },
      uNoiseIntensity: { value: noiseIntensity },
      uRotation: { value: rotation },
      uScale: { value: scale },
      uSpeed: { value: speed },
      uTime: { value: 0 },
      uInterior: { value: null as HTMLImageElement | null },
      uInteriorRect: { value: new SilkVector4(0, 0, 1, 1) },
      uInteriorCrop: { value: new SilkVector4(0, 0, 1, 1) },
      uInteriorDisplacementPixels: { value: new SilkVector2(0, 0) },
      uInteriorParallaxPixels: { value: new SilkVector2(9, 5.25) },
      uScenePointer: { value: new SilkVector2(0, 0) },
      uViewportSize: { value: new SilkVector2(1, 1) },
      uInteriorReady: { value: 0 },
    };
    const motionOwner = motionChannel
      ? beginReactBitsSilkMotionChannel(motionChannel, {
        rotation,
        scale,
        speed,
      })
      : null;

    let animationFrame = 0;
    let contextAvailable = true;
    let disposed = false;
    let externallyPaused = Boolean(
      pauseAttribute && readyTarget?.hasAttribute(pauseAttribute),
    );
    let firstFrameRendered = false;
    let isVisible = true;
    let lastFrameAt = performance.now();
    let minimumFrameInterval = 0;
    let readinessFrame = 0;
    let warmupComplete = false;
    let warmupGeneration = 0;
    let interiorTexture: HTMLImageElement | null = null;
    let decodedInteriorSource = "";
    let decodingInteriorSource = "";
    let interiorDecodeGeneration = 0;
    let interiorDecodeInFlight = false;
    let interiorImageFailed = false;
    let scenePhotoVisible = false;
    let scenePointerEnabled = false;
    let interiorMotionProgress = 0;
    let revealSettled = !interiorImageSelector || Boolean(
      readyTarget?.hasAttribute(HOMEPAGE_HERO_REVEAL_SETTLED_ATTRIBUTE),
    );
    let pointerBounds = readyTarget?.getBoundingClientRect() ?? null;
    const pointerTarget = new SilkVector2(0, 0);
    let settleInitialInterior: (() => void) | null = null;
    let interiorReadinessTimer = 0;
    const initialInteriorSettled = new Promise<void>((resolve) => {
      settleInitialInterior = resolve;
    });

    const resolveInitialInterior = () => {
      if (interiorReadinessTimer) {
        window.clearTimeout(interiorReadinessTimer);
        interiorReadinessTimer = 0;
      }
      settleInitialInterior?.();
      settleInitialInterior = null;
    };
    const resetScenePointer = () => {
      pointerTarget.set(0, 0);
      uniforms.uScenePointer.value.set(0, 0);
      if (foreground) foreground.style.transform = originalForegroundTransform;
    };
    const discardInteriorTexture = () => {
      interiorDecodeGeneration += 1;
      interiorDecodeInFlight = false;
      decodingInteriorSource = "";
      interiorTexture = null;
      decodedInteriorSource = "";
      uniforms.uInterior.value = null;
      uniforms.uInteriorReady.value = 0;
      interiorMotionProgress = 0;
      uniforms.uInteriorDisplacementPixels.value.set(0, 0);
      readyTarget?.removeAttribute("data-hero-interior-ready");
    };
    const prepareInteriorTexture = () => {
      if (
        !interiorImage
        || interiorImageFailed
        || !interiorImage.complete
        || interiorImage.naturalWidth <= 1
        || interiorDecodeInFlight
        || decodedInteriorSource === interiorImage.currentSrc
      ) return;

      const source = interiorImage.currentSrc;
      const generation = ++interiorDecodeGeneration;
      interiorDecodeInFlight = true;
      decodingInteriorSource = source;
      // Reuse the already requested semantic image. A loader would download
      // another asset and lose the picture element's responsive source choice.
      void interiorImage.decode().then(() => {
        if (
          disposed
          || generation !== interiorDecodeGeneration
          || interiorImage.currentSrc !== source
        ) return;

        interiorTexture = interiorImage;
        decodedInteriorSource = source;
        uniforms.uInterior.value = interiorImage;
        resolveInitialInterior();
        resize();
      }).catch(() => {
        if (disposed || generation !== interiorDecodeGeneration
          || interiorImage.currentSrc !== source) return;
        interiorImageFailed = true;
        discardInteriorTexture();
        resolveInitialInterior();
        // The static DOM photograph remains available; a failed enhancement
        // must not prevent Silk or the semantic hero from becoming ready.
        resize();
      }).finally(() => {
        if (generation === interiorDecodeGeneration) {
          interiorDecodeInFlight = false;
          decodingInteriorSource = "";
        }
      });
    };
    const measureScene = (width: number, height: number) => {
      if (!interiorImageSelector) {
        resolveInitialInterior();
        return;
      }
      pointerBounds = readyTarget?.getBoundingClientRect() ?? null;
      const imageBox = interiorImage?.getBoundingClientRect();
      const desktopPhoto = Boolean(
        imageBox && imageBox.width > 1 && imageBox.height > 1,
      );
      const source = interiorImage?.currentSrc || interiorImage?.src || "";
      scenePhotoVisible = desktopPhoto && !interiorImageFailed
        && source.length > 0 && !source.startsWith("data:")
        && Boolean(interiorImage && (!interiorImage.complete || interiorImage.naturalWidth > 1));
      if (!interiorImage || !desktopPhoto || interiorImageFailed) {
        if (interiorTexture || interiorDecodeInFlight) discardInteriorTexture();
        uniforms.uInteriorReady.value = 0;
        readyTarget?.removeAttribute("data-hero-interior-ready");
        scenePointerEnabled = false;
        resetScenePointer();
        resolveInitialInterior();
        return;
      }

      if ((decodedInteriorSource && decodedInteriorSource !== interiorImage.currentSrc)
        || (interiorDecodeInFlight && decodingInteriorSource !== interiorImage.currentSrc)) {
        discardInteriorTexture();
      }
      if (interiorImage.complete && interiorImage.naturalWidth <= 1) {
        resolveInitialInterior();
      }
      prepareInteriorTexture();
      const textureAvailable = Boolean(
        interiorTexture && interiorImage.naturalWidth > 1,
      );
      const interiorReady = textureAvailable;
      if (interiorReady && uniforms.uInteriorReady.value < 0.5) {
        interiorMotionProgress = 0;
        uniforms.uInteriorDisplacementPixels.value.set(0, 0);
      }
      uniforms.uInteriorReady.value = interiorReady ? 1 : 0;
      scenePointerEnabled = textureAvailable && revealSettled
        && finePointerQuery?.matches === true;
      if (!scenePointerEnabled) resetScenePointer();
      if (!textureAvailable || !imageBox) return;

      const shellBox = shell.getBoundingClientRect();
      const imageStyle = getComputedStyle(interiorImage);
      const naturalWidth = interiorImage.naturalWidth;
      const naturalHeight = interiorImage.naturalHeight;
      const imageScale = imageStyle.objectFit === "cover"
        ? Math.max(imageBox.width / naturalWidth, imageBox.height / naturalHeight)
        : Math.min(imageBox.width / naturalWidth, imageBox.height / naturalHeight);
      const renderedWidth = naturalWidth * imageScale;
      const renderedHeight = naturalHeight * imageScale;
      const [positionX = "50%", positionY = "50%"] = imageStyle.objectPosition.split(/\s+/);
      const parsePosition = (position: string) => {
        if (position === "left" || position === "top") return 0;
        if (position === "right" || position === "bottom") return 1;
        if (position === "center") return 0.5;
        const value = Number.parseFloat(position);
        return Number.isFinite(value) && position.endsWith("%") ? value / 100 : 0.5;
      };
      uniforms.uInteriorRect.value.set(
        (imageBox.left - shellBox.left) / width,
        (imageBox.top - shellBox.top) / height,
        imageBox.width / width,
        imageBox.height / height,
      );
      uniforms.uInteriorCrop.value.set(
        (renderedWidth - imageBox.width) * parsePosition(positionX) / renderedWidth,
        (renderedHeight - imageBox.height) * parsePosition(positionY) / renderedHeight,
        imageBox.width / renderedWidth,
        imageBox.height / renderedHeight,
      );
    };

    const cancelReadinessFrame = () => {
      if (!readinessFrame) return;
      window.cancelAnimationFrame(readinessFrame);
      readinessFrame = 0;
    };
    const markReady = () => {
      if (firstFrameRendered || canvas.width <= 0 || canvas.height <= 0) return;
      firstFrameRendered = true;
      shell.dataset.state = "ready";
      readyTarget?.setAttribute(readyAttribute, "true");
      if (interiorImageSelector && uniforms.uInteriorReady.value > 0.5) {
        readyTarget?.setAttribute("data-hero-interior-ready", "true");
      }
      start();
    };
    const draw = (deltaSeconds = 0) => {
      if (disposed || !contextAvailable || !warmupComplete) return;
      const delta = Math.min(Math.max(deltaSeconds, 0), 0.1);
      uniforms.uTime.value += 0.1 * delta;
      if (firstFrameRendered && uniforms.uInteriorReady.value > 0.5
        && interiorMotionProgress < 1 && delta > 0
        && !externallyPaused && isVisible && !document.hidden) {
        // Adopt the SSR image with exactly zero geometric displacement.
        // Only the existing presented draw clock introduces the full field;
        // hidden, frozen and offscreen periods do not consume the ramp.
        interiorMotionProgress = Math.min(1, interiorMotionProgress + delta / 0.65);
        uniforms.uInteriorDisplacementPixels.value.copy(interiorDisplacementTarget)
          .multiplyScalar(interiorMotionProgress);
      }
      const scenePointer = uniforms.uScenePointer.value;
      if (scenePointerEnabled && !externallyPaused && delta > 0
        && !scenePointer.equals(pointerTarget)) {
        scenePointer.lerp(pointerTarget, 1 - Math.exp(-delta / 0.25));
        if (scenePointer.distanceToSquared(pointerTarget) < 0.000001) {
          scenePointer.copy(pointerTarget);
        }
        if (foreground) {
          foreground.style.transform = `translate3d(${(scenePointer.x * 20).toFixed(3)}px, ${(scenePointer.y * 12).toFixed(3)}px, 0)`;
        }
      }
      renderer.render(uniforms);
      if (firstFrameRendered && interiorImageSelector && uniforms.uInteriorReady.value > 0.5) {
        if (!readyTarget?.hasAttribute("data-hero-interior-ready")) {
          readyTarget?.setAttribute("data-hero-interior-ready", "true");
        }
      }
      if (motionChannel && motionOwner) {
        publishReactBitsSilkMotion(motionChannel, motionOwner, {
          rotation: uniforms.uRotation.value,
          scale: uniforms.uScale.value,
          speed: uniforms.uSpeed.value,
          time: uniforms.uTime.value,
        });
      }
    };
    const markReadyAfterPresentation = () => {
      cancelReadinessFrame();
      let remainingFrames = 2;
      const settle = () => {
        readinessFrame = 0;
        if (disposed || !contextAvailable || !warmupComplete) return;
        remainingFrames -= 1;
        if (remainingFrames <= 0) {
          markReady();
          return;
        }
        readinessFrame = window.requestAnimationFrame(settle);
      };
      readinessFrame = window.requestAnimationFrame(settle);
    };
    const stop = () => {
      if (!animationFrame) return;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };
    const frame = (time: number) => {
      animationFrame = 0;
      if (
        disposed
        || !contextAvailable
        || !isVisible
        || document.hidden
        || externallyPaused
      ) return;
      const elapsed = time - lastFrameAt;
      if (minimumFrameInterval > 0 && elapsed < minimumFrameInterval) {
        animationFrame = window.requestAnimationFrame(frame);
        return;
      }
      const deltaSeconds = elapsed / 1_000;
      lastFrameAt = time;
      draw(deltaSeconds);
      animationFrame = window.requestAnimationFrame(frame);
    };
    const start = () => {
      if (
        animationFrame
        || disposed
        || !contextAvailable
        || !warmupComplete
        || !firstFrameRendered
        || externallyPaused
        || !isVisible
        || document.hidden
      ) return;
      lastFrameAt = performance.now();
      animationFrame = window.requestAnimationFrame(frame);
    };
    const resize = () => {
      if (disposed || !contextAvailable) return;
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      uniforms.uViewportSize.value.set(width, height);
      measureScene(width, height);
      const mobile = width < 768 && !scenePhotoVisible;
      const pixelRatioCap = Math.min(mobile ? 1 : 1.35, maxDpr ?? 1.35);
      // A small tolerance prevents 60 Hz displays from slipping to every
      // third refresh when two frames land just under 33.33 ms.
      const frameRateCap = Math.min(mobile ? 30 : Infinity, maxFps ?? Infinity);
      minimumFrameInterval = Number.isFinite(frameRateCap) ? (1_000 / frameRateCap) - 2 : 0;
      // The photograph added measurable fragment cost in the same software
      // browser baseline. Rasterize only this scene at 65% of the existing
      // DPR budget; its DOM person, typography and controls stay full quality.
      // Source/geometry decide the budget before readiness, including restore.
      const sceneRasterScale = scenePhotoVisible ? 0.65 : 1;
      renderer.resize(width, height, Math.min(window.devicePixelRatio, pixelRatioCap) * sceneRasterScale);
      if (warmupComplete) draw();
    };
    const syncExternalPause = () => {
      externallyPaused = Boolean(
        pauseAttribute && readyTarget?.hasAttribute(pauseAttribute),
      );
      shell.toggleAttribute("data-silk-paused", externallyPaused);
      lastFrameAt = performance.now();
      if (externallyPaused) stop();
      else start();
    };
    const warmUpRenderer = async () => {
      const generation = ++warmupGeneration;
      cancelReadinessFrame();
      warmupComplete = false;
      firstFrameRendered = false;
      shell.dataset.state = "loading";
      readyTarget?.removeAttribute(readyAttribute);

      try {
        // The existing lifecycle deadline still bounds slow asset readiness.
        // Compilation and image decoding overlap without a second renderer.
        await Promise.all([renderer.compile(), initialInteriorSettled]);
      } catch {
        if (
          disposed
          || generation !== warmupGeneration
          || !contextAvailable
        ) return;
        publishStaticFallback("fallback");
        return;
      }

      if (
        disposed
        || generation !== warmupGeneration
        || !contextAvailable
      ) return;

      // Present the exact uTime=0 frame under the identical poster. Readiness
      // is published only after two compositor frames, so the intro cannot
      // reveal a context whose shader merely compiled but has not painted.
      uniforms.uTime.value = 0;
      warmupComplete = true;
      draw();
      markReadyAfterPresentation();
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? true;
        if (isVisible) start();
        else stop();
      },
      { rootMargin: "100px" },
    );
    const pauseObserver = pauseAttribute && readyTarget
      ? new MutationObserver(syncExternalPause)
      : null;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pointerTarget.set(0, 0);
        stop();
      }
      else start();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (
        !scenePointerEnabled
        || externallyPaused
        || !isVisible
        || document.hidden
        || event.pointerType !== "mouse"
        || !pointerBounds
      ) return;

      const x = (event.clientX - pointerBounds.left) / pointerBounds.width;
      const y = (event.clientY - pointerBounds.top) / pointerBounds.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        pointerTarget.set(0, 0);
        return;
      }
      pointerTarget.set(x * 2 - 1, y * 2 - 1);
    };
    const handlePointerExit = (event: PointerEvent) => {
      if (event.relatedTarget === null) pointerTarget.set(0, 0);
    };
    const handleWindowBlur = () => pointerTarget.set(0, 0);
    const handleScroll = () => {
      pointerBounds = readyTarget?.getBoundingClientRect() ?? null;
    };
    const handlePointerCapabilityChange = () => {
      measureScene(Math.max(1, shell.clientWidth), Math.max(1, shell.clientHeight));
      if (warmupComplete) draw();
    };
    const handleInteriorLoad = () => {
      interiorImageFailed = false;
      resize();
    };
    const handleInteriorError = () => {
      interiorImageFailed = true;
      discardInteriorTexture();
      scenePointerEnabled = false;
      resetScenePointer();
      resolveInitialInterior();
      resize();
    };
    const handleHeroRevealSettled = (event: Event) => {
      const eventHero = (event as CustomEvent<{ hero?: HTMLElement }>).detail?.hero;
      if (eventHero && eventHero !== readyTarget) return;
      revealSettled = true;
      // GSAP has cleared the portrait's entrance transform. Measure once in
      // its final position rather than reading layout throughout the reveal.
      resize();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextAvailable = false;
      warmupGeneration += 1;
      warmupComplete = false;
      cancelReadinessFrame();
      stop();
      resetScenePointer();
      uniforms.uInteriorReady.value = 0;
      interiorMotionProgress = 0;
      uniforms.uInteriorDisplacementPixels.value.set(0, 0);
      publishStaticFallback("fallback");
    };
    const handleContextRestored = () => {
      if (disposed) return;
      contextAvailable = true;
      firstFrameRendered = false;
      shell.dataset.state = "loading";
      resize();
      syncExternalPause();
      void warmUpRenderer();
    };

    resizeObserver.observe(shell);
    if (interiorImage) resizeObserver.observe(interiorImage);
    intersectionObserver.observe(shell);
    if (pauseObserver && readyTarget && pauseAttribute) {
      pauseObserver.observe(readyTarget, {
        attributeFilter: [pauseAttribute],
        attributes: true,
      });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    interiorImage?.addEventListener("load", handleInteriorLoad);
    interiorImage?.addEventListener("error", handleInteriorError);
    if (interiorImageSelector) {
      finePointerQuery?.addEventListener("change", handlePointerCapabilityChange);
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerout", handlePointerExit, { passive: true });
      window.addEventListener("blur", handleWindowBlur);
      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener(HOMEPAGE_HERO_REVEAL_SETTLED_EVENT, handleHeroRevealSettled);
    }
    shell.toggleAttribute("data-silk-paused", externallyPaused);
    resize();
    if (settleInitialInterior) {
      // A request that never loads or errors must not indefinitely gate the
      // existing Silk renderer, including on navigation without an intro.
      // A later successful load can still replace the static DOM photograph.
      interiorReadinessTimer = window.setTimeout(
        resolveInitialInterior,
        HOMEPAGE_INTRO_TIMING.fallbackExitStart,
      );
    }
    syncExternalPause();
    void warmUpRenderer();

    return () => {
      disposed = true;
      warmupGeneration += 1;
      discardInteriorTexture();
      resetScenePointer();
      resolveInitialInterior();
      cancelReadinessFrame();
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      pauseObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      interiorImage?.removeEventListener("load", handleInteriorLoad);
      interiorImage?.removeEventListener("error", handleInteriorError);
      if (interiorImageSelector) {
        finePointerQuery?.removeEventListener("change", handlePointerCapabilityChange);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerout", handlePointerExit);
        window.removeEventListener("blur", handleWindowBlur);
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener(HOMEPAGE_HERO_REVEAL_SETTLED_EVENT, handleHeroRevealSettled);
      }
      readyTarget?.removeAttribute(readyAttribute);
      if (motionChannel && motionOwner) {
        endReactBitsSilkMotionChannel(motionChannel, motionOwner);
      }
      renderer.dispose();
    };
  }, [
    color,
    foregroundSelector,
    interiorImageSelector,
    maxDpr,
    maxFps,
    motionChannel,
    motionAllowed,
    noiseIntensity,
    pauseAttribute,
    readyAttribute,
    readyTargetSelector,
    rotation,
    scale,
    speed,
  ]);

  return (
    <div
      aria-hidden="true"
      className={`${s.root}${className ? ` ${className}` : ""}`}
      data-react-bits-silk
      data-silk-backdrop
      data-silk-interior-source={interiorImageSelector ? "react-bits-silk" : undefined}
      data-silk-motion-channel={motionChannel}
      data-silk-pause-attribute={pauseAttribute}
      data-silk-source="react-bits"
      data-state="static"
      ref={shellRef}
    >
      <span className={s.static} data-silk-static />
      <canvas
        className={s.canvas}
        data-react-bits-silk-canvas
        ref={canvasRef}
      />
    </div>
  );
}
