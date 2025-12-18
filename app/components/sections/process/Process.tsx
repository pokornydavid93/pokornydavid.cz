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
    kicker: "15 minut",
    description:
      "Krátký úvodní hovor, kde si ujasníme, co aktuálně řešíte a co od spolupráce očekáváte. Bez závazků a bez tlaku na konkrétní řešení.",
    bullets: [
      "rychlé zorientování v situaci",
      "pojmenování hlavních priorit",
      "jasný návrh dalšího kroku",
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
      "Podíváme se na příjmy, výdaje, rezervy a existující smlouvy. Cílem není složitý report, ale pochopení reality a jasný obraz celé situace.",
    bullets: [
      "přehled, kam peníze skutečně odcházejí",
      "vyhodnocení rezerv a závazků",
      "rozdělení věcí na důležité a zbytné",
    ],
    icon: <HandCoins size={24} />,
    image:
      "https://images.unsplash.com/photo-1707902665498-a202981fb5ac?auto=format&fit=crop&w=1600&q=80&sat=-22&exp=-6",
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
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80&sat=-18&exp=-6",
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
    image:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80&sat=-20&exp=-6",
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
    image:
      "https://images.unsplash.com/photo-1707301280406-55612d3bb9db?auto=format&fit=crop&w=1600&q=80&sat=-18&exp=-6",
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
      <Container className={`${s.processInner} reveal`}>
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
