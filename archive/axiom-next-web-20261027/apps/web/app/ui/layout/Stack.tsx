import clsx from "clsx";
import type { ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type { FlowGap, PolymorphicLayoutProps, StackAlign } from "./types";

export type StackGap = FlowGap;
export type { StackAlign } from "./types";

type StackOwnProps = {
  gap?: StackGap;
  align?: StackAlign;
};

export type StackProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, StackOwnProps>;

export default function Stack<TElement extends ElementType = "div">({
  as,
  className,
  gap = "m",
  align = "stretch",
  ...rest
}: StackProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.stack, className)}
      data-align={align}
      data-gap={gap}
      data-layout="stack"
    />
  );
}
