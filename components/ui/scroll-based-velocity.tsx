"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import type { MotionValue } from "motion/react";

import { cn } from "@/lib/utils";

/* ============================================================================
 * Types
 * ============================================================================
 */

interface ScrollVelocityRowProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  baseVelocity?: number;
  direction?: 1 | -1;
  separator?: React.ReactNode;
  itemGapPx?: number;
  separatorClassName?: string;
  separatorAfterLast?: boolean;

  /** pokud false, animace není nijak navázaná na scroll */
  scrollLinked?: boolean;
}

interface ScrollVelocityRowImplProps extends ScrollVelocityRowProps {
  velocityFactor: MotionValue<number> | null;
}

/* ============================================================================
 * Utils
 * ============================================================================
 */

export const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const DIRECTION_THRESHOLD = 5;
const BOOST_MAGNITUDE = 0.9;
const BOOST_COOLDOWN_MS = 160;
const BOOST_DECAY_MS = 140;

/* ============================================================================
 * Context
 * ============================================================================
 */

const ScrollVelocityContext =
  React.createContext<MotionValue<number> | null>(null);

/* ============================================================================
 * Container – sdílený scroll → direction signal
 * ============================================================================
 */

export function ScrollVelocityContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 40,
    stiffness: 300,
  });

  /**
   * DŮLEŽITÉ:
   * - NEPOUŽÍVÁME useTransform → vracel by union (0 | 1 | -1)
   * - ručně spravujeme MotionValue<number>
   */
  const directionSignal = useMotionValue<number>(0);

  useEffect(() => {
    return smoothVelocity.on("change", (v) => {
      if (Math.abs(v) < DIRECTION_THRESHOLD) {
        directionSignal.set(0);
      } else {
        directionSignal.set(v < 0 ? -1 : 1);
      }
    });
  }, [smoothVelocity, directionSignal]);

  return (
    <ScrollVelocityContext.Provider value={directionSignal}>
      <div className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </ScrollVelocityContext.Provider>
  );
}

/* ============================================================================
 * Public Row wrapper
 * ============================================================================
 */

export function ScrollVelocityRow({
  scrollLinked = true,
  ...props
}: ScrollVelocityRowProps) {
  const sharedVelocityFactor = useContext(ScrollVelocityContext);

  if (scrollLinked && sharedVelocityFactor) {
    return (
      <ScrollVelocityRowImpl
        {...props}
        velocityFactor={sharedVelocityFactor}
      />
    );
  }

  if (scrollLinked) {
    return <ScrollVelocityRowLocal {...props} />;
  }

  return <ScrollVelocityRowImpl {...props} velocityFactor={null} />;
}

/* ============================================================================
 * Core implementation
 * ============================================================================
 */

function ScrollVelocityRowImpl({
  children,
  baseVelocity = 5,
  direction = 1,
  className,
  velocityFactor,
  separator,
  itemGapPx = 48,
  separatorClassName,
  separatorAfterLast = true,
  ...props
}: ScrollVelocityRowImplProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const [numCopies, setNumCopies] = useState(1);

  const baseX = useMotionValue(0);
  const unitWidth = useMotionValue(0);

  const baseDirectionRef = useRef<number>(direction >= 0 ? 1 : -1);
  const currentDirectionRef = useRef<number>(direction >= 0 ? 1 : -1);
  const lastScrollDirectionRef = useRef<number>(0);

  const isInViewRef = useRef(true);
  const isPageVisibleRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);

  /* ------------------------------------------------------------------------ */
  /* Boost logic                                                              */
  /* ------------------------------------------------------------------------ */

  const boostTarget = useMotionValue(0);
  const boostSpring = useSpring(boostTarget, {
    damping: 26,
    stiffness: 260,
    mass: 0.7,
  });

  const lastBoostAtRef = useRef<number>(0);
  const boostDecayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  /* ------------------------------------------------------------------------ */
  /* Resize / visibility / reduced motion                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const container = containerRef.current;
    const block = blockRef.current;
    if (!container || !block) return;

    const updateSizes = () => {
      const cw = container.offsetWidth || 0;
      const bw = block.scrollWidth || 0;
      unitWidth.set(bw);

      const nextCopies = bw > 0 ? Math.max(3, Math.ceil(cw / bw) + 2) : 1;
      setNumCopies((prev) => (prev === nextCopies ? prev : nextCopies));
    };

    updateSizes();

    const ro = new ResizeObserver(updateSizes);
    ro.observe(container);
    ro.observe(block);

    const io = new IntersectionObserver(([entry]) => {
      isInViewRef.current = entry.isIntersecting;
    });
    io.observe(container);

    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility, {
      passive: true,
    });
    handleVisibility();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handlePRM = () => {
      prefersReducedMotionRef.current = mq.matches;
      if (mq.matches) boostTarget.set(0);
    };
    mq.addEventListener("change", handlePRM);
    handlePRM();

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      mq.removeEventListener("change", handlePRM);
      if (boostDecayTimeoutRef.current) {
        clearTimeout(boostDecayTimeoutRef.current);
      }
    };
  }, [children, unitWidth, boostTarget]);

  /* ------------------------------------------------------------------------ */
  /* X transform                                                              */
  /* ------------------------------------------------------------------------ */

  const x = useTransform([baseX, unitWidth], ([v, bw]) => {
    const width = Number(bw) || 1;
    const offset = Number(v) || 0;
    return `${-wrap(0, width, offset)}px`;
  });

  /* ------------------------------------------------------------------------ */
  /* Animation frame                                                          */
  /* ------------------------------------------------------------------------ */

  useAnimationFrame((_, delta) => {
    if (!isInViewRef.current || !isPageVisibleRef.current) return;

    const dt = delta / 1000;
    const now = performance.now();

    let scrollDirection = 0;
    if (velocityFactor) {
      scrollDirection = Math.sign(velocityFactor.get());
    }

    if (scrollDirection !== 0) {
      const changed =
        scrollDirection !== lastScrollDirectionRef.current;

      if (changed) {
        lastScrollDirectionRef.current = scrollDirection;
        currentDirectionRef.current =
          baseDirectionRef.current * scrollDirection;

        if (
          !prefersReducedMotionRef.current &&
          now - lastBoostAtRef.current > BOOST_COOLDOWN_MS
        ) {
          lastBoostAtRef.current = now;
          boostTarget.set(BOOST_MAGNITUDE);

          if (boostDecayTimeoutRef.current) {
            clearTimeout(boostDecayTimeoutRef.current);
          }

          boostDecayTimeoutRef.current = setTimeout(() => {
            boostTarget.set(0);
          }, BOOST_DECAY_MS);
        }
      }
    }

    const bw = unitWidth.get();
    if (bw <= 0) return;

    const pixelsPerSecond = (bw * baseVelocity) / 100;
    const boost =
      velocityFactor && !prefersReducedMotionRef.current
        ? Math.max(0, boostSpring.get())
        : 0;

    const moveBy =
      currentDirectionRef.current *
      pixelsPerSecond *
      (1 + boost) *
      dt;

    baseX.set(baseX.get() + moveBy);
  });

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      ref={containerRef}
      className={cn("w-full overflow-hidden whitespace-nowrap", className)}
      {...props}
    >
      <motion.div
        className="inline-flex transform-gpu items-center will-change-transform select-none"
        style={{ x }}
      >
        {Array.from({ length: numCopies }).map((_, i) => (
          <div
            key={i}
            ref={i === 0 ? blockRef : null}
            aria-hidden={i !== 0}
            className="inline-flex shrink-0 items-center"
          >
            {(() => {
              const count = React.Children.count(children);

              return React.Children.map(children, (child, idx) => (
                <React.Fragment key={idx}>
                  {child}
                  {separator &&
                    (idx < count - 1 ||
                      (separatorAfterLast && idx === count - 1)) && (
                      <span
                        className={cn(
                          "inline-flex items-center",
                          separatorClassName
                        )}
                        style={{
                          marginLeft: itemGapPx,
                          marginRight: itemGapPx,
                        }}
                      >
                        {separator}
                      </span>
                    )}
                </React.Fragment>
              ));
            })()}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ============================================================================
 * Local (bez contextu)
 * ============================================================================
 */

function ScrollVelocityRowLocal(props: ScrollVelocityRowProps) {
  const { scrollY } = useScroll();
  const localVelocity = useVelocity(scrollY);

  const smoothVelocity = useSpring(localVelocity, {
    damping: 40,
    stiffness: 300,
  });

  const directionSignal = useMotionValue<number>(0);

  useEffect(() => {
    return smoothVelocity.on("change", (v) => {
      if (Math.abs(v) < DIRECTION_THRESHOLD) {
        directionSignal.set(0);
      } else {
        directionSignal.set(v < 0 ? -1 : 1);
      }
    });
  }, [smoothVelocity, directionSignal]);

  return (
    <ScrollVelocityRowImpl
      {...props}
      velocityFactor={directionSignal}
    />
  );
}
