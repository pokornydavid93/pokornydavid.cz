import type { Metadata } from "next";
import Container from "../../ui/layout/Container";
import Link from "../../ui/primitives/Link";
import Breadcrumbs from "../../ui/site/Breadcrumbs";
import Pagination from "../../ui/site/Pagination";
import SiteFooter from "../../ui/site/SiteFooter";
import SiteHeader from "../../ui/site/SiteHeader";
import ShellPreviewFocusManager from "./ShellPreviewFocusManager.client";
import s from "./shellPreview.module.css";

const navigationItems = [
  { href: "/", label: "Přehled", exact: true },
  { href: "/sluzby", label: "Služby" },
  { href: "/jak-pracuji", label: "Jak pracuji" },
  { href: "/clanky", label: "Články" },
] as const;

type ShellPreviewPageProps = {
  searchParams: Promise<{ page?: string }>;
};

const readPage = (value?: string) => {
  const parsed = Number.parseInt(value ?? "3", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 8) : 3;
};

export async function generateMetadata({ searchParams }: ShellPreviewPageProps): Promise<Metadata> {
  const page = readPage((await searchParams).page);
  return {
    title: `Shell preview – strana ${page}`,
    description: "Izolovaný dokument pro ověření landmarků a navigačního kontraktu.",
    robots: { index: false, follow: false },
  };
}

export default async function ShellPreviewPage({ searchParams }: ShellPreviewPageProps) {
  const page = readPage((await searchParams).page);

  return (
    <div className={s.document} data-shell-preview-document data-surface-tone="dark">
      <SiteHeader
        action={<Link href="/ziskat-prehled" variant="primary-action">Zjistit, čím začít</Link>}
        brand={<><strong>PD</strong><span>PokornyDavid.cz</span></>}
        currentPath="/sluzby"
        items={navigationItems}
        navigationLabel="Hlavní navigace shell preview"
      />

      <main className={s.main} id="main-content" tabIndex={-1}>
        <ShellPreviewFocusManager targetId="main-content" />
        <Container className={s.content} size="wide">
          <Breadcrumbs
            ariaLabel="Drobečková navigace shell preview"
            items={[
              { href: "/", label: "Domů" },
              { href: "/sluzby", label: "Služby" },
              { href: "/sluzby/financni-plan", label: "Finanční plánování pro domácnosti" },
              { href: "/sluzby/financni-plan/dlouhodoby-plan", label: "Dlouhodobý plán a pravidelná kontrola" },
              { label: "Přehled kroků před první konzultací" },
            ]}
          />

          <section className={s.intro} aria-labelledby="shell-preview-title">
            <span>Izolovaný SiteShell</span>
            <h1 id="shell-preview-title">Jeden dokument, jeden hlavní obsah a pojmenované navigace.</h1>
            <p>Header, breadcrumb, stránkování a footer používají skutečné odkazy. Mobilní menu je pouze stav stejné navigace.</p>
          </section>

          <div className={s.routeState} aria-live="polite">
            <span>Aktuální kolekce článků</span>
            <strong>Strana {page} z 8</strong>
          </div>

          <Pagination
            ariaLabel="Stránkování shell preview"
            hrefForPage={(nextPage) => `/design-language/shell-preview/?page=${nextPage}`}
            page={page}
            pageCount={8}
          />
        </Container>
      </main>

      <SiteFooter
        brand="PokornyDavid.cz"
        contact={<><Link href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</Link><br />Olomouc a online</>}
        groups={[
          { label: "Rozhodování", links: [{ href: "/sluzby", label: "Služby" }, { href: "/jak-pracuji", label: "Postup" }] },
          { label: "Důvěra", links: [{ href: "/kdo-jsem", label: "O mně" }, { href: "/reference", label: "Reference" }] },
        ]}
        legalLinks={[
          { href: "/pravni-informace", label: "Právní informace" },
          { href: "/cookies-a-mereni", label: "Cookies" },
        ]}
        meta="Osobní finanční plánování"
        preferencesAction={<Link href="/cookies-a-mereni/#nastaveni-analytiky">Nastavení cookies</Link>}
      />
    </div>
  );
}
