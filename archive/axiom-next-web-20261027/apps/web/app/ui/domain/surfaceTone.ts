import type { SurfaceRole } from "../primitives/Surface";

export type DomainSurfaceRole = Extract<
  SurfaceRole,
  "card-dark" | "card-light" | "action" | "action-dark"
>;

export const toneForSurface = (surface: DomainSurfaceRole) => {
  if (surface === "card-light") return "light" as const;
  if (surface === "action") return "action" as const;
  return "dark" as const;
};
