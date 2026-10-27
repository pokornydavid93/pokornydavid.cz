import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
};

export default function Badge({
  children,
  className,
  tone = "neutral",
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={clsx(s.badge, s[`badge-${tone}`], className)}
      data-component="badge"
      data-tone={tone}
    >
      {children}
    </span>
  );
}
