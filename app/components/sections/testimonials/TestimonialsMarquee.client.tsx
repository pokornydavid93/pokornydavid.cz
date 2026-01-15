"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import s from "./testimonials.module.css";
import { Marquee } from "@/magic/ui/marquee";
import RevealClient from "@/app/ui/animations/RevealClient";
import type { ReviewSource, Testimonial } from "./Testimonials";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mql.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
};

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <span
      className={s.starsInline}
      aria-label={`Hodnocení ${rating} z 5`}
      role="img"
    >
      {Array.from({ length: fullStars }).map((_, index) => (
        <Star
          key={`full-${index}`}
          className={`${s.starIcon} ${s.starFull}`}
          aria-hidden
        />
      ))}
      {hasHalf ? (
        <span className={s.starHalf} aria-hidden>
          <Star className={`${s.starIcon} ${s.starEmpty}`} aria-hidden />
          <span className={s.starHalfFill}>
            <Star className={`${s.starIcon} ${s.starFull}`} aria-hidden />
          </span>
        </span>
      ) : null}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <Star
          key={`empty-${index}`}
          className={`${s.starIcon} ${s.starEmpty}`}
          aria-hidden
        />
      ))}
    </span>
  );
};

const renderReviewSourceIcon = (source: ReviewSource) => {
  if (source === "google") {
    return (
      <img className={s.reviewSourceIcon} src="/googleLogo.svg" alt="Google" />
    );
  }

  return null;
};

const QuoteCard = ({ quote, name, link, rating, source }: Testimonial) => (
  <article className={s.quoteCard}>
    <div className={s.quoteMeta}>
      <span className={s.avatar}>{name.charAt(0)}</span>
      <div className={s.person}>
        <div className={s.nameRow}>
          <span className={s.name}>{name}</span>
          {renderStars(rating)}
        </div>
      </div>
    </div>
    <p className={s.quoteText}>{quote}</p>
    <div className={s.reviewMeta}>
      <a className={s.reviewLink} href={link} target="_blank" rel="noreferrer">
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

  if (!isMobile) {
    return (
      <RevealClient as="div" from="bottom" className={s.marqueeShell} aria-hidden>
        <div className={s.column}>
          <Marquee vertical pauseOnHover repeat={4}>
            {leftColumn.map((t) => (
              <QuoteCard key={t.name} {...t} />
            ))}
          </Marquee>
        </div>

        <div className={s.column}>
          <Marquee vertical reverse pauseOnHover repeat={4}>
            {rightColumn.map((t) => (
              <QuoteCard key={t.name} {...t} />
            ))}
          </Marquee>
        </div>
      </RevealClient>
    );
  }

  return (
    <RevealClient as="div" from="bottom" className={s.marqueeShell} aria-hidden>
      <Marquee pauseOnHover repeat={4}>
        {allTestimonials.map((t) => (
          <QuoteCard key={t.name} {...t} />
        ))}
      </Marquee>
    </RevealClient>
  );
};

export default TestimonialsMarquee;
