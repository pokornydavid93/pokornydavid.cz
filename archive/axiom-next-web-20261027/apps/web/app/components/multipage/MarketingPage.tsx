import Link from "next/link";
import { Send } from "lucide-react";
import type { ReactNode } from "react";
import {
  PublicSiteFooter,
  PublicSiteHeader,
} from "@/app/_components/PublicSiteChrome";
import Container from "@/app/ui/container/Container";
import s from "./marketingPage.module.css";

type MarketingPageShellProps = {
  children: ReactNode;
  currentPath: string;
  className?: string;
  footerClassName?: string;
  headerClassName?: string;
};

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  lead: string;
  aside?: ReactNode;
};

type GlassCardProps = {
  eyebrow?: string;
  title: string;
  text: string;
  children?: ReactNode;
  className?: string;
};

type CTASectionProps = {
  eyebrow?: string;
  title: string;
  text: string;
  href?: string;
  label?: string;
};

type ProofItem = {
  value: string;
  label: string;
  text?: string;
};

export function MarketingPageShell({
  children,
  currentPath,
  className = "",
  footerClassName,
  headerClassName,
}: MarketingPageShellProps) {
  const overlaysHero = [
    "/kdo-jsem",
    "/reference",
    "/jak-pracuji",
    "/sluzby",
  ].includes(currentPath.replace(/\/$/u, ""));

  return (
    <>
      <PublicSiteHeader
        className={`${overlaysHero ? s.overlayHeader : ""} ${headerClassName ?? ""}`.trim()}
        currentPath={currentPath}
        transparentAtTop={overlaysHero}
      />
      <main className={`${s.page} ${className}`.trim()} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <PublicSiteFooter className={footerClassName} />
    </>
  );
}

export function MarketingContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Container className={`${s.container} ${className}`.trim()} maxWidth={1240}>
      {children}
    </Container>
  );
}

export function PageHero({ eyebrow, title, lead, aside }: PageHeroProps) {
  return (
    <section className={s.hero} aria-label={eyebrow}>
      <div className={s.heroCopy}>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={s.lead}>{lead}</p>
      </div>
      {aside ? <div className={s.heroAside}>{aside}</div> : null}
    </section>
  );
}

export function SectionBlock({
  eyebrow,
  title,
  text,
  children,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`${s.sectionBlock} ${compact ? s.compact : ""}`}>
      <div className={s.sectionIntro}>
        {eyebrow ? <p className={s.eyebrow}>{eyebrow}</p> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function GlassCard({
  eyebrow,
  title,
  text,
  children,
  className = "",
}: GlassCardProps) {
  return (
    <article className={`${s.card} ${className}`.trim()}>
      {eyebrow ? <p className={s.cardEyebrow}>{eyebrow}</p> : null}
      <h3>{title}</h3>
      <p>{text}</p>
      {children ? <div className={s.cardBody}>{children}</div> : null}
    </article>
  );
}

export function ProofStrip({ items }: { items: ProofItem[] }) {
  return (
    <div className={s.proofStrip}>
      {items.map((item) => (
        <div className={s.proofItem} key={`${item.value}-${item.label}`}>
          <span className={s.proofValue}>{item.value}</span>
          <span className={s.proofLabel}>{item.label}</span>
          {item.text ? <span className={s.proofText}>{item.text}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function CTASection({
  eyebrow = "Další krok",
  title,
  text,
  href = "/ziskat-prehled/",
  label = "Začít přehledem",
}: CTASectionProps) {
  return (
    <section className={s.ctaSection}>
      <div>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <Link
        className={s.textLink}
        data-cursor="action"
        data-cursor-icon="send"
        data-cursor-label="ZÍSKAT PŘEHLED • ZAČÍT PRVNÍM KROKEM •"
        data-cursor-magnetic="true"
        href={href}
      >
        <span>{label}</span>
        <Send aria-hidden="true" data-cta-icon="paper-plane" />
      </Link>
    </section>
  );
}

export const marketingStyles = s;
