"use client";

import { CalendarCheck, Send, ShieldCheck } from "lucide-react";

import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import Button from "@/app/ui/cta/Button";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import s from "./storyFlow.module.css";

const firstStepPoints = [
  "Krátce si ujasníme, co právě řešíte.",
  "Nezávazně zjistíte, jaký krok dává smysl.",
  "Bez tlaku na produkt nebo okamžité rozhodnutí.",
];

export default function StoryFirstStep() {
  const { openLeadForm } = useLeadFormModal();
  const label = "Domluvit úvodní konzultaci";

  const onCtaClick = () => {
    gaEvent("cta_click", { location: "story_first_step", label });
    gaEvent("lead_modal_open", { location: "story_first_step" });
    openLeadForm("Jiná situace");
  };

  return (
    <section className={`${s.storyChapterSection} ${s.firstStepSection}`}>
      <div className={s.storyChapterInner} data-story-first-step-content>
        <div className={s.storyChapterCopy}>
          <p className={s.storyEyebrow}>První krok</p>
          <h2>Začněme tím, co teď opravdu řešíte.</h2>
          <p className={s.storyLead}>
            Nemusíte mít připravené podklady ani přesnou otázku. Stačí popsat
            situaci a společně určíme, jestli a jak má smysl pokračovat.
          </p>
        </div>

        <aside className={s.firstStepCard}>
          <div className={s.firstStepIcon} aria-hidden="true">
            <CalendarCheck size={24} strokeWidth={1.8} />
          </div>
          <h3>Úvodní konzultace</h3>
          <ul>
            {firstStepPoints.map((point) => (
              <li key={point}>
                <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <Button
            className={s.firstStepCta}
            data-story-first-step-cta
            iconRight={<Send aria-hidden="true" size={17} strokeWidth={1.8} />}
            onClick={onCtaClick}
            variant="cta"
          >
            {label}
          </Button>
        </aside>
      </div>
    </section>
  );
}
