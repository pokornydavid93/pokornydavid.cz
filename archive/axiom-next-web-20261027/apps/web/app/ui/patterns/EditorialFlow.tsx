import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Prose from "../primitives/Prose";
import s from "./patterns.module.css";

export type EditorialFlowProps = {
  header: ReactNode;
  children: ReactNode;
  related?: ReactNode;
  action?: ReactNode;
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
};

export default function EditorialFlow({
  action,
  ariaLabelledBy,
  children,
  className,
  header,
  id,
  related,
}: EditorialFlowProps) {
  return (
    <article
      aria-labelledby={ariaLabelledBy}
      className={clsx(s.editorialFlow, className)}
      data-pattern="editorial-flow"
      id={id}
    >
      <Container size="content">
        <div className={s.editorialHeader}>{header}</div>
      </Container>
      <Container size="measure">
        <Prose as="div" measure="editorial">
          {children}
        </Prose>
      </Container>
      {related ? (
        <Container size="wide">
          <section className={s.editorialRelated}>{related}</section>
        </Container>
      ) : null}
      {action ? <div className={s.editorialAction}>{action}</div> : null}
    </article>
  );
}
