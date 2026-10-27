export const COOKIE_SETTINGS_OPEN_EVENT = "cookie-settings-open";

export const openCookieSettings = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_OPEN_EVENT));
};
