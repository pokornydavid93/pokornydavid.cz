import type { ComponentPropsWithoutRef, ElementType } from "react";

export type FlowGap = "none" | "s" | "m" | "l";

export type StackAlign = "start" | "center" | "end" | "stretch";

export type ClusterAlign = "start" | "center" | "end" | "baseline";

export type ClusterJustify = "start" | "center" | "end";

export type PolymorphicLayoutProps<
  TElement extends ElementType,
  TOwnProps extends object,
> = TOwnProps &
  {
    as?: TElement;
    className?: string;
  } & Omit<
    ComponentPropsWithoutRef<TElement>,
    keyof TOwnProps | "as" | "className" | "style"
  >;
