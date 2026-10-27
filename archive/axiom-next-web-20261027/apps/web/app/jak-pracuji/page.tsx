import type { Metadata } from "next";
import LiquidLinesBackdrop from "@/app/_components/effects/LiquidLinesBackdrop.client";
import flow from "@/app/_components/effects/liquidLines.module.css";
import { OverviewActionLink } from "@/app/_components/PublicSiteChrome";
import ReactBitsSilk from "@/app/_components/effects/ReactBitsSilk.client";
import { MarketingPageShell } from "@/app/components/multipage/MarketingPage";
import { processPageSteps } from "@/app/content/processSteps";
import ActionBand from "@/app/ui/patterns/ActionBand";
import { createPageMetadata } from "@/lib/seo";
import ProcessMotion from "./ProcessMotion.client";
import s from "./processPage.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Jak spolupráce probíhá",
  description:
    "Pět srozumitelných kroků od první otázky k finančnímu rozhodnutí, kterému rozumíte.",
  path: "/jak-pracuji/",
});

export default function ProcessPage() {
  return (
    <MarketingPageShell
      currentPath="/jak-pracuji/"
      footerClassName={s.processFooter}
      headerClassName={s.processHeader}
    >
      <div
        className={s.page}
        data-process-page
        data-route-reveal-root
        data-route-reveal-profile="staged"
      >
        <ProcessMotion />

        <section
          className={s.heroChapter}
          data-process-hero
          data-surface-tone="dark"
          aria-labelledby="process-title"
        >
          <ReactBitsSilk
            className={s.heroSilk}
            readyAttribute="data-process-silk-ready"
            readyTargetSelector="[data-process-hero]"
          />
          <div className={s.heroVeil} aria-hidden="true" />

          <div className={`${s.inner} ${s.heroGrid}`}>
            <div className={s.heroCopy} data-process-hero-copy>
              <h1 id="process-title">
                <span data-process-hero-part data-route-hero-entry="0">
                  Každé doporučení
                </span>
                <span
                  className={s.heroAccent}
                  data-process-hero-part
                  data-route-hero-entry="1"
                >
                  musí mít důvod.
                </span>
              </h1>
              <p
                className={s.heroLead}
                data-process-hero-part
                data-route-hero-entry="2"
              >
                Nejdřív pochopím vaši situaci. Potom vám ukážu možnosti,
                jejich dopady a cestu, za kterou si umím stát.
              </p>
              <div
                className={s.heroActionGroup}
                data-process-hero-part
                data-route-hero-entry="3"
              >
                <OverviewActionLink
                  className={s.heroPrimaryAction}
                  cursorLabel="ÚVODNÍ HOVOR • ZAČÍT BEZ ZÁVAZKU •"
                  href="/ziskat-prehled/?source=process&cta=process-hero"
                  label="Začít úvodním hovorem"
                  placement="hero"
                  track={false}
                />
                <p className={s.heroNote}>
                  Bez závazku a bez přípravy dokumentů.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className={s.processChapter}
          data-process-chapter
          data-surface-tone="light"
          aria-labelledby="steps-title"
          id="postup"
        >
          <div className={s.inner}>
            <header
              className={s.chapterHeader}
              data-process-intro
              data-route-reveal-group
            >
              <div data-process-intro-main>
                <p className={s.eyebrow} data-route-reveal-item="meta">
                  Postup / 5 kroků
                </p>
                <h2 id="steps-title">
                  <span
                    className={s.chapterTitleLine}
                    data-process-intro-line
                    data-route-reveal-item="title"
                  >
                    Od první otázky
                  </span>
                  {" "}
                  <span
                    className={s.chapterTitleLine}
                    data-process-intro-line
                    data-route-reveal-item="title"
                  >
                    k plánu, kterému
                  </span>
                  {" "}
                  <span
                    className={s.chapterTitleLine}
                    data-process-intro-line
                    data-route-reveal-item="title"
                  >
                    rozumíte.
                  </span>
                </h2>
              </div>
              <p data-process-intro-copy data-route-reveal-item="body">
                Nemusíte přicházet s hotovým zadáním ani znát finanční
                terminologii. Každá fáze má jasný účel a konkrétní výstup.
              </p>
            </header>

            <div
              className={s.ledgerHeader}
              data-process-ledger-header
              data-route-reveal-group="row"
              aria-hidden="true"
            >
              <span data-route-reveal-item="meta">Krok / role</span>
              <span data-route-reveal-item="meta">Co uděláme</span>
              <span data-route-reveal-item="meta">Jak to proběhne</span>
              <span data-route-reveal-item="meta">Po tomto kroku</span>
            </div>

            <ol className={s.stepLedger}>
              {processPageSteps.map((step) => (
                <li
                  data-process-step
                  data-route-reveal-group="row"
                  key={step.number}
                >
                  <div
                    className={s.stepMeta}
                    data-process-step-part="meta"
                    data-route-reveal-item="meta"
                  >
                    <span>{step.number}</span>
                    <strong>{step.role}</strong>
                  </div>
                  <h3
                    data-process-step-part="title"
                    data-route-reveal-item="title"
                  >
                    {step.title}
                  </h3>
                  <p
                    className={s.stepText}
                    data-process-step-part="description"
                    data-route-reveal-item="body"
                  >
                    {step.text}
                  </p>
                  <p
                    className={s.stepResult}
                    data-process-step-part="result"
                    data-route-reveal-item="body"
                  >
                    {step.result}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className={s.principlesChapter}
          data-process-manifesto
          data-route-reveal-group
          data-surface-tone="dark"
          aria-labelledby="principles-title"
        >
          <LiquidLinesBackdrop />
          <div
            className={`${s.inner} ${s.manifestoScene} ${flow.content}`}
            data-process-manifesto-scene
          >
            <p
              className={s.eyebrow}
              data-process-manifesto-part="eyebrow"
              data-route-reveal-item="meta"
            >
              NA ČEM TRVÁM
            </p>

            <div className={s.manifestoComposition} data-route-reveal-group>
              <h2 className={s.manifestoTitle} id="principles-title">
                <span
                  className={s.manifestoPrimary}
                  data-process-manifesto-part="primary"
                  data-route-reveal-item="title"
                >
                  Vy rozhodujete.
                </span>
                {" "}
                <span
                  className={s.manifestoAccent}
                  data-process-manifesto-part="accent"
                  data-route-reveal-item="title"
                >
                  Já za doporučením stojím.
                </span>
              </h2>

              <p
                className={s.manifestoDescription}
                data-process-manifesto-part="description"
                data-route-reveal-item="body"
              >
                U každé možnosti vám ukážu důvod, dopad i limity.
                Rozhodnete se s plným kontextem a bez tlaku.
              </p>
            </div>

            <div className={s.manifestoSignature} data-route-reveal-group="row">
              <p
                className={s.manifestoSignatureText}
                data-process-manifesto-part="signature"
              >
                <span className={s.manifestoPhrase} data-route-reveal-item="body">Vysvětlený důvod.</span>
                {" "}
                <span className={s.manifestoPhrase} data-route-reveal-item="body">Viditelný dopad.</span>
                {" "}
                <span className={s.manifestoPhrase} data-route-reveal-item="body">Volba bez tlaku.</span>
              </p>
            </div>
          </div>
        </section>

        <section
          className={s.preparationChapter}
          data-process-preparation
          data-surface-tone="light"
          aria-labelledby="preparation-title"
        >
          <div className={`${s.inner} ${s.preparationGrid}`}>
            <header
              data-process-preparation-part="intro"
              data-route-reveal-group
            >
              <p className={s.eyebrow} data-route-reveal-item="meta">První rozhovor</p>
              <h2 id="preparation-title" data-route-reveal-item="title">
                Na první rozhovor se nemusíte připravovat.
              </h2>
            </header>

            <div
              className={s.preparationDetails}
              data-process-preparation-part="details"
            >
              <div data-process-preparation-row data-route-reveal-group="row">
                <p className={s.preparationLabel} data-route-reveal-item="meta">Co potřebuji</p>
                <p data-route-reveal-item="body">
                  Stručný popis situace, hlavní otázku a způsob, jak se vám
                  mám ozvat.
                </p>
              </div>
              <div data-process-preparation-row data-route-reveal-group="row">
                <p className={s.preparationLabel} data-route-reveal-item="meta">Co zatím není potřeba</p>
                <p data-route-reveal-item="body">
                  Smlouvy, výpisy, rodná čísla ani podrobné finanční údaje.
                  O konkrétní podklady si řeknu až tehdy, když budou pro
                  posouzení důležité.
                </p>
              </div>
            </div>
          </div>
        </section>

        <ActionBand
          actions={(
            <OverviewActionLink
              cursorLabel="PRVNÍ KROK • UDĚLAT SI JASNO •"
              data-process-action-cta
              data-route-reveal-item="control"
              href="/ziskat-prehled/?source=process&cta=process-final"
              label="Zjistit, čím začít"
              placement="process-final"
              track={false}
            />
          )}
          data-process-action
          data-route-reveal-group
          data-nav-theme="light"
          eyebrow={<span data-route-reveal-item="meta">První krok</span>}
          heading={(
            <span data-route-reveal-item="title">Na začátku stačí jedna otázka.</span>
          )}
          headingId="action-title"
          lead={(
            <span data-route-reveal-item="body">
              Vyberte, co právě řešíte, a způsob, jak se vám mám ozvat. Bez
              dokumentů, smluv a citlivých finančních údajů.
            </span>
          )}
          surface="action"
        />
      </div>
    </MarketingPageShell>
  );
}
