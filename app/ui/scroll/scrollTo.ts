"use client";

export type ScrollTarget = string | Element | number;

const getLenis = () =>
  (
    window as unknown as {
      __lenis?: {
        scrollTo?: (
          target: ScrollTarget,
          options?: { immediate?: boolean; force?: boolean }
        ) => void;
      };
    }
  ).__lenis;

const scrollToNative = (target: ScrollTarget) => {
  if (typeof target === "number") {
    window.scrollTo({ top: target, left: 0, behavior: "auto" });
    return;
  }

  const element =
    typeof target === "string"
      ? (document.querySelector(target) as Element | null)
      : target;

  element?.scrollIntoView({ behavior: "auto", block: "start" });
};

export const scrollToInstant = (target: ScrollTarget) => {
  if (typeof window === "undefined") return;
  const lenis = getLenis();
  if (lenis?.scrollTo) {
    lenis.scrollTo(target, { immediate: true, force: true });
    return;
  }
  scrollToNative(target);
};

export const scrollToSmooth = (target: ScrollTarget) => {
  if (typeof window === "undefined") return;
  const lenis = getLenis();
  if (lenis?.scrollTo) {
    lenis.scrollTo(target);
    return;
  }
  scrollToNative(target);
};

export const scrollToHashInstant = (hash: string) => {
  if (!hash.startsWith("#")) return;
  const normalized = hash === "#" ? "" : hash;
  if (normalized) {
    window.history.pushState(null, "", normalized);
  }
  if (!normalized) return;
  scrollToInstant(normalized);
};
