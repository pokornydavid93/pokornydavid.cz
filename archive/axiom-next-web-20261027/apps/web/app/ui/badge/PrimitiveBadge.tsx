import type { HTMLAttributes, PropsWithChildren } from "react";
import s from "./primitiveBadge.module.css";

export type PrimitiveBadgeTone =
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "code";

type PrimitiveBadgeProps = PropsWithChildren<HTMLAttributes<HTMLSpanElement>> & {
  tone?: PrimitiveBadgeTone;
  interactive?: boolean;
};

const toneClasses: Record<PrimitiveBadgeTone, string> = {
  accent: s.toneAccent,
  neutral: s.toneNeutral,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
  code: s.toneCode,
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PrimitiveBadge({
  children,
  className,
  tone = "accent",
  interactive = false,
  ...rest
}: PrimitiveBadgeProps) {
  return (
    <span
      className={joinClasses(s.badge, toneClasses[tone], interactive && s.interactive, className)}
      data-badge-tone={tone}
      {...rest}
    >
      {children}
    </span>
  );
}
