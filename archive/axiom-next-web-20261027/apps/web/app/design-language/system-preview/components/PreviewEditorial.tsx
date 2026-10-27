import s from "../SystemPreview.module.css";

const bullets = [
  "co drží rozpočet pohromadě",
  "kde je zbytečné riziko",
  "který další krok má největší dopad",
];

export default function PreviewEditorial() {
  return (
    <section
      className={`${s.section} ${s.editorialSection}`}
      aria-labelledby="preview-editorial-title"
    >
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Light editorial</span>
        <code className={s.surfaceTokenBadge}>--surface-section-light</code>
      </div>
      <div className={`${s.container} ${s.editorialGrid}`}>
        <div className={s.editorialCopy}>
          <p className={s.eyebrow}>Editorial surface</p>
          <h2 id="preview-editorial-title">
            Rozhodnutí se dělají lépe, když máte celý obraz.
          </h2>
          <p>
            Světlá plocha dává prostor delšímu vysvětlení, klidnému čtení a
            jasnému shrnutí důvodů bez tlaku na okamžitou akci.
          </p>
          <p>
            Tady se testuje kontrast textu, šířka odstavců, citace a seznamy na
            čitelné editoriální vrstvě.
          </p>
          <ul>
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a className={s.editorialLink} href="#preview-form">
            Projít ukázkový screening
          </a>
        </div>
        <aside className={s.paperBlock} aria-label="Case study excerpt">
          <span className={s.tokenName}>--surface-paper</span>
          <p className={s.paperLabel}>Case study</p>
          <blockquote>
            „Když klient poprvé vidí finance v jednom obrazu, největší změna je
            klid. Najednou ví, co počká a co má řešit hned.“
          </blockquote>
          <div className={s.paperStat}>
            <strong>3 kroky</strong>
            <span>od nejasnosti k rozhodnutí</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
