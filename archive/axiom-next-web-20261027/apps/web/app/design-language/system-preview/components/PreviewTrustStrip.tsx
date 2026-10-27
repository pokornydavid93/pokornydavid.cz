import s from "../SystemPreview.module.css";

const trustMetrics = [
  ["5+ let", "praxe"],
  ["100+", "klientů"],
  ["Registrace", "ČNB"],
  ["Osobní", "přístup"],
];

export default function PreviewTrustStrip() {
  return (
    <section className={s.trustStrip} aria-label="Trust strip">
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Trust strip</span>
        <code className={s.surfaceTokenBadge}>--surface-section-dark-deep</code>
      </div>
      <div className={`${s.container} ${s.trustGrid}`}>
        {trustMetrics.map(([value, label]) => (
          <article key={`${value}-${label}`} className={s.trustItem}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
