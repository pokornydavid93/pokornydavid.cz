import clsx from "clsx";
import type { ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type { PolymorphicLayoutProps } from "./types";

export type BleedTarget = "wide" | "full";

type BleedOwnProps = {
  target: BleedTarget;
};

export type BleedProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, BleedOwnProps>;

export default function Bleed<TElement extends ElementType = "div">({
  as,
  className,
  target,
  ...rest
}: BleedProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.bleed, className)}
      data-layout="bleed"
      data-target={target}
    />
  );
}
