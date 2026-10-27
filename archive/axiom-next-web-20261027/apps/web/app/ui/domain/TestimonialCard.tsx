import type { ReactNode } from "react";
import Surface from "../primitives/Surface";
import s from "./domain.module.css";
import { toneForSurface, type DomainSurfaceRole } from "./surfaceTone";

export type TestimonialCardProps = {
  quote: ReactNode;
  author: ReactNode;
  context: ReactNode;
  trustDetail?: ReactNode;
  surface?: DomainSurfaceRole;
};

export default function TestimonialCard({
  author,
  context,
  quote,
  surface = "card-dark",
  trustDetail,
}: TestimonialCardProps) {
  return (
    <Surface
      as="article"
      className={s.testimonialCard}
      componentName="testimonial-card"
      surface={surface}
      tone={toneForSurface(surface)}
    >
      <figure>
        <blockquote><p>{quote}</p></blockquote>
        <figcaption>
          <strong>{author}</strong>
          <span>{context}</span>
        </figcaption>
      </figure>
      {trustDetail ? <p className={s.trustDetail}>{trustDetail}</p> : null}
    </Surface>
  );
}
