"use client";

import { useEffect, useRef } from "react";

import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { SITE_THEME_CHANGE_EVENT } from "@/app/theme/site-themes";
import type { CinematicGridPanSegment } from "./cinematicMotion";

type CinematicGridPanProps = {
  className: string;
  rootSelector: string;
  segments: readonly CinematicGridPanSegment[];
};

export const CINEMATIC_GRID_PAN_UPDATE = "cinematic-grid-pan:update";

export type CinematicGridPanDebugDetail = {
  active: boolean;
  progress: number;
  x: number;
  y: number;
  scene: string;
  scrollY: number;
};

type CanvasState = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  width: number;
  height: number;
};

type GridPulse = {
  column: number;
  row: number;
  start: number;
  duration: number;
  strength: number;
};

const GRID_DPR_CAP = 1.35;
const MAIN_GRID_STEP = 96;
const AMBIENT_GRID_STEP = 192;
const AMBIENT_SUBGRID_STEP = 48;
const AMBIENT_PARALLAX_X = 0.26;
const AMBIENT_PARALLAX_Y = 0.18;
const PAN_SNAP_STEP = 1;
const PULSE_BASE_DELAY = 360;
const PULSE_RANDOM_DELAY = 940;
const MAX_ACTIVE_PULSES = 10;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const snapPanValue = (value: number) =>
  Math.round(value / PAN_SNAP_STEP) * PAN_SNAP_STEP;

const computePan = (
  progress: number,
  segments: readonly CinematicGridPanSegment[],
) => {
  let x = 0;
  let y = 0;
  let scene = segments[0]?.id ?? "idle";

  segments.forEach((segment) => {
    if (progress < segment.from) return;

    const span = Math.max(segment.to - segment.from, 0.001);
    const local = clamp((progress - segment.from) / span, 0, 1);

    x += segment.x * local;
    y += segment.y * local;

    scene = segment.id;
  });

  return { x, y, scene };
};

export default function CinematicGridPan({
  className,
  rootSelector,
  segments,
}: CinematicGridPanProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const ambientGridRef = useRef<HTMLCanvasElement | null>(null);
  const mainGridRef = useRef<HTMLCanvasElement | null>(null);
  const pulseRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const ambientGrid = ambientGridRef.current;
    const mainGrid = mainGridRef.current;
    const pulse = pulseRef.current;
    const root = document.querySelector<HTMLElement>(rootSelector);

    if (
      !layer ||
      !ambientGrid ||
      !mainGrid ||
      !pulse ||
      !root ||
      segments.length === 0
    ) {
      return undefined;
    }

    const reducedMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    const desktopMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.mediaTabletAndUp,
    );
    let frame = 0;
    let resizeFrame = 0;
    let pulseTimer = 0;
    let currentX = 0;
    let currentY = 0;
    let nextPulseAt = performance.now() + 420;
    let pulses: GridPulse[] = [];
    let accentRgb = "187, 255, 151";
    let viewportHeight = 1;
    let rootTop = 0;
    let rootHeight = 1;
    let scrollableDistance = 1;
    let renderedPanX = "";
    let renderedPanY = "";
    let renderedScene = "";
    let boundTargets: HTMLElement[] = [];
    const originalTargetTransforms = new WeakMap<HTMLElement, string>();

    const publishDebugState = (detail: CinematicGridPanDebugDetail) => {
      root.dataset.cinematicGridPanActive = detail.active ? "true" : "false";
      root.dataset.cinematicGridPanProgress = detail.progress.toFixed(4);
      root.dataset.cinematicGridPanX = detail.x.toFixed(0);
      root.dataset.cinematicGridPanY = detail.y.toFixed(0);
      root.dataset.cinematicGridPanScene = detail.scene;

      root.dispatchEvent(
        new CustomEvent<CinematicGridPanDebugDetail>(
          CINEMATIC_GRID_PAN_UPDATE,
          { detail },
        ),
      );
    };

    const refreshBoundTargets = () => {
      boundTargets = Array.from(
        root.querySelectorAll<HTMLElement>('[data-cinematic-grid-bound="true"]'),
      );

      boundTargets.forEach((target) => {
        if (!originalTargetTransforms.has(target)) {
          originalTargetTransforms.set(target, target.style.transform);
        }
      });
    };

    const getTargetOrigin = (target: HTMLElement, property: string) => {
      const value = target.style.getPropertyValue(property).trim();
      const parsed = Number.parseFloat(value);

      return Number.isFinite(parsed) ? parsed : 0;
    };

    const restoreBoundTargetTransforms = () => {
      const targetsWithPanStyles = Array.from(
        root.querySelectorAll<HTMLElement>(
          '[style*="--cinematic-grid-pan"], [data-cinematic-grid-transform="true"]',
        ),
      );

      [...boundTargets, ...targetsWithPanStyles].forEach((target) => {
        target.style.removeProperty("--cinematic-grid-pan-x");
        target.style.removeProperty("--cinematic-grid-pan-y");

        if (originalTargetTransforms.has(target)) {
          target.style.transform = originalTargetTransforms.get(target) ?? "";
        }

        delete target.dataset.cinematicGridTransform;
      });
    };

    const applyBoundTargetTransform = (x: number, y: number) => {
      const panX = `${x.toFixed(2)}px`;
      const panY = `${y.toFixed(2)}px`;

      root.style.setProperty("--cinematic-grid-pan-x", panX);
      root.style.setProperty("--cinematic-grid-pan-y", panY);

      if (!desktopMotion.matches) {
        restoreBoundTargetTransforms();
        boundTargets = [];
        return;
      }

      if (boundTargets.length === 0) {
        refreshBoundTargets();
      }

      if (boundTargets.length === 0) {
        return;
      }

      boundTargets.forEach((target) => {
        const originX = getTargetOrigin(target, "--cinematic-grid-origin-x");
        const originY = getTargetOrigin(target, "--cinematic-grid-origin-y");
        const targetX = x + originX;
        const targetY = y + originY;
        const transform = `translate(${Math.round(targetX)}px, ${Math.round(
          targetY,
        )}px)`;

        target.dataset.cinematicGridTransform = "true";

        if (target.style.transform !== transform) {
          target.style.transform = transform;
        }
      });
    };

    const clearPanProperties = () => {
      root.style.removeProperty("--cinematic-grid-pan-x");
      root.style.removeProperty("--cinematic-grid-pan-y");
      restoreBoundTargetTransforms();
      boundTargets = [];
    };

    const createCanvasState = (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d", {
        alpha: true,
        desynchronized: true,
      });

      if (!ctx) return null;

      return {
        canvas,
        ctx,
        dpr: 1,
        width: 1,
        height: 1,
      } satisfies CanvasState;
    };

    const ambientGridState = createCanvasState(ambientGrid);
    const mainGridState = createCanvasState(mainGrid);
    const pulseState = createCanvasState(pulse);

    if (!ambientGridState || !mainGridState || !pulseState) {
      return undefined;
    }

    const updateAccentRgb = () => {
      const rootStyles = window.getComputedStyle(document.documentElement);
      accentRgb =
        rootStyles.getPropertyValue("--text-emphasis-rgb").trim() ||
        rootStyles.getPropertyValue("--brand-lime-rgb").trim() ||
        "176, 228, 84";
    };

    const refreshMetrics = () => {
      const rect = root.getBoundingClientRect();
      viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 1;
      rootTop = rect.top + (window.scrollY || window.pageYOffset || 0);
      rootHeight = Math.max(rect.height, 1);
      scrollableDistance = Math.max(rootHeight - viewportHeight, 1);
    };

    const resizeCanvas = (state: CanvasState) => {
      const rect = state.canvas.getBoundingClientRect();
      const width = Math.max(1, Math.ceil(rect.width));
      const height = Math.max(1, Math.ceil(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, GRID_DPR_CAP);
      const pixelWidth = Math.max(1, Math.ceil(width * dpr));
      const pixelHeight = Math.max(1, Math.ceil(height * dpr));

      if (
        state.canvas.width !== pixelWidth ||
        state.canvas.height !== pixelHeight
      ) {
        state.canvas.width = pixelWidth;
        state.canvas.height = pixelHeight;
      }

      state.dpr = dpr;
      state.width = width;
      state.height = height;
      state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const offsetForStep = (value: number, step: number) =>
      ((value % step) + step) % step;

    const randomPulseDelay = () =>
      PULSE_BASE_DELAY + Math.random() * PULSE_RANDOM_DELAY;

    const drawLines = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      step: number,
      horizontalColor: string,
      verticalColor: string,
      offsetX: number,
      offsetY: number,
    ) => {
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let y = offsetForStep(offsetY, step) - step + 0.5; y <= height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.strokeStyle = horizontalColor;
      ctx.stroke();

      ctx.beginPath();
      for (let x = offsetForStep(offsetX, step) - step + 0.5; x <= width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.strokeStyle = verticalColor;
      ctx.stroke();
    };

    const drawDots = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      step: number,
      offsetX: number,
      offsetY: number,
      radius: number,
      color: string,
    ) => {
      ctx.fillStyle = color;

      for (
        let dotY = offsetForStep(offsetY, step) - step + 0.5;
        dotY <= height;
        dotY += step
      ) {
        for (
          let dotX = offsetForStep(offsetX, step) - step + 0.5;
          dotX <= width;
          dotX += step
        ) {
          ctx.beginPath();
          ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const pickVisibleGridNode = (
      width: number,
      height: number,
      offsetX: number,
      offsetY: number,
      step: number,
    ) => {
      const minColumn = Math.ceil((0 - 0.5 - offsetX) / step);
      const maxColumn = Math.floor((width - 0.5 - offsetX) / step);
      const minRow = Math.ceil((0 - 0.5 - offsetY) / step);
      const maxRow = Math.floor((height - 0.5 - offsetY) / step);
      const columns = Math.max(1, maxColumn - minColumn + 1);
      const rows = Math.max(1, maxRow - minRow + 1);

      return {
        column: minColumn + Math.floor(Math.random() * columns),
        row: minRow + Math.floor(Math.random() * rows),
      };
    };

    const spawnPulse = (now: number, x: number, y: number) => {
      const node = pickVisibleGridNode(
        mainGridState.width,
        mainGridState.height,
        x,
        y,
        MAIN_GRID_STEP,
      );

      pulses.push({
        ...node,
        start: now,
        duration: 1780 + Math.random() * 760,
        strength: 0.95 + Math.random() * 0.36,
      });

      if (pulses.length > MAX_ACTIVE_PULSES) {
        pulses = pulses.slice(-MAX_ACTIVE_PULSES);
      }
    };

    const drawPulses = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      offsetX: number,
      offsetY: number,
      now: number,
    ) => {
      if (!pulses.length) return false;

      let hasActivePulse = false;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      pulses.forEach((pulse) => {
        const life = (now - pulse.start) / pulse.duration;

        if (life < 0 || life > 1) return;

        hasActivePulse = true;
        const wave = Math.sin(life * Math.PI);
        const fade = (1 - life) * pulse.strength;
        const haloRadius = 18 + 15 * life;
        const ringRadius = 3.2 + 11 * life;
        const pulseX = 0.5 + offsetX + pulse.column * MAIN_GRID_STEP;
        const pulseY = 0.5 + offsetY + pulse.row * MAIN_GRID_STEP;

        if (
          pulseX < -haloRadius ||
          pulseX > width + haloRadius ||
          pulseY < -haloRadius ||
          pulseY > height + haloRadius
        ) {
          return;
        }

        ctx.strokeStyle = `rgba(${accentRgb}, ${0.34 * wave * fade})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(${accentRgb}, ${0.42 * wave * pulse.strength})`;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 2.1 + 0.9 * wave, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      pulses = pulses.filter((pulse) => now - pulse.start <= pulse.duration);

      return hasActivePulse;
    };

    const drawAmbientGridCanvas = (x: number, y: number) => {
      const ambientCtx = ambientGridState.ctx;
      const ambientX = x * AMBIENT_PARALLAX_X;
      const ambientY = y * AMBIENT_PARALLAX_Y;

      ambientCtx.clearRect(
        0,
        0,
        ambientGridState.width,
        ambientGridState.height,
      );

      drawLines(
        ambientCtx,
        ambientGridState.width,
        ambientGridState.height,
        AMBIENT_SUBGRID_STEP,
        `rgba(${accentRgb}, 0.018)`,
        `rgba(${accentRgb}, 0.014)`,
        ambientX,
        ambientY,
      );

      drawLines(
        ambientCtx,
        ambientGridState.width,
        ambientGridState.height,
        AMBIENT_GRID_STEP,
        `rgba(${accentRgb}, 0.052)`,
        `rgba(${accentRgb}, 0.044)`,
        ambientX,
        ambientY,
      );

      drawDots(
        ambientCtx,
        ambientGridState.width,
        ambientGridState.height,
        AMBIENT_GRID_STEP,
        ambientX,
        ambientY,
        1.15,
        `rgba(${accentRgb}, 0.12)`,
      );
    };

    const drawGridCanvases = (x: number, y: number) => {
      const mainGridCtx = mainGridState.ctx;

      drawAmbientGridCanvas(x, y);
      mainGridCtx.clearRect(0, 0, mainGridState.width, mainGridState.height);

      drawLines(
        mainGridCtx,
        mainGridState.width,
        mainGridState.height,
        MAIN_GRID_STEP,
        `rgba(${accentRgb}, 0.095)`,
        `rgba(${accentRgb}, 0.08)`,
        x,
        y,
      );

      drawDots(
        mainGridCtx,
        mainGridState.width,
        mainGridState.height,
        MAIN_GRID_STEP,
        x,
        y,
        1.45,
        `rgba(${accentRgb}, 0.26)`,
      );
    };

    const drawPulseCanvas = (x: number, y: number, now = performance.now()) => {
      const pulseCtx = pulseState.ctx;

      pulseCtx.clearRect(0, 0, pulseState.width, pulseState.height);

      return drawPulses(
        pulseCtx,
        pulseState.width,
        pulseState.height,
        x,
        y,
        now,
      );
    };

    const renderPan = (x: number, y: number, scene: string, now?: number) => {
      const snappedX = snapPanValue(x);
      const snappedY = snapPanValue(y);
      const panX = `${snappedX.toFixed(2)}px`;
      const panY = `${snappedY.toFixed(2)}px`;

      if (renderedPanX !== panX || renderedPanY !== panY) {
        drawGridCanvases(snappedX, snappedY);
      }

      const hasActivePulse = drawPulseCanvas(snappedX, snappedY, now);

      if (renderedPanX !== panX || renderedPanY !== panY) {
        applyBoundTargetTransform(snappedX, snappedY);
        renderedPanX = panX;
        renderedPanY = panY;
      }

      if (renderedScene !== scene) {
        root.dataset.cinematicGridPanScene = scene;
        layer.dataset.gridPanScene = scene;
        renderedScene = scene;
      }

      return hasActivePulse;
    };

    const readProgressState = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      return {
        active:
          scrollY + viewportHeight > rootTop && scrollY < rootTop + rootHeight,
        progress: clamp((scrollY - rootTop) / scrollableDistance, 0, 1),
        scrollY,
      };
    };

    const update = () => {
      frame = 0;
      if (pulseTimer !== 0) {
        window.clearTimeout(pulseTimer);
        pulseTimer = 0;
      }

      const now = performance.now();
      const progressState = readProgressState();
      const activeOpacity = progressState.active ? "0.96" : "0";

      if (layer.style.getPropertyValue("--grid-pan-opacity") !== activeOpacity) {
        layer.style.setProperty("--grid-pan-opacity", activeOpacity);
      }

      if (!progressState.active) {
        publishDebugState({
          active: false,
          progress: progressState.progress,
          x: currentX,
          y: currentY,
          scene: "inactive",
          scrollY: Math.round(progressState.scrollY),
        });
        return;
      }

      if (reducedMotion.matches) {
        renderPan(0, 0, "reduced-motion", now);
        publishDebugState({
          active: true,
          progress: progressState.progress,
          x: 0,
          y: 0,
          scene: "reduced-motion",
          scrollY: Math.round(progressState.scrollY),
        });
        return;
      }

      const pan = computePan(progressState.progress, segments);
      const targetX = snapPanValue(pan.x);
      const targetY = snapPanValue(pan.y);
      currentX = targetX;
      currentY = targetY;

      if (now >= nextPulseAt) {
        spawnPulse(now, currentX, currentY);
        nextPulseAt = now + randomPulseDelay();
      }

      const hasActivePulse = renderPan(currentX, currentY, pan.scene, now);
      publishDebugState({
        active: true,
        progress: progressState.progress,
        x: currentX,
        y: currentY,
        scene: pan.scene,
        scrollY: Math.round(progressState.scrollY),
      });

      if (hasActivePulse) {
        frame = window.requestAnimationFrame(update);
      } else {
        const delay = Math.max(80, nextPulseAt - now);
        pulseTimer = window.setTimeout(requestUpdate, delay);
      }
    };

    const requestUpdate = () => {
      if (pulseTimer !== 0) {
        window.clearTimeout(pulseTimer);
        pulseTimer = 0;
      }

      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const requestResize = () => {
      if (resizeFrame !== 0) return;

      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        updateAccentRgb();
        refreshMetrics();
        resizeCanvas(ambientGridState);
        resizeCanvas(mainGridState);
        resizeCanvas(pulseState);
        drawGridCanvases(currentX, currentY);
        drawPulseCanvas(currentX, currentY, performance.now());
        requestUpdate();
      });
    };

    const resizeObserver = new ResizeObserver(requestResize);
    resizeObserver.observe(layer);
    resizeObserver.observe(root);
    refreshBoundTargets();
    updateAccentRgb();
    refreshMetrics();
    resizeCanvas(ambientGridState);
    resizeCanvas(mainGridState);
    resizeCanvas(pulseState);
    drawGridCanvases(0, 0);
    drawPulseCanvas(0, 0);
    requestUpdate();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestResize);
    window.addEventListener(SITE_THEME_CHANGE_EVENT, requestResize);
    reducedMotion.addEventListener("change", requestUpdate);
    desktopMotion.addEventListener("change", requestResize);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      if (resizeFrame !== 0) {
        window.cancelAnimationFrame(resizeFrame);
      }

      if (pulseTimer !== 0) {
        window.clearTimeout(pulseTimer);
      }

      resizeObserver.disconnect();
      clearPanProperties();
      delete root.dataset.cinematicGridPanScene;
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestResize);
      window.removeEventListener(SITE_THEME_CHANGE_EVENT, requestResize);
      reducedMotion.removeEventListener("change", requestUpdate);
      desktopMotion.removeEventListener("change", requestResize);
    };
  }, [rootSelector, segments]);

  return (
    <div ref={layerRef} className={className} data-cinematic-grid-pan>
      <canvas ref={ambientGridRef} data-grid-pan-canvas="ambient-grid" />
      <canvas ref={mainGridRef} data-grid-pan-canvas="main-grid" />
      <canvas ref={pulseRef} data-grid-pan-canvas="pulse" />
    </div>
  );
}
