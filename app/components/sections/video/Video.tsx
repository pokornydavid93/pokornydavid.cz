"use client";

import s from "./video.module.css";
import { useState, type CSSProperties } from "react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import { Clock, Play, ShieldCheck } from "lucide-react";

const VIDEO_EMBED = "https://www.youtube.com/embed/videoId?autoplay=1";
const VIDEO_POSTER = "/hero.webp"; // nahraď reálným posterem

const Video = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openVideo = () => setIsOpen(true);
  const closeVideo = () => setIsOpen(false);

  const videoStyle: CSSProperties & { "--video-poster": string } = {
    "--video-poster": `url(${VIDEO_POSTER})`,
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
          <div className={s.videoOverlay} />
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
          <Button variant="cta" href="#lead-form" className={s.cta}>
            Vybrat termín konzultace
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
            <iframe
              className={s.overlayIframe}
              src={VIDEO_EMBED}
              title="Video o spolupráci"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className={s.overlayBackdrop} onClick={closeVideo} />
        </div>
      ) : null}
    </section>
  );
};

export default Video;
