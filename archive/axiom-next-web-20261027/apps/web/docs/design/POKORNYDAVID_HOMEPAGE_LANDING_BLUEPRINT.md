# PokornyDavid Homepage & Overview Flow Blueprint

> Implementační blueprint pro Codex  
> Projekt: PokornyDavid.cz  
> Scope: veřejná homepage `/`, lead route `/ziskat-prehled` a potvrzení `/ziskat-prehled/dekujeme`  
> Navazuje na: `POKORNYDAVID_COMPONENT_LAYOUT_SYSTEM_BLUEPRINT.md`  
> Status dokumentu: závazná cílová specifikace před implementací  
> Jazyk veřejného rozhraní: čeština

---

## 1. Účel dokumentu

Tento dokument určuje, jak má být koncipovaná a implementovaná homepage finančního poradce PokornyDavid.cz, aby:

1. rychle vysvětlila, s čím David pomáhá,
2. snížila nejistotu člověka, který neví, kde začít,
3. propojila hypotéku, rezervu, investice a ochranu příjmu do jednoho srozumitelného rámce,
4. doložila důvěryhodnost ověřitelnými fakty,
5. popsala postup a způsob odměňování bez mlžení,
6. nabídla jeden bezpečný a přiměřeně závazný další krok,
7. fungovala bez manipulativních konverzních technik,
8. používala existující komponentový, layoutový, surface a token systém.

Nejde pouze o vizuální návrh. Blueprint je kontrakt pro:

- informační architekturu,
- obsah a copy,
- komponenty a layout,
- route flow,
- serverovou validaci formuláře,
- důvěryhodnost a regulatorní přesnost,
- analytiku,
- SEO,
- přístupnost,
- privacy a consent,
- výkon,
- testování a launch gate.

---

## 2. Autorita a způsob použití

Codex musí před implementací:

1. projít skutečný repository tree,
2. přečíst existující component/layout blueprint,
3. najít reálné tokeny, komponenty, patterns a route conventions,
4. zachovat aktuální canonical URL,
5. znovu použít existující runtime kontrakty,
6. nahlásit konflikty mezi tímto dokumentem a současným kódem.

Tento blueprint neurčuje slepě názvy souborů. Určuje výsledné chování a architektonické hranice. Pokud repository používá jinou legitimní organizaci než příklady v tomto dokumentu, přizpůsob implementaci existujícím konvencím a změnu zdokumentuj.

### 2.1 Rozdělení autority

Při konfliktu mají absolutní prioritu pravdivost, zákonné/regulatorní požadavky, přístupnost, bezpečnost uživatele a aktuální ověřená business fakta.

Potom rozděl autoritu podle domény:

- `POKORNYDAVID_COMPONENT_LAYOUT_SYSTEM_BLUEPRINT.md` je autorita pro component inventory, veřejné API, layering, variant gate a registry maturity,
- tento homepage blueprint je autorita pro route IA, pořadí modulů, homepage copy contract, CTA flow a jejich composition,
- současné repository conventions jsou autorita pro legitimní organizaci souborů a framework-specific detaily, pokud neporušují výše uvedené kontrakty,
- specimen copy a vizuální demo mají nejnižší prioritu.

Route dokument nesmí změnit core registry, veřejné component API ani variant gate bez samostatně schválené změny component/layout blueprintu.

Specimen nikdy nesmí přepsat pravdivost nebo canonical route.

---

## 3. Závazné produktové rozhodnutí

Homepage `/` je **rozhodovací homepage a trust-routing hub pro smíšený intent**.

Není to:

- landing page jedné placené kampaně,
- katalog finančních produktů,
- ceníková stránka,
- automatizovaný finanční poradce,
- generátor doporučení,
- dlouhý dotazník,
- osobní vizitka postavená primárně na portrétu,
- blogový rozcestník.

Homepage má uživatele provést touto sekvencí:

```text
nejistota
  → rozpoznání vlastní situace
  → pochopení výsledku spolupráce
  → pochopení postupu a odměňování
  → ověřitelný důkaz
  → bezpečný první krok
```

### 3.1 Hlavní slib

Web neprodává jednotlivý produkt. Pomáhá člověku nejdřív srovnat souvislosti a až potom určit další kroky.

### 3.2 Primární konverzní kontrakt

Na celé homepage existuje jeden primární CTA label:

```text
Získat přehled
```

Všechny jeho výskyty vedou na `/ziskat-prehled` s povoleným, bezpečně allowlistovaným kontextem zdroje.

CTA nesmí slibovat okamžitě vygenerovaný finanční přehled, pokud route ve skutečnosti pouze odesílá kontakt. Route musí jasně vysvětlit:

- co člověk právě dělá,
- jaké minimum informací se sbírá,
- co se stane po odeslání,
- kdy a v jaké podobě vznikne skutečný přehled.

Pokud business proces žádný konkrétní přehled nebo písemné shrnutí nedodává, musí se CTA před spuštěním přejmenovat. Nesmí zůstat pouze marketingovým slibem.

Slib CTA musí být uložený v jednom sdíleném a schváleném kontraktu:

```ts
interface OverviewOfferContract {
  ctaLabel: 'Získat přehled';
  immediateOutcome: string;
  firstHumanStep: string;
  actualDeliverable: string;
  deliveryMoment: string;
  deliveryFormat: string;
  priceDisclosure: string;
  owner: string;
  status: 'draft' | 'approved' | 'expired' | 'blocked';
  approvedBy?: string;
  approvedAt?: string;
  reviewAt: string;
}
```

Homepage, `/ziskat-prehled` a thank-you route musí číst stejný `OverviewOfferContract`. Produkční build nebo content validation musí selhat, pokud kontrakt chybí, není `approved`, je po `reviewAt` nebo jeho `actualDeliverable` neodpovídá CTA labelu. Jednotlivé route nesmí tento slib parafrázovat do odlišného významu.

---

## 4. Cílový uživatel a jeho úkol

Homepage se nesmí opírat o smyšlenou demografickou personu. První verze pracuje se čtyřmi ověřitelnými situačními jobs-to-be-done:

1. člověk řeší bydlení nebo hypotéku,
2. člověk chce srovnat rezervu a investice,
3. člověk potřebuje chránit příjem a rodinu,
4. člověk cítí finanční nejistotu, ale neví, kde začít.

Společný problém:

> Uživatel neví, které rozhodnutí má udělat první, jak spolu témata souvisejí a komu může důvěřovat.

Společný požadovaný výsledek:

> Uživatel pochopí pořadí rozhodnutí, očekávaný průběh spolupráce a bezpečně zahájí další krok bez tlaku na okamžitý nákup produktu.

### 4.1 Research gate

Tyto čtyři situace jsou výchozí hypotéza. Před prvním spuštěním musí být přiměřeně porovnány s dostupnými pre-launch zdroji:

- reálnými poptávkami,
- vyhledávacími dotazy,
- otázkami z prvních schůzek,
- kvalitativními rozhovory.

Po spuštění proběhne v předem určeném termínu povinný review proti agregovaným datům, kvalitě poptávek a novým rozhovorům. Post-launch analytika není podmínkou předchozího označení první verze jako `live`.

Codex nesmí vytvářet další situační větve bez doložené potřeby.

---

## 5. Definice úspěchu

Primární metrika není počet kliknutí na CTA. Primární výsledek je **kvalifikované a pravdivě potvrzené dokončení flow `/ziskat-prehled`**.

Sleduj postupně:

1. zobrazení homepage,
2. výběr situace,
3. zahájení lead flow,
4. serverem potvrzené odeslání,
5. zahájení rezervace,
6. skutečně dokončenou rezervaci, pokud ji provider umí spolehlivě potvrdit.

### 5.1 Guardrail metriky

Konverze nesmí růst na úkor:

- vyššího počtu chybných nebo nekvalitních poptávek,
- neporozumění tomu, co se stane po odeslání,
- accessibility regresí,
- načítání non-essential služeb bez souhlasu,
- delšího LCP nebo zhoršení INP/CLS,
- zvýšeného množství osobních údajů,
- zavádějících tvrzení.

Nestanovuj procentní cíle bez baseline. První release změří výchozí stav.

---

## 6. Route architektura

Povinný scope:

| Route | Role | Indexace |
| --- | --- | --- |
| `/` | rozhodovací homepage | `index, follow` |
| `/ziskat-prehled` | minimální lead a next-step flow | explicitní Phase 0 rozhodnutí; do té doby `noindex` |
| `/ziskat-prehled/dekujeme` | potvrzení po úspěšném serverovém submitu | `noindex, nofollow` |

Phase 0 musí vytvořit explicitní `overviewIndexable: boolean`. Z jedné hodnoty konzistentně odvoď robots, canonical strategii a sitemap inclusion. Hodnota `true` je povolená pouze tehdy, pokud route nabízí unikátní samostatný obsah odpovídající reálnému search intentu; samotný formulář nestačí.

### 6.1 Canonical route audit

Před přidáním odkazů zjisti skutečné canonical route pro:

- služby,
- Jak pracuji,
- reference,
- profil Davida,
- články,
- kontakt,
- privacy a cookies.

V současných podkladech se objevují například dvojice `/o-mne` a `/kdo-jsem` nebo `/blog` a `/clanky`. Codex nesmí vytvořit druhou veřejnou route pouze kvůli tomuto dokumentu. Použij současnou canonical route a pro historickou variantu případně zachovej redirect podle stávající SEO strategie.

### 6.2 Povolené query parametry

Homepage může bezpečně předvyplnit situaci:

```text
/ziskat-prehled?situace=bydleni&src=home-situation
```

Povolené hodnoty `situace`:

- `bydleni`
- `rezerva-investice`
- `ochrana-prijmu`
- `orientace`

Povolené hodnoty `src`:

- `home-header`
- `home-hero`
- `home-situation`
- `home-final`
- `direct`

Neznámé hodnoty ignoruj. Nikdy je bez mapování nevypisuj do HTML, analytiky, logu ani e-mailu.

I allowlistovaný `situace` je finanční kontext, který může skončit v historii, access logu nebo referreru. Použij `Referrer-Policy: strict-origin-when-cross-origin` nebo přísnější, neposílej full query třetím stranám, rediguj ji z aplikačních logů a po serverovém předvýběru zvaž odstranění parametrů z viditelné URL přes bezpečný canonical/replace mechanismus bez ztráty no-JS funkce.

---

## 7. Povinná informační architektura homepage

Homepage obsahuje osm povinných hlavních obsahových modulů v tomto pořadí:

| # | Modul | Primární úkol | Composition contract |
| ---: | --- | --- | --- |
| 1 | Hero | pojmenovat hodnotu a první krok | `Hero` |
| 2 | Situation router | umožnit rozpoznat vlastní situaci | route composition: `SectionIntro` + `Grid` + `Surface` + `Stack` + `Link` |
| 3 | Hmatatelný výsledek | ukázat, co člověk získá | `SplitNarrative` nebo route composition |
| 4 | Postup a odměňování | odstranit procesní a cenovou nejistotu | `ProcessAndFees` |
| 5 | Důkazy | doložit důvěru konkrétními fakty | `TrustBlock` + cards/proof items |
| 6 | David | ukázat konkrétní osobu a odborný kontext | `ProfileCard` nebo `SplitNarrative` |
| 7 | FAQ | odstranit poslední praktické bariéry | `FAQSection` |
| 8 | Finální výzva | zopakovat bezpečný další krok | `ActionBand` |

Mimo těchto osm modulů jsou povinné pouze:

- `SiteHeader`,
- hlavní landmark `<main>`,
- `SiteFooter`,
- `SkipLink`.

Vedle osmi povinných modulů může existovat jeden volitelný `insights` modul. Smí být vložen mezi profile modul a FAQ pouze tehdy, pokud jsou dostupné alespoň tři kvalitní, aktuální a tematicky relevantní články. Zobrazí právě tři. Pokud podmínku nesplní, blok se nevykreslí. Žádné placeholder karty. Sekvence `FAQ → ActionBand` zůstává vždy souvislá.

### 7.1 Zákaz reorderu

Pořadí modulů je stejné v DOM i vizuálně na všech viewport widths. Nepoužívej `order`, `grid-auto-flow: dense` ani duplicitní desktop/mobile markup.

---

## 8. SiteHeader contract

Header musí být klidný, krátký a orientační.

### 8.1 Povinné části

- logo/wordmark vedoucí na `/`,
- primární navigace,
- jeden primary CTA `Získat přehled`,
- mobilní navigation trigger,
- viditelný focus,
- landmark `<nav>` s rozlišitelným accessible name.

CTA do `/ziskat-prehled` je navigace: renderuj skutečný `Link` vizuálně používající primary action recipe, ne `<button>`.

### 8.2 Doporučený informační model navigace

- Služby
- Jak pracuji
- Reference
- O mně / Kdo jsem podle canonical route
- Články podle canonical route
- `Získat přehled`

Kontakt nemusí být samostatnou hlavní položkou, pokud je snadno dostupný v CTA flow a footeru. Pokud business data ukážou jinou potřebu, změnu nejdřív ověř.

### 8.3 Chování

- header nesmí překrýt focusovaný obsah,
- sticky varianta je povolená pouze bez layout shiftu a bez výrazného zmenšování při scrollu,
- mobilní menu musí být plně ovladatelné klávesnicí,
- při otevření musí spravovat focus a po zavření jej vrátit triggeru,
- bez JS zůstává logo a primary CTA vždy dostupné; ostatní navigace je buď nativně rozbalitelná, nebo se bez JS zobrazí v použitelné alternativní podobě. Tento stav musí mít E2E test, ne pouze obecný fallback slib.

---

## 9. Modul 1 — Hero

### 9.1 Úkol

Do několika sekund vysvětlit:

- komu je služba určena,
- jaký problém řeší,
- jaký je bezpečný první krok.

### 9.2 Baseline copy

Následující text je specimen ve stavu `draft`, nikoliv předem schválený produkční claim. Hero service scope, procesní tvrzení i slib deliverable musí projít stejným approval workflow jako `OverviewOfferContract` a profesní claims. Pokud přesahují skutečně poskytovaný rozsah nebo oprávnění, uprav význam před implementací; ne pouze formulaci.

Eyebrow, pokud je použit:

```text
OSOBNÍ FINANČNÍ PLÁNOVÁNÍ
```

H1:

```text
Nejdřív přehled. Potom jasný plán.
```

Lead:

```text
Srovnáme souvislosti mezi bydlením, rezervou, investicemi a ochranou příjmu podle vaší situace.
```

Primární CTA:

```text
Získat přehled
```

Sekundární CTA:

```text
Jak spolupráce probíhá
```

Povolená mikroinformace pouze po ověření:

```text
Online nebo osobně v Olomouci.
```

### 9.3 Copy limity

- H1: nejvýše 55 znaků; dvě řádky na wide viewportu jsou visual QA kritérium, ne build-time textová validace,
- lead: nejvýše 180 znaků a dvě krátké věty,
- nejvýše dvě CTA,
- nejvýše tři ověřená proof fakta,
- žádný odstavec biografie,
- žádný formulář v hero.

### 9.4 Media contract

Preferované hero médium je konkrétní výstup služby:

- anonymizovaná mapa rozhodnutí,
- přehled priorit,
- ukázka písemného shrnutí,
- HTML/CSS specimen reálného deliverable.

Hero nesmí používat generickou stock fotografii poradce u notebooku jako hlavní vysvětlení hodnoty. Portrét Davida patří do profile modulu.

Pokud není k dispozici pravdivý a kvalitní výstup, použij typografický hero bez média. Nevyráběj falešný dokument pouze pro dekoraci.

### 9.5 Layout a komponenty

- `Container size="wide"`,
- `Sidebar` nebo `Switcher` pro copy/media,
- `Stack` pro text,
- `Cluster` pro CTA a proof facts,
- `Hero` domain component,
- existující `Surface` role/tone API pro page-level dark contract. Route nepoužívá raw `--surface-*` token jako veřejné styling API.

Na narrow viewportu jde copy před médium. CTA se mohou skládat pod sebe, ale primární zůstává první.

---

## 10. Modul 2 — Situation router

### 10.1 Úkol

Umožnit člověku rychle rozpoznat vlastní situaci bez potřeby znát finanční terminologii.

Doporučený nadpis:

```text
Co právě potřebujete srovnat?
```

### 10.2 Přesně čtyři vstupy

1. `Řeším bydlení nebo hypotéku`
2. `Chci srovnat rezervu a investice`
3. `Potřebuji chránit příjem a rodinu`
4. `Nevím, kde začít`

Každá položka je skutečný odkaz do `/ziskat-prehled` s allowlistovanou situací. Není to `ChoiceChip`, fake button ani JavaScript-only karta.

Protože návštěvník může být stále ve fázi orientace, cílová route před kontaktními poli nejdřív serverově vykreslí krátké intent-specific vysvětlení: co daná situace typicky znamená, co první krok vyřeší a co zatím není potřeba dokládat. Teprve potom žádá kontakt. Pokud budoucí výzkum ukáže, že lidé potřebují hlubší edukaci, mohou první tři karty vést na canonical situation/service content a až jeho CTA do předvyplněného flow. `Nevím, kde začít` může zůstat přímou cestou do `orientace`.

### 10.3 Obsahový kontrakt karty

- title: nejvýše 7 slov,
- description: 90–140 znaků,
- volitelná jednoduchá ikona s dekorativním `aria-hidden`,
- žádné číslo produktu,
- žádný výnos, sazba nebo slib schválení,
- celé interaktivní tělo má jeden srozumitelný accessible name.

### 10.4 Layout

- `SectionIntro`,
- `Grid mode="fit"`,
- route-lokální kompozice `Surface` + `Stack` + skutečný `Link`,
- 1 sloupec narrow,
- 2 sloupce medium,
- maximálně 4 sloupce wide,
- light family pro čitelné srovnání,
- selected stav zde neexistuje; jde o navigaci, ne persistentní volbu.

Karta má zřetelný hover pouze na zařízeních, která hover podporují, a samostatný `:focus-visible`. Hover nesmí být jedinou informací o klikatelnosti.

---

## 11. Modul 3 — Hmatatelný výsledek

### 11.1 Úkol

Převést abstraktní „finanční poradenství“ na konkrétní výsledek spolupráce.

Doporučený nadpis:

```text
Uvidíte, co řešit teď a co může počkat.
```

### 11.2 Povinné významy

Sekce vysvětluje, že přehled může ukázat:

- priority teď a později,
- vzájemné závislosti rozhodnutí,
- mezery, duplicity nebo rizika,
- písemné shrnutí dalších kroků.

Použij 3–5 bodů, každý nejvýše 110 znaků.

### 11.3 Vizualizace výsledku

Zobraz pouze artefakt, který odpovídá reálnému procesu. Musí být:

- anonymizovaný,
- bez skutečných osobních a finančních údajů,
- čitelný i bez jemných detailů,
- popsaný textem,
- dostupný bez nutnosti zoomovat screenshot,
- označený jako ukázka, pokud nejde o přesný klientský výstup.

### 11.4 Architektonické rozhodnutí

„Mapa rozhodnutí“ je v první implementaci route composition složená z existujících primitives. Samostatná domain component smí vzniknout až po druhém skutečném použití a splnění variant gate v component blueprintu.

Použij `SplitNarrative`, `ResponsiveMedia`, `Prose`, sémantický seznam přes `Stack` a existující surfaces. `ProofItem` je vyhrazen trust signalům a do outcome seznamu nepatří. Nevytvářej `HomeOutcomeWidget`.

---

## 12. Modul 4 — Postup a odměňování

### 12.1 Úkol

Odstranit dvě hlavní nejistoty:

1. co se bude dít,
2. jak je poradce odměňovaný a kde mohou existovat vztahy nebo omezení.

### 12.2 Přesně tři fáze na homepage

1. `Ujasníme situaci`
2. `Srovnáme souvislosti`
3. `Určíme další kroky`

Každý step:

- title nejvýše 4 slova,
- description nejvýše 150 znaků,
- žádný falešný lineární příslib výsledku,
- žádná časová garance bez provozně ověřeného SLA.

### 12.3 Odměňování

Homepage musí obsahovat krátké, srozumitelné a pravdivé vysvětlení:

- zda a kdy platí klient přímo,
- zda může odměna přicházet od obchodního partnera,
- kde uživatel najde úplné informace,
- že konkrétní způsob bude vysvětlen před rozhodnutím.

Přesné znění musí schválit odpovědná osoba/SAB compliance. Codex nesmí text improvizovat a nesmí používat formulace `zdarma`, `bez provize`, `bez skrytých poplatků` nebo `nezávislé poradenství`, dokud pro ně neexistuje přesný právní a faktický podklad.

Viditelný homepage summary má nejvýše 450 znaků nebo tři krátké věty. Delší vysvětlení vede na canonical detail. Obsahový záznam musí mít `status`, `version`, `approvedBy`, `approvedAt` a `reviewAt`; po expiraci se nesmí vydávat za schválený.

Informace nesmí být schovaná pouze v FAQ nebo legal footeru.

Homepage summary nenahrazuje sektorové předsmluvní informace ani individuální vysvětlení před konkrétním rozhodnutím. Má pouze pravdivě orientovat a odkázat na úplnější schválený detail.

### 12.4 Layout

Použij `ProcessAndFees`, `Grid` nebo `Switcher`, `Stack`, `Prose`, případně `Disclosure` pouze pro doplňující detail. Základní podstata odměňování musí být viditelná bez rozbalení.

---

## 13. Modul 5 — Důkazy

### 13.1 Úkol

Nahradit obecné superlativy konkrétním, ověřitelným důkazem.

Důvěra se staví v tomto pořadí:

1. přesná profesní a regulatorní identita,
2. konkrétní a doložitelná praxe,
3. reálná případová ukázka nebo reference,
4. transparentní omezení a způsob práce.

### 13.2 Případová ukázka

Preferovaná anatomie:

```text
Výchozí situace
  → co bylo potřeba porovnat
  → jaké pořadí nebo proces vznikl
```

Nesmí obsahovat:

- garantovanou úsporu,
- garantovaný výnos,
- garantované schválení hypotéky,
- anonymní smyšlený citát,
- citlivá data,
- tvrzení, že výsledek je typický, pokud to není doloženo.

### 13.3 Reference

Publikuj pouze referenci, pro kterou existuje:

- doložený souhlas,
- původní znění,
- evidence schválené anonymizace,
- vlastník a datum posledního ověření.

Minimálně jeden skutečný důkaz, maximálně tři položky na homepage. Pokud nejsou dostupné, použij pouze ověřená profesní fakta; nevytvářej placeholder testimonial.

### 13.4 Regulatorní informace

Nepoužívej badge `Ověřeno ČNB`. Místo toho uveď přesnou roli a vztah, které odpovídají aktuálnímu zápisu, a nabídni přímý odkaz na konkrétní nebo jednoznačně dohledatelný záznam v registru ČNB. Text i odkaz musí mít datum ověření.

---

## 14. Modul 6 — David

### 14.1 Úkol

Ukázat, kdo za službou stojí, jaká je jeho role a proč je relevantní pro popsaný proces.

### 14.2 Povinné sloty

- aktuální autentický portrét,
- celé jméno,
- přesná profesní role,
- krátký relevantní bio text,
- odkaz na canonical profilovou route,
- volitelná ověřená profesní fakta.

Bio má 250–380 znaků. Nesmí být životopisem ani seznamem obecných hodnot.

### 14.3 Video

Video je volitelné. Pokud je externí:

- nenačítej player před explicitní interakcí,
- ukaž self-hosted statický poster a popis,
- vysvětli providera a privacy dopad,
- bez autoplay,
- poskytni titulky a textový přepis,
- rezervuj rozměry bez CLS.

Samotné kliknutí na poster není automaticky souhlas se všemi cookies nebo trackingem provideru. Aktivace musí respektovat schválený provider/consent contract v §27.5.

Před aktivací nesmí prohlížeč provést ani `preconnect`, `dns-prefetch`, remote poster request nebo jiný kontakt s externím video providerem.

### 14.4 Layout

Použij `ProfileCard` nebo `SplitNarrative`, `ResponsiveMedia`, `Stack` a `Link`. Nevytvářej homepage-only bio komponentu.

---

## 15. Modul 7 — FAQ

### 15.1 Povinná témata

FAQ obsahuje 5–7 otázek a pokryje minimálně:

1. co se stane po prvním kontaktu,
2. co si připravit,
3. jak fungují náklady a odměňování,
4. zda první kontakt k něčemu zavazuje,
5. zda lze spolupracovat online,
6. jak se pracuje s osobními údaji.

Každá odpověď má nejvýše 450 znaků nebo 2–4 krátké věty. Odpověď začíná přímou informací, ne marketingovým úvodem.

### 15.2 Komponentový kontrakt

Použij `FAQSection` skládající `Disclosure`. Nativní `<details>/<summary>` je preferované řešení, pokud splní design a focus contract.

- otázka je vždy dostupná,
- otevřený stav není komunikovaný pouze barvou,
- ikona je dekorativní,
- focus ring nesmí být oříznutý,
- při tisku nebo serverovém renderu zůstává obsah dostupný.

---

## 16. Modul 8 — Finální ActionBand

### 16.1 Baseline copy

H2:

```text
Začněme přehledem, ne produktem.
```

Lead má nejvýše 160 znaků a vysvětlí, co bude bezprostředně následovat.

Primární CTA:

```text
Získat přehled
```

Quiet link může nabídnout přímý kontakt, pokud vede na funkční canonical cestu.

### 16.2 Kontrakt

- stejný slib jako hero,
- žádná nová CTA terminologie,
- žádný countdown,
- žádná kapacitní nebo časová urgence bez pravdivého provozního důvodu,
- žádný vložený dlouhý formulář,
- action surface je funkční zvýraznění, ne dekorativní pás přes půl stránky.

---

## 17. Surface a vizuální sekvence

Použij existující tři tone contracts `dark`, `light` a `action`. Nevytvářej homepage-specific paletu.

Doporučená sekvence:

| Oblast | Surface family | Důvod |
| --- | --- | --- |
| header + hero | dark / page | soustředění a brandový vstup |
| situation router | light / paper | rychlé čtení a srovnání |
| hmatatelný výsledek | light / paper | vysvětlení artefaktu |
| postup a odměňování | dark / card-dark | strukturální důvěra |
| důkazy | light / paper | čitelnost konkrétních faktů |
| David | dark nebo action-dark | osobní a důvěryhodný kontext |
| FAQ | light / paper | delší čtení |
| final CTA | action-dark nebo action | rozhodovací závěr |
| footer | dark / page | stabilní zakončení |

### 17.1 Vizuální pravidla

- Lime slouží pro akci, aktivní stav, indikátor a přesný významový důraz.
- Lime nesmí být náhodný celoplošný dekorativní efekt.
- Forest vytváří strukturální hloubku a trust kontext.
- Ivory nese čitelný obsah.
- Jet je canvas a soustředěný základ.
- Žádné gradienty.
- Žádný glow jako náhrada hierarchie.
- Stíny pouze tehdy, pokud existují v aktuálním elevation contractu a mají funkci.
- Borders a focus používají semantic aliasy dané surface tone.
- Komponenta si nikdy sama nehádá barvu textu z hex hodnoty parentu.

---

## 18. Copy a message contract

### 18.1 Tón

Copy má být:

- klidná,
- konkrétní,
- lidská,
- profesionální,
- srozumitelná bez finančního žargonu,
- přesná v tom, co se stane dál.

Veřejné rozhraní vždy používá vykání. Obecný proces popisuj neutrálně nebo spolupracujícím plurálem. První osobu jednotného čísla používej pouze v Davidově profilu, autentickém přímém vyjádření nebo podepsané zprávě; nepřepínej mezi osobami nahodile v jedné sekci.

Nemá být:

- bombastická,
- strašící,
- založená na ztrátové averzi,
- plná neurčitých superlativů,
- produktem posedlá,
- regulatorně neurčitá.

### 18.2 Povolené message pilíře

1. nejdřív souvislosti, potom konkrétní řešení,
2. jedno pořadí místo izolovaných produktů,
3. srozumitelný proces,
4. konkrétní člověk a ověřitelná role,
5. bezpečný první krok bez falešného tlaku.

### 18.3 Zakázané nebo podmíněné formulace

Bez přesného důkazu a compliance schválení nepoužívej:

- `nezávislý poradce`,
- `porovnáváme celý trh`,
- `nejlepší`,
- `unikátní`,
- `garantovaný výnos`,
- `garantovaná úspora`,
- `garantované schválení`,
- `bez rizika`,
- `zdarma`,
- `bez skrytých poplatků`,
- `100+ spokojených klientů`,
- `10+ let praxe`,
- `komplexní řešení na míru` bez konkrétního vysvětlení,
- falešnou urgenci typu `poslední místa`.

Nezaměňuj počet klientů s počtem spokojených klientů. Nezaměňuj délku existence firmy s osobní praxí.

---

## 19. Claims a trust registry

Všechny veřejné trust facts musí pocházet z jednoho source of truth.

Source of truth rozděl na dvě vrstvy:

1. **server-only evidence registry** — interní zdroje, review notes, consent evidence a neveřejné dokumenty; nesmí být v client bundle ani veřejném repozitáři,
2. **public fact DTO** — pouze publikovatelné labely, hodnoty, bezpečné public URL a datum veřejného ověření.

Reference consent dokumenty ani osobní důkazy necommituj do repository. Veřejná komponenta nikdy nedostává interní `source` nebo consent record.

### 19.1 Povinný datový kontrakt

```ts
type ClaimStatus = 'draft' | 'verified' | 'expired' | 'blocked';
type ClaimKind =
  | 'identity'
  | 'role'
  | 'experience'
  | 'availability'
  | 'service-scope'
  | 'process'
  | 'deliverable'
  | 'remuneration';

interface VerifiedFactEvidence {
  id: string;
  kind: ClaimKind;
  label: string;
  value: string;
  publicExplanation?: string;
  source: string;
  sourceUrl?: string;
  verifiedAt: string;
  reviewAt: string;
  expiresAt?: string;
  owner: string;
  status: ClaimStatus;
  allowedPlacements: Array<'home' | 'profile' | 'footer' | 'structured-data'>;
}

interface PublicVerifiedFact {
  id: string;
  label: string;
  value: string;
  publicExplanation?: string;
  publicSourceUrl?: string;
  publicVerifiedAt: string;
}

interface CaseEvidenceRecord {
  id: string;
  situation: string;
  compared: string;
  resultingProcess: string;
  sourceRecordRef: string;
  anonymisationReviewedAt: string;
  owner: string;
  status: ClaimStatus;
  reviewAt: string;
}

interface TestimonialEvidenceRecord {
  id: string;
  originalText: string;
  publicText: string;
  publicAttribution: string;
  consentRecordRef: string;
  consentScope: string;
  owner: string;
  status: ClaimStatus;
  reviewAt: string;
}

type PublicEvidenceDto =
  | { id: string; kind: 'case'; situation: string; compared: string; resultingProcess: string }
  | { id: string; kind: 'testimonial'; text: string; attribution: string }
  | { id: string; kind: 'fact'; fact: PublicVerifiedFact };
```

Hero service scope, process text, outcome/deliverable a remuneration jsou veřejné claims stejně jako čísla praxe. Nesmí obejít registry jen proto, že jsou uloženy v route copy. Produkční public DTO generuj pouze ze schválených server-only records.

### 19.2 Render pravidla

- renderuj pouze `status: 'verified'`,
- po `reviewAt` fakt vyžaduje novou kontrolu a po `expiresAt` se automaticky nepovažuje za ověřený,
- nehardcoduj stejný fakt zvlášť do hero, footeru a JSON-LD,
- strukturovaná data a viditelný text musí číst stejný zdroj,
- chybějící optional fact znamená skrýt slot, ne zobrazit placeholder,
- každá reference má samostatnou evidenci souhlasu.

`expiresAt` je povinné pro časově citlivé údaje: počty, délku praxe, profesní roli/registraci, adresu, kontakt a dostupnost služby.

Protože staticky vygenerovaná stránka sama v okamžiku expirace nezmizí, implementuj nejméně jeden reálný freshness mechanismus: on-demand revalidation po změně registry, scheduled CI check s rebuildem, nebo `revalidate` naplánované před nejbližší expirací. Deploy již expirovaného claimu musí selhat. Samotná kontrola data při náhodném budoucím buildu nestačí.

### 19.3 Před spuštěním ověř zejména

- přesné celé jméno a právní identitu provozovatele,
- IČO a adresu,
- profesní roli,
- vztah k SAB servis s.r.o. nebo aktuálnímu zastoupenému subjektu,
- rozsah oprávnění relevantní pro veřejný obsah,
- přímý registr ČNB a datum ověření,
- skutečnou délku praxe,
- skutečný počet klientů a přesnou definici metriky,
- lokalitu a dostupnost online,
- kontakt,
- způsob odměňování,
- consent ke každé referenci.

Dokud se neověří konflikt `5+` versus `10+`, nesmí se na homepage publikovat žádný počet let.

---

## 20. Komponentový a layoutový kontrakt

Homepage nesmí vytvořit paralelní „landing page system“.

### 20.1 Povolené runtime kontrakty

Layout:

- `Container`
- `Stack`
- `Cluster`
- `Grid`
- `Switcher`
- `Sidebar`
- `Cover`
- `Frame`
- `Bleed` pouze pro skutečně odůvodněný široký artefakt

UI/content:

- `Button`
- `Link`
- `Icon`
- `Badge`
- `Divider`
- `Surface`
- `ResponsiveMedia`
- `Prose`
- `Notice`
- `Disclosure`

Shell/domain:

- `SkipLink`
- `SiteHeader`
- `SiteNavigation`
- `Breadcrumbs` jen mimo homepage, pokud dává smysl
- `SiteFooter`
- `Hero`
- `ArticleCard`
- `TestimonialCard`
- `ProofItem`
- `ProfileCard`
- `EnquiryForm`
- `BookingPanel`
- `CookieConsent`

Patterns:

- `SectionIntro`
- `CardCollection`
- `SplitNarrative`
- `TrustBlock`
- `ProcessAndFees`
- `FAQSection`
- `ActionBand`
- `FormContactSplit` na lead route, pokud je potřeba

Známý reconciliation bod: současná route coverage matrix v component blueprintu označuje homepage `CardCollection` jako povinný pattern. Nové rozhodnutí jej používá pouze volitelně pro tři `ArticleCard` nebo legitimní kolekci podporovaných cards; situation router je route composition. Před implementací proto vytvoř samostatně reviewovanou změnu component blueprintu `Homepage / Card collection: ● → ○`. Nerozšiřuj kvůli tomu anatomii `CardCollection`.

Template:

- `HomeTemplate` pro `/`,
- `ConversionTemplate` pro `/ziskat-prehled`,
- `ConversionTemplate` v confirmation stavu také pro děkovací route. Nevytvářej osmý `ThankYouTemplate`.

### 20.2 Co nevytvářet

Nevytvářej:

- `HomeButton`,
- `LandingCard`,
- `HomeSection`,
- `HomepageContainer`,
- `HeroCTA`,
- `HomeTrustBadge`,
- `DecisionMapComponent` před druhým použitím,
- speciální homepage spacing scale,
- speciální homepage breakpointy,
- barvy nebo border hodnoty mimo semantic tokeny.

### 20.3 New component gate

Pro vznik nové veřejné komponenty platí výhradně gate v §12 component/layout blueprintu. Tento route blueprint jej nerozšiřuje ani nemění. Homepage-only vizuální odlišnost, jediné použití nebo pohodlnější pojmenování nejsou samy o sobě důvodem pro nový runtime contract. Pokud audit odhalí legitimní novou komponentu, nejdřív samostatně aktualizuj component blueprint a registry.

---

## 21. Content data model

Obsah nemá být rozptýlený v JSX.

```ts
type SituationId =
  | 'bydleni'
  | 'rezerva-investice'
  | 'ochrana-prijmu'
  | 'orientace';

type OverviewSource =
  | 'home-header'
  | 'home-hero'
  | 'home-situation'
  | 'home-final'
  | 'direct';

type OverviewNextStep = 'contact-me' | 'choose-date';
type PreferredContactChannel = 'email' | 'phone';

// Importuj skutečné closed unions/registry typy projektu.
type InternalRoute = string & { readonly __brand: 'InternalRoute' };
type IconName = string & { readonly __brand: 'IconName' };
type AssetRef = string & { readonly __brand: 'AssetRef' };

interface SectionIntroContent {
  eyebrow?: string;
  title: string;
  lead?: string;
}

interface ActionLinkContent {
  label: string;
  href: InternalRoute;
  source?: OverviewSource;
}

interface OverviewActionLinkContent {
  label: 'Získat přehled';
  href: InternalRoute;
  source: Exclude<OverviewSource, 'direct'>;
}

interface HomeSituation {
  id: SituationId;
  title: string;
  description: string;
  href: InternalRoute;
  icon?: IconName;
  routeExplanation: string;
}

interface HomeFaqItem {
  id: string;
  question: string;
  answer: string;
}

type EvidenceRef =
  | { id: string; kind: 'fact'; factId: string }
  | { id: string; kind: 'case'; caseId: string }
  | { id: string; kind: 'testimonial'; testimonialId: string };

interface RemunerationContent {
  summary: string;
  detailHref: InternalRoute;
  status: 'draft' | 'approved' | 'expired' | 'blocked';
  version: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewAt: string;
}

interface HomePageContent {
  overviewOfferId: string;
  shell: {
    navigation: Array<{ id: string; label: string; href: InternalRoute }>;
    headerCta: OverviewActionLinkContent & { source: 'home-header' };
    footerContentId: string;
  };
  hero: {
    eyebrow?: string;
    title: string;
    lead: string;
    primaryCta: OverviewActionLinkContent & { source: 'home-hero' };
    secondaryCta?: ActionLinkContent;
    media?: {
      asset?: AssetRef;
      kind: 'html-specimen' | 'image';
      alt: string;
      caption?: string;
    };
    proofFactIds?: string[];
    microcopyFactId?: string;
  };
  situations: {
    intro: SectionIntroContent;
    items: HomeSituation[];
  };
  outcome: {
    intro: SectionIntroContent;
    points: string[];
    specimen?: {
      kind: 'html-specimen' | 'image';
      asset?: AssetRef;
      label: string;
      alt: string;
      caption?: string;
    };
    detailLink?: ActionLinkContent;
  };
  processAndFees: {
    intro: SectionIntroContent;
    steps: Array<{ id: string; title: string; description: string }>;
    remuneration: RemunerationContent;
  };
  evidence: {
    intro: SectionIntroContent;
    items: EvidenceRef[];
  };
  profile: {
    intro: SectionIntroContent;
    name: string;
    roleFactId: string;
    bio: string;
    href: InternalRoute;
    portrait: AssetRef;
    portraitAlt: string;
    proofFactIds?: string[];
    video?: {
      providerId: string;
      title: string;
      poster: AssetRef;
      transcriptHref: InternalRoute;
    };
  };
  insights?: {
    intro: SectionIntroContent;
    articleIds: [string, string, string];
  };
  faq: {
    intro: SectionIntroContent;
    items: HomeFaqItem[];
  };
  finalCta: {
    title: string;
    lead: string;
    primaryCta: OverviewActionLinkContent & { source: 'home-final' };
    quietLink?: ActionLinkContent;
  };
}
```

### 21.1 Validace obsahu

Při build/test validuj:

- právě 4 situační položky,
- právě 3 process steps,
- 5–7 FAQ položek,
- nejvýše 3 články,
- článkový blok pouze při 3 položkách,
- všechny primary CTA labely a destinations,
- interní href proti route mapě,
- character limits,
- chybějící required copy,
- neověřené nebo expirované claims,
- chybějící nebo neschválený `OverviewOfferContract`,
- chybějící/expirující remuneration approval,
- neplatné evidence reference a počet 1–3 publikovatelných důkazů,
- neplatné icon/asset/route reference,
- duplicitu IDs.

---

## 22. `/ziskat-prehled` flow

### 22.1 Úkol route

Route má převést rozpoznanou situaci do minimálního kontaktu a konkrétního dalšího kroku. Nemá provádět finanční diagnostiku ani sbírat podklady pro doporučení.

### 22.2 Informační hierarchie

1. jeden H1,
2. krátké vysvětlení výsledku a dalšího kroku,
3. ErrorSummary, pokud existují chyby,
4. jeden přístupný formulář,
5. alternativní přímý kontakt,
6. krátká privacy informace,
7. případně trust context bez odvádění od úkolu.

### 22.3 Formulářové skupiny

Použij jeden serverově funkční formulář se třemi logickými skupinami:

1. situace,
2. kontakt,
3. preferovaný další krok.

První release nemá být JavaScript wizard. Musí fungovat bez JavaScriptu. Progressive enhancement může později zlepšit pending state nebo ergonomii, ale nesmí vlastnit validaci ani jedinou cestu k odeslání.

### 22.4 Datový kontrakt

```ts
interface OverviewRequestInput {
  situation: SituationId;
  name?: string;
  email?: string;
  phone?: string;
  preferredContactChannel?: PreferredContactChannel;
  message?: string;
  nextStep: OverviewNextStep;
  source?: OverviewSource;
}
```

Povinné:

- `situation`,
- alespoň jeden kontakt: e-mail nebo telefon,
- `nextStep`.

Pokud jsou vyplněny e-mail i telefon, je povinná `preferredContactChannel`. Alternativně UI nejdřív nechá vybrat kanál a zobrazí pouze odpovídající kontaktní pole.

Jméno a krátká zpráva mohou být volitelné, pokud provozní proces nevyžaduje jinak.

`privacyAcknowledged` do base DTO nepatří. Server nezávisle uloží schválenou `privacyNoticeVersion`. Pokud bude někdy přidán marketingový souhlas, musí mít vlastní explicitní pole, purpose, policy version a timestamp; nesmí být podmínkou tohoto submitu.

### 22.5 Schválený flow content

Stavy a chybová copy nesmí být nahodilé stringy v action handleru. Vytvoř typed `OverviewFlowContent`, který obsahuje:

- intro a čtyři intent-specific vysvětlení,
- collection notice a bezpečnostní hint k textarea,
- labels, hints a required/optional texty,
- heading ErrorSummary,
- validation messages,
- provider unavailable,
- rate limit,
- duplicate/ambiguous submit,
- `request_received`,
- `booking_pending`,
- `booking_confirmed`,
- `booking_unavailable`,
- fallback contact.

```ts
interface OverviewFlowContent {
  intro: { title: string; lead: string };
  intentExplanations: Record<SituationId, { title: string; body: string }>;
  collectionNotice: { shortText: string; detailHref: InternalRoute; version: string };
  sensitiveDataHint?: string;
  fields: Record<string, { label: string; hint?: string; requiredText?: string }>;
  errorSummaryTitle: string;
  messages: {
    providerUnavailable: string;
    rateLimited: string;
    duplicateOrAmbiguous: string;
    requestReceived: string;
    bookingPending: string;
    bookingConfirmed: string;
    bookingUnavailable: string;
  };
  fallbackContact: { label: string; href: InternalRoute };
}
```

Produkční copy pro success a booking stavy musí být schválená a významově konzistentní s `OverviewOfferContract`.

### 22.6 Co v prvním flow nesbírat

- příjem,
- výši majetku,
- čísla smluv,
- čísla účtů,
- rodné číslo,
- datum narození bez doložené nutnosti,
- číslo dokladu,
- zdravotní údaje,
- detailní investiční profil,
- nahrané dokumenty.

U textarea zobraz krátké upozornění, aby uživatel nevkládal citlivé identifikátory, zdravotní údaje nebo čísla smluv a účtů.

Textarea ve v1 vynech, pokud pro první kontakt není provozně nutná. Pokud zůstane, nastav krátký délkový limit, minimální přístupy, krátkou retention a zákaz použití obsahu pro AI/trénování.

### 22.7 Validace a submit

- validuj na serveru,
- normalizuj whitespace a kontakty konzervativně tak, aby zůstaly platné mezinárodní hodnoty,
- allowlistuj enum hodnoty,
- nastav rozumné délkové limity,
- zachovej bezpečné hodnoty po chybě,
- propojuj label, description a error přes ID,
- zobraz `ErrorSummary` s odkazy na chybná pole,
- nepoužívej placeholder jako label,
- zabraň dvojímu submitu,
- použij idempotency key nebo ekvivalent,
- přidej honeypot a serverový rate limit,
- CAPTCHA přidej až při reálném spam problému,
- nikdy nevkládej PII do URL, analytics nebo veřejných logů.

No-JS error flow musí mít jeden záměrně zvolený mechanismus. Preferovaná varianta pro kompatibilní Next.js verzi:

- stabilní Server Action,
- `useActionState` s permalinkem `/ziskat-prehled`,
- serializovatelný `FormState` s field errors a bezpečnými hodnotami,
- serverově renderovaný ErrorSummary,
- bez JS přesun ke summary přes server-safe focus/fragment fallback, s JS přesný focus enhancement,
- success přes `redirect()`/303 volaný mimo `catch`, protože framework redirect používá interní exception.

Pokud aktuální Next.js verze tento no-JS návrat spolehlivě nepodporuje, použij krátkodobý server-side flash state za opaque `HttpOnly` cookie. Hodnoty a chyby nikdy nepřenášej query stringem.

### 22.8 Provider a storage boundaries

```ts
interface LeadSink {
  submit(input: NormalizedOverviewRequest): Promise<{ reference: string }>;
}

interface IdempotencyStore {
  acquire(key: string, ttlSeconds: number): Promise<'acquired' | 'duplicate'>;
  complete(key: string, receiptId: string): Promise<void>;
  fail(key: string, retryable: boolean): Promise<void>;
}

interface RateLimitStore {
  consume(key: string): Promise<{ allowed: boolean; retryAfter?: number }>;
}
```

Page, form ani domain component nesmí importovat SDK konkrétního CRM, e-mail provideru nebo kalendáře. Provider adapter žije za `LeadSink` boundary a je explicitně `server-only`. Secrets existují pouze v server environmentu.

Idempotency a rate-limit storage musí být v produkci sdílené a atomické; procesní `Map` je povolená pouze v test/dev adapteru. Idempotency key předej providerovi, pokud ho podporuje. Ambiguous timeout nesmí při retry automaticky vytvořit druhý lead. Rate-limit identity smí vycházet jen z proxy headers, kterým konkrétní hosting skutečně důvěřuje.

Request security:

- u Server Actions zachovej framework same-origin ochranu a `allowedOrigins` omez na známé proxy/domény,
- u Route Handleru validuj `Origin`/`Host` a použij odpovídající CSRF mechanismus,
- nastav malý body limit,
- ošetři CRLF/header injection v provider mappingu,
- honeypot skryj přístupným způsobem, který nechytá autofill ani screen reader,
- přidej CSP pro skutečně používané `script-src`, `connect-src`, `frame-src` a `img-src`; nepovoluj plošně `unsafe-inline`,
- odmítnutý cross-origin nebo honeypot submit nesmí zavolat providera.

Po úspěchu vytvoř serverový receipt podle §23 a použij redirect/303 na `/ziskat-prehled/dekujeme`. Do URL nevkládej PII, raw provider response ani veřejný lead ID.

### 22.9 Chybové stavy

- validation error: inline error + summary, zachovaný obsah,
- provider unavailable: klidná obecná zpráva a alternativní kontakt,
- rate limited: vysvětlení bez obviňování a možnost přímého kontaktu,
- duplicate submit: idempotentně zobraz potvrzení nebo bezpečný stav,
- network interruption: neslibuj přijetí, dokud server nepotvrdí submit.

---

## 23. Thank-you route

Success route nesmí věřit samotné URL. Po úspěšném `LeadSink.submit()` vytvoř krátkodobý server-only receipt:

```ts
interface SubmissionReceipt {
  id: string;
  status: 'accepted';
  intent: SituationId;
  nextStep: OverviewNextStep;
  createdAt: string;
  analyticsClaimedAt?: string;
}

interface SubmissionReceiptStore {
  create(input: Omit<SubmissionReceipt, 'id'>, ttlSeconds: number): Promise<string>;
  read(id: string): Promise<SubmissionReceipt | null>;
  claimAnalytics(id: string): Promise<'claimed' | 'already-claimed' | 'missing'>;
}
```

Do browseru ulož pouze náhodné opaque receipt ID v `Secure; HttpOnly; SameSite=Lax` cookie. Cookie ani URL neobsahuje intent, provider ID nebo PII. Thank-you Server Component receipt ověří. Přímá, sdílená nebo expirovaná návštěva nesmí zobrazit success; přesměruje na formulář nebo zobrazí neutrální fallback.

Route `/ziskat-prehled/dekujeme` s platným receiptem musí:

- potvrdit, že server přijal poptávku,
- zopakovat, co se stane dál,
- uvést realistický čas pouze tehdy, pokud je provozně garantovaný,
- nabídnout bezpečnou cestu zpět,
- zabránit opakovanému submitu při refreshi,
- mít `noindex, nofollow`,
- nebýt v sitemapě,
- používat `no-store`; `noindex` není privacy ani authorization mechanismus.

Refresh může znovu ukázat pravdivé potvrzení v rámci krátkého TTL, ale success analytics se atomicky claimne nejvýše jednou.

Booking copy rozlišuje čtyři stavy:

- `request_received` — poptávka byla serverem přijata,
- `booking_pending` — termín ještě není rezervovaný,
- `booking_confirmed` — provider spolehlivě potvrdil konkrétní rezervaci,
- `booking_unavailable` — booking nelze načíst nebo dokončit; je dostupný přímý fallback.

Nikdy nepoužívej `Termín je potvrzen`, dokud neexistuje ověřený provider callback/webhook. Po pouhém submitu s `choose-date` použij významově přesné sdělení typu `Poptávku jsme přijali, termín ještě není rezervován`.

`BookingPanel` se zobrazí pouze pro platný receipt s `nextStep === 'choose-date'`. Externí kalendář se načte pouze podle schválené provider/consent strategie. Pokud provider potřebuje již zadaný údaj znovu, bezpečně jej předej serverovou integrací nebo nabídni cestu bez redundantního zadávání; respektuj WCAG 3.3.7. Přímý kontakt musí zůstat dostupný.

---

## 24. Server a Client Component hranice

Předpoklad projektu: Next.js App Router, strict TypeScript a SCSS Modules. Ověř skutečný stack před změnou.

### 24.1 Server Components jako default

Serverové mají zůstat:

- route pages,
- statické homepage sekce,
- metadata,
- JSON-LD,
- načtení lokálního obsahu a claims,
- form action a validace,
- thank-you content,
- consent-independent text.

### 24.2 Povolené client islands

- mobilní menu,
- `Disclosure`, pokud nativní varianta nestačí,
- pending UI formuláře,
- consent-aware analytics adapter,
- booking/calendar aktivovaný uživatelem,
- případné video aktivované uživatelem.

Neoznačuj `use client`:

- celou homepage,
- celý template,
- celý form route,
- obsahové sekce,
- metadata nebo structured data.

Klíčový obsah nesmí vznikat až v `useEffect`.

### 24.3 Doporučená organizace

Použij pouze pokud odpovídá repository conventions:

```text
src/app/(public)/layout.tsx
src/app/(public)/page.tsx
src/app/(public)/page.module.scss
src/app/(public)/ziskat-prehled/page.tsx
src/app/(public)/ziskat-prehled/actions.ts
src/app/(public)/ziskat-prehled/dekujeme/page.tsx

src/content/home.ts
src/content/overview-request.ts
src/content/verified-facts.ts
src/content/faq.ts

src/domain/leads/overview-request.schema.ts
src/domain/leads/overview-request.types.ts
src/domain/leads/submit-overview-request.ts
src/domain/leads/lead-sink.ts

src/lib/analytics/events.ts
src/lib/analytics/track.ts
src/lib/routing/overview-query.ts
```

Nevytvářej tuto strukturu mechanicky, pokud projekt používá jiný legitimní convention.

---

## 25. Responsive contract

Homepage a flow musí fungovat od 320 CSS px bez horizontálního scrollu.

### 25.1 Společná pravidla

- preferuj intrinsic layout,
- `Grid`, `Switcher` a `Sidebar` se řídí dostupným prostorem, ne seznamem device names,
- zachovej stejné pořadí DOM,
- nevytvářej desktop a mobile duplicate content,
- reading measure drž přibližně 60–68 znaků,
- používej logical properties,
- rezervuj media rozměry,
- testuj 200% zoom,
- product default pro interaktivní target je nejméně 44 × 44 CSS px,
- text se nesmí překrývat s badge, headerem, focus ringem ani fixed UI.

### 25.2 Modulová pravidla

- Hero: narrow stack, copy před médiem; wide split jen při dostatku prostoru.
- Situations: 1 / 2 / max 4 sloupce podle intrinsic minima.
- Outcome: text před artefaktem v DOM.
- Process: jeden sloupec narrow, tři srovnatelné kroky wide.
- Evidence: karty se nesmí smrštit pod čitelný obsahový minimál.
- Profile: portrét nesmí vytlačit bio pod čitelnou šířku.
- FAQ: vždy jeden reading column.
- Final CTA: cluster se může změnit na stack bez přeházení akcí.
- Form: narrow jeden sloupec; wide nejvýše dva logické sloupce, ne mozaika polí.

Nepřidávej breakpoint pro jediný screenshot. Oprav algoritmus nebo token contract.

---

## 26. Accessibility contract

Cíl: WCAG 2.2 AA.

### 26.1 Povinné minimum

- jeden H1 na route,
- dokument má správné `lang="cs"`,
- správná heading hierarchie,
- `header`, `nav`, `main`, `footer` landmarky,
- funkční `SkipLink`,
- všechny funkce klávesnicí,
- viditelný a neoříznutý `:focus-visible`,
- focus nesmí být zakryt sticky headerem, cookie UI, booking panelem ani jiným fixed obsahem,
- žádný význam pouze barvou,
- textový kontrast alespoň 4.5:1, velký text 3:1,
- UI boundaries a focus indikátory alespoň 3:1 vůči okolí,
- reflow při 320 CSS px,
- obsah při 200% zoomu,
- obsah zůstává použitelný při WCAG text-spacing override,
- dodatečný obsah na hover/focus je dismissible, hoverable a persistent podle WCAG 1.4.13,
- smysluplné accessible names,
- dekorativní ikony `aria-hidden`,
- informativní média s alt nebo textovou alternativou,
- video s titulky a přepisem,
- respektování `prefers-reduced-motion`,
- žádný autoplay audio/video,
- správně propojené labels, hints a errors,
- visible label odpovídá accessible name podle WCAG 2.5.3,
- `ErrorSummary` po submitu dostane focus,
- oznámení výsledku form action bez ztráty kontextu přes vhodné `role="status"`/`aria-live`,
- consent dialog/menu má správný focus management a návrat focusu,
- externí kalendář je sám přístupný, nebo existuje plně ekvivalentní přímá alternativa.

### 26.2 Forms

Required/optional status nesmí být pouze v placeholderu nebo barvě. Chyba musí vysvětlit, jak ji opravit. Nepoužívej `aria-invalid` před tím, než pole skutečně prošlo validací.

- situace, kontakt a next step používají odpovídající `<fieldset>/<legend>`,
- podmínka „e-mail nebo telefon“ má skupinovou chybu i popis,
- použij správné `type`, `inputmode` a `autocomplete="name|email|tel"`,
- placeholder je pouze příklad, nikdy label,
- při předání do kalendáře nevyžaduj znovu údaj, který uživatel právě zadal, pokud to lze bezpečně odstranit nebo předvyplnit.

### 26.3 Motion

Motion je povolen pouze pro orientaci nebo potvrzení stavu. Hover transform nesmí měnit layout. Press state může použít existující motion contract. Při reduced motion musí být význam zachovaný bez animace.

---

## 27. Privacy, consent a compliance

Tato sekce je launch gate, ne volitelný polish.

### 27.1 Legal identity

Nejdřív vytvoř právně schválenou mapu rolí; neslučuj automaticky tyto subjekty:

- `siteOperator` — kdo provozuje web,
- `regulatedServiceProvider` — kdo poskytuje konkrétní regulovanou službu,
- `controller` nebo případní joint controllers — kdo určuje účel a prostředky zpracování,
- `processors` — kteří provideři zpracovávají údaje jménem controllera,
- `representedEntity` — subjekt, ke kterému se váže Davidova profesní role.

Jedna organizace může plnit více rolí, ale musí to vyplývat z ověřeného právního stavu, ne z technické domněnky. Footer, collection notice, privacy text a structured data musí používat stejnou schválenou mapu.

Na webu pak musí být snadno dostupné a přesné:

- identita site operatora,
- identita controllera nebo joint controllers,
- identita regulated service providera,
- jméno nebo firma,
- IČO,
- adresa,
- kontakt,
- profesní role,
- vztah k zastoupenému subjektu,
- dohled/registrace v přesném významu,
- privacy informace,
- cookie preference,
- cesta pro stížnost nebo podnět, pokud je relevantní,
- způsob odměňování a důležitá omezení v rozsahu schváleném compliance.

Compliance musí určit konkrétní stížnostní/ADR cestu a příslušný orgán podle skutečně poskytovaných činností; formulace `pokud je relevantní` nesmí zůstat nevyřešeným produkčním placeholderem.

### 27.2 Form collection notice

DPO/legal musí před spuštěním potvrdit:

- controllera,
- účel zpracování,
- právní základ,
- příjemce,
- dobu uchování,
- práva subjektu údajů,
- případné předávání mimo EHP,
- zda je konkrétní checkbox skutečně požadován.

Nevkládej automaticky povinný obecný „GDPR souhlas“, pokud je právním základem vyřízení poptávky jiný titul. Zobrazení collection notice není uživatelský souhlas ani povinné potvrzení přečtení. Je-li potřeba evidovat použitou informaci, server uloží `privacyNoticeVersion` jako technická metadata submitu, ne boolean checkbox uživatele. Marketingový souhlas musí být samostatný, nepředzaškrtnutý a nesmí být podmínkou odeslání poptávky.

### 27.3 Data minimization

- sbírej pouze data nutná k domluvenému dalšímu kroku,
- neposílej obsah formuláře do analytics nebo error trackingu,
- neloguj form payload, message, kontakt ani raw URL query; případná nutná bezpečnostní metadata, například IP, musí mít doložený účel, omezený přístup a krátkou retention,
- nastav retention a deletion proces,
- zkontroluj přístupová práva lead provideru,
- test data nesmí obsahovat reálné klientské údaje.

### 27.4 Cookie consent

Před volbou nesmí odcházet žádný non-essential request.

První vrstva preference UI musí nabídnout stejně snadno:

- pouze nezbytné / odmítnout non-essential,
- nastavit preference,
- přijmout analytiku.

Accept a reject musí mít srovnatelnou vizuální váhu a ergonomii. Jde o interní etický standard minimalizující nátlak; platnost souhlasu se stále posuzuje v celém kontextu. Žádné předaktivované volitelné kategorie. Eviduj verzi preference textu a volbu způsobem schváleným DPO. Uživatel může preference stejně snadno později změnit nebo odvolat. Audit musí kontrolovat cookies, local/session storage i síťové requesty.

### 27.5 Externí služby

Kalendář, video, chat nebo jiný embed:

- nenačítej automaticky na první render,
- zobraz providera a účel,
- popiš privacy dopad,
- rozliš technicky nutnou službu aktivovanou na žádost, nepovinné cookies/tracking a předání osobních údajů providerovi,
- aktivuj pouze krokem a právním/consent mechanismem schváleným pro konkrétního providera; kliknutí samo o sobě není univerzální souhlas,
- vždy nabídni funkční alternativu bez embedu.

Pro každý provider zdokumentuj právní titul, collection notice, zpracovatelský vztah/DPA, případné předání mimo EHP a použitý transfer mechanismus, retention a reálný network/storage test.

### 27.6 Etické konverzní pravidlo

Zakázáno:

- countdown,
- fake scarcity,
- exit-intent overlay,
- strachové copy,
- předvybrané situační odpovědi bez kontextu,
- falešné ověřovací badge,
- falešné reference,
- gating základního obsahu souhlasem s analytikou,
- opt-out schovaný v textovém odkazu při výrazném accept buttonu.

---

## 28. SEO a structured data

### 28.1 Homepage metadata

- unikátní `<title>`,
- meta description odpovídající viditelnému obsahu,
- self-referencing canonical,
- Open Graph a Twitter metadata,
- sdílecí obrázek s rezervovaným a validním assetem,
- jeden H1,
- interní odkazy na canonical route,
- žádné keyword stuffing.

### 28.2 Structured data

Generuj pouze entity a vlastnosti, které jsou:

- pravdivé,
- viditelné nebo jasně doložené,
- konzistentní s claims registry,
- podporované aktuální dokumentací vyhledávače.

`Person` a případný vztah k organizaci musí odpovídat skutečnosti. Nepoužívej `FinancialService` nebo jiný typ jen proto, že zní marketingově vhodně. FAQ structured data nepřidávej automaticky; nejdřív ověř aktuální podporu, eligibility a přínos.

Thank-you route:

- `noindex, nofollow`,
- bez canonical na homepage,
- mimo sitemapu.

### 28.3 Obsah a indexace

Klíčové copy musí být v serverovém HTML. Nevkládej nadpisy, trust facts ani FAQ až po hydraci.

---

## 29. Analytics contract

Použij vendor-neutral adapter. UI komponenty neimportují SDK analytického provideru.

### 29.1 Povolené eventy

```ts
type AnalyticsEvent =
  | { name: 'home_primary_cta_click'; placement: 'header' | 'hero' | 'final' }
  | { name: 'home_situation_select'; intent?: SituationId }
  | { name: 'lead_flow_start'; source: OverviewSource; intent?: SituationId }
  | { name: 'lead_flow_submit_attempt'; source: OverviewSource }
  | { name: 'lead_flow_validation_error'; fieldIds: string[]; errorCount: number }
  | {
      name: 'lead_flow_submit_success';
      source: OverviewSource;
      intent?: SituationId;
      nextStep: OverviewNextStep;
    }
  | { name: 'booking_start'; source: 'thank-you' }
  | { name: 'booking_complete'; source: 'thank-you' };
```

### 29.2 Event pravidla

- `lead_flow_start` znamená první vědomou interakci s formulářem, ne pageview nebo hydrataci,
- `lead_flow_submit_success` odešli až po potvrzeném serverovém přijetí a atomicky jej deduplikuj přes submission receipt,
- `booking_complete` pouze po spolehlivém callbacku/provider confirmation,
- neduplikuj event při reloadu nebo hydraci,
- eventy před analytics consentem neodesílej,
- consent denial nesmí rozbít flow,
- do eventu nikdy neposílej jméno, e-mail, telefon, message, full URL query, validation text ani provider response,
- automatický pageview musí odstranit query string,
- source, field IDs, intent a nextStep vždy mapuj přes allowlist,
- `src` z URL je pouze nedůvěryhodný hint a nesmí se vydávat za spolehlivou attribution hodnotu.

Situační intent může představovat citlivý finanční kontext. Výchozí `analyticsIntentDimension` je `disabled`. Jeho odesílání zapni pouze pro schválenou first-party agregovanou analytiku po zdokumentování účelu, právního titulu/consentu, identifikátorů a retention. Nevytvářej advertising audiences, remarketing, cross-site identifikaci ani profil uživatele podle těchto voleb.

### 29.3 Vyhodnocení

Primární provozní počet accepted leads odvozuj agregovaně z `LeadSink`/lead systému, nikoliv z consented web analytics. Odmítnutí analytiky proto nezkreslí business count a nesmí se obcházet skrytým server-side trackingem. Web analytics slouží pouze k consented funnel poměrům a UX diagnostice.

První release stanoví baseline. Segmentuj jen podle schválených dimensions a neprováděj finanční profilování uživatele z homepage interakcí.

---

## 30. Performance contract

Cíl pro reálné uživatele na 75. percentilu:

- LCP ≤ 2.5 s,
- INP ≤ 200 ms,
- CLS ≤ 0.1.

U první verze ještě nemusí existovat dostatečná field data. Pre-launch gate proto používá opakovatelný lab test pro LCP/CLS a INP proxy; field CWV se vyhodnotí až po dostatečném provozu a odděleně pro mobile/desktop.

### 30.1 Implementační pravidla

- preferuj statický/serverový homepage render,
- hero specimen řeš HTML/CSS, pokud nemusí být raster,
- nejvýše jeden priority image na route,
- ostatní média lazy-load,
- používej optimalizaci obrázků a responsive `sizes`,
- vždy rezervuj width/height nebo aspect ratio,
- fonty self-host nebo načítej přes schválený mechanismus bez layout shiftu,
- omez client JavaScript,
- žádný carousel,
- žádné autoplay video,
- žádný externí embed v initial renderu,
- analytics nesmí blokovat render,
- SCSS Modules nesmí duplikovat celý token systém.

### 30.2 Performance budget gate

Phase 0 uloží výchozí production bundle baseline a explicitní `maxHomepageClientJsKb` nebo maximální route-specific JS delta schválenou pro tento projekt. Před merge porovnej production build, JS payload a Lighthouse/Web Vitals diagnostiku s výchozím stavem. Regresi vysvětli a oprav; neschovávej ji pouze zvýšením budgetu.

---

## 31. Implementation phases

### Phase 0 — Audit a unresolved decisions

1. zmapuj route tree a canonical URL,
2. zmapuj existující components/patterns/templates,
3. ověř token a surface contract,
4. ověř reálné business facts,
5. rozhodni přesný fulfillment CTA `Získat přehled`,
6. získej schválené znění odměňování,
7. získej schválené privacy texty,
8. vyber skutečnou případovou ukázku/reference,
9. rozhodni lead provider a booking provider,
10. rozhodni `overviewIndexable`,
11. schval mapu právních/profesních/datových rolí,
12. proveď smluvní/privacy audit všech providerů,
13. ulož production bundle baseline a explicitní client JS budget,
14. vytvoř seznam konfliktů a chybějících podkladů.

V této fázi nevymýšlej náhradní tvrzení.

### Phase 1 — Data a route foundation

1. vytvoř typed homepage content,
2. vytvoř claims registry,
3. vytvoř route map/allowlist,
4. přidej build-time validaci obsahu,
5. připrav `/`, `/ziskat-prehled` a thank-you route,
6. nastav metadata a indexation contract.

### Phase 2 — SSR homepage

1. implementuj `HomeTemplate`,
2. slož osm povinných modulů,
3. použij pouze existující components/layouts,
4. zapoj canonical links,
5. implementuj surfaces a responsive behavior,
6. ověř serverové HTML bez JavaScriptu.

### Phase 3 — Lead flow

1. implementuj accessible server form,
2. přidej schema a server validation,
3. implementuj `LeadSink` boundary,
4. implementuj sdílené `IdempotencyStore` a `RateLimitStore`,
5. přidej přístupný honeypot a request-security contract,
6. implementuj error summary a failure fallback,
7. implementuj `SubmissionReceiptStore`, PRG/303 a pravdivou thank-you route,
8. ověř flow bez JavaScriptu.

### Phase 4 — Trust, privacy a integrations

1. napoj ověřená fakta,
2. vlož schválený remuneration text,
3. vlož schválené privacy informace,
4. implementuj consent preferences,
5. připoj lead provider přes adapter,
6. připoj booking pouze jako user-activated island,
7. napoj provider DPA/transfer/retention contract na reálnou implementaci,
8. ověř nulové non-essential requesty i storage writes před souhlasem.

### Phase 5 — Measurement a SEO

1. zapoj vendor-neutral events,
2. ověř neduplikované eventy,
3. ověř no-PII payload,
4. přidej pravdivá structured data,
5. ověř sitemap, robots a canonical,
6. nastav baseline metrics.

### Phase 6 — Polish a verification

1. narrow/medium/wide visual QA,
2. 320 px a 200% zoom,
3. keyboard a screen reader pass,
4. reduced motion,
5. Core Web Vitals/performance,
6. provider failure a retry,
7. legal/compliance/DPO sign-off,
8. označení komponent a route maturity pravdivým stavem.

---

## 32. Test matrix

### 32.1 Unit a data tests

- právě čtyři situační IDs,
- právě tři process steps,
- 5–7 FAQ,
- CTA label/destination contract,
- character limits,
- claim expiry/status,
- expirovaný claim nevznikne v public DTO ani production deployi,
- route/query allowlists,
- form normalization a schema,
- analytics event allowlists,
- no-PII event serializer.

### 32.2 Component a behavior tests

- SiteHeader keyboard/focus behavior,
- situation cards jsou skutečné linky,
- CTA routes,
- Disclosure keyboard behavior,
- ErrorSummary focus a links,
- form values po chybě,
- pending/double submit,
- CookieConsent accept/reject/preferences,
- external embed activation.

### 32.3 Integration tests

- validní submit → LeadSink → 303 → thank-you,
- invalidní submit bez provider call,
- honeypot a cross-origin submit bez provider call,
- provider failure → fallback bez falešného success,
- idempotent duplicate submit,
- ambiguous provider timeout a bezpečný retry bez druhého leadu,
- rate limit,
- safe preselection query,
- unknown query ignored,
- analytics success až po server confirmation,
- automatic pageview bez query stringu,
- `src` z query není považováno za důvěryhodnou attribution,
- žádná PII v log/event/URL.

### 32.4 E2E scénáře

1. návštěvník z hero dokončí kontakt,
2. návštěvník vybere každou ze čtyř situací,
3. flow funguje bez JavaScriptu,
4. flow funguje pouze s klávesnicí,
5. člověk opraví více chyb přes ErrorSummary,
6. člověk odmítne analytics a přesto dokončí flow,
7. kalendář není načten před aktivací,
8. provider selže a uživatel dostane alternativní kontakt,
9. refresh thank-you stránky znovu neodesílá lead,
10. přímá nebo expirovaná návštěva thank-you route neukáže success,
11. `choose-date` po submitu ukáže booking pending, ne potvrzený termín,
12. booking confirmed vznikne pouze po ověřeném provider callbacku.

### 32.5 Visual a accessibility tests

- 320, 375, 768, 1024 a wide viewport,
- 200% zoom,
- dark/light/action surface variants,
- high text scaling,
- long Czech strings,
- focus-visible na všech prvcích,
- axe bez závažných chyb,
- manuální screen reader kontrola hlavních routes,
- kontrast podle finálních resolved barev, ne pouze token názvů.

### 32.6 Performance a SEO tests

- production build,
- LCP/INP/CLS diagnostika,
- žádný unexpected layout shift,
- minimální client JS,
- klíčový obsah v HTML,
- canonical a metadata,
- structured data validation,
- thank-you `noindex` a mimo sitemapu,
- žádné non-essential network requesty před consentem,
- žádný remote poster, `preconnect` ani `dns-prefetch` k video/calendar provideru před aktivací,
- explicitní route-specific client JS budget je splněn.

---

## 33. Launch blockers

Homepage nesmí být označená jako `live`, dokud nejsou uzavřené tyto body:

- [ ] Je přesně definováno, co uživatel po CTA `Získat přehled` skutečně dostane.
- [ ] `OverviewOfferContract` je schválený, aktuální a používají jej všechny tři route.
- [ ] Jsou rozhodnuté canonical route profilu a článků.
- [ ] Všechny trust, service-scope, process a deliverable claims mají source, owner, approval a review date.
- [ ] Je vyřešen konflikt délky praxe.
- [ ] Profesní role a vztah k SAB/registru ČNB jsou přesné a aktuální.
- [ ] Remuneration copy schválila odpovědná compliance osoba.
- [ ] Každá reference má doložený souhlas a původní text.
- [ ] DPO/legal schválil collection notice, právní základ a retention.
- [ ] Je schválená mapa site operator / regulated service provider / controller(s) / processors / represented entity.
- [ ] Consent UI neodesílá non-essential request před volbou.
- [ ] Lead provider je izolovaný a má bezpečný failure fallback.
- [ ] LeadSink, kalendář, video a analytika mají smluvní/privacy audit, DPA a případný transfer mechanismus.
- [ ] Retention, deletion a DSAR proces jsou popsané a otestované.
- [ ] Právník posoudil působnost zákona č. 424/2023 Sb. a případné výjimky; cíl WCAG 2.2 AA tím není snížen.
- [ ] Formulář nesbírá zbytečné nebo citlivé údaje.
- [ ] Accessibility prošla automatickým i manuálním testem.
- [ ] Klíčové Core Web Vitals splňují budget nebo mají ověřený reálný field plan.
- [ ] Structured data odpovídají viditelnému a ověřenému obsahu.

Codex může před uzavřením blockerů postavit strukturu s pravdivě označeným interním stavem. Nesmí však doplnit fiktivní produkční copy ani tvrdit, že je route launch-ready.

---

## 34. Definition of Done

### Architecture

- [ ] Homepage používá `HomeTemplate`, osm povinných modulů a nejvýše jeden podmíněný insights modul.
- [ ] Nevznikl paralelní landing component/token systém.
- [ ] Key content je server-rendered.
- [ ] Client Components jsou pouze malé interaktivní islands.
- [ ] Obsah a claims mají typed source of truth.

### Conversion

- [ ] Všechna primary CTA používají label `Získat přehled`.
- [ ] CTA vede do funkčního a pravdivě popsaného flow.
- [ ] Čtyři situační linky bezpečně předvyplní allowlistovaný intent.
- [ ] Flow funguje s JavaScriptem i bez něj.
- [ ] Success existuje až po potvrzení serveru/provideru.
- [ ] Přímá návštěva thank-you route nikdy neukáže falešný success.
- [ ] Booking pending a booking confirmed jsou významově i technicky oddělené.

### Trust a content

- [ ] Není použit neověřený claim.
- [ ] Není použit badge `Ověřeno ČNB`.
- [ ] Role, vztahy, kontakt a legal identity jsou přesné.
- [ ] Odměňování je viditelné a schválené.
- [ ] Reference jsou skutečné a consented.
- [ ] Chybějící optional content se nevykresluje jako placeholder.

### Accessibility

- [ ] Routes mají správné landmarky a heading hierarchy.
- [ ] Keyboard, focus, reflow, zoom a errors jsou ověřené.
- [ ] Kontrast je změřený z resolved barev.
- [ ] External media mají alternativu, titulky/přepis podle typu.

### Privacy a security

- [ ] Form sbírá minimum dat.
- [ ] PII není v URL, analytics ani veřejných logách.
- [ ] Server validation, idempotency, rate limit a honeypot fungují.
- [ ] Cookie preference je rovnocenná a snadno odvolatelná.
- [ ] External providers se nenačítají před povoleným krokem.
- [ ] Finanční intent není použit pro advertising audience, remarketing ani cross-site profilování.

### Responsive a performance

- [ ] Bez horizontálního overflow od 320 CSS px.
- [ ] Stejné logické pořadí DOM na všech widths.
- [ ] Media mají rezervovaný prostor.
- [ ] Žádný autoplay, carousel nebo initial third-party embed.
- [ ] Performance budget je ověřen production buildem.

### SEO a measurement

- [ ] Metadata, canonical, sitemap a robots jsou správně.
- [ ] Structured data jsou pravdivá a validní.
- [ ] Analytics jsou consent-aware, deduplikované a bez PII.
- [ ] Primární a guardrail metrics mají popsanou baseline.

---

## 35. Deferred / mimo scope první implementace

Do první homepage verze nepatří:

- AI chat nebo finanční doporučení generované v hero,
- personalizace podle neveřejného profilu,
- vícekrokový finanční onboarding,
- upload dokumentů,
- klientský portál,
- produktové kalkulačky,
- realtime sazby nebo výnosy,
- produktový katalog,
- carousel referencí,
- experiment framework bez baseline,
- marketing automation založená na citlivém profilování,
- nový CMS jen kvůli homepage,
- nový design system.

Tyto oblasti vyžadují samostatný produktový, bezpečnostní, regulatorní a datový blueprint.

---

## 36. Výstup požadovaný od Codexu

Po implementaci vrať:

1. stručné shrnutí výsledku,
2. seznam změněných a nových souborů,
3. mapu modul → component/pattern/layout,
4. popis route a form flow,
5. seznam znovupoužitých kontraktů,
6. zdůvodnění každé nové veřejné komponenty, pokud nějaká vznikla,
7. seznam unresolved content/compliance bodů,
8. testy a jejich výsledky,
9. production build výsledek,
10. accessibility a responsive ověření,
11. performance diagnostiku,
12. network/consent audit,
13. SEO/structured data audit,
14. potvrzení, že analytics ani logy neobsahují PII,
15. screenshoty narrow, medium a wide pouze jako doklad, ne jako náhradu testů.

Codex nesmí tvrdit `hotovo`, pokud pouze vykreslil vizuální specimen bez funkčního serverového flow, ověřených claims a launch gate.

---

## 37. Referenční zdroje

Použij jako principy a ověřuj jejich aktuální znění při implementaci:

- existující projektový component/layout blueprint,
- WCAG 2.2: <https://www.w3.org/TR/WCAG22/>,
- ČNB — Desatero spotřebitele: <https://www.cnb.cz/cs/dohled-financni-trh/ochrana-spotrebitele/desatero-spotrebitele/>,
- ČNB — seznamy regulovaných a registrovaných subjektů: <https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB07.INTRO_PAGE?p_lang=cz>,
- European Commission — informace při sběru osobních údajů: <https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/what-information-must-be-given-individuals-whose-data-collected_en>,
- European Commission — data minimisation: <https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/how-much-data-can-be-collected_en>,
- EDPB — cookie banner taskforce report: <https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf>,
- European Commission — Unfair Commercial Practices Directive: <https://commission.europa.eu/law/law-topic/consumer-protection-law/unfair-commercial-practices-and-price-indication/unfair-commercial-practices-directive_en>,
- GOV.UK Service Manual — user needs: <https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs>,
- Google Search — structured data introduction: <https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data>,
- Web Vitals: <https://web.dev/articles/vitals>,
- Next.js — Forms with Server Actions: <https://nextjs.org/docs/app/guides/forms>,
- Next.js — `redirect`: <https://nextjs.org/docs/app/api-reference/functions/redirect>,
- Next.js — `serverActions` security/configuration: <https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions>.

Zdroje nejsou náhradou za konkrétní české právní a regulatorní schválení projektu.

---

## 38. Finální instrukce

Implementuj homepage jako klidný rozhodovací systém:

```text
jedna jasná hodnota
  + čtyři rozpoznatelné situace
  + konkrétní výsledek
  + transparentní postup a odměňování
  + ověřitelná důvěra
  + jeden bezpečný další krok
```

Začni auditem skutečného repozitáře a unresolved launch blockers. Potom implementuj po fázích. Nevytvářej paralelní komponenty, nehardcoduj neověřená tvrzení, nesbírej zbytečná data a nepoužívej dark patterns.

Homepage je hotová teprve tehdy, když je současně:

- srozumitelná,
- pravdivá,
- přístupná,
- responzivní,
- výkonná,
- měřitelná,
- regulatorně obhajitelná,
- a její primární CTA vede do skutečně funkčního dalšího kroku.
