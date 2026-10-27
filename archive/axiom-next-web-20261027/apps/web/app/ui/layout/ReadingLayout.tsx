import clsx from "clsx";
import type { ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type { PolymorphicLayoutProps } from "./types";

type ReadingLayoutOwnProps = Record<never, never>;

export type ReadingLayoutProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, ReadingLayoutOwnProps>;

export default function ReadingLayout<TElement extends ElementType = "div">({
  as,
  className,
  ...rest
}: ReadingLayoutProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.readingLayout, className)}
      data-layout-context="reading"
    />
  );
}
