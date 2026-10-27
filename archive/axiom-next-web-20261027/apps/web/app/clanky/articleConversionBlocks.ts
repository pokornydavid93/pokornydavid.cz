import type { LeadTopic } from "@/lib/api";

export type ArticleConversionId =
  | "fixace-hypoteky"
  | "zdrazovani-pojisteni"
  | "zajisteni-prijmu"
  | "investicni-chaos";

type ArticleCtaBlock = {
  title: string;
  body: string[];
  buttonLabel: string;
};

type ArticleScreeningQuestion = {
  question: string;
  options: string[];
};

type ArticleScreeningStep = {
  label: string;
  title: string;
  questions: ArticleScreeningQuestion[];
};

type ArticleScreeningBlock = {
  title: string;
  text: string;
  steps: ArticleScreeningStep[];
  fields: string[];
  resultLabel: string;
  resultPromise: string;
  followUpLabel: string;
  followUp: string;
  buttonLabel: string;
};

export type ArticleConversionBlock = {
  leadTopic: LeadTopic;
  inlineCta: ArticleCtaBlock;
  screening: ArticleScreeningBlock;
  finalCta: ArticleCtaBlock;
};

export const articleConversionBlocks = {
  "fixace-hypoteky": {
    leadTopic: "Hypotéka & bydlení",
    inlineCta: {
      title: "Končí vám fixace v nejbližších měsících?",
      body: [
        "Než automaticky přijmete nabídku od banky, může dávat smysl krátce ověřit, jaké máte možnosti. Někdy nejde jen o sazbu, ale o celé nastavení hypotéky podle vašeho rozpočtu a plánů.",
        "Nechte si nezávazně zkontrolovat, zda je nabídka banky opravdu vhodná pro vaši situaci.",
      ],
      buttonLabel: "Chci s vámi projít konec fixace",
    },
    screening: {
      title: "Zjistěte, zda má smysl vaši hypotéku řešit individuálně",
      text: "Na základě vašich odpovědí se dá rychle posoudit, zda je vhodné pouze ověřit nabídku banky, porovnat trh, nebo se podívat na celkové nastavení hypotéky.",
      steps: [
        {
          label: "Krok 1: Vaše výchozí situace",
          title: "Kdy vám končí fixace hypotéky?",
          questions: [
            {
              question: "Kdy vám přibližně končí fixace?",
              options: [
                "Do 3 měsíců",
                "Za 3–6 měsíců",
                "Za 6–12 měsíců",
                "Nejsem si jistý/jistá",
              ],
            },
            {
              question: "Už vám banka poslala novou nabídku?",
              options: ["Ano", "Ne", "Čekám na ni", "Nevím"],
            },
          ],
        },
        {
          label: "Krok 2: Aktuální hypotéka",
          title: "Jak vypadá vaše současná hypotéka?",
          questions: [
            {
              question:
                "3. Máte představu, jak se může změnit vaše měsíční splátka?",
              options: [
                "Ano, splátka výrazně vzroste",
                "Ano, ale nárůst zatím nevím přesně",
                "Zatím nevím",
                "Chci si to nechat spočítat",
              ],
            },
            {
              question: "Zvažujete některou z těchto možností?",
              options: [
                "Přijmout nabídku stávající banky",
                "Porovnat nabídky jiných bank",
                "Upravit délku splatnosti",
                "Nevím, potřebuji poradit",
              ],
            },
          ],
        },
        {
          label: "Krok 3: Vaše obava nebo cíl",
          title: "Co je pro vás teď nejdůležitější?",
          questions: [
            {
              question: "5. Co chcete hlavně vyřešit?",
              options: [
                "Aby splátka příliš nezatížila rodinný rozpočet",
                "Zjistit, zda je nabídka banky férová",
                "Najít lepší možnosti na trhu",
                "Nastavit hypotéku v rámci dlouhodobého finančního plánu",
                "Rozhodnout se, zda dává smysl mimořádná splátka",
              ],
            },
          ],
        },
      ],
      fields: [
        "Jméno",
        "E-mail",
        "Telefon",
        "Preferovaný způsob kontaktu",
        "Poznámka k vaší situaci",
      ],
      resultLabel: "Jaký výsledek má screening slíbit uživateli",
      resultPromise:
        "Po vyplnění získáte rychlé posouzení, jestli má smysl nabídku banky přijmout, porovnat ji s trhem, nebo se podívat na širší nastavení hypotéky.",
      followUpLabel: "Jak má navázat CTA na konzultaci",
      followUp:
        "Děkuji, podle odpovědí má smysl podívat se na vaši situaci individuálně. Na krátké konzultaci projdeme nabídku banky, možnosti na trhu a varianty nastavení splátky tak, aby rozhodnutí dávalo smysl pro váš rozpočet i další plány.",
      buttonLabel: "Chci s vámi projít konec fixace",
    },
    finalCta: {
      title: "Chcete si projít konec fixace podle své situace?",
      body: [
        "Podíváme se na novou nabídku, měsíční splátku, rezervu a možnosti dalšího postupu.",
      ],
      buttonLabel: "Domluvit první krok ↗",
    },
  },
  "zdrazovani-pojisteni": {
    leadTopic: "Ochrana majetku",
    inlineCta: {
      title: "Přišlo vám navýšené pojistné na auto, domácnost nebo majetek?",
      body: [
        "Než částku automaticky zaplatíte, dává smysl ověřit, jestli odpovídá současnému trhu. Přepočet často ukáže, zda máte cenu i krytí nastavené stále výhodně.",
        "Nechte si nezávazně zkontrolovat, jestli za stejné nebo lepší krytí neplatíte zbytečně víc.",
      ],
      buttonLabel: "Chci zkontrolovat pojistné smlouvy",
    },
    screening: {
      title: "Zjistěte, jestli má vaše pojištění prostor pro úpravu",
      text: "Na základě vašich odpovědí se dá rychle posoudit, zda má smysl smlouvy pouze ponechat, upravit, nebo porovnat s aktuální nabídkou trhu.",
      steps: [
        {
          label: "Krok 1: Vaše výchozí situace",
          title: "Jakého pojištění se zdražení týká?",
          questions: [
            {
              question: "U jaké pojistky jste zaznamenali navýšení ceny?",
              options: [
                "Auto",
                "Domácnost",
                "Nemovitost",
                "Více pojistek najednou",
                "Nejsem si jistý/jistá",
              ],
            },
            {
              question: "Přišlo vám už pojistné na další období?",
              options: [
                "Ano, částka se zvýšila",
                "Ano, ale ještě jsem ji neporovnával/a",
                "Ne, chci smlouvy zkontrolovat preventivně",
                "Nevím, kdy mají smlouvy výročí",
              ],
            },
          ],
        },
        {
          label: "Krok 2: Aktuální pojištění",
          title: "Jak dlouho jsou smlouvy beze změny?",
          questions: [
            {
              question:
                "3. Kdy jste naposledy pojištění přepočítávali nebo porovnávali s trhem?",
              options: [
                "Letos",
                "Před 1–2 lety",
                "Před více lety",
                "Nikdy / nepamatuji si",
              ],
            },
            {
              question:
                "Víte, zda vaše krytí a limity stále odpovídají aktuální hodnotě majetku?",
              options: [
                "Ano",
                "Spíš ano",
                "Spíš ne",
                "Nevím, potřebuji zkontrolovat",
              ],
            },
          ],
        },
        {
          label: "Krok 3: Vaše obava nebo cíl",
          title: "Co chcete hlavně zjistit?",
          questions: [
            {
              question: "5. Co je pro vás teď nejdůležitější?",
              options: [
                "Zjistit, zda zbytečně nepřeplácím",
                "Zachovat krytí, ale snížit cenu",
                "Ověřit, jestli nejsem podpojištěný/á",
                "Porovnat nabídky více pojišťoven",
                "Zjistit, jestli stávající smlouvy stále dávají smysl",
              ],
            },
          ],
        },
      ],
      fields: [
        "Jméno",
        "E-mail",
        "Telefon",
        "Jaké smlouvy chcete zkontrolovat",
        "Poznámka k vaší situaci",
      ],
      resultLabel: "Jaký výsledek má screening slíbit uživateli",
      resultPromise:
        "Po vyplnění získáte rychlé posouzení, zda vaše současné pojištění odpovídá cenově i rozsahem krytí, nebo jestli existuje prostor pro úsporu či lepší nastavení.",
      followUpLabel: "Jak má plynule navázat CTA na konzultaci",
      followUp:
        "Děkuji, podle odpovědí má smysl se na vaše smlouvy podívat individuálně. Na krátké konzultaci zkontroluji aktuální pojistné, porovnám možnosti trhu a ověřím, jestli vaše krytí stále odpovídá hodnotě majetku.",
      buttonLabel: "Chci zkontrolovat pojistné smlouvy",
    },
    finalCta: {
      title:
        "Než zaplatíte navýšené pojistné, nechte si ověřit, jestli pořád dává smysl.",
      body: [
        "Možná je vaše současná smlouva stále dobrá a není potřeba ji měnit. Možná ale platíte zbytečně víc, než byste museli. A možná smlouva neodpovídá dnešní hodnotě majetku tak dobře, jak by měla.",
        "Krátká kontrola může ukázat, jestli má smysl cenu nebo rozsah krytí prověřit podrobněji.",
        "Pošlete své aktuální smlouvy ke kontrole a zjistěte, zda za stejnou nebo lepší ochranu nemůžete platit méně.",
      ],
      buttonLabel: "Chci zkontrolovat pojistné smlouvy",
    },
  },
  "zajisteni-prijmu": {
    leadTopic: "Zajištění příjmu",
    inlineCta: {
      title:
        "Máte sjednané pojištění, ale nevíte, jestli by opravdu nahradilo váš příjem?",
      body: [
        "Nejde jen o to, jestli smlouva existuje. Důležité je, zda by při nemoci, úrazu, invaliditě nebo závažném onemocnění dokázala pokrýt reálné výdaje vaší domácnosti.",
        "Nechte si nezávazně zkontrolovat, jestli vaše pojištění chrání příjem tak, jak má.",
      ],
      buttonLabel: "Chci zkontrolovat ochranu příjmu",
    },
    screening: {
      title: "Zjistěte, jestli vaše pojištění skutečně chrání příjem",
      text: "Na základě odpovědí se dá rychle posoudit, zda vaše současné pojištění odpovídá vašim příjmům, výdajům a závazkům, nebo jestli chrání jen část skutečného rizika.",
      steps: [
        {
          label: "Krok 1: Vaše výchozí situace",
          title: "Na kom stojí příjem vaší domácnosti?",
          questions: [
            {
              question: "Jste hlavním zdrojem příjmu domácnosti?",
              options: ["Ano", "Částečně", "Ne", "Nejsem si jistý/jistá"],
            },
            {
              question:
                "Máte finanční závazky, které by bylo nutné platit i při výpadku příjmu?",
              options: [
                "Hypotéka",
                "Nájem",
                "Úvěry / splátky",
                "Běžné náklady domácnosti",
                "Nemám významné závazky",
              ],
            },
          ],
        },
        {
          label: "Krok 2: Aktuální pojištění",
          title: "Jak máte dnes příjem chráněný?",
          questions: [
            {
              question:
                "3. Máte sjednané pojištění pracovní neschopnosti, invalidity nebo závažných onemocnění?",
              options: [
                "Ano, všechna tato rizika",
                "Jen některá",
                "Mám úrazové pojištění",
                "Nevím přesně",
                "Nemám žádné pojištění příjmu",
              ],
            },
            {
              question:
                "Kdy jste naposledy pojištění aktualizovali podle příjmu, výdajů nebo životní situace?",
              options: [
                "V posledním roce",
                "Před 1–3 lety",
                "Před více lety",
                "Nikdy / nepamatuji si",
              ],
            },
          ],
        },
        {
          label: "Krok 3: Vaše obava nebo cíl",
          title: "Co chcete hlavně ověřit?",
          questions: [
            {
              question: "5. Co je pro vás nejdůležitější?",
              options: [
                "Zjistit, zda bych zvládl/a delší pracovní neschopnost",
                "Ověřit, zda mám správně nastavenou invaliditu",
                "Zkontrolovat krytí závažných onemocnění",
                "Zjistit, jestli pojistné částky odpovídají mým výdajům",
                "Nastavit ochranu příjmu rozumně vzhledem k rozpočtu",
              ],
            },
          ],
        },
      ],
      fields: [
        "Jméno",
        "E-mail",
        "Telefon",
        "Přibližný měsíční příjem",
        "Přibližné měsíční výdaje domácnosti",
        "Poznámka k vaší situaci",
      ],
      resultLabel: "Jaký výsledek má screening slíbit uživateli",
      resultPromise:
        "Po vyplnění získáte rychlé posouzení, zda by vaše současné pojištění dokázalo při nemoci, úrazu nebo invaliditě nahradit příjem v rozsahu, který vaše domácnost skutečně potřebuje.",
      followUpLabel: "Jak má plynule navázat CTA na konzultaci",
      followUp:
        "Děkuji, podle odpovědí má smysl podívat se na vaši ochranu příjmu individuálně. Na krátké konzultaci projdeme vaše příjmy, výdaje, závazky a stávající pojistky. Výsledkem bude jasné srovnání, zda jste chráněni dostatečně, nebo kde vzniká mezera.",
      buttonLabel: "Chci zkontrolovat ochranu příjmu",
    },
    finalCta: {
      title: "Nečekejte na chvíli, kdy se ukáže, že pojistka nestačí.",
      body: [
        "Pokud máte pojištění sjednané před lety, změnil se vám příjem, máte hypotéku, rodinu nebo vyšší pravidelné výdaje, dává smysl ověřit, jestli vaše ochrana příjmu stále odpovídá realitě.",
        "Krátká kontrola ukáže, zda by vaše domácnost zvládla výpadek příjmu, nebo jestli je ve smlouvách mezera, která by při vážné situaci znamenala finanční problém.",
        "Nechte si projít současné pojištění a zjistěte, jestli skutečně chrání to nejdůležitější — váš příjem.",
      ],
      buttonLabel: "Chci zkontrolovat ochranu příjmu",
    },
  },
  "investicni-chaos": {
    leadTopic: "Investice a spoření",
    inlineCta: {
      title: "Investujete už dnes, ale nejste si jistí, jestli to celé dává směr?",
      body: [
        "Než budete vybírat další produkt nebo reagovat na další doporučení z internetu, může dávat smysl podívat se na investice jako na celek: cíle, horizont, riziko, pravidelnost a návaznost na váš finanční plán.",
        "Nechte si nezávazně zkontrolovat, jestli vaše investice odpovídají tomu, čeho chcete dlouhodobě dosáhnout.",
      ],
      buttonLabel: "Chci zkontrolovat investiční strategii",
    },
    screening: {
      title: "Zjistěte, jestli vaše investice mají jasný směr",
      text: "Na základě vašich odpovědí se dá rychle posoudit, jestli současné investice odpovídají vašim cílům, horizontu a toleranci rizika — nebo jestli je potřeba nejdříve vytvořit přehlednější plán.",
      steps: [
        {
          label: "Krok 1: Vaše výchozí situace",
          title: "Proč chcete investovat?",
          questions: [
            {
              question: "Jaký je váš hlavní investiční cíl?",
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
              question: "Jak dlouho mají peníze přibližně pracovat?",
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
          label: "Krok 2: Aktuální investice",
          title: "Jak investujete dnes?",
          questions: [
            {
              question: "3. Máte už nějaké investice?",
              options: [
                "Ano, pravidelně investuji",
                "Ano, ale spíše nepravidelně",
                "Mám více různých produktů",
                "Zatím neinvestuji",
                "Nevím, jestli se to dá považovat za investice",
              ],
            },
            {
              question: "Podle čeho jste investice vybírali?",
              options: [
                "Podle finančního plánu",
                "Podle doporučení banky",
                "Podle internetu / sociálních sítí",
                "Podle známých nebo rodiny",
                "Spíše nahodile",
                "Nevím",
              ],
            },
          ],
        },
        {
          label: "Krok 3: Vaše obava nebo cíl",
          title: "Co si chcete ujasnit?",
          questions: [
            {
              question: "5. Co je pro vás teď nejdůležitější?",
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
      fields: [
        "Jméno",
        "E-mail",
        "Telefon",
        "Přibližná částka, kterou dnes investujete měsíčně",
        "Hlavní investiční cíl",
        "Poznámka k vaší situaci",
      ],
      resultLabel: "Jaký výsledek má screening slíbit uživateli",
      resultPromise:
        "Po vyplnění získáte rychlé posouzení, zda vaše současné investice odpovídají vašim cílům, časovému horizontu a ochotě podstupovat riziko — nebo jestli investujete spíše bez jednotné strategie.",
      followUpLabel: "Jak má plynule navázat CTA na konzultaci",
      followUp:
        "Děkuji, podle odpovědí má smysl podívat se na vaše investice komplexně. Na krátké konzultaci projdeme, proč investujete, jaké produkty dnes využíváte, zda investovaná částka odpovídá vašim cílům a jak by mohl vypadat přehledný dlouhodobý plán.",
      buttonLabel: "Chci zkontrolovat investiční strategii",
    },
    finalCta: {
      title: "Nezačínejte další investicí. Začněte tím, že si ujasníte celý plán.",
      body: [
        "Pokud dnes investujete podle různých doporučení, máte více produktů, nejste si jistí pravidelnou částkou nebo nevíte, jestli vaše strategie vede k vašim cílům, má smysl se na celé nastavení podívat v souvislostech.",
        "Investování nemusí být chaotické ani složité. Když má jasný cíl, horizont a systém, dává větší klid i větší smysl.",
        "Nechte si projít současné investice a zjistěte, jestli skutečně pracují pro cíle, které jsou pro vás důležité.",
      ],
      buttonLabel: "Chci zkontrolovat investiční strategii",
    },
  },
} satisfies Record<ArticleConversionId, ArticleConversionBlock>;

export function isArticleConversionId(value: unknown): value is ArticleConversionId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(articleConversionBlocks, value)
  );
}

export function getArticleConversionBlock(id: unknown) {
  return articleConversionBlocks[
    isArticleConversionId(id) ? id : "fixace-hypoteky"
  ];
}
