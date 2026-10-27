import { ArrowUpRight, Send } from "lucide-react";
import {
  FINANCIAL_CONTENT_DISCLAIMER,
  FOOTER_BRAND_STATEMENT,
  FOOTER_OVERVIEW_HREF,
  footerGroups,
} from "../content/footer";
import { homepageContent } from "../content/homepage";
import LogoMark from "../svgr/LogoMark";
import Link, { type LinkProps } from "../ui/primitives/Link";
import Surface from "../ui/primitives/Surface";
import SiteFooter from "../ui/site/SiteFooter";
import SiteHeader from "../ui/site/SiteHeader";
import type {
  SiteHeaderMaterial,
  SiteHeaderTheme,
} from "../ui/site/siteHeaderTheme";
import FooterCookieSettingsButton from "./FooterCookieSettingsButton.client";
import s from "./publicSiteChrome.module.css";

export function OverviewActionLink({
  cursorLabel = "ZÍSKAT PŘEHLED • PRVNÍ KROK •",
  href,
  iconOnly = false,
  label,
  placement,
  track = true,
  variant = "primary-action",
  ...rest
}: Omit<LinkProps, "children" | "href" | "variant"> & {
  cursorLabel?: string;
  href: string;
  iconOnly?: boolean;
  label: string;
  placement:
    | "header"
    | "hero"
    | "outcome"
    | "references"
    | "final"
    | "services-final"
    | "process-final"
    | "about-final"
    | "references-final";
  track?: boolean;
  variant?: "primary-action" | "secondary-action";
}) {
  return (
    <Link
      {...rest}
      aria-label={label}
      data-analytics-event={track ? "home_primary_cta_click" : undefined}
      data-analytics-placement={track ? placement : undefined}
      data-cta-composition={iconOnly ? undefined : "docked"}
      data-cursor="action"
      data-cursor-icon="send"
      data-cursor-label={cursorLabel}
      data-cursor-magnetic={iconOnly ? undefined : "true"}
      href={href}
      variant={variant}
    >
      {iconOnly ? null : <span data-cta-label>{label}</span>}
      <span aria-hidden="true" data-cta-icon-shell>
        <span data-cta-icon-motion>
          <Send aria-hidden="true" data-cta-icon="paper-plane" />
        </span>
      </span>
    </Link>
  );
}

export function PublicSiteHeader({
  alternateHeaderSelector,
  className,
  contextLockSelector,
  currentPath,
  headerInstance,
  hiddenWithinSelector,
  initialMaterial = "default",
  initialTheme = "dark",
  initiallyHidden = false,
  navigationPanelId = "public-site-navigation-panel",
  restoreThemeOnHistory = true,
  scrollBehavior = "directional",
  showOverviewAction = true,
  themeBehavior = "contextual",
  transparentAtTop = false,
}: {
  alternateHeaderSelector?: string;
  className?: string;
  contextLockSelector?: string;
  currentPath: string;
  headerInstance?: "dynamic" | "hero";
  hiddenWithinSelector?: string;
  initialMaterial?: SiteHeaderMaterial;
  initialTheme?: SiteHeaderTheme;
  initiallyHidden?: boolean;
  navigationPanelId?: string;
  restoreThemeOnHistory?: boolean;
  scrollBehavior?: "compact-directional" | "directional" | "static";
  showOverviewAction?: boolean;
  themeBehavior?: "contextual" | "static";
  transparentAtTop?: boolean;
}) {
  return (
    <SiteHeader
      action={showOverviewAction ? (
        <OverviewActionLink
          data-header-overview
          href={homepageContent.shell.headerCta.href}
          label={homepageContent.shell.headerCta.label}
          placement="header"
          variant="primary-action"
        />
      ) : undefined}
      drawerAction={showOverviewAction ? (
        <OverviewActionLink
          data-navigation-drawer-overview
          href={homepageContent.shell.headerCta.href}
          label={homepageContent.shell.headerCta.label}
          placement="header"
        />
      ) : undefined}
      brand={(
        <span className={s.brand}>
          <LogoMark
            aria-hidden="true"
            focusable="false"
            style={{ color: "var(--nav-brand-mark)", width: 32 }}
          />
          <span className={s.brandCopy}>
            <strong>David Pokorný</strong>
            <small>Finanční poradenství</small>
          </span>
        </span>
      )}
      brandLabel="David Pokorný – úvod"
      className={className}
      contextLockSelector={contextLockSelector}
      currentPath={currentPath}
      headerInstance={headerInstance}
      hiddenWithinSelector={hiddenWithinSelector}
      initialMaterial={initialMaterial}
      initialTheme={initialTheme}
      initiallyHidden={initiallyHidden}
      items={homepageContent.shell.navigation.map(({ href, label }) => ({ href, label }))}
      navigationLabel="Hlavní navigace"
      navigationPanelId={navigationPanelId}
      restoreThemeOnHistory={restoreThemeOnHistory}
      scrollBehavior={scrollBehavior}
      themeBehavior={themeBehavior}
      transparentAtTop={transparentAtTop}
      alternateHeaderSelector={alternateHeaderSelector}
    />
  );
}

export function PublicSiteFooter({
  className,
}: {
  className?: string;
} = {}) {
  return (
    <Surface data-nav-theme="dark" surface="page" tone="dark">
      <SiteFooter
        brand={(
          <Link
            aria-label="David Pokorný – úvodní stránka"
            className={s.footerBrandLink}
            href="/"
            variant="text"
          >
            <span className={s.footerBrandLockup}>
              <LogoMark
                aria-hidden="true"
                className={s.footerBrandMark}
                focusable="false"
              />
              <span className={s.footerBrandCopy}>
                <strong>David Pokorný</strong>
                <small>Finanční poradenství</small>
              </span>
            </span>
          </Link>
        )}
        brandStatement={FOOTER_BRAND_STATEMENT}
        className={className}
        contact={(
          <address className={s.footerContact} data-footer-contact-list>
            <div>
              <span>Telefon</span>
              <a href="tel:+420731830897">+420 731 830 897</a>
            </div>
            <div>
              <span>E-mail</span>
              <a href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</a>
            </div>
          </address>
        )}
        contactAction={(
          <Link
            className={s.footerContactAction}
            data-footer-primary-action
            href={FOOTER_OVERVIEW_HREF}
            variant="text"
          >
            <span>Získat přehled</span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        )}
        disclaimer={FINANCIAL_CONTENT_DISCLAIMER}
        groups={footerGroups}
        legalLinks={[
          { href: "/zasady-zpracovani-osobnich-udaju/", label: "Ochrana osobních údajů" },
          { href: "/cookies-a-mereni/", label: "Cookies a měření" },
        ]}
        meta={<>© {new Date().getFullYear()} David Pokorný · IČO 09016236</>}
        preferencesAction={<FooterCookieSettingsButton />}
      />
    </Surface>
  );
}
