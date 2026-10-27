"use client";

import { ArrowLeft, Info, Play, Send } from "lucide-react";
import { createPortal } from "react-dom";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import Link from "@/app/ui/primitives/Link";
import s from "../../homepage.module.css";

type ProcessVideoExperienceProps = {
  cta: {
    href: string;
    label: string;
    source: string;
    situation?: string;
  };
  desktopPoster: string;
  desktopSrc: string;
  mobilePoster: string;
  mobileSrc: string;
};

type GsapModule = typeof import("gsap");
type GsapStatic = typeof import("gsap").gsap;
type GsapTimeline = ReturnType<GsapStatic["timeline"]>;

const PANEL_ID = "process-video-panel";
const PANEL_TITLE_ID = "process-video-title";

export default function ProcessVideoExperience({
  cta,
  desktopPoster,
  desktopSrc,
  mobilePoster,
  mobileSrc,
}: ProcessVideoExperienceProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<GsapTimeline | null>(null);
  const gsapRef = useRef<GsapStatic | null>(null);
  const isOpenRef = useRef(false);
  const isClosingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sessionIsMobile, setSessionIsMobile] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const setTriggerNode = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (node) setPortalTarget(document.body);
  }, []);

  const getSection = useCallback(() => triggerRef.current?.closest<HTMLElement>(
    '[data-home-module="process"]',
  ) ?? null, []);

  const clearAnimationStyles = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const gsap = gsapRef.current;
    if (gsap) {
      gsap.set(shell, {
        clearProps: "opacity,transform,visibility,willChange",
      });
      return;
    }

    shell.style.removeProperty("opacity");
    shell.style.removeProperty("transform");
    shell.style.removeProperty("visibility");
    shell.style.removeProperty("will-change");
  }, []);

  const resetVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  const finishClose = useCallback(() => {
    const dialog = dialogRef.current;
    const section = getSection();

    resetVideo();
    timelineRef.current?.kill();
    timelineRef.current = null;
    if (dialog?.open) dialog.close();

    isOpenRef.current = false;
    isClosingRef.current = false;
    setIsOpen(false);
    section?.setAttribute("data-process-video-state", "closed");
    clearAnimationStyles();

    window.requestAnimationFrame(() => {
      triggerRef.current?.focus({ preventScroll: true });
    });
  }, [clearAnimationStyles, getSection, resetVideo]);

  const closeVideo = useCallback(() => {
    if (!isOpenRef.current || isClosingRef.current) return;
    isClosingRef.current = true;
    resetVideo();

    const reducedMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    ).matches;
    const forcedColors = window.matchMedia("(forced-colors: active)").matches;
    const timeline = timelineRef.current;

    if (reducedMotion || forcedColors || !timeline) {
      finishClose();
      return;
    }

    timeline.eventCallback("onReverseComplete", finishClose);
    timeline.reverse();
  }, [finishClose, resetVideo]);

  const openVideo = useCallback(async () => {
    const dialog = dialogRef.current;
    const shell = shellRef.current;
    const section = getSection();
    if (isOpenRef.current || !dialog || !shell || !section) return;

    const reducedMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    ).matches;
    const forcedColors = window.matchMedia("(forced-colors: active)").matches;

    isOpenRef.current = true;
    isClosingRef.current = false;
    setSessionIsMobile(isMobile);
    setIsOpen(true);
    section.setAttribute("data-process-video-state", "open");
    if (!dialog.open) dialog.showModal();

    try {
      const gsapModule = await import("gsap") as GsapModule & {
        default?: GsapStatic;
      };
      if (!isOpenRef.current) return;

      const gsap = gsapModule.gsap ?? gsapModule.default;
      if (!gsap) throw new Error("GSAP is unavailable");
      gsapRef.current = gsap;
      timelineRef.current?.kill();

      if (reducedMotion || forcedColors) {
        gsap.set(shell, { autoAlpha: 1, y: 0 });
        closeRef.current?.focus({ preventScroll: true });
        return;
      }

      timelineRef.current = gsap.timeline({
        onComplete: () => {
          closeRef.current?.focus({ preventScroll: true });
        },
      }).fromTo(shell, {
        autoAlpha: 0,
        y: 14,
      }, {
        autoAlpha: 1,
        duration: 0.42,
        ease: "power2.out",
        willChange: "transform, opacity",
        y: 0,
      });
    } catch {
      shell.style.opacity = "1";
      shell.style.transform = "none";
      shell.style.visibility = "visible";
      closeRef.current?.focus({ preventScroll: true });
    }
  }, [getSection, isMobile]);

  useEffect(() => {
    const media = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.mediaTabletAndBelow,
    );
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = getSection();
    if (!section) return;
    const dialog = dialogRef.current;
    section.setAttribute("data-process-video-state", "closed");

    return () => {
      resetVideo();
      timelineRef.current?.kill();
      if (dialog?.open) dialog.close();
      section.removeAttribute("data-process-video-state");
      clearAnimationStyles();
    };
  }, [clearAnimationStyles, getSection, portalTarget, resetVideo]);

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyModalOpen = body.getAttribute("data-modal-open");
    const previousHtmlModal = root.dataset.modal;

    body.style.overflow = "hidden";
    body.setAttribute("data-modal-open", "1");
    root.dataset.modal = "1";

    return () => {
      body.style.overflow = previousBodyOverflow;
      if (previousBodyModalOpen === null) {
        body.removeAttribute("data-modal-open");
      } else {
        body.setAttribute("data-modal-open", previousBodyModalOpen);
      }
      if (previousHtmlModal === undefined) {
        delete root.dataset.modal;
      } else {
        root.dataset.modal = previousHtmlModal;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const video = videoRef.current;
    if (!video) return;

    video.load();
    const playPromise = video.play();
    playPromise?.catch(() => {
      // Native controls and the poster remain available if playback is blocked.
    });
  }, [isOpen, sessionIsMobile]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      closeRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  const keepFocusInsideDialog = useCallback((
    event: ReactKeyboardEvent<HTMLDialogElement>,
  ) => {
    if (event.key !== "Tab") return;

    const dialog = event.currentTarget;
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>([
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "video[controls]",
        '[tabindex]:not([tabindex="-1"])',
      ].join(",")),
    ].filter((element) => (
      element.getAttribute("aria-hidden") !== "true"
      && element.getClientRects().length > 0
    ));

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  const activeIsMobile = isOpen ? sessionIsMobile : isMobile;
  const activePoster = activeIsMobile ? mobilePoster : desktopPoster;
  const activeSrc = activeIsMobile ? mobileSrc : desktopSrc;

  const panel = (
    <dialog
      aria-labelledby={PANEL_TITLE_ID}
      aria-modal="true"
      className={s.processVideoStage}
      data-open={isOpen ? "true" : "false"}
      data-process-video-stage
      id={PANEL_ID}
      onCancel={(event) => {
        event.preventDefault();
        closeVideo();
      }}
      onKeyDown={keepFocusInsideDialog}
      ref={dialogRef}
    >
      <div className={s.processVideoShell} ref={shellRef}>
        <h3 className={s.processVideoAccessibleTitle} id={PANEL_TITLE_ID}>
          Jak probíhá spolupráce
        </h3>

        <div className={s.processVideoFrame} data-process-video-frame>
          <video
            aria-describedby="process-video-summary"
            aria-label="Video: Ukážu vám, jak probíhá naše spolupráce"
            className={s.processVideoPlayer}
            controls
            controlsList="nodownload"
            playsInline
            poster={activePoster}
            preload="none"
            ref={videoRef}
            src={activeSrc}
          >
            Váš prohlížeč nepodporuje HTML5 video.
          </video>
        </div>
        <div className={s.processVideoFooter} data-process-video-footer>
          <p className={s.processVideoSummary} id="process-video-summary">
            <Info aria-hidden="true" />
            <span>
              <strong>Upozornění:</strong> Video má pouze obecný informační
              charakter. Nepředstavuje individuální finanční, investiční, právní
              ani daňové poradenství ani doporučení ke konkrétnímu obchodu.
            </span>
          </p>
          <div className={s.processVideoActions} data-process-video-actions>
            <button
              className={s.processVideoClose}
              data-process-video-close
              onClick={closeVideo}
              ref={closeRef}
              type="button"
            >
              <ArrowLeft aria-hidden="true" />
              <span>Zpět k postupu</span>
            </button>
            <Link
              className={s.processVideoCta}
              data-analytics-destination={cta.href}
              data-analytics-event="home_situation_select"
              data-analytics-source={cta.source}
              data-cta-composition="docked"
              data-cursor="action"
              data-cursor-icon="send"
              data-cursor-label="ZÍSKAT PŘEHLED • ZAČÍT PRVNÍM KROKEM •"
              data-cursor-magnetic="true"
              data-process-video-cta
              data-situation-id={cta.situation}
              href={cta.href}
              variant="primary-action"
            >
              <span>{cta.label}</span>
              <span aria-hidden="true" data-cta-icon-shell>
                <span data-cta-icon-motion>
                  <Send aria-hidden="true" data-cta-icon="paper-plane" />
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </dialog>
  );

  return (
    <>
      <button
        aria-controls={PANEL_ID}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Podívat se, jak spolupráce probíhá, video, přibližně 1 minuta"
        className={s.processVideoTrigger}
        data-cursor="video"
        data-cursor-icon="play"
        data-cursor-label="PŘEHRÁT • JAK PROBÍHÁ SPOLUPRÁCE •"
        data-process-video-trigger
        onClick={() => void openVideo()}
        ref={setTriggerNode}
        type="button"
      >
        <span
          aria-hidden="true"
          className={s.processVideoTriggerIcon}
          data-process-video-trigger-icon
        >
          <Play />
        </span>
        <span>
          <strong>Podívat se, jak spolupráce probíhá</strong>
          <small>Video · 1 minuta</small>
        </span>
      </button>
      {portalTarget ? createPortal(panel, portalTarget) : null}
    </>
  );
}
