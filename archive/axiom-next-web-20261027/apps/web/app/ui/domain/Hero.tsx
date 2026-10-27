import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import Container from "../layout/Container";
import Stack from "../layout/Stack";
import Switcher from "../layout/Switcher";
import Surface, { type SurfaceRole } from "../primitives/Surface";
import s from "./domain.module.css";

export type HeroVariant = "home" | "page" | "article" | "conversion" | "compact";
type HeroSurface = Extract<SurfaceRole, "page" | "paper" | "action" | "action-dark">;

export type HeroProps = {
  heading: ReactNode;
  lead: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  mediaOrProof?: ReactNode;
  variant?: HeroVariant;
  surface?: HeroSurface;
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
};

const toneForHero = (surface: HeroSurface) => {
  if (surface === "paper") return "light" as const;
  if (surface === "action") return "action" as const;
  return "dark" as const;
};

export default function Hero({
  actions,
  className,
  eyebrow,
  heading,
  headingLevel = "h1",
  lead,
  mediaOrProof,
  surface = "page",
  variant = "page",
}: HeroProps) {
  const Heading: ElementType = headingLevel;

  return (
    <Surface
      as="section"
      className={clsx(s.hero, className)}
      componentName="domain-hero"
      data-variant={variant}
      surface={surface}
      tone={toneForHero(surface)}
    >
      <Container size={variant === "article" ? "content" : "wide"}>
        <Switcher gap="l" limit={2} threshold="wide">
          <Stack className={s.heroCopy} gap="m">
            {eyebrow ? <span className={s.eyebrow}>{eyebrow}</span> : null}
            <Heading>{heading}</Heading>
            <p className={s.heroLead}>{lead}</p>
            {actions ? <div className={s.heroActions}>{actions}</div> : null}
          </Stack>
          {mediaOrProof ? <div className={s.heroSupport}>{mediaOrProof}</div> : null}
        </Switcher>
      </Container>
    </Surface>
  );
}
