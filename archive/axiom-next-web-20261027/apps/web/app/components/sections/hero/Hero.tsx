"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import s from "../../../home.critical.module.css";
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Handshake,
  Home,
  Newspaper,
  Send,
  TrendingUp,
  Umbrella,
  User2,
  WalletCards,
  Workflow,
} from "lucide-react";
import GradientText from "@/app/ui/animations/GradientText";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import HashLink from "@/app/ui/scroll/HashLink.client";
import HeroCTAClient from "./HeroCTAClient";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import AnimatedNavLink from "@/app/components/route-transition/AnimatedNavLink";
import type { LeadTopic } from "@/lib/api";

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

type HeroMode = "default" | "explore" | "closing";

type HeroExploreOverlayStyle = CSSProperties & {
  "--hero-explore-origin-x": string;
  "--hero-explore-origin-y": string;
};

type ConcernScenarioId =
  | "refixace-hypoteky"
  | "prvni-spolecne-bydleni"
  | "vypadek-prijmu"
  | "rezerva"
  | "finance-do-poradku"
  | "rozumne-investovani";

type ConcernScenario = {
  id: ConcernScenarioId;
  title: string;
  description: string;
  icon: ElementType;
  intro: string;
  items: string[];
  nextStep: string;
  cta: string;
  leadTopic: LeadTopic;
};

type HeroSecondaryLink = {
  label: string;
  href: `#${string}`;
};

const concernScenarios: ConcernScenario[] = [
  {
    id: "refixace-hypoteky",
    title: "Čeká mě refixace hypotéky",
    description: "Nová sazba, splátka a dopad na rozpočet.",
    icon: Home,
    intro:
      "Podíváme se, co nová sazba znamená pro váš rozpočet a jaké možnosti dávají smysl.",
    items: [
      "Současná splátka a stav hypotéky",
      "Dopad nové sazby na rozpočet",
      "Rezerva a bezpečná výše splátky",
      "Možnosti dalšího postupu",
    ],
    nextStep: "Domluvit hovor o refixaci",
    cta: "Chci projít tuto situaci",
    leadTopic: "Hypotéka & bydlení",
  },
  {
    id: "prvni-spolecne-bydleni",
    title: "Řešíme první společné bydlení",
    description: "Co si můžeme dovolit a co nepodcenit.",
    icon: Handshake,
    intro:
      "Pomůžu vám ujasnit, co si můžete dovolit a jak správně nastavit celý krok.",
    items: [
      "Rozpočet domácnosti",
      "Výše vlastních zdrojů",
      "Bezpečná splátka",
      "Na co si dát pozor před rozhodnutím",
    ],
    nextStep: "Ujasnit možnosti bydlení",
    cta: "Chci projít tuto situaci",
    leadTopic: "Hypotéka & bydlení",
  },
  {
    id: "vypadek-prijmu",
    title: "Bojím se výpadku příjmu",
    description: "Jestli domácnost ustojí nemoc nebo výpadek.",
    icon: Umbrella,
    intro:
      "Společně zjistíme, jak odolná je vaše domácnost a co je potřeba mít pokryté.",
    items: [
      "Co by se stalo při výpadku příjmu",
      "Jak dlouho domácnost vydrží",
      "Jakou roli má rezerva",
      "Jak snížit riziko nejistoty",
    ],
    nextStep: "Prověřit odolnost domácnosti",
    cta: "Chci projít tuto situaci",
    leadTopic: "Zajištění příjmu",
  },
  {
    id: "rezerva",
    title: "Nevím, kolik mít stranou",
    description: "Rezerva bez chaosu a odhadování.",
    icon: WalletCards,
    intro:
      "Ujasníme si, jak velká rezerva vám dává smysl a jakou má mít roli.",
    items: [
      "Kolik držet jako okamžitou rezervu",
      "Jak oddělit rezervu od jiných cílů",
      "Kde má být rezerva uložená",
      "Jak poznat, že je nastavená správně",
    ],
    nextStep: "Nastavit rezervu s klidem",
    cta: "Chci projít tuto situaci",
    leadTopic: "Finanční plán",
  },
  {
    id: "finance-do-poradku",
    title: "Chci dát finance do pořádku",
    description: "Smlouvy, výdaje a rozhodnutí v jednom přehledu.",
    icon: Compass,
    intro:
      "Podíváme se na finance jako celek a uděláme v nich jasnější řád.",
    items: [
      "Co už dnes máte nastavené",
      "Kde vzniká chaos nebo překryv",
      "Co má prioritu",
      "Jak z jednotlivých částí udělat plán",
    ],
    nextStep: "Získat celkový přehled",
    cta: "Chci projít tuto situaci",
    leadTopic: "Finanční plán",
  },
  {
    id: "rozumne-investovani",
    title: "Chci začít investovat rozumně",
    description: "Investice jako součást plánu, ne náhoda.",
    icon: TrendingUp,
    intro:
      "Nejdřív zasadíme investice do kontextu vašich cílů, rezerv a dalších závazků.",
    items: [
      "Jaký je cíl investování",
      "Jaký dává smysl horizont",
      "Jakou roli mají investice v plánu",
      "Podle čeho zvolit vhodný přístup",
    ],
    nextStep: "Ujasnit investiční směr",
    cta: "Chci projít tuto situaci",
    leadTopic: "Investice a spoření",
  },
];

const defaultConcernScenarioId = concernScenarios[0].id;

const heroSecondaryLinks: HeroSecondaryLink[] = [
  { label: "Jak spolupráce probíhá", href: "#process" },
  { label: "Služby", href: "#services" },
  { label: "Reference", href: "#testimonials" },
  { label: "Časté otázky", href: "#faq" },
];

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

export function HeroPortraitFigure({
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

function ConcernDetailPanel({
  scenario,
  scenarioIndex,
  onCtaClick,
}: {
  scenario: ConcernScenario;
  scenarioIndex: number;
  onCtaClick: () => void;
}) {
  const Icon = scenario.icon;
  const displayIndex = String(scenarioIndex + 1).padStart(2, "0");

  return (
    <aside
      className={s.heroExploreCtaPanel}
      aria-live="polite"
      aria-label="Detail vybrané situace"
    >
      <article
        className={s.heroDynamicPanel}
        key={scenario.id}
        data-panel={scenario.id}
      >
        <header className={s.heroInsightHeader}>
          <div className={s.heroInsightEyebrowGroup}>
            <span className={s.heroInsightEyebrow}>Vybraná situace</span>
            <span className={s.heroInsightIndex}>{displayIndex}</span>
          </div>
          <span className={s.heroInsightIcon} aria-hidden="true">
            <Icon />
          </span>
        </header>

        <div className={s.heroInsightIntro}>
          <h3>{scenario.title}</h3>
          <p>{scenario.intro}</p>
        </div>

        <div className={s.heroInsightFocus}>
          <p className={s.heroInsightSectionLabel}>Společně projdeme</p>
          <ol className={s.heroInsightList}>
            {scenario.items.map((item, index) => (
              <li key={item} className={s.heroInsightRow}>
                <span className={s.heroInsightRowNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <footer className={s.heroInsightFooter}>
          <div className={s.heroInsightNextStep}>
            <span>Další krok</span>
            <strong>{scenario.nextStep}</strong>
          </div>
          <button
            type="button"
            className={s.heroExploreCtaButton}
            onClick={onCtaClick}
          >
            <span>{scenario.cta}</span>
            <ArrowUpRight aria-hidden="true" />
          </button>
        </footer>
      </article>
    </aside>
  );
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion).matches;

const Hero = ({ variants, activeSession, index = 0 }: HeroProps) => {
  const { openLeadForm } = useLeadFormModal();
  const maxIndex = Math.max(variants.length - 1, 0);
  const safeIndex = Math.min(Math.max(index, 0), maxIndex);
  const content: HeroContent =
    variants[safeIndex] ??
    variants[0] ?? {
      eyebrow: "",
      title: { line1: "", line2: "" },
      description: "",
      cta: { primary: { label: "", href: "#lead-form" } },
  };
  const [heroMode, setHeroMode] = useState<HeroMode>("default");
  const [portalReady, setPortalReady] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<ConcernScenarioId>(defaultConcernScenarioId);
  const [previewScenarioId, setPreviewScenarioId] =
    useState<ConcernScenarioId | null>(null);
  const [exploreReveal, setExploreReveal] = useState({
    x: "50vw",
    y: "50vh",
  });
  const explorePanelId = useId();
  const exploreHeadingId = `${explorePanelId}-heading`;
  const heroRef = useRef<HTMLElement | null>(null);
  const exploreContentRef = useRef<HTMLDivElement | null>(null);
  const exploreHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const exploreButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeExploreTimerRef = useRef<number | null>(null);
  const ctaPlaneRef = useRef<SVGSVGElement | null>(null);
  const ctaHoverRef = useRef(false);
  const planeShotActiveRef = useRef(false);
  const planeShotTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const planeShotCleanupRef = useRef<(() => void) | null>(null);
  const returnFocusAfterCloseRef = useRef(false);

  const { line1, line2, highlight } = content.title;
  const hasHighlight = highlight && line1.includes(highlight);
  const [before, after] = hasHighlight ? line1.split(highlight) : [line1, ""];
  const isExplore = heroMode === "explore";
  const isExploreClosing = heroMode === "closing";
  const isExploreVisible = heroMode !== "default";
  const showPortraitTrustCards = false;
  const selectedScenario =
    concernScenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    concernScenarios[0];
  const previewScenario = previewScenarioId
    ? concernScenarios.find((scenario) => scenario.id === previewScenarioId) ??
      null
    : null;
  const activeScenario = previewScenario ?? selectedScenario;
  const activeScenarioIndex = Math.max(
    0,
    concernScenarios.findIndex((scenario) => scenario.id === activeScenario.id)
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPortalReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.heroExplore = isExploreVisible ? "1" : "0";
    window.dispatchEvent(
      new CustomEvent("axiom:hero-explore-change", {
        detail: { active: isExploreVisible },
      })
    );

    return () => {
      root.dataset.heroExplore = "0";
      window.dispatchEvent(
        new CustomEvent("axiom:hero-explore-change", {
          detail: { active: false },
        })
      );
    };
  }, [isExploreVisible]);

  useEffect(() => {
    if (heroMode === "default") {
      if (!returnFocusAfterCloseRef.current) return;

      const focusFrame = window.requestAnimationFrame(() => {
        exploreButtonRef.current?.focus({ preventScroll: true });
        returnFocusAfterCloseRef.current = false;
      });

      return () => window.cancelAnimationFrame(focusFrame);
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame =
      heroMode === "explore"
        ? window.requestAnimationFrame(() => {
            exploreHeadingRef.current?.focus({ preventScroll: true });
          })
        : null;

    const getFocusableElements = () => {
      const panel = exploreContentRef.current;
      if (!panel) return [];

      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "[tabindex]:not([tabindex='-1'])",
          ].join(", ")
        )
      ).filter(
        (element) =>
          !element.hasAttribute("aria-hidden") &&
          element.getAttribute("tabindex") !== "-1"
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        returnFocusAfterCloseRef.current = true;
        setHeroMode("default");
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      if (focusFrame !== null) {
        window.cancelAnimationFrame(focusFrame);
      }
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [heroMode, portalReady]);

  useEffect(() => {
    return () => {
      if (closeExploreTimerRef.current !== null) {
        window.clearTimeout(closeExploreTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const heroRoot = heroRef.current;
    const plane =
      ctaPlaneRef.current ??
      heroRoot?.querySelector<SVGSVGElement>(`.${s.ctaIcon}`) ??
      null;

    if (!heroRoot || !plane) return;

    ctaPlaneRef.current = plane;
    heroRoot.style.setProperty("--hero-plane-rotation", "0deg");

    if (heroMode !== "default" || prefersReducedMotion()) return;

    const ctaElement = plane.closest("button, a");
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let pointerLastTime = performance.now();
    let hasPointerPosition = false;

    const updatePointerPosition = (event: PointerEvent) => {
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - pointerLastTime) / 1000));

      if (hasPointerPosition) {
        const nextVelocityX = (event.clientX - pointerX) / dt;
        const nextVelocityY = (event.clientY - pointerY) / dt;

        pointerVelocityX += (nextVelocityX - pointerVelocityX) * 0.42;
        pointerVelocityY += (nextVelocityY - pointerVelocityY) * 0.42;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerLastTime = now;
      hasPointerPosition = true;
    };

    const pointPlaneToPointer = (event: PointerEvent) => {
      updatePointerPosition(event);

      if (ctaHoverRef.current || planeShotActiveRef.current) return;

      if (frame) window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        const rect = plane.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        const rotation = angle * (180 / Math.PI) + 45;

        heroRoot.style.setProperty("--hero-plane-rotation", `${rotation}deg`);
      });
    };

    const resetPlane = () => {
      if (frame) window.cancelAnimationFrame(frame);
      heroRoot.style.setProperty("--hero-plane-rotation", "0deg");
    };

    const createPlaneShard = () => {
      const shard = document.createElement("span");
      shard.className = s.heroPlaneShard;
      document.body.appendChild(shard);
      return shard;
    };

    const shootPlaneAtPointer = (event: MouseEvent) => {
      if (event.button !== 0 || planeShotActiveRef.current) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          'button, a, input, textarea, select, label, [role="button"]'
        )
      ) {
        return;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
      pointerLastTime = performance.now();
      hasPointerPosition = true;

      const rect = plane.getBoundingClientRect();
      const startCenterX = rect.left + rect.width / 2;
      const startCenterY = rect.top + rect.height / 2;
      const initialAngle = Math.atan2(pointerY - startCenterY, pointerX - startCenterX);
      const initialRotation = initialAngle * (180 / Math.PI) + 45;
      const tipOffset = 10;
      const startX = startCenterX - rect.width / 2;
      const startY = startCenterY - rect.height / 2;
      const startDistance = Math.hypot(pointerX - startCenterX, pointerY - startCenterY);
      const baseMaxSpeed = Math.min(2400, Math.max(900, startDistance / 0.38));
      const flightState = {
        x: startX,
        y: startY,
        vx: Math.cos(initialAngle) * baseMaxSpeed * 0.68,
        vy: Math.sin(initialAngle) * baseMaxSpeed * 0.68,
        elapsed: 0,
        lastTime: performance.now(),
        done: false,
      };
      let angle = initialAngle;
      let rotation = initialRotation;
      let endX = startX;
      let endY = startY;
      let bounceX = startX;
      let bounceY = startY;
      let burstCenterX = startCenterX;
      let burstCenterY = startCenterY;
      let tangentX = Math.cos(initialAngle + Math.PI / 2);
      let tangentY = Math.sin(initialAngle + Math.PI / 2);
      let bounceRotation = initialRotation;
      const shards = Array.from({ length: 10 }, createPlaneShard);
      const projectile = plane.cloneNode(true) as SVGSVGElement;

      const computeGuidedTarget = () => {
        const projectileCenterX = flightState.x + rect.width / 2;
        const projectileCenterY = flightState.y + rect.height / 2;
        const targetDistance = Math.hypot(pointerX - projectileCenterX, pointerY - projectileCenterY);
        const targetAngle =
          targetDistance > 1
            ? Math.atan2(pointerY - projectileCenterY, pointerX - projectileCenterX)
            : initialAngle;
        const targetCenterX = pointerX - Math.cos(targetAngle) * tipOffset;
        const targetCenterY = pointerY - Math.sin(targetAngle) * tipOffset;

        return {
          angle: targetAngle,
          distance: targetDistance,
          x: targetCenterX - rect.width / 2,
          y: targetCenterY - rect.height / 2,
        };
      };

      const computeImpact = () => {
        const target = computeGuidedTarget();
        endX = target.x;
        endY = target.y;

        const relativeVelocityX = flightState.vx - pointerVelocityX * 0.42;
        const relativeVelocityY = flightState.vy - pointerVelocityY * 0.42;
        const relativeSpeed = Math.hypot(relativeVelocityX, relativeVelocityY);
        const incomingX = relativeSpeed > 0.1 ? relativeVelocityX / relativeSpeed : Math.cos(target.angle);
        const incomingY = relativeSpeed > 0.1 ? relativeVelocityY / relativeSpeed : Math.sin(target.angle);
        const projectileCenterX = flightState.x + rect.width / 2;
        const projectileCenterY = flightState.y + rect.height / 2;
        const contactOffsetX = projectileCenterX - pointerX;
        const contactOffsetY = projectileCenterY - pointerY;
        const contactOffsetLength = Math.hypot(contactOffsetX, contactOffsetY);
        let normalX = contactOffsetLength > 2 ? contactOffsetX / contactOffsetLength : -incomingX;
        let normalY = contactOffsetLength > 2 ? contactOffsetY / contactOffsetLength : -incomingY;
        const approachDot = incomingX * normalX + incomingY * normalY;

        if (approachDot > 0) {
          normalX *= -1;
          normalY *= -1;
        }

        const dot = incomingX * normalX + incomingY * normalY;
        const reflectedX = incomingX - 2 * dot * normalX;
        const reflectedY = incomingY - 2 * dot * normalY;
        const reflectedLength = Math.hypot(reflectedX, reflectedY) || 1;
        const bounceVectorX = reflectedX / reflectedLength;
        const bounceVectorY = reflectedY / reflectedLength;
        angle = Math.atan2(incomingY, incomingX);
        const reflectedAngle = Math.atan2(bounceVectorY, bounceVectorX);
        rotation = angle * (180 / Math.PI) + 45;
        bounceRotation = reflectedAngle * (180 / Math.PI) + 45;

        const flightDistance = Math.hypot(pointerX - startCenterX, pointerY - startCenterY);
        const bounceDistance = Math.min(
          58,
          Math.max(26, flightDistance * 0.075 + relativeSpeed * 0.008)
        );

        bounceX = endX + bounceVectorX * bounceDistance;
        bounceY = endY + bounceVectorY * bounceDistance;
        burstCenterX = bounceX + rect.width / 2;
        burstCenterY = bounceY + rect.height / 2;
        tangentX = -normalY;
        tangentY = normalX;
      };

      planeShotActiveRef.current = true;
      planeShotCleanupRef.current?.();
      planeShotCleanupRef.current = null;
      planeShotTimelineRef.current?.kill();

      projectile.classList.remove(s.ctaIcon);
      projectile.classList.add(s.heroPlaneProjectile);
      projectile.setAttribute("aria-hidden", "true");
      document.body.appendChild(projectile);

      gsap.set(projectile, {
        x: startX,
        y: startY,
        rotation: initialRotation,
        autoAlpha: 1,
      });
      gsap.set(plane, { autoAlpha: 0 });
      gsap.set(shards, {
        x: burstCenterX,
        y: burstCenterY,
        autoAlpha: 0,
        scale: 0.45,
      });

      const tl = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          planeShotCleanupRef.current?.();
          planeShotCleanupRef.current = null;
          projectile.remove();
          shards.forEach((shard) => shard.remove());
          planeShotActiveRef.current = false;
          pointPlaneToPointer({ clientX: pointerX, clientY: pointerY } as PointerEvent);
        },
      });

      planeShotTimelineRef.current = tl;

      tl.add(() => {
        tl.pause();

        const finishGuidedFlight = () => {
          if (flightState.done) return;

          flightState.done = true;
          planeShotCleanupRef.current?.();
          planeShotCleanupRef.current = null;
          computeImpact();
          gsap.set(projectile, { x: endX, y: endY, rotation });
          tl.resume();
        };

        const updateGuidedFlight = () => {
          const now = performance.now();
          const dt = Math.min(0.034, Math.max(0.001, (now - flightState.lastTime) / 1000));
          flightState.lastTime = now;
          flightState.elapsed += dt;

          const target = computeGuidedTarget();
          const projectileCenterX = flightState.x + rect.width / 2;
          const projectileCenterY = flightState.y + rect.height / 2;
          const targetCenterX = target.x + rect.width / 2;
          const targetCenterY = target.y + rect.height / 2;
          const dx = targetCenterX - projectileCenterX;
          const dy = targetCenterY - projectileCenterY;
          const distance = Math.hypot(dx, dy);
          const targetAngle = distance > 0.1 ? Math.atan2(dy, dx) : angle;
          const maxSpeed = baseMaxSpeed + Math.min(3600, flightState.elapsed * 1800);
          const desiredSpeed = Math.min(
            maxSpeed,
            Math.max(420, distance * 7.2 + flightState.elapsed * 260)
          );
          const desiredVx = Math.cos(targetAngle) * desiredSpeed;
          const desiredVy = Math.sin(targetAngle) * desiredSpeed;
          const turnAmount = 1 - Math.pow(0.0008, dt);

          flightState.vx += (desiredVx - flightState.vx) * turnAmount;
          flightState.vy += (desiredVy - flightState.vy) * turnAmount;

          const speed = Math.hypot(flightState.vx, flightState.vy);
          if (speed > maxSpeed) {
            const speedScale = maxSpeed / speed;
            flightState.vx *= speedScale;
            flightState.vy *= speedScale;
          }

          flightState.x += flightState.vx * dt;
          flightState.y += flightState.vy * dt;

          const nextProjectileCenterX = flightState.x + rect.width / 2;
          const nextProjectileCenterY = flightState.y + rect.height / 2;
          const remainingDistance = Math.hypot(
            targetCenterX - nextProjectileCenterX,
            targetCenterY - nextProjectileCenterY
          );

          const travelAngle = Math.atan2(flightState.vy, flightState.vx);
          if (Number.isFinite(travelAngle)) {
            rotation = travelAngle * (180 / Math.PI) + 45;
          }

          gsap.set(projectile, {
            x: flightState.x,
            y: flightState.y,
            rotation,
          });

          const closeEnough = remainingDistance < Math.max(8, speed * dt * 0.72);
          if (closeEnough) {
            finishGuidedFlight();
          }
        };

        planeShotCleanupRef.current = () => {
          gsap.ticker.remove(updateGuidedFlight);
        };

        gsap.ticker.add(updateGuidedFlight);
      })
        .to(projectile, {
          keyframes: [
            {
              x: () => endX + tangentX * 2.2,
              y: () => endY + tangentY * 2.2,
              rotation: () => rotation + 4,
              duration: 0.028,
            },
            {
              x: () => endX - tangentX * 1.7,
              y: () => endY - tangentY * 1.7,
              rotation: () => rotation - 3,
              duration: 0.028,
            },
            { x: () => endX, y: () => endY, rotation: () => rotation, duration: 0.034 },
          ],
          ease: "none",
        })
        .to(projectile, {
          x: () => bounceX,
          y: () => bounceY,
          rotation: () => bounceRotation,
          duration: 0.36,
          ease: "power4.out",
        })
        .to(projectile, {
          autoAlpha: 0,
          scale: 0.28,
          rotation: () => bounceRotation + 58,
          duration: 0.07,
          ease: "power2.out",
        })
        .set(shards, { x: () => burstCenterX, y: () => burstCenterY, autoAlpha: 1, scale: 0.58 }, "<")
        .to(
          shards,
          {
            x: (index) => {
              const shardAngle = angle + (index - 4.5) * 0.42;
              return burstCenterX + Math.cos(shardAngle) * (24 + index * 3);
            },
            y: (index) => {
              const shardAngle = angle + (index - 4.5) * 0.42;
              return burstCenterY + Math.sin(shardAngle) * (20 + index * 2.6);
            },
            rotation: (index) => rotation + index * 31,
            autoAlpha: 0,
            scale: 0.12,
            duration: 0.42,
            stagger: 0.012,
            ease: "power3.out",
          },
          "<"
        )
        .fromTo(
          plane,
          {
            x: -30,
            y: 24,
            rotation: -18,
            autoAlpha: 0,
          },
          {
            x: 0,
            y: 0,
            rotation: 0,
            autoAlpha: 1,
            duration: 0.34,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
          "-=0.18"
        );
    };

    const handleCtaEnter = () => {
      ctaHoverRef.current = true;
      resetPlane();
    };

    const handleCtaLeave = () => {
      ctaHoverRef.current = false;
    };

    heroRoot.addEventListener("pointermove", pointPlaneToPointer);
    heroRoot.addEventListener("pointerleave", resetPlane);
    heroRoot.addEventListener("click", shootPlaneAtPointer);
    window.addEventListener("pointermove", updatePointerPosition);
    ctaElement?.addEventListener("pointerenter", handleCtaEnter);
    ctaElement?.addEventListener("pointerleave", handleCtaLeave);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      planeShotCleanupRef.current?.();
      planeShotCleanupRef.current = null;
      planeShotTimelineRef.current?.kill();
      planeShotActiveRef.current = false;
      document.querySelectorAll(`.${s.heroPlaneProjectile}, .${s.heroPlaneShard}`)
        .forEach((element) => element.remove());
      gsap.set(plane, { clearProps: "transform,opacity,visibility" });
      heroRoot.removeEventListener("pointermove", pointPlaneToPointer);
      heroRoot.removeEventListener("pointerleave", resetPlane);
      heroRoot.removeEventListener("click", shootPlaneAtPointer);
      window.removeEventListener("pointermove", updatePointerPosition);
      ctaElement?.removeEventListener("pointerenter", handleCtaEnter);
      ctaElement?.removeEventListener("pointerleave", handleCtaLeave);
    };
  }, [heroMode]);

  const getExploreOriginFromEvent = (
    event: ReactMouseEvent<HTMLElement>
  ) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const originX =
      event.detail === 0
        ? buttonRect.left + buttonRect.width / 2
        : event.clientX;
    const originY =
      event.detail === 0
        ? buttonRect.top + buttonRect.height / 2
        : event.clientY;

    return {
      x: `${originX}px`,
      y: `${originY}px`,
    };
  };

  const syncExploreOrigin = (origin: { x: string; y: string }) => {
    const overlay = exploreContentRef.current;

    if (overlay) {
      overlay.style.setProperty("--hero-explore-origin-x", origin.x);
      overlay.style.setProperty("--hero-explore-origin-y", origin.y);
    }

    setExploreReveal(origin);
  };

  const clearCloseExploreTimer = () => {
    if (closeExploreTimerRef.current === null) return;
    window.clearTimeout(closeExploreTimerRef.current);
    closeExploreTimerRef.current = null;
  };

  const openExplore = (event: ReactMouseEvent<HTMLButtonElement>) => {
    clearCloseExploreTimer();
    returnFocusAfterCloseRef.current = true;
    syncExploreOrigin(getExploreOriginFromEvent(event));
    setSelectedScenarioId(defaultConcernScenarioId);
    setPreviewScenarioId(null);
    setHeroMode("explore");
  };

  const closeExplore = (event?: ReactMouseEvent<HTMLElement>) => {
    if (heroMode === "default") return;

    clearCloseExploreTimer();
    returnFocusAfterCloseRef.current = true;
    if (event) {
      syncExploreOrigin(getExploreOriginFromEvent(event));
    }

    if (prefersReducedMotion()) {
      setHeroMode("default");
      return;
    }

    setHeroMode("closing");
    closeExploreTimerRef.current = window.setTimeout(() => {
      closeExploreTimerRef.current = null;
      setHeroMode("default");
    }, 720);
  };

  const openPanelLeadForm = (topic?: string) => {
    clearCloseExploreTimer();
    returnFocusAfterCloseRef.current = false;
    setHeroMode("default");
    window.setTimeout(
      () => openLeadForm(topic),
      prefersReducedMotion() ? 80 : 360
    );
  };

  const handlePanelCtaSelect = () => {
    openPanelLeadForm(activeScenario.leadTopic);
  };

  const handleScenarioSelect = (scenarioId: ConcernScenarioId) => {
    setSelectedScenarioId(scenarioId);
    setPreviewScenarioId(null);
  };

  const handleScenarioPreview = (
    scenarioId: ConcernScenarioId,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (event.pointerType !== "mouse") return;
    setPreviewScenarioId(scenarioId);
  };

  const clearScenarioPreview = () => {
    setPreviewScenarioId(null);
  };

  // const next = () => setIndex((i) => (i + 1) % variants.length);
  // const prev = () =>
  //   setIndex((i) => (i - 1 + variants.length) % variants.length);

  return (
    <section
      ref={heroRef}
      className={s.heroCont}
      data-hero-mode={heroMode}
    >
      <span hidden>{activeSession}</span>
      <div className={s.bgLayer} />
      <div className={s.heroContainer}>
        <div className={s.heroLayout}>
          <div className={`${s.heroInner} ${s.heroTextCol}`}>
            <div className={s.heroDefaultContent}>
              {content.eyebrow ? (
                <p className={s.eyebrow}>{content.eyebrow}</p>
              ) : null}

              <h1 className={s.title}>
                <span className={s.titleLine}>
                  {hasHighlight ? (
                    <>
                      {before}
                      <GradientText
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
                <div className={s.heroActionRow}>
                  <HeroCTAClient
                    label={content.cta.primary.label}
                    location="hero"
                    iconRight={
                      <Send ref={ctaPlaneRef} className={s.ctaIcon} aria-hidden />
                    }
                    size="md"
                    className={s.heroCta}
                  />
                  <button
                    ref={exploreButtonRef}
                    type="button"
                    className={s.heroSecondaryCta}
                    aria-expanded={isExploreVisible}
                    aria-controls={explorePanelId}
                    onClick={openExplore}
                  >
                    <span className={s.heroSecondaryIcon} aria-hidden="true">
                      <Compass />
                    </span>
                    <span className={s.heroSecondaryText}>
                      {content.cta.secondary?.label ?? "Co právě řešíte?"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {portalReady
              ? createPortal(
                  <div
                    ref={exploreContentRef}
                    id={explorePanelId}
                    className={`${s.heroExploreOverlay} ${
                      isExplore ? s.heroExploreOverlayOpen : ""
                    } ${
                      isExploreClosing ? s.heroExploreOverlayClosing : ""
                    }`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={exploreHeadingId}
                    aria-hidden={!isExploreVisible}
                    style={
                      {
                        "--hero-explore-origin-x": exploreReveal.x,
                        "--hero-explore-origin-y": exploreReveal.y,
                      } as HeroExploreOverlayStyle
                    }
                  >
                    <button
                      type="button"
                      className={s.heroExploreScrim}
                      aria-label="Zavřít výběr situace"
                      tabIndex={-1}
                      onClick={closeExplore}
                    />
                    <div className={s.heroExploreDrawer}>
                      <div className={s.heroExplorePanel}>
                        <div className={s.heroExploreLayout}>
                          <div className={s.heroExploreGroups}>
                            <div className={s.heroExploreHead}>
                              <div className={s.heroExploreHeaderCopy}>
                                <div className={s.heroExploreHeaderTop}>
                                  <button
                                    type="button"
                                    className={s.heroExploreBack}
                                    onClick={closeExplore}
                                  >
                                    <ArrowLeft aria-hidden="true" />
                                    Zpět na úvod
                                  </button>
                                </div>
                                <h2
                                  ref={exploreHeadingRef}
                                  id={exploreHeadingId}
                                  tabIndex={-1}
                                >
                                  Vyberte situaci, která je vám nejblíž.
                                </h2>
                                <p>
                                  Nemusíte přesně vědět, jakou službu
                                  potřebujete. Stačí vybrat, co právě řešíte —
                                  a hned uvidíte, na co se spolu zaměříme a
                                  jaký další krok dává smysl.
                                </p>
                              </div>
                            </div>

                            <section className={s.heroExploreTopicGroup}>
                              <p className={s.heroIntentGroupLabel}>
                                Vyberte situaci
                              </p>
                              <div
                                className={s.heroIntentGrid}
                                aria-label="Situace k ujasnění"
                              >
                                {concernScenarios.map((item) => {
                                  const Icon = item.icon;
                                  const isSelected =
                                    selectedScenarioId === item.id;
                                  const isPreview =
                                    previewScenarioId === item.id &&
                                    !isSelected;

                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className={`${s.heroIntentItem} ${
                                        isSelected ? s.heroIntentItemActive : ""
                                      } ${
                                        isPreview ? s.heroIntentItemPreview : ""
                                      }`}
                                      aria-pressed={isSelected}
                                      onPointerEnter={(event) =>
                                        handleScenarioPreview(item.id, event)
                                      }
                                      onPointerLeave={clearScenarioPreview}
                                      onFocus={() =>
                                        setPreviewScenarioId(item.id)
                                      }
                                      onBlur={clearScenarioPreview}
                                      onClick={() =>
                                        handleScenarioSelect(item.id)
                                      }
                                    >
                                      <span
                                        className={s.heroIntentIcon}
                                        aria-hidden="true"
                                      >
                                        <Icon />
                                      </span>
                                      <span className={s.heroIntentCopy}>
                                        <span className={s.heroIntentLabel}>
                                          {item.title}
                                        </span>
                                        <span
                                          className={s.heroIntentDescription}
                                        >
                                          {item.description}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </section>

                            <section className={s.heroExploreSecondary}>
                              <p className={s.heroExploreSecondaryLabel}>
                                Nejste si jistí? Projděte si:
                                <span className={s.heroExploreSecondaryLinks}>
                                  {heroSecondaryLinks.map((link, index) => (
                                    <span
                                      key={link.href}
                                      className={s.heroExploreSecondaryItem}
                                    >
                                      {index > 0 ? (
                                        <span
                                          className={
                                            s.heroExploreSecondarySeparator
                                          }
                                          aria-hidden="true"
                                        >
                                          ·
                                        </span>
                                      ) : null}
                                      <HashLink
                                        href={link.href}
                                        className={s.heroExploreSecondaryLink}
                                        onClick={() => {
                                          closeExplore();
                                        }}
                                      >
                                        {link.label}
                                      </HashLink>
                                    </span>
                                  ))}
                                </span>
                              </p>
                            </section>
                          </div>

                          <ConcernDetailPanel
                            key={activeScenario.id}
                            scenario={activeScenario}
                            scenarioIndex={activeScenarioIndex}
                            onCtaClick={handlePanelCtaSelect}
                          />
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body,
                )
              : null}

          </div>

          <div
            className={s.heroMediaCol}
            data-hero-media-variant="portrait-text-cards"
          >
            <HeroPortraitFigure
              showNavButtons={false}
              showTrustCards={showPortraitTrustCards}
            />
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
