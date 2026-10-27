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
    const labels = hostname.split(".");
    for (let index = 0; index < labels.length - 1; index += 1) {
      const domain = labels.slice(index).join(".");
      expireCookie(name, domain);
      expireCookie(name, `.${domain}`);
    }
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

  // Basic consent mode stops collection instead of sending a cookieless ping.
  window.gtag = undefined;
  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) dataLayer.length = 0;
  document.querySelectorAll('script[data-web-ga4], script[src^="https://www.googletagmanager.com/gtag/js"]').forEach((script) => script.remove());
  deleteGaCookies();
};
