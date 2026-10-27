"use client";

import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import gsap from "gsap";
import { Send } from "lucide-react";
import Button from "@/app/ui/cta/Button";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import s from "./process.module.css";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion).matches;

type ProcessCtaButtonProps = {
  className?: string;
  label?: string;
  leadFormTopic?: string;
  location?: string;
  rootSelector?: string;
};

export default function ProcessCtaButton({
  className,
  label = "Domluvit úvodní hovor",
  leadFormTopic = "Jiná situace",
  location = "process",
  rootSelector = "[data-process-timeline]",
}: ProcessCtaButtonProps = {}) {
  const { openLeadForm } = useLeadFormModal();
  const planeRef = useRef<SVGSVGElement | null>(null);
  const ctaHoverRef = useRef(false);
  const planeShotActiveRef = useRef(false);
  const planeShotTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const planeShotCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const plane = planeRef.current;
    const root = plane?.closest<HTMLElement>(rootSelector);

    if (!plane || !root) return undefined;

    root.style.setProperty("--process-plane-rotation", "0deg");

    if (prefersReducedMotion()) return undefined;

    const ctaElement = plane.closest("button, a");
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let pointerLastTime = performance.now();
    let hasPointerPosition = false;
    const interactiveSelector =
      'button, a, input, textarea, select, label, video, [role="button"], [data-video-card], [data-video-play]';

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

    const isCtaVisible = () => {
      if (!(ctaElement instanceof HTMLElement)) return false;

      const rect = ctaElement.getBoundingClientRect();
      const style = window.getComputedStyle(ctaElement);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0.42
      );
    };

    const pointPlaneToPointer = (event: PointerEvent) => {
      updatePointerPosition(event);

      if (ctaHoverRef.current || planeShotActiveRef.current || !isCtaVisible()) {
        return;
      }

      if (frame) window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        const rect = plane.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        const rotation = angle * (180 / Math.PI) + 45;

        root.style.setProperty("--process-plane-rotation", `${rotation}deg`);
      });
    };

    const resetPlane = () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.style.setProperty("--process-plane-rotation", "0deg");
    };

    const createPlaneShard = () => {
      const shard = document.createElement("span");
      shard.className = s.processPlaneShard;
      document.body.appendChild(shard);
      return shard;
    };

    const shootPlaneAtPointer = (event: MouseEvent) => {
      if (event.button !== 0 || planeShotActiveRef.current || !isCtaVisible()) {
        return;
      }

      const elementAtPointer = document.elementFromPoint(
        event.clientX,
        event.clientY
      );

      if (elementAtPointer?.closest(interactiveSelector)) return;

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
            Boolean(node.closest(interactiveSelector))
        )
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element) || target.closest(interactiveSelector)) {
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
        const targetDistance = Math.hypot(
          pointerX - projectileCenterX,
          pointerY - projectileCenterY
        );
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
        const incomingX =
          relativeSpeed > 0.1
            ? relativeVelocityX / relativeSpeed
            : Math.cos(guidedTarget.angle);
        const incomingY =
          relativeSpeed > 0.1
            ? relativeVelocityY / relativeSpeed
            : Math.sin(guidedTarget.angle);
        const projectileCenterX = flightState.x + rect.width / 2;
        const projectileCenterY = flightState.y + rect.height / 2;
        const contactOffsetX = projectileCenterX - pointerX;
        const contactOffsetY = projectileCenterY - pointerY;
        const contactOffsetLength = Math.hypot(contactOffsetX, contactOffsetY);
        let normalX =
          contactOffsetLength > 2 ? contactOffsetX / contactOffsetLength : -incomingX;
        let normalY =
          contactOffsetLength > 2 ? contactOffsetY / contactOffsetLength : -incomingY;
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

      projectile.classList.remove(s.processCtaIcon);
      projectile.classList.add(s.processPlaneProjectile);
      projectile.setAttribute("aria-hidden", "true");
      document.body.appendChild(projectile);

      gsap.set(projectile, {
        autoAlpha: 1,
        rotation: initialRotation,
        x: startX,
        y: startY,
      });
      gsap.set(plane, { autoAlpha: 0 });
      gsap.set(shards, {
        autoAlpha: 0,
        scale: 0.45,
        x: burstCenterX,
        y: burstCenterY,
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
          gsap.set(projectile, { rotation, x: endX, y: endY });
          tl.resume();
        };

        const updateGuidedFlight = () => {
          const now = performance.now();
          const dt = Math.min(
            0.034,
            Math.max(0.001, (now - flightState.lastTime) / 1000)
          );
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
              rotation,
              x: flightState.x,
              y: flightState.y,
            });

            finishGuidedFlight();
            return;
          }

          flightState.x = nextX;
          flightState.y = nextY;

          const travelAngle = Math.atan2(flightState.vy, flightState.vx);
          if (Number.isFinite(travelAngle)) {
            rotation = travelAngle * (180 / Math.PI) + 45;
          }

          gsap.set(projectile, {
            rotation,
            x: flightState.x,
            y: flightState.y,
          });
        };

        planeShotCleanupRef.current = () => {
          gsap.ticker.remove(updateGuidedFlight);
        };

        gsap.ticker.add(updateGuidedFlight);
      })
        .to(projectile, {
          keyframes: [
            {
              duration: 0.028,
              rotation: () => rotation + 4,
              x: () => endX + tangentX * 2.2,
              y: () => endY + tangentY * 2.2,
            },
            {
              duration: 0.028,
              rotation: () => rotation - 3,
              x: () => endX - tangentX * 1.7,
              y: () => endY - tangentY * 1.7,
            },
            {
              duration: 0.034,
              rotation: () => rotation,
              x: () => endX,
              y: () => endY,
            },
          ],
          ease: "none",
        })
        .to(projectile, {
          duration: 0.36,
          ease: "power4.out",
          rotation: () => bounceRotation,
          x: () => bounceX,
          y: () => bounceY,
        })
        .to(projectile, {
          autoAlpha: 0,
          duration: 0.07,
          ease: "power2.out",
          rotation: () => bounceRotation + 58,
          scale: 0.28,
        })
        .set(
          shards,
          {
            autoAlpha: 1,
            scale: 0.58,
            x: () => burstCenterX,
            y: () => burstCenterY,
          },
          "<"
        )
        .to(
          shards,
          {
            autoAlpha: 0,
            duration: 0.42,
            ease: "power3.out",
            rotation: (index) => rotation + index * 31,
            scale: 0.12,
            stagger: 0.012,
            x: (index) => {
              const shardAngle = angle + (index - 4.5) * 0.42;
              return burstCenterX + Math.cos(shardAngle) * (24 + index * 3);
            },
            y: (index) => {
              const shardAngle = angle + (index - 4.5) * 0.42;
              return burstCenterY + Math.sin(shardAngle) * (20 + index * 2.6);
            },
          },
          "<"
        )
        .fromTo(
          plane,
          {
            autoAlpha: 0,
            rotation: -18,
            x: -30,
            y: 24,
          },
          {
            autoAlpha: 1,
            clearProps: "transform,opacity,visibility",
            duration: 0.34,
            ease: "power3.out",
            rotation: 0,
            x: 0,
            y: 0,
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

    root.addEventListener("pointermove", pointPlaneToPointer);
    root.addEventListener("pointerleave", resetPlane);
    root.addEventListener("click", shootPlaneAtPointer);
    window.addEventListener("pointermove", updatePointerPosition);
    ctaElement?.addEventListener("pointerenter", handleCtaEnter);
    ctaElement?.addEventListener("pointerleave", handleCtaLeave);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      planeShotCleanupRef.current?.();
      planeShotCleanupRef.current = null;
      planeShotTimelineRef.current?.kill();
      planeShotActiveRef.current = false;
      document
        .querySelectorAll(`.${s.processPlaneProjectile}, .${s.processPlaneShard}`)
        .forEach((element) => element.remove());
      gsap.set(plane, { clearProps: "transform,opacity,visibility" });
      root.removeEventListener("pointermove", pointPlaneToPointer);
      root.removeEventListener("pointerleave", resetPlane);
      root.removeEventListener("click", shootPlaneAtPointer);
      window.removeEventListener("pointermove", updatePointerPosition);
      ctaElement?.removeEventListener("pointerenter", handleCtaEnter);
      ctaElement?.removeEventListener("pointerleave", handleCtaLeave);
    };
  }, [rootSelector]);

  const onCtaClick = (
    event: ReactMouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    event.stopPropagation();
    gaEvent("cta_click", { location, label });
    gaEvent("lead_modal_open", { location });
    openLeadForm(leadFormTopic);
  };

  return (
    <Button
      variant="cta"
      className={[s.processCtaButton, className].filter(Boolean).join(" ")}
      onClick={onCtaClick}
      type="button"
      iconRight={
        <Send
          ref={planeRef}
          aria-hidden="true"
          className={s.processCtaIcon}
          size={18}
          strokeWidth={1.9}
        />
      }
    >
      {label}
    </Button>
  );
}
