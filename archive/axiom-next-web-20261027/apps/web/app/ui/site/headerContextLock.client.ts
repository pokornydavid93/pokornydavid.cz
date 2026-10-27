"use client";

export function resolveHeaderContextLockOwner(
  selector: string | undefined,
): HTMLElement | null {
  if (!selector) return null;

  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

export function isHeaderContextLockActive(
  header: HTMLElement,
  selector: string | undefined,
) {
  const owner = resolveHeaderContextLockOwner(selector);
  if (!owner) return false;

  const rect = owner.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = window.getComputedStyle(owner);
  if (style.display === "none" || style.visibility === "hidden") return false;

  const probeY = Math.min(
    window.innerHeight - 1,
    Math.max(1, header.offsetHeight + 1),
  );

  return rect.top <= probeY && rect.bottom > probeY;
}
