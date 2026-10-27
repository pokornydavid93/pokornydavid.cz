"use client";

import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import ArticleCard from "../../ui/domain/ArticleCard";
import BookingPanel from "../../ui/domain/BookingPanel";
import ConsentAnalyticsLoader from "../../ui/domain/ConsentAnalyticsLoader";
import { createConsentStore } from "../../ui/domain/ConsentStore";
import CookieConsent from "../../ui/domain/CookieConsent";
import EnquiryForm from "../../ui/domain/EnquiryForm";
import Hero from "../../ui/domain/Hero";
import ProfileCard from "../../ui/domain/ProfileCard";
import ProofItem from "../../ui/domain/ProofItem";
import ServiceCard from "../../ui/domain/ServiceCard";
import TestimonialCard from "../../ui/domain/TestimonialCard";
import Grid from "../../ui/layout/Grid";
import Button from "../../ui/primitives/Button";
import Link from "../../ui/primitives/Link";
import Surface, { type SurfaceRole } from "../../ui/primitives/Surface";
import TrustBlock from "../../ui/patterns/TrustBlock";
import Breadcrumbs from "../../ui/site/Breadcrumbs";
import Pagination from "../../ui/site/Pagination";
import SiteFooter from "../../ui/site/SiteFooter";
import SiteHeader from "../../ui/site/SiteHeader";
import SkipLink from "../../ui/site/SkipLink";
import { componentRegistry } from "./registry";
import s from "./shellDomainFoundationPreview.module.css";

type LabLayer = "contracts" | "shell-document" | "integrations";
type ContractFamily = "shell" | "domain";
type PreviewTone = "dark" | "light" | "action";
type ShellWidth = "narrow" | "medium" | "wide";
type BookingScenario = "ready" | "provider-error" | "network-blocked";

const layers = [
  { id: "contracts", label: "Contract Lab" },
  { id: "shell-document", label: "Shell Document" },
  { id: "integrations", label: "Integration Lab" },
] as const satisfies ReadonlyArray<{ id: LabLayer; label: string }>;

const previewTones = [
  { id: "dark", label: "Dark", surface: "card-dark", domainSurface: "card-dark", heroSurface: "page" },
  { id: "light", label: "Light", surface: "card-light", domainSurface: "card-light", heroSurface: "paper" },
  { id: "action", label: "Action", surface: "action", domainSurface: "action-dark", heroSurface: "action" },
] as const satisfies ReadonlyArray<{
  id: PreviewTone;
  label: string;
  surface: SurfaceRole;
  domainSurface: "card-dark" | "card-light" | "action-dark";
  heroSurface: "page" | "paper" | "action";
}>;

const shellWidths = [
  { id: "narrow", label: "Narrow · 320 px", width: 320 },
  { id: "medium", label: "Medium · 768 px", width: 768 },
  { id: "wide", label: "Wide · 1280 px", width: 1280 },
] as const satisfies ReadonlyArray<{ id: ShellWidth; label: string; width: number }>;

const navigationItems = [
  { href: "/", label: "Přehled", exact: true },
  { href: "/sluzby", label: "Služby" },
  { href: "/jak-pracuji", label: "Jak pracuji" },
  { href: "/clanky", label: "Články" },
] as const;

const publicContractIds = [
  "site.skip-link",
  "site.header",
  "site.navigation",
  "site.breadcrumbs",
  "site.pagination",
  "site.footer",
  "domain.service-card",
  "domain.article-card",
  "domain.testimonial-card",
  "domain.profile-card",
  "domain.proof-item",
  "domain.hero",
  "domain.enquiry-form",
  "domain.booking-panel",
  "domain.cookie-consent",
] as const;

const publicContracts = publicContractIds.map((id) => {
  const entry = componentRegistry.runtime.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing Shell & Domain contract ${id}`);
  return entry;
});

function LayerIntro({ eyebrow, heading, copy }: { eyebrow: string; heading: string; copy: string }) {
  return (
    <header className={s.layerIntro}>
      <span>{eyebrow}</span>
      <h3>{heading}</h3>
      <p>{copy}</p>
    </header>
  );
}

function ContractIndex() {
  return (
    <section aria-labelledby="shell-domain-contract-index" className={s.contractIndex}>
      <header>
        <span>Public inventory</span>
        <h4 id="shell-domain-contract-index">15 kontraktů, dvě nezávislé osy</h4>
      </header>
      <ul>
        {publicContracts.map((entry) => (
          <li data-kind={entry.kind} data-scope={entry.scope} key={entry.id}>
            <div><strong>{entry.name === "Hero" ? "DomainHero" : entry.name}</strong><code>{entry.id}</code></div>
            <span>{entry.kind} · {entry.scope}</span>
            <small>{entry.supportedTones.join(" / ")}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShellContracts() {
  return (
    <div className={s.contractStack} data-contract-family="shell">
      <article className={s.contractSpecimen}>
        <header><span>SkipLink + SiteHeader + SiteNavigation</span><strong>Jedna navigace, dva responzivní režimy</strong></header>
        <SkipLink targetId="shell-contract-target">Přeskočit specimen navigaci</SkipLink>
        <div className={s.headerSpecimen} data-surface-tone="dark">
          <SiteHeader
            action={<Link href="/ziskat-prehled" variant="primary-action">Zjistit, čím začít</Link>}
            brand={<><strong>PD</strong><span>PokornyDavid.cz</span></>}
            currentPath="/sluzby"
            items={navigationItems}
            navigationLabel="Navigace samostatného header specimenu"
          />
          <p id="shell-contract-target" tabIndex={-1}>Aktuální route je Služby. CTA dědí canonical Primary Link tokeny.</p>
        </div>
      </article>

      <article className={s.contractSpecimen}>
        <header><span>Breadcrumbs</span><strong>Dlouhá cesta se zalomí bez ztráty current page</strong></header>
        <Breadcrumbs
          ariaLabel="Tlakový breadcrumb specimen"
          items={[
            { href: "/", label: "Domů" },
            { href: "/sluzby", label: "Služby" },
            { href: "/sluzby/financni-plan", label: "Finanční plánování pro domácnosti" },
            { href: "/sluzby/financni-plan/dlouhodoby-plan", label: "Dlouhodobý plán a pravidelná kontrola" },
            { label: "Přehled kroků před první konzultací" },
          ]}
        />
      </article>

      <article className={s.contractSpecimen}>
        <header><span>Pagination</span><strong>First, middle a last se skutečnými URL</strong></header>
        <div className={s.paginationStates}>
          {[1, 3, 8].map((page) => (
            <div data-pagination-state={page === 1 ? "first" : page === 8 ? "last" : "middle"} key={page}>
              <span>{page === 1 ? "First" : page === 8 ? "Last" : "Middle"}</span>
              <Pagination ariaLabel={`Stránkování – ${page} z 8`} hrefForPage={(nextPage) => `/clanky?page=${nextPage}`} page={page} pageCount={8} />
            </div>
          ))}
        </div>
      </article>

      <article className={s.contractSpecimen}>
        <header><span>SiteFooter</span><strong>Kontakt, pojmenovaná navigace, legal a cookie vstup</strong></header>
        <div className={s.footerSpecimen} data-surface-tone="dark">
          <SiteFooter
            brand="PokornyDavid.cz"
            contact={<><Link href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</Link><br />Olomouc a online</>}
            groups={[
              { label: "Rozhodování", links: [{ href: "/sluzby", label: "Služby" }, { href: "/jak-pracuji", label: "Postup" }] },
              { label: "Důvěra", links: [{ href: "/kdo-jsem", label: "O mně" }, { href: "/reference", label: "Reference" }] },
            ]}
            legalLinks={[{ href: "/pravni-informace", label: "Právní informace" }, { href: "/cookies-a-mereni", label: "Cookies" }]}
            meta="Osobní finanční plánování"
            preferencesAction={<Link href="/cookies-a-mereni/#nastaveni-analytiky">Nastavení cookies</Link>}
          />
        </div>
      </article>
    </div>
  );
}

function DomainContracts({ tone }: { tone: PreviewTone }) {
  const activeTone = previewTones.find((item) => item.id === tone) ?? previewTones[0];

  return (
    <Surface
      as="div"
      className={s.domainContracts}
      data-contract-family="domain"
      surface={activeTone.surface}
      tone={activeTone.id}
    >
      <Hero
        actions={<><Link href="/ziskat-prehled" variant="primary-action">Získat přehled</Link><Link href="/jak-pracuji" variant="secondary-action">Poznat postup</Link></>}
        eyebrow="Finanční plánování"
        heading="Rozhodnutí začíná souvislostmi"
        headingLevel="h3"
        lead="Nejdřív srovnáme cíle, rezervu a rizika. Teprve potom vybíráme konkrétní řešení."
        mediaOrProof={<div className={s.heroProof}><strong>1 plán</strong><span>pro hypotéku, investice i ochranu příjmu</span></div>}
        surface={activeTone.heroSurface}
        variant="page"
      />

      <section aria-labelledby="domain-card-pressure-title" className={s.domainCollection}>
        <header><span>Domain card pressure test</span><h4 id="domain-card-pressure-title">Různá anatomie, žádný univerzální ContentCard</h4></header>
        <Grid minimum="default">
          <ServiceCard
            href="/sluzby"
            metadata={["Plán"]}
            problem="Rozhodnutí vznikají odděleně."
            result="Jedna mapa kroků a kontrol."
            surface={activeTone.domainSurface}
            title="Finanční plán"
          />
          <ServiceCard
            href="/sluzby"
            metadata={["Rozpočet", "Fixace", "Rezerva", "Kontrola"]}
            problem="Hypotéka, investice a ochrana příjmu se posuzují bez společného pořadí."
            result="Dlouhodobý plán propojí rozhodnutí, rezervu i okamžik další kontroly."
            surface={activeTone.domainSurface}
            title="Dlouhý název služby, který prověří zalomení bez ořezu nebo změny anatomie"
          />
          <ArticleCard
            category="Investice"
            excerpt="Specimen záměrně nemá obrázek ani publikační metadata. Obsah a odkaz přesto zůstávají úplné."
            href="/clanky"
            surface={activeTone.domainSurface}
            title="Článek musí fungovat i bez náhledového média"
          />
          <TestimonialCard
            author="Klient z Olomouce"
            context="Finanční plán a hypotéka"
            quote="Nejdřív jsme si mysleli, že potřebujeme jen porovnat jednu smlouvu. Teprve společný přehled nám ukázal, jak moc spolu souvisejí rezerva, hypotéka, ochrana příjmu a dlouhodobé investice."
            surface={activeTone.domainSurface}
            trustDetail="Reference je publikována se souhlasem a bez citlivých údajů."
          />
          <ProfileCard
            bio="Pomohu vám spojit hypotéku, rezervy, investice a ochranu příjmu do jednoho rozhodovacího rámce."
            name="David Pokorný"
            portrait={{ alt: "Můj portrét", height: 1600, kind: "image", ratio: "portrait", sizes: "(max-width: 720px) 100vw, 34vw", src: "/about.avif", width: 1264 }}
            role="Finanční poradce"
            surface={activeTone.domainSurface}
          />
        </Grid>
      </section>

      <TrustBlock
        className={s.trustBlock}
        context={<div><span className={s.contractEyebrow}>TrustBlock</span><h4>Ověřitelné body spolupráce</h4><p>Každý claim nese popis, zdroj a datum posledního ověření.</p></div>}
        density="compact"
      >
        <ProofItem description="Kontinuita zkušeností napříč plánováním, hypotékami a investicemi." icon={<BriefcaseBusiness />} kind="credential" label="let praxe ve finančním plánování" source="Můj profil" sourceUrl="/kdo-jsem/" value="5+" verifiedAt="2026-07-13" />
        <ProofItem description="Veřejně dohledatelná oprávnění a publikované odborné dokumenty." icon={<ShieldCheck />} kind="regulatory" label="regulatorní a odborný kontext" source="Osvědčení a certifikace" sourceUrl="/osvedceni-a-certifikace/" value="Ověřeno" verifiedAt="2026-07-13" />
        <ProofItem description="Osobní schůzky v Olomouci doplňuje plnohodnotná online spolupráce." icon={<Building2 />} kind="association" label="osobní konzultace i online" source="První krok" sourceUrl="/ziskat-prehled/" value="Olomouc" verifiedAt="2026-07-13" />
        <ProofItem description="Hypotéka, rezerva, investice a ochrana příjmu sdílejí jeden rozhodovací plán." icon={<BadgeCheck />} kind="metric" label="společný plán místo izolovaných produktů" source="Popis pracovního postupu" sourceUrl="/jak-pracuji/" value="1 rámec" verifiedAt="2026-07-13" />
      </TrustBlock>
    </Surface>
  );
}

export default function ShellDomainFoundationPreview() {
  const [layer, setLayer] = useState<LabLayer>("contracts");
  const [family, setFamily] = useState<ContractFamily>("shell");
  const [tone, setTone] = useState<PreviewTone>("dark");
  const [shellWidth, setShellWidth] = useState<ShellWidth>("wide");
  const [bookingAllowed, setBookingAllowed] = useState(false);
  const [bookingWithdrawn, setBookingWithdrawn] = useState(false);
  const [bookingScenario, setBookingScenario] = useState<BookingScenario>("ready");
  const [consentStore] = useState(() => createConsentStore());
  const [consentInstance, setConsentInstance] = useState<{ key: number; view: "banner" | "preferences" }>({ key: 0, view: "banner" });
  const activeWidth = shellWidths.find((item) => item.id === shellWidth) ?? shellWidths[2];

  const selectLayerFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % layers.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + layers.length) % layers.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = layers.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    setLayer(layers[nextIndex].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  const openConsentPreferences = () => {
    setConsentInstance((current) => ({ key: current.key + 1, view: "preferences" }));
  };

  return (
    <div className={s.workbench} data-shell-domain-foundation>
      <div aria-label="Shell and Domain lab layers" className={s.layerTabs} role="tablist">
        {layers.map((item, index) => (
          <button
            aria-controls={`shell-domain-${item.id}-panel`}
            aria-selected={layer === item.id}
            id={`shell-domain-${item.id}-tab`}
            key={item.id}
            onClick={() => setLayer(item.id)}
            onKeyDown={(event) => selectLayerFromKeyboard(event, index)}
            role="tab"
            tabIndex={layer === item.id ? 0 : -1}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div aria-labelledby={`shell-domain-${layer}-tab`} id={`shell-domain-${layer}-panel`} role="tabpanel" tabIndex={0}>
        {layer === "contracts" ? (
          <section className={s.labLayer} data-lab-layer="contracts">
            <LayerIntro eyebrow="Contract Lab" heading="Stabilní anatomie místo univerzálních karet" copy="Shell a domain používají patnáct veřejných kontraktů. Kind, scope a podporované surface kontexty jsou nezávislé osy." />
            <ContractIndex />
            <div aria-label="Contract family" className={s.segmentedControl} role="group">
              <button aria-pressed={family === "shell"} data-active={family === "shell" || undefined} onClick={() => setFamily("shell")} type="button">Shell contracts</button>
              <button aria-pressed={family === "domain"} data-active={family === "domain" || undefined} onClick={() => setFamily("domain")} type="button">Domain contracts</button>
            </div>
            {family === "shell" ? <ShellContracts /> : (
              <>
                <div aria-label="Domain surface tone" className={s.segmentedControl} role="group">
                  {previewTones.map((item) => <button aria-pressed={tone === item.id} data-active={tone === item.id || undefined} key={item.id} onClick={() => setTone(item.id)} type="button">{item.label}</button>)}
                </div>
                <DomainContracts tone={tone} />
              </>
            )}
          </section>
        ) : null}

        {layer === "shell-document" ? (
          <section className={s.labLayer} data-lab-layer="shell-document">
            <LayerIntro eyebrow="Isolated document" heading="Jeden legitimní banner, main a contentinfo" copy="Plná shell composition běží v samostatném dokumentu. Iframe mění pouze dostupnou šířku; DOM a komponentové props zůstávají stejné." />
            <div aria-label="Shell preview width" className={s.segmentedControl} role="group">
              {shellWidths.map((item) => <button aria-pressed={shellWidth === item.id} data-active={shellWidth === item.id || undefined} key={item.id} onClick={() => setShellWidth(item.id)} type="button">{item.label}</button>)}
            </div>
            <dl className={s.shellDiagnostics}>
              <div><dt>Document</dt><dd>/design-language/shell-preview/</dd></div>
              <div><dt>Inline size</dt><dd>{activeWidth.width} px</dd></div>
              <div><dt>Landmarks</dt><dd>banner · main · contentinfo</dd></div>
              <div><dt>Navigation</dt><dd>single DOM · desktop/mobile state</dd></div>
            </dl>
            <div className={s.iframeStage} data-preview-width={shellWidth} style={{ "--shell-preview-width": `${activeWidth.width}px` } as CSSProperties}>
              <iframe src="/design-language/shell-preview/?page=3" title={`Izolovaný SiteShell preview – ${activeWidth.label}`} />
            </div>
          </section>
        ) : null}

        {layer === "integrations" ? (
          <section className={s.labLayer} data-lab-layer="integrations">
            <LayerIntro eyebrow="Integration Lab" heading="Validace, fallback a hranice soukromí" copy="Formulář, externí kalendář a analytika používají oddělené stavové modely. Přímá cesta zůstává dostupná v každém stavu." />

            <div className={s.decisionFlow}>
              <section aria-labelledby="message-path-title">
                <header><span>Primární cesta</span><h4 id="message-path-title">Napište zprávu</h4></header>
                <EnquiryForm preset="contact" />
              </section>
              <div aria-hidden="true" className={s.orDivider}><span>nebo</span></div>
              <section aria-labelledby="booking-path-title">
                <header><span>Volitelná rezervační cesta</span><h4 id="booking-path-title">Vyberte si termín</h4></header>
                <div aria-label="Calendar provider outcome" className={s.segmentedControl} role="group">
                  {(["ready", "provider-error", "network-blocked"] as const).map((scenario) => (
                    <button aria-pressed={bookingScenario === scenario} data-active={bookingScenario === scenario || undefined} key={scenario} onClick={() => setBookingScenario(scenario)} type="button">{scenario}</button>
                  ))}
                </div>
                <BookingPanel
                  fallbackHref="mailto:info@pokornydavid.cz"
                  onPrivacyRequest={() => {
                    setBookingWithdrawn(false);
                    setBookingAllowed(true);
                  }}
                  onPrivacyWithdraw={() => {
                    setBookingAllowed(false);
                    setBookingWithdrawn(true);
                  }}
                  privacyAccepted={bookingAllowed}
                  privacyWithdrawn={bookingWithdrawn}
                  provider={{ src: "/design-language/calendar-provider-preview/", title: "Ukázkový rezervační kalendář" }}
                  providerFailure={bookingScenario === "ready" ? undefined : bookingScenario}
                  surface="card-dark"
                />
              </section>
            </div>

            <section aria-labelledby="consent-contract-title" className={s.consentLab}>
              <header><span>Global integration</span><h4 id="consent-contract-title">ConsentBanner, Preferences, Store a AnalyticsLoader</h4></header>
              <CookieConsent
                initialView={consentInstance.view}
                key={consentInstance.key}
                policyHref="/cookies-a-mereni"
                store={consentStore}
              />
              <ConsentAnalyticsLoader store={consentStore}>
                <output data-analytics-request aria-live="polite">Analytics provider je povolený.</output>
              </ConsentAnalyticsLoader>
              <div className={s.footerConsentBridge} data-surface-tone="dark">
                <SiteFooter
                  brand="PokornyDavid.cz"
                  contact={<Link href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</Link>}
                  groups={[{ label: "Soukromí", links: [{ href: "/cookies-a-mereni", label: "Jak funguje měření" }] }]}
                  legalLinks={[{ href: "/pravni-informace", label: "Právní informace" }]}
                  meta="Volbu lze změnit stejně snadno jako udělit."
                  preferencesAction={<Button onClick={openConsentPreferences} variant="quiet">Nastavení cookies</Button>}
                />
              </div>
            </section>
          </section>
        ) : null}
      </div>
    </div>
  );
}
