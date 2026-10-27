import Image from "next/image";
import s from "../../../home.critical.module.css";
import { Handshake, Newspaper, User2, Workflow } from "lucide-react";
import AnimatedNavLink from "@/app/components/route-transition/AnimatedNavLink";

const heroPortraitAssets = {
  basePortraitSrc: "/heroRemastered.png",
  popoutPortraitSrc: "/heroRemastered.png",
};

const heroPortraitTrustCards = [
  {
    title: "5+ let zkušeností",
    text: "Praxe ve financích a dlouhodobá práce s klienty.",
    className: "heroPortraitTrustExperience",
  },
  {
    title: "200+ klientů",
    text: "Pomoc s finančním rozhodováním napříč životními situacemi.",
    className: "heroPortraitTrustClients",
  },
  {
    title: "Individuální přístup",
    text: "Řešení podle vaší situace, ne univerzální šablona.",
    className: "heroPortraitTrustPersonal",
  },
  {
    title: "Srozumitelně\na bez tlaku",
    text: "Ať víte, proč se\nrozhodujete.",
    className: "heroPortraitTrustClarity",
  },
];

const heroPortraitNavLinks = [
  {
    label: "Jak pracuji",
    href: "/jak-pracuji/",
    icon: Workflow,
    className: "heroPortraitNavProcess",
  },
  {
    label: "Kdo jsem",
    href: "/kdo-jsem/",
    icon: User2,
    className: "heroPortraitNavAbout",
  },
  {
    label: "Služby",
    href: "/sluzby/",
    icon: Handshake,
    className: "heroPortraitNavServices",
  },
  {
    label: "Články",
    href: "/clanky/",
    icon: Newspaper,
    className: "heroPortraitNavReferences",
  },
];

type HeroPortraitFigureProps = {
  className?: string;
  priority?: boolean;
  showTrustCards?: boolean;
  showNavButtons?: boolean;
};

export default function HeroPortraitFigure({
  className,
  priority = true,
  showTrustCards = true,
  showNavButtons = false,
}: HeroPortraitFigureProps) {
  const priorityProps = priority
    ? { priority: true, fetchPriority: "high" as const }
    : {};

  return (
    <figure
      className={
        className ? `${s.heroPortraitCard} ${className}` : s.heroPortraitCard
      }
    >
      <div className={s.heroPortraitShell}>
        <div className={s.heroPortraitGlow} aria-hidden="true" />
        <div className={s.heroPortraitFrame}>
          <div className={s.heroPortraitBg} aria-hidden="true" />
          {showNavButtons ? (
            <div className={s.heroPortraitNavLinks} aria-label="Navigace">
              {heroPortraitNavLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <AnimatedNavLink
                    key={item.href}
                    href={item.href}
                    className={`${s.topLink} ${s.heroPortraitNavLink} ${
                      s[item.className]
                    }`}
                  >
                    <span className={s.topIconShell} aria-hidden="true">
                      <Icon className={s.topIcon} />
                    </span>
                    <span className={s.topLinkText}>{item.label}</span>
                  </AnimatedNavLink>
                );
              })}
            </div>
          ) : showTrustCards ? (
            <div className={s.heroPortraitTrustCards} aria-hidden="true">
              {heroPortraitTrustCards.map((card) => (
                <div
                  key={card.title}
                  className={`${s.heroPortraitTrustCard} ${s[card.className]}`}
                >
                  <span className={s.heroPortraitTrustTitle}>{card.title}</span>
                  <span className={s.heroPortraitTrustText}>{card.text}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className={s.heroPortraitClip}>
            <div className={s.heroPortraitSubjectBase}>
              <Image
                className={`${s.heroImg} ${s.heroPortraitBaseImage}`}
                src={heroPortraitAssets.basePortraitSrc}
                alt="Můj portrét"
                draggable={false}
                fill
                sizes="(max-width: 984px) 86vw, 460px"
                {...priorityProps}
              />
            </div>
          </div>
          <div className={s.heroPortraitFrameOverlay} aria-hidden="true" />
          <div className={s.heroPortraitSubjectPopout} aria-hidden="true">
            <div className={s.heroPortraitPopoutPlane}>
              <Image
                className={`${s.heroImg} ${s.heroPortraitPopoutImage}`}
                src={heroPortraitAssets.popoutPortraitSrc}
                alt=""
                draggable={false}
                fill
                loading="eager"
                sizes="(max-width: 984px) 86vw, 460px"
              />
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
