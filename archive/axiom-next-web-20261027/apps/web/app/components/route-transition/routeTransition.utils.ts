import type { MouseEvent } from "react";

import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import type {
  RouteTransitionConfig,
  RouteTransitionOrigin,
} from "./routeTransition.types";

type LenisLike = {
  scrollTo?: (
    target: number | string | Element,
    options?: { force?: boolean; immediate?: boolean },
  ) => void;
};

export const MAIN_ROUTE_HREFS = [
  "/kdo-jsem/",
  "/jak-pracuji/",
  "/sluzby/",
  "/reference/",
  "/clanky/",
  "/ziskat-prehled/",
] as const;

export const ROUTE_TRANSITIONS: Record<string, RouteTransitionConfig> = {
  "/kdo-jsem": { type: "lens", tone: "portrait" },
  "/jak-pracuji": { type: "lens", tone: "process" },
  "/sluzby": { type: "lens", tone: "service" },
  "/reference": { type: "lens", tone: "trust" },
  "/clanky": { type: "lens", tone: "content" },
  "/ziskat-prehled": { type: "lens", tone: "default" },
};

export const normalizePathname = (pathname: string) => {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
};

export const getRouteTarget = (href: string) => {
  if (typeof window === "undefined") {
    return {
      hash: "",
      href,
      isInternal: href.startsWith("/") && !href.startsWith("//"),
      pathname: normalizePathname(href.split("#")[0] || "/"),
    };
  }

  const url = new URL(href, window.location.origin);

  return {
    hash: url.hash,
    href: `${url.pathname}${url.search}${url.hash}`,
    isInternal: url.origin === window.location.origin,
    pathname: normalizePathname(url.pathname),
  };
};

export const shouldUseNativeNavigation = (
  event: MouseEvent<HTMLAnchorElement>,
) =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  event.button !== 0;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion)
    ?.matches === true;

export const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });

export const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

export const requestIdle = (cb: () => void, timeout = 1800) => {
  const w = window as Window & {
    cancelIdleCallback?: (id: number) => void;
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number },
    ) => number;
  };

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }

  const timer = window.setTimeout(cb, 650);
  return () => window.clearTimeout(timer);
};

export const getTransitionOrigin = (
  originElement?: HTMLElement | null,
): RouteTransitionOrigin => {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const rect = originElement?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : viewportWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : viewportHeight / 2;
  const farthestCornerDistance = Math.max(
    Math.hypot(x, y),
    Math.hypot(viewportWidth - x, y),
    Math.hypot(x, viewportHeight - y),
    Math.hypot(viewportWidth - x, viewportHeight - y),
  );
  const radius = Math.max(64, farthestCornerDistance * 1.09);

  return {
    radius,
    x,
    y,
    scale: Math.max(1, radius / 32),
  };
};

export const scrollToRouteTarget = (hash: string) => {
  const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;

  if (hash) {
    const target = document.getElementById(hash.slice(1));
    if (target) {
      lenis?.scrollTo?.(target, { force: true, immediate: true });
      if (!lenis?.scrollTo) {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      }
      return;
    }
  }

  if (lenis?.scrollTo) {
    lenis.scrollTo(0, { force: true, immediate: true });
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
};
