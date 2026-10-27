import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

type DecorativeIconProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  children: ReactNode;
  decorative?: true;
  label?: never;
  size?: "sm" | "md" | "lg";
};

type SemanticIconProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  children: ReactNode;
  decorative: false;
  label: string;
  size?: "sm" | "md" | "lg";
};

export type IconProps = DecorativeIconProps | SemanticIconProps;

export default function Icon({
  children,
  className,
  decorative = true,
  label,
  size = "md",
  ...rest
}: IconProps) {
  return (
    <span
      {...rest}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={clsx(s.icon, className)}
      data-component="icon"
      data-size={size}
      role={decorative ? undefined : "img"}
    >
      {children}
    </span>
  );
}
