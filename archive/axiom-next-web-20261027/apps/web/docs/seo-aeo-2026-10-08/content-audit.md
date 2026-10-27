# Obsah, sémantika a AEO — audit zdrojového kódu 8. 10. 2026

Rozsah: všechny veřejné indexovatelné routy (11 statických/archivních + 12 článků), veřejné konverzní routy, související renderer a komponenty navigace. Primárním podkladem jsou routy v `app/`, `app/content`, `content/blog/*.article.json`, jejich veřejná projekce a publikovaný runtime provider. Výsledky skutečného HTML a produkčního nasazení dokládá nadřazený report; tento dokument neoznačuje lokální test za produkční důkaz.

## Závěr a hranice důkazů

Obsah už má nadprůměrně dobrý základ pro extrakci odpovědí: 12 autorských článků tvoří 84 pojmenovaných sekcí, 9 definic, 33 checklistů, 15 srovnání, 14 rozhodovacích bloků, 11 postupů, 6 strukturovaných případů a 2 finanční srovnání. Další případy jsou běžným textem, takže šest není počet všech příkladů z praxe. Většina článků rozlišuje obecný princip, individuální rozhodnutí a konkrétní příklad. Přepisovat vše na FAQ nebo přidávat opakované krátké odpovědi by zde snižovalo redakční kvalitu.

Publikovaný web v produkčním režimu čte schválenou kolekci z Control API. Repo JSON není přímý produkční zdroj: `lib/article-source.ts` vyžaduje v produkci explicitní `published`, `lib/article-content.server.ts` načítá runtime provider. Všech 12 pracovních JSON má interní `publication.status=review`, 38 položek ověření není označeno verified. Tyto interní stavy se z veřejné projekce záměrně odstraňují; samy o sobě neprokazují, že právě produkční publikovaná revize nemá schválení. Jsou důkazem redakčního dluhu pracovních podkladů, nikoli důvodem automaticky skrýt články nebo změnit jejich indexaci. Stav odborného ověření jsem nepřepisoval.

Čtyři pracovní články mají datum publikace/aktualizace, osm nemá doložené datum. Čas buildu ani mtime není náhradou data změny obsahu. Metadata agent řeší toto pravidlo společně v sitemap a JSON-LD.

## Potvrzené implementační nálezy a změny

1. Homepage FAQ mělo otázky pouze uvnitř tlačítkových spanů. Odpovědi již byly v serverovém HTML i u zavřených panelů. Přidán sémantický H3 kolem existujícího tlačítka a reset jeho fontu/marginu. Výsledkem je H2 sekce → H3 otázka → navázaný panel/odpověď. Design, přepínání, kurzorové a animační datové atributy zůstávají stejné.
2. Sdílený renderer srovnávacích karet vždy psal H4 i při absenci volitelného titulku bloku. Opraven na H3 bez titulku, H4 s H3 titulkem; CSS přesně přebírá původní styl. Je to chyba podporovaného datového tvaru, nikoli tvrzení, že všech 12 aktuálních článků tento nevyplněný titulek má (pracovní kolekce ho má vyplněný).
3. Sdílený MarketingPageShell měl `main#main-content` bez možnosti programového focusu. Doplněno `tabIndex=-1`. U právních informací chybělo i ID cíle existujícího skip-linku; opravu této routy předal tento audit vlastníkovi metadat.
4. `/osvedceni-a-certifikace/` nemělo ve veřejném webu příchozí interní odkaz: patička směřovala na část profilu. Existující text „Odborná osvědčení“ nyní směřuje přímo do odpovídajícího přehledu dokumentů.
5. `/refixace-hypoteky/` bylo dostupné v sitemap, ale v běžné veřejné navigaci bez příchozího odkazu. Do stávajícího sloupce patičky „Obsah a další krok“ přidán textový odkaz „Refixace hypotéky“. Sloupec má nyní tři řádky; sousední již měl čtyři. Stávající konverzní CTA ani jeho měření nejsou přesměrovány.
6. Čas čtení karet homepage pocházel z ručně psané kopie (10/9/9 minut), ačkoli autorská metadata příslušných článků v pracovní kolekci uvádějí 5/5/6. Předána oprava precedence na `article.readingTime` vlastníkovi `app/page.tsx`; skutečná hodnota pak vychází z kolekce, která stránku napájí.
7. Autor článku už byl v hero prolinkován s `/kdo-jsem/`. Vlastník metadat doplňuje `rel=author`. Záměrně zachován stávající autorský panel s jednou závěrečnou CTA; jeho identita podle existujícího regresního kontraktu nemá další odkaz.

## Inventář nečlánkových rout

| Routa | Záměr a současná strojová čitelnost | Další příležitost / závěr |
|---|---|---|
| `/` | Identita, pět životních situací, postup, veřejné ověření oprávnění, doporučené články, čtyři praktické otázky. Text a accordion panely jsou v HTML. | Srozumitelnější SEO title řeší metadata; obsah zachován. FAQ získalo H3. |
| `/sluzby/` | Pět situací, devět skutečných služeb z jednotného katalogu. Všechny popisy a skutečné odkazy jsou již renderovány, zavření panelu není click-fetch. | Největší obsahová mezera: služby mají pouze záznam v katalogu a konverzní formulář, nikoli samostatnou stránku pro výběrový záměr. |
| `/jak-pracuji/` | Pět kroků jako `ol`, H3 s konkrétním výstupem; role klienta a poradce. | Úhrada/odměňování vyžaduje Davidem schválené znění; nevymýšlet bezplatnost nebo honoráře. |
| `/kdo-jsem/` | Autorský profil, přístup, tři praktické odpovědi, veřejný registr ČNB, SAB dokumentace a čtyři odborná PDF. | Vhodný stabilní cíl autorství a identifikace Person. Poetický H1 není sám o sobě chyba; metadata a okolní text dávají kontext. |
| `/osvedceni-a-certifikace/` | ČNB/SAB dokumentace, profesní PDF a vazba na právní informace. H1/H2, skutečné soubory. | Odstraněna osiřelost odkazem z patičky. Interně laděná věta „Soubory níže jsou připojené dokumenty v projektu…“ může při budoucí redakci dostat veřejně přirozené znění; nejde o technickou překážku. |
| `/reference/` | Ve výchozím SSR je seznam recenzí s citacemi, autory a původními odkazy; filtrování funguje nad předanými daty. | Plný text vybrané delší recenze se do dialogu doplní po interakci, SSR má výtah. To není skrytí hlavního obsahu; kompletní strojově dostupné dlouhé recenze by potřebovaly UX návrh progresivního rozšíření. Žádné vymyšlené hodnocení nebo self-serving Review markup. |
| `/clanky/` | Všechny články v nefitrovaném SSR, skutečné `a href`, vlastní kategorie. Parametrické varianty mají jeden archivní canonical. | Rozvíjet shluky přes tematické stránky služeb, ne generovat indexované kombinace filtrů. |
| `/refixace-hypoteky/` | Existující tematická konverzní stránka, časová diagnostika, tři možnosti a šest otázek v nativním `details`. | Zachovat rozlišení vůči vysvětlujícímu článku konec-fixace. Nový odkaz v patičce zlepšuje objevení. Nevytvářet druhou identickou landing page. |
| `/pravni-informace/` | Identifikace osoby/firmy, oprávnění a původní dokumentace, obecná povaha textů. | Opraven cíl skip navigace. Právní obsah nebyl svévolně měněn. |
| `/zasady-zpracovani-osobnich-udaju/` | Číslované části, správce/kontakt, účely a práva v serverovém textu. | Legitimní důvěryhodnost a kontext; nenahrazuje důkaz skutečného provozního chování. |
| `/cookies-a-mereni/` | Samostatná vysvětlení úložišť, volitelné analytiky a změny souhlasu v HTML. | Funkční nastavení cookies a události ponechány, ověří regresní browser cesta. |
| `/ziskat-prehled/`, `/ziskat-prehled/dekujeme/` | Konverzní utility, záměrný noindex; potvrzení vázané na serverový receipt. | Nevkládat do sitemap ani neodstraňovat noindex kvůli historickému GSC součtu. Telefon/e-mail workflow zachován. |
| `/funnels/mortgage-income-drop-check/`, `/runtime/...`, `/design-language/...`, `/e2e-funnel-canonical/` | Nástroj/runtime/preview či interní testovací povrchy; nejsou obsahové landing pages. | Ochranu indexace/404 zajišťuje routovací audit nadřazeného agenta. |
| `/blog/`, `/blog/[slug]/` | Legacy aliasy k článkům. | Řešit přesměrováním; neduplikovat obsah. |

## Inventář všech 12 článků

Níže uvedené počty a data pocházejí z pracovních zdrojových JSON, nikoli z tvrzení o právě publikovaném snapshotu. `pending` je počet interních ověřovacích položek, které nejsou verified.

| Slug | Hlavní vyhledávací záměr | Sekcí | Datum publikace / změny | Pending |
|---|---|---:|---|---:|
| `banka-vam-pujci-vic-nez-si-muzete-dovolit` | Únosná splátka proti schválené nabídce banky; rozpočet a scénáře | 6 | nedoloženo / nedoloženo | 3 |
| `cestovko-zdarma-od-karty-vas-nemusi-zachranit` | Kdy stačí pojištění ke kartě; osoby, aktivace, limity a cesta | 10 | nedoloženo / nedoloženo | 8 |
| `chcete-investovat-zacnete-planem` | Jak začít investovat podle cíle, horizontu, rizika a nákladů | 6 | 2026-06-22 / 2026-08-12 | 1 |
| `kolik-ma-mit-domacnost-v-rezerve` | Výpočet rezervy z nezbytných výdajů a zranitelnosti domácnosti | 10 | nedoloženo / nedoloženo | 1 |
| `konec-fixace-hypoteky` | Co porovnat při konci fixace; splátka, sazba, splatnost a rezerva | 8 | 2026-06-25 / 2026-08-12 | 2 |
| `mate-financni-produkty-ale-mate-skutecne-financni-plan` | Rozdíl mezi sadou smluv a souvislým finančním plánem | 6 | nedoloženo / nedoloženo | 0 |
| `mate-pojisteni-prijmu-nebo-jen-pocit` | Zda krytí řeší skutečný výpadek příjmu a rozpočet domácnosti | 6 | 2026-06-23 / 2026-08-12 | 2 |
| `penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku` | Rozdělení peněz podle účelu a termínu, ne další produkt | 7 | nedoloženo / nedoloženo | 3 |
| `planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou` | Jak předem ověřit pojistné možnosti a rodinný rozpočet | 7 | nedoloženo / nedoloženo | 8 |
| `v-jakem-poradi-resit-osobni-finance` | Pořadí priorit a souběžných kroků při omezeném rozpočtu | 6 | nedoloženo / nedoloženo | 1 |
| `zdrazilo-vam-pojisteni` | Jak porovnat cenu a krytí při výročí pojistné smlouvy | 5 | 2026-06-24 / 2026-08-12 | 3 |
| `urokova-sazba-neni-cena-hypoteky` | Sazba, RPSN, měsíční platba a náklady za stejné období | 7 | nedoloženo / nedoloženo | 6 |

Články finanční plán / pořadí / rozdělení peněz / investiční začátek se tématem dotýkají, ale odpovídají na odlišné otázky: diagnostika celku, priorita kroků, přiřazení peněz cílům a teprve výběr investic. Nejsou doloženy identické obsahové duplicity, které by ospravedlňovaly slučování nebo canonical na jiný článek. Hypoteční trojice se obdobně rozlišuje na únosnost, celkovou cenu a změnu fixace.

Každý z 34 autorských vztahů relatedTopics se v současné pracovní kolekci podařilo jednoznačně přiřadit k existujícímu jinému článku; 25 je již výslovně slugem, 9 se ještě odvozuje z názvu. Runtime prioritizuje autorské vztahy a doplňuje příbuznou kategorii, renderer zobrazuje nejvýše tři odkazy. Budoucí editace mají doplnit stabilní slug u devíti zbývajících vztahů, protože odkaz odvozený z titulku může po jeho redakci zmizet. Aktuální rozbitý odkaz se tím nepotvrdil.

Průběžné vnitřní odstavce dnes bývají čisté řetězce bez odkazů; propojení tvoří navigace, článková mapa a autorské navazující čtení. Do každé věty nevkládat automatické klíčové odkazy. Přirozené odkazy na tematické služby mají smysl až po vytvoření kvalitní cílové stránky. Veřejné odborné zdroje se v pracovních článcích často nacházejí pouze v interní redakční vrstvě. V další obsahové revizi je vhodné u konkrétních právních/produktových/časově citlivých tvrzení přidat viditelný aktuální primární zdroj, případně datum ověření; interní poznámky a klientské podklady se veřejně automaticky nepřeklápějí.

Dlouhé články rezerva (přibližně 4 000 slov v preview) a pojištění ke kartě (4 900 slov) již mají silné sekce, definice a orientační navigaci. Případná další redakce může zkrátit opakování a předsadit již existující rozhodovací závěr ke konkrétní otázce. Neexistuje důvod vkládat strojově generované „AI souhrny“, skrývat duplicitní text nebo vymýšlet jiné odborné závěry.

## Návrh tematických landing pages a obsahové architektury

Následují návrhy, nikoli vytvořené stránky ani tvrzení o garantovaném vyhledávacím objemu. Priorita vychází z existujících služeb, článků a konverzních záměrů. Před vydáním je nutná autorova odborná/redakční kontrola nového textu, doložené datum a publikační workflow.

| Navržená URL | Účel / hlavní otázka | Existující články pro cluster | Co musí nová stránka opravdu přidat |
|---|---|---|---|
| `/sluzby/hypoteky/` | Co společně prověříme před výběrem hypotéky? | únosný rozpočet, cena hypotéky, konec fixace | Rozsah pomoci, vstupní podklady, porovnání podle jednotného období, další postup, skutečný případ se zdrojem a jeho omezeními. Odkaz na existující refixační diagnostiku. |
| `/sluzby/ochrana-prijmu/` | Jak posoudíme dopad výpadku příjmu? | pojištění příjmu, rezerva, plánování rodiny | Co se zjišťuje v rozpočtu a smlouvě, které scénáře jsou individuální, co konzultace dodá; žádný univerzální pojistný násobek nebo příslib plnění. |
| `/sluzby/investice-a-sporeni/` | Jak dát investicím účel a časový rámec? | začít plánem, rozdělení peněz, rezerva | Proces cíle → dostupné prostředky → horizont → únosné riziko → možnosti, transparentně schválené náklady/odměna, žádný slíbený výnos. |
| `/sluzby/financni-plan/` | Co si odnesu z přehledu financí jako celku? | produkty vs plán, pořadí financí, rozdělení peněz | Konkrétní rozsah výstupu a následné kontroly, situace pro tuto službu, anonymizovaný autorem doložený příklad. |
| `/sluzby/pojisteni-majetku/` | Jak zkontrolujeme cenu a rozsah pojistky? | zdražení pojištění; související ochrana rozpočtu | Co má pojištění chránit, které dokumenty porovnáváme, limity/výluky/spoluúčast podle konkrétní smlouvy; nové věcné příklady ověřit. |

Společná kostra zachová aktuální MarketingPageShell, DM Sans, záběr hero i existující CTA: H1 a krátký popis konkrétní služby; H2 „Kdy dává smysl…“ s popisem situací; H2 „Co spolu prověříme“; H2 „Co si připravit“; případ z praxe s omezeními; 3–5 skutečných klientských otázek s přímou odpovědí; autor a ověřitelná oprávnění; odkazy na 2–3 relevantní články; jedno hlavní CTA s dosavadními parametry topic/source. Každá stránka má vlastní záměr, self canonical a odpovídající schema pouze podle viditelného obsahu. Obecné formulace neslouží k domnělému ověřování aktuálních bankovních, pojistných nebo daňových podmínek.

Nezakládat série městských stránek bez unikátních informací o skutečném působení. Nezakládat nové FAQ-only stránky duplikující články. Nepřidávat `llms.txt`, skryté „AI instrukce“ nebo masové schema typy bez doložené potřeby.

## Validace tohoto pracovního balíku

- `pnpm test:articles`: 89/89 testů prošlo. Pokrývají veřejnou projekci, zachování obsahových kontraktů, autorské návaznosti, publikační gate a konverzní/screening kontext.
- `pnpm content:articles:audit`: PASS; 12 článků, 44 interních ověřovacích položek, 27 zachovaných legacy blokujících položek, 12 čistých preview. Nejde o potvrzení odborného uzavření těchto položek.
- Cílený ESLint všech upravených TS/TSX a obou spec i `git diff --check` prošly; celý projektový lint a TypeScript spouští hlavní agent.
- Nový `tests/e2e/seo-semantics.spec.ts`: bez klientského JavaScriptu kontroluje otázky/odpovědi FAQ, všechny popisy služeb, každý článek ze sitemap, kotvy obsahu, autorský odkaz, hierarchii srovnání a focusovatelný skip target všech marketingových rout.
- `tests/e2e/footer.spec.ts` doplněn o konkrétní nové cíle. Stávající test zahrnuje mobil/tablet/desktop a skutečné nastavení cookies.
- Lokální produkční artefakt `http://localhost:3108`: 6/6 testů footer + homepage FAQ motion prošlo (5 v prvním běhu, poslední po opravě načasování měření v testu). Ověřeno přepínání accordionu, zpětný scroll, klávesnice, reduced motion, skutečné nastavení cookies, mobil/tablet/desktop a axe kontrola patičky.
- První běh odhalil nepřesnost stávajícího testu: nav mimo viewport byla při vstupní animaci zmenšená na 0,985, a tak naměřil 39,4 px místo 40 px. CSS výška již byla 40 px. Po scrollu nav dosahuje 40 px; test nyní změří její skutečný interaktivní stav a zachovává původní limit. Cookie test používá skutečný popisek „Jasně, souhlasím“ a respektuje produkční konfiguraci s vypnutým volitelným měřením, která záměrně nemá switch.
- `content-browser/`: osm screenshotů FAQ a patičky v šířkách 390/768/1440/1920 px + `responsive-checks.json`. Vizuálně zkontrolované rozvržení a DM Sans; bez horizontálního přetékání a bez pageerror ve všech čtyřech šířkách.
- Na základě následného výslovného pokynu uživatele se produkční nasazení neprovádí. Důkazy výše jsou lokální. Souhrnný build/metadatový výsledek eviduje hlavní report.

Soubory tohoto balíku: `app/clanky/ArticleEditorialRenderer.tsx`, `app/clanky/articleRenderer.module.css`, `app/_components/homepage/HomeFaqAccordion.client.tsx`, `app/_components/homepage/HomeFaqAccordion.module.css`, `app/components/multipage/MarketingPage.tsx`, `app/content/footer.ts`, `tests/e2e/footer.spec.ts`, `tests/e2e/seo-semantics.spec.ts`.
