import Link from "next/link";
import s from "../SystemPreview.module.css";

const metadataItems = [
  ["Mode", "Reference"],
  ["Theme", "Dark / Light / Action"],
  ["Purpose", "Visual system validation"],
];

export default function PreviewHeader() {
  return (
    <header className={s.previewHeader}>
      <div className={s.container}>
        <Link className={s.backLink} href="/design-language/">
          ← Back to Design Language
        </Link>
        <div className={s.headerGrid}>
          <div>
            <p className={s.eyebrow}>System Preview</p>
            <h1>Full-page visual system composition</h1>
            <p>
              A controlled reference page for validating surfaces, components,
              typography, and layout rhythm together.
            </p>
          </div>
          <dl className={s.previewMeta} aria-label="Preview metadata">
            {metadataItems.map(([term, description]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </header>
  );
}
