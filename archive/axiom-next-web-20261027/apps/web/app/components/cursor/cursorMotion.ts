import type { CursorMotionSnapshot } from "./cursor.types";

const snapshot: CursorMotionSnapshot = {
  angle: 0,
  isActive: false,
  normalizedX: 0.5,
  normalizedY: 0.5,
  speed: 0,
  velocityX: 0,
  velocityY: 0,
  x: 0,
  y: 0,
};

export function readCursorMotionSnapshot(): Readonly<CursorMotionSnapshot> {
  return snapshot;
}

export function publishCursorMotionSnapshot(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  velocityX: number,
  velocityY: number,
  speed: number,
  angle: number,
  isActive: boolean,
) {
  snapshot.x = x;
  snapshot.y = y;
  snapshot.normalizedX = viewportWidth > 0 ? x / viewportWidth : 0.5;
  snapshot.normalizedY = viewportHeight > 0 ? y / viewportHeight : 0.5;
  snapshot.velocityX = velocityX;
  snapshot.velocityY = velocityY;
  snapshot.speed = speed;
  snapshot.angle = angle;
  snapshot.isActive = isActive;
}

export function deactivateCursorMotionSnapshot() {
  snapshot.velocityX = 0;
  snapshot.velocityY = 0;
  snapshot.speed = 0;
  snapshot.isActive = false;
}

export function resetCursorMotionSnapshot() {
  snapshot.angle = 0;
  snapshot.isActive = false;
  snapshot.normalizedX = 0.5;
  snapshot.normalizedY = 0.5;
  snapshot.speed = 0;
  snapshot.velocityX = 0;
  snapshot.velocityY = 0;
  snapshot.x = 0;
  snapshot.y = 0;
}
