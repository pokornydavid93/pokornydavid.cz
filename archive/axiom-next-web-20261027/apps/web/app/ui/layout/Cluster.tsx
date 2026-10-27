import clsx from "clsx";
import type { ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type {
  ClusterAlign,
  ClusterJustify,
  FlowGap,
  PolymorphicLayoutProps,
} from "./types";

export type ClusterGap = FlowGap;
export type { ClusterAlign, ClusterJustify } from "./types";

type ClusterOwnProps = {
  gap?: ClusterGap;
  justify?: ClusterJustify;
  align?: ClusterAlign;
};

export type ClusterProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, ClusterOwnProps>;

export default function Cluster<TElement extends ElementType = "div">({
  as,
  className,
  gap = "s",
  justify = "start",
  align = "center",
  ...rest
}: ClusterProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.cluster, className)}
      data-align={align}
      data-gap={gap}
      data-justify={justify}
      data-layout="cluster"
    />
  );
}
