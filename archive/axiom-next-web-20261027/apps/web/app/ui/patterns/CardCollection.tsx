import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Grid from "../layout/Grid";
import Stack from "../layout/Stack";
import s from "./patterns.module.css";

export type CardCollectionProps = {
  children: ReactNode;
  cardKind: "service" | "article" | "testimonial";
  intro?: ReactNode;
  action?: ReactNode;
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
};

const minItemByKind = {
  service: "default",
  article: "wide",
  testimonial: "wide",
} as const;

export default function CardCollection({
  action,
  ariaLabelledBy,
  cardKind,
  children,
  className,
  id,
  intro,
}: CardCollectionProps) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={clsx(s.patternSection, className)}
      data-card-kind={cardKind}
      data-pattern="card-collection"
      id={id}
    >
      <Container size="wide">
        <Stack gap="l">
          {intro}
          <Grid minimum={minItemByKind[cardKind]}>{children}</Grid>
          {action ? <div className={s.collectionAction}>{action}</div> : null}
        </Stack>
      </Container>
    </section>
  );
}
