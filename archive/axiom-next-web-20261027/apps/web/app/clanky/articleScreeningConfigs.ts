export type ArticleScreeningQuestion = {
  id: string;
  title: string;
  options: string[];
  hint?: string;
  multiple?: boolean;
  /** Selecting one of these answers clears other selections in the question. */
  exclusiveOptions?: string[];
};

export type ArticleScreeningStep = {
  id: string;
  title: string;
  questions: ArticleScreeningQuestion[];
};

export type ArticleScreeningAnswerCondition = {
  questionId: string;
  options: string[];
};

export type ArticleScreeningReviewItem = {
  id: string;
  title: string;
  summary: string;
  text: string;
  /** Any listed answer makes this additional review topic relevant. */
  when?: ArticleScreeningAnswerCondition[];
  /** Explicit visitor goals take priority over other relevant topics. */
  prioritizeWhen?: ArticleScreeningAnswerCondition[];
  /** The first matching variant adapts the copy without changing the topic or its order. */
  variants?: {
    when: ArticleScreeningAnswerCondition[];
    title?: string;
    summary?: string;
    text?: string;
  }[];
};

export type ArticleScreeningReview = {
  title: string;
  text: string;
  note: string;
  contactCtaLabel: string;
  items: ArticleScreeningReviewItem[];
};

export type ArticleScreeningConfig = {
  type: string;
  eyebrow: string;
  title: string;
  text: string;
  startCtaLabel: string;
  microcopy: string;
  steps: ArticleScreeningStep[];
  review: ArticleScreeningReview;
  contactTitle: string;
  contactText: string;
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  tags?: string[];
};

export const articleScreeningConfigs: Record<string, ArticleScreeningConfig> = {
  "mortgage-fixation": {
    type: "mortgage-fixation",
    eyebrow: "RYCHLÁ KONTROLA FIXACE",
    title: "Ujasněte si, co před koncem fixace prověřit",
    text:
      "Vyberte, co chcete před koncem fixace ujasnit. Přehled dalších kroků získáte bez zadání kontaktu.",
    startCtaLabel: "Začít kontrolu",
    microcopy: "5 otázek · asi 1 minuta",
    steps: [
      {
        id: "situation",
        title: "Kdy vám končí fixace hypotéky?",
        questions: [
          {
            id: "fixationEnds",
            title: "Kdy vám končí fixace hypotéky?",
            options: [
              "Do 3 měsíců",
              "Za 3–6 měsíců",
              "Za 6–12 měsíců",
              "Nejsem si jistý/jistá",
            ],
          },
          {
            id: "bankOffer",
            title: "Už vám banka poslala novou nabídku?",
            options: ["Ano", "Ne", "Čekám na ni", "Nevím"],
          },
        ],
      },
      {
        id: "payment",
        title: "Víte, jak se může změnit měsíční splátka?",
        questions: [
          {
            id: "paymentChange",
            title: "Víte, jak se může změnit měsíční splátka?",
            options: [
              "Ano, výrazně vzroste",
              "Ano, ale nárůst zatím nevím přesně",
              "Zatím nevím",
              "Chci si to nechat spočítat",
            ],
          },
        ],
      },
      {
        id: "reserve",
        title: "Má domácnost rezervu, kdyby splátka narostla?",
        questions: [
          {
            id: "reserve",
            title: "Má domácnost rezervu, kdyby splátka narostla?",
            options: [
              "Ano, rezerva je dostatečná",
              "Nějaká rezerva je, ale nevím, jestli stačí",
              "Rezerva je nízká",
              "Nemám jasno",
            ],
          },
        ],
      },
      {
        id: "intent",
        title: "Co teď zvažujete?",
        questions: [
          {
            id: "considering",
            title: "Co teď zvažujete?",
            multiple: true,
            options: [
              "Přijmout nabídku stávající banky",
              "Porovnat nabídky jiných bank",
              "Upravit délku splatnosti",
              "Zkontrolovat celé nastavení hypotéky",
              "Nevím, potřebuji poradit",
            ],
          },
        ],
      },
    ],
    review: {
      title: "Vaše kroky před koncem fixace",
      text: "Začněte těmito podklady pro porovnání nové fixace.",
      note: "Orientační přehled, ne posouzení konkrétní úvěrové nabídky.",
      contactCtaLabel: "Probrat fixaci",
      items: [
        {
          id: "offer",
          title: "Datum fixace a nabídka banky",
          summary: "Připravte konec fixace, zůstatek úvěru a písemnou nabídku banky.",
          text: "Připravte si konec současné fixace, zůstatek úvěru a podmínky nové nabídky banky. Pokud nabídku ještě nemáte, vyžádejte si ji.",
          prioritizeWhen: [{ questionId: "considering", options: ["Přijmout nabídku stávající banky"] }],
        },
        {
          id: "payment",
          title: "Splátka a celkové náklady",
          summary: "Vedle sazby porovnejte splátku, poplatky a podmíněné produkty.",
          text: "Vedle sazby porovnejte novou měsíční splátku, délku fixace, poplatky a případné podmíněné produkty.",
        },
        {
          id: "budget",
          title: "Dopad na rozpočet",
          summary: "Doplňte novou splátku do rozpočtu včetně nutných výdajů a rezervy.",
          text: "Doplňte novou splátku do rozpočtu a zkontrolujte, kolik zbývá na nutné výdaje a rezervu.",
        },
        {
          id: "timing",
          title: "Termíny pro rozhodnutí",
          summary: "Ověřte u banky datum konce fixace a lhůty pro potvrzení dalšího řešení.",
          text: "Fixace se blíží nebo její konec neznáte. Ověřte si u banky datum a lhůty, ve kterých můžete porovnat a potvrdit další řešení.",
          when: [{ questionId: "fixationEnds", options: ["Do 3 měsíců", "Za 3–6 měsíců", "Nejsem si jistý/jistá"] }],
        },
        {
          id: "alternatives",
          title: "Srovnání variant",
          summary: "Porovnávejte stejný zůstatek úvěru, splatnost i celkovou zaplacenou částku.",
          text: "Při porovnání bank nebo změně splatnosti počítejte se stejným zůstatkem úvěru. Vedle nižší splátky sledujte i celkovou zaplacenou částku.",
          when: [{ questionId: "considering", options: ["Porovnat nabídky jiných bank", "Upravit délku splatnosti", "Zkontrolovat celé nastavení hypotéky", "Nevím, potřebuji poradit"] }],
          prioritizeWhen: [{ questionId: "considering", options: ["Porovnat nabídky jiných bank", "Upravit délku splatnosti", "Zkontrolovat celé nastavení hypotéky", "Nevím, potřebuji poradit"] }],
        },
      ],
    },
    contactTitle: "Domluvme kontrolu fixace",
    contactText:
      "Nechte mi kontakt. Ozvu se a domluvíme další postup k fixaci.",
    submitLabel: "Požádat o kontakt",
    successTitle: "Děkuji, ozvu se vám.",
    successMessage:
      "Ozvu se vám a domluvíme další krok k vaší hypotéce. Odpovědi z orientační kontroly nebyly odeslány.",
    tags: ["mortgage-fixation"],
  },
  "investment-plan": {
    type: "investment-plan",
    eyebrow: "RYCHLÁ KONTROLA INVESTIC",
    title: "Ujasněte si, co ve svém investičním plánu prověřit",
    text:
      "Ujasněte si cíle, časový horizont a výchozí situaci. Přehled dalších kroků získáte bez zadání kontaktu.",
    startCtaLabel: "Začít kontrolu",
    microcopy: "5 otázek · asi 1 minuta",
    steps: [
      {
        id: "goal",
        title: "Proč chcete investovat?",
        questions: [
          {
            id: "investmentGoal",
            title: "Jaký je váš hlavní investiční cíl?",
            options: [
              "Nejdřív doplnit finanční rezervu",
              "Budování majetku",
              "Důchod / budoucí renta",
              "Bydlení",
              "Vzdělání dětí",
              "Finanční nezávislost",
              "Zatím nevím přesně",
            ],
          },
          {
            id: "investmentHorizon",
            title: "Jak dlouho mají peníze přibližně pracovat?",
            options: [
              "Do 3 let",
              "3–7 let",
              "7–15 let",
              "Více než 15 let",
              "Nejsem si jistý/jistá",
            ],
          },
        ],
      },
      {
        id: "current-investments",
        title: "Jak dnes investujete?",
        questions: [
          {
            id: "currentInvestments",
            title: "Máte už nějaké investice?",
            options: [
              "Ano, pravidelně investuji",
              "Ano, ale spíše nepravidelně",
              "Mám více různých produktů",
              "Zatím neinvestuji",
              "Nevím, jestli se to dá považovat za investice",
            ],
          },
          {
            id: "selectionBasis",
            title: "Podle čeho jste investice vybírali?",
            options: [
              "Podle finančního plánu",
              "Podle doporučení banky",
              "Podle internetu / sociálních sítí",
              "Podle známých nebo rodiny",
              "Spíše nahodile",
              "Nevím",
              "Zatím jsem investice nevybíral/a",
            ],
          },
        ],
      },
      {
        id: "need",
        title: "Co si chcete ujasnit?",
        questions: [
          {
            id: "investmentNeed",
            title: "Co je pro vás teď nejdůležitější?",
            multiple: true,
            options: [
              "Zjistit, jestli investuji dostatečnou částku",
              "Ověřit, jestli moje investice odpovídají cíli",
              "Zjednodušit více různých produktů",
              "Nastavit jasnou dlouhodobou strategii",
              "Snížit chaos a emoce při rozhodování",
              "Začít investovat, ale bezpečněji a s plánem",
            ],
          },
        ],
      },
    ],
    review: {
      title: "Vaše kroky k investičnímu plánu",
      text: "Začněte tím, co potřebujete ujasnit před volbou nebo změnou investic.",
      note: "Orientační přehled, ne doporučení konkrétní investice.",
      contactCtaLabel: "Probrat investiční plán",
      items: [
        {
          id: "near-term",
          title: "Rezerva a blízké výdaje",
          summary: "Nejdřív oddělte rezervu a peníze potřebné do tří let od dlouhodobých cílů.",
          text: "Zapište konkrétní výdaje, částky a termíny, kdy potřebujete mít peníze k dispozici. U případného řešení ověřte dobu výběru, podmínky a možnost poklesu hodnoty; tyto peníze nezapočítejte současně do dlouhodobého cíle.",
          when: [
            { questionId: "investmentGoal", options: ["Nejdřív doplnit finanční rezervu"] },
            { questionId: "investmentHorizon", options: ["Do 3 let"] },
          ],
          prioritizeWhen: [
            { questionId: "investmentGoal", options: ["Nejdřív doplnit finanční rezervu"] },
            { questionId: "investmentHorizon", options: ["Do 3 let"] },
          ],
        },
        {
          id: "goal",
          title: "Cíl a potřebná částka",
          summary: "Ke každému cíli napište potřebnou částku a termín; rezervu oddělte.",
          text: "Přiřaďte investice ke konkrétním cílům. U každého porovnejte potřebnou částku, termín a dostupnost peněz; poznamenejte si, kde účel investice není jasný nebo kde se stejnými penězi počítáte dvakrát.",
          prioritizeWhen: [{ questionId: "investmentNeed", options: ["Ověřit, jestli moje investice odpovídají cíli"] }],
          variants: [
            {
              when: [{ questionId: "currentInvestments", options: ["Zatím neinvestuji"] }],
              title: "Cíl před výběrem investice",
              summary: "Pojmenujte cíl, potřebnou částku a termín před porovnáváním nabídek.",
              text: "Sepište, na co chcete peníze použít a které termíny můžete případně posunout. Podle tohoto zadání potom posuzujte dostupnost peněz a rizika zvažovaných řešení; konkrétní produkt zatím vybírat nemusíte.",
            },
            {
              when: [{ questionId: "investmentGoal", options: ["Zatím nevím přesně"] }],
              summary: "Nejdřív pojmenujte, k čemu mají peníze sloužit. Teprve potom porovnávejte investice.",
              text: "Napište si několik zamýšlených využití peněz a u každého orientační termín. Vyberte, co má přednost; pokud pro část peněz účel neznáte, označte ji k samostatnému probrání.",
            },
          ],
        },
        {
          id: "monthly-contribution",
          title: "Pravidelná částka a rozpočet",
          summary: "Porovnejte udržitelnou měsíční částku s cílem, termínem a penězi, které už máte stranou.",
          text: "Z rozpočtu určete částku, kterou zvládnete pravidelně odkládat po nutných výdajích a doplňování rezervy. Připravte cílovou částku, termín a dosavadní úspory pro propočet více scénářů; případný rozdíl řešte částkou, termínem nebo rozsahem cíle.",
          when: [{ questionId: "investmentNeed", options: ["Zjistit, jestli investuji dostatečnou částku"] }],
          prioritizeWhen: [{ questionId: "investmentNeed", options: ["Zjistit, jestli investuji dostatečnou částku"] }],
        },
        {
          id: "overview",
          title: "Přehled současných investic",
          summary: "U každého produktu doplňte účel, částku, poplatky a termín využití peněz.",
          text: "Připravte poslední výpisy a podmínky jednotlivých produktů. Označte, kde se jejich účel překrývá; před případným sloučením nebo ukončením ověřte také náklady a omezení takové změny.",
          when: [
            { questionId: "currentInvestments", options: ["Mám více různých produktů", "Nevím, jestli se to dá považovat za investice"] },
            { questionId: "investmentNeed", options: ["Zjednodušit více různých produktů"] },
          ],
          prioritizeWhen: [{ questionId: "investmentNeed", options: ["Zjednodušit více různých produktů"] }],
          variants: [
            {
              when: [{ questionId: "currentInvestments", options: ["Zatím neinvestuji"] }],
              title: "Přehled před výběrem produktů",
              summary: "Zatím nemáte investice ke slučování. U případných nabídek si hlídejte jejich účel a překryvy.",
              text: "Pokud zvažujete více nabídek, dejte je vedle sebe a ke každé napište, který cíl má řešit. Poznamenejte si náklady a podmínky dostupnosti peněz; další produkt neposuzujte odděleně od celého plánu.",
            },
            {
              when: [{ questionId: "currentInvestments", options: ["Nevím, jestli se to dá považovat za investice"] }],
              title: "Co už máte a k čemu to slouží",
              summary: "Dohledejte názvy produktů a výpisy. Nejdřív si nechte vysvětlit, jak jednotlivá řešení fungují.",
              text: "Ke každému účtu nebo produktu si napište poskytovatele, vloženou částku a podmínky výběru. Nejasné názvy nebo účel označte k vysvětlení; teprve pak posuzujte, zda se řešení překrývají.",
            },
          ],
        },
        {
          id: "strategy",
          title: "Dlouhodobá strategie",
          summary: "Spojte cíle, pravidelné vklady a pravidla změn do jednoho srozumitelného plánu.",
          text: "Na jednu stránku napište cíle, jejich termíny, plánované vklady a to, jaký pokles by ohrozil vaše potřeby. Doplňte, kdy plán znovu projdete a které změny životní situace mají být důvodem k jeho úpravě.",
          when: [{ questionId: "investmentNeed", options: ["Nastavit jasnou dlouhodobou strategii"] }],
          prioritizeWhen: [{ questionId: "investmentNeed", options: ["Nastavit jasnou dlouhodobou strategii"] }],
        },
        {
          id: "decision-rules",
          title: "Pravidla pro klidnější rozhodování",
          summary: "Předem si napište, kdy plán kontrolovat a co má být důvodem ke změně investic.",
          text: "Před každou změnou si poznamenejte její důvod a vazbu na vlastní cíl. Oddělte změnu svých potřeb od reakce na zprávy nebo kolísání hodnoty a určete si, co si před rozhodnutím potřebujete ověřit.",
          when: [
            { questionId: "selectionBasis", options: ["Podle finančního plánu", "Podle doporučení banky", "Podle internetu / sociálních sítí", "Podle známých nebo rodiny", "Spíše nahodile", "Nevím", "Zatím jsem investice nevybíral/a"] },
            { questionId: "investmentNeed", options: ["Snížit chaos a emoce při rozhodování"] },
          ],
          prioritizeWhen: [{ questionId: "investmentNeed", options: ["Snížit chaos a emoce při rozhodování"] }],
          variants: [
            {
              when: [{ questionId: "selectionBasis", options: ["Podle finančního plánu"] }],
              text: "Připravte svůj plán a označte pravidla pro jeho kontrolu a změny. Pokud v něm chybí postup při poklesu hodnoty nebo změně příjmu, doplňte otázky k probrání dříve, než taková situace nastane.",
            },
            {
              when: [{ questionId: "selectionBasis", options: ["Podle doporučení banky"] }],
              text: "U doporučení banky si nechte vysvětlit, jak navazuje na váš cíl, termín a přijatelný pokles. Před rozhodnutím si zapište vlastní důvod volby a podmínky, za kterých byste plán znovu prověřili.",
            },
            {
              when: [{ questionId: "selectionBasis", options: ["Podle internetu / sociálních sítí"] }],
              text: "U internetového tipu si poznamenejte zdroj a ověřitelné podklady. Před rozhodnutím si napište, proč odpovídá právě vašemu cíli a termínu; samotná popularita ani pohyb ceny tuto souvislost nevysvětlují.",
            },
            {
              when: [{ questionId: "selectionBasis", options: ["Podle známých nebo rodiny"] }],
              text: "U doporučení blízkých porovnejte jejich důvod volby s vlastním cílem, termínem a potřebou dostupných peněz. Sepište, v čem se vaše situace liší, a tyto rozdíly si nechte vysvětlit před rozhodnutím.",
            },
            {
              when: [{ questionId: "selectionBasis", options: ["Spíše nahodile"] }],
              text: "Před dalším rozhodnutím si napište cíl, důvod změny a podmínky, které má řešení splnit. Pokud důvod stojí jen na aktuální zprávě nebo emocích, nejdřív jej porovnejte s plánem a nejasnosti proberte.",
            },
            {
              when: [{ questionId: "selectionBasis", options: ["Nevím"] }],
              text: "Dohledejte, z jakých podkladů nebo doporučení váš výběr vycházel. U nejasných rozhodnutí si sepište otázky k účelu, rizikům a termínu; podle odpovědí potom nastavte pravidla dalších změn.",
            },
            {
              when: [{ questionId: "selectionBasis", options: ["Zatím jsem investice nevybíral/a"] }],
              text: "Ještě před první volbou si napište, co má investice splňovat a kdy svůj plán znovu projdete. Připravte si i postup pro situaci, kdy vás ke změně láká zpráva, tip okolí nebo kolísání hodnoty.",
            },
          ],
        },
        {
          id: "starting-plan",
          title: "Podklady před první investicí",
          summary: "Připravte cíl, horizont, rezervu a částku z rozpočtu před výběrem konkrétního řešení.",
          text: "Dejte své podklady na jedno místo a označte otázky, na které zatím nemáte odpověď. U případné nabídky si potom nechte vysvětlit fungování, rizika, náklady a podmínky výběru peněz před tím, než se rozhodnete.",
          when: [
            { questionId: "currentInvestments", options: ["Zatím neinvestuji"] },
            { questionId: "investmentNeed", options: ["Začít investovat, ale bezpečněji a s plánem"] },
          ],
          prioritizeWhen: [{ questionId: "investmentNeed", options: ["Začít investovat, ale bezpečněji a s plánem"] }],
          variants: [
            {
              when: [{ questionId: "currentInvestments", options: ["Ano, pravidelně investuji", "Ano, ale spíše nepravidelně", "Mám více různých produktů"] }],
              title: "Další investice v kontextu plánu",
              summary: "Před další investicí si ujasněte, co má doplnit k tomu, co už máte.",
              text: "K existujícím investicím přiřaďte jejich cíle a označte, co v plánu potřebujete doplnit. U zvažovaného řešení porovnejte účel, rizika, náklady a dostupnost peněz s tímto zadáním.",
            },
            {
              when: [{ questionId: "currentInvestments", options: ["Nevím, jestli se to dá považovat za investice"] }],
              title: "Ujasnit výchozí stav před další volbou",
              summary: "Než vyberete další řešení, nechte si vysvětlit, co už máte a jak to souvisí s vaším cílem.",
              text: "Připravte přehled produktů a nejasnosti k jejich fungování. Teprve po vysvětlení výchozího stavu si napište, co má případná nová investice doplnit a jaké podmínky musí splňovat.",
            },
          ],
        },
        {
          id: "horizon",
          title: "Horizont a dostupnost peněz",
          summary: "Ověřte, kdy peníze potřebujete a jak snadno je získáte z investice zpět.",
          text: "Ke každému termínu poznamenejte, zda jej můžete posunout. U zvažovaného nebo současného řešení porovnejte dobu a podmínky výběru; nejasnosti si nechte vysvětlit na konkrétním příkladu.",
          variants: [{
            when: [{ questionId: "investmentHorizon", options: ["Nejsem si jistý/jistá"] }],
            summary: "Sepište možné termíny využití peněz a oddělte část, kterou můžete potřebovat dříve.",
            text: "Projděte plánované výdaje a označte nejbližší možný termín, kdy byste peníze potřebovali. Dokud jej neznáte, připravte více časových variant a proberte, jaké nároky kladou na dostupnost peněz.",
          }],
        },
        {
          id: "risk-costs",
          title: "Rizika a náklady",
          summary: "Sepište poplatky, podmínky a dopad možného poklesu hodnoty na váš cíl.",
          text: "U produktů si nechte vyčíslit jednorázové i průběžné náklady a vysvětlit scénář poklesu hodnoty. Zapište, co by takový pokles znamenal pro částku a termín vašeho cíle, a které podmínky potřebujete objasnit.",
          variants: [{
            when: [{ questionId: "currentInvestments", options: ["Zatím neinvestuji"] }],
            title: "Rizika a náklady případné nabídky",
            summary: "Před první investicí si nechte vysvětlit náklady, možný pokles hodnoty a podmínky výběru.",
            text: "Pokud budete porovnávat nabídky, požádejte u každé o rozpis nákladů a příklad vývoje při poklesu hodnoty. Ověřte, co by to znamenalo pro váš cíl a kdy byste se dostali k penězům; nejasné podmínky si označte k vysvětlení.",
          }],
        },
      ],
    },
    contactTitle: "Projděme váš investiční plán",
    contactText:
      "Nechte mi kontakt. Ozvu se a domluvíme první krok k vašemu plánu.",
    submitLabel: "Požádat o kontakt",
    successTitle: "Děkuji, ozvu se vám.",
    successMessage:
      "Ozvu se vám a domluvíme další krok k vašim investicím. Odpovědi z orientační kontroly nebyly odeslány.",
    tags: ["investment-plan"],
  },
  "insurance-price-check": {
    type: "insurance-price-check",
    eyebrow: "RYCHLÁ KONTROLA POJIŠTĚNÍ",
    title: "Ujasněte si, co ve smlouvě prověřit",
    text:
      "Vyberte svou situaci a to, co chcete zjistit. Přehled konkrétních kontrol získáte bez zadání kontaktu.",
    startCtaLabel: "Začít kontrolu",
    microcopy: "5 otázek · asi 1 minuta",
    steps: [
      {
        id: "policy",
        title: "Které pojištění chcete prověřit?",
        questions: [
          {
            id: "insuranceType",
            title: "Které pojištění chcete prověřit?",
            options: [
              "Auto",
              "Domácnost",
              "Nemovitost",
              "Více pojistek",
              "Nevím přesně",
            ],
          },
          {
            id: "priceNotice",
            title: "Jaké je oznámené pojistné na další období?",
            options: [
              "Vyšší než minule",
              "Stejné nebo nižší",
              "Oznámení ještě nepřišlo",
              "Oznámení mám, změnu ceny zatím neznám",
            ],
          },
        ],
      },
      {
        id: "current-state",
        title: "Kdy jste pojištění naposledy porovnali?",
        questions: [
          {
            id: "lastReview",
            title: "Kdy jste pojištění naposledy porovnali?",
            options: [
              "Letos",
              "Před 1–2 lety",
              "Před více lety",
              "Nikdy / nepamatuji si",
            ],
          },
          {
            id: "coverageFit",
            title: "Je hodnota majetku ve smlouvě stále aktuální?",
            hint: "Pokud vaše pojištění s hodnotou majetku nepracuje, vyberte „Netýká se mého pojištění“.",
            options: [
              "Ano",
              "Spíš ano",
              "Spíš ne",
              "Nevím",
              "Netýká se mého pojištění",
            ],
          },
        ],
      },
      {
        id: "goal",
        title: "Co chcete při kontrole zjistit?",
        questions: [
          {
            id: "insuranceNeed",
            title: "Co chcete při kontrole zjistit?",
            multiple: true,
            options: [
              "Porovnat cenu",
              "Prověřit krytí a výluky",
              "Ověřit hodnotu majetku",
              "Porovnat více pojišťoven",
              "Projít smlouvu jako celek",
            ],
          },
        ],
      },
    ],
    review: {
      title: "Vaše kroky ke kontrole smlouvy",
      text: "Začněte těmito body podle svých odpovědí.",
      note: "Orientační přehled, ne ověření ceny ani vhodnosti smlouvy.",
      contactCtaLabel: "Domluvit si kontrolu",
      items: [
        {
          id: "price",
          title: "Cena za stejné období",
          summary: "Porovnejte původní a nové pojistné při stejném krytí, limitech a spoluúčasti.",
          text: "V předchozím a novém oznámení najděte částku a období, za které se platí. Napište je vedle sebe a spočítejte rozdíl za stejné období. U jiné nabídky si vedle ceny poznamenejte také odlišnosti v krytí, limitech a spoluúčasti.",
          prioritizeWhen: [
            { questionId: "insuranceNeed", options: ["Porovnat cenu", "Porovnat více pojišťoven"] },
          ],
          variants: [
            {
              when: [{ questionId: "priceNotice", options: ["Oznámení ještě nepřišlo"] }],
              title: "Podklady pro porovnání ceny",
              summary: "Připravte si dosavadní pojistné. Novou cenu doplníte, až přijde oznámení.",
              text: "Z posledního oznámení nebo současné smlouvy si opište částku a období, za které platíte. Až přijde nové oznámení, doplňte jeho částku a porovnejte stejné období. Pokud už máte jinou nabídku, poznamenejte si také rozdíly v krytí, limitech a spoluúčasti.",
            },
            {
              when: [{ questionId: "priceNotice", options: ["Oznámení mám, změnu ceny zatím neznám"] }],
              title: "Zjistěte novou cenu",
              summary: "Najděte částku v novém oznámení a porovnejte ji s dosavadním pojistným za stejné období.",
              text: "Otevřete nové oznámení a najděte částku i období, za které se platí. Stejné údaje dohledáte v předchozím oznámení nebo smlouvě. Zapište si obě částky a jejich rozdíl; nejdřív ověřte, že porovnáváte stejně dlouhá období.",
            },
          ],
        },
        {
          id: "coverage",
          title: "Krytí a výluky",
          summary: "Najděte, které situace smlouva kryje, kdy neplní a za jakých podmínek.",
          text: "Ve smlouvě vyhledejte seznam sjednaných rizik. K situacím, které jsou pro vás důležité, najděte v odpovídajících pojistných podmínkách také výluky a podmínky plnění. Nejasné místo si označte a připravte si konkrétní otázku k ověření.",
          prioritizeWhen: [{ questionId: "insuranceNeed", options: ["Prověřit krytí a výluky", "Projít smlouvu jako celek"] }],
        },
        {
          id: "limits-deductible",
          title: "Limity a spoluúčast",
          summary: "Zjistěte nejvyšší možné plnění a část škody, kterou byste hradili sami.",
          text: "Ke každému důležitému riziku si ze smlouvy opište limit a spoluúčast včetně uvedených podmínek. Údaje z případné jiné nabídky přidejte do druhého sloupce. Pokud je u stejného rizika uvedeno více částek a nevíte, která se vás týká, označte je k ověření.",
          prioritizeWhen: [{ questionId: "insuranceNeed", options: ["Projít smlouvu jako celek"] }],
        },
        {
          id: "current-documents",
          title: "Smlouva a aktuální podklady",
          summary: "Dohledejte platnou smlouvu, dodatky a poslední oznámení o pojistném.",
          text: "V e-mailu, klientském portálu nebo papírových podkladech vyhledejte smlouvu, poslední dodatky a verzi pojistných podmínek, na kterou odkazují. U smlouvy a dodatků zkontrolujte stejné číslo smlouvy. Chybějící podklad si vyžádejte od pojišťovny.",
          when: [
            { questionId: "lastReview", options: ["Před více lety", "Nikdy / nepamatuji si"] },
            { questionId: "priceNotice", options: ["Oznámení ještě nepřišlo", "Oznámení mám, změnu ceny zatím neznám"] },
          ],
          variants: [
            {
              when: [{ questionId: "priceNotice", options: ["Oznámení ještě nepřišlo"] }],
              summary: "Dohledejte smlouvu a dodatky. Nové oznámení přidáte, až ho obdržíte.",
              text: "Připravte současnou smlouvu, poslední dodatky a podmínky, na které odkazují. U pojišťovny si ověřte, kdy a jak vám nové oznámení pošle. Až dorazí, přidejte ho k podkladům pro kontrolu.",
            },
            {
              when: [{ questionId: "priceNotice", options: ["Oznámení mám, změnu ceny zatím neznám"] }],
              summary: "Přiložte nové oznámení ke smlouvě a ověřte, od kdy se uvedená částka platí.",
              text: "Položte nové oznámení vedle smlouvy a posledních dodatků. Zkontrolujte číslo smlouvy, období a uvedenou částku. Pokud některý údaj nedokážete přiřadit, označte ho a nechte si jej vysvětlit.",
            },
          ],
        },
        {
          id: "property-value",
          title: "Současná hodnota majetku",
          summary: "Zkontrolujte, z jaké hodnoty majetku smlouva vychází a jak se aktualizuje.",
          text: "Ve smlouvě vyhledejte hodnotu pojištěného majetku a v podmínkách způsob jejího určení nebo aktualizace. Sepište větší změny od poslední kontroly, například rekonstrukci či nové vybavení. Tyto podklady použijte při ověření, zda uvedená hodnota stále odpovídá; pokud ji ve smlouvě nenajdete, poznamenejte si to jako otázku.",
          prioritizeWhen: [{ questionId: "insuranceNeed", options: ["Ověřit hodnotu majetku"] }],
          variants: [
            {
              when: [{ questionId: "coverageFit", options: ["Netýká se mého pojištění"] }],
              summary: "Pokud vaše smlouva s hodnotou majetku nepracuje, tento bod můžete přeskočit.",
              text: "Při kontrole více pojistek se tento bod může týkat jen některé. Ve smlouvě zjistěte, co je pojištěno a zda pracuje s hodnotou tohoto majetku. Pokud to z podkladů nedokážete určit, poznamenejte si tuto otázku k ověření.",
            },
          ],
          when: [
            { questionId: "insuranceType", options: ["Domácnost", "Nemovitost", "Více pojistek", "Nevím přesně"] },
            { questionId: "coverageFit", options: ["Spíš ne", "Nevím"] },
            { questionId: "insuranceNeed", options: ["Ověřit hodnotu majetku"] },
          ],
        },
      ],
    },
    contactTitle: "Domluvme kontrolu smlouvy",
    contactText:
      "Nechte mi kontakt. Ozvu se a domluvíme kontrolu smlouvy.",
    submitLabel: "Požádat o kontakt",
    successTitle: "Děkuji, ozvu se vám.",
    successMessage:
      "Ozvu se vám a domluvíme další krok k vašemu pojištění. Odpovědi z orientační kontroly nebyly odeslány.",
    tags: ["insurance-price-check"],
  },
  "income-protection": {
    type: "income-protection",
    eyebrow: "RYCHLÁ KONTROLA PŘÍJMU",
    title: "Ujasněte si, co v ochraně příjmu prověřit",
    text:
      "Projděte příjmy, nutné výdaje a současnou ochranu příjmu. Přehled bodů ke kontrole získáte bez zadání kontaktu.",
    startCtaLabel: "Začít kontrolu",
    microcopy: "6 otázek · asi 2 minuty",
    steps: [
      {
        id: "household",
        title: "Na čem stojí rozpočet domácnosti?",
        questions: [
          {
            id: "incomeRole",
            title: "Jak důležitý je váš příjem pro domácnost?",
            options: [
              "Jsem hlavní živitel/ka",
              "Příjmy máme dva podobné",
              "Můj příjem je doplňkový",
              "Nejsem si jistý/jistá",
            ],
          },
          {
            id: "commitments",
            title: "Které závazky a pravidelné výdaje potřebujete pokrýt?",
            hint: "Vyberte, co potřebujete hradit i při výpadku příjmu. Možnosti bez závazků nebo bez jasného přehledu vybírejte samostatně.",
            multiple: true,
            exclusiveOptions: ["Nemám takové závazky", "Nevím, co všechno započítat"],
            options: [
              "Hypotéku",
              "Nájem",
              "Péči o děti nebo jiné blízké",
              "Další úvěry",
              "Náklady podnikání",
              "Nemám takové závazky",
              "Nevím, co všechno započítat",
            ],
          },
        ],
      },
      {
        id: "policy",
        title: "Co dnes pojistka kryje?",
        questions: [
          {
            id: "currentPolicy",
            title: "Máte sjednané pojištění příjmu nebo životní pojištění?",
            options: [
              "Ano, ale nevím přesně co kryje",
              "Ano, pravidelně ho kontroluji",
              "Mám spíš úrazové pojištění",
              "Nemám nic",
              "Nejsem si jistý/jistá",
            ],
          },
          {
            id: "keyRisks",
            title: "Která z těchto rizik máte podle smlouvy pojištěná?",
            hint: "Rozlišujte invaliditu a závažná onemocnění. Pokud si krytím nejste jistí, zvolte „Nevím“.",
            options: [
              "Invaliditu i závažná onemocnění",
              "Jen invaliditu",
              "Jen závažná onemocnění",
              "Ani jedno",
              "Nevím",
              "Pojištění nemám",
            ],
          },
        ],
      },
      {
        id: "resilience",
        title: "Jak dlouho by domácnost zvládla výpadek příjmu?",
        questions: [
          {
            id: "reserveDuration",
            title: "Jak dlouho by domácnost zvládla výpadek vašeho příjmu?",
            options: [
              "Méně než 1 měsíc",
              "1–3 měsíce",
              "3–6 měsíců",
              "Více než 6 měsíců",
              "Nemám spočítáno",
            ],
          },
          {
            id: "protectionNeed",
            title: "Co si chcete hlavně ověřit?",
            multiple: true,
            options: [
              "Jestli pojistka pokryje výdaje",
              "Jestli jsou pojistné částky dostatečné",
              "Jestli nechybí invalidita nebo nemoc",
              "Jestli neplatím za zbytečnosti",
              "Chci tomu konečně rozumět",
            ],
          },
        ],
      },
    ],
    review: {
      title: "Vaše kroky ke kontrole ochrany příjmu",
      text: "Začněte propojením pojistné ochrany s výdaji domácnosti.",
      note: "Orientační přehled, ne potvrzení dostatečné pojistné ochrany.",
      contactCtaLabel: "Probrat ochranu příjmu",
      items: [
        {
          id: "expenses",
          title: "Nutné měsíční výdaje",
          summary: "Sepište bydlení, splátky, nutné výdaje a příjmy, které by domácnosti zůstaly.",
          text: "Sepište bydlení, splátky a běžné nutné výdaje. Doplňte, které příjmy domácnosti by při vašem výpadku zůstaly.",
          prioritizeWhen: [{ questionId: "protectionNeed", options: ["Jestli pojistka pokryje výdaje"] }],
          variants: [
            {
              when: [{ questionId: "incomeRole", options: ["Jsem hlavní živitel/ka"] }],
              summary: "Spočítejte nutné výdaje a rozdíl, který by po výpadku vašeho hlavního příjmu chyběl.",
              text: "Do jednoho sloupce napište nutné měsíční výdaje a do druhého příjmy, které by zůstaly bez vašeho výdělku. Rozdíl je částka, pro kterou potřebujete hledat řešení pomocí rezervy nebo další ochrany.",
            },
            {
              when: [{ questionId: "incomeRole", options: ["Příjmy máme dva podobné"] }],
              summary: "Porovnejte nutné výdaje s příjmem, který by domácnosti zůstal.",
              text: "Spočítejte, kolik z nutných výdajů by pokryl druhý příjem. Zbytek porovnejte s rezervou a případnou pojistnou ochranou; stejné ověření udělejte i pro výpadek druhého výdělku.",
            },
            {
              when: [{ questionId: "incomeRole", options: ["Můj příjem je doplňkový"] }],
              summary: "Zjistěte, které výdaje by bez vašeho doplňkového příjmu chybělo z čeho zaplatit.",
              text: "Projděte konkrétní platby, na které váš příjem přispívá. Oddělte nezbytné položky od těch, které lze odložit, a spočítejte zbývající měsíční rozdíl.",
            },
            {
              when: [{ questionId: "incomeRole", options: ["Nejsem si jistý/jistá"] }],
              summary: "Nejdřív si ujasněte, jakou část nutných výdajů pokrývá právě váš příjem.",
              text: "Sepište pravidelné příjmy domácnosti a nutné výdaje za stejné období. Pak z rozpočtu odečtěte svůj výdělek a označte platby, které by zůstaly bez pokrytí.",
            },
          ],
        },
        {
          id: "policy",
          title: "Krytá rizika a podmínky",
          summary: "Najděte potřebná rizika, výluky a čekací doby v podmínkách smlouvy.",
          text: "Ke každému riziku si poznamenejte, kdy vzniká nárok na plnění, jaké jsou výluky a případné čekací doby. Nejasné formulace si označte a nechte vysvětlit na konkrétním příkladu.",
          prioritizeWhen: [{ questionId: "protectionNeed", options: ["Chci tomu konečně rozumět"] }],
          variants: [{
            when: [
              { questionId: "currentPolicy", options: ["Nemám nic"] },
              { questionId: "keyRisks", options: ["Pojištění nemám"] },
            ],
            title: "Podmínky případné nové ochrany",
            summary: "U případné nabídky si nechte vysvětlit rizika, výluky a čekací doby.",
            text: "Nejdřív pojmenujte situace, které potřebujete řešit. Pokud budete porovnávat nabídku pojištění, ptejte se, kdy by vyplatila peníze, kdy ne a jaké podmínky byste museli splnit.",
          }],
        },
        {
          id: "amounts",
          title: "Pojistné částky a výdaje",
          summary: "Porovnejte částky a způsob plnění s výdaji, rezervou a zbývajícími příjmy.",
          text: "Zapište pojistné částky a rozlište jednorázové a pravidelné plnění. Vedle nich uveďte měsíční rozdíl v rozpočtu a dobu, po kterou potřebujete výpadek řešit. Nejasnosti vezměte ke kontrole smlouvy.",
          prioritizeWhen: [{ questionId: "protectionNeed", options: ["Jestli jsou pojistné částky dostatečné"] }],
          variants: [{
            when: [
              { questionId: "currentPolicy", options: ["Nemám nic"] },
              { questionId: "keyRisks", options: ["Pojištění nemám"] },
            ],
            title: "Kolik by při výpadku chybělo",
            summary: "Spočítejte chybějící příjem a potřebnou dobu ochrany před porovnáním případných nabídek.",
            text: "Od nutných výdajů odečtěte příjmy, které by zůstaly. Poznamenejte si dostupnou rezervu a dobu, po kterou potřebujete rozdíl pokrýt. Tyto údaje poslouží jako podklad pro posouzení případné nabídky.",
          }],
        },
        {
          id: "commitments",
          title: "Závazky, které poběží dál",
          summary: "Ke zvoleným závazkům napište měsíční částky a termíny, kdy je potřebujete platit.",
          text: "U bydlení, úvěrů a péče o blízké sepište pravidelné platby, které by pokračovaly i bez vašeho příjmu. Zahrňte je do nutných výdajů; stejnou platbu v rozpočtu nezapočítejte dvakrát.",
          when: [{ questionId: "commitments", options: ["Hypotéku", "Nájem", "Péči o děti nebo jiné blízké", "Další úvěry", "Náklady podnikání", "Nevím, co všechno započítat"] }],
          variants: [
            {
              when: [{ questionId: "commitments", options: ["Náklady podnikání"] }],
              summary: "Vedle výdajů domácnosti sepište i náklady podnikání, které by při výpadku zůstaly.",
              text: "Oddělte nutné výdaje domácnosti od pravidelných nákladů podnikání. U obou seznamů označte, co by se dál platilo, a jaké příjmy by mohly zůstat. Pro kontrolu připravte oba přehledy.",
            },
            {
              when: [{ questionId: "commitments", options: ["Nevím, co všechno započítat"] }],
              summary: "Projděte pravidelné platby a označte ty, které by pokračovaly i bez vašeho příjmu.",
              text: "Projděte výpisy a plánované platby za bydlení, úvěry, péči o blízké a případně podnikání. Oddělte nutné položky od odložitelných a součet přidejte k rozpočtu.",
            },
          ],
        },
        {
          id: "reserve",
          title: "Doba, po kterou vydrží rezerva",
          summary: "Přepočítejte rezervu podle nutných výdajů a období do případného plnění.",
          text: "Spočítejte měsíční rozdíl mezi nutnými výdaji a příjmy, které by zůstaly. Pokud peníze chybějí, vydělte použitelnou rezervu touto částkou. Jestli spoléháte i na pojistné plnění, ověřte podmínky a dobu jeho výplaty.",
          when: [{ questionId: "reserveDuration", options: ["Méně než 1 měsíc", "1–3 měsíce", "Nemám spočítáno"] }],
        },
        {
          id: "missing-coverage",
          title: "Rozsah ochrany při nemoci a invaliditě",
          summary: "Porovnejte krytí invalidity a závažných onemocnění s tím, co potřebujete chránit.",
          text: "U obou rizik si napište přesnou definici pojistné události, sjednanou částku a případná omezení. Kde některý údaj chybí nebo mu nerozumíte, označte jej k ověření.",
          when: [
            { questionId: "currentPolicy", options: ["Ano, ale nevím přesně co kryje", "Mám spíš úrazové pojištění", "Nemám nic", "Nejsem si jistý/jistá"] },
            { questionId: "keyRisks", options: ["Jen invaliditu", "Jen závažná onemocnění", "Ani jedno", "Nevím", "Pojištění nemám"] },
            { questionId: "protectionNeed", options: ["Jestli nechybí invalidita nebo nemoc"] },
          ],
          prioritizeWhen: [{ questionId: "protectionNeed", options: ["Jestli nechybí invalidita nebo nemoc"] }],
          variants: [
            {
              when: [
                { questionId: "currentPolicy", options: ["Nemám nic"] },
                { questionId: "keyRisks", options: ["Pojištění nemám"] },
              ],
              title: "Rozsah případné nové ochrany",
              summary: "Ujasněte si, jaké následky nemoci nebo invalidity potřebujete finančně řešit.",
              text: "Sepište, jak by se změnily příjmy a výdaje domácnosti. Pokud budete zvažovat pojištění, porovnejte u nabídky krytá rizika, jejich definice a omezení s tímto seznamem.",
            },
            {
              when: [{ questionId: "keyRisks", options: ["Jen invaliditu"] }],
              summary: "Vedle uvedené invalidity si ujasněte, zda potřebujete řešit i závažná onemocnění.",
              text: "Zapište, co má vaše současné krytí invalidity řešit. Samostatně si ujasněte dopad závažného onemocnění a ověřte, zda jej řeší jiná část vaší ochrany, nebo jej potřebujete probrat.",
            },
            {
              when: [{ questionId: "keyRisks", options: ["Jen závažná onemocnění"] }],
              summary: "Vedle závažných onemocnění si ujasněte, jak byste řešili následky invalidity.",
              text: "Zapište, co má vaše současné krytí závažných onemocnění řešit. Samostatně si ujasněte dlouhodobý dopad invalidity a připravte tuto otázku ke kontrole ochrany příjmu.",
            },
          ],
        },
        {
          id: "cost-benefit",
          title: "Cena a účel jednotlivých krytí",
          summary: "Porovnejte cenu jednotlivých rizik s tím, co mají ve vašem rozpočtu chránit.",
          text: "U každého sjednaného rizika si poznamenejte pojistné, částku a situaci, kterou řeší. Označte položky, jejichž účelu nerozumíte. Před případnou změnou si nechte vysvětlit, co by v ochraně zůstalo a co by se změnilo.",
          when: [{ questionId: "protectionNeed", options: ["Jestli neplatím za zbytečnosti"] }],
          prioritizeWhen: [{ questionId: "protectionNeed", options: ["Jestli neplatím za zbytečnosti"] }],
          variants: [{
            when: [
              { questionId: "currentPolicy", options: ["Nemám nic"] },
              { questionId: "keyRisks", options: ["Pojištění nemám"] },
            ],
            title: "Cena případné nové ochrany",
            summary: "U případné nabídky si nechte rozepsat cenu a účel každého krytí.",
            text: "Pokud zatím nemáte pojištění, začněte tím, co potřebujete chránit. U případné nabídky si nechte jednotlivé položky vysvětlit a propojit s konkrétními výdaji nebo situacemi, které řešíte.",
          }],
        },
      ],
    },
    contactTitle: "Domluvme kontrolu ochrany příjmu",
    contactText:
      "Nechte mi kontakt. Ozvu se a domluvíme, co v ochraně příjmu projdeme.",
    submitLabel: "Požádat o kontakt",
    successTitle: "Děkuji, ozvu se vám.",
    successMessage:
      "Ozvu se vám a domluvíme další krok k ochraně vašeho příjmu. Odpovědi z orientační kontroly nebyly odeslány.",
    tags: ["income-protection"],
  },
};

export function getArticleScreeningConfig(type: string) {
  return articleScreeningConfigs[type] ?? null;
}
