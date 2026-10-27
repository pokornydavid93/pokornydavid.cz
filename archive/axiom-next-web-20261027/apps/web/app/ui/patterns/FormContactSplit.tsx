import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Sidebar from "../layout/Sidebar";
import s from "./patterns.module.css";

export type FormContactSplitProps = {
  form: ReactNode;
  support: ReactNode;
  supportKind: "contact" | "booking" | "context";
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
};

export default function FormContactSplit({
  ariaLabelledBy,
  className,
  form,
  id,
  support,
  supportKind,
}: FormContactSplitProps) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={clsx(s.patternSection, className)}
      data-pattern="form-contact-split"
      data-support-kind={supportKind}
      id={id}
    >
      <Container size="wide">
        <Sidebar align="start" contentMin="half" gap="l" side="end" sideWidth="wide">
          <div className={s.formRegion}>{form}</div>
          <aside className={s.formSupport}>{support}</aside>
        </Sidebar>
      </Container>
    </section>
  );
}
