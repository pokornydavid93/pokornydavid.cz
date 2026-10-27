import s from "../SystemPreview.module.css";

const cards = [
  {
    label: "Služba",
    title: "Hypotéka",
    description:
      "Srovnání možností, dopad na rozpočet a plán, který počítá i s rezervou.",
    action: "Probrat hypotéku",
  },
  {
    label: "Ochrana",
    title: "Pojištění",
    description:
      "Zkontroluji, kde má krytí smysl a kde jen zbytečně zatěžuje vaše měsíční náklady.",
    action: "Zkontrolovat pojištění",
  },
  {
    label: "Budoucnost",
    title: "Investice",
    description:
      "Postavím vám investiční plán podle horizontu, rizika a toho, co má financovat.",
    action: "Najít investiční směr",
  },
];

export default function PreviewDarkCards() {
  return (
    <section
      className={`${s.section} ${s.darkCardsSection}`}
      aria-labelledby="preview-dark-cards-title"
    >
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Dark cards</span>
        <code className={s.surfaceTokenBadge}>--surface-section-dark</code>
      </div>
      <div className={s.container}>
        <div className={s.sectionHeader}>
          <p className={s.eyebrow}>Decision areas</p>
          <h2 id="preview-dark-cards-title">Co právě řešíte</h2>
          <p>
            Tmavé karty ukazují opakovatelný pattern pro hlavní oblasti, které
            vedou k dalšímu konkrétnímu kroku.
          </p>
        </div>
        <div className={s.cardGrid}>
          {cards.map((card) => (
            <article key={card.title} className={s.darkCard}>
              <span className={s.cardSignal} aria-hidden="true" />
              <span className={s.tokenName}>--surface-card-dark</span>
              <p className={s.cardLabel}>{card.label}</p>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <button className={s.textAction} type="button">
                {card.action}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
