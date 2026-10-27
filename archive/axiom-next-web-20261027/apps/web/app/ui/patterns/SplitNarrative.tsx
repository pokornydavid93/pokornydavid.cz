import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Sidebar from "../layout/Sidebar";
import Switcher from "../layout/Switcher";
import s from "./patterns.module.css";

export type SplitNarrativeProps = {
  narrative: ReactNode;
  support: ReactNode;
  layout?: "switcher" | "sidebar";
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
};

export default function SplitNarrative({
  ariaLabelledBy,
  className,
  id,
  layout = "switcher",
  narrative,
  support,
}: SplitNarrativeProps) {
  const regions = (
    <>
      <div className={s.narrativeRegion}>{narrative}</div>
      <div className={s.supportRegion}>{support}</div>
    </>
  );

  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={clsx(s.patternSection, className)}
      data-layout-mode={layout}
      data-pattern="split-narrative"
      id={id}
    >
      <Container size="wide">
        {layout === "sidebar" ? (
          <Sidebar align="start" contentMin="two-thirds" gap="l" side="end" sideWidth="wide">
            {regions}
          </Sidebar>
        ) : (
          <Switcher gap="l" limit={2} threshold="wide">
            {regions}
          </Switcher>
        )}
      </Container>
    </section>
  );
}
