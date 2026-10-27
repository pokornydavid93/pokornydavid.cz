# Technické SEO a strukturovaná data — audit zdrojů 2026-10-08

Rozsah: metadata, canonical, sitemap, robots, autorství a JSON-LD v `apps/web`. Produkční nasazení, měření výkonu a browser smoke spravuje hlavní agent; tento dokument sám nepotvrzuje nasazení.

## Potvrzené problémy a provedené opravy

1. **Dvojité jméno v titulku archivu**: `app/clanky/page.tsx` předával již brandovaný string a kořenový layout přidal `%s | David Pokorný`. Archiv nyní předává `Články z praxe`. `createPageMetadata` zároveň používá absolute title, pokud vstup již obsahuje jméno. To chrání i titulky převzaté z editoru.
2. **Nefunkční sociální obrázky**: `lib/seo.ts` a detail článku zpracovávaly URL obrázků stejnou funkcí jako canonical stránek. `/og.jpg` a AVIF obrázky dostávaly koncovou lomítkovou cestu. Nový `getSiteAssetUrl` zachovává souborovou cestu i query a povoluje HTTP(S). OG/Twitter/Article používají stejné skutečné URL. Rozměry 1200×630 platí jen pro ověřený `public/og.jpg`; vlastní AVIF nedostává smyšlené rozměry.
3. **Nevěrohodná čerstvost sitemap**: pevné květnové/červencové datum statických stránek nebylo provázáno s pozdějším obsahem; archiv emitoval `new Date()` při generování. Statické neprokazatelné hodnoty a automatický čas archivu odstraněny. Články používají výhradně `updatedAt ?? date` z obsahového modelu. Archiv dostane maximum pouze tehdy, jsou-li zdrojová data všech jeho článků známá. Chybějící datum je legitimně vynecháno.
4. **Sitemap ignorovala indexační a canonical preference článku**: nyní vyřazuje `seoIndex:false` a články kanonikalizované na jinou URL. Používá tutéž canonical funkci jako metadata i strukturovaná data.
5. **Sitemap nezohledňovala průběžné publikace**: přidána revalidace 60 sekund odpovídající cache kolekce publikovaných článků. Nový článek nebo upravená indexace tak nevyžaduje nový deploy webu kvůli sitemap.
6. **Article robots přepisovaly zděděné limity náhledů**: explicitní `index/follow` nahrazovaly celý nested metadata objekt a články ztrácely `max-image-preview:large`, neomezený snippet a video preview. Nový helper zachovává limity a současně přenáší noindex/nofollow do Googlebot pravidel. Staging stále vždy vyhrává se zákazem indexace.
7. **Oddělené, nepropojené JSON-LD identity**: článek opakoval jméno autora a vydavatele bez `@id`; nyní BlogPosting odkazuje na jedinou osobu `/#person`, stránku `#webpage`, web `/#website` a breadcrumbs `#breadcrumb`. Autor má URL veřejného profilu. WebPage odkazuje zpět na hlavní článek.
8. **Nebezpečné vložení redakčního JSON-LD**: JSON.stringify nechránilo obsah proti ukončení script tagu řetězcem `</script>`. Sdílený serializér escapuje `<` podle Next.js dokumentace; nemění obsah po JSON.parse.
9. **Nenalezený článek generoval metadata archivu**: generateMetadata nyní také volá notFound, namísto titulku nenalezeného článku s canonical archivu.
10. **Homepage titulek byl obecný**: nyní `David Pokorný | Finanční poradce – hypotéky, pojištění a investice`, popis pojmenovává online spolupráci, Olomouc i hlavní služby. Viditelný hero zůstal zachován.
11. **Autor v Open Graph byl prostý text**: article:author nyní odkazuje na skutečný profil; existující odkaz v article hero má `rel=author`.
12. **Právní stránce chyběl cíl skip linku**: existující main má nově `id=main-content` a tabIndex=-1.
13. **Homepage karty měly pevný starý čas čtení**: upřednostňují `article.readingTime` z téhož zdroje, z něhož se vykresluje detail. Fallback redakčního výběru zůstává.
14. **Český font subset**: na doporučení performance agenta přidán latin-ext k preloadu DM Sans. Font family, váhy a design zachovány.

## Potvrzené funkční prvky a správné úmyslné výjimky

- Veřejné kanonické stránky mají metadata přes společný helper; homepage má explicitní absolute title.
- `trailingSlash:true` v Next konfiguraci odpovídá canonical i sitemap.
- Indexace vyžaduje přesný build-time přepínač `NEXT_PUBLIC_SITE_INDEXING=true`; jiné hodnoty jsou záměrně fail-closed. Plošné povolení by bylo regresí stagingové ochrany.
- Produkční robots používá wildcard Allow:/, neblokuje vyhledávací crawlery na veřejném obsahu. Blokuje runtime preview/data a interní funnel. Relevantní boti nepotřebují zvláštní whitelist.
- `/ziskat-prehled/`: záměrně noindex,follow; jde o konverzní formulář. `/ziskat-prehled/dekujeme/`: záměrně noindex,nofollow, serverem ověřený receipt. Obě URL jsou mimo sitemap.
- Stránky `/design-language/**` mají noindex,nofollow. Testovací `/e2e-funnel-canonical/` vrací notFound, pokud není výslovně zapnut harness. Runtime publikace mají vlastní generateMetadata v `@axiom-dp/publication-runtime/page`.
- Původní Article JSON-LD již existovalo: tvrzení, že web neměl strukturovaná data, by bylo nesprávné. Oprava zvyšuje konzistenci, vazby a bezpečnost.
- `lang=cs` a `inLanguage=cs-CZ` odpovídají obsahu. Dokument nepřidává spekulativní AI metadata nebo llms.txt.
- Absence lastmod u článků bez doloženého publikování sama o sobě není technická chyba. V repozitáři je 12 článků: 4 s publikací a aktualizací, 8 bez dat. Nesmíme je odhadovat z času souboru/deploye ani automaticky označit za aktualizované dneškem.
- Statický obsah je výrazně dirty a Git historie není dostatečným dokladem aktuálních obsahových revizí. Odstranění nepravdivého údaje je přesnější než nahrazení dnešním datem.

## Volba strukturovaných typů

- **Person**: David Pokorný, ověřitelné kontakty již viditelné ve footeru, veřejný profil a `sameAs` odkaz na stejný konkrétní záznam ČNB, který je na webu viditelně odkazován. JobTitle vychází z viditelného autorství a profilu.
- **WebSite**: jediná identita webu, český jazyk, vydavatel odkazem na osobu.
- **WebPage**: homepage a každý článek, propojení s hlavní entitou a webem.
- **BlogPosting**: konkrétnější podtyp Article pro redakční články; data a headline z téhož obsahového modelu jako viditelné HTML.
- **BreadcrumbList**: skutečná hierarchie Články → konkrétní článek. Neexistující indexovatelná kategoriální stránka nebyla vymyšlena.
- **Organization / FinancialService / LocalBusiness** nejsou přidány: web prezentuje konkrétního poradce; nevytváříme druhou podnikatelskou entitu, provozovnu nebo smyšlené recenze. Toto odpovídá i existujícím regresním testům homepage.
- **FAQPage** není přidáno automaticky: viditelné FAQ je sémantické HTML, schéma nemá slibovat rich result bez splnění příslušných podmínek.

## Inventář indexovatelných rout

Statické: `/`, `/jak-pracuji/`, `/kdo-jsem/`, `/osvedceni-a-certifikace/`, `/sluzby/`, `/reference/`, `/refixace-hypoteky/`, `/pravni-informace/`, `/zasady-zpracovani-osobnich-udaju/`, `/cookies-a-mereni/`.

Archiv: `/clanky/`. Dynamické detaily vycházejí ze skutečné article collection. Při současných 12 veřejných článcích zůstává sitemap 23 URL. Kompletní 39 route patterns včetně interních a redirect rout jsou v `route-source-inventory.json`.

| Článek | Zdrojová publikace | Zdrojová aktualizace |
| --- | --- | --- |
| `/clanky/banka-vam-pujci-vic-nez-si-muzete-dovolit/` | nedoloženo | nedoloženo |
| `/clanky/cestovko-zdarma-od-karty-vas-nemusi-zachranit/` | nedoloženo | nedoloženo |
| `/clanky/chcete-investovat-zacnete-planem/` | 2026-06-22 | 2026-08-12 |
| `/clanky/kolik-ma-mit-domacnost-v-rezerve/` | nedoloženo | nedoloženo |
| `/clanky/konec-fixace-hypoteky/` | 2026-06-25 | 2026-08-12 |
| `/clanky/mate-financni-produkty-ale-mate-skutecne-financni-plan/` | nedoloženo | nedoloženo |
| `/clanky/mate-pojisteni-prijmu-nebo-jen-pocit/` | 2026-06-23 | 2026-08-12 |
| `/clanky/penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku/` | nedoloženo | nedoloženo |
| `/clanky/planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou/` | nedoloženo | nedoloženo |
| `/clanky/v-jakem-poradi-resit-osobni-finance/` | nedoloženo | nedoloženo |
| `/clanky/zdrazilo-vam-pojisteni/` | 2026-06-24 | 2026-08-12 |
| `/clanky/urokova-sazba-neni-cena-hypoteky/` | nedoloženo | nedoloženo |

## Změněné soubory této části

- `lib/seo.ts`: metadata, canonical validace, souborové asset URL, bezpečný JSON-LD, jednotná osoba/web.
- `lib/site-indexing.ts`: zachování robot preview pravidel při page overrides.
- `lib/article-seo.ts` (nový): propojená Article/WebPage/Breadcrumb graph.
- `lib/site-sitemap.ts` (nový), `app/sitemap.ts`: konzistentní canonical inventory, indexační filtrace, zdrojové datum, revalidace.
- `app/layout.tsx`: graph ze společného helperu, safe serializace, latin-ext.
- `app/page.tsx`: SEO title/description, safe serializace, zdrojový čas čtení.
- `app/clanky/page.tsx`: titulek archivu.
- `app/clanky/[slug]/page.tsx`: metadata notFound, URL autora/obrázku, graph, rel=author.
- `app/pravni-informace/page.tsx`: cíl pro existující skip link.
- `tests/unit/seo.test.mjs` (nový): 10 regresí pro metadata/schema/sitemap. Společně se 3 stávajícími release indexing testy 13/13 PASS.
- `tests/e2e/articles.spec.ts`: existující smoke rozumí BlogPosting v graphu; kontroluje stejný počet sekcí, identitu autora a hlavní stránky; OG author očekává URL.
- `tests/e2e/home.spec.ts`: aktualizované očekávání skutečně požadovaného homepage titulku.

## Ověření této části

- `node --experimental-strip-types --test tests/unit/seo.test.mjs tests/unit/site-indexing.test.mjs`: 13/13 PASS.
- ESLint nad změněnými runtime soubory + novým testem: PASS.
- `git diff --check` nad vlastněnými soubory: PASS.
- `file public/og.jpg`: ověřeno 1200×630 JPEG.
- Konkrétní produkční build, browser regresní běh a deploy ověřuje root; žádné z výše uvedeného se nevydává za produkční nasazení.

## Zbývající doložitelné obsahové příležitosti

- Doplnit skutečná data publikace/revize 8 nedatovaných článků v editoru. Nejde pouze o změnu lokální JSON, pokud deployment používá published runtime provider.
- Kratší cílené SEO titulky u dlouhých redakčních headline: stávající seoTitle může mít přes 80 znaků. Samotná délka není invalidní metadata ani doložená příčina neindexace; redakční změna vyžaduje soulad s publikovaným zdrojem.
- Oddělené služby a případové studie řešit podle skutečného záměru a unikátního obsahu. Žádné duplicitní landing pages nebyly vyrobeny kvůli checklistu.
- Historický GSC report neprokazuje dnešní blokaci. Serverový sitemap fetch a jednotlivé canonical response je potřeba posoudit odděleně od zpožděného Search Console souhrnu.

## Primární technické podklady

- Lokální Next 16.3.4: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` (title template, vnořená metadata), `01-app/02-guides/json-ld.md` (escapování `<`), `01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md` (metadata route caching/revalidate).
- Google Search Central: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap — lastmod musí odpovídat významné aktualizaci; priority a changefreq Google ignoruje.
- Google Search Central: https://developers.google.com/search/docs/appearance/ai-features — standardní indexovatelnost a SEO základy; není potřeba zvláštní schema.org typ pro AI funkce.
