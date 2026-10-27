import clsx from "clsx";
import {
  Children,
  isValidElement,
  type ElementType,
} from "react";
import s from "./layoutPrimitives.module.css";
import type { FlowGap, PolymorphicLayoutProps } from "./types";

export type CoverMinimum = "compact" | "standard" | "viewport";
export type CoverPadding = "none" | "compact" | "page" | "section";
export type CoverGap = FlowGap;

type CoverOwnProps = {
  minimum: CoverMinimum;
  padding?: CoverPadding;
  gap?: CoverGap;
};

type CoverSlotOwnProps = Record<never, never>;

export type CoverProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, CoverOwnProps>;

export type CoverSlotProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, CoverSlotOwnProps>;

function CoverStart<TElement extends ElementType = "div">({
  as,
  className,
  ...rest
}: CoverSlotProps<TElement>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      {...rest}
      className={className}
      data-cover-slot="start"
    />
  );
}

function CoverPrincipal<TElement extends ElementType = "div">({
  as,
  className,
  ...rest
}: CoverSlotProps<TElement>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      {...rest}
      className={className}
      data-cover-principal
      data-cover-slot="principal"
    />
  );
}

function CoverEnd<TElement extends ElementType = "div">({
  as,
  className,
  ...rest
}: CoverSlotProps<TElement>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      {...rest}
      className={className}
      data-cover-slot="end"
    />
  );
}

function CoverRoot<TElement extends ElementType = "div">({
  as,
  children,
  className,
  gap = "m",
  minimum,
  padding = "page",
  ...rest
}: CoverProps<TElement>) {
  const Component: ElementType = as ?? "div";
  const childNodes = Children.toArray(children);
  const slots = childNodes.filter(isValidElement);
  const principalCount = slots.filter((child) => child.type === CoverPrincipal).length;
  const startCount = slots.filter((child) => child.type === CoverStart).length;
  const endCount = slots.filter((child) => child.type === CoverEnd).length;
  const validSlotCount = slots.filter((child) =>
    child.type === CoverStart || child.type === CoverPrincipal || child.type === CoverEnd
  ).length;

  if (
    principalCount !== 1 ||
    startCount > 1 ||
    endCount > 1 ||
    slots.length !== childNodes.length ||
    validSlotCount !== slots.length
  ) {
    throw new Error(
      "Cover requires exactly one Cover.Principal and at most one direct Cover.Start and Cover.End.",
    );
  }

  return (
    <Component
      {...rest}
      className={clsx(s.cover, className)}
      data-gap={gap}
      data-layout="cover"
      data-minimum={minimum}
      data-padding={padding}
    >
      {children}
    </Component>
  );
}

type CoverComponent = typeof CoverRoot & {
  Start: typeof CoverStart;
  Principal: typeof CoverPrincipal;
  End: typeof CoverEnd;
};

const Cover = Object.assign(CoverRoot, {
  Start: CoverStart,
  Principal: CoverPrincipal,
  End: CoverEnd,
}) as CoverComponent;

export default Cover;
