import { Quote, ShieldCheck, Star } from "lucide-react";

import s from "./storyFlow.module.css";

const proofQuotes = [
  {
    quote:
      "Vše vysvětluje srozumitelně, jedná férově a zajímá se o to, co klient opravdu potřebuje.",
    name: "Lukáš Kratochvíl",
  },
  {
    quote:
      "Nehledá rychlý prodej, ale dlouhodobé řešení. Je znát, že mu nejde jen o čísla, ale hlavně o lidi.",
    name: "Daniel Dvořák",
  },
  {
    quote:
      "Díky spolupráci mám větší jistotu a přehled ve svých financích.",
    name: "Denisa Řezníčková",
  },
];

const proofMetrics = [
  "200+ klientů",
  "5+ let zkušeností",
  "Google reference",
];

export default function StoryProof() {
  return (
    <section className={`${s.storyChapterSection} ${s.proofSection}`}>
      <div className={s.storyChapterInner} data-story-proof-content>
        <div className={s.storyChapterCopy}>
          <p className={s.storyEyebrow}>Důvěra v praxi</p>
          <h2>Klidné rozhodnutí vzniká z jasného vysvětlení.</h2>
          <p className={s.storyLead}>
            Klienti nejčastěji oceňují srozumitelnost, férové jednání a
            dlouhodobý přístup bez tlaku na rychlé rozhodnutí.
          </p>

          <div className={s.proofMetricRow} aria-label="Důvěryhodnost">
            {proofMetrics.map((metric) => (
              <span key={metric}>
                <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.8} />
                {metric}
              </span>
            ))}
          </div>
        </div>

        <div className={s.proofGrid} data-story-proof-cards>
          {proofQuotes.map((item) => (
            <article className={s.proofCard} key={item.name}>
              <div className={s.proofCardTop}>
                <Quote aria-hidden="true" size={18} strokeWidth={1.8} />
                <span aria-label="Hodnocení 5 z 5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      aria-hidden="true"
                      fill="currentColor"
                      key={index}
                      size={13}
                      strokeWidth={1.8}
                    />
                  ))}
                </span>
              </div>
              <p>{item.quote}</p>
              <footer>{item.name}</footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
