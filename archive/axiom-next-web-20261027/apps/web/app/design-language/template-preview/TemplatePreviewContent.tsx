import { BadgeCheck, Building2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import ArticleCard from "../../ui/domain/ArticleCard";
import EnquiryForm from "../../ui/domain/EnquiryForm";
import Hero from "../../ui/domain/Hero";
import ProofItem from "../../ui/domain/ProofItem";
import ServiceCard from "../../ui/domain/ServiceCard";
import Stack from "../../ui/layout/Stack";
import ActionBand from "../../ui/patterns/ActionBand";
import CardCollection from "../../ui/patterns/CardCollection";
import EditorialFlow from "../../ui/patterns/EditorialFlow";
import FAQSection from "../../ui/patterns/FAQSection";
import FormContactSplit from "../../ui/patterns/FormContactSplit";
import ProcessAndFees from "../../ui/patterns/ProcessAndFees";
import SectionIntro from "../../ui/patterns/SectionIntro";
import SplitNarrative from "../../ui/patterns/SplitNarrative";
import TrustBlock from "../../ui/patterns/TrustBlock";
import Link from "../../ui/primitives/Link";
import Notice from "../../ui/primitives/Notice";
import SiteFooter from "../../ui/site/SiteFooter";
import SiteHeader from "../../ui/site/SiteHeader";
import ArticleDetailTemplate from "../../ui/templates/ArticleDetailTemplate";
import ContentDetailTemplate from "../../ui/templates/ContentDetailTemplate";
import ConversionTemplate from "../../ui/templates/ConversionTemplate";
import HomeTemplate from "../../ui/templates/HomeTemplate";
import IndexTemplate from "../../ui/templates/IndexTemplate";
import LegalTemplate from "../../ui/templates/LegalTemplate";
import SystemTemplate from "../../ui/templates/SystemTemplate";

export type TemplatePreviewId =
  | "home"
  | "index"
  | "content-detail"
  | "article-detail"
  | "conversion"
  | "legal"
  | "system";

const navigationItems = [
  { href: "/", label: "Přehled", exact: true },
  { href: "/sluzby", label: "Služby" },
  { href: "/jak-pracuji", label: "Jak pracuji" },
  { href: "/clanky", label: "Články" },
] as const;

const processSteps = [
  { id: "overview", title: "Přehled", description: "Srovnáme výchozí situaci a cíle.", result: "Společný obraz rozhodnutí." },
  { id: "priority", title: "Priority", description: "Určíme dopad a správné pořadí kroků.", result: "Jasné pořadí bez tlaku." },
  { id: "plan", title: "Plán", description: "Každý krok dostane důvod a termín kontroly.", result: "Rozhodnutí, kterému rozumíte." },
] as const;

const faqItems = [
  { id: "prepare", question: "Co si připravit?", answer: "Základní přehled příjmů, závazků, rezerv a smluv." },
  { id: "decision", question: "Musím se hned rozhodnout?", answer: "Ne. První hovor slouží k orientaci a pojmenování priorit." },
] as const;

function PreviewHeader({ currentPath, theme = "dark" }: { currentPath: string; theme?: "dark" | "light" }) {
  return (
    <SiteHeader
      action={<Link href="/ziskat-prehled" variant="primary-action">Zjistit, čím začít</Link>}
      brand={<><strong>PD</strong><span>PokornyDavid.cz</span></>}
      currentPath={currentPath}
      initialTheme={theme}
      items={navigationItems}
    />
  );
}

function PreviewFooter() {
  return (
    <SiteFooter
      brand="PokornyDavid.cz"
      contact={<Stack gap="s"><Link href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</Link><span>Olomouc a online</span></Stack>}
      groups={[
        { label: "Rozhodování", links: [{ href: "/sluzby", label: "Služby" }, { href: "/jak-pracuji", label: "Postup" }] },
        { label: "Důvěra", links: [{ href: "/kdo-jsem", label: "O mně" }, { href: "/reference", label: "Reference" }] },
      ]}
      legalLinks={[{ href: "/pravni-informace", label: "Právní informace" }, { href: "/cookies-a-mereni", label: "Cookies" }]}
      meta="Osobní finanční plánování"
    />
  );
}

function PrimaryAction({ children = "Zjistit, čím začít" }: { children?: ReactNode }) {
  return <Link href="/ziskat-prehled" variant="primary-action">{children}</Link>;
}

function PreviewActionBand({ heading }: { heading: ReactNode }) {
  return (
    <ActionBand
      actions={<><PrimaryAction /><Link href="/jak-pracuji" variant="secondary-action">Poznat postup</Link></>}
      eyebrow="Další krok"
      heading={heading}
      lead="Krátký úvodní hovor ukáže, která oblast má právě teď největší dopad."
      surface="action"
    />
  );
}

function ServiceCollection() {
  return (
    <CardCollection
      cardKind="service"
      intro={<SectionIntro eyebrow="Služby" heading="Rozhodnutí v souvislostech" lead="Každá oblast začíná problémem a končí konkrétním výsledkem." />}
    >
      <ServiceCard href="/sluzby" metadata={["Rezerva", "Priority"]} problem="Rozhodnutí vznikají odděleně." result="Jedna mapa kroků a kontrol." title="Finanční plán" />
      <ServiceCard href="/sluzby" metadata={["Rozpočet", "Fixace"]} problem="Splátka nemá dlouhodobý rámec." result="Udržitelné financování bydlení." title="Hypotéka" />
    </CardCollection>
  );
}

function ProofBlock() {
  return (
    <TrustBlock
      context={<SectionIntro eyebrow="Důvěra" heading="Ověřitelné body spolupráce" lead="Důkaz má vždy zdroj a praktický význam." />}
      density="compact"
    >
      <ProofItem description="Kontinuita zkušeností napříč klíčovými finančními rozhodnutími." icon={<BadgeCheck />} kind="credential" label="let praxe" source="Můj profil" sourceUrl="/kdo-jsem/" value="5+" verifiedAt="2026-07-13" />
      <ProofItem description="Veřejně dohledatelná oprávnění a publikované odborné dokumenty." icon={<ShieldCheck />} kind="regulatory" label="oprávnění a certifikace" source="Osvědčení a certifikace" sourceUrl="/osvedceni-a-certifikace/" value="Ověřeno" verifiedAt="2026-07-13" />
      <ProofItem description="Osobní schůzky v Olomouci doplňuje online spolupráce." icon={<Building2 />} kind="association" label="osobně i online" source="První krok" sourceUrl="/ziskat-prehled/" value="Olomouc" verifiedAt="2026-07-13" />
    </TrustBlock>
  );
}

function Narrative() {
  return (
    <SplitNarrative
      layout="sidebar"
      narrative={<SectionIntro eyebrow="Souvislosti" heading="Doporučení musí zůstat srozumitelné" lead="Každý krok dokumentuje důvod, prioritu a okamžik další kontroly." />}
      support={<Notice title="Jeden rozhodovací rámec" tone="info">Hypotéka, rezerva, investice a ochrana příjmu se neposuzují izolovaně.</Notice>}
    />
  );
}

function FAQPreview() {
  return <FAQSection intro={<SectionIntro eyebrow="Časté otázky" heading="Před prvním hovorem" />} items={faqItems} />;
}

function FormPreview() {
  return (
    <FormContactSplit
      form={<EnquiryForm preset="contact" />}
      support={(
        <Stack gap="m">
          <SectionIntro eyebrow="Přímý kontakt" heading="Co bude následovat" headingLevel="h3" />
          <Notice title="Odpověď do jednoho pracovního dne" tone="info">Nejdřív ověřím téma a domluvím s vámi vhodnou formu hovoru.</Notice>
          <Link href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</Link>
        </Stack>
      )}
      supportKind="contact"
    />
  );
}

function ArticleFlow() {
  return (
    <EditorialFlow
      header={<SectionIntro eyebrow="Praktický průvodce" heading="Jak oddělit rezervu od dlouhodobých investic" lead="Rozhoduje účel peněz a čas, kdy je budete potřebovat." />}
      related={(
        <ArticleCard
          category="Investice"
          excerpt="Tři otázky, které mají zaznít před výběrem konkrétního řešení."
          href="/clanky"
          published={{ dateTime: "2026-07-13", label: "13. července 2026" }}
          readingTime="6 min čtení"
          surface="card-light"
          title="Investiční plán bez produktového chaosu"
        />
      )}
    >
      <p>Rezerva chrání rozhodovací svobodu v krátkém horizontu. Investice naopak potřebují čas, disciplínu a přiměřené riziko.</p>
      <h2>Začněte účelem, ne produktem</h2>
      <p>Každá část peněz má jinou práci. Po jejím pojmenování lze rozumně porovnávat konkrétní nástroje.</p>
      <h2>Oddělte horizonty</h2>
      <p>Peníze pro neočekávané situace nesou jinou míru rizika než kapitál určený na dlouhodobé cíle.</p>
    </EditorialFlow>
  );
}

export default function TemplatePreviewContent({ template }: { template: TemplatePreviewId }) {
  const footer = <PreviewFooter />;

  if (template === "system") {
    return (
      <SystemTemplate
        actions={<Link href="/" variant="primary-action">Zpět na hlavní stránku</Link>}
        footer={footer}
        header={<PreviewHeader currentPath="/404/" theme="light" />}
        heading="Tahle stránka tu není."
        message="Odkaz může být neaktuální nebo je v adrese překlep. Pokračujte na hlavní stránku, kde najdete moje služby i možnosti spolupráce."
        status="Chyba 404"
      />
    );
  }

  if (template === "home") {
    return (
      <HomeTemplate
        finalAction={<PreviewActionBand heading="Začněte přehledem, ne produktem" />}
        footer={footer}
        header={<PreviewHeader currentPath="/" />}
        hero={<Hero actions={<PrimaryAction />} eyebrow="Finanční plánování" heading="Rozhodnutí začíná souvislostmi" lead="Nejdřív srovnáme cíle, rezervu a rizika. Teprve potom vybíráme konkrétní řešení." variant="home" />}
      >
        <ServiceCollection />
        <ProofBlock />
      </HomeTemplate>
    );
  }

  if (template === "index") {
    return (
      <IndexTemplate
        action={<PreviewActionBand heading="Nevíte, kterou oblast řešit první?" />}
        collection={<ServiceCollection />}
        entry={<Hero eyebrow="Služby" heading="Finanční témata s jasným dalším krokem" lead="Vyberte oblast, která má dnes největší dopad na váš rozpočet a cíle." variant="page" />}
        footer={footer}
        header={<PreviewHeader currentPath="/sluzby" />}
      />
    );
  }

  if (template === "content-detail") {
    return (
      <ContentDetailTemplate
        action={<PreviewActionBand heading="Chcete začít vlastním přehledem?" />}
        footer={footer}
        header={<PreviewHeader currentPath="/jak-pracuji" />}
        hero={<Hero actions={<PrimaryAction />} eyebrow="Jak spolupráce probíhá" heading="Nejdřív přehled. Potom rozhodnutí." lead="Souvislosti ukážou, co řešit teď, co může počkat a proč." variant="page" />}
      >
        <Narrative />
        <ProcessAndFees fees={<Notice title="Odměna bez překvapení" tone="info">Forma a výše odměny zazní před závaznou částí spolupráce.</Notice>} intro={<SectionIntro eyebrow="Postup" heading="Tři kroky od přehledu k plánu" />} steps={processSteps} />
        <FAQPreview />
      </ContentDetailTemplate>
    );
  }

  if (template === "article-detail") {
    return (
      <ArticleDetailTemplate
        action={<PreviewActionBand heading="Proberte vlastní situaci v souvislostech" />}
        article={<ArticleFlow />}
        footer={footer}
        header={<PreviewHeader currentPath="/clanky" />}
      />
    );
  }

  if (template === "conversion") {
    return (
      <ConversionTemplate
        entry={<Hero eyebrow="Kontakt" heading="Popište, co právě potřebujete vyřešit" lead="Krátká zpráva stačí. Navazující hovor společně zasadíme do správného kontextu." surface="paper" variant="conversion" />}
        faq={<FAQPreview />}
        footer={footer}
        form={<FormPreview />}
        header={<PreviewHeader currentPath="/ziskat-prehled" />}
        surface="paper"
        trust={<ProofBlock />}
      />
    );
  }

  return (
    <LegalTemplate footer={footer} header={<PreviewHeader currentPath="/pravni-informace" />}>
      <EditorialFlow header={<SectionIntro eyebrow="Právní informace" heading="Povaha informací na webu" lead="Základní identifikace, rozsah oprávnění a podmínky používání obsahu." />}>
        <h2>Obecný informační charakter</h2>
        <p>Informace na webu nepředstavují individuální finanční, investiční, úvěrové nebo pojistné doporučení.</p>
        <h2>Individuální posouzení</h2>
        <p>Konkrétní doporučení může vzniknout až po posouzení situace, cílů, znalostí a relevantních okolností klienta.</p>
        <h2>Ověření oprávnění</h2>
        <p>Aktuální oprávnění lze ověřit v registru České národní banky.</p>
      </EditorialFlow>
    </LegalTemplate>
  );
}
