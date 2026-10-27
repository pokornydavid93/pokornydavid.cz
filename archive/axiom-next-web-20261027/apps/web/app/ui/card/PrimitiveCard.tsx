import type { HTMLAttributes, PropsWithChildren } from "react";
import s from "./primitiveCard.module.css";

export type PrimitiveCardTone = "dark" | "light" | "action" | "transparent";
export type PrimitiveCardElevation = "base" | "raised" | "floating" | "none";

type PrimitiveCardProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: "article" | "section" | "div";
  tone?: PrimitiveCardTone;
  elevation?: PrimitiveCardElevation;
  interactive?: boolean;
  compact?: boolean;
};

const toneClasses: Record<PrimitiveCardTone, string> = {
  dark: s.toneDark,
  light: s.toneLight,
  action: s.toneAction,
  transparent: s.toneTransparent,
};

const elevationClasses: Record<PrimitiveCardElevation, string> = {
  base: s.elevationBase,
  raised: s.elevationRaised,
  floating: s.elevationFloating,
  none: s.elevationNone,
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PrimitiveCard({
  as: Tag = "article",
  children,
  className,
  tone = "dark",
  elevation = "base",
  interactive = false,
  compact = false,
  ...rest
}: PrimitiveCardProps) {
  return (
    <Tag
      className={joinClasses(
        s.card,
        toneClasses[tone],
        elevationClasses[elevation],
        interactive && s.interactive,
        compact && s.compact,
        className
      )}
      data-card-tone={tone}
      data-card-elevation={elevation}
      {...rest}
    >
      {children}
    </Tag>
  );
}
