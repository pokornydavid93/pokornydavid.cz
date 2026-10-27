import s from "../SystemPreview.module.css";

export default function PreviewActionSurfaces() {
  return (
    <section
      className={`${s.section} ${s.actionSurfacesSection}`}
      aria-labelledby="preview-action-title"
    >
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Action surfaces</span>
        <code className={s.surfaceTokenBadge}>
          --surface-action / --surface-action-dark
        </code>
      </div>
      <div className={s.container}>
        <div className={s.sectionHeader}>
          <p className={s.eyebrow}>Action surfaces</p>
          <h2 id="preview-action-title">Akce má vlastní plochu</h2>
          <p>
            Lime a forest akční plochy testují konverzní momenty odděleně od
            běžných sekcí a karet.
          </p>
        </div>
        <div className={s.actionSurfaceGrid}>
          <article className={s.primaryActionBlock}>
            <span className={s.tokenName}>--surface-action</span>
            <div>
              <p className={s.actionLabel}>Primary Action</p>
              <h3>Pojďme zjistit, co má smysl řešit právě teď.</h3>
              <p>
                Krátce si projdeme vaši situaci a najdeme další konkrétní krok.
              </p>
            </div>
            <button className={s.actionDarkButton} type="button">
              Začít nezávazně
            </button>
          </article>
          <article className={s.darkActionBlock}>
            <span className={s.tokenName}>--surface-action-dark</span>
            <span className={s.cardSignal} aria-hidden="true" />
            <div>
              <p className={s.actionLabel}>Dark Action</p>
              <h3>Chcete nejdřív jen rychlý přehled?</h3>
              <p>
                Screening ukáže, jestli je teď důležitější hypotéka, pojištění,
                rezerva, nebo investice.
              </p>
            </div>
            <button className={s.actionLightButton} type="button">
              Spustit screening
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
