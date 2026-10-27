"use client";

import { BadgeCheck, Building2, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import ArticleCard from "../../ui/domain/ArticleCard";
import EnquiryForm from "../../ui/domain/EnquiryForm";
import ProfileCard from "../../ui/domain/ProfileCard";
import ProofItem from "../../ui/domain/ProofItem";
import ServiceCard from "../../ui/domain/ServiceCard";
import ActionBand from "../../ui/patterns/ActionBand";
import CardCollection from "../../ui/patterns/CardCollection";
import EditorialFlow from "../../ui/patterns/EditorialFlow";
import FAQSection from "../../ui/patterns/FAQSection";
import FormContactSplit from "../../ui/patterns/FormContactSplit";
import ProcessAndFees from "../../ui/patterns/ProcessAndFees";
import SectionIntro from "../../ui/patterns/SectionIntro";
import SplitNarrative from "../../ui/patterns/SplitNarrative";
import TrustBlock from "../../ui/patterns/TrustBlock";
import SelectionChip from "../../ui/primitives/SelectionChip";
import Link from "../../ui/primitives/Link";
import Notice from "../../ui/primitives/Notice";
import Surface, { type SurfaceRole } from "../../ui/primitives/Surface";
import { templateRegistryEntries } from "./registry/templates";
import s from "./patternTemplateFoundationPreview.module.css";

type PreviewTone = "dark" | "light" | "action";

const previewTones = [
  { id: "dark", label: "Dark", surface: "page", domainSurface: "card-dark" },
  { id: "light", label: "Light", surface: "paper", domainSurface: "card-light" },
  { id: "action", label: "Action", surface: "action", domainSurface: "action-dark" },
] as const satisfies ReadonlyArray<{
  id: PreviewTone;
  label: string;
  surface: SurfaceRole;
  domainSurface: "card-dark" | "card-light" | "action-dark";
}>;

const processSteps = [
  { id: "context", title: "Souvislosti", description: "Srovnáme příjmy, závazky, rezervy a cíle.", result: "Společný výchozí obraz." },
  { id: "priority", title: "Priority", description: "Oddělíme akutní rozhodnutí od kroků, které mohou počkat.", result: "Jasné pořadí bez tlaku." },
  { id: "plan", title: "Plán", description: "Konkrétní řešení dostane důvod, termín a způsob kontroly.", result: "Další krok, kterému rozumíte." },
] as const;

const faqItems = [
  { id: "first", question: "Co si mám připravit?", answer: "Stačí základní přehled příjmů, závazků, smluv a toho, co chcete změnit." },
  { id: "pressure", question: "Musím se hned rozhodnout?", answer: "Ne. První krok slouží k orientaci a pojmenování priorit." },
  { id: "online", question: "Lze vše řešit online?", answer: "Ano. Osobní schůzka v Olomouci je volitelná." },
] as const;

type SpecimenRowProps = {
  id: string;
  name: string;
  purpose: string;
  children: ReactNode;
};

function SpecimenRow({ children, id, name, purpose }: SpecimenRowProps) {
  return (
    <section className={s.specimenRow} data-pattern-specimen={id}>
      <header className={s.specimenIntro}>
        <code translate="no">pattern.{id}</code>
        <div>
          <h3>{name}</h3>
          <p>{purpose}</p>
        </div>
      </header>
      <div className={s.liveSpecimen}>{children}</div>
    </section>
  );
}

export default function PatternTemplateFoundationPreview() {
  const [tone, setTone] = useState<PreviewTone>("dark");
  const activeTone = previewTones.find((item) => item.id === tone) ?? previewTones[0];
  const actionSurface = tone === "action" ? "action" : "action-dark";

  return (
    <div className={s.workbench} data-pattern-template-foundation>
      <div className={s.toolbar}>
        <div aria-label="Pattern surface tone" className={s.toneControl} role="group">
          {previewTones.map((item) => (
            <SelectionChip
              key={item.id}
              onSelectedChange={() => setTone(item.id)}
              selected={tone === item.id}
            >
              {item.label}
            </SelectionChip>
          ))}
        </div>
        <output aria-live="polite">{activeTone.label} · {activeTone.surface}</output>
      </div>

      <Surface
        as="div"
        className={s.stage}
        data-pattern-tone={tone}
        id="phase5-pattern-stage"
        surface={activeTone.surface}
        tone={tone}
      >
        <SpecimenRow
          id="section-intro"
          name="SectionIntro"
          purpose="Řízený vstup do sekce bez vlastního surface nebo kolekce."
        >
          <SectionIntro
            action={<Link href="/jak-pracuji">Poznat postup</Link>}
            eyebrow="Finanční přehled"
            heading="Rozhodnutí začíná souvislostmi"
            headingLevel="h4"
            lead="Nejdřív pojmenujeme situaci a priority. Teprve potom vybíráme konkrétní řešení."
          />
        </SpecimenRow>

        <SpecimenRow
          id="card-collection"
          name="CardCollection"
          purpose="Jedna doménová card family v intrinsic responzivní kolekci."
        >
          <CardCollection
            cardKind="service"
            intro={(
              <SectionIntro
                eyebrow="Služby"
                heading="Dvě rozhodovací oblasti"
                headingLevel="h4"
                lead="Každá karta vysvětluje výchozí situaci a očekávaný výsledek."
              />
            )}
          >
            <ServiceCard
              href="/sluzby"
              metadata={["Rezerva", "Rizika", "Priority"]}
              problem="Rozhodnutí vznikají odděleně a bez společného pořadí."
              result="Jedna mapa kroků a termínů kontroly."
              surface={activeTone.domainSurface}
              title="Finanční plán"
            />
            <ServiceCard
              href="/sluzby"
              metadata={["Rozpočet", "Fixace", "Bezpečí"]}
              problem="Výše splátky není zasazená do dlouhodobého rozpočtu."
              result="Udržitelný rámec financování bydlení."
              surface={activeTone.domainSurface}
              title="Hypotéka v souvislostech"
            />
          </CardCollection>
        </SpecimenRow>

        <SpecimenRow
          id="split-narrative"
          name="SplitNarrative"
          purpose="Asymetrický vztah hlavního vysvětlení a podpůrného obsahu."
        >
          <SplitNarrative
            layout="sidebar"
            narrative={(
              <SectionIntro
                eyebrow="Osobní přístup"
                heading="Plán musí být srozumitelný i za rok"
                headingLevel="h4"
                lead="Doporučení dokumentuje důvod, prioritu a okamžik, kdy má smysl se k němu vrátit."
              />
            )}
            support={(
              <ProfileCard
                bio="Spojuji hypotéku, rezervy, investice a ochranu příjmu do jednoho rozhodovacího rámce."
                href="/kdo-jsem"
                name="David Pokorný"
                portrait={{ alt: "Můj portrét", height: 1600, kind: "image", ratio: "portrait", sizes: "(max-width: 720px) 100vw, 28rem", src: "/about.avif", width: 1264 }}
                role="Finanční poradce"
                surface={activeTone.domainSurface}
              />
            )}
          />
        </SpecimenRow>

        <SpecimenRow
          id="trust-block"
          name="TrustBlock"
          purpose="Důkazy dostávají kontext a nevznikají jako dekorativní metriky."
        >
          <TrustBlock
            context={(
              <SectionIntro
                eyebrow="Důvěra"
                heading="Ověřitelné body spolupráce"
                headingLevel="h4"
                lead="Každý údaj vysvětluje, co pro klienta prakticky znamená."
              />
            )}
            density="compact"
          >
            <ProofItem description="Kontinuita zkušeností napříč plánováním, hypotékami a investicemi." icon={<BadgeCheck />} kind="credential" label="let praxe ve finančním plánování" source="Můj profil" sourceUrl="/kdo-jsem/" value="5+" verifiedAt="2026-07-13" />
            <ProofItem description="Veřejně dohledatelná oprávnění a publikované odborné dokumenty." icon={<ShieldCheck />} kind="regulatory" label="oprávnění a profesní kontext" source="Osvědčení a certifikace" sourceUrl="/osvedceni-a-certifikace/" value="Ověřeno" verifiedAt="2026-07-13" />
            <ProofItem description="Osobní schůzky v Olomouci doplňuje plnohodnotná online spolupráce." icon={<Building2 />} kind="association" label="osobně i online" source="První krok" sourceUrl="/ziskat-prehled/" value="Olomouc" verifiedAt="2026-07-13" />
          </TrustBlock>
        </SpecimenRow>

        <SpecimenRow
          id="process-and-fees"
          name="ProcessAndFees"
          purpose="Seřazený postup a transparentní vysvětlení odměny v jednom toku."
        >
          <ProcessAndFees
            fees={<><strong>Odměna bez překvapení</strong><p>Její forma a výše zazní dřív, než začne závazná část spolupráce.</p></>}
            intro={<SectionIntro eyebrow="Postup" heading="Tři kroky od přehledu k plánu" headingLevel="h4" />}
            steps={processSteps}
          />
        </SpecimenRow>

        <SpecimenRow
          id="faq-section"
          name="FAQSection"
          purpose="Otázky používají jednu disclosure sémantiku a fungují bez hoveru."
        >
          <FAQSection
            defaultExpandedIndex={0}
            intro={<SectionIntro eyebrow="Časté otázky" heading="Co potřebujete vědět před prvním hovorem" headingLevel="h4" />}
            items={faqItems}
          />
        </SpecimenRow>

        <SpecimenRow
          id="action-band"
          name="ActionBand"
          purpose="Jedna rozhodovací výzva na schválené action surface."
        >
          <ActionBand
            actions={<><Link href="/ziskat-prehled" variant="primary-action">Zjistit, čím začít</Link><Link href="/jak-pracuji" variant="secondary-action">Poznat postup</Link></>}
            eyebrow="Další krok"
            heading="Začněte přehledem, ne produktem"
            headingLevel="h3"
            lead="Krátký úvodní hovor ukáže, která oblast má právě teď největší dopad."
            surface={actionSurface}
          />
        </SpecimenRow>

        <SpecimenRow
          id="form-contact-split"
          name="FormContactSplit"
          purpose="Formulář a podpůrný kontakt zůstávají oddělené integrační regiony."
        >
          <FormContactSplit
            form={<EnquiryForm preset="contact" />}
            support={(
              <>
                <SectionIntro eyebrow="Přímý kontakt" heading="Co bude následovat" headingLevel="h4" />
                <Notice title="Odpověď do jednoho pracovního dne" tone="info">
            Nejdřív si ověřím téma a domluvím s vámi vhodnou formu prvního hovoru.
                </Notice>
                <Link href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</Link>
              </>
            )}
            supportKind="contact"
          />
        </SpecimenRow>

        <SpecimenRow
          id="editorial-flow"
          name="EditorialFlow"
          purpose="Article header, čtecí measure, related obsah a finální akce mají vlastní regiony."
        >
          <EditorialFlow
            action={(
              <ActionBand
                actions={<Link href="/ziskat-prehled" variant="primary-action">Probrat vlastní situaci</Link>}
                heading="Článek je začátek, ne individuální doporučení"
                headingLevel="h3"
                surface={actionSurface}
              />
            )}
            header={<SectionIntro eyebrow="Praktický průvodce" heading="Jak oddělit rezervu od dlouhodobých investic" headingLevel="h4" lead="Rozhoduje účel peněz a čas, kdy je budete potřebovat." />}
            related={(
              <ArticleCard
                category="Investice"
                excerpt="Tři otázky, které mají zaznít před výběrem konkrétního řešení."
                href="/clanky"
                published={{ dateTime: "2026-07-13", label: "13. července 2026" }}
                readingTime="6 min čtení"
                surface={activeTone.domainSurface}
                title="Investiční plán bez produktového chaosu"
              />
            )}
          >
            <p>Rezerva chrání rozhodovací svobodu v krátkém horizontu. Investice naopak potřebují čas, disciplínu a přiměřené riziko.</p>
            <h5>Začněte účelem, ne produktem</h5>
            <p>Každá část peněz má jinou práci. Teprve po jejím pojmenování lze rozumně porovnávat konkrétní nástroje.</p>
          </EditorialFlow>
        </SpecimenRow>
      </Surface>

      <section className={s.templateIndex} aria-labelledby="phase5-template-index-title">
        <header>
          <span>Page templates</span>
          <h3 id="phase5-template-index-title">Sedm skutečných route shells</h3>
          <p>Každý odkaz otevírá samostatnou SSR ukázku skutečné template komponenty.</p>
        </header>
        <div className={s.templateList}>
          {templateRegistryEntries.map((template) => (
            <article data-template-contract={template.id} key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <code translate="no">{template.id}</code>
              </div>
              <span>{template.slots.join(" → ")}</span>
              <Link href={`/design-language/template-preview/?template=${template.id.replace("template.", "")}`}>
                Otevřít preview
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
