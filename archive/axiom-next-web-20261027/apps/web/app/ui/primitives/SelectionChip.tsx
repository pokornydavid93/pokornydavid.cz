import clsx from "clsx";
import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

export type SelectionChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-pressed" | "children" | "onChange"
> & {
  children: ReactNode;
  selected: boolean;
  onSelectedChange?: (selected: boolean) => void;
};

export default function SelectionChip({
  children,
  className,
  onClick,
  onSelectedChange,
  selected,
  type = "button",
  ...rest
}: SelectionChipProps) {
  return (
    <button
      {...rest}
      aria-pressed={selected}
      className={clsx(s.choiceChip, className)}
      data-component="selection-chip"
      data-selected={selected || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelectedChange?.(!selected);
      }}
      type={type}
    >
      <span aria-hidden="true" className={s.choiceIndicator}>
        <Check />
      </span>
      <span>{children}</span>
    </button>
  );
}
