import clsx from "clsx";
import type { ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type { FlowGap, PolymorphicLayoutProps } from "./types";

export type GridMinimum = "compact" | "default" | "wide";
export type GridAlign = "stretch" | "start";
export type GridGap = FlowGap;

type GridOwnProps = {
  minimum?: GridMinimum;
  gap?: GridGap;
  align?: GridAlign;
};

export type GridProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, GridOwnProps>;

export default function Grid<TElement extends ElementType = "div">({
  as,
  align = "stretch",
  className,
  minimum = "default",
  gap = "m",
  ...rest
}: GridProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.grid, className)}
      data-align={align}
      data-gap={gap}
      data-layout="grid"
      data-minimum={minimum}
    />
  );
}
