"use client";

import { useEffect, useRef } from "react";
import {
  DESIGN_PRIMITIVE_GSAP_EASES,
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
} from "@/app/theme/design-primitives";
import {
  isHeaderContextLockActive,
  resolveHeaderContextLockOwner,
} from "./headerContextLock.client";

type GsapModule = typeof import("gsap");
type GsapStatic = typeof import("gsap").gsap;

const TOP_LOCK_PX = 34;
const HIDE_START_PX = 112;
const HIDE_TRAVEL_PX = 42;
const REVEAL_TRAVEL_PX = 14;
const HEADER_VISIBLE_BOTTOM_PROPERTY = "--site-header-visible-bottom";
const STICKY_OFFSET_PROPERTY = "--site-header-sticky-offset";
const COMPACT_HEADER_MOTION_QUERY = "(max-width: 900px)";
const COMPACT_REVEAL_SECONDS = 0.26;
const COMPACT_HIDE_SECONDS = 0.24;

export default function HeaderScrollMotion({
  alternateHeaderSelector,
  compactOnly = false,
  hiddenWithin,
  lockVisibleWithin,
}: {
  alternateHeaderSelector?: string;
  compactOnly?: boolean;
  hiddenWithin?: string;
  lockVisibleWithin?: string;
}) {
  const controllerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const header = controller?.closest<HTMLElement>("[data-scroll-navigation]");

    if (!controller || !header) return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const gsapModule = (await import("gsap")) as GsapModule & {
        default?: GsapStatic;
      };

      if (cancelled) return;

      const gsap = gsapModule.gsap ?? gsapModule.default;
      const inner = header.querySelector<HTMLElement>("[data-header-motion-inner]");
      const line = header.querySelector<HTMLElement>("[data-header-motion-line]");
      const navigation = header.querySelector<HTMLElement>("[data-component='site-navigation']");

      if (!gsap || !inner) {
        controller.dataset.state = "unavailable";
        return;
      }

      const motionQuery = window.matchMedia(
        DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
      );
      const directionalQuery = compactOnly
        ? window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.cinematicAndBelow)
        : null;
      const compactMotionQuery = window.matchMedia(COMPACT_HEADER_MOTION_QUERY);
      let animation: ReturnType<typeof gsap.timeline> | null = null;
      let frame = 0;
      let lastY = Math.max(0, window.scrollY);
      let direction: "down" | "up" | null = null;
      let directionTravel = 0;
      let visible = true;
      const animatedStickyControls = new Set<HTMLElement>();
      const root = document.documentElement;
      let headerHeight = header.offsetHeight;
      const contextLockOwner = resolveHeaderContextLockOwner(
        lockVisibleWithin,
      );
      const hiddenContextOwner = resolveHeaderContextLockOwner(hiddenWithin);
      const alternateHeader = resolveHeaderContextLockOwner(
        alternateHeaderSelector,
      );
      const coordinatesNavigationOwnership = Boolean(alternateHeader);
      const mobileHeroQuery = hiddenContextOwner || header.dataset.headerInstance === "hero"
        ? window.matchMedia("(max-width: 767px), (max-width: 900px) and (max-height: 560px)")
        : null;

      const menuIsOpen = () => navigation?.hasAttribute("data-menu-open") ?? false;
      const headerHasKeyboardFocus = () => {
        const activeElement = document.activeElement;
        return activeElement instanceof HTMLElement
          && header.contains(activeElement)
          && activeElement.matches(":focus-visible");
      };
      const modalIsOpen = () => document.body.hasAttribute("data-modal-open");
      const headerIsGloballyLocked = () =>
        root.hasAttribute("data-site-header-lock-visible");
      const headerContextIsLocked = () =>
        isHeaderContextLockActive(header, lockVisibleWithin);
      const headerContextIsHidden = () => {
        if (!mobileHeroQuery?.matches || !hiddenContextOwner) {
          return isHeaderContextLockActive(header, hiddenWithin);
        }

        // Finish an active menu or keyboard interaction before handing its
        // navigation away, including when a resize brings the hero back.
        if (header.dataset.navigationOwner === "dynamic"
          && (menuIsOpen() || headerHasKeyboardFocus())) return false;

        // The mobile hero carries its own navigation. Even its last visible
        // pixel suppresses the floating header when returning from below.
        const rect = hiddenContextOwner.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const style = window.getComputedStyle(hiddenContextOwner);
        return style.display !== "none" && style.visibility !== "hidden"
          && rect.top < window.innerHeight && rect.bottom > 0;
      };
      const directionalMotionIsEnabled = () =>
        !(mobileHeroQuery?.matches && header.dataset.headerInstance === "hero")
        && (!directionalQuery || directionalQuery.matches);
      let contextLockWasActive = headerContextIsLocked();
      let contextExitDirection: "down" | "up" | null = null;
      let hiddenContextWasActive = headerContextIsHidden();
      const ownsVisibleBottom = () => {
        if (coordinatesNavigationOwnership) {
          return header.dataset.navigationOwner === "dynamic";
        }
        return header.dataset.headerInstance !== "hero"
          || header.dataset.navigationOwner !== "dynamic";
      };
      const clearStickyMotion = () => {
        for (const element of animatedStickyControls) {
          gsap.set(element, { clearProps: "transform" });
          element.style.removeProperty(STICKY_OFFSET_PROPERTY);
        }
        animatedStickyControls.clear();
      };
      const prepareStickyMotion = (reserveSpace: boolean) => {
        if (!ownsVisibleBottom()) return [];

        // FLIP the sticky offset once, then move only its transform alongside
        // the header. Capture the current rect before clearing an interrupted
        // tween so a direction reversal starts at the same visual position.
        const elements = Array.from(document.querySelectorAll<HTMLElement>(
          "[data-header-motion-sticky]",
        )).filter((element) => getComputedStyle(element).position === "sticky");
        const previousTops = elements.map((element) =>
          element.getBoundingClientRect().top,
        );
        for (const element of animatedStickyControls) {
          if (!elements.includes(element)) {
            gsap.set(element, { clearProps: "transform" });
            element.style.removeProperty(STICKY_OFFSET_PROPERTY);
            animatedStickyControls.delete(element);
          }
        }
        for (const element of elements) {
          animatedStickyControls.add(element);
          element.style.setProperty(
            STICKY_OFFSET_PROPERTY,
            `${reserveSpace ? headerHeight : 0}px`,
          );
        }
        gsap.set(elements, { y: 0 });
        const offsets = elements.map((element, index) =>
          previousTops[index] - element.getBoundingClientRect().top,
        );
        elements.forEach((element, index) => gsap.set(element, { y: offsets[index] }));
        return elements;
      };
      const publishVisibleBottom = (reserveSpace: boolean) => {
        if (!ownsVisibleBottom()) return;

        // Keep the shared layout reservation discrete. Opt-in sticky controls
        // animate a local transform instead of recalculating inherited layout
        // on every GSAP frame.
        const naturalFlowHero = mobileHeroQuery?.matches
          && header.dataset.headerInstance === "hero";
        const visibleBottom = reserveSpace && !naturalFlowHero
          ? headerHeight
          : 0;
        const value = `${visibleBottom}px`;
        if (root.style.getPropertyValue(HEADER_VISIBLE_BOTTOM_PROPERTY) !== value) {
          root.style.setProperty(HEADER_VISIBLE_BOTTOM_PROPERTY, value);
        }
      };
      const syncReservedBottom = () => {
        publishVisibleBottom(header.dataset.scrollState !== "hidden");
        if (!animation) clearStickyMotion();
      };

      const stopAnimation = () => {
        animation?.kill();
        animation = null;
        gsap.killTweensOf([header, inner, line].filter(Boolean));
      };

      const setVisibleImmediately = () => {
        stopAnimation();
        gsap.set(header, {
          autoAlpha: 1,
          pointerEvents: "auto",
          scaleY: 1,
          y: 0,
          yPercent: 0,
        });
        gsap.set(inner, { autoAlpha: 1, y: 0 });
        if (line) gsap.set(line, { autoAlpha: 0, scaleX: 0.18, xPercent: -58 });
        visible = true;
        header.dataset.scrollState = "visible";
        publishVisibleBottom(true);
        clearStickyMotion();
      };

      const setHiddenImmediately = () => {
        if (!visible && header.dataset.scrollState === "hidden") {
          publishVisibleBottom(false);
          clearStickyMotion();
          return;
        }
        stopAnimation();
        gsap.set(header, {
          autoAlpha: 0,
          pointerEvents: "none",
          scaleY: compactMotionQuery.matches ? 1 : 0.985,
          y: 0,
          yPercent: -108,
        });
        visible = false;
        header.dataset.scrollState = "hidden";
        publishVisibleBottom(false);
        clearStickyMotion();
      };

      const syncNavigationOwner = (alternateOwnsNavigation: boolean) => {
        if (!coordinatesNavigationOwnership) return;

        header.inert = alternateOwnsNavigation;
        if (alternateOwnsNavigation) {
          header.setAttribute("aria-hidden", "true");
          header.dataset.navigationOwner = "alternate";
        } else {
          header.removeAttribute("aria-hidden");
          header.dataset.navigationOwner = "dynamic";
        }

        if (!alternateHeader) return;

        alternateHeader.inert = !alternateOwnsNavigation;
        if (alternateOwnsNavigation) {
          alternateHeader.removeAttribute("aria-hidden");
          alternateHeader.dataset.navigationOwner = "hero";
        } else {
          alternateHeader.setAttribute("aria-hidden", "true");
          alternateHeader.dataset.navigationOwner = "dynamic";
        }
      };

      const reveal = (immediate = false) => {
        if (headerContextIsHidden()) {
          syncNavigationOwner(true);
          setHiddenImmediately();
          return;
        }
        if (visible && !immediate) return;
        visible = true;
        header.dataset.scrollState = "revealing";

        if (immediate || motionQuery.matches) {
          setVisibleImmediately();
          return;
        }

        stopAnimation();
        const stickyControls = prepareStickyMotion(true);
        publishVisibleBottom(true);
        gsap.set(header, { pointerEvents: "auto", visibility: "visible" });
        if (compactMotionQuery.matches) {
          gsap.set(inner, { autoAlpha: 1, y: 0 });
          if (line) gsap.set(line, { autoAlpha: 0 });
          animation = gsap.timeline({
            defaults: { overwrite: "auto" },
            onComplete: () => {
              animation = null;
              header.dataset.scrollState = "visible";
              clearStickyMotion();
            },
          });
          animation.to(header, {
            autoAlpha: 1,
            duration: COMPACT_REVEAL_SECONDS,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
            scaleY: 1,
            y: 0,
            yPercent: 0,
          });
          if (stickyControls.length) {
            animation.to(stickyControls, {
              y: 0,
              duration: COMPACT_REVEAL_SECONDS,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
            }, 0);
          }
          return;
        }
        animation = gsap.timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            animation = null;
            header.dataset.scrollState = "visible";
            clearStickyMotion();
          },
        });
        animation.to(
          header,
          {
            autoAlpha: 1,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.cinematic,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.cinematic,
            scaleY: 1,
            y: 0,
            yPercent: 0,
          },
          0,
        );
        if (stickyControls.length) {
          animation.to(stickyControls, {
            y: 0,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.cinematic,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.cinematic,
          }, 0);
        }
        animation.to(
          inner,
          {
            autoAlpha: 1,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.composed,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
            y: 0,
          },
          0.1,
        );
        if (line) {
          animation.fromTo(
            line,
            { autoAlpha: 0, scaleX: 0.18, xPercent: -58 },
            {
              autoAlpha: 0.78,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.composed,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
              scaleX: 1,
              xPercent: 0,
            },
            0.12,
          );
          animation.to(
            line,
            {
              autoAlpha: 0,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.component,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
            },
            0.48,
          );
        }
      };

      const hide = (immediate = false) => {
        if (
          !visible
          || menuIsOpen()
          || headerHasKeyboardFocus()
          || modalIsOpen()
        ) return;
        visible = false;
        header.dataset.scrollState = "hiding";

        if (immediate || motionQuery.matches) {
          setHiddenImmediately();
          return;
        }

        stopAnimation();
        const stickyControls = prepareStickyMotion(false);
        if (compactMotionQuery.matches) {
          gsap.set(inner, { autoAlpha: 1, y: 0 });
          if (line) gsap.set(line, { autoAlpha: 0 });
          animation = gsap.timeline({
            defaults: { overwrite: "auto" },
            onComplete: () => {
              animation = null;
              gsap.set(header, { pointerEvents: "none" });
              header.dataset.scrollState = "hidden";
              publishVisibleBottom(false);
              clearStickyMotion();
            },
          });
          animation.to(header, {
            autoAlpha: 0,
            duration: COMPACT_HIDE_SECONDS,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.in,
            scaleY: 1,
            y: 0,
            yPercent: -108,
          });
          if (stickyControls.length) {
            animation.to(stickyControls, {
              y: 0,
              duration: COMPACT_HIDE_SECONDS,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.in,
            }, 0);
          }
          return;
        }
        animation = gsap.timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            animation = null;
            gsap.set(header, { pointerEvents: "none" });
            header.dataset.scrollState = "hidden";
            publishVisibleBottom(false);
            clearStickyMotion();
          },
        });
        if (line) {
          animation.fromTo(
            line,
            { autoAlpha: 0, scaleX: 0.14, xPercent: 46 },
            {
              autoAlpha: 0.46,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.fast,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.in,
              scaleX: 0.72,
              xPercent: 0,
            },
            0,
          );
        }
        animation.to(
          inner,
          {
            autoAlpha: 0.28,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.fast,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.in,
            y: -9,
          },
          0.04,
        );
        animation.to(
          header,
          {
            autoAlpha: 0,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.composed,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.emphasized,
            scaleY: 0.985,
            y: 0,
            yPercent: -108,
          },
          0.1,
        );
        if (stickyControls.length) {
          animation.to(stickyControls, {
            y: 0,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.composed,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.emphasized,
          }, 0.1);
        }
      };

      const evaluateScroll = () => {
        frame = 0;
        const maxScrollY = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        const nextY = Math.min(maxScrollY, Math.max(0, window.scrollY));
        const delta = nextY - lastY;
        const contextHidden = headerContextIsHidden();
        const contextLocked = headerContextIsLocked();

        if (!directionalMotionIsEnabled()) {
          direction = null;
          directionTravel = 0;
          lastY = nextY;
          if (!visible) setVisibleImmediately();
          return;
        }

        if (contextHidden) {
          direction = null;
          directionTravel = 0;
          lastY = nextY;
          if (!hiddenContextWasActive) {
            hiddenContextWasActive = true;
            syncNavigationOwner(true);
            setHiddenImmediately();
          }
          return;
        }

        if (hiddenContextWasActive) {
          hiddenContextWasActive = false;
          direction = null;
          directionTravel = 0;
          lastY = nextY;
          syncNavigationOwner(false);
          if (nextY <= TOP_LOCK_PX) reveal(true);
          else setHiddenImmediately();
          return;
        }

        if (contextLocked && Math.abs(delta) >= 1) {
          contextExitDirection = delta > 0 ? "down" : "up";
        }

        if (
          nextY <= TOP_LOCK_PX ||
          menuIsOpen() ||
          headerHasKeyboardFocus() ||
          modalIsOpen() ||
          headerIsGloballyLocked() ||
          contextLocked
        ) {
          if (contextLocked) contextLockWasActive = true;
          direction = null;
          directionTravel = 0;
          lastY = nextY;
          reveal(nextY <= TOP_LOCK_PX);
          return;
        }

        if (contextLockWasActive) {
          const exitDirection = contextExitDirection
            ?? (Math.abs(delta) >= 1 ? (delta > 0 ? "down" : "up") : null);
          contextLockWasActive = false;
          contextExitDirection = null;
          direction = null;
          directionTravel = 0;
          lastY = nextY;

          if (exitDirection === "down" && nextY > HIDE_START_PX) hide(true);
          else if (exitDirection === "up") reveal();
          return;
        }

        if (Math.abs(delta) < 1) return;

        const nextDirection = delta > 0 ? "down" : "up";
        if (direction !== nextDirection) {
          direction = nextDirection;
          directionTravel = 0;
        }
        directionTravel += Math.abs(delta);
        lastY = nextY;

        if (
          nextDirection === "down" &&
          nextY > HIDE_START_PX &&
          directionTravel >= HIDE_TRAVEL_PX
        ) {
          hide();
          directionTravel = 0;
        } else if (nextDirection === "up" && directionTravel >= REVEAL_TRAVEL_PX) {
          reveal();
          directionTravel = 0;
        }
      };

      const onScroll = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(evaluateScroll);
      };
      const onResize = () => {
        headerHeight = header.offsetHeight;
        if (animation) {
          if (visible) setVisibleImmediately();
          else setHiddenImmediately();
        } else {
          syncReservedBottom();
        }
        onScroll();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Tab") reveal();
      };
      const onFocusIn = () => reveal(true);
      const onMenuChange = () => {
        if (menuIsOpen()) reveal(true);
        else onScroll();
      };
      const onModalChange = () => {
        if (modalIsOpen()) reveal(true);
      };
      const onRootChange = () => {
        if (headerIsGloballyLocked()) reveal(true);
      };
      const onHeaderContextChange = () => {
        const nextY = Math.max(0, window.scrollY);
        const contextDelta = nextY - lastY;
        direction = null;
        directionTravel = 0;
        lastY = nextY;

        if (headerContextIsLocked()) {
          contextLockWasActive = true;
          reveal(true);
          return;
        }

        if (!contextLockWasActive) return;

        contextLockWasActive = false;
        const exitDirection = contextExitDirection
          ?? (Math.abs(contextDelta) >= 1
            ? (contextDelta > 0 ? "down" : "up")
            : null);
        contextExitDirection = null;

        if (headerIsGloballyLocked()) {
          reveal(true);
        } else if (
          exitDirection === "down"
          && window.scrollY > HIDE_START_PX
        ) {
          hide(true);
        } else if (exitDirection === "up") {
          reveal();
        }
      };
      const onHiddenContextChange = () => {
        const nextY = Math.max(0, window.scrollY);
        const contextHidden = headerContextIsHidden();
        direction = null;
        directionTravel = 0;
        lastY = nextY;

        if (contextHidden) {
          if (hiddenContextWasActive) return;
          hiddenContextWasActive = true;
          syncNavigationOwner(true);
          setHiddenImmediately();
          return;
        }

        if (!hiddenContextWasActive) return;

        hiddenContextWasActive = false;
        syncNavigationOwner(false);
        if (nextY <= TOP_LOCK_PX) reveal(true);
        else setHiddenImmediately();
      };
      const onDirectionalQueryChange = () => {
        direction = null;
        directionTravel = 0;
        lastY = Math.max(0, window.scrollY);
        if (!directionalMotionIsEnabled()) setVisibleImmediately();
      };
      const onMobileHeroQueryChange = () => {
        direction = null;
        directionTravel = 0;
        syncReservedBottom();
        onScroll();
      };
      const onMotionChange = () => {
        if (headerContextIsHidden()) {
          syncNavigationOwner(true);
          setHiddenImmediately();
        } else {
          syncNavigationOwner(false);
          setVisibleImmediately();
        }
      };
      const observer = navigation
        ? new MutationObserver(onMenuChange)
        : null;
      const modalObserver = new MutationObserver(onModalChange);
      const rootObserver = new MutationObserver(onRootChange);
      const contextLockObserver = contextLockOwner
        ? new MutationObserver(onHeaderContextChange)
        : null;
      const hiddenContextObserver = hiddenContextOwner
        ? new MutationObserver(onHiddenContextChange)
        : null;
      const ownershipObserver = new MutationObserver(syncReservedBottom);
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries.find((candidate) => candidate.target === header);
        if (entry) {
          headerHeight = entry.borderBoxSize[0]?.blockSize ?? header.offsetHeight;
        }
        syncReservedBottom();
      });

      if (hiddenContextWasActive) {
        syncNavigationOwner(true);
        setHiddenImmediately();
      } else {
        syncNavigationOwner(false);
        setVisibleImmediately();
      }
      controller.dataset.state = "ready";
      resizeObserver.observe(header);
      ownershipObserver.observe(header, {
        attributeFilter: ["data-navigation-owner"],
        attributes: true,
      });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      document.addEventListener("keydown", onKeyDown);
      header.addEventListener("focusin", onFocusIn);
      header.addEventListener("focusout", onScroll);
      motionQuery.addEventListener("change", onMotionChange);
      directionalQuery?.addEventListener("change", onDirectionalQueryChange);
      mobileHeroQuery?.addEventListener("change", onMobileHeroQueryChange);
      modalObserver.observe(document.body, {
        attributeFilter: ["data-modal-open"],
        attributes: true,
      });
      rootObserver.observe(root, {
        attributeFilter: ["data-site-header-lock-visible"],
        attributes: true,
      });
      contextLockObserver?.observe(contextLockOwner!, {
        attributeFilter: ["class", "hidden", "style"],
        attributes: true,
      });
      hiddenContextObserver?.observe(hiddenContextOwner!, {
        attributeFilter: ["class", "hidden", "style"],
        attributes: true,
      });
      if (navigation && observer) {
        observer.observe(navigation, {
          attributeFilter: ["data-menu-open"],
          attributes: true,
        });
      }
      window.addEventListener(
        "site-visual-layout-change",
        onHeaderContextChange,
      );

      cleanup = () => {
        if (frame) window.cancelAnimationFrame(frame);
        observer?.disconnect();
        modalObserver.disconnect();
        rootObserver.disconnect();
        contextLockObserver?.disconnect();
        hiddenContextObserver?.disconnect();
        ownershipObserver.disconnect();
        resizeObserver.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("keydown", onKeyDown);
        header.removeEventListener("focusin", onFocusIn);
        header.removeEventListener("focusout", onScroll);
        motionQuery.removeEventListener("change", onMotionChange);
        directionalQuery?.removeEventListener(
          "change",
          onDirectionalQueryChange,
        );
        mobileHeroQuery?.removeEventListener("change", onMobileHeroQueryChange);
        window.removeEventListener(
          "site-visual-layout-change",
          onHeaderContextChange,
        );
        stopAnimation();
        clearStickyMotion();
        gsap.set([header, inner, line].filter(Boolean), {
          clearProps: "opacity,visibility,transform,pointerEvents,willChange",
        });
        if (ownsVisibleBottom()) {
          root.style.removeProperty(HEADER_VISIBLE_BOTTOM_PROPERTY);
        }
        if (coordinatesNavigationOwnership && alternateHeader) {
          header.inert = false;
          header.removeAttribute("aria-hidden");
          delete header.dataset.navigationOwner;
          alternateHeader.inert = false;
          alternateHeader.removeAttribute("aria-hidden");
          delete alternateHeader.dataset.navigationOwner;
        }
        delete header.dataset.scrollState;
      };
    };

    void init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [alternateHeaderSelector, compactOnly, hiddenWithin, lockVisibleWithin]);

  return (
    <span
      aria-hidden="true"
      data-header-scroll-controller
      data-hidden-within={hiddenWithin}
      data-lock-visible-within={lockVisibleWithin}
      ref={controllerRef}
    />
  );
}
