export type CinematicGridPanSegment = {
  id: string;
  from: number;
  to: number;
  x: number;
  y: number;
};

export const cinematicGridPanSegments = [
  { id: "hero-about-handoff", from: 0, to: 0.18, x: -1180, y: -34 },
  { id: "about-settle", from: 0.18, to: 0.244, x: -17, y: -51 },
  { id: "video-lower-right", from: 0.245, to: 0.58, x: -560, y: -430 },
  { id: "process-lift", from: 0.78, to: 1, x: -46, y: -260 },
] as const satisfies readonly CinematicGridPanSegment[];
