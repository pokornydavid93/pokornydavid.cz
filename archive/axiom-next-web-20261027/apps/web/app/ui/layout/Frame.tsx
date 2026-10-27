import clsx from "clsx";
import type { CSSProperties, ElementType } from "react";
import s from "./layoutPrimitives.module.css";
import type { PolymorphicLayoutProps } from "./types";

export type FrameRatio = "square" | "portrait" | "landscape" | "wide";
export type FrameFit = "cover" | "contain";
export type FramePosition = "center" | "top" | "bottom" | `${number}% ${number}%`;

type FrameOwnProps = {
  ratio: FrameRatio;
  fit?: FrameFit;
  position?: FramePosition;
};

type FrameStyle = CSSProperties & {
  "--layout-frame-position"?: string;
};

export type FrameProps<TElement extends ElementType = "div"> =
  PolymorphicLayoutProps<TElement, FrameOwnProps>;

export default function Frame<TElement extends ElementType = "div">({
  as,
  className,
  ratio,
  fit = "cover",
  position = "center",
  ...rest
}: FrameProps<TElement>) {
  const Component: ElementType = as ?? "div";
  const namedPosition = position === "center" || position === "top" || position === "bottom";
  const style: FrameStyle | undefined = namedPosition
    ? undefined
    : { "--layout-frame-position": position };

  return (
    <Component
      {...rest}
      className={clsx(s.frame, className)}
      data-fit={fit}
      data-layout="frame"
      data-position={namedPosition ? position : "custom"}
      data-ratio={ratio}
      style={style}
    />
  );
}
