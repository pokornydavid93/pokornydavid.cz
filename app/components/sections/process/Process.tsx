'use client';

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
    kicker: "15 minut online",
    description:
      "Krátce si projdeme, co řešíte a co je pro vás nejdůležitější. Zjistíte, jak pracuji, bez tlaku na produkt.",
    bullets: [
      "rychlé zorientování a jasný další krok",
      "první doporučení hned po hovoru",
      "vnímám vaše priority a tempo",
    ],
    icon: <Sparkles size={24} />,
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80&sat=-18&exp=-6",
    badge: "Start bez závazků",
  },
  {
    id: "analyza",
    title: "Analýza financí",
    kicker: "Data, která dávají smysl",
    description:
      "Zmapujeme příjmy, výdaje, rezervy i stávající smlouvy. Díky tomu víte, kde jsou příležitosti a rizika.",
    bullets: [
      "přehled o tokách peněz a rezervách",
      "porovnání existujících smluv",
      "co řešit hned a co může počkat",
    ],
    icon: <HandCoins size={24} />,
    image:
      "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80&sat=-18&exp=-6",
    badge: "Transparentně",
  },
  {
    id: "navrh",
    title: "Návrh řešení",
    kicker: "Plán na míru",
    description:
      "Představím konkrétní plán, který sedí na vaši situaci. Vysvětlím proč a jak, bez složitých termínů.",
    bullets: [
      "prioritizovaný postup krok za krokem",
      "jasné náklady a přínosy",
      "řešení laděné na vaše cíle",
    ],
    icon: <LineChart size={24} />,
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80&sat=-18&exp=-6",
    badge: "Konkrétní plán",
  },
  {
    id: "upravy",
    title: "Úpravy a doporučení",
    kicker: "Prostor pro otázky",
    description:
      "Společně doladíme detaily. Vyzkoušíme varianty, aby se řešení cítilo pohodlně a realisticky.",
    bullets: [
      "otevřená Q&A k návrhu",
      "doladění rozpočtu i časování",
      "nechávám vám klid na rozhodnutí",
    ],
    icon: <SlidersHorizontal size={24} />,
    image:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80&sat=-20&exp=-6",
    badge: "Bez tlaku",
  },
  {
    id: "pece",
    title: "Dlouhodobá péče",
    kicker: "Kontrola a revize",
    description:
      "Hlídáme, aby plán držel krok s vaším životem. Pravidelné revize, upozornění na změny a rychlá reakce, když je potřeba.",
    bullets: [
      "pravidelné servisní schůzky",
      "aktualizace při změně situace",
      "spoleh, že nezůstanete sami",
    ],
    icon: <ShieldCheck size={24} />,
    image:
      "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=1600&q=80&sat=-18&exp=-5",
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
      <Container className={s.processInner}>
        <div className={s.sectionHeader}>
          <p className={s.eyebrow}>Průběh spolupráce</p>
          <div className={s.headlineWrap}>
            <h2>Jednoduchý proces, který ladí s vámi</h2>
            <p>
              Jasné kroky, žádné zbytečné složitosti. Klikněte na krok vlevo a
              uvidíte, co přesně vás čeká.
            </p>
          </div>
        </div>

        <div className={s.grid}>
          <div className={s.listCol}>
            <ul className={s.stepList}>
              {steps.map((step, idx) => {
                const isActive = activeStep.id === step.id;
                return (
                  <li key={step.id}>
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
                  </li>
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
                <div className={s.detailEyebrow}>{activeStep.kicker}</div>
                <h3>{activeStep.title}</h3>
                <p className={s.detailLead}>{activeStep.description}</p>

                <ul className={s.bullets}>
                  {activeStep.bullets.map((item) => (
                    <li key={item}>
                      <span className={s.checkIcon}>
                        <Check size={18} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="cta"
                  className={s.cta}
                  aria-label="Sjednat konzultaci"
                  onClick={() => openLeadForm()}
                >
                  Sjednat konzultaci
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Process;
