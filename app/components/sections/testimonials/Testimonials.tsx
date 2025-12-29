"use client";

import s from "./testimonials.module.css";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import {
  Star,
  Wallet,
  ShieldCheck,
  Home,
  LineChart,
  PiggyBank,
  Shield,
  LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { Reveal } from "@/app/ui/animations/Reveal";
import { Marquee } from "@/magic/ui/marquee";

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

type Topic = { label: string; icon?: LucideIcon };

const topics: Topic[] = [
  { label: "Finanční plán", icon: Wallet },
  { label: "Pojištění", icon: ShieldCheck },
  { label: "Hypotéka", icon: Home },
  { label: "Investice", icon: LineChart },
  { label: "Rezervy", icon: PiggyBank },
  { label: "Penzijní plán", icon: Shield },
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

const QuoteCard = ({ quote, name }: Testimonial) => (
  <article className={s.quoteCard}>
    <div className={s.quoteMeta}>
      <span className={s.avatar}>{name.charAt(0)}</span>
      <div className={s.person}>
        <span className={s.name}>{name}</span>
      </div>
    </div>
    <p className={s.quoteText}>{quote}</p>
  </article>
);

type TagProps = {
  label: string;
  count?: number;
  showCount?: boolean;
  icon?: LucideIcon;
};

const Tag = ({ label, count, showCount = true, icon: Icon }: TagProps) => (
  <div className={s.tag}>
    {Icon ? (
      <Icon size={16} className={s.tagIcon} aria-hidden />
    ) : (
      <span className={s.tagDot} aria-hidden />
    )}
    <span>{label}</span>
    {showCount && typeof count === "number" ? (
      <span className={s.tagCount}>{count}×</span>
    ) : null}
  </div>
);

const Testimonials = () => {
  const isMobile = useMediaQuery("(max-width: 1100px)");
  const { openLeadForm } = useLeadFormModal();

  return (
    <section className={s.section}>
      <Container className={s.inner}>
        <div className={s.headingWrapper}>
          <Reveal as="p" from="bottom" className={s.eyebrow}>
            Skutečné příběhy
          </Reveal>
          <Reveal as="h2" from="bottom" className={s.gradientSoft}>
            Jak spolupráci vnímají klienti
          </Reveal>
          <Reveal as="p" from="bottom" className={s.sectionDescription}>
            Reálné zkušenosti lidí, kteří řešili stejné otázky jako vy. Co
            fungovalo, co ne – a jaký měli pocit ze spolupráce.
          </Reveal>
        </div>

        <div className={s.flex}>
          {/* LEFT CONTENT */}
          <Reveal as="div" from="bottom" className={s.card}>
            <Reveal as="h3" from="bottom" className={s.cardHeading}>
              Důvěřuje mi více než 200 klientů
            </Reveal>

            <Reveal as="p" from="bottom" className={s.cardBody}>
              Klienti oceňují přehled, klidný přístup a řešení, která dávají
              smysl v běžném životě.
            </Reveal>

            <Reveal as="div" from="bottom" className={s.buttonWrapper}>
              <Button
                variant="cta"
                className={s.ctaBtn}
                onClick={() => openLeadForm()}
              >
                Probrat vaši situaci
              </Button>
            </Reveal>
          </Reveal>

          {/* MARQUEE – DESKTOP */}
          {!isMobile && (
            <Reveal
              as="div"
              from="bottom"
              className={s.marqueeShell}
              aria-hidden
            >
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
            </Reveal>
          )}

          {/* MARQUEE – MOBILE */}
          {isMobile && (
            <Reveal
              as="div"
              from="bottom"
              className={s.marqueeShell}
              aria-hidden
            >
              <Marquee pauseOnHover repeat={4}>
                {allTestimonials.map((t) => (
                  <QuoteCard key={t.name} {...t} />
                ))}
              </Marquee>
            </Reveal>
          )}
        </div>

        {/* STATS */}
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

        <div className={s.topicContainer}>
          <Reveal as="p" from="left" className={s.topicLabel}>
            Co nejčastěji řešíme:
          </Reveal>

          {/* TOPIC PILLS (now using Tag) */}
          <div className={s.topicChips}>
            {topics.map((t, i) => (
              <Reveal
                key={t.label}
                as="div"
                from="bottom"
                className={s.topicChip}
                stagger={0.08}
                index={i}
              >
                <Tag label={t.label} showCount={false} icon={t.icon} />
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Testimonials;
