import type { ComponentPropsWithoutRef, ElementType } from "react";

export type PolymorphicPrimitiveProps<
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
