"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import RouteTransitionOverlay from "./RouteTransitionOverlay";
import styles from "./RouteTransition.module.css";
import type {
  RouteTransitionContextValue,
  RouteTransitionPhase,
  RouteTransitionTone,
} from "./routeTransition.types";
import {
  getRouteTarget,
  getTransitionOrigin,
  normalizePathname,
  prefersReducedMotion,
  ROUTE_TRANSITIONS,
  scrollToRouteTarget,
  wait,
  waitForNextPaint,
} from "./routeTransition.utils";

type PendingPath = {
  frameId: number | null;
  resolve: () => void;
  targetPathname: string;
  timeoutId: number;
};

type TransitionVisualState = {
  originX: number;
  originY: number;
  phase: RouteTransitionPhase;
  reducedMotion: boolean;
  scale: number;
  tone: RouteTransitionTone;
  useSnapshotReveal: boolean;
};

const COVER_DURATION = 680;
const REVEAL_DURATION = 620;
const REDUCED_COVER_DURATION = 160;
const REDUCED_REVEAL_DURATION = 180;

const clearDocumentTransitionState = () => {
  delete document.documentElement.dataset.routeTransition;
  delete document.documentElement.dataset.routeTransitionMode;
  document.documentElement.style.removeProperty("--route-transition-origin-x");
  document.documentElement.style.removeProperty("--route-transition-origin-y");
  document.documentElement.style.removeProperty("--route-transition-radius");
  document.documentElement.style.removeProperty("--route-transition-scale");
};

const createRouteSnapshot = () => {
  const snapshot = document.createElement("div");
  const contentMask = document.createElement("div");
  const content = document.createElement("div");
  const ring = document.createElement("div");
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

  snapshot.className = styles.snapshot;
  snapshot.dataset.routeTransitionSnapshot = "true";
  contentMask.className = styles.snapshotContent;
  content.className = styles.snapshotContentInner;
  content.style.transform = `translate3d(0, -${scrollY}px, 0)`;
  ring.className = styles.snapshotRing;

  Array.from(document.body.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.matches("[data-custom-cursor-root]")) return;
    if (child.matches("[data-route-transition-overlay]")) return;
    if (child.matches("[data-route-transition-snapshot]")) return;
    if (child.tagName === "SCRIPT") return;

    content.appendChild(child.cloneNode(true));
  });

  contentMask.appendChild(content);
  snapshot.append(contentMask, ring);
  document.body.appendChild(snapshot);

  return snapshot;
};

const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);

export const useRouteTransition = () => {
  const context = useContext(RouteTransitionContext);

  if (!context) {
    throw new Error(
      "useRouteTransition must be used within RouteTransitionProvider",
    );
  }

  return context;
};

const resolvePendingPath = (
  pending: MutableRefObject<PendingPath | null>,
) => {
  if (!pending.current) return;

  if (pending.current.frameId !== null) {
    window.cancelAnimationFrame(pending.current.frameId);
  }
  window.clearTimeout(pending.current.timeoutId);
  pending.current.resolve();
  pending.current = null;
};

export default function RouteTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const pendingPathRef = useRef<PendingPath | null>(null);
  const isTransitioningRef = useRef(false);
  const isMountedRef = useRef(false);
  const previousBodyOverflowRef = useRef("");
  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visualState, setVisualState] = useState<TransitionVisualState>({
    originX: 0,
    originY: 0,
    phase: "idle",
    reducedMotion: false,
    scale: 1,
    tone: "default",
    useSnapshotReveal: false,
  });

  useEffect(() => {
    pathnameRef.current = pathname;

    const pending = pendingPathRef.current;
    if (!pending) return;

    if (normalizePathname(pathname) === pending.targetPathname) {
      resolvePendingPath(pendingPathRef);
    }
  }, [pathname]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (isTransitioningRef.current) return;

      if (pendingPathRef.current) {
        resolvePendingPath(pendingPathRef);
      }
      snapshotRef.current?.remove();
      snapshotRef.current = null;
      clearDocumentTransitionState();
      document.body.style.overflow = previousBodyOverflowRef.current;
    };
  }, []);

  const waitForPathname = useCallback((targetPathname: string) => {
    if (normalizePathname(pathnameRef.current) === targetPathname) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      if (pendingPathRef.current) {
        resolvePendingPath(pendingPathRef);
      }

      const timeoutId = window.setTimeout(() => {
        resolvePendingPath(pendingPathRef);
      }, 2400);

      const pendingPath: PendingPath = {
        frameId: null,
        resolve,
        targetPathname,
        timeoutId,
      };

      const checkPathname = () => {
        if (normalizePathname(window.location.pathname) === targetPathname) {
          resolvePendingPath(pendingPathRef);
          return;
        }

        pendingPath.frameId = window.requestAnimationFrame(checkPathname);
      };

      pendingPathRef.current = pendingPath;
      pendingPath.frameId = window.requestAnimationFrame(checkPathname);
    });
  }, []);

  const transitionTo = useCallback(
    async (href: string, originElement?: HTMLElement | null) => {
      if (typeof window === "undefined") return;
      if (isTransitioningRef.current) return;

      const target = getRouteTarget(href);
      if (!target.isInternal) {
        window.location.href = href;
        return;
      }

      const currentPathname = normalizePathname(pathnameRef.current);
      if (target.pathname === currentPathname && !target.hash) {
        return;
      }

      const reducedMotion = prefersReducedMotion();
      const origin = getTransitionOrigin(originElement);
      const transitionConfig =
        ROUTE_TRANSITIONS[target.pathname] ?? ROUTE_TRANSITIONS["/ziskat-prehled"];
      const coverDuration = reducedMotion
        ? REDUCED_COVER_DURATION
        : COVER_DURATION;
      const revealDuration = reducedMotion
        ? REDUCED_REVEAL_DURATION
        : REVEAL_DURATION;

      isTransitioningRef.current = true;
      setIsTransitioning(true);
      previousBodyOverflowRef.current = document.body.style.overflow;
      document.documentElement.dataset.routeTransition = "cover";
      document.documentElement.dataset.routeTransitionMode = reducedMotion
        ? "reduced"
        : "snapshot";
      document.documentElement.style.setProperty(
        "--route-transition-origin-x",
        `${origin.x}px`,
      );
      document.documentElement.style.setProperty(
        "--route-transition-origin-y",
        `${origin.y}px`,
      );
      document.documentElement.style.setProperty(
        "--route-transition-radius",
        `${origin.radius}px`,
      );
      document.documentElement.style.setProperty(
        "--route-transition-scale",
        String(origin.scale),
      );

      const snapshot = reducedMotion ? null : createRouteSnapshot();
      snapshotRef.current = snapshot;
      document.body.style.overflow = "hidden";

      setVisualState({
        originX: origin.x,
        originY: origin.y,
        phase: "cover",
        reducedMotion,
        scale: origin.scale,
        tone: transitionConfig?.tone ?? "default",
        useSnapshotReveal: Boolean(snapshot),
      });

      try {
        router.prefetch(target.href);

        const navigateToTarget = async () => {
          router.push(target.href, { scroll: false });
          await waitForPathname(target.pathname);
          scrollToRouteTarget(target.hash);
          await waitForNextPaint();
        };

        if (snapshot) {
          await navigateToTarget();
          snapshot.classList.add(styles.snapshotReveal);
          await wait(coverDuration);
        } else {
          await wait(coverDuration);
          await navigateToTarget();

          document.documentElement.dataset.routeTransition = "reveal";
          setVisualState((current) => ({
            ...current,
            phase: "reveal",
          }));
          await wait(revealDuration);
        }
      } catch {
        router.push(target.href);
      } finally {
        resolvePendingPath(pendingPathRef);
        snapshotRef.current?.remove();
        snapshotRef.current = null;
        document.body.style.overflow = previousBodyOverflowRef.current;
        clearDocumentTransitionState();
        isTransitioningRef.current = false;
        if (isMountedRef.current) {
          setIsTransitioning(false);
          setVisualState((current) => ({
            ...current,
            phase: "idle",
            useSnapshotReveal: false,
          }));
        }
      }
    },
    [router, waitForPathname],
  );

  const value = useMemo(
    () => ({
      isTransitioning,
      transitionTo,
    }),
    [isTransitioning, transitionTo],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
      <RouteTransitionOverlay {...visualState} />
    </RouteTransitionContext.Provider>
  );
}
