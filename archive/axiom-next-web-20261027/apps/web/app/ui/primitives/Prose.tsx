import clsx from "clsx";
import type { ElementType } from "react";
import s from "./primitives.module.css";
import type { PolymorphicPrimitiveProps } from "./types";

type ProseOwnProps = {
  measure?: "body" | "editorial";
};

export type ProseProps<TElement extends ElementType = "article"> =
  PolymorphicPrimitiveProps<TElement, ProseOwnProps>;

export default function Prose<TElement extends ElementType = "article">({
  as,
  className,
  measure = "body",
  ...rest
}: ProseProps<TElement>) {
  const Component: ElementType = as ?? "article";

  return (
    <Component
      {...rest}
      className={clsx(s.prose, className)}
      data-component="prose"
      data-measure={measure}
    />
  );
}
