import s from "../SystemPreview.module.css";

const trustItems = ["Nezávislé srovnání", "Bez tlaku", "Jasný další krok"];

export default function PreviewHero() {
  return (
    <section
      className={`${s.section} ${s.heroSection}`}
      aria-labelledby="preview-hero-title"
    >
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Hero composition</span>
        <code className={s.surfaceTokenBadge}>--surface-hero</code>
      </div>
      <div className={`${s.container} ${s.heroGrid}`}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>FINANČNÍ PLÁN, KTERÝ DÁVÁ SMYSL</p>
          <h2 id="preview-hero-title">
            Nejdřív přehled. Potom jasný plán.
          </h2>
          <p>
            Finance nemusí být složitá změť produktů. Začínají pochopením
            toho, co právě řešíte a kam se chcete dostat.
          </p>
          <div className={s.heroActions}>
            <button className={s.primaryButton} type="button">
              Získat přehled
            </button>
            <a className={s.secondaryButton} href="#preview-process">
              Jak spolupráce funguje
            </a>
          </div>
          <ul className={s.heroTrustList} aria-label="Trust signals">
            {trustItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={s.heroVisual} aria-label="Visual system frame">
          <div className={s.visualFrame}>
            <span className={s.tokenName}>--surface-card-dark</span>
            <div className={s.visualPortrait}>
              <span>Portrait frame</span>
              <strong>PD</strong>
            </div>
            <div className={s.visualMetric}>
              <span>Plan clarity</span>
              <strong>82%</strong>
            </div>
            <div className={s.visualLedger}>
              <span>Cashflow</span>
              <span>Riziko</span>
              <span>Rezerva</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
