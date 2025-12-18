"use client";
import { useState } from "react";
import s from "./hero.module.css";
import Button from "@/app/ui/cta/Button";
import {
  ChevronRight,
  PhoneCall,
  ShieldCheck,
  Home,
  Lock,
  ShieldAlert,
  User2,
  HeartHandshake,
  Workflow,
  Quote,
  Play,
  Compass,
  LineChart,
} from "lucide-react";
import GradientText from "@/app/ui/animations/GradientText";
import LogoMark from "@/app/svgr/LogoMark";
import { useViewport } from "../../Providers/ViewportProvider";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

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
};

const Hero = ({ variants, activeSession }: HeroProps) => {
  const [index, setIndex] = useState(5);
  const content = variants[index];
  const { width, height } = useViewport();
  const { openLeadForm } = useLeadFormModal();
  const serviceLinks = [
    {
      label: "Finanční plán",
      icon: <Compass className={s.serviceIcon} />,
      target: "#service-financni-plan",
    },
    {
      label: "Investice a spoření",
      icon: <LineChart className={s.serviceIcon} />,
      target: "#service-investice-a-sporeni",
    },
    {
      label: "Zajištění příjmu",
      icon: <ShieldCheck className={s.serviceIcon} />,
      target: "#service-zajisteni-prijmu",
    },
    {
      label: "Ochrana majetku",
      icon: <Lock className={s.serviceIcon} />,
      target: "#service-ochrana-majetku",
    },
  ];

  const { line1, line2, highlight } = content.title;
  const hasHighlight = highlight && line1.includes(highlight);
  const [before, after] = hasHighlight ? line1.split(highlight) : [line1, ""];

  const next = () => setIndex((i) => (i + 1) % variants.length);
  const prev = () =>
    setIndex((i) => (i - 1 + variants.length) % variants.length);

  return (
    <section className={s.heroCont}>
      <div className={s.bgLayer} />
      <div className={s.heroNoise} />
      <div className={s.heroInner}>
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
                  animationSpeed={1}
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
          <Button
            variant="cta"
            label={content.cta.primary.label}
            onClick={() => openLeadForm()}
            iconRight={
              <PhoneCall
                style={{ color: "var(--brand-dark)", marginLeft: "7px" }}
              />
            }
            size="md"
            className={s.heroCta}
          />
          {/* <div className={s.playCont}>
            <Play />
          </div> */}
        </div>

        {/* 🔥 NOVÝ BOTTOM STRIP – elegantně posazený na dně hero */}
      </div>

      <div className={s.serviceStrip}>
        {serviceLinks.map((item) => (
          <a key={item.label} href={item.target} className={s.serviceItem}>
            {item.icon}
            {item.label}
          </a>
        ))}
      </div>
      {/* switcher */}
      {/* <div className={s.variantSwitcher}>
        <button onClick={prev}>←</button>
        <span>{index + 1} / {variants.length}</span>
        <button onClick={next}>→</button>
      </div> */}
    </section>
  );
};

export default Hero;
