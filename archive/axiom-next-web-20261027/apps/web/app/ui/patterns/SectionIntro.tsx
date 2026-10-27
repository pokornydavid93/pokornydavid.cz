import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import Stack from "../layout/Stack";
import s from "./patterns.module.css";

export type SectionIntroProps = {
  heading: ReactNode;
  headingLevel?: "h2" | "h3" | "h4";
  headingId?: string;
  eyebrow?: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  align?: "start" | "center";
  className?: string;
  id?: string;
};

export default function SectionIntro({
  action,
  align = "start",
  className,
  eyebrow,
  heading,
  headingId,
  headingLevel = "h2",
  id,
  lead,
}: SectionIntroProps) {
  const Heading: ElementType = headingLevel;

  return (
    <header
      className={clsx(s.sectionIntro, className)}
      data-align={align}
      data-pattern="section-intro"
      id={id}
    >
      <Stack align={align} gap="m">
        {eyebrow ? <span className={s.eyebrow}>{eyebrow}</span> : null}
        <Heading id={headingId}>{heading}</Heading>
        {lead ? <p className={s.sectionLead}>{lead}</p> : null}
        {action ? <div className={s.introAction}>{action}</div> : null}
      </Stack>
    </header>
  );
}
