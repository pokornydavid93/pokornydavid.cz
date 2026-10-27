import type { HTMLAttributes, PropsWithChildren, CSSProperties } from "react";
import s from "./container.module.css";

export type ContainerRole =
  | "fullBleed"
  | "pageCinematic"
  | "pageWide"
  | "pageStandard"
  | "contentWide"
  | "content"
  | "editorial"
  | "narrow"
  | "form"
  | "rail";

export type ContainerMeasure =
  | "compact"
  | "body"
  | "lead"
  | "editorial"
  | "wide"
  | "display";

export type ContainerRhythm =
  | "none"
  | "compact"
  | "standard"
  | "spacious"
  | "hero"
  | "cta"
  | "cinematic";

type ContainerProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  fullHeight?: boolean;
  maxWidth?: number | string;
  role?: ContainerRole;
  measure?: ContainerMeasure;
  rhythm?: ContainerRhythm;
  gutter?: "static" | "fluid" | "none";
};

const roleClasses: Record<ContainerRole, string> = {
  fullBleed: s.fullBleed,
  pageCinematic: s.pageCinematic,
  pageWide: s.pageWide,
  pageStandard: s.pageStandard,
  contentWide: s.contentWide,
  content: s.content,
  editorial: s.editorial,
  narrow: s.narrow,
  form: s.form,
  rail: s.rail,
};

const measureClasses: Record<ContainerMeasure, string> = {
  compact: s.measureCompact,
  body: s.measureBody,
  lead: s.measureLead,
  editorial: s.measureEditorial,
  wide: s.measureWide,
  display: s.measureDisplay,
};

const rhythmClasses: Record<ContainerRhythm, string> = {
  none: s.rhythmNone,
  compact: s.rhythmCompact,
  standard: s.rhythmStandard,
  spacious: s.rhythmSpacious,
  hero: s.rhythmHero,
  cta: s.rhythmCta,
  cinematic: s.rhythmCinematic,
};

const gutterClasses = {
  static: "",
  fluid: s.gutterFluid,
  none: s.gutterNone,
} as const;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const Container = ({
  children,
  className = "",
  fullHeight,
  maxWidth,
  role,
  measure,
  rhythm,
  gutter = role ? "fluid" : "static",
  style,
  ...rest
}: ContainerProps) => {
  const mergedStyle: CSSProperties = {
    ...style,
    ...(maxWidth !== undefined && {
      maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
    }),
  };

  return (
    <div
      className={joinClasses(
        s.container,
        fullHeight && s.fullHeight,
        role && s.primitiveRole,
        role && roleClasses[role],
        measure && measureClasses[measure],
        rhythm && rhythmClasses[rhythm],
        gutterClasses[gutter],
        className
      )}
      data-container-role={role}
      data-container-measure={measure}
      data-container-rhythm={rhythm}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Container;
