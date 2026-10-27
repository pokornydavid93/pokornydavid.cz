"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import {
  deactivateCursorMotionSnapshot,
  publishCursorMotionSnapshot,
  resetCursorMotionSnapshot,
} from "./cursorMotion";
import type {
  CursorPresentation,
  CursorSurface,
  CursorVariant,
} from "./cursor.types";
import s from "./CustomCursor.module.css";

const CLICK_INPUT_SELECTOR =
  "input:is([type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='image'])";
const AUTOMATIC_INTERACTIVE_SELECTOR =
  `a[href], button, details > summary, [role='button'], ${CLICK_INPUT_SELECTOR}`;
const NATIVE_CURSOR_SELECTOR =
  `input:not(${CLICK_INPUT_SELECTOR}), textarea, select, option, iframe, video[controls], audio[controls], [contenteditable]:not([contenteditable='false']), [data-native-cursor]`;
const VISUAL_SURFACE_SELECTOR = "[data-cursor-surface-transition]";
const REDUCED_MOTION_QUERY = DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion;
// Keep the reticle geometry and interaction behavior available for a future return.
const SHOW_CURSOR_RETICLE = false;
const MAGNETIC_TARGET_MAX_OFFSET = 3.5;
const TARGET_FRAME_GAP = 10;
const TARGET_FRAME_VIEWPORT_INSET = TARGET_FRAME_GAP + 2;
const INTERACTION_ZONE_PADDING = 18;
const FOLLOW_TWEEN_DURATION = 0.16;
const FRAMED_FOLLOW_TWEEN_DURATION = 0.28;
const LAYOUT_GEOMETRY_TRACKING_DURATION = 520;
const STARTING_ORIENTATION = -135;
const CURSOR_SPEED_REFERENCE = 22;
const CURSOR_SPEED_LIMIT = 64;
const FRAME_DURATION_MS = 1_000 / 60;
const POINTER_VELOCITY_RESPONSE_MS = 72;
const POINTER_VELOCITY_DECAY_MS = 118;
const RETICLE_ENERGY_RESPONSE_MS = 82;
const RETICLE_DIRECTION_THRESHOLD = 0.28;
const RETICLE_ROTATION_STIFFNESS = 80;
const RETICLE_ROTATION_DAMPING = 18;
const RETICLE_MAX_ANGULAR_SPEED = 420;
const RETICLE_MAX_SPEED_STEP = 3.2;
const CLIPPING_OVERFLOW_VALUES = new Set(["auto", "clip", "hidden", "scroll"]);

type MagneticOffsetBounds = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
};

const DEFAULT_PRESENTATION: CursorPresentation = {
  coreSurface: "dark",
  icon: "arrow",
  showsCoreIcon: false,
  surface: "dark",
  variant: "default",
};

const CURSOR_VARIANTS = new Set<CursorVariant>([
  "default",
  "link",
  "action",
  "video",
  "external",
  "article",
  "case",
  "drag",
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snapToDevicePixel(value: number) {
  const pixelRatio = window.devicePixelRatio || 1;
  return Math.round(value * pixelRatio) / pixelRatio;
}

function toCursorTransform(x: number, y: number) {
  return `translate3d(${snapToDevicePixel(x)}px, ${snapToDevicePixel(y)}px, 0)`;
}

function measureUnmagnetizedRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const [renderedX = "0", renderedY = "0"] = window
    .getComputedStyle(element)
    .translate
    .split(/\s+/u);
  const magneticX = Number.parseFloat(renderedX) || 0;
  const magneticY = Number.parseFloat(renderedY) || 0;

  return new DOMRect(
    rect.x - magneticX,
    rect.y - magneticY,
    rect.width,
    rect.height,
  );
}

function measureMagneticOffsetBounds(
  element: HTMLElement,
  targetRect: DOMRect,
): MagneticOffsetBounds {
  let minX = -MAGNETIC_TARGET_MAX_OFFSET;
  let maxX = MAGNETIC_TARGET_MAX_OFFSET;
  let minY = -MAGNETIC_TARGET_MAX_OFFSET;
  let maxY = MAGNETIC_TARGET_MAX_OFFSET;
  let ancestor = element.parentElement;

  while (ancestor && ancestor !== document.body) {
    const style = window.getComputedStyle(ancestor);
    const clipsX = CLIPPING_OVERFLOW_VALUES.has(style.overflowX);
    const clipsY = CLIPPING_OVERFLOW_VALUES.has(style.overflowY);
    if (clipsX || clipsY) {
      const rect = ancestor.getBoundingClientRect();
      const scaleX = ancestor.offsetWidth > 0
        ? rect.width / ancestor.offsetWidth
        : 1;
      const scaleY = ancestor.offsetHeight > 0
        ? rect.height / ancestor.offsetHeight
        : 1;
      const clipLeft = rect.left + ancestor.clientLeft * scaleX;
      const clipTop = rect.top + ancestor.clientTop * scaleY;
      const clipRight = clipLeft + ancestor.clientWidth * scaleX;
      const clipBottom = clipTop + ancestor.clientHeight * scaleY;

      if (clipsX) {
        minX = Math.max(minX, clipLeft - targetRect.left);
        maxX = Math.min(maxX, clipRight - targetRect.right);
      }
      if (clipsY) {
        minY = Math.max(minY, clipTop - targetRect.top);
        maxY = Math.min(maxY, clipBottom - targetRect.bottom);
      }
    }
    ancestor = ancestor.parentElement;
  }

  return {
    maxX: minX <= maxX ? maxX : 0,
    maxY: minY <= maxY ? maxY : 0,
    minX: minX <= maxX ? minX : 0,
    minY: minY <= maxY ? minY : 0,
  };
}

function pointIsInsideExpandedRect(
  x: number,
  y: number,
  rect: DOMRect,
  padding: number,
) {
  return x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding;
}

function dampAmount(deltaMs: number, responseMs: number) {
  return 1 - Math.exp(-deltaMs / responseMs);
}

function getShortestAngleDelta(current: number, target: number) {
  return ((target - current + 540) % 360) - 180;
}

function isDisabledInteraction(element: HTMLElement) {
  if (element.closest("[inert], [aria-disabled='true']")) return true;
  if (element.matches(":disabled")) return true;
  // Labels remain clickable when their associated inputs are visually hidden,
  // but must follow the control's disabled state, including a disabled fieldset.
  if (element instanceof HTMLLabelElement && element.control) {
    if (element.control.matches(":disabled")) return true;
    if (element.control.closest("[inert], [aria-disabled='true']")) return true;
  }
  if (!element.checkVisibility({
    checkOpacity: true,
    checkVisibilityCSS: true,
  })) return true;

  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute("href");
    if (!href?.trim()) return true;
  }

  return window.getComputedStyle(element).pointerEvents === "none";
}

function getAutomaticInteractionOwner(target: Element) {
  const interactive = target.closest<HTMLElement>(AUTOMATIC_INTERACTIVE_SELECTOR);
  const label = target.closest("label");
  if (
    label?.control?.matches(CLICK_INPUT_SELECTOR) &&
    (!interactive || interactive === label.control)
  ) return label;

  return interactive;
}

function isElementReadyForCursorFrame(element: HTMLElement) {
  if (!element.isConnected) return false;
  if (!element.checkVisibility({
    checkOpacity: true,
    checkVisibilityCSS: true,
  })) return false;

  const rect = measureUnmagnetizedRect(element);
  if (rect.width <= 0 || rect.height <= 0) return false;

  return rect.left >= TARGET_FRAME_VIEWPORT_INSET &&
    rect.top >= TARGET_FRAME_VIEWPORT_INSET &&
    rect.right <= window.innerWidth - TARGET_FRAME_VIEWPORT_INSET &&
    rect.bottom <= window.innerHeight - TARGET_FRAME_VIEWPORT_INSET;
}

function getCursorFrameTarget(element: HTMLElement) {
  const compactSelector = element.dataset.cursorCompactFrameTarget?.trim();
  const selector = compactSelector && window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.compactLayout,
    ).matches
    ? compactSelector
    : element.dataset.cursorFrameTarget?.trim();
  if (!selector) return element;

  try {
    return element.querySelector<HTMLElement>(selector) ?? element;
  } catch {
    return element;
  }
}

function getCursorClickTarget(element: HTMLElement) {
  const compactSelector = element.dataset.cursorCompactClickTarget?.trim();
  const selector = compactSelector && window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.compactLayout,
    ).matches
    ? compactSelector
    : element.dataset.cursorClickTarget?.trim();
  if (!selector) return element;

  try {
    return element.querySelector<HTMLElement>(selector) ?? element;
  } catch {
    return element;
  }
}

function normalizeSurface(value: string | undefined | null): CursorSurface {
  if (value === "action" || value?.includes("action")) return "action";
  if (value === "light" || value?.includes("light") || value?.includes("paper")) {
    return "light";
  }
  return "dark";
}

function getSurface(target: Element): CursorSurface {
  const owner = target.closest<HTMLElement>(
    "[data-cursor-surface], [data-surface-tone], [data-nav-section]",
  );

  const explicitSurface = owner?.dataset.cursorSurface ??
    owner?.dataset.surfaceTone ??
    owner?.dataset.navSection;

  return explicitSurface ? normalizeSurface(explicitSurface) : "dark";
}

function getInteractionSurface(
  target: Element,
  owner: HTMLElement,
  contextualSurface: CursorSurface,
): CursorSurface {
  const localSurface = target.closest<HTMLElement>("[data-cursor-surface]");
  if (localSurface && (localSurface === owner || owner.contains(localSurface))) {
    return normalizeSurface(localSurface.dataset.cursorSurface);
  }

  // Primary CTAs invert their containing surface: lime on dark, forest on
  // light/action. The cursor follows that actual control material instead of
  // inheriting only the larger section behind it.
  if (owner.dataset.variant === "primary-action") {
    return contextualSurface === "dark" ? "action" : "dark";
  }

  return contextualSurface;
}

function parseClipLength(value: string, reference: number) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return value.endsWith("%") ? reference * parsed / 100 : parsed;
}

function pointIsInsideVisualSurface(
  element: HTMLElement,
  x: number,
  y: number,
) {
  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number.parseFloat(style.opacity) <= 0
  ) return false;

  const rect = element.getBoundingClientRect();
  if (!pointIsInsideExpandedRect(x, y, rect, 0)) return false;

  const clipPath = style.clipPath.trim();
  if (!clipPath || clipPath === "none") return true;
  if (element.dataset.cursorSurfaceTransition !== "clip-path") return false;

  const circle = clipPath.match(
    /^circle\(\s*([\d.-]+(?:px|%)?)\s+at\s+([\d.-]+(?:px|%)?)\s+([\d.-]+(?:px|%)?)\s*\)$/u,
  );
  if (!circle) return false;

  const radiusReference = Math.hypot(rect.width, rect.height) / Math.SQRT2;
  const radius = parseClipLength(circle[1], radiusReference);
  const centerX = parseClipLength(circle[2], rect.width);
  const centerY = parseClipLength(circle[3], rect.height);
  if (radius === null || centerX === null || centerY === null) return false;

  return Math.hypot(
    x - (rect.left + centerX),
    y - (rect.top + centerY),
  ) <= radius;
}

function getVisualSurfaceAtPoint(
  x: number,
  y: number,
  surfaces: readonly HTMLElement[],
) {
  for (let index = surfaces.length - 1; index >= 0; index -= 1) {
    const surface = surfaces[index];
    if (!pointIsInsideVisualSurface(surface, x, y)) continue;
    const value = surface.dataset.cursorSurface ?? surface.dataset.surfaceTone;
    if (value) return normalizeSurface(value);
  }

  return null;
}

function getPresentation(
  target: Element,
  surfaceOverride?: CursorSurface | null,
): {
  clickTarget: HTMLElement | null;
  element: HTMLElement | null;
  framed: boolean;
  magnetic: boolean;
  owner: HTMLElement | null;
  presentation: CursorPresentation;
  splitCore: boolean;
  suppressed: boolean;
} {
  const contextualSurface = surfaceOverride ?? getSurface(target);

  if (target.closest(NATIVE_CURSOR_SELECTOR)) {
    return {
      clickTarget: null,
      element: null,
      framed: false,
      magnetic: false,
      owner: null,
      presentation: {
        ...DEFAULT_PRESENTATION,
        coreSurface: contextualSurface,
        surface: contextualSurface,
      },
      splitCore: false,
      suppressed: true,
    };
  }

  const owner = target.closest<HTMLElement>("[data-cursor]") ??
    getAutomaticInteractionOwner(target);
  if (!owner || isDisabledInteraction(owner)) {
    return {
      clickTarget: null,
      element: null,
      framed: false,
      magnetic: false,
      owner: null,
      presentation: {
        ...DEFAULT_PRESENTATION,
        coreSurface: contextualSurface,
        surface: contextualSurface,
      },
      splitCore: false,
      suppressed: false,
    };
  }

  const element = getCursorFrameTarget(owner);
  const clickTarget = getCursorClickTarget(owner);
  const coreSurface = getInteractionSurface(target, owner, contextualSurface);
  const explicitVariant = owner.dataset.cursor;
  const variant = explicitVariant && CURSOR_VARIANTS.has(explicitVariant as CursorVariant)
    ? (explicitVariant as CursorVariant)
    : owner instanceof HTMLAnchorElement &&
        (owner.target === "_blank" || owner.origin !== window.location.origin)
      ? "external"
      : "link";
  // Native disclosure and form controls use their own hit areas. Moving them or
  // adding an expanded click zone can interfere with labels and radio toggles.
  const isNativeControl = owner.matches('summary, input, label, textarea, select, [aria-pressed], [role="radio"], [role="checkbox"], [role="switch"]') ||
    owner.closest('form, fieldset, [role="radiogroup"]') !== null;
  const magnetic = !isNativeControl && !owner.hasAttribute("data-cursor-no-magnetic");
  const framed = !isNativeControl && !owner.hasAttribute("data-cursor-no-frame");
  return {
    clickTarget,
    element,
    framed,
    magnetic,
    owner,
    presentation: {
      coreSurface,
      icon: "hand",
      showsCoreIcon: true,
      surface: contextualSurface,
      variant,
    },
    // A framed interaction moves only the outer focus field onto its target.
    // The precision core remains an independent pointer-position indicator.
    splitCore: framed || owner.hasAttribute("data-cursor-split-core"),
    suppressed: false,
  };
}

function presentationsMatch(
  current: CursorPresentation,
  next: CursorPresentation,
) {
  return current.icon === next.icon &&
    current.coreSurface === next.coreSurface &&
    current.showsCoreIcon === next.showsCoreIcon &&
    current.surface === next.surface &&
    current.variant === next.variant;
}

export default function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const fieldShapeRef = useRef<HTMLDivElement>(null);
  const interactionZoneRef = useRef<HTMLSpanElement | null>(null);
  const followerXToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const followerYToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const followerPositionRef = useRef({ x: 0, y: 0 });
  const previousPointerRef = useRef({ time: 0, x: 0, y: 0 });
  const pointerVelocityRef = useRef({ x: 0, y: 0 });
  const smoothedVelocityRef = useRef({ x: 0, y: 0 });
  const targetSpeedRef = useRef(0);
  const smoothedSpeedRef = useRef(0);
  const targetAngleRef = useRef(STARTING_ORIENTATION);
  const currentAngleRef = useRef(STARTING_ORIENTATION);
  const angularVelocityRef = useRef(0);
  const lastPointerInputRef = useRef(0);
  const lastAnimationFrameRef = useRef(0);
  const hasPositionRef = useRef(false);
  const cursorVisibleRef = useRef(false);
  const motionActiveRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const suspendedRef = useRef(false);
  const presentationRef = useRef(DEFAULT_PRESENTATION);
  const resolvedTargetRef = useRef<Element | null>(null);
  const resolvedTargetSuppressedRef = useRef(false);
  const interactionClickTargetRef = useRef<HTMLElement | null>(null);
  const interactionElementRef = useRef<HTMLElement | null>(null);
  const interactionOwnerRef = useRef<HTMLElement | null>(null);
  const interactionRectRef = useRef<DOMRect | null>(null);
  const interactionMagneticBoundsRef = useRef<MagneticOffsetBounds | null>(null);
  const interactionIsFramedRef = useRef(false);
  const interactionIsMagneticRef = useRef(false);
  const interactionUsesSplitCoreRef = useRef(false);
  const interactionGeometryTrackingUntilRef = useRef(0);
  // Scroll can reveal a different owner under a stationary pointer. Contract
  // changes (for example an expanding FAQ) instead keep their current owner
  // until the layout has settled so the frame cannot flicker away mid-morph.
  const interactionGeometryReconcilesPointerRef = useRef(false);
  const interactionGeometrySnapsToTargetRef = useRef(false);
  const refreshInteractionGeometryRef = useRef<() => void>(() => undefined);
  const reconcileInteractionAtPointerRef = useRef<() => void>(() => undefined);
  const requestFocusLensFrameRef = useRef<() => void>(() => undefined);
  const stopFocusLensFrameRef = useRef<() => void>(() => undefined);
  const [presentation, setPresentation] = useState(DEFAULT_PRESENTATION);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    presentationRef.current = presentation;
  }, [presentation]);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const syncReducedMotion = () => {
      reducedMotionRef.current = reducedMotionQuery.matches;
      interactionRectRef.current = null;
      interactionMagneticBoundsRef.current = null;
      if (reducedMotionQuery.matches && interactionElementRef.current) {
        interactionElementRef.current.style.removeProperty("--cursor-magnetic-x");
        interactionElementRef.current.style.removeProperty("--cursor-magnetic-y");
      }
      if (rootRef.current) {
        rootRef.current.dataset.cursorLocked = String(
          interactionIsMagneticRef.current && !reducedMotionQuery.matches,
        );
      }
      motionActiveRef.current = cursorVisibleRef.current &&
        !reducedMotionQuery.matches &&
        !suspendedRef.current;
      if (reducedMotionQuery.matches) deactivateCursorMotionSnapshot();
      if (cursorVisibleRef.current && hasPositionRef.current) {
        requestFocusLensFrameRef.current();
      }
      setReducedMotion(reducedMotionQuery.matches);
    };

    syncReducedMotion();
    reducedMotionQuery.addEventListener("change", syncReducedMotion);
    return () => reducedMotionQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    let frameId = 0;
    let disposed = false;
    const follower = followerRef.current;
    if (!follower) return;
    const followerXTo = gsap.quickTo(follower, "x", {
      duration: FOLLOW_TWEEN_DURATION,
      ease: "power2.out",
    });
    const followerYTo = gsap.quickTo(follower, "y", {
      duration: FOLLOW_TWEEN_DURATION,
      ease: "power2.out",
    });
    followerXToRef.current = followerXTo;
    followerYToRef.current = followerYTo;

    const stopFocusLensFrame = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastAnimationFrameRef.current = 0;
      if (!disposed) setIsAnimating(false);
    };

    const animateFocusLens = (now: number) => {
      frameId = 0;
      if (
        !hasPositionRef.current ||
        !cursorVisibleRef.current ||
        suspendedRef.current
      ) {
        stopFocusLensFrame();
        return;
      }

      const geometryTrackingUntil =
        interactionGeometryTrackingUntilRef.current;
      const isTrackingLayout = now < geometryTrackingUntil;
      if (isTrackingLayout) {
        refreshInteractionGeometryRef.current();
      } else if (geometryTrackingUntil > 0) {
        interactionGeometryTrackingUntilRef.current = 0;
        interactionGeometryReconcilesPointerRef.current = false;
        interactionGeometrySnapsToTargetRef.current = false;
        reconcileInteractionAtPointerRef.current();
      }

      const target = targetPositionRef.current;
      const current = followerPositionRef.current;
      const reduced = reducedMotionRef.current;
      const previousFrameAt = lastAnimationFrameRef.current;
      const deltaMs = previousFrameAt > 0
        ? clamp(now - previousFrameAt, 4, 48)
        : FRAME_DURATION_MS;
      const pointerIsActive = now - lastPointerInputRef.current < 120;
      const smoothingDeltaMs = pointerIsActive
        ? Math.min(deltaMs, FRAME_DURATION_MS * 1.25)
        : deltaMs;
      lastAnimationFrameRef.current = now;
      current.x = Number(gsap.getProperty(follower, "x")) || 0;
      current.y = Number(gsap.getProperty(follower, "y")) || 0;

      const separationX = target.x - current.x;
      const separationY = target.y - current.y;
      const separation = Math.hypot(separationX, separationY);

      const smoothedVelocity = smoothedVelocityRef.current;
      const velocityResponse = reduced
        ? 1
        : dampAmount(smoothingDeltaMs, POINTER_VELOCITY_RESPONSE_MS);
      smoothedVelocity.x += (
        pointerVelocityRef.current.x - smoothedVelocity.x
      ) * velocityResponse;
      smoothedVelocity.y += (
        pointerVelocityRef.current.y - smoothedVelocity.y
      ) * velocityResponse;
      const directionalSpeed = Math.hypot(
        smoothedVelocity.x,
        smoothedVelocity.y,
      );
      if (!reduced && directionalSpeed > RETICLE_DIRECTION_THRESHOLD) {
        targetAngleRef.current = Math.atan2(
          smoothedVelocity.y,
          smoothedVelocity.x,
        ) * 180 / Math.PI;
      }

      const speedDelta = reduced
        ? -smoothedSpeedRef.current
        : (directionalSpeed - smoothedSpeedRef.current) *
          dampAmount(smoothingDeltaMs, RETICLE_ENERGY_RESPONSE_MS);
      smoothedSpeedRef.current += clamp(
        speedDelta,
        -RETICLE_MAX_SPEED_STEP,
        RETICLE_MAX_SPEED_STEP,
      );
      if (reduced) {
        currentAngleRef.current = STARTING_ORIENTATION;
        angularVelocityRef.current = 0;
      } else {
        const rotationDeltaSeconds = Math.min(
          deltaMs,
          FRAME_DURATION_MS * 1.25,
        ) / 1_000;
        const angleDelta = getShortestAngleDelta(
          currentAngleRef.current,
          targetAngleRef.current,
        );
        const angularAcceleration =
          angleDelta * RETICLE_ROTATION_STIFFNESS -
          angularVelocityRef.current * RETICLE_ROTATION_DAMPING;
        angularVelocityRef.current = clamp(
          angularVelocityRef.current + angularAcceleration * rotationDeltaSeconds,
          -RETICLE_MAX_ANGULAR_SPEED,
          RETICLE_MAX_ANGULAR_SPEED,
        );
        currentAngleRef.current +=
          angularVelocityRef.current * rotationDeltaSeconds;
      }
      const fieldAngle = reduced
        ? 0
        : currentAngleRef.current + 135;
      followerRef.current?.style.setProperty(
        "--cursor-field-angle",
        `${fieldAngle.toFixed(3)}deg`,
      );

      const normalizedSpeed = reduced
        ? 0
        : clamp(smoothedSpeedRef.current / CURSOR_SPEED_REFERENCE, 0, 1);
      const magneticEnergy = normalizedSpeed * (2 - normalizedSpeed);
      followerRef.current?.style.setProperty(
        "--cursor-field-scale-x",
        (1 + magneticEnergy * 0.075).toFixed(3),
      );
      followerRef.current?.style.setProperty(
        "--cursor-field-scale-y",
        (1 - magneticEnergy * 0.028).toFixed(3),
      );
      dotRef.current?.style.setProperty(
        "--cursor-core-angle",
        `${currentAngleRef.current.toFixed(3)}deg`,
      );
      publishCursorMotionSnapshot(
        target.x,
        target.y,
        window.innerWidth,
        window.innerHeight,
        reduced ? 0 : smoothedVelocity.x,
        reduced ? 0 : smoothedVelocity.y,
        normalizedSpeed,
        currentAngleRef.current * Math.PI / 180,
        motionActiveRef.current && !reduced,
      );

      const velocityDecay = reduced
        ? 0
        : Math.exp(-deltaMs / POINTER_VELOCITY_DECAY_MS);
      targetSpeedRef.current *= velocityDecay;
      pointerVelocityRef.current.x *= velocityDecay;
      pointerVelocityRef.current.y *= velocityDecay;

      const velocity = Math.hypot(
        smoothedVelocity.x,
        smoothedVelocity.y,
      );
      const fieldIsAtRest =
        separation <= 0.05 &&
        targetSpeedRef.current <= 0.05 &&
        smoothedSpeedRef.current <= 0.05 &&
        velocity <= 0.05;
      if (fieldIsAtRest) {
        targetAngleRef.current = currentAngleRef.current;
        angularVelocityRef.current = 0;
      }
      const settled = reduced || (fieldIsAtRest && !isTrackingLayout);

      if (!settled) {
        frameId = window.requestAnimationFrame(animateFocusLens);
        return;
      }

      current.x = target.x;
      current.y = target.y;
      targetSpeedRef.current = 0;
      smoothedSpeedRef.current = 0;
      pointerVelocityRef.current.x = 0;
      pointerVelocityRef.current.y = 0;
      smoothedVelocity.x = 0;
      smoothedVelocity.y = 0;
      angularVelocityRef.current = 0;
      gsap.set(follower, { x: target.x, y: target.y });
      followerRef.current?.style.setProperty("--cursor-field-scale-x", "1");
      followerRef.current?.style.setProperty("--cursor-field-scale-y", "1");
      publishCursorMotionSnapshot(
        target.x,
        target.y,
        window.innerWidth,
        window.innerHeight,
        0,
        0,
        0,
        currentAngleRef.current * Math.PI / 180,
        motionActiveRef.current && !reduced,
      );
      stopFocusLensFrame();
    };

    const requestFocusLensFrame = () => {
      if (disposed || frameId) return;
      setIsAnimating(true);
      frameId = window.requestAnimationFrame(animateFocusLens);
    };

    requestFocusLensFrameRef.current = requestFocusLensFrame;
    stopFocusLensFrameRef.current = stopFocusLensFrame;

    return () => {
      disposed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      requestFocusLensFrameRef.current = () => undefined;
      stopFocusLensFrameRef.current = () => undefined;
      followerXToRef.current = null;
      followerYToRef.current = null;
      followerXTo.tween.kill();
      followerYTo.tween.kill();
      gsap.killTweensOf(follower);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const cursorLayer = rootRef.current;
    let supportsTopLayer = typeof cursorLayer?.showPopover === "function" &&
      typeof cursorLayer?.hidePopover === "function";
    if (!supportsTopLayer) cursorLayer?.removeAttribute("popover");
    let cursorModalOwner: Element | null = null;
    const visualSurfaces = Array.from(
      document.querySelectorAll<HTMLElement>(VISUAL_SURFACE_SELECTOR),
    );
    let targetRefreshFrameId = 0;
    let pendingFrameRefreshId = 0;
    let pendingFrameTarget: HTMLElement | null = null;

    const clearPendingFrameTarget = () => {
      pendingFrameObserver.disconnect();
      pendingFrameTarget = null;
      if (pendingFrameRefreshId) {
        window.cancelAnimationFrame(pendingFrameRefreshId);
        pendingFrameRefreshId = 0;
      }
    };

    const pendingFrameObserver = new IntersectionObserver(
      (entries) => {
        const targetBecameReady = entries.some((entry) =>
          entry.target === pendingFrameTarget &&
          pendingFrameTarget !== null &&
          isElementReadyForCursorFrame(pendingFrameTarget)
        );
        if (!targetBecameReady || pendingFrameRefreshId) return;

        pendingFrameRefreshId = window.requestAnimationFrame(() => {
          pendingFrameRefreshId = 0;
          interactionRectRef.current = null;
          interactionMagneticBoundsRef.current = null;
          reconcileInteractionAtPointerRef.current();
          requestFocusLensFrameRef.current();
        });
      },
      {
        rootMargin: `-${TARGET_FRAME_VIEWPORT_INSET}px`,
        threshold: [0, 1],
      },
    );

    const observePendingFrameTarget = (element: HTMLElement) => {
      if (pendingFrameTarget === element) return;
      clearPendingFrameTarget();
      pendingFrameTarget = element;
      pendingFrameObserver.observe(element);
    };

    const setCursorVisible = (visible: boolean) => {
      const visibilityChanged = cursorVisibleRef.current !== visible;
      if (visibilityChanged) {
        cursorVisibleRef.current = visible;
        setIsVisible(visible);
      }
      root.classList.toggle("custom-cursor-ready", visible);
      motionActiveRef.current = visible &&
        !reducedMotionRef.current &&
        !suspendedRef.current;
      if (!visible) {
        stopFocusLensFrameRef.current();
        deactivateCursorMotionSnapshot();
      } else if (visibilityChanged && hasPositionRef.current) {
        requestFocusLensFrameRef.current();
      }
    };

    const clearInteractionTarget = () => {
      const element = interactionElementRef.current;
      interactionZoneRef.current?.remove();
      interactionZoneRef.current = null;
      if (element) {
        element.style.removeProperty("--cursor-magnetic-x");
        element.style.removeProperty("--cursor-magnetic-y");
        element.removeAttribute("data-cursor-magnetic-active");
      }
      interactionClickTargetRef.current = null;
      interactionElementRef.current = null;
      interactionOwnerRef.current = null;
      interactionRectRef.current = null;
      interactionMagneticBoundsRef.current = null;
      interactionIsFramedRef.current = false;
      interactionIsMagneticRef.current = false;
      interactionUsesSplitCoreRef.current = false;
      interactionGeometryTrackingUntilRef.current = 0;
      interactionGeometryReconcilesPointerRef.current = false;
      interactionGeometrySnapsToTargetRef.current = false;
      if (followerRef.current) {
        followerRef.current.style.removeProperty("--cursor-field-half-width");
        followerRef.current.style.removeProperty("--cursor-field-half-height");
      }
      if (rootRef.current) {
        rootRef.current.dataset.cursorFramed = "false";
        rootRef.current.dataset.cursorLocked = "false";
        rootRef.current.dataset.cursorSplit = "false";
      }
    };

    const mountInteractionZone = (element: HTMLElement) => {
      interactionZoneRef.current?.remove();
      const zone = document.createElement("span");
      zone.className = s.interactionZone;
      zone.dataset.cursorInteractionZone = "true";
      zone.setAttribute("aria-hidden", "true");
      zone.style.inset = `-${INTERACTION_ZONE_PADDING}px`;
      element.append(zone);
      interactionZoneRef.current = zone;
    };

    const setFieldFrameBounds = (rect: DOMRect) => {
      const follower = followerRef.current;
      const frameWidth = snapToDevicePixel(rect.width + TARGET_FRAME_GAP * 2);
      const frameHeight = snapToDevicePixel(rect.height + TARGET_FRAME_GAP * 2);
      follower?.style.setProperty(
        "--cursor-field-half-width",
        `${snapToDevicePixel(frameWidth / 2)}px`,
      );
      follower?.style.setProperty(
        "--cursor-field-half-height",
        `${snapToDevicePixel(frameHeight / 2)}px`,
      );
      return { frameHeight, frameWidth };
    };

    const prepareFieldForFraming = () => {
      const cursorRoot = rootRef.current;
      const follower = followerRef.current;
      const fieldShape = fieldShapeRef.current;
      if (!cursorRoot || !follower || !fieldShape) return;

      const renderedTransform = new DOMMatrixReadOnly(
        getComputedStyle(fieldShape).transform,
      );
      const renderedAngle = Math.atan2(
        renderedTransform.b,
        renderedTransform.a,
      ) * 180 / Math.PI;
      const renderedScaleX = Math.hypot(
        renderedTransform.a,
        renderedTransform.b,
      );
      const renderedScaleY = Math.hypot(
        renderedTransform.c,
        renderedTransform.d,
      );

      cursorRoot.dataset.cursorAngleSnap = "true";
      follower.style.setProperty(
        "--cursor-field-angle",
        `${renderedAngle.toFixed(3)}deg`,
      );
      follower.style.setProperty(
        "--cursor-field-scale-x",
        renderedScaleX.toFixed(3),
      );
      follower.style.setProperty(
        "--cursor-field-scale-y",
        renderedScaleY.toFixed(3),
      );
      void getComputedStyle(fieldShape).transform;
      delete cursorRoot.dataset.cursorAngleSnap;
    };

    const resetPresentation = (surface: CursorSurface = "dark") => {
      const next = { ...DEFAULT_PRESENTATION, coreSurface: surface, surface };
      if (!presentationsMatch(presentationRef.current, next)) {
        presentationRef.current = next;
        setPresentation(next);
      }
      clearPendingFrameTarget();
      clearInteractionTarget();
    };

    const hideCursor = () => {
      setCursorVisible(false);
      if (rootRef.current) rootRef.current.dataset.cursorPressed = "false";
      resolvedTargetRef.current = null;
      resolvedTargetSuppressedRef.current = false;
      resetPresentation(presentationRef.current.surface);
    };

    const documentIsSuspended = () =>
      document.hidden ||
      (!supportsTopLayer && (
        document.body.hasAttribute("data-modal-open") ||
        root.hasAttribute("data-hero-explore")
      )) ||
      root.hasAttribute("data-route-transition");

    const syncSuspendedState = () => {
      // A native modal dialog sits above every z-index. A non-interactive manual
      // popover keeps the cursor in that same browser layer without moving focus
      // or intercepting controls. Raise it again when the active dialog changes.
      if (supportsTopLayer && cursorLayer?.isConnected) {
        const dialogs = document.querySelectorAll("dialog:modal");
        const modalOwner = dialogs.item(dialogs.length - 1);
        if (
          modalOwner !== cursorModalOwner ||
          !cursorLayer.matches(":popover-open")
        ) {
          try {
            if (cursorLayer.matches(":popover-open")) cursorLayer.hidePopover();
            cursorLayer.showPopover();
            cursorModalOwner = modalOwner;
          } catch {
            // Keep the normal layer and native modal fallback if the browser
            // cannot safely show the cursor in its top layer.
            supportsTopLayer = false;
            cursorLayer.removeAttribute("popover");
          }
        }
      }
      suspendedRef.current = documentIsSuspended();
      if (suspendedRef.current) hideCursor();
    };

    const updateInteractionTarget = (
      element: HTMLElement | null,
      owner: HTMLElement | null,
      clickTarget: HTMLElement | null,
      magnetic: boolean,
      framed: boolean,
      splitCore: boolean,
    ) => {
      if ((!magnetic && !framed) || !element) {
        clearInteractionTarget();
        return;
      }
      const isSameTarget = interactionElementRef.current === element &&
        interactionOwnerRef.current === owner &&
        interactionClickTargetRef.current === clickTarget &&
        interactionIsMagneticRef.current === magnetic &&
        interactionIsFramedRef.current === framed &&
        interactionUsesSplitCoreRef.current === splitCore;
      if (isSameTarget) {
        if (magnetic) element.dataset.cursorMagneticActive = "true";
        if (framed && !interactionZoneRef.current?.isConnected) {
          mountInteractionZone(element);
        }
        if (!interactionRectRef.current) {
          interactionRectRef.current = measureUnmagnetizedRect(element);
          if (framed) setFieldFrameBounds(interactionRectRef.current);
        }
        if (rootRef.current) {
          rootRef.current.dataset.cursorFramed = String(framed);
          rootRef.current.dataset.cursorLocked = String(
            magnetic && !reducedMotionRef.current,
          );
          rootRef.current.dataset.cursorSplit = String(splitCore);
        }
        return;
      }

      const wasFramed = interactionIsFramedRef.current;
      clearInteractionTarget();
      interactionClickTargetRef.current = clickTarget;
      interactionElementRef.current = element;
      interactionOwnerRef.current = owner;
      interactionIsMagneticRef.current = magnetic;
      interactionIsFramedRef.current = framed;
      interactionUsesSplitCoreRef.current = splitCore;
      if (magnetic) element.dataset.cursorMagneticActive = "true";
      if (framed) mountInteractionZone(element);
      interactionRectRef.current = measureUnmagnetizedRect(element);
      if (framed) setFieldFrameBounds(interactionRectRef.current);
      if (framed && !wasFramed) prepareFieldForFraming();
      if (rootRef.current) {
        rootRef.current.dataset.cursorFramed = String(framed);
        rootRef.current.dataset.cursorLocked = String(
          magnetic && !reducedMotionRef.current,
        );
        rootRef.current.dataset.cursorSplit = String(splitCore);
      }
    };

    const resolveTarget = (
      target: EventTarget | null,
      pointerX = pointerPositionRef.current.x,
      pointerY = pointerPositionRef.current.y,
    ) => {
      const visualSurface = getVisualSurfaceAtPoint(
        pointerX,
        pointerY,
        visualSurfaces,
      );
      if (!(target instanceof Element)) {
        resolvedTargetSuppressedRef.current = false;
        resetPresentation(visualSurface ?? presentationRef.current.surface);
        return;
      }
      const result = getPresentation(target, visualSurface);
      const frameTargetIsReady = !result.framed || !result.element ||
        isElementReadyForCursorFrame(result.element);
      if (result.framed && result.element && !frameTargetIsReady) {
        observePendingFrameTarget(result.element);
      } else {
        clearPendingFrameTarget();
      }
      const activeElement = interactionElementRef.current;
      const activeOwner = interactionOwnerRef.current ?? activeElement;
      const activeRect = activeOwner
        ? measureUnmagnetizedRect(activeOwner)
        : null;
      const retainsActiveElement = Boolean(
        activeElement &&
        activeElement.isConnected &&
        !isDisabledInteraction(activeElement) &&
        (!interactionIsFramedRef.current ||
          isElementReadyForCursorFrame(activeElement)) &&
        !result.suppressed &&
        (!result.element || !frameTargetIsReady) &&
        activeRect &&
        pointIsInsideExpandedRect(
          pointerX,
          pointerY,
          activeRect,
          INTERACTION_ZONE_PADDING,
        ),
      );
      if (retainsActiveElement) {
        resolvedTargetSuppressedRef.current = false;
        if (hasPositionRef.current && !suspendedRef.current) {
          setCursorVisible(true);
        }
        return;
      }

      resolvedTargetRef.current = target;
      resolvedTargetSuppressedRef.current = result.suppressed;

      updateInteractionTarget(
        frameTargetIsReady ? result.element : null,
        frameTargetIsReady ? result.owner : null,
        frameTargetIsReady ? result.clickTarget : null,
        frameTargetIsReady && result.magnetic,
        frameTargetIsReady && result.framed,
        frameTargetIsReady && result.splitCore,
      );

      if (!presentationsMatch(presentationRef.current, result.presentation)) {
        presentationRef.current = result.presentation;
        setPresentation(result.presentation);
      }

      if (result.suppressed) {
        setCursorVisible(false);
      } else if (hasPositionRef.current && !suspendedRef.current) {
        setCursorVisible(true);
      }
    };

    const moveInteractionTarget = (x: number, y: number) => {
      const element = interactionElementRef.current;
      if (!element) {
        return {
          coreX: x,
          coreY: y,
          fieldX: x,
          fieldY: y,
        };
      }

      if (
        interactionIsFramedRef.current &&
        !isElementReadyForCursorFrame(element)
      ) {
        observePendingFrameTarget(element);
        clearInteractionTarget();
        return {
          coreX: x,
          coreY: y,
          fieldX: x,
          fieldY: y,
        };
      }

      const rect = interactionRectRef.current ?? measureUnmagnetizedRect(element);
      interactionRectRef.current = rect;
      const magneticBounds = interactionMagneticBoundsRef.current ??
        measureMagneticOffsetBounds(element, rect);
      interactionMagneticBoundsRef.current = magneticBounds;
      const deltaX = x - (rect.left + rect.width / 2);
      const deltaY = y - (rect.top + rect.height / 2);
      const magneticIsActive = interactionIsMagneticRef.current &&
        !reducedMotionRef.current;
      const offsetX = magneticIsActive
        ? clamp(
            clamp(
              deltaX * 0.06,
              -MAGNETIC_TARGET_MAX_OFFSET,
              MAGNETIC_TARGET_MAX_OFFSET,
            ),
            magneticBounds.minX,
            magneticBounds.maxX,
          )
        : 0;
      const offsetY = magneticIsActive
        ? clamp(
            clamp(
              deltaY * 0.06,
              -MAGNETIC_TARGET_MAX_OFFSET,
              MAGNETIC_TARGET_MAX_OFFSET,
            ),
            magneticBounds.minY,
            magneticBounds.maxY,
          )
        : 0;
      if (magneticIsActive) {
        element.style.setProperty("--cursor-magnetic-x", `${offsetX.toFixed(2)}px`);
        element.style.setProperty("--cursor-magnetic-y", `${offsetY.toFixed(2)}px`);
      } else {
        element.style.removeProperty("--cursor-magnetic-x");
        element.style.removeProperty("--cursor-magnetic-y");
      }
      // Never magnetize the precision cursor itself. It is the visitor's
      // reliable spatial reference while the target and outer frame respond.
      const coreX = x;
      const coreY = y;
      if (!interactionIsFramedRef.current) {
        return {
          coreX,
          coreY,
          fieldX: coreX,
          fieldY: coreY,
        };
      }

      const { frameHeight, frameWidth } = setFieldFrameBounds(rect);
      const viewportInset = 2;
      const fieldX = clamp(
        rect.left + rect.width / 2 + offsetX,
        frameWidth / 2 + viewportInset,
        window.innerWidth - frameWidth / 2 - viewportInset,
      );
      const fieldY = clamp(
        rect.top + rect.height / 2 + offsetY,
        frameHeight / 2 + viewportInset,
        window.innerHeight - frameHeight / 2 - viewportInset,
      );

      return {
        coreX,
        coreY,
        fieldX,
        fieldY,
      };
    };

    const positionCursorLayers = (
      x: number,
      y: number,
      snapFieldToTarget = false,
    ) => {
      const visualPosition = moveInteractionTarget(x, y);
      targetPositionRef.current.x = visualPosition.fieldX;
      targetPositionRef.current.y = visualPosition.fieldY;
      dotRef.current?.style.setProperty(
        "transform",
        toCursorTransform(visualPosition.coreX, visualPosition.coreY),
      );

      if (!hasPositionRef.current) {
        hasPositionRef.current = true;
        followerPositionRef.current.x = visualPosition.fieldX;
        followerPositionRef.current.y = visualPosition.fieldY;
        if (followerRef.current) {
          gsap.set(followerRef.current, {
            x: visualPosition.fieldX,
            y: visualPosition.fieldY,
          });
        }
      } else if (reducedMotionRef.current || snapFieldToTarget) {
        followerPositionRef.current.x = visualPosition.fieldX;
        followerPositionRef.current.y = visualPosition.fieldY;
        if (followerRef.current) {
          gsap.set(followerRef.current, {
            x: visualPosition.fieldX,
            y: visualPosition.fieldY,
          });
        }
      } else {
        const followDuration = interactionIsFramedRef.current
          ? FRAMED_FOLLOW_TWEEN_DURATION
          : FOLLOW_TWEEN_DURATION;
        followerXToRef.current?.tween.duration(followDuration);
        followerYToRef.current?.tween.duration(followDuration);
        followerXToRef.current?.(visualPosition.fieldX);
        followerYToRef.current?.(visualPosition.fieldY);
      }
    };

    const refreshInteractionGeometry = () => {
      if (!hasPositionRef.current || suspendedRef.current) return;

      const { x, y } = pointerPositionRef.current;
      const trackingUntil = interactionGeometryTrackingUntilRef.current;
      const reconcilesPointer =
        interactionGeometryReconcilesPointerRef.current;
      const snapsToTarget = interactionGeometrySnapsToTargetRef.current;
      if (reconcilesPointer) {
        const pointerTarget = document.elementFromPoint(x, y);
        if (pointerTarget && pointerTarget !== resolvedTargetRef.current) {
          resolveTarget(pointerTarget, x, y);
          interactionGeometryTrackingUntilRef.current = Math.max(
            interactionGeometryTrackingUntilRef.current,
            trackingUntil,
          );
          interactionGeometryReconcilesPointerRef.current = true;
          interactionGeometrySnapsToTargetRef.current = snapsToTarget;
        }
      }

      const element = interactionElementRef.current;
      const owner = interactionOwnerRef.current ?? element;
      if (
        !element ||
        !element.isConnected ||
        !owner ||
        !owner.isConnected ||
        isDisabledInteraction(element) ||
        (interactionIsFramedRef.current &&
          !isElementReadyForCursorFrame(element))
      ) {
        interactionGeometryTrackingUntilRef.current = 0;
        interactionGeometryReconcilesPointerRef.current = false;
        interactionGeometrySnapsToTargetRef.current = false;
        reconcileInteractionAtPointerRef.current();
        return;
      }

      interactionRectRef.current = null;
      interactionMagneticBoundsRef.current = null;
      positionCursorLayers(x, y, snapsToTarget);
    };

    refreshInteractionGeometryRef.current = refreshInteractionGeometry;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || suspendedRef.current) return;

      const x = event.clientX;
      const y = event.clientY;
      pointerPositionRef.current.x = x;
      pointerPositionRef.current.y = y;
      lastPointerInputRef.current = performance.now();
      const previous = previousPointerRef.current;
      if (hasPositionRef.current) {
        const elapsed = clamp(event.timeStamp - previous.time, 8, 48);
        const frameScale = 16.667 / elapsed;
        let velocityX = (x - previous.x) * frameScale;
        let velocityY = (y - previous.y) * frameScale;
        let speed = Math.hypot(velocityX, velocityY);
        if (speed > CURSOR_SPEED_LIMIT) {
          const velocityScale = CURSOR_SPEED_LIMIT / speed;
          velocityX *= velocityScale;
          velocityY *= velocityScale;
          speed = CURSOR_SPEED_LIMIT;
        }
        pointerVelocityRef.current.x = velocityX;
        pointerVelocityRef.current.y = velocityY;
        targetSpeedRef.current = speed;
      }
      previous.time = event.timeStamp;
      previous.x = x;
      previous.y = y;

      if (event.target instanceof Element && resolvedTargetRef.current !== event.target) {
        resolveTarget(event.target, x, y);
      }

      positionCursorLayers(x, y);
      if (
        !(event.target instanceof Element)
        || event.target.closest(NATIVE_CURSOR_SELECTOR)
        || resolvedTargetSuppressedRef.current
      ) {
        return;
      }

      setCursorVisible(true);
      requestFocusLensFrameRef.current();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.pointerType === "touch" ||
        suspendedRef.current ||
        !cursorVisibleRef.current ||
        resolvedTargetSuppressedRef.current
      ) return;

      if (rootRef.current) rootRef.current.dataset.cursorPressed = "true";
    };

    const handlePointerUp = () => {
      if (rootRef.current) rootRef.current.dataset.cursorPressed = "false";
    };

    const handleExpandedInteractionClick = (event: MouseEvent) => {
      const element = interactionElementRef.current;
      const owner = interactionOwnerRef.current ?? element;
      const clickTarget = interactionClickTargetRef.current ?? owner;
      if (
        event.button !== 0 ||
        event.defaultPrevented ||
        !element ||
        !element.isConnected ||
        !owner ||
        !owner.isConnected ||
        !clickTarget ||
        !clickTarget.isConnected ||
        !interactionIsFramedRef.current ||
        presentationRef.current.variant === "drag" ||
        isDisabledInteraction(element) ||
        isDisabledInteraction(clickTarget)
      ) return;

      const eventTarget = event.target;
      if (
        eventTarget instanceof Node &&
        clickTarget.contains(eventTarget)
      ) return;
      if (eventTarget instanceof Element) {
        const nestedInteractive = eventTarget.closest<HTMLElement>(
          AUTOMATIC_INTERACTIVE_SELECTOR,
        );
        if (
          nestedInteractive &&
          nestedInteractive !== clickTarget &&
          owner.contains(nestedInteractive)
        ) return;

        const directInteraction = getPresentation(eventTarget).owner;
        if (directInteraction && directInteraction !== owner) return;
      }

      const rect = measureUnmagnetizedRect(owner);
      if (!pointIsInsideExpandedRect(
        event.clientX,
        event.clientY,
        rect,
        INTERACTION_ZONE_PADDING,
      )) return;

      event.preventDefault();
      event.stopPropagation();
      clickTarget.focus({ preventScroll: true });
      clickTarget.click();
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (suspendedRef.current || event.pointerType === "touch") return;
      if (
        interactionIsFramedRef.current &&
        performance.now() < interactionGeometryTrackingUntilRef.current
      ) return;
      // Hydration can finish after the first mouse move. The next pointer entry
      // still provides a real position; show the cursor without requiring a
      // second movement from the visitor.
      if (!hasPositionRef.current) {
        handlePointerMove(event);
        return;
      }
      resolveTarget(event.target, event.clientX, event.clientY);
    };

    const handleWindowPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) hideCursor();
    };

    const resolveTargetAtPointer = () => {
      if (!hasPositionRef.current || suspendedRef.current) return;

      const { x, y } = pointerPositionRef.current;
      resolveTarget(document.elementFromPoint(x, y), x, y);
      positionCursorLayers(x, y);
    };

    const refreshTargetAtPointer = () => {
      targetRefreshFrameId = 0;
      resolveTargetAtPointer();
      requestFocusLensFrameRef.current();
    };

    reconcileInteractionAtPointerRef.current = resolveTargetAtPointer;

    const trackInteractionGeometry = (
      reconcilePointer: boolean,
      snapToTarget: boolean,
    ) => {
      interactionGeometryTrackingUntilRef.current = Math.max(
        interactionGeometryTrackingUntilRef.current,
        performance.now() + LAYOUT_GEOMETRY_TRACKING_DURATION,
      );
      interactionGeometryReconcilesPointerRef.current = reconcilePointer;
      interactionGeometrySnapsToTargetRef.current = snapToTarget;
      requestFocusLensFrameRef.current();
    };

    const refreshContractTargetAtPointer = () => {
      targetRefreshFrameId = 0;
      const previousTarget = interactionElementRef.current;
      resolveTargetAtPointer();
      if (interactionIsFramedRef.current) {
        trackInteractionGeometry(
          false,
          previousTarget === interactionElementRef.current,
        );
      }
      else requestFocusLensFrameRef.current();
    };

    const scheduleTargetRefresh = () => {
      interactionRectRef.current = null;
      interactionMagneticBoundsRef.current = null;
      if (interactionIsFramedRef.current) {
        trackInteractionGeometry(true, false);
        return;
      }
      if (
        targetRefreshFrameId ||
        !hasPositionRef.current ||
        !cursorVisibleRef.current
      ) {
        return;
      }
      targetRefreshFrameId = window.requestAnimationFrame(refreshTargetAtPointer);
    };

    const scheduleContractTargetRefresh = () => {
      interactionRectRef.current = null;
      interactionMagneticBoundsRef.current = null;
      if (!hasPositionRef.current || !cursorVisibleRef.current) {
        return;
      }
      if (targetRefreshFrameId) {
        window.cancelAnimationFrame(targetRefreshFrameId);
      }
      targetRefreshFrameId = window.requestAnimationFrame(
        refreshContractTargetAtPointer,
      );
    };

    const htmlObserver = new MutationObserver(syncSuspendedState);
    const bodyObserver = new MutationObserver(syncSuspendedState);
    const interactionObserver = new MutationObserver(
      scheduleContractTargetRefresh,
    );
    htmlObserver.observe(root, {
      attributeFilter: ["data-hero-explore", "data-route-transition"],
      attributes: true,
    });
    bodyObserver.observe(document.body, {
      attributeFilter: ["data-modal-open", "open"],
      attributes: true,
      subtree: true,
    });
    interactionObserver.observe(document.body, {
      attributeFilter: [
        "aria-disabled",
        "disabled",
        "inert",
        "type",
        "for",
        "contenteditable",
        "data-native-cursor",
        "data-cursor",
        "data-cursor-click-target",
        "data-cursor-compact-click-target",
        "data-cursor-compact-frame-target",
        "data-cursor-frame-target",
        "data-cursor-magnetic",
        "data-cursor-no-frame",
        "data-cursor-no-magnetic",
        "data-cursor-split-core",
        "data-open",
        "open",
        "aria-expanded",
      ],
      attributes: true,
      subtree: true,
    });

    setCursorVisible(false);
    syncSuspendedState();
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerover", handlePointerOver, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("pointerup", handlePointerUp, { passive: true });
    document.addEventListener("click", handleExpandedInteractionClick, true);
    document.addEventListener("pointercancel", hideCursor, { passive: true });
    document.addEventListener("visibilitychange", syncSuspendedState);
    window.addEventListener("blur", hideCursor);
    window.addEventListener("pointerout", handleWindowPointerOut, { passive: true });
    window.addEventListener("resize", scheduleTargetRefresh, { passive: true });
    window.addEventListener("scroll", scheduleTargetRefresh, { passive: true });

    return () => {
      htmlObserver.disconnect();
      bodyObserver.disconnect();
      interactionObserver.disconnect();
      clearPendingFrameTarget();
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("click", handleExpandedInteractionClick, true);
      document.removeEventListener("pointercancel", hideCursor);
      document.removeEventListener("visibilitychange", syncSuspendedState);
      window.removeEventListener("blur", hideCursor);
      window.removeEventListener("pointerout", handleWindowPointerOut);
      window.removeEventListener("resize", scheduleTargetRefresh);
      window.removeEventListener("scroll", scheduleTargetRefresh);
      window.cancelAnimationFrame(targetRefreshFrameId);
      interactionGeometryTrackingUntilRef.current = 0;
      interactionGeometryReconcilesPointerRef.current = false;
      interactionGeometrySnapsToTargetRef.current = false;
      refreshInteractionGeometryRef.current = () => undefined;
      reconcileInteractionAtPointerRef.current = () => undefined;
      setCursorVisible(false);
      clearInteractionTarget();
      resetCursorMotionSnapshot();
      if (supportsTopLayer && cursorLayer?.matches(":popover-open")) {
        cursorLayer.hidePopover();
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={s.root}
      data-custom-cursor
      data-custom-cursor-root
      data-cursor-animation={isAnimating ? "running" : "idle"}
      data-cursor-core-surface={presentation.coreSurface}
      data-cursor-icon={presentation.icon}
      data-cursor-shows-core-icon={
        presentation.showsCoreIcon ? "true" : "false"
      }
      data-cursor-framed="false"
      data-cursor-locked="false"
      data-cursor-pressed="false"
      data-cursor-reticle-enabled={SHOW_CURSOR_RETICLE ? "true" : "false"}
      data-cursor-split="false"
      data-cursor-surface={presentation.surface}
      data-cursor-variant={presentation.variant}
      data-cursor-visible={isVisible ? "true" : "false"}
      data-focus-lens-cursor
      data-reduced-motion={reducedMotion ? "true" : "false"}
      popover="manual"
      ref={rootRef}
    >
      <div className={s.follower} data-cursor-follower ref={followerRef}>
        <div className={s.fieldFrame} data-cursor-field data-cursor-lens>
          <div
            aria-hidden="true"
            className={s.fieldShape}
            data-cursor-reticle
            ref={fieldShapeRef}
          >
            <span
              className={`${s.fieldCorner} ${s.fieldCornerNorthWest}`}
              data-cursor-field-segment="north-west"
            />
            <span
              className={`${s.fieldCorner} ${s.fieldCornerNorthEast} ${s.fieldCornerAccent}`}
              data-cursor-field-segment="north-east"
            />
            <span
              className={`${s.fieldCorner} ${s.fieldCornerSouthEast}`}
              data-cursor-field-segment="south-east"
            />
            <span
              className={`${s.fieldCorner} ${s.fieldCornerSouthWest}`}
              data-cursor-field-segment="south-west"
            />
          </div>
        </div>
      </div>
      <div className={s.dot} data-cursor-dot ref={dotRef}>
        <svg
          aria-hidden="true"
          className={s.precisionCore}
          data-cursor-dot-core
          data-cursor-precision-core
          focusable="false"
          viewBox="0 0 26 26"
        >
          <defs>
            <linearGradient
              id="cursor-arrow-glint"
              x1="0%"
              x2="100%"
              y1="0%"
              y2="100%"
            >
              <stop className={s.coreGlintStart} offset="0%" />
              <stop className={s.coreGlintEnd} offset="100%" />
            </linearGradient>
          </defs>
          <path
            className={s.coreAnchorKeyline}
            data-cursor-core-anchor-keyline
            d="M13 13 13.4 24.3 16.2 21.5 18.5 25.3 20.7 24 18.4 20.2 23.2 19.8Z"
          />
          <path
            className={s.coreAnchor}
            data-cursor-core-anchor
            data-cursor-arrow
            d="M13 13 13.4 24.3 16.2 21.5 18.5 25.3 20.7 24 18.4 20.2 23.2 19.8Z"
          />
          <path
            className={s.coreGlint}
            d="M14.45 15.25c1.4.35 2.75 1.18 3.85 2.32l-.73.47c-1.17-.82-2.19-1.26-3.12-1.47Z"
            data-cursor-arrow-glint
          />
        </svg>
        <span
          className={s.icon}
          data-cursor-icon-content
        >
          <svg
            aria-hidden="true"
            className={s.clickHand}
            data-cursor-click-hand
            focusable="false"
            viewBox="0 0 28 28"
          >
            <path
              d="M12.5 15.8V5.2C12.5 4 13.4 3 14.7 3c1.2 0 2.2 1 2.2 2.2v8.2l1.2-1.1c.7-.7 1.8-.9 2.6-.4.6-.4 1.4-.5 2.1-.2 1 .4 1.6 1.3 1.6 2.4v5.3c0 4-2.9 6.8-6.8 6.8H13c-1.8 0-3.5-.8-4.7-2.2l-4.6-5.7c-.8-1-.7-2.4.3-3.2.9-.8 2.2-.7 3 .1l5.5 5.1v-4.5Z"
            />
            <path d="M19 15.1v2.8m2.8-2.8v2.8" />
          </svg>
        </span>
      </div>
    </div>
  );
}
