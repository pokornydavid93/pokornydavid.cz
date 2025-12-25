"use client";

import s from "./video.module.css";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import { Play } from "lucide-react";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { Ripple } from "@/components/ui/ripple";
import { Reveal } from "@/app/ui/animations/Reveal";

const VIDEO_SRC = "/video_h264.mp4";
const VIDEO_POSTER = "/nahled-video.webp";
const MOBILE_VIDEO_SRC = "/video-mobil_h264_720p.mp4";
const MOBILE_POSTER = "/nahled-mobil.webp";

const Video = () => {
  const { openLeadForm } = useLeadFormModal();
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const openVideo = () => setIsOpen(true);
  const closeVideo = () => {
    setIsFullscreen(false);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;

    // lock body scroll
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      // unlock body scroll
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";

      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

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

  const videoSrc = isMobile ? MOBILE_VIDEO_SRC : VIDEO_SRC;
  const videoPoster = isMobile ? MOBILE_POSTER : VIDEO_POSTER;

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
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
      <Container className={`${s.inner}`}>
        <div className={s.layout}>
          <div className={s.copyCol}>
            <Reveal from="left">
              <div className={`${s.headingBlock}`}>
                <p className={s.eyebrow}>O SPOLUPRÁCI</p>
                <h3 className={s.gradientSoft}>
                  Jak spolupráce probíhá v praxi
                </h3>
              </div>
            </Reveal>

            <Reveal from="left">
              <p className={`${s.lede}`}>
                Od prvního kontaktu až po
                konkrétní výstup.
              </p>
            </Reveal>
          </div>

          <Reveal from="top">
            <div onClick={openVideo} className={`${s.visualCol}`}>
              <div className={s.videoFrame}>
                <span className={s.videoGlow} aria-hidden />
                <div className={s.videoCard} style={videoStyle}>
                  <div className={s.cornerBadge}>
                    <p className={s.videoNote}>
                      Nejde o investiční doporučení. Konkrétní doporučení až po
                      poznání vaší situace.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={s.playButton}
                    onClick={openVideo}
                    aria-label="Přehrát video"
                  >
                    <Ripple />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className={s.ctaRow}>
          <Reveal from="bottom">
            <p className={`${s.ctaLead}`}>Co by dávalo smysl u vás?</p>
          </Reveal>
          <Reveal from="bottom" className={s.gradientSoft}>
            Vyplňte krátký formulář
          </Reveal>
          <Reveal from="bottom">
            <p className={s.ctaDescription}>
              Vyberte si, co právě řešíte. Do 24 hodin vám zavolám.
            </p>
          </Reveal>
          <Reveal from="bottom">
            <Button
              variant="cta"
              className={`${s.cta}`}
              onClick={() => openLeadForm()}
            >
              Probrat vaši situaci
            </Button>
          </Reveal>
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
              aria-label={
                isFullscreen ? "Opustit celou obrazovku" : "Celá obrazovka"
              }
              onClick={handleFullscreenToggle}
            >
              ⤢
            </button>
            <video
              ref={videoRef}
              className={s.overlayVideo}
              controls
              poster={videoPoster}
              preload="metadata"
              playsInline
              controlsList="nodownload"
            >
              <source src={videoSrc} type="video/mp4" />
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
