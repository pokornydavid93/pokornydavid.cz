"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import s from "./textMarquee.module.css";

type TextMarqueeProps = {
  items: string[];
  icons?: React.ReactNode[];
  speedSec?: number;
  className?: string;
};

const TextMarquee = ({
  items,
  icons = [],
  speedSec = 26,
  className = "",
}: TextMarqueeProps) => {
  const content = useMemo(() => {
    if (!items.length) return [];
    const parts: React.ReactNode[] = [];
    items.forEach((item, idx) => {
      parts.push(
        <span key={`item-${idx}`} className={s.item}>
          {item}
        </span>
      );
      const iconNode = icons[idx] ?? null;
      if (iconNode) {
        parts.push(
          <span key={`icon-${idx}`} className={s.icon}>
            {iconNode}
          </span>
        );
      }
    });
    return parts;
  }, [items, icons]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [copies, setCopies] = useState(2);
  const [segmentWidth, setSegmentWidth] = useState(0);

  useEffect(() => {
    const compute = () => {
      const wrap = wrapRef.current;
      const measure = measureRef.current;
      if (!wrap || !measure) return;
      const wrapWidth = wrap.getBoundingClientRect().width;
      const contentWidth = measure.getBoundingClientRect().width;
      if (!wrapWidth || !contentWidth) return;
      const neededCopies = Math.max(
        2,
        Math.ceil((wrapWidth * 2) / contentWidth)
      );
      setCopies(neededCopies);
      setSegmentWidth(contentWidth);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [items, icons]);

  return (
    <div className={`${s.marqueeWrap} ${className}`.trim()} ref={wrapRef}>
      {/* measure single segment width */}
      <div className={s.marqueeMeasure} ref={measureRef} aria-hidden>
        <div className={s.marqueeTrack}>{content}</div>
      </div>

      <div
        className={s.marqueeInner}
        style={
          segmentWidth
            ? ({
                animationDuration: `${speedSec}s`,
                "--segment-width": `${segmentWidth}px`,
                "--total-width": `${segmentWidth * copies}px`,
              } as React.CSSProperties)
            : { animationDuration: `${speedSec}s` }
        }
        aria-hidden
      >
        {Array.from({ length: copies + 1 }).map((_, idx) => (
          <div className={s.marqueeTrack} key={idx}>
            {content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TextMarquee;
