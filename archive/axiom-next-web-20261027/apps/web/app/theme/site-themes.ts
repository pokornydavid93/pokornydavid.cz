export const SITE_THEME_ATTRIBUTE = "data-color-theme";
export const SITE_THEME_STORAGE_KEY = "dp.siteTheme.v2";
export const SITE_THEME_CHANGE_EVENT = "dp:site-theme-change";

export const SITE_THEMES = [
  {
    id: "signature",
    label: "Signature",
    description: "Původní limetková paleta PokornyDavid.cz.",
    browserThemeColor: "#0D0D0D",
  },
  {
    id: "verdant",
    label: "Verdant",
    description: "Hluboká zeleň, citrusový akcent a teplý papír.",
    browserThemeColor: "#022C12",
  },
] as const;

export type SiteThemeId = (typeof SITE_THEMES)[number]["id"];

export const DEFAULT_SITE_THEME_ID: SiteThemeId = "verdant";

const SITE_THEME_IDS = new Set<string>(SITE_THEMES.map((theme) => theme.id));

export const isSiteThemeId = (
  value: string | null | undefined,
): value is SiteThemeId => Boolean(value && SITE_THEME_IDS.has(value));

export const normalizeSiteThemeId = (
  value: string | null | undefined,
): SiteThemeId => (isSiteThemeId(value) ? value : DEFAULT_SITE_THEME_ID);

export const getSiteTheme = (themeId: SiteThemeId) =>
  SITE_THEMES.find((theme) => theme.id === themeId) ?? SITE_THEMES[0];

const browserThemeColors = Object.fromEntries(
  SITE_THEMES.map(({ id, browserThemeColor }) => [id, browserThemeColor]),
);

/**
 * Runs in the document head before React hydrates so a persisted theme never
 * flashes through the default palette. Values are deliberately allowlisted.
 */
export const SITE_THEME_BOOTSTRAP_SCRIPT = `(() => {
  const attribute = ${JSON.stringify(SITE_THEME_ATTRIBUTE)};
  const storageKey = ${JSON.stringify(SITE_THEME_STORAGE_KEY)};
  const fallback = ${JSON.stringify(DEFAULT_SITE_THEME_ID)};
  const allowed = ${JSON.stringify(SITE_THEMES.map(({ id }) => id))};
  const themeColors = ${JSON.stringify(browserThemeColors)};
  const root = document.documentElement;
  let selected = fallback;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (allowed.includes(stored)) {
      selected = stored;
    } else if (stored !== null) {
      window.localStorage.removeItem(storageKey);
    }
  } catch (_) {
    selected = fallback;
  }

  root.setAttribute(attribute, selected);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", themeColors[selected] || themeColors[fallback]);
  });
})();`;
