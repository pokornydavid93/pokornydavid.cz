import type { CSSProperties, HTMLAttributes, PropsWithChildren } from "react";
import s from "./mediaFrame.module.css";

export type MediaFrameRatio =
  | "heroPortrait"
  | "cinematicDevice"
  | "videoLandscape"
  | "videoPortrait"
  | "editorialPortrait"
  | "articleFeature"
  | "square"
  | "custom";

export type MediaFrameRadius =
  | "media"
  | "card"
  | "panel"
  | "cinematic"
  | "pill"
  | "none";

type MediaFrameProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  ratio?: MediaFrameRatio;
  radius?: MediaFrameRadius;
  elevated?: boolean;
  bordered?: boolean;
  interactive?: boolean;
  customRatio?: string;
};

const ratioClasses: Record<MediaFrameRatio, string> = {
  heroPortrait: s.ratioHeroPortrait,
  cinematicDevice: s.ratioCinematicDevice,
  videoLandscape: s.ratioVideoLandscape,
  videoPortrait: s.ratioVideoPortrait,
  editorialPortrait: s.ratioEditorialPortrait,
  articleFeature: s.ratioArticleFeature,
  square: s.ratioSquare,
  custom: s.ratioCustom,
};

const radiusClasses: Record<MediaFrameRadius, string> = {
  media: s.radiusMedia,
  card: s.radiusCard,
  panel: s.radiusPanel,
  cinematic: s.radiusCinematic,
  pill: s.radiusPill,
  none: s.radiusNone,
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function MediaFrame({
  children,
  className,
  ratio = "articleFeature",
  radius = "media",
  elevated = false,
  bordered = true,
  interactive = false,
  customRatio,
  style,
  ...rest
}: MediaFrameProps) {
  const customStyle =
    ratio === "custom" && customRatio
      ? ({
          "--media-frame-custom-ratio": customRatio,
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={joinClasses(
        s.frame,
        ratioClasses[ratio],
        radiusClasses[radius],
        bordered && s.bordered,
        elevated && s.elevated,
        interactive && s.interactive,
        className
      )}
      data-media-frame-ratio={ratio}
      data-media-frame-radius={radius}
      style={{ ...customStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
