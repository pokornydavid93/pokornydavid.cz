import clsx from "clsx";
import type { ElementType } from "react";
import s from "./primitives.module.css";
import type { PolymorphicPrimitiveProps } from "./types";

export type SurfaceRole =
  | "page"
  | "section-dark"
  | "card-dark"
  | "paper"
  | "card-light"
  | "action"
  | "action-dark";

type SurfaceOwnProps = {
  surface: SurfaceRole;
  tone: "dark" | "light" | "action";
  componentName?: string;
};

export type SurfaceProps<TElement extends ElementType = "div"> =
  PolymorphicPrimitiveProps<TElement, SurfaceOwnProps>;

export default function Surface<TElement extends ElementType = "div">({
  as,
  className,
  componentName = "surface",
  surface,
  tone,
  ...rest
}: SurfaceProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.surface, s[`surface-${surface}`], className)}
      data-component={componentName}
      data-cursor-surface={tone}
      data-surface-role={surface}
      data-surface-tone={tone}
    />
  );
}
