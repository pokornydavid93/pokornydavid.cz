import s from "../SystemPreview.module.css";

export default function PreviewFinalCta() {
  return (
    <section
      className={`${s.section} ${s.finalCtaSection}`}
      aria-labelledby="preview-final-cta-title"
    >
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Final CTA</span>
        <code className={s.surfaceTokenBadge}>--surface-section-dark-deep</code>
      </div>
      <div className={s.container}>
        <article className={s.finalCtaCard}>
          <span className={s.tokenName}>--surface-card-dark</span>
          <div>
            <p className={s.eyebrow}>Next step</p>
            <h2 id="preview-final-cta-title">
              Jasný plán začíná jedním rozhovorem.
            </h2>
            <p>
              Bez závazku. Bez tlaku. Nejdřív si uděláme přehled.
            </p>
          </div>
          <button className={s.primaryButton} type="button">
            Domluvit konzultaci
          </button>
        </article>
      </div>
    </section>
  );
}
