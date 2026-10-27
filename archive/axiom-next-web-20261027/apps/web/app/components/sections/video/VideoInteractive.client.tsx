"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import s from "./video.module.css";

type VideoInteractiveProps = {
  desktopSrc: string;
  desktopPoster: string;
  mobileSrc: string;
  mobilePoster: string;
};

const VideoInteractive = ({
  desktopSrc,
  desktopPoster,
  mobileSrc,
  mobilePoster,
}: VideoInteractiveProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const openVideo = () => setIsOpen(true);
  const closeVideo = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Reload source when switching between mobile/desktop assets.
    const node = videoRef.current;
    if (node) {
      node.load();
    }
  }, [isMobile]);

  const videoSrc = isMobile ? mobileSrc : desktopSrc;
  const videoPoster = isMobile ? mobilePoster : desktopPoster;

  const videoStyle: CSSProperties & { "--video-poster": string } = {
    "--video-poster": `url(${videoPoster})`,
  };

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;

    if (isOpen) {
      node.pause();
      node.currentTime = 0;
      node.load();
      const playPromise = node.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Swallow autoplay errors (e.g., when not initiated by user gesture).
        });
      }
    } else {
      node.pause();
      node.currentTime = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeVideo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
      <div className={s.videoFrame} data-video-frame>
        <div
          className={s.videoCard}
          style={videoStyle}
          onClick={isOpen ? undefined : openVideo}
          data-video-card
        >
          <div className={s.cornerBadge}>
            <p className={s.videoNote} data-video-note>
              Nejde o investiční doporučení. Konkrétní doporučení až po
              poznání vaší situace.
            </p>
          </div>

          {!isOpen ? (
            <div className={s.playbuttoncont} data-video-play>
              <span className={`${s.outerCircle} ${s.scaleAnim}`} aria-hidden />
              <span
                className={`${s.outerCircle} ${s.scaleAnim} ${s.delayShort}`}
                aria-hidden
              />
              <button
                type="button"
                className={s.playButton}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openVideo();
                }}
                aria-label="Přehrát video o průběhu spolupráce"
              >
                <span className={s.icon} aria-hidden>
                  <svg viewBox="0 0 30 30" width="100%" height="100%">
                    <polygon className={s.triangle} points="5,0 30,15 5,30" />
                    <path className={s.path} d="M5,0 L30,15 L5,30z" />
                  </svg>
                </span>
              </button>
            </div>
          ) : null}

          {isOpen ? (
            <div className={s.inlinePlayer}>
              <button
                type="button"
                className={s.inlineClose}
                aria-label="Zavřít video"
                onClick={closeVideo}
              >
                ×
              </button>
              {/* <button
                type="button"
                className={s.inlineFullscreen}
                aria-label={
                  isFullscreen ? "Opustit celou obrazovku" : "Celá obrazovka"
                }
                onClick={handleFullscreenToggle}
              >
                ⤢
              </button> */}
              <video
                ref={videoRef}
                className={s.inlineVideo}
                controls
                poster={videoPoster}
                preload="metadata"
                playsInline
                controlsList="nodownload"
                title="Video: Ukážu vám, jak probíhá naše spolupráce"
                aria-label="Video: Ukážu vám, jak probíhá naše spolupráce"
              >
                <source src={videoSrc} type="video/mp4" />
                Váš prohlížeč nepodporuje HTML5 video.
              </video>
            </div>
          ) : null}
        </div>
      </div>
  
  );
};

export default VideoInteractive;
