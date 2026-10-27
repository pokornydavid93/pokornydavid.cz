import type { BlogArticleScreeningRailAside } from "@/lib/blog";
import s from "./articles.module.css";

type ArticleConversionRailProps = {
  aside: BlogArticleScreeningRailAside;
  className?: string;
  headingId?: string;
};

export default function ArticleConversionRail({
  aside,
  className,
  headingId = "article-conversion-rail-title",
}: ArticleConversionRailProps) {
  return (
    <aside
      className={`${s.conversionRail} ${className ?? ""}`.trim()}
      aria-labelledby={headingId}
    >
      <span className={s.conversionRailEyebrow}>{aside.eyebrow}</span>
      <h2 className={s.conversionRailTitle} id={headingId}>
        {aside.title}
      </h2>
      <p className={s.conversionRailText}>{aside.text}</p>
      <ul className={s.conversionRailList}>
        {aside.bullets.map((item) => (
          <li key={item}>
            <span aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <a
        className={s.conversionRailCta}
        data-cursor="action"
        data-cursor-icon="send"
        data-cursor-label="ZÍSKAT PŘEHLED • ZAČÍT PRVNÍM KROKEM •"
        data-cursor-magnetic="true"
        href={aside.cta.href}
      >
        {aside.cta.label}
      </a>
      {aside.note ? <p className={s.conversionRailNote}>{aside.note}</p> : null}
    </aside>
  );
}
