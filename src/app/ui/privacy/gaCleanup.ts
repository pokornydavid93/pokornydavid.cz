const GA_COOKIE_PREFIX = "_ga_";
const GA_COOKIES = new Set(["_ga", "_gid", "_gat"]);

const isGaCookie = (name: string) =>
  GA_COOKIES.has(name) || name.startsWith(GA_COOKIE_PREFIX);

const expireCookie = (name: string, domain?: string) => {
  const domainPart = domain ? ` domain=${domain};` : "";
  document.cookie = `${name}=; Max-Age=0; path=/;${domainPart}`;
  document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;${domainPart}`;
};

export const deleteGaCookies = () => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const hostname = window.location.hostname;
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));

  cookieNames.forEach((name) => {
    if (!isGaCookie(name)) {
      return;
    }

    expireCookie(name);
    expireCookie(name, hostname);
    expireCookie(name, `.${hostname}`);
  });
};

export const disableGaRuntime = (measurementId?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  if (measurementId) {
    (window as unknown as Record<string, boolean>)[
      `ga-disable-${measurementId}`
    ] = true;
  }

  try {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
      .gtag;
    if (typeof gtag === "function") {
      gtag("consent", "update", { analytics_storage: "denied" });
    }
  } catch {
    // Ignore GA runtime errors during cleanup.
  }
};
