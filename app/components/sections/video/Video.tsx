"use client";

import s from "./video.module.css";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import { Play } from "lucide-react";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

const VIDEO_SRC = "/video_h264.mp4";
const VIDEO_POSTER = "/nahled-video.png"; // nahraď reálným posterem

const Video = () => {
  const { openLeadForm } = useLeadFormModal();
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openVideo = () => setIsOpen(true);
  const closeVideo = () => {
    setIsFullscreen(false);
    setIsOpen(false);
  };

  const videoStyle: CSSProperties & { "--video-poster": string } = {
    "--video-poster": `url(${VIDEO_POSTER})`,
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
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleFullscreenToggle = () => {
    const node = videoRef.current;
    if (!node) return;
    if (!document.fullscreenElement) {
      node.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <section className={s.videoSection}>
      <Container className={s.inner}>
        <div className={s.headingBlock}>
          <p className={s.eyebrow}>Krátké video</p>
          <h3 className={s.heading}>Jak vypadá spolupráce v 60 sekundách</h3>
        </div>

        <div
          className={s.videoCard}
          style={videoStyle}
        >
          <button
            type="button"
            className={s.playButton}
            onClick={openVideo}
            aria-label="Přehrát video"
          >
            <div className={s.playCircle}>
              <Play />
            </div>
          </button>
        </div>

        <div className={s.ctaRow}>
          <Button
            variant="cta"
            className={s.cta}
            onClick={() => openLeadForm()}
          >
            Sjednat konzultaci
          </Button>
        </div>
      </Container>


      {isOpen ? (
        <div className={s.videoModal} role="dialog" aria-modal="true">
          <div className={s.overlayInner}>
            <button
              type="button"
              className={s.overlayClose}
              aria-label="Zavřít video"
              onClick={closeVideo}
            >
              ×
            </button>
            <button
              type="button"
              className={s.overlayFullscreen}
              aria-label={isFullscreen ? "Opustit celou obrazovku" : "Celá obrazovka"}
              onClick={handleFullscreenToggle}
            >
              ⤢
            </button>
            <video
              ref={videoRef}
              className={s.overlayVideo}
              controls
              poster={VIDEO_POSTER}
              preload="metadata"
              playsInline
              controlsList="nodownload"
            >
              <source src={VIDEO_SRC} type="video/mp4" />
              Váš prohlížeč nepodporuje HTML5 video.
            </video>
          </div>
          <div className={s.overlayBackdrop} onClick={closeVideo} />
        </div>
      ) : null}
    </section>
  );
};

export default Video;
