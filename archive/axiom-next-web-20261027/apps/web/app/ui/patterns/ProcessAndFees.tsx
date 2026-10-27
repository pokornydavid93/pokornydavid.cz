import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Grid from "../layout/Grid";
import Stack from "../layout/Stack";
import s from "./patterns.module.css";

export type ProcessStep = {
  id?: string;
  title: ReactNode;
  description: ReactNode;
  result?: ReactNode;
};

export type ProcessAndFeesProps = {
  intro: ReactNode;
  steps: readonly ProcessStep[];
  fees?: ReactNode;
  action?: ReactNode;
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
};

export default function ProcessAndFees({
  action,
  ariaLabelledBy,
  className,
  fees,
  id,
  intro,
  steps,
}: ProcessAndFeesProps) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={clsx(s.patternSection, className)}
      data-pattern="process-and-fees"
      id={id}
    >
      <Container size="wide">
        <Stack gap="l">
          {intro}
          <Grid as="ol" className={s.processList} minimum="default">
            {steps.map((step, index) => (
              <li key={step.id ?? `${index}-${String(step.title)}`}>
                <article className={s.processStep}>
                  <span aria-hidden="true" className={s.stepNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {step.result ? <div className={s.stepResult}>{step.result}</div> : null}
                </article>
              </li>
            ))}
          </Grid>
          {fees ? <aside className={s.feesRegion}>{fees}</aside> : null}
          {action ? <div className={s.patternAction}>{action}</div> : null}
        </Stack>
      </Container>
    </section>
  );
}
