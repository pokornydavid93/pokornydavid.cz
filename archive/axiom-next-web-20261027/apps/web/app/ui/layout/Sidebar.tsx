import clsx from "clsx";
import type { ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type { FlowGap, PolymorphicLayoutProps } from "./types";

export type SidebarSide = "start" | "end";
export type SidebarWidth = "intrinsic" | "compact" | "default" | "wide";
export type SidebarContentMin = "half" | "two-thirds";
export type SidebarAlign = "stretch" | "start";
export type SidebarGap = FlowGap;

type SidebarOwnProps = {
  side?: SidebarSide;
  sideWidth?: SidebarWidth;
  contentMin?: SidebarContentMin;
  gap?: SidebarGap;
  align?: SidebarAlign;
};

export type SidebarProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, SidebarOwnProps>;

export default function Sidebar<TElement extends ElementType = "div">({
  as,
  className,
  side = "start",
  sideWidth = "default",
  contentMin = "half",
  gap = "m",
  align = "stretch",
  ...rest
}: SidebarProps<TElement>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      {...rest}
      className={clsx(s.sidebar, className)}
      data-align={align}
      data-content-min={contentMin}
      data-gap={gap}
      data-layout="sidebar"
      data-side={side}
      data-side-width={sideWidth}
    />
  );
}
