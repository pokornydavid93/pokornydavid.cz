"use client";

const SITE_HEADER_VISIBLE_LOCK_ATTRIBUTE =
  "data-site-header-lock-visible";

export function setSiteHeaderVisibilityLock(
  owner: string,
  locked: boolean,
) {
  if (typeof document === "undefined") return;

  const normalizedOwner = owner.trim();
  if (!normalizedOwner || /\s/u.test(normalizedOwner)) return;

  const root = document.documentElement;
  const activeOwners = new Set(
    (root.getAttribute(SITE_HEADER_VISIBLE_LOCK_ATTRIBUTE) ?? "")
      .split(/\s+/u)
      .filter(Boolean),
  );

  if (locked) activeOwners.add(normalizedOwner);
  else activeOwners.delete(normalizedOwner);

  const serializedOwners = Array.from(activeOwners).sort().join(" ");
  if (serializedOwners) {
    if (
      root.getAttribute(SITE_HEADER_VISIBLE_LOCK_ATTRIBUTE)
      !== serializedOwners
    ) {
      root.setAttribute(
        SITE_HEADER_VISIBLE_LOCK_ATTRIBUTE,
        serializedOwners,
      );
    }
  } else if (root.hasAttribute(SITE_HEADER_VISIBLE_LOCK_ATTRIBUTE)) {
    root.removeAttribute(SITE_HEADER_VISIBLE_LOCK_ATTRIBUTE);
  }
}
