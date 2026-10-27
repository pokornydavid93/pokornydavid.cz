"use client";

import {
  ReactNode,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import gsap from "gsap";
import { Send } from "lucide-react";

import Button from "@/app/ui/cta/Button";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import s from "./testimonials.module.css";

type TestimonialsCTAButtonProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion).matches;

const TestimonialsCTAButton = ({
  label,
  children,
  className,
}: TestimonialsCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();
  const planeRef = useRef<SVGSVGElement | null>(null);
  const ctaHoverRef = useRef(false);
  const planeShotActiveRef = useRef(false);
  const planeShotTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const planeShotCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const plane = planeRef.current;
    const root = plane?.closest("section");

    if (!plane || !(root instanceof HTMLElement)) return;

    root.style.setProperty("--testimonials-plane-rotation", "0deg");

    if (prefersReducedMotion()) return;

    const ctaElement = plane.closest("button, a");
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let pointerLastTime = performance.now();
    let hasPointerPosition = false;
    let marqueePointerStart: { x: number; y: number } | null = null;
    let isDraggingMarquee = false;
    let suppressPlaneShotUntil = 0;
    const interactiveSelector =
      'button, a, input, textarea, select, label, [role="button"]';
    const marqueeSelector = "[data-testimonials-marquee]";

    const isInsideMarquee = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(marqueeSelector));

    const updatePointerPosition = (event: PointerEvent) => {
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - pointerLastTime) / 1000));

      if (hasPointerPosition) {
        const nextVelocityX = (event.clientX - pointerX) / dt;
        const nextVelocityY = (event.clientY - pointerY) / dt;

        pointerVelocityX += (nextVelocityX - pointerVelocityX) * 0.42;
        pointerVelocityY += (nextVelocityY - pointerVelocityY) * 0.42;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerLastTime = now;
      hasPointerPosition = true;
    };

    const pointPlaneToPointer = (event: PointerEvent) => {
      updatePointerPosition(event);

      if (ctaHoverRef.current || planeShotActiveRef.current) return;

      if (frame) window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        const rect = plane.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        const rotation = angle * (180 / Math.PI) + 45;

        root.style.setProperty("--testimonials-plane-rotation", `${rotation}deg`);
      });
    };

    const resetPlane = () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.style.setProperty("--testimonials-plane-rotation", "0deg");
    };

    const createPlaneShard = () => {
      const shard = document.createElement("span");
      shard.className = s.testimonialPlaneShard;
      document.body.appendChild(shard);
      return shard;
    };

    const shootPlaneAtPointer = (event: MouseEvent) => {
      if (event.button !== 0 || planeShotActiveRef.current) return;

      const elementAtPointer = document.elementFromPoint(
        event.clientX,
        event.clientY
      );

      if (
        performance.now() < suppressPlaneShotUntil ||
        isInsideMarquee(event.target) ||
        isInsideMarquee(elementAtPointer)
      ) {
        return;
      }

      if (
        elementAtPointer?.closest(interactiveSelector)
      ) {
        return;
      }

      if (ctaElement instanceof Element) {
        const ctaRect = ctaElement.getBoundingClientRect();
        const isInsideCta =
          event.clientX >= ctaRect.left &&
          event.clientX <= ctaRect.right &&
          event.clientY >= ctaRect.top &&
          event.clientY <= ctaRect.bottom;

        if (isInsideCta) return;
      }

      if (
        event.composedPath().some(
          (node) =>
              node instanceof Element &&
              Boolean(
              node.closest(interactiveSelector) || node.closest(marqueeSelector)
            )
        )
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(interactiveSelector) || target.closest(marqueeSelector)) {
        return;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
      pointerLastTime = performance.now();
      hasPointerPosition = true;

      const rect = plane.getBoundingClientRect();
      const startCenterX = rect.left + rect.width / 2;
      const startCenterY = rect.top + rect.height / 2;
      const initialAngle = Math.atan2(pointerY - startCenterY, pointerX - startCenterX);
      const initialRotation = initialAngle * (180 / Math.PI) + 45;
      const tipOffset = Math.hypot(rect.width, rect.height) * 0.5;
      const startX = startCenterX - rect.width / 2;
      const startY = startCenterY - rect.height / 2;
      const startDistance = Math.hypot(pointerX - startCenterX, pointerY - startCenterY);
      const baseMaxSpeed = Math.min(2400, Math.max(900, startDistance / 0.38));
      const flightState = {
        x: startX,
        y: startY,
        vx: Math.cos(initialAngle) * baseMaxSpeed * 0.68,
        vy: Math.sin(initialAngle) * baseMaxSpeed * 0.68,
        elapsed: 0,
        lastTime: performance.now(),
        done: false,
      };
      let angle = initialAngle;
      let rotation = initialRotation;
      let endX = startX;
      let endY = startY;
      let bounceX = startX;
      let bounceY = startY;
      let burstCenterX = startCenterX;
      let burstCenterY = startCenterY;
      let tangentX = Math.cos(initialAngle + Math.PI / 2);
      let tangentY = Math.sin(initialAngle + Math.PI / 2);
      let bounceRotation = initialRotation;
      const shards = Array.from({ length: 10 }, createPlaneShard);
      const projectile = plane.cloneNode(true) as SVGSVGElement;
      let forceCleanupTimer = 0;
      let cleanedUp = false;

      const computeGuidedTarget = () => {
        const projectileCenterX = flightState.x + rect.width / 2;
        const projectileCenterY = flightState.y + rect.height / 2;
        const targetDistance = Math.hypot(pointerX - projectileCenterX, pointerY - projectileCenterY);
        const targetAngle =
          targetDistance > 1
            ? Math.atan2(pointerY - projectileCenterY, pointerX - projectileCenterX)
            : initialAngle;
        const targetCenterX = pointerX - Math.cos(targetAngle) * tipOffset;
        const targetCenterY = pointerY - Math.sin(targetAngle) * tipOffset;

        return {
          angle: targetAngle,
          distance: targetDistance,
          x: targetCenterX - rect.width / 2,
          y: targetCenterY - rect.height / 2,
        };
      };

      const computeImpact = () => {
        const guidedTarget = computeGuidedTarget();
        endX = guidedTarget.x;
        endY = guidedTarget.y;

        const relativeVelocityX = flightState.vx - pointerVelocityX * 0.42;
        const relativeVelocityY = flightState.vy - pointerVelocityY * 0.42;
        const relativeSpeed = Math.hypot(relativeVelocityX, relativeVelocityY);
        const incomingX = relativeSpeed > 0.1 ? relativeVelocityX / relativeSpeed : Math.cos(guidedTarget.angle);
        const incomingY = relativeSpeed > 0.1 ? relativeVelocityY / relativeSpeed : Math.sin(guidedTarget.angle);
        const projectileCenterX = flightState.x + rect.width / 2;
        const projectileCenterY = flightState.y + rect.height / 2;
        const contactOffsetX = projectileCenterX - pointerX;
        const contactOffsetY = projectileCenterY - pointerY;
        const contactOffsetLength = Math.hypot(contactOffsetX, contactOffsetY);
        let normalX = contactOffsetLength > 2 ? contactOffsetX / contactOffsetLength : -incomingX;
        let normalY = contactOffsetLength > 2 ? contactOffsetY / contactOffsetLength : -incomingY;
        const approachDot = incomingX * normalX + incomingY * normalY;

        if (approachDot > 0) {
          normalX *= -1;
          normalY *= -1;
        }

        const dot = incomingX * normalX + incomingY * normalY;
        const reflectedX = incomingX - 2 * dot * normalX;
        const reflectedY = incomingY - 2 * dot * normalY;
        const reflectedLength = Math.hypot(reflectedX, reflectedY) || 1;
        const bounceVectorX = reflectedX / reflectedLength;
        const bounceVectorY = reflectedY / reflectedLength;
        angle = Math.atan2(incomingY, incomingX);
        const reflectedAngle = Math.atan2(bounceVectorY, bounceVectorX);
        rotation = angle * (180 / Math.PI) + 45;
        bounceRotation = reflectedAngle * (180 / Math.PI) + 45;

        const flightDistance = Math.hypot(pointerX - startCenterX, pointerY - startCenterY);
        const bounceDistance = Math.min(
          58,
          Math.max(26, flightDistance * 0.075 + relativeSpeed * 0.008)
        );

        bounceX = endX + bounceVectorX * bounceDistance;
        bounceY = endY + bounceVectorY * bounceDistance;
        burstCenterX = bounceX + rect.width / 2;
        burstCenterY = bounceY + rect.height / 2;
        tangentX = -normalY;
        tangentY = normalX;
      };

      planeShotActiveRef.current = true;
      planeShotCleanupRef.current?.();
      planeShotCleanupRef.current = null;
      planeShotTimelineRef.current?.kill();

      projectile.classList.remove(s.ctaIcon);
      projectile.classList.add(s.testimonialPlaneProjectile);
      projectile.setAttribute("aria-hidden", "true");
      document.body.appendChild(projectile);

      gsap.set(projectile, {
        x: startX,
        y: startY,
        rotation: initialRotation,
        autoAlpha: 1,
      });
      gsap.set(plane, { autoAlpha: 0 });
      gsap.set(shards, {
        x: burstCenterX,
        y: burstCenterY,
        autoAlpha: 0,
        scale: 0.45,
      });

      const cleanupShotArtifacts = () => {
        if (cleanedUp) return;

        cleanedUp = true;
        if (forceCleanupTimer) window.clearTimeout(forceCleanupTimer);
        planeShotCleanupRef.current?.();
        planeShotCleanupRef.current = null;
        projectile.remove();
        shards.forEach((shard) => shard.remove());
        planeShotActiveRef.current = false;
        gsap.set(plane, {
          autoAlpha: 1,
          clearProps: "transform,opacity,visibility",
        });
      };

      const tl = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          cleanupShotArtifacts();
          pointPlaneToPointer({ clientX: pointerX, clientY: pointerY } as PointerEvent);
        },
      });

      planeShotTimelineRef.current = tl;
      forceCleanupTimer = window.setTimeout(() => {
        planeShotTimelineRef.current?.kill();
        cleanupShotArtifacts();
      }, 2200);

      tl.add(() => {
        tl.pause();

        const finishGuidedFlight = () => {
          if (flightState.done) return;

          flightState.done = true;
          planeShotCleanupRef.current?.();
          planeShotCleanupRef.current = null;
          computeImpact();
          gsap.set(projectile, { x: endX, y: endY, rotation });
          tl.resume();
        };

        const updateGuidedFlight = () => {
          const now = performance.now();
          const dt = Math.min(0.034, Math.max(0.001, (now - flightState.lastTime) / 1000));
          flightState.lastTime = now;
          flightState.elapsed += dt;

          const guidedTarget = computeGuidedTarget();
          const projectileCenterX = flightState.x + rect.width / 2;
          const projectileCenterY = flightState.y + rect.height / 2;
          const targetCenterX = guidedTarget.x + rect.width / 2;
          const targetCenterY = guidedTarget.y + rect.height / 2;
          const dx = targetCenterX - projectileCenterX;
          const dy = targetCenterY - projectileCenterY;
          const distance = Math.hypot(dx, dy);
          const targetAngle = distance > 0.1 ? Math.atan2(dy, dx) : angle;
          const maxSpeed = baseMaxSpeed + Math.min(3600, flightState.elapsed * 1800);
          const desiredSpeed = Math.min(
            maxSpeed,
            Math.max(420, distance * 7.2 + flightState.elapsed * 260)
          );
          const desiredVx = Math.cos(targetAngle) * desiredSpeed;
          const desiredVy = Math.sin(targetAngle) * desiredSpeed;
          const turnAmount = 1 - Math.pow(0.0008, dt);

          flightState.vx += (desiredVx - flightState.vx) * turnAmount;
          flightState.vy += (desiredVy - flightState.vy) * turnAmount;

          const speed = Math.hypot(flightState.vx, flightState.vy);
          if (speed > maxSpeed) {
            const speedScale = maxSpeed / speed;
            flightState.vx *= speedScale;
            flightState.vy *= speedScale;
          }

          const nextX = flightState.x + flightState.vx * dt;
          const nextY = flightState.y + flightState.vy * dt;

          const stepCrossedTarget =
            (targetCenterX - projectileCenterX) *
              (targetCenterX - (nextX + rect.width / 2)) +
              (targetCenterY - projectileCenterY) *
                (targetCenterY - (nextY + rect.height / 2)) <=
            0;
          const stepDistance = Math.hypot(nextX - flightState.x, nextY - flightState.y);
          const reachesImpact = stepDistance >= distance || stepCrossedTarget;

          if (reachesImpact) {
            flightState.x = guidedTarget.x;
            flightState.y = guidedTarget.y;
            rotation = targetAngle * (180 / Math.PI) + 45;

            gsap.set(projectile, {
              x: flightState.x,
              y: flightState.y,
              rotation,
            });

            finishGuidedFlight();
            return;
          }

          flightState.x = nextX;
          flightState.y = nextY;

          const nextProjectileCenterX = flightState.x + rect.width / 2;
          const nextProjectileCenterY = flightState.y + rect.height / 2;
          const remainingDistance = Math.hypot(
            targetCenterX - nextProjectileCenterX,
            targetCenterY - nextProjectileCenterY
          );

          const travelAngle = Math.atan2(flightState.vy, flightState.vx);
          if (Number.isFinite(travelAngle)) {
            rotation = travelAngle * (180 / Math.PI) + 45;
          }

          gsap.set(projectile, {
            x: flightState.x,
            y: flightState.y,
            rotation,
          });

          if (remainingDistance <= 1.2) {
            finishGuidedFlight();
          }
        };

        planeShotCleanupRef.current = () => {
          gsap.ticker.remove(updateGuidedFlight);
        };

        gsap.ticker.add(updateGuidedFlight);
      })
        .to(projectile, {
          keyframes: [
            {
              x: () => endX + tangentX * 2.2,
              y: () => endY + tangentY * 2.2,
              rotation: () => rotation + 4,
              duration: 0.028,
            },
            {
              x: () => endX - tangentX * 1.7,
              y: () => endY - tangentY * 1.7,
              rotation: () => rotation - 3,
              duration: 0.028,
            },
            { x: () => endX, y: () => endY, rotation: () => rotation, duration: 0.034 },
          ],
          ease: "none",
        })
        .to(projectile, {
          x: () => bounceX,
          y: () => bounceY,
          rotation: () => bounceRotation,
          duration: 0.36,
          ease: "power4.out",
        })
        .to(projectile, {
          autoAlpha: 0,
          scale: 0.28,
          rotation: () => bounceRotation + 58,
          duration: 0.07,
          ease: "power2.out",
        })
        .set(shards, { x: () => burstCenterX, y: () => burstCenterY, autoAlpha: 1, scale: 0.58 }, "<")
        .to(
          shards,
          {
            x: (index) => {
              const shardAngle = angle + (index - 4.5) * 0.42;
              return burstCenterX + Math.cos(shardAngle) * (24 + index * 3);
            },
            y: (index) => {
              const shardAngle = angle + (index - 4.5) * 0.42;
              return burstCenterY + Math.sin(shardAngle) * (20 + index * 2.6);
            },
            rotation: (index) => rotation + index * 31,
            autoAlpha: 0,
            scale: 0.12,
            duration: 0.42,
            stagger: 0.012,
            ease: "power3.out",
          },
          "<"
        )
        .fromTo(
          plane,
          {
            x: -30,
            y: 24,
            rotation: -18,
            autoAlpha: 0,
          },
          {
            x: 0,
            y: 0,
            rotation: 0,
            autoAlpha: 1,
            duration: 0.34,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
          "-=0.18"
        );
    };

    const handleCtaEnter = () => {
      ctaHoverRef.current = true;
      resetPlane();
    };

    const handleCtaLeave = () => {
      ctaHoverRef.current = false;
    };
    const stopCtaClickPropagation = (event: Event) => {
      event.stopPropagation();
    };

    const handleRootPointerDown = (event: PointerEvent) => {
      if (!isInsideMarquee(event.target)) return;

      marqueePointerStart = { x: event.clientX, y: event.clientY };
      isDraggingMarquee = false;
      suppressPlaneShotUntil = performance.now() + 300;
    };

    const handleRootPointerMove = (event: PointerEvent) => {
      if (!marqueePointerStart) return;

      const distance = Math.hypot(
        event.clientX - marqueePointerStart.x,
        event.clientY - marqueePointerStart.y
      );

      if (distance > 6) {
        isDraggingMarquee = true;
        suppressPlaneShotUntil = performance.now() + 500;
      }
    };

    const handleRootPointerEnd = () => {
      if (isDraggingMarquee) {
        suppressPlaneShotUntil = performance.now() + 500;
      }

      marqueePointerStart = null;
      isDraggingMarquee = false;
    };

    root.addEventListener("pointerdown", handleRootPointerDown, true);
    root.addEventListener("pointermove", handleRootPointerMove, true);
    root.addEventListener("pointerup", handleRootPointerEnd, true);
    root.addEventListener("pointercancel", handleRootPointerEnd, true);
    root.addEventListener("pointermove", pointPlaneToPointer);
    root.addEventListener("pointerleave", resetPlane);
    root.addEventListener("click", shootPlaneAtPointer);
    window.addEventListener("pointermove", updatePointerPosition);
    ctaElement?.addEventListener("pointerenter", handleCtaEnter);
    ctaElement?.addEventListener("pointerleave", handleCtaLeave);
    ctaElement?.addEventListener("click", stopCtaClickPropagation, {
      capture: true,
    });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      planeShotCleanupRef.current?.();
      planeShotCleanupRef.current = null;
      planeShotTimelineRef.current?.kill();
      planeShotActiveRef.current = false;
      document.querySelectorAll(`.${s.testimonialPlaneProjectile}, .${s.testimonialPlaneShard}`)
        .forEach((element) => element.remove());
      gsap.set(plane, { clearProps: "transform,opacity,visibility" });
      root.removeEventListener("pointerdown", handleRootPointerDown, true);
      root.removeEventListener("pointermove", handleRootPointerMove, true);
      root.removeEventListener("pointerup", handleRootPointerEnd, true);
      root.removeEventListener("pointercancel", handleRootPointerEnd, true);
      root.removeEventListener("pointermove", pointPlaneToPointer);
      root.removeEventListener("pointerleave", resetPlane);
      root.removeEventListener("click", shootPlaneAtPointer);
      window.removeEventListener("pointermove", updatePointerPosition);
      ctaElement?.removeEventListener("pointerenter", handleCtaEnter);
      ctaElement?.removeEventListener("pointerleave", handleCtaLeave);
      ctaElement?.removeEventListener("click", stopCtaClickPropagation, {
        capture: true,
      });
    };
  }, []);

  const onCtaClick = (
    event: ReactMouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    event.stopPropagation();
    gaEvent("cta_click", { location: "testimonials", label });
    gaEvent("lead_modal_open", { location: "testimonials" });
    openLeadForm();
  };

  return (
    <Button
      variant="cta"
      className={className}
      iconRight={<Send ref={planeRef} className={s.ctaIcon} aria-hidden />}
      onClick={onCtaClick}
    >
      {children}
    </Button>
  );
};

export default TestimonialsCTAButton;
