"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Layers3, Palette, Settings, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_SITE_THEME_ID,
  getSiteTheme,
  normalizeSiteThemeId,
  SITE_THEME_CHANGE_EVENT,
  SITE_THEME_STORAGE_KEY,
  SITE_THEMES,
  type SiteThemeId,
} from "@/app/theme/site-themes";
import s from "./devSettings.module.css";

const isDevelopment = process.env.NODE_ENV === "development";
const isDevSettingsPanelEnabled =
  process.env.NEXT_PUBLIC_SHOW_DEV_SETTINGS !== "0";

const SECTION_LABELS = {
  hero: "Hero",
  process: "Process",
  about: "About",
  video: "Video",
  testimonials: "Testimonials",
  services: "Services",
  credentials: "Credentials",
  faq: "FAQ",
  "lead-form": "Lead form",
} as const;

type DevSectionId = keyof typeof SECTION_LABELS;
type StoryChapterId =
  | "situation"
  | "orientation"
  | "plan"
  | "video"
  | "proof"
  | "first-step";

const STORY_CHAPTER_TO_DEV_SECTION: Record<StoryChapterId, DevSectionId> = {
  situation: "hero",
  orientation: "process",
  plan: "process",
  video: "video",
  proof: "testimonials",
  "first-step": "lead-form",
};

export const HERO_MEDIA_VARIANT_STORAGE_KEY = "dp.dev.heroMediaVariant";

export const HERO_MEDIA_VARIANTS = [
  {
    id: "portrait-text-cards",
    label: "Clean portrait",
    description: "Čistý hero portrait bez trust karet.",
  },
] as const;

export type HeroMediaVariant = (typeof HERO_MEDIA_VARIANTS)[number]["id"];

type DevSettingsContextValue = {
  activeSection: DevSectionId;
  activeSiteTheme: SiteThemeId;
  heroMediaVariant: HeroMediaVariant;
  setSiteTheme: (themeId: SiteThemeId) => void;
  setHeroMediaVariant: (variant: HeroMediaVariant) => void;
};

const isDevSectionId = (value: string | null | undefined): value is DevSectionId =>
  Boolean(value && value in SECTION_LABELS);

const isStoryChapterId = (
  value: string | null | undefined
): value is StoryChapterId => Boolean(value && value in STORY_CHAPTER_TO_DEV_SECTION);

const mapStoryEventSection = ({
  section,
  navSection,
}: {
  section?: string | null;
  navSection?: string | null;
}): DevSectionId | null => {
  if (isDevSectionId(navSection)) return navSection;
  if (isDevSectionId(section)) return section;
  if (isStoryChapterId(section)) return STORY_CHAPTER_TO_DEV_SECTION[section];
  return null;
};

const isHeroMediaVariant = (
  value: string | null | undefined
): value is HeroMediaVariant =>
  value === "portrait-text-cards";

const normalizeHeroMediaVariant = (
  value: string | null | undefined
): HeroMediaVariant => (isHeroMediaVariant(value) ? value : "portrait-text-cards");

const DevSettingsContext = createContext<DevSettingsContextValue>({
  activeSection: "hero",
  activeSiteTheme: DEFAULT_SITE_THEME_ID,
  heroMediaVariant: "portrait-text-cards",
  setSiteTheme: () => undefined,
  setHeroMediaVariant: () => undefined,
});

export const useDevSettings = () => useContext(DevSettingsContext);

type DevSettingsProviderProps = {
  children: ReactNode;
};

export default function DevSettingsProvider({
  children,
}: DevSettingsProviderProps) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<DevSectionId>("hero");
  const [activeSiteTheme, setActiveSiteTheme] =
    useState<SiteThemeId>(DEFAULT_SITE_THEME_ID);
  const [heroMediaVariant, setHeroMediaVariantState] =
    useState<HeroMediaVariant>("portrait-text-cards");
  const [open, setOpen] = useState(false);
  const rafRef = useRef<number | null>(null);

  const setSiteTheme = useCallback((themeId: SiteThemeId) => {
    const normalizedThemeId = normalizeSiteThemeId(themeId);
    const root = document.documentElement;

    root.dataset.colorTheme = normalizedThemeId;
    setActiveSiteTheme(normalizedThemeId);

    try {
      window.localStorage.setItem(SITE_THEME_STORAGE_KEY, normalizedThemeId);
    } catch {
      // The visual selection still works when storage is unavailable.
    }

    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        meta.setAttribute(
          "content",
          getSiteTheme(normalizedThemeId).browserThemeColor,
        );
      });

    window.dispatchEvent(
      new CustomEvent(SITE_THEME_CHANGE_EVENT, {
        detail: { themeId: normalizedThemeId },
      }),
    );
  }, []);

  useEffect(() => {
    const rootTheme = normalizeSiteThemeId(
      document.documentElement.dataset.colorTheme,
    );
    const frame = window.requestAnimationFrame(() => {
      setActiveSiteTheme(rootTheme);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isDevelopment) return;

    const storedHeroVariant = normalizeHeroMediaVariant(
      window.localStorage.getItem(HERO_MEDIA_VARIANT_STORAGE_KEY)
    );

    window.localStorage.setItem(
      HERO_MEDIA_VARIANT_STORAGE_KEY,
      storedHeroVariant
    );

    const frame = window.requestAnimationFrame(() => {
      setHeroMediaVariantState(storedHeroVariant);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isDevelopment) return;

    const syncActiveSection = () => {
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-section-key]")
      );
      const targetY = window.innerHeight * 0.42;
      let nextSection: DevSectionId | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const section of sections) {
        const sectionKey = section.dataset.sectionKey;
        if (!isDevSectionId(sectionKey)) continue;

        const rect = section.getBoundingClientRect();
        const visible = rect.bottom > 0 && rect.top < window.innerHeight;
        if (!visible) continue;

        const containsTarget = rect.top <= targetY && rect.bottom >= targetY;
        const distance = containsTarget
          ? 0
          : Math.min(Math.abs(rect.top - targetY), Math.abs(rect.bottom - targetY));

        if (distance < bestDistance) {
          bestDistance = distance;
          nextSection = sectionKey;
        }
      }

      if (nextSection) {
        setActiveSection(nextSection);
      }
    };

    const scheduleSync = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        syncActiveSection();
      });
    };

    const handleStorySectionChange = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          section?: string | null;
          navSection?: string | null;
        }>
      ).detail;
      const section = mapStoryEventSection(detail ?? {});
      if (section) {
        setActiveSection(section);
      }
    };

    window.addEventListener("storyflow:sectionchange", handleStorySectionChange);
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    const observer = new IntersectionObserver(scheduleSync, {
      root: null,
      threshold: [0, 0.2, 0.5, 0.8, 1],
    });

    document
      .querySelectorAll<HTMLElement>("[data-section-key]")
      .forEach((section) => observer.observe(section));

    syncActiveSection();

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      observer.disconnect();
      window.removeEventListener(
        "storyflow:sectionchange",
        handleStorySectionChange
      );
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
    };
  }, []);

  useEffect(() => {
    if (!isDevelopment || !open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const setHeroMediaVariant = useCallback((variant: HeroMediaVariant) => {
    setHeroMediaVariantState(variant);
    if (isDevelopment) {
      window.localStorage.setItem(HERO_MEDIA_VARIANT_STORAGE_KEY, variant);
    }
  }, []);

  const value = useMemo<DevSettingsContextValue>(
    () => ({
      activeSection,
      activeSiteTheme,
      heroMediaVariant,
      setSiteTheme,
      setHeroMediaVariant,
    }),
    [
      activeSection,
      activeSiteTheme,
      heroMediaVariant,
      setSiteTheme,
      setHeroMediaVariant,
    ]
  );
  const showDevPanel =
    isDevSettingsPanelEnabled &&
    isDevelopment &&
    !(pathname === "/clanky" || pathname.startsWith("/clanky/"));

  return (
    <DevSettingsContext.Provider value={value}>
      {children}
      {showDevPanel ? (
        <DevSettingsPanel
          open={open}
          onOpenChange={setOpen}
          settings={value}
        />
      ) : null}
    </DevSettingsContext.Provider>
  );
}

type DevSettingsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DevSettingsContextValue;
};

function DevSettingsPanel({
  open,
  onOpenChange,
  settings,
}: DevSettingsPanelProps) {
  return (
    <div
      className={s.root}
      data-component="dev-settings"
      data-open={open ? "true" : "false"}
      data-surface-tone="dark"
    >
      <button
        type="button"
        className={s.fab}
        aria-label="Otevřít dev nastavení"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        title="Dev settings"
      >
        <Settings aria-hidden="true" />
      </button>

      <button
        type="button"
        className={s.scrim}
        aria-label="Zavřít dev nastavení"
        tabIndex={open ? 0 : -1}
        onClick={() => onOpenChange(false)}
      />

      <aside
        className={s.drawer}
        aria-label="Dev settings"
        aria-hidden={!open}
        inert={!open}
      >
        <div className={s.drawerHeader}>
          <div>
            <p className={s.kicker}>Dev settings</p>
            <h2>{SECTION_LABELS[settings.activeSection]}</h2>
          </div>
          <button
            type="button"
            className={s.iconButton}
            aria-label="Zavřít dev nastavení"
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className={s.drawerBody}>
          <section className={s.group} aria-labelledby="dev-site-theme">
            <div className={s.groupHeader}>
              <Palette aria-hidden="true" />
              <div>
                <h3 id="dev-site-theme">Barevné téma</h3>
                <p>Celý web · volba se uloží</p>
              </div>
            </div>

            <div className={s.optionList}>
              {SITE_THEMES.map((theme) => {
                const active = theme.id === settings.activeSiteTheme;

                return (
                  <div
                    key={theme.id}
                    className={s.paletteCard}
                    data-active={active ? "true" : "false"}
                  >
                    <button
                      type="button"
                      className={s.paletteMain}
                      aria-pressed={active}
                      onClick={() => settings.setSiteTheme(theme.id)}
                    >
                      <span
                        className={s.paletteSwatch}
                        data-theme-preview={theme.id}
                        aria-hidden="true"
                      />
                      <span>
                        <strong>{theme.label}</strong>
                        <small>{theme.description}</small>
                      </span>
                      {active ? <Check aria-hidden="true" /> : null}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {settings.activeSection === "hero" ? (
            <section className={s.group} aria-labelledby="dev-hero-variants">
              <div className={s.groupHeader}>
                <Layers3 aria-hidden="true" />
                <div>
                  <h3 id="dev-hero-variants">Variants</h3>
                  <p>Hero media only</p>
                </div>
              </div>

              <div className={s.optionList}>
                {HERO_MEDIA_VARIANTS.map((variant) => {
                  const active = variant.id === settings.heroMediaVariant;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className={s.optionButton}
                      data-active={active ? "true" : "false"}
                      aria-pressed={active}
                      onClick={() => settings.setHeroMediaVariant(variant.id)}
                    >
                      <span>
                        <strong>{variant.label}</strong>
                        <small>{variant.description}</small>
                      </span>
                      {active ? <Check aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

        </div>
      </aside>
    </div>
  );
}
