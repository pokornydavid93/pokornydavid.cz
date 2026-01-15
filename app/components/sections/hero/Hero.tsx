import Image from "next/image";
import s from "./hero.module.css";
import {
  MousePointerClick,
  Eye,
  BadgeCheck,
  ShieldAlert,
  Repeat,
} from "lucide-react";
import GradientText from "@/app/ui/animations/GradientText";
import HeroCTAClient from "./HeroCTAClient";

export type HeroContent = {
  eyebrow: string;
  title: {
    line1: string;
    line2: string;
    highlight?: string;
  };
  description: string;
  cta: {
    primary: { label: string; href?: string };
    secondary?: { label: string; href?: string };
  };
};

type HeroProps = {
  variants: HeroContent[];
  activeSession: string;
  index?: number;
};

const Hero = ({ variants, activeSession, index = 0 }: HeroProps) => {
  const maxIndex = Math.max(variants.length - 1, 0);
  const safeIndex = Math.min(Math.max(index, 0), maxIndex);
  const content = variants[safeIndex];

  if (!content) return null;

  const serviceLinks = [
    {
      label: "Licencovaný poradce",
      icon: <BadgeCheck className={s.serviceIcon} />,
      target: "#service-financni-plan",
    },
    {
      label: "Transparentnost",
      icon: <Eye className={s.serviceIcon} />,
      target: "#service-investice-a-sporeni",
    },
    {
      label: "Dlouhodobá spolupráce",
      icon: <Repeat className={s.serviceIcon} />,
      target: "#service-ochrana-majetku",
    },
  ];
  const trustHints = ["Nezávazně", "Bez tlaku na produkt"];

  const { line1, line2, highlight } = content.title;
  const hasHighlight = highlight && line1.includes(highlight);
  const [before, after] = hasHighlight ? line1.split(highlight) : [line1, ""];

  // const next = () => setIndex((i) => (i + 1) % variants.length);
  // const prev = () =>
  //   setIndex((i) => (i - 1 + variants.length) % variants.length);

  return (
    <section className={s.heroCont}>
      <div className={s.bgLayer} />
      <div className={s.heroLayout}>
        <div className={`${s.heroInner} ${s.heroTextCol}`}>
          <div className={s.heroGlass} />
          <p className={s.eyebrow}>{content.eyebrow}</p>
          <h1 className={s.title}>
            <span className={s.titleLine}>
              {hasHighlight ? (
                <>
                  {before}
                  <GradientText
                    gradientVar="--text-gradient-hero"
                    className={s.highlight}
                    animationSpeed={5}
                  >
                    {highlight}
                  </GradientText>
                  {after}
                </>
              ) : (
                line1
              )}
            </span>
            <span className={s.titleLine}>{line2}</span>
          </h1>

          <p className={s.description}>{content.description}</p>

          <div className={s.actions}>
            <HeroCTAClient
              label={content.cta.primary.label}
              iconRight={<MousePointerClick className={s.ctaIcon} aria-hidden />}
              size="md"
              className={s.heroCta}
            />
            <div className={s.trustHints}>
              <div className={s.trustHintList}>
                {trustHints.map((hint) => (
                  <span key={hint} className={s.trustHint}>
                    <ShieldAlert
                      className={s.trustHintIcon}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className={s.trustHintText}>{hint}</span>
                    <ShieldAlert
                      className={s.trustHintIconRight}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={s.heroMediaCol}>
          <Image
            className={s.heroImg}
            src="/hero-v2.webp"
            alt="Hero background"
            draggable={false}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 48vw"
          />
        </div>
      </div>

      <div className={s.serviceStrip}>
        {serviceLinks.map((item) => (
          <a key={item.label} href={item.target} className={s.serviceItem}>
            {item.icon}
            {item.label}
          </a>
        ))}
      </div>
    </section>
  );
};

export default Hero;
