"use client";

import type { ReactNode } from "react";
import styles from "./GsapTextReveal.module.css";

type GsapStatic = typeof import("gsap").gsap;
type GsapTimeline = ReturnType<GsapStatic["timeline"]>;
type RevealRoot = "div" | "p" | "span";
type RevealContent = "div" | "span";

export const GSAP_TEXT_REVEAL_TARGET_SELECTOR =
  "[data-gsap-text-reveal-content]";

export const GSAP_TEXT_REVEAL_MOTION = {
  duration: 0.22,
  ease: "power3.out",
  stagger: 0.025,
  yPercent: 112,
} as const;

export function getGsapTextRevealTargets(root: ParentNode) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(GSAP_TEXT_REVEAL_TARGET_SELECTOR),
  ).sort((first, second) => {
    const firstOrder = Number(first.dataset.gsapTextRevealOrder ?? 0);
    const secondOrder = Number(second.dataset.gsapTextRevealOrder ?? 0);
    return firstOrder - secondOrder;
  });
}

export function prepareGsapTextReveal(
  gsap: GsapStatic,
  targets: HTMLElement[],
) {
  gsap.set(targets, {
    autoAlpha: 0,
    willChange: "transform, opacity",
    yPercent: GSAP_TEXT_REVEAL_MOTION.yPercent,
  });
}

export function addGsapTextReveal(
  timeline: GsapTimeline,
  targets: HTMLElement[],
  position: number,
) {
  timeline.to(
    targets,
    {
      autoAlpha: 1,
      duration: GSAP_TEXT_REVEAL_MOTION.duration,
      ease: GSAP_TEXT_REVEAL_MOTION.ease,
      stagger: GSAP_TEXT_REVEAL_MOTION.stagger,
      yPercent: 0,
    },
    position,
  );
}

export function clearGsapTextReveal(
  gsap: GsapStatic,
  targets: HTMLElement[],
) {
  gsap.set(targets, {
    clearProps: "opacity,transform,visibility,willChange",
  });
}

export default function GsapTextReveal({
  as = "span",
  children,
  className,
  contentAs = "span",
  contentClassName,
  order = 0,
}: {
  as?: RevealRoot;
  children: ReactNode;
  className?: string;
  contentAs?: RevealContent;
  contentClassName?: string;
  order?: number;
}) {
  const Root = as;
  const Content = contentAs;

  return (
    <Root
      className={[styles.mask, className].filter(Boolean).join(" ")}
      data-gsap-text-reveal-mask
    >
      <Content
        className={[styles.content, contentClassName].filter(Boolean).join(" ")}
        data-gsap-text-reveal-content
        data-gsap-text-reveal-order={order}
      >
        {children}
      </Content>
    </Root>
  );
}
