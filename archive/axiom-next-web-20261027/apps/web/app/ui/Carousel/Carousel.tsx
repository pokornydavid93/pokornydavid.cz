"use client";

import { useRef, useState } from "react";
import type { ReactNode, MouseEvent, TouchEvent } from "react";
import s from "./carousel.module.css";

type Props = {
  children: ReactNode;
  gap?: number;
};

const Carousel = ({ children, gap = 24 }: Props) => {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const pos = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  // --- DRAG ---
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;

    pos.current.isDown = true;
    pos.current.startX = e.pageX - track.offsetLeft;
    pos.current.scrollLeft = track.scrollLeft;
  };

  const onMouseLeave = () => {
    pos.current.isDown = false;
  };

  const onMouseUp = () => {
    pos.current.isDown = false;
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!pos.current.isDown || !track) return;

    const x = e.pageX - track.offsetLeft;
    const walk = (x - pos.current.startX) * 1.2;
    track.scrollLeft = pos.current.scrollLeft - walk;
  };

  // --- TOUCH ---
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;

    const touch = e.touches[0];
    pos.current.isDown = true;
    pos.current.startX = touch.pageX - track.offsetLeft;
    pos.current.scrollLeft = track.scrollLeft;
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!pos.current.isDown || !track) return;

    const touch = e.touches[0];
    const x = touch.pageX - track.offsetLeft;
    const walk = (x - pos.current.startX) * 1.2;
    track.scrollLeft = pos.current.scrollLeft - walk;
  };

  const onTouchEnd = () => {
    pos.current.isDown = false;
  };

  // --- SCROLL NA INDEX + LOOP + CENTROVÁNÍ ---
  function scrollToIndex(nextIndex: number) {
    const track = trackRef.current;
    if (!track) return;

    const count = track.children.length;
    if (count === 0) return;

    // loop index: ... -1 → last, last+1 → 0 ...
    const normalized =
      ((nextIndex % count) + count) % count; // safe modulo i pro záporné

    const child = track.children[normalized] as HTMLElement;

    const childCenter = child.offsetLeft + child.offsetWidth / 2;
    const trackCenter = track.clientWidth / 2;

    let targetLeft = childCenter - trackCenter;

    const maxScroll = track.scrollWidth - track.clientWidth;
    if (targetLeft < 0) targetLeft = 0;
    if (targetLeft > maxScroll) targetLeft = maxScroll;

    setCurrentIndex(normalized);

    track.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });
  }

  const handleArrowLeft = () => {
    scrollToIndex(currentIndex - 1);
  };

  const handleArrowRight = () => {
    scrollToIndex(currentIndex + 1);
  };

  return (
    <div className={s.carousel}>
      <button
        type="button"
        className={`${s.arrow} ${s.arrowLeft}`}
        onClick={handleArrowLeft}
        aria-label="Předchozí"
      >
        ‹
      </button>

      <div
        className={s.track}
        ref={trackRef}
        style={{ gap }}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>

      <button
        type="button"
        className={`${s.arrow} ${s.arrowRight}`}
        onClick={handleArrowRight}
        aria-label="Další"
      >
        ›
      </button>
    </div>
  );
};

export default Carousel;
