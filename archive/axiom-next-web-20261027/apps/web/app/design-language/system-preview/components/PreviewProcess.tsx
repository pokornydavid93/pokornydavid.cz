import s from "../SystemPreview.module.css";

const steps = [
  {
    number: "01",
    title: "Zorientujeme se",
    description:
      "Krátce projdeme současnou situaci, cíle, závazky a místa, kde vzniká nejistota.",
  },
  {
    number: "02",
    title: "Sestavíme plán",
    description:
      "Oddělíme důležité od vedlejšího a určíme pořadí kroků podle dopadu.",
  },
  {
    number: "03",
    title: "Uděláme konkrétní kroky",
    description:
      "Vybereme řešení, které odpovídá realitě a dá se dlouhodobě udržet.",
  },
];

export default function PreviewProcess() {
  return (
    <section
      id="preview-process"
      className={`${s.section} ${s.processSection}`}
      aria-labelledby="preview-process-title"
    >
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Process rhythm</span>
        <code className={s.surfaceTokenBadge}>--surface-page</code>
      </div>
      <div className={s.container}>
        <div className={s.sectionHeader}>
          <p className={s.eyebrow}>Process</p>
          <h2 id="preview-process-title">Od přehledu ke konkrétnímu kroku</h2>
          <p>
            Proces není další mřížka karet. Slouží jako rytmus čtení, osa a
            rozdělení rozhodnutí na srozumitelné části.
          </p>
        </div>
        <div className={s.processTrack}>
          {steps.map((step) => (
            <article key={step.number} className={s.processStep}>
              <span className={s.stepNumber}>{step.number}</span>
              <div className={s.processCopy}>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
