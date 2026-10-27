import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import s from "./layoutPrimitives.module.css";
import type { PolymorphicLayoutProps } from "./types";

export type ContainerSize = "measure" | "content" | "wide";
export type ContainerGutter = "default" | "none";

type ContainerOwnProps = {
  size?: ContainerSize;
  gutter?: ContainerGutter;
  children: ReactNode;
};

export type ContainerProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, ContainerOwnProps>;

export default function Container<TElement extends ElementType = "div">({
  as,
  className,
  size = "content",
  gutter = "default",
  ...rest
}: ContainerProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.container, className)}
      data-gutter={gutter}
      data-layout="container"
      data-size={size}
    />
  );
}
