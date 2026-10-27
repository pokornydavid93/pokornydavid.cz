export type RouteTransitionPhase = "idle" | "cover" | "reveal";

export type RouteTransitionTone =
  | "default"
  | "portrait"
  | "process"
  | "service"
  | "trust"
  | "content";

export type RouteTransitionConfig = {
  tone: RouteTransitionTone;
  type: "lens";
};

export type RouteTransitionOrigin = {
  radius: number;
  x: number;
  y: number;
  scale: number;
};

export type RouteTransitionContextValue = {
  isTransitioning: boolean;
  transitionTo: (
    href: string,
    originElement?: HTMLElement | null,
  ) => Promise<void>;
};
