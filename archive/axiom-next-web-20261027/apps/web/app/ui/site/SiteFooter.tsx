import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Link from "../primitives/Link";
import s from "./site.module.css";
import type { FooterLinkGroup } from "./types";

export type SiteFooterProps = {
  brand: ReactNode;
  brandStatement?: ReactNode;
  contact: ReactNode;
  contactAction?: ReactNode;
  contactLabel?: ReactNode;
  disclaimer?: ReactNode;
  disclaimerLabel?: ReactNode;
  groups: readonly FooterLinkGroup[];
  legalLinks: ReadonlyArray<{ href: string; label: ReactNode }>;
  meta: ReactNode;
  preferencesAction?: ReactNode;
  className?: string;
};

export default function SiteFooter({
  brand,
  brandStatement,
  className,
  contact,
  contactAction,
  contactLabel = "Kontakt",
  disclaimer,
  disclaimerLabel = "Důležitá informace",
  groups,
  legalLinks,
  meta,
  preferencesAction,
}: SiteFooterProps) {
  return (
    <footer className={clsx(s.siteFooter, className)} data-component="site-footer">
      <Container className={s.footerInner} data-footer-layout size="wide">
        <div className={s.footerBrandLayer} data-footer-intro>
          <div className={s.footerIdentity} data-footer-identity>
            <div className={s.footerBrand} data-footer-brand>{brand}</div>
            {brandStatement ? (
              <p className={s.footerBrandStatement} data-footer-statement>
                {brandStatement}
              </p>
            ) : null}
          </div>

          <section
            aria-label="Kontakt"
            className={s.footerContactRegion}
            data-footer-contact
          >
            <h2>{contactLabel}</h2>
            <div className={s.footerContactContent}>{contact}</div>
            {contactAction ? (
              <div className={s.footerContactAction} data-footer-contact-action>
                {contactAction}
              </div>
            ) : null}
          </section>
        </div>

        <nav
          aria-label="Navigace v patičce"
          className={s.footerNavigation}
          data-footer-navigation
        >
          {groups.map((group) => (
            <section
              className={s.footerGroup}
              data-footer-group
              key={group.label}
            >
              <h2>{group.label}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      rel={link.rel}
                      target={link.target}
                      variant="text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        {disclaimer ? (
          <section
            aria-label="Důležitá informace"
            className={s.footerDisclaimer}
            data-footer-disclaimer
          >
            <h2>{disclaimerLabel}</h2>
            <p>{disclaimer}</p>
          </section>
        ) : null}

        <div className={s.footerMeta} data-footer-meta>
          <span>{meta}</span>
          <ul>
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} variant="text">
                  {link.label}
                </Link>
              </li>
            ))}
            {preferencesAction ? (
              <li className={s.footerPreferences}>{preferencesAction}</li>
            ) : null}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
