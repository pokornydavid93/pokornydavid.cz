const FALLBACK_SITE_URL = "https://pokornydavid.cz";

export function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    FALLBACK_SITE_URL
  );
}

export function getSiteBase(): string {
  return `${getSiteOrigin()}/`;
}

export function getSiteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteOrigin()}${normalizedPath}`;
}
