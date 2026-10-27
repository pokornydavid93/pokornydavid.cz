import {
  asAssertionId,
  asCompositionId,
  asFixtureId,
} from "./helpers";
import type { CompositionFixtureProfile } from "./types";

type FixtureSeed = {
  id: string;
  compositionId: string;
  label: string;
  headline: string;
  lead: string;
  slots: CompositionFixtureProfile["slots"];
  stressors: string[];
  assertionIds: string[];
  minimalSlots: CompositionFixtureProfile["slots"];
  long: {
    headline?: string;
    lead: string;
    slots?: CompositionFixtureProfile["slots"];
    stressors?: string[];
  };
};

function makeFixture(
  seed: FixtureSeed,
  contentProfile: CompositionFixtureProfile["contentProfile"]
): CompositionFixtureProfile {
  const isLong = contentProfile === "long";
  const isMinimal = contentProfile === "minimal";
  const longId = `${seed.id}.long`;
  const minimalId = `${seed.id}.minimal`;

  return {
    id: asFixtureId(isLong ? longId : isMinimal ? minimalId : seed.id),
    compositionId: asCompositionId(seed.compositionId),
    contentProfile,
    label: isLong
      ? `${seed.label} / dlouhý obsah`
      : isMinimal
        ? `${seed.label} / bez optional slotů`
        : seed.label,
    headline: isLong ? seed.long.headline ?? seed.headline : seed.headline,
    lead: isLong ? seed.long.lead : seed.lead,
    slots: isLong
      ? { ...seed.slots, ...seed.long.slots }
      : isMinimal
        ? seed.minimalSlots
        : seed.slots,
    stressors: isLong
      ? [...seed.stressors, ...(seed.long.stressors ?? ["Dlouhá česká věta a víceslovné finanční pojmy musí zalomit bez překryvu."])]
      : isMinimal
        ? [
            ...seed.stressors,
            "Optional sloty jsou záměrně vynechané a nesmí vytvořit prázdné mezery.",
          ]
        : seed.stressors,
    assertionIds: seed.assertionIds.map(asAssertionId),
  };
}

const fixtureSeeds = [
  {
    id: "fixture.composition.siteHeader",
    compositionId: "composition.navigation.siteHeader",
    label: "Globální hlavička s hlavní akcí",
    headline: "PokornyDavid.cz",
    lead: "Navigace pro poradenský web s prioritní konzultací.",
    slots: {
      brand: "PD / PokornyDavid.cz",
      primaryNavigation: ["Služby", "Proces", "Reference", "Články", "Kontakt"],
      primaryAction: "Domluvit konzultaci",
      mobileTrigger: "Menu",
    },
    minimalSlots: {
      brand: "PD",
      primaryNavigation: ["Služby"],
      primaryAction: "Konzultace",
      mobileTrigger: "Menu",
    },
    stressors: ["Pět navigačních položek a dlouhý CTA label nesmí vytlačit brand."],
    assertionIds: [
      "assertion.navigation.brand-visible",
      "assertion.keyboard.focus-order",
      "assertion.compact.no-essential-loss",
    ],
    long: {
      lead: "Navigace obsahuje delší české popisky pro situace, kdy se v hlavičce objeví více poradenských oblastí, například hypotéky, investice, pojištění a plánování rezerv.",
      slots: {
        primaryNavigation: [
          "Finanční plán",
          "Hypotéky a bydlení",
          "Investice",
          "Životní pojištění",
          "Příběhy klientů",
          "Články a návody",
        ],
      },
      stressors: ["Dlouhé navigační labely musí přejít do kompaktního režimu."],
    },
  },
  {
    id: "fixture.composition.siteFooter",
    compositionId: "composition.navigation.siteFooter",
    label: "Patička s kontaktem a právním kontextem",
    headline: "PokornyDavid.cz",
    lead: "Sekundární navigace, kontakt a regulatorní informace.",
    slots: {
      brand: "PokornyDavid.cz",
      navigation: ["Služby", "O poradci", "Články", "Dokumenty", "Kontakt"],
      contact: "info@pokornydavid.cz / +420 777 000 000",
      legal: "Vázaný zástupce a právní informace pro návštěvníky webu.",
    },
    minimalSlots: {
      brand: "PokornyDavid.cz",
      navigation: ["Kontakt"],
      contact: "info@pokornydavid.cz",
      legal: "Právní informace.",
    },
    stressors: ["Kontakt, navigace a legal text musí zůstat čitelné ve více sloupcích."],
    assertionIds: [
      "assertion.footer.landmark",
      "assertion.source-order.stable",
      "assertion.surface.contrast",
    ],
    long: {
      lead: "Patička obsahuje delší souhrn služeb, několik kontaktních možností a právní upozornění, které se nesmí stát drobným nečitelným textem.",
      slots: {
        legal:
          "Informace na webu mají obecný charakter a nenahrazují individuální investiční, úvěrové ani pojistné doporučení po vyhodnocení konkrétní situace klienta.",
      },
    },
  },
  {
    id: "fixture.composition.pageHero",
    compositionId: "composition.entry.pageHero",
    label: "Homepage hero s poradenským příslibem",
    headline: "Finanční plán, který unese skutečný život",
    lead: "Pomohu vám rozhodovat o hypotékách, investicích a ochraně příjmů srozumitelně a bez tlaku.",
    slots: {
      eyebrow: "Osobní finanční poradenství",
      primaryAction: "Domluvit úvodní konzultaci",
      secondaryAction: "Prohlédnout proces",
      supportingProof: ["Certifikace", "Dlouhodobá péče", "Srozumitelný plán"],
      media: "Můj portrét v pracovním prostředí.",
    },
    minimalSlots: {
      primaryAction: "Domluvit konzultaci",
    },
    stressors: ["Hero musí udržet akci nad foldem i bez media slotu."],
    assertionIds: [
      "assertion.hero.first-viewport-focus",
      "assertion.action.primary-visible",
      "assertion.motion.reduced-static",
    ],
    long: {
      headline:
        "Finanční plán pro rodinu, podnikání a budoucnost, který dokáže vysvětlit i nepříjemné kompromisy",
      lead: "Používám konkrétní scénáře, čísla a lidský jazyk, aby návštěvník rozuměl tomu, co získá, co ještě nevíme a proč má smysl začít krátkým rozhovorem místo rychlého produktu.",
    },
  },
  {
    id: "fixture.composition.sectionIntroduction",
    compositionId: "composition.entry.sectionIntroduction",
    label: "Úvod sekce se sekundární akcí",
    headline: "Co spolu vyřešíme",
    lead: "Od prvního zorientování přes návrh řešení až po pravidelnou péči.",
    slots: {
      eyebrow: "Služby",
      action: "Zobrazit všechny služby",
    },
    minimalSlots: {
      heading: "Co spolu vyřešíme",
    },
    stressors: ["Sekční úvod nesmí převzít roli page hero."],
    assertionIds: [
      "assertion.heading.region-label",
      "assertion.rhythm.section-gap",
      "assertion.compact.no-essential-loss",
    ],
    long: {
      headline: "Co spolu vyřešíme, když nechcete dělat finanční rozhodnutí naslepo",
      lead: "Sekce musí zvládnout delší vysvětlující perex, který pojmenuje kontext, očekávání a další krok bez toho, aby se z něj stal samostatný hero blok.",
    },
  },
  {
    id: "fixture.composition.contentSplit",
    compositionId: "composition.narrative.contentSplit",
    label: "Narrative split s podpůrným důkazem",
    headline: "Nejdřív porozumět, potom vybírat produkt",
    lead: "Rozhodnutí stojí na rezervě, příjmech, závazcích a časovém horizontu.",
    slots: {
      copy: "Vysvětlení poradenského přístupu a návaznost na konkrétní finanční situaci.",
      supporting: ["Modelový výpočet rezervy", "Porovnání scénářů"],
      action: "Jak probíhá spolupráce",
    },
    minimalSlots: {
      copy: "Nejdřív společně pojmenujeme situaci a až potom vybíráme konkrétní řešení.",
    },
    stressors: ["Podpůrný rail nesmí předběhnout hlavní copy ve zdrojovém pořadí."],
    assertionIds: [
      "assertion.source-order.stable",
      "assertion.supporting-rail.secondary",
      "assertion.surface.contrast",
    ],
    long: {
      headline:
        "Nejdřív porozumět rodinnému rozpočtu, rezervě a rizikům, potom teprve vybírat konkrétní produkt",
      lead: "Delší text ověřuje, že copy slot zůstane čitelný i při vícevětém vysvětlení a že podpůrný proof region funguje jako pomocný kontext, ne jako druhý hlavní sloupec.",
    },
  },
  {
    id: "fixture.composition.cardCollection",
    compositionId: "composition.collection.cardCollection",
    label: "Kolekce služeb s porovnatelnými položkami",
    headline: "Vyberte oblast, kterou právě řešíte",
    lead: "Každá karta má stejnou informační váhu a vede na konkrétní další krok.",
    slots: {
      introduction: "Služby podle životní situace",
      items: ["Hypotéka", "Investice", "Pojištění příjmu", "Finanční plán"],
      action: "Najít vhodný začátek",
    },
    minimalSlots: {
      items: ["Hypotéka", "Investice"],
    },
    stressors: ["Čtyři a více položek musí držet stejný rytmus bez falešné hierarchie."],
    assertionIds: [
      "assertion.collection.equal-weight",
      "assertion.grid.responsive-wrap",
      "assertion.compact.no-essential-loss",
    ],
    long: {
      headline: "Vyberte oblast, kterou právě řešíte, i když se vaše situace nevejde do jedné jednoduché škatulky",
      lead: "Dlouhé názvy položek, metadata a krátké popisy musí zůstat srovnatelné, aby návštěvník nečetl layout jako náhodnou koláž různě důležitých karet.",
      slots: {
        items: [
          "První vlastní bydlení a rozhodnutí o hypotéce",
          "Ochrana příjmu při rodinných závazcích",
          "Dlouhodobé investování bez zbytečných produktů",
          "Kompletní revize finančního plánu",
        ],
      },
    },
  },
  {
    id: "fixture.composition.advisoryJourney",
    compositionId: "composition.process.advisoryJourney",
    label: "Poradenský proces v pěti krocích",
    headline: "Spolupráce má jasný rytmus",
    lead: "Od krátkého hovoru až po dlouhodobou péči víte, co se bude dít.",
    slots: {
      introduction: "Proces bez překvapení",
      steps: ["Úvodní orientace", "Analýza situace", "Návrh řešení", "Realizace", "Pravidelná péče"],
      outcome: "Výsledkem je plán, kterému rozumíte a ke kterému se dá vracet.",
      action: "Začít prvním hovorem",
    },
    minimalSlots: {
      introduction: "Proces spolupráce",
      steps: ["Úvodní orientace", "Návrh řešení", "Pravidelná péče"],
    },
    stressors: ["Narrative motion musí mít statický ordered-list fallback."],
    assertionIds: [
      "assertion.process.ordered",
      "assertion.motion.reduced-static",
      "assertion.scroll-progress.non-blocking",
    ],
    long: {
      headline: "Spolupráce má jasný rytmus od prvního rozhovoru až po pravidelnou kontrolu plánu",
      lead: "Každý krok může mít delší popis očekávání, výstupu a odpovědnosti, ale kompozice musí pořád působit jako proces, ne jako volná sada marketingových karet.",
    },
  },
  {
    id: "fixture.composition.trustEvidence",
    compositionId: "composition.proof.trustEvidence",
    label: "Důvěryhodnostní strip s claimem",
    headline: "Důkazy patří ke konkrétnímu tvrzení",
    lead: "Metriky, licence a zdroje vysvětlují, proč může návštěvník pokračovat.",
    slots: {
      claim: "Transparentní poradenský proces",
      evidence: ["Certifikace", "Regulatorní kontext", "Klientské reference"],
      source: "Ověřitelné údaje a dokumenty.",
    },
    minimalSlots: {
      evidence: ["Certifikace", "Regulatorní kontext"],
    },
    stressors: ["Proof položky nesmí být dekorativní badge bez vztahu ke claimu."],
    assertionIds: [
      "assertion.proof.claim-binding",
      "assertion.proof.source-visible",
      "assertion.surface.contrast",
    ],
    long: {
      headline: "Důkazy patří ke konkrétnímu tvrzení a musí zůstat čitelné i při delším vysvětlení",
      lead: "Pokud je claim delší, evidence cluster pořád musí návštěvníkovi pomoci rychle rozlišit certifikace, regulatorní informace a lidské reference.",
    },
  },
  {
    id: "fixture.composition.articleHeader",
    compositionId: "composition.editorial.articleHeader",
    label: "Hlavička článku s metadata a souhrnem",
    headline: "Jak poznat, že máte dostatečnou finanční rezervu",
    lead: "Rezerva není jedno univerzální číslo. Záleží na příjmech, závazcích a stabilitě domácnosti.",
    slots: {
      metadata: "Článek / 8 minut čtení / Aktualizováno",
      author: "David Pokorný",
      media: "Ilustrační fotografie pracovního stolu s plánem.",
      summary: ["Kdy rezerva nestačí", "Jak ji počítat", "Kdy ji nechat růst"],
    },
    minimalSlots: {
      metadata: "Článek / 5 minut čtení",
    },
    stressors: ["Article header nesmí používat pageIntroduction pro dlouhý článek."],
    assertionIds: [
      "assertion.article.metadata-before-heading",
      "assertion.heading.document",
      "assertion.media.optional",
    ],
    long: {
      headline:
        "Jak poznat, že máte dostatečnou finanční rezervu, když se vaše příjmy, závazky a rodinné plány často mění",
      lead: "Dlouhý perex ověřuje čitelnost článkového headeru, metadat, autora a rychlého souhrnu bez toho, aby se úvod článku vizuálně rozpadl nebo schoval hlavní titulek.",
    },
  },
  {
    id: "fixture.composition.decisionPrompt",
    compositionId: "composition.conversion.decisionPrompt",
    label: "Terminální CTA s podpůrným důkazem",
    headline: "Chcete zjistit, kde začít?",
    lead: "Krátký úvodní hovor stačí k pojmenování situace a vhodného dalšího kroku.",
    slots: {
      eyebrow: "Další krok",
      primaryAction: "Domluvit konzultaci",
      secondaryAction: "Nejdřív prohlédnout služby",
      supportingProof: "Bez závazku, s jasným shrnutím po hovoru.",
    },
    minimalSlots: {
      primaryAction: "Domluvit konzultaci",
    },
    stressors: ["Primární akce musí být viditelná, ale ne neonová."],
    assertionIds: [
      "assertion.action.primary-visible",
      "assertion.conversion.single-focus",
      "assertion.surface.action-contrast",
    ],
    long: {
      headline: "Chcete zjistit, kde začít, aniž byste hned vybírali konkrétní finanční produkt?",
      lead: "CTA musí zvládnout delší vysvětlení a podpůrný důkaz, ale pořád udržet jeden dominantní další krok a přehledné sekundární rozhodnutí.",
    },
  },
  {
    id: "fixture.composition.leadCapture",
    compositionId: "composition.conversion.leadCapture",
    label: "Kontaktní formulář s podporou a consentem",
    headline: "Napište, co právě řešíte",
    lead: "Stačí stručný kontext. Ozvu se s návrhem dalšího kroku.",
    slots: {
      introduction: "Kontaktní formulář",
      fieldGroups: ["Kontakt", "Téma", "Preferovaný čas"],
      submitAction: "Odeslat poptávku",
      consent: "Souhlasím se zpracováním údajů pro odpověď na poptávku.",
      support: "Odpověď obvykle do dvou pracovních dnů.",
      status: "Připraveno k odeslání.",
    },
    minimalSlots: {
      introduction: "Kontakt",
      fieldGroups: ["E-mail", "Téma"],
      submitAction: "Odeslat",
      consent: "Souhlasím se zpracováním údajů pro odpověď.",
    },
    stressors: ["Status musí být oznámen bez ztráty focus orderu."],
    assertionIds: [
      "assertion.form.labels-visible",
      "assertion.form.status-announcement",
      "assertion.keyboard.focus-order",
    ],
    long: {
      headline: "Napište, co právě řešíte, i pokud zatím nevíte, jestli jde o hypotéku, investice nebo celkový plán",
      lead: "Delší formulářový úvod a delší consent text nesmí rozbít rozdělení na kontext, pole, akci, právní souhlas a podpůrnou informaci.",
      slots: {
        consent:
          "Souhlasím se zpracováním osobních údajů za účelem odpovědi na poptávku a beru na vědomí, že odeslání formuláře neznamená uzavření smlouvy ani poskytnutí individuálního doporučení.",
      },
    },
  },
] as const satisfies readonly FixtureSeed[];

export const compositionFixtureCatalog = fixtureSeeds.flatMap((seed) => [
  makeFixture(seed, "canonical"),
  makeFixture(seed, "minimal"),
  makeFixture(seed, "long"),
]) as CompositionFixtureProfile[];

export const compositionFixtureById = new Map(
  compositionFixtureCatalog.map((fixture) => [fixture.id, fixture])
);
