import {
  Phone,
  LineChart,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import s from "./process.module.css";
import Container from "@/app/ui/container/Container";
import RevealClient from "@/app/ui/animations/RevealClient";
import ProcessTimelineEnhancer from "./ProcessTimelineEnhancer.client";

const STEPS = [
  {
    title: "Úvodní konzultace",
    text: "Krátký úvodní hovor, kde si ujasníme, co aktuálně řešíte a co od spolupráce očekáváte. Bez závazků a bez tlaku na konkrétní řešení.",
    icon: Phone,
  },
  {
    title: "Analýza financí",
    text: "Podíváme se na příjmy, výdaje, rezervy a existující smlouvy. Cílem není složitý report, ale pochopení reality a jasný obraz celé situace.",
    icon: LineChart,
  },
  {
    title: "Návrh řešení",
    text: "Na základě analýzy připravím konkrétní plán. Vysvětlím souvislosti, varianty a dopady, abyste se mohli rozhodovat s klidem.",
    icon: Sparkles,
  },
  {
    title: "Úpravy a doporučení",
    text: "Návrh společně projdeme, doladíme a případně upravíme. Cílem je řešení, které je pochopitelné, proveditelné a dává vám smysl.",
    icon: SlidersHorizontal,
  },
  {
    title: "Dlouhodobá péče",
    text: "Spolupráce nekončí podpisem. Průběžně hlídáme, aby plán odpovídal vašemu životu a reagoval na změny, když nastanou.",
    icon: ShieldCheck,
  },
] as const;

export default function ProcessTimeline() {
  return (
    <div className={s.processTimeline} data-process-timeline>
      <Container className={s.inner}>
        <RevealClient from="bottom">
          <div className={s.header}>
            <div className={s.headline}>
              <p className={s.eyebrow}>Jak probíhá spolupráce</p>
              <h2>Jednoduchý proces, který dává smysl.</h2>
              <p>Postupně si projdeme, co řešíme a jaký je další krok.</p>
            </div>
          </div>
        </RevealClient>

        <div className={s.timelineArea}>
          <div className={s.steps} data-process-steps>
            <div className={s.rail} aria-hidden>
              <div className={s.railTrack} />
              <div className={s.railFill} data-process-rail-fill />
            </div>

            {STEPS.map((step, idx) => (
              <div className={s.step} key={step.title}>
                <div className={s.railColumn}>
                  <div className={s.marker}>
                    <div className={s.stepNumber} data-process-point>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                  </div>
                </div>

                <div
                  className={`${s.stepBody} ${
                    idx % 2 === 0 ? s.stepBodyLeft : s.stepBodyRight
                  }`}
                  data-process-body
                >
                  <div className={s.stepHeader}>
                    <h3>{step.title}</h3>
                  </div>
                  <p className={s.copy}>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ProcessTimelineEnhancer />
      </Container>
    </div>
  );
}
