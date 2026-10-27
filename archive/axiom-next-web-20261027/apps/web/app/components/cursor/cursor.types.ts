export type CursorVariant =
  | "default"
  | "link"
  | "action"
  | "video"
  | "external"
  | "article"
  | "case"
  | "drag";

export type CursorSurface = "dark" | "light" | "action";

export type CursorIconName = "arrow" | "hand";

export type CursorPresentation = {
  coreSurface: CursorSurface;
  icon: CursorIconName;
  showsCoreIcon: boolean;
  surface: CursorSurface;
  variant: CursorVariant;
};

export type CursorMotionSnapshot = {
  angle: number;
  isActive: boolean;
  normalizedX: number;
  normalizedY: number;
  speed: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};
