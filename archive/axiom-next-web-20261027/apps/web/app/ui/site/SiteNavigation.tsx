"use client";

import clsx from "clsx";
import gsap from "gsap";
import { ArrowUpRight, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import LogoMark from "@/app/svgr/LogoMark";
import {
  DESIGN_PRIMITIVE_GSAP_EASES,
  DESIGN_PRIMITIVE_MEDIA_QUERIES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
  DESIGN_PRIMITIVE_STAGGER_SECONDS,
} from "@/app/theme/design-primitives";
import Link from "../primitives/Link";
import { setSiteHeaderVisibilityLock } from "./siteHeaderVisibilityLock.client";
import s from "./site.module.css";
import type { NavigationItemData } from "./types";

export type SiteNavigationProps = {
  items: readonly NavigationItemData[];
  currentPath: string;
  panelId?: string;
  action?: ReactNode;
  drawerAction?: ReactNode;
  ariaLabel?: string;
  menuLabel?: string;
  closeLabel?: string;
  className?: string;
};

const normalizePath = (path: string) => {
  if (path === "/") return path;
  return path.replace(/\/$/, "");
};

const isCurrentItem = (item: NavigationItemData, currentPath: string) => {
  const itemPath = normalizePath(item.href);
  const activePath = normalizePath(currentPath);

  if (item.exact || itemPath === "/") return itemPath === activePath;
  return activePath === itemPath || activePath.startsWith(`${itemPath}/`);
};

export default function SiteNavigation({
  action,
  ariaLabel = "Hlavní navigace",
  className,
  closeLabel = "Zavřít menu",
  currentPath,
  drawerAction,
  items,
  menuLabel = "Otevřít menu",
  panelId,
}: SiteNavigationProps) {
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const generatedPanelId = useId();
  const resolvedPanelId = panelId ?? generatedPanelId;
  const panelTitleId = `${resolvedPanelId}-title`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const prepareTimelineRef = useRef<(() => void) | null>(null);
  const utilityRestoreTimerRef = useRef<number | null>(null);
  const triggerFocusFrameRef = useRef<number | null>(null);
  const openRef = useRef(false);
  const open = openForPath === currentPath;
  const resolvedAction = isMobile ? drawerAction ?? action : action;

  const closeAndRestoreTriggerFocus = useCallback(() => {
    setOpenForPath(null);

    if (triggerFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(triggerFocusFrameRef.current);
    }
    triggerFocusFrameRef.current = window.requestAnimationFrame(() => {
      triggerFocusFrameRef.current = null;
      triggerRef.current?.focus();
    });
  }, []);

  useLayoutEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const syncMobile = () => setIsMobile(mobileQuery.matches);

    syncMobile();
    mobileQuery.addEventListener("change", syncMobile);
    return () => mobileQuery.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => () => {
    if (utilityRestoreTimerRef.current !== null) {
      window.clearTimeout(utilityRestoreTimerRef.current);
    }
    if (triggerFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(triggerFocusFrameRef.current);
    }
    document.body.removeAttribute("data-navigation-drawer-open");
  }, []);

  useLayoutEffect(() => {
    if (!isMobile) return undefined;

    let context: ReturnType<typeof gsap.context> | null = null;
    // Closed drawers already have their resting state in CSS. Construct the
    // animation on first use, then retain it for interrupted/reversed openings.
    prepareTimelineRef.current = () => {
      if (timelineRef.current) return;

      const panel = panelRef.current;
      const scrim = scrimRef.current;
      const trigger = triggerRef.current;
      if (!panel || !scrim || !trigger) return undefined;

      context = gsap.context(() => {
        const intro = panel.querySelector<HTMLElement>("[data-navigation-drawer-intro]");
        const links = Array.from(
          panel.querySelectorAll<HTMLElement>("[data-navigation-drawer-link]"),
        );
        const footer = panel.querySelector<HTMLElement>("[data-navigation-drawer-footer]");
        const panelAction = panel.querySelector<HTMLElement>("[data-navigation-drawer-action]");
        const triggerLines = Array.from(
          trigger.querySelectorAll<HTMLElement>("[data-menu-trigger-line]"),
        );

        const timeline = gsap.timeline({
          paused: true,
          defaults: {
            overwrite: "auto",
          },
        });

        timeline.addLabel("drawer-open", 0);
        gsap.set(panel, { autoAlpha: 1, x: 0, xPercent: 0 });
        timeline.fromTo(
          scrim,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.component,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
          },
          "drawer-open",
        );
        timeline.fromTo(
          panel,
          { autoAlpha: 1, xPercent: 100 },
          {
            autoAlpha: 1,
            duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.component,
            ease: DESIGN_PRIMITIVE_GSAP_EASES.cinematic,
            xPercent: 0,
          },
          "drawer-open",
        );
        if (intro) {
          timeline.fromTo(
            intro,
            { autoAlpha: 0, x: 12 },
            {
              autoAlpha: 1,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.micro,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
              x: 0,
            },
            "drawer-open+=0.04",
          );
        }
        if (links.length > 0) {
          timeline.fromTo(
            links,
            { autoAlpha: 0, x: 14 },
            {
              autoAlpha: 1,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.instant,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
              stagger: DESIGN_PRIMITIVE_STAGGER_SECONDS.tight,
              x: 0,
            },
            "drawer-open+=0.02",
          );
        }
        if (panelAction) {
          timeline.fromTo(
            panelAction,
            { autoAlpha: 0, y: 8 },
            {
              autoAlpha: 1,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.micro,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
              y: 0,
            },
            "drawer-open+=0.08",
          );
        }
        if (footer) {
          timeline.fromTo(
            footer,
            { autoAlpha: 0, y: 8 },
            {
              autoAlpha: 1,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.micro,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
              y: 0,
            },
            "drawer-open+=0.08",
          );
        }
        if (triggerLines.length === 3) {
          timeline.to(
            triggerLines[0],
            {
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.control,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
              rotation: 45,
              y: 5.5,
            },
            "drawer-open",
          );
          timeline.to(
            triggerLines[1],
            {
              autoAlpha: 0,
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.control,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
              scaleX: 0.5,
            },
            "drawer-open",
          );
          timeline.to(
            triggerLines[2],
            {
              duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.control,
              ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
              rotation: -45,
              y: -5.5,
            },
            "drawer-open",
          );
        }

        timeline.progress(0).pause();
        timelineRef.current = timeline;
      }, panel);
    };

    return () => {
      prepareTimelineRef.current = null;
      timelineRef.current = null;
      context?.revert();
    };
  }, [isMobile]);

  useLayoutEffect(() => {
    if (open) prepareTimelineRef.current?.();
    const timeline = timelineRef.current;
    if (!timeline) return;

    if (window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion).matches) {
      timeline.progress(open ? 1 : 0).pause();
      return;
    }

    if (open) timeline.timeScale(1).play();
    else timeline.timeScale(1.25).reverse();
  }, [isMobile, open]);

  useEffect(() => {
    if (!open) return;

    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const motionQuery = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    const previousOverflow = document.body.style.overflow;
    const backgroundRegions = Array.from(
      document.querySelectorAll<HTMLElement>("main, [data-component='site-footer']"),
    ).filter((region) => !panelRef.current?.contains(region));
    const previousInertStates = backgroundRegions.map((region) => region.inert);

    const syncScrollLock = () => {
      if (!mobileQuery.matches) {
        setOpenForPath(null);
        return;
      }
      document.body.style.overflow = "hidden";
    };

    const syncMotion = () => {
      timelineRef.current?.progress(openRef.current ? 1 : 0).pause();
    };

    syncScrollLock();
    if (utilityRestoreTimerRef.current !== null) {
      window.clearTimeout(utilityRestoreTimerRef.current);
      utilityRestoreTimerRef.current = null;
    }
    mobileQuery.addEventListener("change", syncScrollLock);
    motionQuery.addEventListener("change", syncMotion);
    setSiteHeaderVisibilityLock("site-navigation", true);
    document.body.setAttribute("data-navigation-drawer-open", "true");
    backgroundRegions.forEach((region) => {
      region.inert = true;
    });

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAndRestoreTriggerFocus();
        return;
      }

      if (event.key !== "Tab" || !mobileQuery.matches) return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;

      // The links reveal after the close control. Keep focus inside the drawer
      // while they are still hidden by the entrance animation.
      if (first === last) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      mobileQuery.removeEventListener("change", syncScrollLock);
      motionQuery.removeEventListener("change", syncMotion);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const restoreDelay = motionQuery.matches
        ? 0
        : (timelineRef.current?.duration()
            ?? DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.cinematic) * 1_000;
      utilityRestoreTimerRef.current = window.setTimeout(() => {
        utilityRestoreTimerRef.current = null;
        if (!openRef.current) {
          document.body.removeAttribute("data-navigation-drawer-open");
        }
      }, restoreDelay);
      setSiteHeaderVisibilityLock("site-navigation", false);
      backgroundRegions.forEach((region, index) => {
        region.inert = previousInertStates[index] ?? false;
      });
    };
  }, [closeAndRestoreTriggerFocus, open]);

  // Off-canvas links fall within Next's prefetch margin even while the mobile
  // drawer is closed. Warm them on opening; desktop keeps automatic prefetch.
  const prefetchNavigation = isMobile === false || open ? null : false;
  const navigationPanel = (
    <div
      aria-hidden={isMobile ? !open : undefined}
      aria-labelledby={isMobile ? panelTitleId : undefined}
      aria-modal={isMobile ? true : undefined}
      className={s.navigationPanel}
      data-open={open || undefined}
      data-navigation-drawer
      id={resolvedPanelId}
      inert={isMobile && !open ? true : undefined}
      ref={panelRef}
      role={isMobile ? "dialog" : undefined}
    >
      <div className={s.navigationDrawerChrome}>
        <span className={s.navigationDrawerBrand}>
          <LogoMark aria-hidden="true" focusable="false" style={{ width: "32px" }} />
          <span>David Pokorný</span>
        </span>
        <button
          aria-label={closeLabel}
          className={s.navigationDrawerClose}
          onClick={closeAndRestoreTriggerFocus}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className={s.navigationDrawerIntro} data-navigation-drawer-intro>
        <p>Finanční poradenství</p>
        <h2 id={panelTitleId}>Kam chcete pokračovat?</h2>
      </div>
      <ul>
        {items.map((item) => {
          const current = isCurrentItem(item, currentPath);

          return (
            <li key={item.href}>
              <Link
                aria-current={current ? "page" : undefined}
                data-cursor-no-magnetic
                data-navigation-drawer-link
                href={item.href}
                prefetch={prefetchNavigation}
                onClick={() => setOpenForPath(null)}
                variant="text"
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className={s.navigationDrawerLinkIcon}
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {resolvedAction ? (
        <div className={s.navigationAction} data-navigation-drawer-action>
          {resolvedAction}
        </div>
      ) : null}
      <div className={s.navigationDrawerFooter} data-navigation-drawer-footer>
        <span>Klidně. Srozumitelně. V souvislostech.</span>
      </div>
    </div>
  );

  const mobileDrawer = isMobile
    ? createPortal(
        <>
          <div
            aria-hidden="true"
            className={s.navigationScrim}
            data-open={open || undefined}
            data-navigation-scrim
            onClick={closeAndRestoreTriggerFocus}
            ref={scrimRef}
          />
          {navigationPanel}
        </>,
        document.body,
      )
    : null;

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className={clsx(s.navigation, className)}
        data-component="site-navigation"
        data-menu-open={open || undefined}
      >
        <button
          aria-controls={resolvedPanelId}
          aria-expanded={open}
          aria-label={open ? closeLabel : menuLabel}
          className={s.menuTrigger}
          onClick={() => {
            setOpenForPath((activePath) => activePath === currentPath ? null : currentPath);
          }}
          ref={triggerRef}
          type="button"
        >
          <span aria-hidden="true" className={s.menuTriggerGlyph}>
            <span data-menu-trigger-line />
            <span data-menu-trigger-line />
            <span data-menu-trigger-line />
          </span>
        </button>
        {isMobile ? null : navigationPanel}
      </nav>
      {mobileDrawer}
    </>
  );
}
