/** Keep the public web and the separately hosted funnel runtime disjoint. */
export type SiteMode = "full" | "funnels" | "invalid";

const FUNNEL_PREFIXES = [
  "/ziskat-prehled",
] as const;

const FUNNEL_SUPPORT_PREFIXES = [
  "/zasady-zpracovani-osobnich-udaju",
  "/cookies-a-mereni",
] as const;

// Public assets referenced by the funnel and its consultation/privacy flow.
const FUNNEL_PUBLIC_ASSETS = new Set([
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/noise.avif",
  "/david-profile-cutout.webp",
  "/hero-silk-frame-zero.avif",
  "/hero-silk-home-frame-zero.avif",
]);

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function siteMode(value: string | undefined): SiteMode {
  if (value === "full" || value === "funnels") return value;
  return "invalid";
}

export function isFunnelRuntimePath(pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return false;
  if (FUNNEL_PUBLIC_ASSETS.has(pathname)) return true;
  return [...FUNNEL_PREFIXES, ...FUNNEL_SUPPORT_PREFIXES].some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function routeForSiteMode(
  mode: SiteMode,
  pathname: string,
): "allow" | "not-found" {
  if (mode === "full") return "allow";
  if (mode === "invalid") return "not-found";
  return isFunnelRuntimePath(pathname) ? "allow" : "not-found";
}

/** Cross-project links must not accidentally resolve on the funnel fallback host. */
export function mainSiteHref(
  pathname: string,
  modeValue: string | undefined,
  mainSiteOrigin: string | undefined,
): string {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    throw new Error("Invalid main-site path");
  }
  const mode = siteMode(modeValue);
  if (mode === "full") return pathname;
  if (mode !== "funnels" || !mainSiteOrigin) {
    throw new Error("Main-site origin is unavailable");
  }
  const parsed = new URL(mainSiteOrigin);
  if (
    parsed.protocol !== "https:" || parsed.origin !== mainSiteOrigin ||
    parsed.username || parsed.password || parsed.pathname !== "/" ||
    parsed.search || parsed.hash
  ) {
    throw new Error("Invalid main-site origin");
  }
  return `${mainSiteOrigin}${pathname}`;
}

/** A separate project may not have a verified main-site address yet. */
export function knownMainSiteHref(
  pathname: string,
  modeValue: string | undefined,
  mainSiteOrigin: string | undefined,
): string | null {
  if (siteMode(modeValue) === "full") return mainSiteHref(pathname, modeValue, mainSiteOrigin);
  if (siteMode(modeValue) !== "funnels" || !mainSiteOrigin) return null;
  try {
    return mainSiteHref(pathname, modeValue, mainSiteOrigin);
  } catch {
    return null;
  }
}
