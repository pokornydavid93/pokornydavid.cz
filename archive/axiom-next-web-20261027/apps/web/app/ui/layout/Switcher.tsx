import clsx from "clsx";
import type { ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type { FlowGap, PolymorphicLayoutProps } from "./types";

export type SwitcherThreshold = "compact" | "standard" | "wide";
export type SwitcherLimit = 2 | 3 | 4 | 5;
export type SwitcherGap = FlowGap;

type SwitcherOwnProps = {
  threshold?: SwitcherThreshold;
  gap?: SwitcherGap;
  limit?: SwitcherLimit;
};

export type SwitcherProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, SwitcherOwnProps>;

export default function Switcher<TElement extends ElementType = "div">({
  as,
  className,
  threshold = "standard",
  gap = "m",
  limit = 4,
  ...rest
}: SwitcherProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.switcher, className)}
      data-gap={gap}
      data-layout="switcher"
      data-limit={limit}
      data-threshold={threshold}
    />
  );
}
