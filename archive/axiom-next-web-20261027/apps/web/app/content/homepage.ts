import { internalRoute } from "../../lib/homepage/routing";
import { createLeadHref } from "../../lib/leads/lead-contract";
import { FEATURED_TESTIMONIAL_IDS } from "./testimonials";
import type {
  AssetRef,
  HomePageContent,
  OverviewOfferContract,
} from "../../lib/homepage/types";

const asset = (path: string) => path as AssetRef;

export const overviewIndexable = false;

export const overviewOffer: OverviewOfferContract = {
  id: "overview-offer-v1",
  ctaLabel: "Získat přehled",
  immediateOutcome:
    "Po odeslání vám potvrdím přijetí žádosti o úvodní hovor.",
  firstHumanStep:
    "Zavolám vám na uvedené číslo; při úvodním hovoru si společně ujasníme, co řešit jako první.",
  actualDeliverable:
    "Úvodní hovor o vaší situaci a prioritách. Podoba navazujícího finančního výstupu zatím není schválená pro veřejný slib.",
  deliveryMoment: "Po domluvě termínu.",
  deliveryFormat: "Telefonicky.",
  priceDisclosure:
    "Znění odměňování pro veřejné použití zatím není schválené.",
  owner: "Business a compliance owner musí být určen",
  status: "blocked",
  reviewAt: "2026-08-14",
};

export const homepageContent: HomePageContent = {
  overviewOfferId: overviewOffer.id,
  shell: {
    navigation: [
      { id: "services", label: "Služby", href: internalRoute("/sluzby/") },
      { id: "process", label: "Jak pracuji", href: internalRoute("/jak-pracuji/") },
      { id: "references", label: "Reference", href: internalRoute("/reference/") },
      { id: "profile", label: "Kdo jsem", href: internalRoute("/kdo-jsem/") },
      { id: "articles", label: "Články", href: internalRoute("/clanky/") },
    ],
    headerCta: {
      label: "Získat přehled",
      href: internalRoute(createLeadHref({
        cta: "header-primary",
        source: "header",
      })),
      source: "home-header",
    },
    footerContentId: "public-footer-v1",
  },
  hero: {
    title: "Nejhorší finanční rozhodnutí je to, kterému nerozumíte.",
    titleLines: [
      "Nejhorší finanční rozhodnutí",
      "je to, kterému nerozumíte.",
    ],
    titleEmphasis: "finanční rozhodnutí",
    lead:
      "Pomůžu vám udělat si jasno dřív, než uděláte důležité rozhodnutí.",
    primaryCta: {
      label: "Získat přehled",
      href: internalRoute(createLeadHref({
        cta: "home-hero",
        source: "homepage",
      })),
      source: "home-hero",
    },
    secondaryCta: {
      label: "Kdo jsem",
      href: internalRoute("/kdo-jsem/"),
    },
    media: {
      asset: asset("/who-home.avif"),
      kind: "image",
      alt: "David Pokorný při poradenském rozhovoru",
    },
  },
  situations: {
    intro: {
      eyebrow: "VÁŠ VÝCHOZÍ BOD",
      title: "Co právě potřebujete vyřešit?",
      lead:
        "Nemusíte znát název produktu ani mít připravené řešení. Vyberte situaci, která se nejvíc podobá té vaší. Společně pak určíme, co má smysl řešit jako první.",
    },
    items: [
      {
        id: "mortgage-refixation",
        selectorLabel: "Končí mi fixace",
        eyebrow: "HYPOTÉKA · KONEC FIXACE",
        title: "Spočítáme, co nová sazba udělá s vaší splátkou.",
        titleLines: [
          "Spočítáme, co nová sazba",
          "udělá s vaší splátkou.",
        ],
        description:
          "Spočítáme, co nová sazba udělá s vaší splátkou.",
        metadata: [
          "Datum konce fixace",
          "Nabídka nové sazby",
          "Dopad na měsíční splátku",
        ],
        ctaLabel: "Zjistit dopad nové sazby",
        href: internalRoute(createLeadHref({
          cta: "situation-mortgage-refixation",
          intent: "housing",
          source: "homepage",
          topic: "mortgage-refixation",
        })),
        routeExplanation:
          "Nejdřív spolu srovnáme termín fixace, nabídku banky a možnosti dalšího postupu.",
        variant: "default",
      },
      {
        id: "new-housing",
        selectorLabel: "Řeším nové bydlení",
        eyebrow: "BYDLENÍ · NOVÁ HYPOTÉKA",
        title: "Najdeme bezpečný rámec pro vaše nové bydlení.",
        titleLines: [
          "Najdeme bezpečný rámec",
          "pro vaše nové bydlení.",
        ],
        description:
          "Najdeme bezpečný rámec pro vaše nové bydlení.",
        metadata: [
          "Cena nového bydlení",
          "Vlastní zdroje",
          "Bezpečná výše splátky",
        ],
        ctaLabel: "Zjistit bezpečnou splátku",
        href: internalRoute(createLeadHref({
          cta: "situation-new-housing",
          intent: "housing",
          source: "homepage",
          topic: "mortgage",
        })),
        routeExplanation:
          "Nejdřív spolu srovnáme cenu bydlení, vlastní zdroje, bezpečnou splátku a časový rámec.",
        variant: "default",
      },
      {
        id: "insurance-review",
        selectorLabel: "Chci prověřit pojištění",
        eyebrow: "POJIŠTĚNÍ · PROVĚŘENÍ KRYTÍ",
        title: "Prověříme, jestli vaše pojištění chrání to podstatné.",
        titleLines: [
          "Prověříme, jestli vaše pojištění",
          "chrání to podstatné.",
        ],
        description:
          "Prověříme, jestli vaše pojištění chrání to podstatné.",
        metadata: [
          "Co je skutečně kryté",
          "Limity a výluky",
          "Cena vzhledem k ochraně",
        ],
        ctaLabel: "Prověřit pojistné krytí",
        href: internalRoute(createLeadHref({
          cta: "situation-insurance-review",
          intent: "protection",
          source: "homepage",
          topic: "property-insurance",
        })),
        routeExplanation:
          "Nejdřív spolu ujasníme, co má pojištění chránit, a prověříme, zda tomu odpovídá současné krytí.",
        variant: "default",
      },
      {
        id: "income-protection",
        selectorLabel: "Potřebuji ochránit příjem",
        eyebrow: "PŘÍJEM · OCHRANA RODINY",
        title: "Zjistíme, jak chránit příjem vaší domácnosti.",
        titleLines: [
          "Zjistíme, jak chránit příjem",
          "vaší domácnosti.",
        ],
        description:
          "Zjistíme, jak chránit příjem vaší domácnosti.",
        metadata: [
          "Dopad výpadku příjmu",
          "Rezerva domácnosti",
          "Současná úroveň ochrany",
        ],
        ctaLabel: "Prověřit ochranu příjmu",
        href: internalRoute(createLeadHref({
          cta: "situation-income-protection",
          intent: "protection",
          source: "homepage",
          topic: "income-protection",
        })),
        routeExplanation:
          "Nejdřív společně spočítáme, jak by výpadek příjmu ovlivnil domácnost a co už dnes máte pokryté.",
        variant: "default",
      },
      {
        id: "investing",
        selectorLabel: "Chci začít investovat",
        eyebrow: "REZERVA · INVESTICE",
        title: "Nastavíme investice podle vašich cílů, rezervy a času.",
        titleLines: [
          "Nastavíme investice podle vašich cílů,",
          "rezervy a času.",
        ],
        description:
          "Nastavíme investice podle vašich cílů, rezervy a času.",
        metadata: ["Dostupná rezerva", "Investiční horizont", "Dlouhodobé cíle"],
        ctaLabel: "Srovnat rezervu a investice",
        href: internalRoute(createLeadHref({
          cta: "situation-investing",
          intent: "future",
          source: "homepage",
          topic: "investments",
        })),
        routeExplanation:
          "Nejdřív oddělíme dostupnou rezervu od peněz určených na dlouhodobé cíle a ujasníme si časový horizont.",
        variant: "default",
      },
    ],
    orientation: {
      id: "orientace",
      title: "Když nevíte, kde začít, začneme přehledem.",
      description:
        "Společně srovnáme, co je potřeba řešit teď, co může bez obav počkat a jak jednotlivá rozhodnutí zapadají do vaší situace.",
      metadata: ["Orientace", "Priority", "Souvislosti"],
      ctaLabel: "Získat přehled",
      href: internalRoute(createLeadHref({
        cta: "unsure-priorities",
        intent: "unsure",
        source: "homepage",
      })),
      routeExplanation:
        "První kontakt slouží k orientaci v tématech a jejich pořadí. Stačí zvolit způsob spojení; detailní finanční údaje teď nejsou potřeba.",
      variant: "fallback",
    },
    customSituationLink: {
      context: "Vaše situace sem přesně nezapadá?",
      label: "Prohlédnout všechny služby",
      href: internalRoute("/sluzby/"),
    },
  },
  references: {
    intro: {
      eyebrow: "ZKUŠENOSTI KLIENTŮ",
      title: "Teď slovo těm,\nkteří to zažili.",
      description:
        "Tři zkušenosti mých klientů ukazují, jak spolupráce vypadá v praxi — od srozumitelného vysvětlení přes hledání souvislostí až po dlouhodobou pomoc.",
    },
    reviewIds: FEATURED_TESTIMONIAL_IDS,
    outro: {
      title: "Vaše zkušenost může začít stejně.",
      description:
        "Bez závazku, připravených smluv a složitých formulářů. Stačí vybrat oblast a zanechat mi kontakt.",
      cta: {
        label: "Získat přehled",
        href: internalRoute(createLeadHref({
          cta: "home-references",
          source: "homepage",
        })),
        source: "home-references",
      },
    },
  },
  processAndFees: {
    intro: {
      eyebrow: "JAK SPOLUPRÁCE PROBÍHÁ",
    },
    steps: [
      {
        id: "clarify",
        role: "VY",
        title: "Řeknete mi, co právě řešíte.",
        support:
          "Stačí vlastními slovy. Bez smluv, výpisů a složité přípravy.",
      },
      {
        id: "connect",
        role: "JÁ",
        title: "Dám vše do souvislostí a ukážu vám možnosti.",
        support:
          "Seřadím priority, porovnám varianty a ukážu jejich dopad na celý plán.",
      },
      {
        id: "prioritize",
        role: "VY",
        title: "Rozhodnete, jak chcete pokračovat.",
        support: "Bez tlaku. Konečné rozhodnutí zůstává vždy na vás.",
      },
    ],
    detail:
      "Nejdřív si uděláme jasno v celé situaci. Teprve potom má smysl seřadit priority, porovnat možnosti a rozhodnout o dalším kroku.",
    result: {
      eyebrow: "CO SI ODNESETE",
      title: "Přehled, díky kterému víte, co dál.",
      description:
        "Budete rozumět své situaci, prioritám i možnostem — a vědět, který další krok dává smysl právě vám.",
    },
    cta: {
      label: "Získat přehled",
      href: internalRoute(createLeadHref({
        cta: "home-process",
        source: "homepage",
      })),
      source: "home-process",
    },
    microcopy: "Bez závazku. Pro začátek stačí vybrat oblast a zanechat mi kontakt.",
  },
  outcome: {
    intro: {
      title: "Po prvním hovoru víte, čím začít.",
      titleLines: ["Po prvním hovoru víte,", "čím začít."],
      description:
        "Bez rozhodování na místě. Společně si ujasníme, co řešit jako první a zda má smysl pokračovat.",
    },
    items: [
      {
        id: "outcome-priority",
        index: "01",
        title: "Co má prioritu",
        description: "Pojmenujeme, co má na vaši situaci největší vliv.",
      },
      {
        id: "outcome-variants",
        index: "02",
        title: "Jaké máte možnosti",
        description:
          "Oddělíme relevantní varianty od těch, které pro vás nedávají smysl.",
      },
      {
        id: "outcome-impact",
        index: "03",
        title: "Co dává smysl dál",
        description:
          "Budete vědět, co řešit teď a co může bez obav počkat.",
      },
    ],
  },
  evidence: {
    intro: {
      eyebrow: "Ověřitelné informace",
      title: "Důvěru stavím na tom, co si můžete sami ověřit.",
      lead:
        "Registrace, vazba na společnost i odborná způsobilost jsou doložené přímo původními zdroji.",
    },
    items: [
      {
        id: "professional-role",
        kind: "fact",
        factId: "role-sab-bound-representative",
      },
    ],
  },
  profile: {
    intro: {
      title: "Nejdřív vy. Potom čísla. Teprve potom plán.",
      titleLines: [
        "Nejdřív vy.",
        "Potom čísla.",
        "Teprve potom plán.",
      ],
      introduction:
        "Jsem David Pokorný. Nejdřív chci pochopit, co je pro vás důležité. Pak vám ukážu souvislosti a možnosti, abyste se mohli rozhodnout sami.",
      statement: [
        "Co funguje, nechávám být.",
      ],
    },
    roleFactId: "role-sab-bound-representative",
    aboutLink: {
      label: "Jak stavím finanční plán",
      href: internalRoute("/kdo-jsem/"),
    },
    portrait: asset("/david-profile-cutout.webp"),
    portraitAlt: "David Pokorný, finanční poradce",
  },
  insights: {
    intro: {
      eyebrow: "Z PRAXE, NE Z UČEBNICE",
      title: "Situace, které stojí\nza bližší pohled.",
      lead:
        "Konkrétní čísla, souvislosti a rozhodnutí, na kterých ukazuji, proč stejné řešení nemůže fungovat každému.",
    },
    allArticlesLabel: "Procházet všechny články",
    articleIds: [
      "konec-fixace-hypoteky",
      "chcete-investovat-zacnete-planem",
      "mate-pojisteni-prijmu-nebo-jen-pocit",
    ],
    articleCopy: {
      "konec-fixace-hypoteky": {
        title: "Končí vám fixace?\nPrvní nabídka banky není verdikt.",
        excerpt: "Co porovnat dřív, než podepíšete další fixaci.",
        categoryLabel: "HYPOTÉKY",
        readingTime: "10 MIN",
      },
      "chcete-investovat-zacnete-planem": {
        title: "Chcete investovat?\nZačněte plánem, ne produktem.",
        excerpt: "Cíl, horizont a riziko dřív než výběr fondu.",
        categoryLabel: "INVESTICE",
        readingTime: "9 MIN",
      },
      "mate-pojisteni-prijmu-nebo-jen-pocit": {
        title: "Chrání vaše pojištění příjem,\nnebo jen pocit jistoty?",
        excerpt:
          "Kolik skutečně dostanete při dlouhodobém výpadku příjmu?",
        categoryLabel: "POJIŠTĚNÍ",
        readingTime: "9 MIN",
      },
    },
  },
  faq: {
    intro: {
      eyebrow: "PRAKTICKÉ OTÁZKY",
      title: "Jak spolupráce funguje v praxi.",
      lead:
        "Co se stane po odeslání, co si připravit, jak může první kontakt proběhnout a zda vás k něčemu zavazuje.",
    },
    items: [
      {
        id: "after-contact",
        question: "Co se stane po odeslání?",
        answer:
          "Po úspěšném odeslání se vám zobrazí potvrzení. Potom se vám ozvu, krátce projdeme vaši situaci a domluvíme se, zda a jak pokračovat.",
      },
      {
        id: "commitment",
        question: "Je první kontakt nezávazný?",
        answer:
          "Ano. Odesláním formuláře ani úvodním hovorem nesouhlasíte s žádným produktem nebo finančním rozhodnutím. Nejprve společně projdeme situaci a teprve potom se rozhodnete, zda chcete pokračovat.",
      },
      {
        id: "preparation",
        question: "Co si mám připravit?",
        answer:
          "Na první kontakt nepotřebujete smlouvy ani podrobné finanční údaje. Stačí vybrat oblast, zanechat telefon a e-mail pro shrnutí. Citlivé údaje ani dokumenty přes formulář neposílejte.",
      },
      // TODO(business/compliance): Add "Jak je spolupráce placená?" only after
      // David-specific remuneration copy has an approved canonical record.
      {
        id: "online",
        question: "Může první kontakt proběhnout online nebo osobně?",
        answer:
          "Ano. Můžeme si zavolat, spojit se online nebo se sejít osobně v Olomouci. Formu si vyberete při domluvě.",
      },
    ],
    privacyNote: {
      text:
        "Formulář slouží pouze k domluvě prvního kontaktu. Citlivé údaje ani dokumenty přes něj neposílejte.",
      linkLabel: "Zásady zpracování osobních údajů",
      href: internalRoute("/zasady-zpracovani-osobnich-udaju/"),
    },
  },
  finalCta: {
    eyebrow: "PRVNÍ KONTAKT",
    title: "Stačí mi říct, co právě řešíte.",
    description:
      "Vyberte oblast nebo doplňte pár vět. Nechte mi číslo; zavolám vám a společně ujasníme první krok.",
    microcopy: "BEZ DOKUMENTŮ · BEZ ZÁVAZKU · OSOBNĚ SE VÁM OZVU",
    primaryCta: {
      label: "Získat přehled",
      href: internalRoute(createLeadHref({
        cta: "home-final",
        source: "homepage",
      })),
      source: "home-final",
    },
  },
};
