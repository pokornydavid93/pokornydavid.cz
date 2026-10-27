import type { FormEvent } from "react";
import s from "../SystemPreview.module.css";

const states = [
  ["Default", "Klidný stav pole na tmavé kartě."],
  ["Focus", "Viditelný lime focus ring pro klávesnici."],
  ["Error", "Chybový text bez změny layoutu."],
  ["Disabled", "Neaktivní stav bez ztráty čitelnosti."],
];

export default function PreviewForm() {
  const preventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <section
      id="preview-form"
      className={`${s.section} ${s.formSection}`}
      aria-labelledby="preview-form-title"
    >
      <div className={s.sectionDebug}>
        <span className={s.sectionMarker}>Interaction preview</span>
        <code className={s.surfaceTokenBadge}>--surface-section-dark</code>
      </div>
      <div className={`${s.container} ${s.formGrid}`}>
        <div>
          <div className={s.sectionHeader}>
            <p className={s.eyebrow}>Form preview</p>
            <h2 id="preview-form-title">Screening jako komponenta</h2>
            <p>
              Ukázka polí, helper textů, focus stavu, error placeholderu a
              disabled varianty bez napojení na reálný submit.
            </p>
          </div>
          <form className={s.previewForm} onSubmit={preventSubmit} noValidate>
            <div className={s.fieldGroup}>
              <label htmlFor="preview-name">Jméno</label>
              <input
                id="preview-name"
                name="name"
                placeholder="např. Jan Novák…"
                type="text"
                autoComplete="name"
              />
              <p className={s.fieldHelper}>Stačí křestní jméno.</p>
            </div>
            <div className={`${s.fieldGroup} ${s.errorField}`}>
              <label htmlFor="preview-email">E-mail</label>
              <input
                id="preview-email"
                name="email"
                placeholder="např. jan@example.cz…"
                type="email"
                autoComplete="email"
                spellCheck={false}
                aria-describedby="preview-email-error"
              />
              <p id="preview-email-error" className={s.errorText}>
                Ukázka error stavu: doplňte prosím platný e-mail.
              </p>
            </div>
            <div className={s.fieldGroup}>
              <label htmlFor="preview-topic">Co právě řešíte?</label>
              <select
                id="preview-topic"
                name="topic"
                defaultValue=""
                autoComplete="off"
              >
                <option value="" disabled>
                  Vyberte oblast
                </option>
                <option>Hypotéka</option>
                <option>Pojištění</option>
                <option>Investice</option>
                <option>Celkový finanční plán</option>
              </select>
              <p className={s.fieldHelper}>
                Pole slouží jen pro stavový preview.
              </p>
            </div>
            <div className={s.fieldGroup}>
              <label htmlFor="preview-note">Poznámka</label>
              <textarea
                id="preview-note"
                name="note"
                placeholder="Krátce popište situaci…"
                rows={4}
                autoComplete="off"
              />
            </div>
            <div className={s.formActions}>
              <button className={s.primaryButton} type="submit">
                Pokračovat
              </button>
              <button className={s.secondaryButton} type="button" disabled>
                Disabled preview
              </button>
            </div>
          </form>
        </div>
        <aside className={s.statePanel} aria-label="Form states">
          <span className={s.tokenName}>--surface-card-dark</span>
          <p className={s.statePanelLabel}>State panel</p>
          <ul>
            {states.map(([label, description]) => (
              <li key={label}>
                <span className={s.stateDot} aria-hidden="true" />
                <div>
                  <strong>{label}</strong>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
