import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  icon: ReactNode;
  label: string;
};

export default function IconButton({
  className,
  icon,
  label,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={clsx(s.button, s["button-icon-only"], className)}
      data-component="icon-button"
      type={type}
    >
      <span aria-hidden="true" className={s.controlIcon}>{icon}</span>
    </button>
  );
}
