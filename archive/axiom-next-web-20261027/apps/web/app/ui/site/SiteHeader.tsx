import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Link from "../primitives/Link";
import HeaderScrollMotion from "./HeaderScrollMotion.client";
import HeaderThemeController from "./HeaderThemeController.client";
import SiteNavigation from "./SiteNavigation";
import {
  type SiteHeaderMaterial,
  type SiteHeaderTheme,
} from "./siteHeaderTheme";
import s from "./site.module.css";
import type { NavigationItemData } from "./types";

export type SiteHeaderProps = {
  brand: ReactNode;
  items: readonly NavigationItemData[];
  currentPath: string;
  action?: ReactNode;
  drawerAction?: ReactNode;
  brandHref?: string;
  brandLabel?: string;
  contextLockSelector?: string;
  headerInstance?: "dynamic" | "hero";
  hiddenWithinSelector?: string;
  alternateHeaderSelector?: string;
  initiallyHidden?: boolean;
  navigationLabel?: string;
  navigationPanelId?: string;
  className?: string;
  scrollBehavior?: "compact-directional" | "directional" | "static";
  initialTheme?: SiteHeaderTheme;
  initialMaterial?: SiteHeaderMaterial;
  restoreThemeOnHistory?: boolean;
  themeBehavior?: "contextual" | "static";
  transparentAtTop?: boolean;
};

export default function SiteHeader({
  action,
  brand,
  brandHref = "/",
  brandLabel,
  className,
  contextLockSelector,
  headerInstance,
  hiddenWithinSelector,
  alternateHeaderSelector,
  initiallyHidden = false,
  currentPath,
  drawerAction,
  initialTheme = "dark",
  initialMaterial = "default",
  items,
  navigationLabel,
  navigationPanelId,
  restoreThemeOnHistory = true,
  scrollBehavior = "static",
  themeBehavior = "static",
  transparentAtTop = false,
}: SiteHeaderProps) {
  return (
    <header
      className={clsx(s.siteHeader, className)}
      data-component="site-header"
      data-header-instance={headerInstance}
      data-header-overlay={transparentAtTop ? "top" : undefined}
      data-cursor-surface={initialTheme}
      data-nav-material={initialMaterial}
      data-nav-theme={initialTheme}
      data-nav-theme-history={
        themeBehavior === "contextual" && restoreThemeOnHistory
          ? "restore"
          : undefined
      }
      data-scroll-navigation={scrollBehavior === "static" ? undefined : scrollBehavior}
      data-surface-tone={initialTheme}
      data-theme={initialTheme}
      aria-hidden={initiallyHidden ? true : undefined}
      inert={initiallyHidden ? true : undefined}
      suppressHydrationWarning
    >
      {themeBehavior === "contextual" ? (
        <HeaderThemeController
          contextLockSelector={contextLockSelector}
          initialMaterial={initialMaterial}
          initialTheme={initialTheme}
          transparentAtTop={transparentAtTop}
        />
      ) : null}
      {scrollBehavior !== "static" ? (
        <HeaderScrollMotion
          alternateHeaderSelector={alternateHeaderSelector}
          compactOnly={scrollBehavior === "compact-directional"}
          hiddenWithin={hiddenWithinSelector}
          lockVisibleWithin={contextLockSelector}
        />
      ) : null}
      <Container className={s.headerInner} data-header-motion-inner size="wide">
        <Link aria-label={brandLabel} className={s.brandLink} href={brandHref} variant="text">
          {brand}
        </Link>
        <div className={s.headerControls}>
          {items.length > 0 ? (
            <SiteNavigation
              ariaLabel={navigationLabel}
              currentPath={currentPath}
              drawerAction={drawerAction}
              items={items}
              panelId={navigationPanelId}
            />
          ) : null}
          {action ? <div className={s.headerAction}>{action}</div> : null}
        </div>
      </Container>
    </header>
  );
}
