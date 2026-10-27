import s from "../SystemPreview.module.css";

const categories = [
  "Foundation",
  "Surfaces",
  "Typography",
  "Components",
  "Composition",
];

export default function PreviewFooter() {
  return (
    <footer className={s.previewFooter}>
      <div className={`${s.container} ${s.footerGrid}`}>
        <div>
          <strong>PokornyDavid Design Language</strong>
          <span>System Preview</span>
        </div>
        <div className={s.footerCategories} aria-label="Reference categories">
          {categories.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
