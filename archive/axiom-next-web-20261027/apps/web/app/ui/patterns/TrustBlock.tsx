import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Grid from "../layout/Grid";
import Stack from "../layout/Stack";
import s from "./patterns.module.css";

export type TrustBlockProps = {
  context: ReactNode;
  children: ReactNode;
  density?: "compact" | "standard";
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
};

export default function TrustBlock({
  ariaLabelledBy,
  children,
  className,
  context,
  density = "standard",
  id,
}: TrustBlockProps) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={clsx(s.patternSection, s.trustBlock, className)}
      data-density={density}
      data-pattern="trust-block"
      id={id}
    >
      <Container size="wide">
        <Stack gap="l">
          <div className={s.trustContext}>{context}</div>
          <Grid minimum={density === "compact" ? "compact" : "default"}>{children}</Grid>
        </Stack>
      </Container>
    </section>
  );
}
