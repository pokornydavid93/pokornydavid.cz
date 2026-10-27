"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import s from "./testimonials.module.css";
import { Marquee } from "@/magic/ui/marquee";
import RevealClient from "@/app/ui/animations/RevealClient";
import type { ReviewSource, Testimonial } from "./Testimonials";

const getServerMediaSnapshot = () => false;

const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerMediaSnapshot
  );
};

const renderStars = (rating?: number) => rating === undefined ? null : (
  <span
    className={s.starsInline}
    aria-label={`Hodnocení ${rating} z 5`}
    role="img"
  >
    {"★★★★★"}
  </span>
);

const renderReviewSourceIcon = (source: ReviewSource) => {
  if (source === "Google") {
    return (
      <Image
        className={s.reviewSourceIcon}
        src="/googleLogo.svg"
        alt="Google"
        width={18}
        height={18}
      />
    );
  }

  return null;
};

const QuoteCard = ({ author, fullText, rating, source, sourceUrl }: Testimonial) => (
  <article className={s.quoteCard}>
    <div className={s.quoteMeta}>
      <span className={s.avatar}>{author.charAt(0)}</span>
      <div className={s.person}>
        <div className={s.nameRow}>
          <span className={s.name}>{author}</span>
          {renderStars(rating)}
        </div>
      </div>
    </div>
    <p className={s.quoteText}>{fullText}</p>
    <div className={s.reviewMeta}>
      <a
        className={s.reviewLink}
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Zobrazit recenzi
      </a>
      <span className={s.reviewSource} aria-hidden>
        {renderReviewSourceIcon(source)}
      </span>
    </div>
  </article>
);

type TestimonialsMarqueeProps = {
  leftColumn: Testimonial[];
  rightColumn: Testimonial[];
  allTestimonials: Testimonial[];
};

const TestimonialsMarquee = ({
  leftColumn,
  rightColumn,
  allTestimonials,
}: TestimonialsMarqueeProps) => {
  const isMobile = useMediaQuery("(max-width: 1100px)");
  const [isScrolling, setIsScrolling] = useState(false);
  const [isMarqueeActive, setIsMarqueeActive] = useState(false);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    let scrollTimeout: number | undefined;

    const stopScrolling = () => {
      isScrollingRef.current = false;
      setIsScrolling(false);
    };

    const onScroll = () => {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsScrolling(true);
      }

      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout);
      }

      scrollTimeout = window.setTimeout(stopScrolling, 180);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout);
      }
    };
  }, []);

  const repeatCount = 2;
  const shouldRunMarquee = isMarqueeActive && !isScrolling;
  const shellClassName = `${s.marqueeShell} ${
    shouldRunMarquee ? s.marqueeShellActive : s.marqueeShellPaused
  }`;
  const shellHandlers = {
    onPointerEnter: () => setIsMarqueeActive(true),
    onPointerLeave: () => setIsMarqueeActive(false),
    onFocus: () => setIsMarqueeActive(true),
    onBlur: () => setIsMarqueeActive(false),
  };

  if (!isMobile) {
    return (
      <RevealClient
        as="div"
        from="bottom"
        className={shellClassName}
        aria-hidden
        data-testimonials-marquee="true"
        {...shellHandlers}
      >
        <div className={s.column}>
          <Marquee
            key={`left-${isMarqueeActive ? "active" : "idle"}`}
            vertical
            paused={!shouldRunMarquee}
            repeat={repeatCount}
            gap={34}
          >
            {leftColumn.map((t) => (
              <QuoteCard key={t.id} {...t} />
            ))}
          </Marquee>
        </div>

        <div className={s.column}>
          <Marquee
            key={`right-${isMarqueeActive ? "active" : "idle"}`}
            vertical
            reverse
            paused={!shouldRunMarquee}
            repeat={repeatCount}
            gap={34}
          >
            {rightColumn.map((t) => (
              <QuoteCard key={t.id} {...t} />
            ))}
          </Marquee>
        </div>
      </RevealClient>
    );
  }

  return (
    <RevealClient
      as="div"
      from="bottom"
      className={shellClassName}
      aria-hidden
      data-testimonials-marquee="true"
      {...shellHandlers}
    >
      <Marquee
        key={`mobile-${isMarqueeActive ? "active" : "idle"}`}
        paused={!shouldRunMarquee}
        repeat={repeatCount}
        gap={24}
      >
        {allTestimonials.map((t) => (
          <QuoteCard key={t.id} {...t} />
        ))}
      </Marquee>
    </RevealClient>
  );
};

export default TestimonialsMarquee;
