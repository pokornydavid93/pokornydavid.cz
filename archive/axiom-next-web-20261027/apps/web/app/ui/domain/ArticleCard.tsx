import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import Link from "../primitives/Link";
import ResponsiveMedia, { type ResponsiveMediaProps } from "../primitives/ResponsiveMedia";
import Surface from "../primitives/Surface";
import s from "./domain.module.css";
import { toneForSurface, type DomainSurfaceRole } from "./surfaceTone";

export type ArticleCardProps = {
  category: ReactNode;
  title: ReactNode;
  excerpt: ReactNode;
  href: string;
  image?: ResponsiveMediaProps;
  published?: { dateTime: string; label: ReactNode };
  readingTime?: ReactNode;
  linkLabel?: ReactNode;
  surface?: DomainSurfaceRole;
};

export default function ArticleCard({
  category,
  excerpt,
  href,
  image,
  linkLabel = "Přečíst článek",
  published,
  readingTime,
  surface = "card-dark",
  title,
}: ArticleCardProps) {
  return (
    <Surface
      as="article"
      className={s.articleCard}
      componentName="article-card"
      surface={surface}
      tone={toneForSurface(surface)}
    >
      {image ? <ResponsiveMedia {...image} /> : null}
      <div className={s.cardBody}>
        <span className={s.eyebrow}>{category}</span>
        <h3>{title}</h3>
        <p>{excerpt}</p>
        {published || readingTime ? (
          <div className={s.articleMeta}>
            {published ? <time dateTime={published.dateTime}>{published.label}</time> : null}
            {readingTime ? <span>{readingTime}</span> : null}
          </div>
        ) : null}
        <Link className={s.cardAction} href={href} variant="text">
          <span>{linkLabel}</span><ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </Surface>
  );
}
