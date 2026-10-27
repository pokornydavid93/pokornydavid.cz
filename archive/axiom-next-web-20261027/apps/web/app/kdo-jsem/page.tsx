import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { OverviewActionLink } from "@/app/_components/PublicSiteChrome";
import ReactBitsSilk from "@/app/_components/effects/ReactBitsSilk.client";
import LiquidLinesBackdrop from "@/app/_components/effects/LiquidLinesBackdrop.client";
import flow from "@/app/_components/effects/liquidLines.module.css";
import { MarketingPageShell } from "@/app/components/multipage/MarketingPage";
import { cnbRegistryUrl, sabDocumentationUrl } from "@/app/content/multipage";
import { getReviewById } from "@/app/content/testimonials";
import ActionBand from "@/app/ui/patterns/ActionBand";
import Link from "@/app/ui/primitives/Link";
import { createPageMetadata } from "@/lib/seo";
import AboutMotion from "./AboutMotion.client";
import s from "./aboutPage.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Kdo jsem",
  description:
    "Ukážu vám, jak přemýšlím o finančních rozhodnutích: v souvislostech, srozumitelně a bez tlaku na produkt.",
  path: "/kdo-jsem/",
});

type PlanLayer = "foundation" | "goals" | "whole";

const thinkingSteps: ReadonlyArray<{
  id: string;
  label: string;
  title: string;
  lead: string;
  text: string;
  activeLayer: PlanLayer;
}> = [
  {
    id: "1",
    label: "Nejdřív základ",
    title: "Nejdřív potřebuji vědět, co nesmí být ohrožené.",
    lead: "Nejdřív",
    text: "Příjem, majetek a odpovědnost tvoří základ, který musí obstát i ve chvíli, kdy se život nevyvíjí podle plánu.",
    activeLayer: "foundation",
  },
  {
    id: "2",
    label: "Potom cíle",
    title: "Na pevném základu můžeme stavět to, kam míříte.",
    lead: "Na pevném základu",
    text: "Vlastní bydlení, studium dětí nebo finanční nezávislost potřebují čas, prostředky a prostor v rozpočtu.",
    activeLayer: "goals",
  },
  {
    id: "3",
    label: "Vždy jako celek",
    title: "Každé rozhodnutí musí fungovat v obou vrstvách.",
    lead: "Každé rozhodnutí",
    text: "Nejde o šest oddělených produktů. Jde o jeden plán, který chrání váš příjem i majetek a pomáhá vám dosahovat dlouhodobých cílů.",
    activeLayer: "whole",
  },
] as const;

const planGoals = [
  "Vlastní bydlení",
  "Studium dětí",
  "Finanční nezávislost",
] as const;

const planFoundation = [
  "Zajištění příjmu",
  "Ochrana majetku",
  "Pojištění odpovědnosti",
] as const;

const SHOW_SITUATION_DIAGRAM = false;

const personalAnswers: ReadonlyArray<{
  question: string;
  answer: string;
  emphasis?: string;
}> = [
  {
    question: "Co považuji za dobré doporučení?",
    answer:
      "Takové, které můžete dlouhodobě skutečně dodržet — nejen obhájit v tabulce.",
  },
  {
    question: "Co při rozhodování hlídám?",
    answer:
      "Dopad na rozpočet, rezervu a další plány. Jedna výhoda nesmí schovat problém jinde.",
  },
  {
    question: "Kdo má poslední slovo?",
    emphasis: "Vy.",
    answer: "Mojí rolí je udělat v možnostech jasno, ne rozhodnout za vás.",
  },
] as const;

type CooperationAgreement = {
  index: string;
  label: string;
  lead: string;
  expected: string;
  notExpected: string;
};

const cooperationAgreements = [
  {
    index: "01",
    label: "Nejdřív otázky",
    lead: "Otázky",
    expected: "Otázky dřív než doporučení.",
    notExpected: "Tlak na rychlé rozhodnutí.",
  },
  {
    index: "02",
    label: "Jasné souvislosti",
    lead: "Souvislosti",
    expected: "Souvislosti vysvětlené normálním jazykem.",
    notExpected:
      "Řešení jednoho produktu bez ohledu na zbytek vaší situace.",
  },
  {
    index: "03",
    label: "Možnosti a dopady",
    lead: "Možnosti",
    expected: "Možnosti s jasně vysvětlenými dopady a pořadím.",
    notExpected: "Slib univerzálního řešení pro každého.",
  },
  {
    index: "04",
    label: "Vaše rozhodnutí",
    lead: "Konkrétní",
    expected: "Konkrétní další krok, o kterém rozhodnete vy.",
    notExpected:
      "Citlivé údaje nebo dokumenty hned při prvním kontaktu.",
  },
] as const satisfies readonly CooperationAgreement[];

const certificates = [
  { label: "Pojištění", href: "/pojisteni-cert.pdf" },
  { label: "Penzijní spoření", href: "/penzijko-cert.pdf" },
  { label: "Investice", href: "/investice-cert.pdf" },
  { label: "Úvěry", href: "/uvery-cert.pdf" },
] as const;

const featuredReview = getReviewById("denisa-reznickova");

const ArrowLinkIcon = () => <ArrowUpRight aria-hidden="true" />;

export default function AboutPage() {
  return (
    <MarketingPageShell
      currentPath="/kdo-jsem/"
      footerClassName={s.aboutFooter}
      headerClassName={s.aboutHeader}
    >
      <div className={s.page} data-about-page data-route-reveal-root data-route-reveal-profile="staged">
        <AboutMotion />

        <section
          className={`${s.chapter} ${s.heroChapter}`}
          data-about-chapter="dark"
          data-about-hero-chapter
          data-surface-tone="dark"
          aria-labelledby="about-title"
        >
          <ReactBitsSilk
            className={s.heroSilkBackdrop}
            readyAttribute="data-about-silk-ready"
            readyTargetSelector="[data-about-hero-chapter]"
          />
          <div className={`${s.inner} ${s.hero}`} data-about-hero>
            <div className={s.heroCopy}>
              <h1 id="about-title">
                <span data-about-hero-part data-route-hero-entry="0">
                  Nechci, abyste mi věřili.
                </span>{" "}
                <span
                  className={s.accentTitle}
                  data-about-hero-part
                  data-route-hero-entry="1"
                >
                  Chci, abyste mi rozuměli.
                </span>
              </h1>
              <p
                className={s.heroLead}
                data-about-hero-part
                data-route-hero-entry="2"
              >
                Ukážu vám celý obraz, abyste se mohli rozhodnout sami a s
                jistotou.
              </p>
              <div
                className={s.heroActions}
                data-about-hero-part
                data-route-hero-entry="3"
              >
                <OverviewActionLink
                  className={s.heroPrimaryAction}
                  cursorLabel="PRVNÍ KROK • UDĚLAT SI JASNO •"
                  href="/ziskat-prehled/?source=about&cta=about-hero"
                  label="Zjistit, čím začít"
                  placement="hero"
                  track={false}
                />
                <Link
                  className={s.heroSecondaryAction}
                  data-cursor="action"
                  data-cursor-icon="arrow"
                  data-cursor-magnetic="true"
                  href="/jak-pracuji/"
                  variant="secondary-action"
                >
                  <span data-cta-label>Jak spolupráce probíhá</span>
                  <span
                    aria-hidden="true"
                    className={s.heroSecondaryActionIcon}
                    data-cta-icon-shell
                  >
                    <ArrowRight data-cta-icon="arrow" />
                  </span>
                </Link>
              </div>
            </div>

            <figure
              className={s.heroPortrait}
              data-about-portrait
              data-route-hero-entry="1"
              data-route-hero-entry-kind="visual"
            >
              <div className={s.heroPortraitFrame}>
                <div
                  className={s.heroPortraitScene}
                  data-about-portrait-image
                >
                  <Image
                    src="/heroRemastered.png"
                    alt="Můj portrét"
                    width={1254}
                    height={1254}
                    priority
                    sizes="(max-width: 680px) 150vw, (max-width: 920px) 100vw, (max-width: 1180px) 820px, 1140px"
                    className={s.heroPortraitImage}
                  />
                </div>
              </div>
            </figure>
          </div>
        </section>

        <section
          className={`${s.chapter} ${s.paperChapter} ${s.beliefChapter}`}
          data-about-chapter="paper"
          data-surface-tone="light"
          data-about-editorial
          aria-labelledby="belief-title"
          id="jak-pracuji"
        >
          <div
            className={`${s.inner} ${s.beliefGrid}`}
            data-about-reveal
          >
            <div
              className={`${s.sectionHeading} ${s.beliefHeading}`}
              data-about-editorial-part
              data-route-reveal-group
            >
              <p className={s.eyebrow} data-route-reveal-item="meta">Proč to dělám</p>
              <h2 id="belief-title">
                <span data-route-reveal-item="title">Finanční</span>{" "}
                <span data-route-reveal-item="title">rozhodnutí</span>{" "}
                <span data-route-reveal-item="title">nevznikají</span>{" "}
                <span data-route-reveal-item="title">ve vakuu.</span>
              </h2>
            </div>
            <div
              className={s.beliefCopy}
              data-about-editorial-part
              data-route-reveal-group="row"
            >
              <p className={s.lede} data-route-reveal-item="detail">
                K financím jsem se dostal, protože jsem chtěl pochopit, proč
                mohou dvě jednotlivě správná rozhodnutí společně vytvořit
                špatný výsledek.
              </p>
              <p data-route-reveal-item="body">
                Hypotéka ovlivňuje rezervu. Pojištění chrání příjem, ze kterého
                se splácí. Investice potřebují čas i prostor v rozpočtu.
                Postupně mi došlo, že smysl nemá hledat nejlepší produkt
                izolovaně, ale pochopit celý životní kontext člověka.
              </p>
            </div>
            <blockquote
              className={s.beliefQuote}
              data-about-editorial-part
              data-route-reveal-group="row"
            >
              <span aria-hidden="true">„</span>
              <p data-route-reveal-item="detail">
                Nechci, abyste odešli jen s novou smlouvou. Chci, abyste
                rozuměli tomu, proč je další krok správný právě pro vás.
              </p>
            </blockquote>
          </div>
        </section>

        <section
          className={`${s.chapter} ${s.manifestoChapter}`}
          data-about-chapter="dark"
          data-surface-tone="dark"
          data-about-manifesto
          data-active-principle="1"
          data-active-layer="foundation"
          aria-labelledby="manifesto-title"
          id="jak-premyslim"
        >
          <LiquidLinesBackdrop />
          <div className={`${s.inner} ${flow.content}`}>
            <header
              className={s.manifestoHeading}
              data-about-reveal
              data-route-reveal-group
            >
              <div className={s.manifestoHeadingCopy}>
                <p className={s.eyebrow} data-route-reveal-item="meta">Jak přemýšlím</p>
                <h2 id="manifesto-title">
                  <span data-route-reveal-item="title">Nejdřív chráníme to podstatné.</span>{" "}
                  <span data-route-reveal-item="title">Potom stavíme to, kam míříte.</span>
                </h2>
              </div>
              <p className={s.manifestoLead} data-route-reveal-item="body">
                Nezačínám produktem. Nejdřív si společně srovnáme pořadí:
                co chránit, co budovat a jak obě části propojit do jednoho
                plánu.
              </p>
            </header>

            <div className={s.manifestoLayout}>
              {SHOW_SITUATION_DIAGRAM ? (
                <aside
                  className={s.methodDiagram}
                  data-about-diagram
                  data-active-principle="1"
                  data-active-layer="foundation"
                  aria-label="Finanční plán propojuje ochranu příjmu, majetku a odpovědnosti s cíli, jako je bydlení, studium dětí a finanční nezávislost. Uprostřed stojí konkrétní situace klienta."
                >
                  <div className={s.diagramCanvas}>
                    <section
                      className={`${s.diagramLayer} ${s.goalsLayer}`}
                      data-plan-layer="goals"
                      aria-labelledby="plan-goals-title"
                    >
                      <p className={s.layerEyebrow} id="plan-goals-title">
                        Co chcete postupně vybudovat
                      </p>
                      <div
                        className={`${s.layerBaseline} ${s.goalsBaseline}`}
                        data-architecture-baseline="goals"
                        aria-hidden="true"
                      />
                      <ul className={s.layerItems}>
                        {planGoals.map((goal) => (
                          <li data-about-diagram-node key={goal}>
                            <strong>{goal}</strong>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <div
                      className={s.situationNode}
                      data-plan-layer="center"
                    >
                      <strong>Vaše situace</strong>
                      <span>Rozpočet · priority · čas · životní změny</span>
                    </div>

                    <section
                      className={`${s.diagramLayer} ${s.foundationLayer}`}
                      data-plan-layer="foundation"
                      aria-labelledby="plan-foundation-title"
                    >
                      <ul className={s.layerItems}>
                        {planFoundation.map((foundation) => (
                          <li data-about-diagram-node key={foundation}>
                            <strong>{foundation}</strong>
                          </li>
                        ))}
                      </ul>
                      <div
                        className={`${s.layerBaseline} ${s.foundationBaseline}`}
                        data-architecture-baseline="foundation"
                        aria-hidden="true"
                      />
                      <p className={s.layerEyebrow} id="plan-foundation-title">
                        Co musí zůstat v bezpečí
                      </p>
                    </section>
                  </div>
                </aside>
              ) : null}

              <ol className={s.principleList}>
                {thinkingSteps.map((principle) => (
                  <li
                    className={s.principle}
                    data-about-principle={principle.id}
                    data-route-reveal-group="row"
                    data-plan-step-layer={principle.activeLayer}
                    key={principle.id}
                  >
                    <span
                      className={s.principleRule}
                      data-about-principle-rule
                      data-route-reveal-rule
                      aria-hidden="true"
                    />
                    <div className={s.principleMeta}>
                      <span
                        className={s.principleIndex}
                        data-about-principle-accent
                        data-about-principle-index
                        data-route-reveal-item="meta"
                        aria-hidden="true"
                      >
                        0{principle.id}
                      </span>
                      <p data-about-principle-label data-route-reveal-item="meta">{principle.label}</p>
                    </div>
                    <h3 data-about-principle-title data-route-reveal-item="title">
                      <span className={s.claimLead} data-about-claim-lead>
                        {principle.lead}
                      </span>
                      {principle.title.slice(principle.lead.length)}
                    </h3>
                    <span className={s.principleText} data-about-principle-copy data-route-reveal-item="body">
                      {principle.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div
              className={s.manifestoStatement}
              data-about-reveal
              data-route-reveal-group
            >
              <span data-route-reveal-item="meta">Jedno pravidlo</span>
              <p data-route-reveal-item="title">
                <span className={s.claimLead} data-about-claim-lead>
                  Dobrý finanční plán
                </span>{" "}
                neřeší jen to, čeho chcete dosáhnout. Musí
                zároveň chránit všechno, na čem vaše cesta stojí.
              </p>
            </div>
          </div>
        </section>

        <section
          className={`${s.chapter} ${s.paperChapter} ${s.humanChapter}`}
          data-about-chapter="paper"
          data-surface-tone="light"
          data-about-human
          aria-labelledby="human-title"
          id="clovek"
        >
          <div className={`${s.inner} ${s.humanLayout}`}>
            <header className={`${s.sectionHeading} ${s.humanCopy}`} data-route-reveal-group>
              <p
                className={s.eyebrow}
                data-about-human-eyebrow
                data-route-reveal-item="meta"
              >
                Osobně
              </p>
              <h2
                id="human-title"
                data-about-human-heading
              >
                <span data-route-reveal-item="title">Za každým plánem</span>{" "}
                <span data-route-reveal-item="title">vidím konkrétní život.</span>
              </h2>
            </header>

            <div
              className={s.humanMedia}
              data-about-human-media
              data-route-reveal-group="row"
              data-route-reveal-transform="none"
            >
              <Image
                src="/nahled-video.avif"
                alt="Můj portrét při pracovním rozhovoru"
                fill
                sizes="(max-width: 920px) calc(100vw - 40px), (max-width: 1180px) 45vw, 640px"
                className={s.humanImage}
                data-route-reveal-item="detail"
              />
            </div>

            <dl className={s.answerList}>
              {personalAnswers.map((item) => (
                <div
                  data-about-human-answer
                  data-route-reveal-group="row"
                  key={item.question}
                >
                  <dt data-route-reveal-item="meta">{item.question}</dt>
                  <dd data-route-reveal-item="body">
                    {item.emphasis ? (
                      <>
                        <strong>{item.emphasis}</strong>{" "}
                      </>
                    ) : null}
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          className={`${s.chapter} ${s.expectationsChapter}`}
          data-about-chapter="dark"
          data-surface-tone="dark"
          data-about-expectations
          aria-labelledby="expectations-title"
          id="ocekavani"
        >
          <LiquidLinesBackdrop />
          <div className={`${s.inner} ${flow.content}`}>
            <header className={s.expectationsHeading} data-route-reveal-group>
              <div className={s.expectationsTitle}>
                <p
                  className={s.eyebrow}
                  data-about-agreement-eyebrow
                  data-route-reveal-item="meta"
                >
                  Dohoda od začátku
                </p>
                <h2
                  id="expectations-title"
                  data-about-agreement-heading
                  data-route-reveal-item="title"
                >
                  Aby bylo od začátku jasno.
                </h2>
              </div>
              <p
                className={s.expectationsDescription}
                data-about-agreement-description
                data-route-reveal-item="body"
              >
                Dobrá spolupráce stojí na otevřenosti, ale také na jasných
                hranicích. Proto říkám rovnou, co ode mě můžete čekat — a co ne.
              </p>
            </header>

            <div className={s.agreementMatrix}>
              <div className={s.agreementColumns} data-route-reveal-group="row">
                <span aria-hidden="true" />
                <p id="agreement-expected" data-route-reveal-item="meta">Co můžete očekávat</p>
                <p id="agreement-not-expected" data-route-reveal-item="meta">
                  Co ode mě čekat nemusíte
                </p>
              </div>

              <ol
                className={s.agreementList}
                aria-labelledby="expectations-title agreement-expected agreement-not-expected"
              >
                {cooperationAgreements.map((agreement) => (
                  <li
                    className={s.agreementRow}
                    data-about-agreement-row
                    data-route-reveal-group="row"
                    key={agreement.index}
                  >
                    <span
                      className={s.agreementRule}
                      data-about-agreement-rule
                      data-route-reveal-rule
                      aria-hidden="true"
                    />
                    <div className={s.agreementMeta}>
                      <span
                        className={s.agreementIndex}
                        data-about-agreement-index
                        data-route-reveal-item="meta"
                        aria-hidden="true"
                      >
                        {agreement.index}
                      </span>
                      <p data-about-agreement-eyebrow-row data-route-reveal-item="meta">{agreement.label}</p>
                    </div>
                    <div
                      className={`${s.agreementCell} ${s.agreementExpected}`}
                    >
                      <span
                        className={s.agreementCellLabel}
                        data-about-agreement-label="expected"
                        data-route-reveal-item="meta"
                      >
                        Co můžete očekávat
                      </span>
                      <h3 data-about-agreement-expected data-route-reveal-item="title">
                        <span className={s.claimLead} data-about-claim-lead>
                          {agreement.lead}
                        </span>
                        {agreement.expected.slice(agreement.lead.length)}
                      </h3>
                    </div>
                    <div
                      className={`${s.agreementCell} ${s.agreementNotExpected}`}
                    >
                      <span
                        className={s.agreementCellLabel}
                        data-about-agreement-label="description"
                        data-route-reveal-item="meta"
                      >
                        Co ode mě čekat nemusíte
                      </span>
                      <p data-about-agreement-description data-route-reveal-item="body">{agreement.notExpected}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          className={`${s.chapter} ${s.paperChapter} ${s.evidenceChapter}`}
          data-about-chapter="paper"
          data-surface-tone="light"
          data-about-evidence
          aria-labelledby="evidence-title"
          id="overitelne-informace"
        >
          <div className={s.inner}>
            <header
              className={s.evidenceHeading}
              data-about-reveal
              data-route-reveal-group
            >
              <div>
                <p className={s.eyebrow} data-route-reveal-item="meta">Ověřitelné informace</p>
                <h2 id="evidence-title" data-route-reveal-item="title">Důvěra nemusí stát jen na dojmu.</h2>
              </div>
              <p data-route-reveal-item="body">
                Registraci, profesní postavení i odborné zkoušky uvádím s
                odkazy na původní zdroje a dokumenty.
              </p>
            </header>

            <div className={s.evidenceList}>
              <article
                className={s.evidenceRow}
                data-about-evidence-item
                data-about-reveal
                data-route-reveal-group="row"
                id="registrace-cnb"
              >
                <p className={s.evidenceCode} data-route-reveal-item="meta">ČNB</p>
                <div>
                  <h3 data-route-reveal-item="title">Registrace v evidenci České národní banky</h3>
                  <p data-route-reveal-item="body">Můj záznam v registru: David Pokorný, IČO 09016236.</p>
                </div>
                <a
                  data-cursor-no-magnetic
                  href={cnbRegistryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ověřit registraci v registru ČNB (otevře se v nové kartě)"
                >
                  <span data-route-reveal-item="control">Ověřit registraci</span>
                  <ArrowLinkIcon />
                </a>
              </article>

              <article
                className={s.evidenceRow}
                data-about-evidence-item
                data-about-reveal
                data-route-reveal-group="row"
              >
                <p className={s.evidenceCode} data-route-reveal-item="meta">SAB servis</p>
                <div>
                  <h3 data-route-reveal-item="title">Vázaný zástupce společnosti SAB servis s.r.o.</h3>
                  <p data-route-reveal-item="body">IČO 24704008</p>
                </div>
                <a
                  data-cursor-no-magnetic
                  href={sabDocumentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Otevřít dokumentaci SAB servis (otevře se v nové kartě)"
                >
                  <span data-route-reveal-item="control">Otevřít dokumentaci</span>
                  <ArrowLinkIcon />
                </a>
              </article>

              <article
                className={`${s.evidenceRow} ${s.certificatesRow}`}
                data-about-evidence-item
                data-about-reveal
                data-route-reveal-group="row"
                id="odborna-osvedceni"
              >
                <p className={s.evidenceCode} data-route-reveal-item="meta">Odborné zkoušky</p>
                <div>
                  <h3 data-route-reveal-item="title">Osvědčení o odborné způsobilosti</h3>
                  <p data-route-reveal-item="body">4 původní PDF dokumenty</p>
                </div>
                <ul aria-label="Osvědčení o odborné způsobilosti">
                  {certificates.map((certificate) => (
                    <li key={certificate.href} data-route-reveal-group="row">
                      <a
                        data-cursor-no-magnetic
                        href={certificate.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${certificate.label} — PDF dokument (otevře se v nové kartě)`}
                      >
                        <span data-route-reveal-item="control">{certificate.label}</span>
                        <ArrowLinkIcon />
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section
          className={`${s.chapter} ${s.proofChapter}`}
          data-about-chapter="dark"
          data-surface-tone="dark"
          data-about-proof
          aria-labelledby="proof-title"
          id="zkusenost-klienta"
        >
          <div
            className={`${s.inner} ${s.proofLayout}`}
            data-about-reveal
          >
            <div className={s.proofMeta} data-route-reveal-group>
              <p className={s.eyebrow} data-route-reveal-item="meta">Zkušenost klientky</p>
              <h2 id="proof-title" data-route-reveal-item="title">Důležitější než vlastní slib je zkušenost zvenku.</h2>
              <a
                data-cursor-no-magnetic
                href={featuredReview.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Otevřít Google recenzi od ${featuredReview.author} (otevře se v nové kartě)`}
              >
                <span data-route-reveal-item="control">Google recenze · {featuredReview.rating} z 5</span>
                <ArrowLinkIcon />
              </a>
            </div>
            <figure className={s.clientQuote} data-route-reveal-group="row">
              <blockquote data-route-reveal-item="detail">
                „{featuredReview.excerpt ?? featuredReview.fullText}“
              </blockquote>
              <figcaption data-route-reveal-item="meta">{featuredReview.author}</figcaption>
            </figure>
          </div>
        </section>

        <ActionBand
          actions={(
            <OverviewActionLink
              cursorLabel="PRVNÍ KROK • UDĚLAT SI JASNO •"
              data-about-action-part
              href="/ziskat-prehled/?source=about&cta=about-final"
              label="Zjistit, čím začít"
              placement="about-final"
              track={false}
            />
          )}
          data-about-chapter="action"
          data-about-action
          data-route-reveal-group
          data-nav-theme="light"
          eyebrow={(
            <span data-about-action-part data-route-reveal-item="meta">
              První krok
            </span>
          )}
          heading={(
            <>
              <span data-about-action-part data-route-reveal-item="title">
                Můj přístup už znáte.
              </span>{" "}
              <span data-about-action-part data-route-reveal-item="title">
                Teď pojďme zjistit, co dává smysl právě vám.
              </span>
            </>
          )}
          headingId="action-title"
          id="prvni-rozhovor"
          lead={(
            <span data-about-action-part data-route-reveal-item="body">
              Stačí stručně popsat, co právě řešíte. Bez dokumentů, smluv a
              citlivých finančních údajů.
            </span>
          )}
          surface="action"
        />
      </div>
    </MarketingPageShell>
  );
}
