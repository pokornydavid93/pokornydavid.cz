import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

export type DividerProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  label?: ReactNode;
  orientation?: "horizontal" | "vertical";
  strength?: "subtle" | "default" | "emphasis";
};

export default function Divider({
  className,
  label,
  orientation = "horizontal",
  strength = "subtle",
  ...rest
}: DividerProps) {
  return (
    <div
      {...rest}
      aria-orientation={orientation}
      className={clsx(s.divider, className)}
      data-component="divider"
      data-orientation={orientation}
      data-strength={strength}
      role="separator"
    >
      {label ? <span>{label}</span> : null}
    </div>
  );
}
