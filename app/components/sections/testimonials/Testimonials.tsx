"use client";

import s from "./testimonials.module.css";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

const leftColumn: Testimonial[] = [
  {
    quote:
      "Eiusmod quam justo lectus commodo augue arcu dignissim. Porttitor ullamcorper.",
    name: "Operations Manager",
    role: "CEO",
  },
  {
    quote:
      "Luctus nibh finibus facilisis dapibus etiam interdum tortor. Tincidunt nam porta elementum.",
    name: "Nicole Saskia",
    role: "Founder",
  },
  {
    quote:
      "Lidé oceňují hlavně jednoduché vysvětlení, klidný přístup a řešení bez triků.",
    name: "Jana Veselá",
    role: "HR Director",
  },
];

const rightColumn: Testimonial[] = [
  {
    quote: "Fermentum odio phasellus non purus est efficitur laoreet.",
    name: "Lili Alexa",
    role: "Marketing Director",
  },
  {
    quote:
      "Porta elementum a enim euismod quam justo lectus. Imperdiet mollis nullam volutpat porttitor.",
    name: "Mario Pascal",
    role: "Product Lead",
  },
  {
    quote:
      "Velká jistota v tom, co mám dělat a proč. Jednoduché kroky, žádný tlak.",
    name: "David Hruška",
    role: "Freelancer",
  },
];

const allTestimonials = [...leftColumn, ...rightColumn];

const trustTags = [
  { label: "Lidský přístup", count: 48 },
  { label: "Jasné kroky", count: 36 },
  { label: "Bez nátlaku", count: 29 },
  { label: "Rychlá reakce", count: 21 },
  { label: "Srozumitelné rady", count: 33 },
  { label: "Dlouhodobá podpora", count: 18 },
];

const tagsTop = trustTags.slice(0, 3);
const tagsBottom = trustTags.slice(3);

const topics = [
  "Finanční plán",
  "Pojištění",
  "Hypotéka",
  "Investice",
  "Rezervy",
  "Penzijní plán",
];

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

const renderTagTrack = (
  items: typeof trustTags,
  reverse?: boolean,
  paused?: boolean
) => (
  <div className={s.tagRow}>
    <div
      className={`${s.tagTrack} ${reverse ? s.tagTrackReverse : ""} ${
        paused ? s.paused : ""
      }`.trim()}
    >
      {[...items, ...items].map((tag, idx) => (
        <div className={s.tag} key={`${tag.label}-${idx}`}>
          <span className={s.tagDot} aria-hidden />
          <span>{tag.label}</span>
          <span className={s.tagCount}>{tag.count}×</span>
        </div>
      ))}
    </div>
  </div>
);

const renderCards = (
  items: Testimonial[],
  reverse?: boolean,
  paused?: boolean
) => {
  const doubled = [...items, ...items];
  return (
    <div
      className={`${s.track} ${reverse ? s.trackReverse : ""} ${
        paused ? s.paused : ""
      }`.trim()}
    >
      {doubled.map((item, idx) => (
        <article className={s.quoteCard} key={`${item.name}-${idx}`}>
          <p className={s.quoteText}>{item.quote}</p>
          <div className={s.quoteMeta}>
            <span className={s.avatar}>{item.name.charAt(0)}</span>
            <div className={s.person}>
              <span className={s.name}>{item.name}</span>
              <span className={s.role}>{item.role}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

const Testimonials = () => {
  const [pauseTracks, setPauseTracks] = useState(false);
  const [pauseTags, setPauseTags] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1100px)");
  const { openLeadForm } = useLeadFormModal();

  return (
    <section className={s.section}>
      <Container className={`${s.inner} reveal`}>
        <p className={s.eyebrow}>Skutečné příběhy klientů</p>
        <div className={s.grid}>
          <div className={s.card}>
            <h3 className={s.cardHeading}>Důvěřuje mi přes 200 klientů</h3>
            <p className={s.cardBody}>
              Klienti oceňují přehled, klidný přístup a řešení, která dávají smysl v běžném životě.
            </p>
            <p className={s.topicLabel}>Co řešíme nejčastěji</p>
            <div className={s.topicChips}>
              {topics.map((t) => (
                <span className={s.topicChip} key={t}>
                  {t}
                </span>
              ))}
            </div>
            <Button
              variant="cta"
              className={s.ctaBtn}
              onClick={() => openLeadForm()}
            >
              Sjednat konzultaci
            </Button>
          </div>

          {!isMobile && (
            <div
              className={s.marqueeShell}
              aria-hidden
              onMouseEnter={() => setPauseTracks(true)}
              onMouseLeave={() => setPauseTracks(false)}
              onTouchStart={() => setPauseTracks(true)}
              onTouchEnd={() => setPauseTracks(false)}
              onTouchCancel={() => setPauseTracks(false)}
            >
              <div className={s.column}>
                {renderCards(leftColumn, false, pauseTracks)}
              </div>
              <div className={s.column}>
                {renderCards(rightColumn, true, pauseTracks)}
              </div>
            </div>
          )}

          {isMobile && (
            <div
              className={s.mobileColumn}
              aria-hidden
              onMouseEnter={() => setPauseTracks(true)}
              onMouseLeave={() => setPauseTracks(false)}
              onTouchStart={() => setPauseTracks(true)}
              onTouchEnd={() => setPauseTracks(false)}
              onTouchCancel={() => setPauseTracks(false)}
            >
              <div className={s.column}>
                {renderCards(allTestimonials, false, pauseTracks)}
              </div>
            </div>
          )}

          <div className={s.sideStack}>
            <div className={s.ratingCard}>
              <p className={s.ratingValue}>4.90</p>
              <div className={s.stars}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} fill="#f5c644" color="#f5c644" />
                ))}
              </div>
              <p className={s.ratingMeta}>121 hodnocení a stále přibývají</p>
            </div>

            <div className={s.pillCard}>
              <div className={s.pillTitle}>Co klienti zmiňují nejčastěji</div>
              <div
                className={s.tagViewport}
                onMouseEnter={() => setPauseTags(true)}
                onMouseLeave={() => setPauseTags(false)}
                onTouchStart={() => setPauseTags(true)}
                onTouchEnd={() => setPauseTags(false)}
                onTouchCancel={() => setPauseTags(false)}
              >
                {renderTagTrack(tagsTop, true, pauseTags)}
                {renderTagTrack(tagsBottom, false, pauseTags)}
              </div>
            </div>
          </div>
        </div>

        <div className={s.statsBar}>
          <div className={s.stat}>
            <div className={s.statValue}>5+</div>
            <div className={s.statLabel}>Let zkušeností</div>
          </div>
          <div className={s.stat}>
            <div className={s.statValue}>200+</div>
            <div className={s.statLabel}>Spokojených klientů</div>
          </div>
          <div className={s.stat}>
            <div className={s.statValue}>4.9</div>
            <div className={s.statLabel}>Průměrné hodnocení</div>
          </div>
          <div className={s.stat}>
            <div className={s.statValue}>96%</div>
            <div className={s.statLabel}>pokračuje ve spolupráci</div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Testimonials;
