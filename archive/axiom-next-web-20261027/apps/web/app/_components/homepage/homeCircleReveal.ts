export const HOME_CIRCLE_REVEAL_EASE = "power1.out";
export const HOME_CIRCLE_REVEAL_SPAN = 1.12;

const CIRCLE_COVER_OVERSCAN = 1.035;

type ViewportCircleOrigin = {
  x: number;
  y: number;
};

export function getViewportCoverCircle(
  width: number,
  height: number,
  origin: ViewportCircleOrigin,
) {
  const centerX = width * origin.x;
  const centerY = height * origin.y;
  const farthestX = Math.max(centerX, width - centerX);
  const farthestY = Math.max(centerY, height - centerY);
  const radius = Math.hypot(farthestX, farthestY) * CIRCLE_COVER_OVERSCAN;

  return {
    centerX,
    centerY,
    end: `circle(${radius}px at ${centerX}px ${centerY}px)`,
    radius,
    start: `circle(0px at ${centerX}px ${centerY}px)`,
  };
}
