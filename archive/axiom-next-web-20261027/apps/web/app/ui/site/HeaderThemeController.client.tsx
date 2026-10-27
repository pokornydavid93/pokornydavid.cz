"use client";

import { useLayoutEffect, useRef } from "react";
import {
  SITE_HEADER_THEME_STORAGE_KEY,
  type SiteHeaderMaterial,
  type SiteHeaderTheme,
} from "./siteHeaderTheme";
import {
  isHeaderContextLockActive,
  resolveHeaderContextLockOwner,
} from "./headerContextLock.client";

export type {
  SiteHeaderMaterial,
  SiteHeaderTheme,
} from "./siteHeaderTheme";

const EXPLICIT_THEME_OWNER_SELECTOR =
  "[data-nav-theme], [data-nav-section]";
const SURFACE_THEME_OWNER_SELECTOR =
  "main[data-surface-tone], section[data-surface-tone]";
const HEADER_THEME_READY_ATTRIBUTE = "data-nav-theme-ready";
const HEADER_THEME_TRANSITION_ATTRIBUTE = "data-nav-theme-transition";
const TOP_OVERLAY_RANGE_PX = 34;

type SiteHeaderContext = {
  material: SiteHeaderMaterial;
  theme: SiteHeaderTheme;
};

const normalizeTheme = (
  value: string | null | undefined,
): SiteHeaderTheme | null => {
  if (value === "dark") return "dark";
  if (value === "light" || value === "action" || value === "lime") {
    return "light";
  }
  return null;
};

const normalizeMaterial = (
  value: string | null | undefined,
): SiteHeaderMaterial => value === "hero-glass" ? "hero-glass" : "default";

const contextsMatch = (
  first: SiteHeaderContext | null,
  second: SiteHeaderContext | null,
) => first?.theme === second?.theme && first?.material === second?.material;

const resolveExplicitOwnerContext = (
  element: Element,
): SiteHeaderContext | null => {
  const explicitOwner = element.closest<HTMLElement>(
    EXPLICIT_THEME_OWNER_SELECTOR,
  );
  const theme = normalizeTheme(
    explicitOwner?.dataset.navTheme ?? explicitOwner?.dataset.navSection,
  );

  return theme && explicitOwner
    ? {
        material: normalizeMaterial(explicitOwner.dataset.navMaterial),
        theme,
      }
    : null;
};

const resolveSurfaceOwnerContext = (
  element: Element,
): SiteHeaderContext | null => {
  const surfaceOwner = element.closest<HTMLElement>(
    SURFACE_THEME_OWNER_SELECTOR,
  );
  const theme = normalizeTheme(surfaceOwner?.dataset.surfaceTone);

  return theme && surfaceOwner
    ? {
        material: normalizeMaterial(surfaceOwner.dataset.navMaterial),
        theme,
      }
    : null;
};

const resolveOwnerContext = (element: Element): SiteHeaderContext | null =>
  resolveExplicitOwnerContext(element) ?? resolveSurfaceOwnerContext(element);

const resolveHashContext = (): SiteHeaderContext | null => {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;

  let target: HTMLElement | null = null;

  try {
    target = document.getElementById(decodeURIComponent(hash));
  } catch {
    target = document.getElementById(hash);
  }

  return target ? resolveOwnerContext(target) : null;
};

const resolveGeometryContextAtPoint = (
  header: HTMLElement,
  owners: readonly HTMLElement[],
  x: number,
  y: number,
  preferredTheme: SiteHeaderTheme | null,
): SiteHeaderContext | null => {
  let selected:
    | {
        context: SiteHeaderContext;
        order: number;
        zIndex: number;
      }
    | undefined;

  owners.forEach((owner, order) => {
    if (owner === header || header.contains(owner)) return;

    const theme = normalizeTheme(
      owner.dataset.navTheme ?? owner.dataset.navSection,
    );
    if (!theme || (preferredTheme && theme !== preferredTheme)) return;

    const rect = owner.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y >= rect.bottom
    ) {
      return;
    }

    const style = window.getComputedStyle(owner);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") <= 0.01
    ) {
      return;
    }

    const parsedZIndex = Number.parseInt(style.zIndex, 10);
    const zIndex = Number.isFinite(parsedZIndex) ? parsedZIndex : 0;

    if (
      !selected ||
      zIndex > selected.zIndex ||
      (zIndex === selected.zIndex && order > selected.order)
    ) {
      selected = {
        context: {
          material: normalizeMaterial(owner.dataset.navMaterial),
          theme,
        },
        order,
        zIndex,
      };
    }
  });

  return selected?.context ?? null;
};

const resolveContextBelowHeader = (
  header: HTMLElement,
  headerHeight = header.offsetHeight,
): SiteHeaderContext | null => {
  const probeY = Math.min(
    window.innerHeight - 1,
    Math.max(1, headerHeight + 1),
  );
  const probeXPositions = [0.5, 0.18, 0.82];
  const hashTheme = resolveHashContext()?.theme ?? null;
  let explicitOwners: HTMLElement[] | null = null;
  const getExplicitOwners = () => {
    explicitOwners ??= Array.from(
      document.querySelectorAll<HTMLElement>(
        EXPLICIT_THEME_OWNER_SELECTOR,
      ),
    );
    return explicitOwners;
  };
  const candidates: SiteHeaderContext[] = [];

  for (const ratio of probeXPositions) {
    const probeX = Math.min(
      window.innerWidth - 1,
      Math.max(1, Math.round(window.innerWidth * ratio)),
    );
    const stack = document.elementsFromPoint(probeX, probeY);
    let candidate: SiteHeaderContext | null = null;

    for (const element of stack) {
      if (header.contains(element)) continue;

      candidate = resolveExplicitOwnerContext(element);
      if (!candidate) continue;
      break;
    }

    if (!candidate) {
      for (const element of stack) {
        if (header.contains(element)) continue;

        candidate = resolveSurfaceOwnerContext(element);
        if (!candidate) continue;
        break;
      }
    }

    candidate ??= resolveGeometryContextAtPoint(
      header,
      getExplicitOwners(),
      probeX,
      probeY,
      hashTheme,
    );

    if (candidate) candidates.push(candidate);
  }

  if (candidates.length === 0) return null;

  const lightVotes = candidates.filter(({ theme }) => theme === "light").length;
  const darkVotes = candidates.length - lightVotes;
  const theme = lightVotes === darkVotes
    ? candidates[0]?.theme
    : lightVotes > darkVotes ? "light" : "dark";
  if (!theme) return null;

  const themedCandidates = candidates.filter(
    (candidate) => candidate.theme === theme,
  );
  const heroGlassVotes = themedCandidates.filter(
    ({ material }) => material === "hero-glass",
  ).length;
  const defaultVotes = themedCandidates.length - heroGlassVotes;
  const material = heroGlassVotes === defaultVotes
    ? themedCandidates[0]?.material
    : heroGlassVotes > defaultVotes ? "hero-glass" : "default";

  return material ? { material, theme } : null;
};

const applyTheme = (header: HTMLElement, theme: SiteHeaderTheme) => {
  header.dataset.cursorSurface = theme;
  header.dataset.navTheme = theme;
  header.dataset.surfaceTone = theme;
  header.dataset.theme = theme;

  try {
    window.sessionStorage.setItem(
      SITE_HEADER_THEME_STORAGE_KEY,
      JSON.stringify({
        pathname: window.location.pathname,
        theme,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Theme persistence is a first-paint enhancement, not a runtime dependency.
  }
};

const applyContext = (
  header: HTMLElement,
  context: SiteHeaderContext,
) => {
  applyTheme(header, context.theme);
  header.dataset.navMaterial = context.material;
};

export default function HeaderThemeController({
  contextLockSelector,
  initialMaterial,
  initialTheme,
  transparentAtTop = false,
}: {
  contextLockSelector?: string;
  initialMaterial: SiteHeaderMaterial;
  initialTheme: SiteHeaderTheme;
  transparentAtTop?: boolean;
}) {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const controller = controllerRef.current;
    const header = controller?.closest<HTMLElement>(
      "[data-component='site-header']",
    );

    if (!controller || !header) return undefined;

    const syncOverlay = () => {
      if (transparentAtTop) {
        const overlay = window.scrollY <= TOP_OVERLAY_RANGE_PX
          ? "top"
          : "scrolled";
        if (header.dataset.headerOverlay !== overlay) {
          header.dataset.headerOverlay = overlay;
        }
      }
    };

    let disposed = false;
    let headerHeight = header.offsetHeight;
    const contextLockOwner = resolveHeaderContextLockOwner(
      contextLockSelector,
    );
    const navigationEntry = window.performance
      .getEntriesByType("navigation")
      .at(0) as PerformanceNavigationTiming | undefined;
    const restoresHistory =
      navigationEntry?.type === "reload" ||
      navigationEntry?.type === "back_forward";
    let restoreBootstrapActive =
      header.dataset.navThemeBootstrap === "restore";
    const restoredTheme = normalizeTheme(header.dataset.navTheme);
    const restoredMaterial = normalizeMaterial(
      header.dataset.navMaterial ?? initialMaterial,
    );
    const lockedContext: SiteHeaderContext = {
      material: initialMaterial,
      theme: initialTheme,
    };
    const contextIsLocked = () =>
      isHeaderContextLockActive(header, contextLockSelector);
    const initiallyLocked = contextIsLocked();
    const liveContext = initiallyLocked
      ? null
      : resolveContextBelowHeader(header, headerHeight);
    const hashContext = resolveHashContext();
    const fallbackContext: SiteHeaderContext = {
      material: restoredMaterial,
      theme: restoredTheme ?? initialTheme,
    };
    const resolvedContext = initiallyLocked
      ? lockedContext
      : (restoresHistory ? liveContext : hashContext) ??
        liveContext ??
        hashContext ??
        fallbackContext;
    let currentContext = restoreBootstrapActive
      ? {
          material: resolvedContext.material,
          theme: restoredTheme ?? initialTheme,
        }
      : resolvedContext;
    let stableCandidate: SiteHeaderContext | null = null;
    let stableFrames = 0;
    let frame = 0;
    let restoreReleaseTimer = 0;
    let transitionReleaseFrame = 0;
    const stabilizationTimers: number[] = [];

    const commitContext = (context: SiteHeaderContext) => {
      const changesTheme = header.dataset.navTheme !== context.theme;
      const changesMaterial = header.dataset.navMaterial !== context.material;
      const needsAtomicSwap =
        header.hasAttribute(HEADER_THEME_READY_ATTRIBUTE)
        && (changesTheme || changesMaterial);

      if (needsAtomicSwap) {
        header.setAttribute(HEADER_THEME_TRANSITION_ATTRIBUTE, "atomic");
      }

      applyContext(header, context);

      if (!needsAtomicSwap) return;
      if (transitionReleaseFrame) {
        window.cancelAnimationFrame(transitionReleaseFrame);
      }
      transitionReleaseFrame = window.requestAnimationFrame(() => {
        transitionReleaseFrame = window.requestAnimationFrame(() => {
          transitionReleaseFrame = 0;
          if (!disposed) {
            header.removeAttribute(HEADER_THEME_TRANSITION_ATTRIBUTE);
          }
        });
      });
    };

    const sync = () => {
      frame = 0;
      if (disposed) return;

      const contextLocked = contextIsLocked();
      const liveCandidate = contextLocked
        ? lockedContext
        : resolveContextBelowHeader(header, headerHeight);
      // Probe the current scene before changing the header's CSS selectors.
      syncOverlay();
      const nextContext = liveCandidate
        ? {
            material: liveCandidate.material,
            theme: restoreBootstrapActive && !contextLocked
              ? currentContext.theme
              : liveCandidate.theme,
          }
        : null;

      if (!nextContext) {
        if (!header.hasAttribute(HEADER_THEME_READY_ATTRIBUTE)) {
          header.setAttribute(HEADER_THEME_READY_ATTRIBUTE, "true");
          header.removeAttribute("data-nav-theme-bootstrap");
          controller.dataset.state = "ready";
        }
        return;
      }

      if (!contextsMatch(stableCandidate, nextContext)) {
        stableCandidate = nextContext;
        stableFrames = 1;
        frame = window.requestAnimationFrame(sync);
        return;
      }

      stableFrames += 1;
      if (stableFrames < 2) {
        frame = window.requestAnimationFrame(sync);
        return;
      }

      if (!contextsMatch(nextContext, currentContext)) {
        currentContext = nextContext;
        commitContext(currentContext);
      }

      if (!header.hasAttribute(HEADER_THEME_READY_ATTRIBUTE)) {
        header.setAttribute(HEADER_THEME_READY_ATTRIBUTE, "true");
        header.removeAttribute("data-nav-theme-bootstrap");
        controller.dataset.state = "ready";
      }
    };

    const requestSync = () => {
      if (disposed || frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    const resetStability = () => {
      stableCandidate = null;
      stableFrames = 0;
    };

    const releaseRestoreBootstrap = () => {
      if (!restoreBootstrapActive) return;
      restoreBootstrapActive = false;
      window.clearTimeout(restoreReleaseTimer);
      resetStability();
      requestSync();
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries.find((candidate) => candidate.target === header);
      if (entry) {
        const measuredHeight = entry.borderBoxSize[0]?.blockSize;
        headerHeight = measuredHeight === undefined
          ? header.offsetHeight
          : Math.round(measuredHeight);
      }
      resetStability();
      requestSync();
    });
    const contextLockObserver = contextLockOwner
      ? new MutationObserver(() => {
          resetStability();
          requestSync();
        })
      : null;
    const onHashChange = () => {
      const hashContext = resolveHashContext();
      if (
        !contextIsLocked() &&
        !restoreBootstrapActive &&
        hashContext &&
        !contextsMatch(hashContext, currentContext)
      ) {
        currentContext = hashContext;
        commitContext(currentContext);
      }
      resetStability();
      requestSync();
    };
    const onUserIntent = () => releaseRestoreBootstrap();
    const onFontsReady = () => {
      if (!disposed) {
        resetStability();
        requestSync();
      }
    };

    // Initial geometry and hit testing must precede style-affecting writes.
    syncOverlay();
    commitContext(currentContext);
    resizeObserver.observe(header);
    contextLockObserver?.observe(contextLockOwner!, {
      attributeFilter: ["class", "hidden", "style"],
      attributes: true,
    });
    requestSync();

    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("pageshow", requestSync);
    window.addEventListener("site-visual-layout-change", requestSync);
    window.addEventListener("wheel", onUserIntent, { passive: true });
    window.addEventListener("touchstart", onUserIntent, { passive: true });
    window.addEventListener("pointerdown", onUserIntent, { passive: true });
    window.addEventListener("keydown", onUserIntent);

    void document.fonts?.ready.then(onFontsReady);

    if (restoreBootstrapActive) {
      restoreReleaseTimer = window.setTimeout(
        releaseRestoreBootstrap,
        2_200,
      );
    }

    for (const delay of [120, 400, 900, 1_800, 2_600]) {
      stabilizationTimers.push(
        window.setTimeout(() => {
          resetStability();
          requestSync();
        }, delay),
      );
    }

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (transitionReleaseFrame) {
        window.cancelAnimationFrame(transitionReleaseFrame);
      }
      window.clearTimeout(restoreReleaseTimer);
      stabilizationTimers.forEach((timer) => window.clearTimeout(timer));
      contextLockObserver?.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("pageshow", requestSync);
      window.removeEventListener("site-visual-layout-change", requestSync);
      window.removeEventListener("wheel", onUserIntent);
      window.removeEventListener("touchstart", onUserIntent);
      window.removeEventListener("pointerdown", onUserIntent);
      window.removeEventListener("keydown", onUserIntent);
      header.removeAttribute(HEADER_THEME_READY_ATTRIBUTE);
      header.removeAttribute(HEADER_THEME_TRANSITION_ATTRIBUTE);
    };
  }, [contextLockSelector, initialMaterial, initialTheme, transparentAtTop]);

  return (
    <span
      aria-hidden="true"
      data-header-theme-controller
      ref={controllerRef}
    />
  );
}
