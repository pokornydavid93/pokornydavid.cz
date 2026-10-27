import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  Home,
  Phone,
  ShieldCheck,
} from "lucide-react";
import LogoMark from "@/app/svgr/LogoMark";
import { cnbRegistryUrl } from "@/app/content/multipage";
import Surface from "@/app/ui/primitives/Surface";
import { createPageMetadata } from "@/lib/seo";
import { mainSiteHref } from "@/lib/site-mode-routes";
import { createInitialRefixationState } from "./actions";
import RefixationAnalytics from "./RefixationAnalytics.client";
import RefixationDiagnostic from "./RefixationDiagnostic.client";
import RefixationStartButton from "./RefixationStartButton.client";
import { faqItems, threePaths } from "./content";
import s from "./refixationFunnel.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = createPageMetadata({
  title: "Refixace hypotéky: kdy začít a jaké možnosti prověřit",
  description:
    "Zjistěte, kdy začít řešit konec fixace hypotéky. Krátká diagnostika vám ukáže časovou osu, tři možné cesty a další postup.",
  path: "/refixace-hypoteky/",
});

function FunnelHeader() {
  return (
    <Surface as="header" className={s.funnelHeader} surface="page" tone="dark">
      <Link className={s.brandLink} href={mainSiteHref("/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)} aria-label="David Pokorný - hlavní web">
        <LogoMark aria-hidden="true" focusable="false" />
        <span>
          <strong>David Pokorný</strong>
          <small>Refixační audit</small>
        </span>
      </Link>
      <nav aria-label="Funnel navigace">
        <a href="tel:+420731830897" className={s.headerPhone}>
          <Phone aria-hidden="true" />
          <span>+420 731 830 897</span>
        </a>
        <Link className={s.backLink} href={mainSiteHref("/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)}>
          Zpět na hlavní web
        </Link>
        <RefixationStartButton placement="header" />
      </nav>
    </Surface>
  );
}

function Faq() {
  return (
    <section className={s.faqSection} aria-labelledby="refixation-faq-title">
      <div className={s.sectionIntro} data-route-reveal-group>
        <p className={s.kicker} data-route-reveal-item="meta">FAQ</p>
        <h2 data-route-reveal-item="title" id="refixation-faq-title">Praktické otázky k refixaci.</h2>
      </div>
      <div className={s.faqList}>
        {faqItems.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p data-route-reveal-item="body">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default async function RefixationMortgagePage() {
  const initialState = await createInitialRefixationState();
  const now = new Date();
  const baseMonth = now.getMonth() + 1;
  const baseYear = now.getFullYear();

  return (
    <>
      <RefixationAnalytics />
      <FunnelHeader />
      <Surface
        as="main"
        data-route-reveal-root
        data-route-reveal-profile="staged"
        className={s.page}
        id="main-content"
        surface="paper"
        tabIndex={-1}
        tone="light"
      >
        <RefixationDiagnostic
          baseMonth={baseMonth}
          baseYear={baseYear}
          initialState={initialState}
        />

        <section className={s.auditOutcome} aria-labelledby="audit-outcome-title">
          <div className={s.sectionIntro} data-route-reveal-group>
            <p className={s.kicker} data-route-reveal-item="meta">Co získáte</p>
            <h2 data-route-reveal-item="title" id="audit-outcome-title">Jeden výstup ve třech vrstvách.</h2>
            <p data-route-reveal-item="body">
              Audit neslibuje sazbu ani úsporu. Pomáhá pojmenovat čas, dostupné
              cesty a pořadí dalších kroků.
            </p>
          </div>
          <div className={s.layeredOutcome}>
            <div data-route-reveal-group="row">
              <span data-route-reveal-item="meta">01</span>
              <h3 data-route-reveal-item="title">Časová osa</h3>
              <p data-route-reveal-item="body">Kdy hlídat podklady, nabídku banky a kontrolní termín.</p>
            </div>
            <div data-route-reveal-group="row">
              <span data-route-reveal-item="meta">02</span>
              <h3 data-route-reveal-item="title">Tři rozhodovací cesty</h3>
              <p data-route-reveal-item="body">Současná banka, vyjednání podmínek nebo připravená alternativa.</p>
            </div>
            <div data-route-reveal-group="row">
              <span data-route-reveal-item="meta">03</span>
              <h3 data-route-reveal-item="title">Jednostránkový plán</h3>
              <p data-route-reveal-item="body">Co spolu ověříme před dalším rozhodnutím.</p>
            </div>
          </div>
        </section>

        <Surface
          as="section"
          className={s.pathsSection}
          surface="action-dark"
          tone="dark"
          aria-labelledby="refixation-paths-title"
        >
          <div className={s.sectionIntro} data-route-reveal-group>
            <p className={s.kicker} data-route-reveal-item="meta">Tři možné cesty</p>
            <h2 data-route-reveal-item="title" id="refixation-paths-title">Výsledek nevybírá banku za vás.</h2>
          </div>
          <div className={s.pathStack}>
            {threePaths.map((path, index) => (
              <article data-route-reveal-group="row" key={path.title}>
                <span data-route-reveal-item="meta">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 data-route-reveal-item="title">{path.title}</h3>
                  <p data-route-reveal-item="body">{path.text}</p>
                </div>
              </article>
            ))}
          </div>
        </Surface>

        <section className={s.processSection} aria-labelledby="refixation-process-title">
          <div className={s.sectionIntro} data-route-reveal-group>
            <p className={s.kicker} data-route-reveal-item="meta">Proces spolupráce</p>
            <h2 data-route-reveal-item="title" id="refixation-process-title">Maximálně tři kroky.</h2>
          </div>
          <ol className={s.processList}>
            <li data-route-reveal-group="row">
              <CheckCircle2 aria-hidden="true" />
              <span data-route-reveal-item="body">Vyplníte krátkou diagnostiku.</span>
            </li>
            <li data-route-reveal-group="row">
              <CheckCircle2 aria-hidden="true" />
              <span data-route-reveal-item="body">Ověřím vstupy a doplním kontext.</span>
            </li>
            <li data-route-reveal-group="row">
              <CheckCircle2 aria-hidden="true" />
              <span data-route-reveal-item="body">Dostanete jasný plán, kdy a co řešit.</span>
            </li>
          </ol>
        </section>

        <section className={s.proofSection} aria-labelledby="refixation-proof-title">
          <div className={s.sectionIntro} data-route-reveal-group>
            <p className={s.kicker} data-route-reveal-item="meta">Klientský důkaz</p>
            <h2 data-route-reveal-item="title" id="refixation-proof-title">Důvěra stojí na doložené zkušenosti.</h2>
            <p data-route-reveal-item="body">
              U refixací neslibuji výsledky, které nemohu doložit. Opírám se
              proto jen o to, co se opakuje v ověřených zkušenostech mých
              klientů.
            </p>
          </div>
          <div className={s.proofSignals}>
            <span>Srozumitelné vysvětlení</span>
            <span>Férový postup bez tlaku</span>
            <span>Klid v rozhodování</span>
          </div>
        </section>

        <Surface
          as="section"
          className={s.profileSection}
          surface="action-dark"
          tone="dark"
          aria-labelledby="refixation-profile-title"
        >
          <div className={s.profileMedia}>
            <Image
              src="/who.png"
              alt="Můj portrét při poradenském rozhovoru"
              fill
              sizes="(max-width: 840px) 92vw, 420px"
            />
          </div>
          <div className={s.profileCopy} data-route-reveal-group>
            <p className={s.kicker} data-route-reveal-item="meta">David Pokorný</p>
            <h2 data-route-reveal-item="title" id="refixation-profile-title">Za auditem stojím osobně.</h2>
            <p data-route-reveal-item="body">
              Působím jako vázaný zástupce společnosti SAB servis s.r.o.
              Konkrétní doporučení vám mohu dát až po ověření vaší situace,
              relevantních podkladů a priorit domácnosti.
            </p>
            <div className={s.profileLinks}>
              <a
                href={cnbRegistryUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BadgeCheck aria-hidden="true" />
                Ověřit v registru ČNB
              </a>
              <Link href={mainSiteHref("/pravni-informace/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)}>
                <FileCheck2 aria-hidden="true" />
                Právní informace
              </Link>
            </div>
          </div>
        </Surface>

        <Faq />

        <Surface
          as="section"
          className={s.finalCta}
          surface="action"
          tone="action"
          aria-labelledby="refixation-final-title"
          data-route-reveal-group
        >
          <div>
            <p className={s.kicker} data-route-reveal-item="meta">Začněte rozhodovacím oknem</p>
            <h2 data-route-reveal-item="title" id="refixation-final-title">Nejdřív čas. Potom možnosti.</h2>
            <p data-route-reveal-item="body">
              Krátká diagnostika určí, jestli je čas jednat, připravovat se,
              nebo jen nastavit kontrolní termín.
            </p>
          </div>
          <RefixationStartButton placement="final" />
        </Surface>

        <Surface
          as="footer"
          className={s.complianceFooter}
          surface="page"
          tone="dark"
        >
          <div className={s.footerBrand}>
            <LogoMark aria-hidden="true" focusable="false" />
            <div>
              <strong>David Pokorný</strong>
              <span>IČO 09016236 · vázaný zástupce SAB servis s.r.o.</span>
            </div>
          </div>
          <p data-route-reveal-item="body">
            David Pokorný, IČO 09016236, se sídlem Za Zbrojnicí 446,
            784 01 Červenka, působí jako vázaný zástupce společnosti SAB
            servis s.r.o., IČO 24704008, se sídlem Jungmannova 748/30, 110 00 Praha 1.
            Informace na této stránce jsou obecné a nenahrazují individuální
            finanční doporučení.
          </p>
          <div className={s.footerLinks}>
            <Link href={mainSiteHref("/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)}>
              <Home aria-hidden="true" />
              Hlavní web
            </Link>
            <Link href={mainSiteHref("/pravni-informace/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)}>
              <ShieldCheck aria-hidden="true" />
              Právní informace
            </Link>
            <Link href="/zasady-zpracovani-osobnich-udaju/">
              Ochrana osobních údajů
            </Link>
            <Link href="/cookies-a-mereni/">Cookies a měření</Link>
            <a href="https://sabservis.cz/informace" target="_blank" rel="noreferrer">
              Dokumentace SAB servis <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </Surface>
      </Surface>
    </>
  );
}
