"use client";

import { useMemo, useState } from "react";
import {
  Check,
  HandCoins,
  LineChart,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import s from "./process.module.css";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { Reveal } from "@/app/ui/animations/Reveal";

type Step = {
  id: string;
  title: string;
  kicker: string;
  description: string;
  bullets: string[];
  icon: React.ReactElement;
  image: string;
  badge?: string;
};

const steps: Step[] = [
  {
    id: "uvod",
    title: "Úvodní konzultace",
    kicker: "15 minut",
    description:
      "Krátký úvodní hovor, kde si ujasníme, co aktuálně řešíte a co od spolupráce očekáváte. Bez závazků a bez tlaku na konkrétní řešení.",
    bullets: [
      "rychlé zorientování v situaci",
      "pojmenování hlavních priorit",
      "jasný návrh dalšího kroku",
    ],
    icon: <Sparkles size={24} />,
    image: "/uvod.avif",
    badge: "Start bez závazků",
  },
  {
    id: "analyza",
    title: "Analýza financí",
    kicker: "Data, která dávají smysl",
    description:
      "Podíváme se na příjmy, výdaje, rezervy a existující smlouvy. Cílem není složitý report, ale pochopení reality a jasný obraz celé situace.",
    bullets: [
      "přehled, kam peníze skutečně odcházejí",
      "vyhodnocení rezerv a závazků",
      "rozdělení věcí na důležité a zbytné",
    ],
    icon: <HandCoins size={24} />,
    image: "/analyza.avif",
    badge: "Transparentně",
  },
  {
    id: "navrh",
    title: "Návrh řešení",
    kicker: "Plán na míru",
    description:
      "Na základě analýzy připravím konkrétní plán. Vysvětlím souvislosti, varianty a dopady, abyste se mohli rozhodovat s klidem.",
    bullets: [
      "jasná struktura kroků v čase",
      "přehled nákladů a přínosů",
      "řešení sladěné s vašimi cíli",
    ],
    icon: <LineChart size={24} />,
    image: "/navrh.avif",
    badge: "Konkrétní plán",
  },
  {
    id: "upravy",
    title: "Úpravy a doporučení",
    kicker: "Prostor pro rozhodnutí",
    description:
      "Návrh společně projdeme, doladíme a případně upravíme. Cílem je řešení, které je pochopitelné, proveditelné a dává vám smysl.",
    bullets: [
      "otevřený prostor pro otázky",
      "úpravy tempa, rozsahu i priorit",
      "rozhodnutí bez časového tlaku",
    ],
    icon: <SlidersHorizontal size={24} />,
    image: "/upravy.avif",

    badge: "Bez nátlaku",
  },
  {
    id: "pece",
    title: "Dlouhodobá péče",
    kicker: "Kontrola a revize",
    description:
      "Spolupráce nekončí podpisem. Průběžně hlídáme, aby plán odpovídal vašemu životu a reagoval na změny, když nastanou.",
    bullets: [
      "pravidelné servisní schůzky",
      "úpravy při změně životní situace",
      "dlouhodobá kontinuita a dohled",
    ],
    icon: <ShieldCheck size={24} />,
    image: "/pece.avif",
    badge: "Partnerství",
  },
];

const Process = () => {
  const { openLeadForm } = useLeadFormModal();
  const [activeId, setActiveId] = useState<string>(steps[0].id);

  const activeStep = useMemo(
    () => steps.find((step) => step.id === activeId) ?? steps[0],
    [activeId]
  );

  return (
    <div className={s.processCont}>
      <Container className={`${s.processInner}`}>
        <Reveal as="div" from="bottom">
          <div className={s.sectionHeader}>
            <p className={s.eyebrow}>Průběh spolupráce</p>
            <div className={s.headlineWrap}>
              <h2>Jednoduchý proces, který dává smysl.</h2>
              <p>Postupně si projdeme, co řešíme a jaký je další krok.</p>
            </div>
          </div>
        </Reveal>

        <div className={s.grid}>
          <div className={s.listCol}>
            <ul className={s.stepList}>
              {steps.map((step, idx) => {
                const isActive = activeStep.id === step.id;

                return (
                  <Reveal
                    key={step.id}
                    as="li"
                    from="left"
                    delay={0.1}
                    stagger={0.08}
                    index={idx}
                  >
                    <button
                      type="button"
                      className={`${s.stepCard} ${isActive ? s.active : ""}`}
                      onClick={() => setActiveId(step.id)}
                      aria-pressed={isActive}
                    >
                      <span className={s.stepIcon}>{step.icon}</span>
                      <div className={s.stepCopy}>
                        <h4>{step.title}</h4>
                        <p>{step.kicker}</p>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </ul>
          </div>

          <div className={s.detailCol}>
            <div className={s.detailCard}>
             
                <div
                  className={s.detailMedia}
                  style={{
                    backgroundImage: `linear-gradient(150deg, rgba(12, 42, 34, 0.65), rgba(12, 42, 34, 0.15)), url(${activeStep.image})`,
                  }}
                  role="presentation"
                >
                  {activeStep.badge && (
                    <span className={s.badge}>{activeStep.badge}</span>
                  )}
                </div>

              <div className={s.detailBody}>
                <Reveal
                  as="div"
                  from="left"
                  className={s.detailEyebrow}
                  delay={0.05}
                >
                  {activeStep.kicker}
                </Reveal>

                <Reveal as="h3" from="left" delay={0.12}>
                  {activeStep.title}
                </Reveal>

                <Reveal
                  as="p"
                  from="left"
                  className={s.detailLead}
                  delay={0.18}
                >
                  {activeStep.description}
                </Reveal>

                <ul className={s.bullets}>
                  {activeStep.bullets.map((item, i) => (
                    <Reveal
                      key={item}
                      as="li"
                      from="left"
                      delay={0.26}
                      stagger={0.06}
                      index={i}
                    >
                      <span className={s.checkIcon}>
                        <Check size={18} />
                      </span>
                      <span>{item}</span>
                    </Reveal>
                  ))}
                </ul>

                <div className={s.buttonRow}>
                  <Reveal
                    as="div"
                    from="left"
                    delay={0.26 + activeStep.bullets.length * 0.06 + 0.08}
                  >
                    <Button
                      variant="cta"
                      className={s.cta}
                      aria-label="Probrat vaši situaci"
                      onClick={() => openLeadForm()}
                    >
                      Probrat vaši situaci
                    </Button>
                  </Reveal>

                  <Reveal
                    as="div"
                    from="left"
                    delay={0.26 + activeStep.bullets.length * 0.06 + 0.14}
                  >
                    <Button
                      variant="secondary"
                      className={s.nextBtn}
                      onClick={() => {
                        const currentIdx = steps.findIndex(
                          (step) => step.id === activeStep.id
                        );
                        const nextIdx = (currentIdx + 1) % steps.length;
                        setActiveId(steps[nextIdx].id);
                      }}
                    >
                      Další krok →
                    </Button>
                  </Reveal>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Process;
