# pokornydavid.cz — SEO + AEO audit a implementace, 8. 10. 2026

**Stav: změny implementované a ověřené na lokálně spuštěném produkčním archivu. Produkční nasazení nebylo provedeno — uživatel je během práce výslovně odložil.** Kontrolní čtení deployment ledgeru před a po práci potvrzuje stejný aktivní artefakt/verzi a žádnou čekající transakci. Neproběhl commit ani změna produkční infrastruktury.

**Navazující úprava publikačních dat:** vlastník následně výslovně určil u osmi článků publikaci i aktualizaci na **8. 10. 2026**. Změna je implementovaná, čtyři ostatní články si zachovávají původní data. [Aktuální report a nový release archiv](publication-dates.md) nahrazují původní artefakt uvedený níže; původní auditní důkazy zůstávají zachované. Ani tento nový archiv nebyl nasazen.

## A. Audit a závěry

Primárním podkladem jsou zdroje `apps/web`, sdílený renderer, publikační runtime, Next.js 16.3.4 Metadata API, deployment konfigurace a skutečně renderované HTML. Audit zahrnul 39 route patterns, všech 23 současných indexovatelných URL a všechny veřejné konverzní routy. Podrobnosti a inventáře:

- [Technické SEO, indexace, metadata a JSON-LD](metadata-audit.md).
- [Obsah všech stránek a 12 článků, sémantika a návrhy landing pages](content-audit.md).
- [Výkon, zdrojové příčiny a přesné výsledky měření](performance-audit.md).

### Potvrzené nálezy ze zadání

| Nález | Doložený stav a příčina | Výsledek |
|---|---|---|
| Dvojitý titulek archivu | Produkční HTML obsahovalo `Články z praxe \| David Pokorný \| David Pokorný`. Stránka už posílala jméno a layout znovu aplikoval šablonu. | Opraven vstup i společné skládání titulku. |
| Obecný homepage titulek | Produkce používala `Finanční přehled a jasný další krok \| David Pokorný`. | Nový title `David Pokorný \| Finanční poradce – hypotéky, pojištění a investice`. Hero text zůstává. |
| Nedůvěryhodné lastmod | Statické datum neodpovídalo pozdějším úpravám; archiv používal `new Date()`. U 8 článků původně chybělo doložené datum publikace. | Automatická data odstraněna. V navazující úpravě vlastník těmto osmi článkům určil publikaci i aktualizaci na 8. 10. 2026; ostatní data zachována. Žádné datum odvozené od deploye. |
| Neověřený stav JSON-LD | Již existovaly Person, WebSite, homepage WebPage a Article. Chyběla stabilní vazba článku/autora/vydavatele a breadcrumbs. | Propojený graph se stabilními `@id`, BlogPosting a BreadcrumbList. |
| Historický GSC noindex report | Před změnami všech 23 sitemap stránek vracelo 200, self canonical a povolenou indexaci. Formulář a potvrzení mají noindex záměrně. | Historický počet nelze označit za současnou plošnou blokaci. GSC účet ani interní stav indexu Google se tímto auditem neověřoval. |
| Sitemap „Nelze načíst“ | Veřejný endpoint vracel validní XML, HTTP 200 a 23 URL. | Aktuální nedostupnost endpointu se nepotvrdila; neznamená to změnu stavu reportu GSC. |

### Další nezávislé nálezy

- Společný metadata helper používal normalizaci canonical i pro soubory obrázků. `/og.jpg/` v produkci vracelo 404, `/og.jpg` 200. Stejný problém zasahoval obrázky článků a jejich JSON-LD.
- Metadata článku přepsala celý objekt robots a odstranila zděděné limity náhledů, zejména `max-image-preview:large`.
- Sitemap ignorovala `seoIndex:false` a vlastní canonical článku; její aktualizace neměla výslovně sladěnou 60sekundovou revalidaci se zdrojovou kolekcí.
- JSON-LD vložené prostým `JSON.stringify` neescapovalo `<`, takže redakční text mohl předčasně uzavřít script tag.
- `/blog/` a `/blog/[slug]/` používaly dočasné 307 přesměrování trvale přesunutého obsahu.
- Stránky osvědčení a refixace hypotéky byly v sitemap, ale chyběl na ně běžný veřejný interní odkaz.
- FAQ otázky neměly vlastní heading; srovnávací karty podporovaly tvar bez titulku bloku, ale i v něm přeskakovaly na H4. Sdílený skip target nebyl focusovatelný, právní stránce cíl úplně chyběl.
- Tři drobné portréty se přenášely jako původní velké JPEGy, protože host používá `images.unoptimized`. Zavřený modální formulář byl statickým importem v globálním provideru. Český DM Sans neměl preload Latin Extended subsetu.

### Co již fungovalo

HTTPS a `www` přesměrování vracejí 308 na kanonickou doménu; HTTP www projde dvěma trvalými kroky. `trailingSlash:true`, canonical a sitemap jsou konzistentní. Chybějící stránka i článek vracejí skutečnou 404. Preview alias vrací obsah se canonical na apex; je to kanonikalizovaný alias, nikoli samostatná nová obsahová destinace. Produkční route manifest nezpřístupňuje design tools, E2E harness, runtime preview ani provozní health endpoint.

Všech 23 indexovatelných HTML má `lang=cs`, jeden H1 a jeden main. V auditovaném HTML nebyly obrázky bez alt atributu ani rozbité interní fragmenty. Články, jejich obsahová navigace, všechny popisy služeb a odpovědi FAQ existují už v serverovém HTML. Archive search a topic filtry se kanonikalizují na `/clanky/`.

Veřejný obsah neblokují pravidla pro Googlebot, OAI-SearchBot či PerplexityBot. Test s těmito User-Agent řetězci ověřuje chování aplikace, ne uskutečněnou návštěvu infrastruktury daného vyhledávače. Indexace a citace v odpovědních systémech nebyly slibovány ani vydávány za výsledek lokálního testu.

## B. Provedená implementace

| Soubory v `apps/web` | Změna a přínos |
|---|---|
| `lib/seo.ts`, `lib/site-indexing.ts` | Oddělení asset URL od canonical; jednotné titulky, popisy a robots; zachování preview limitů; bezpečné JSON-LD. |
| `lib/article-seo.ts` (nový) | BlogPosting → WebPage → WebSite a jediná Person; konkrétní autor, vydavatel, skutečné datum, obrázek a breadcrumbs. |
| `lib/site-sitemap.ts` (nový), `app/sitemap.ts` | Canonical/indexační filtrace, doložitelné lastmod, 60s revalidace, odstranění nepotřebných priority/changefreq. |
| `app/layout.tsx`, `app/page.tsx` | Jednotná osoba a web, konkrétní ČNB identita, homepage metadata, preload DM Sans latin-ext, čas čtení karty ze zdroje článku. |
| `app/clanky/page.tsx`, `app/clanky/[slug]/page.tsx` | Titulek archivu, autorův profil v OG a `rel=author`, graph, obrázky a korektní notFound v metadata. |
| `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` | Trvalé 308 redirecty na články. |
| `app/clanky/ArticleEditorialRenderer.tsx`, `articleRenderer.module.css` | H3/H4 podle skutečné hierarchie se stejným stylem. |
| `app/_components/homepage/HomeFaqAccordion.client.tsx`, `.module.css` | Sémantické H3 otázky při zachování původních tlačítek a animací. |
| `app/components/multipage/MarketingPage.tsx`, `app/pravni-informace/page.tsx` | Funkční focusovatelný skip target. |
| `app/content/footer.ts` | Odkaz „Odborná osvědčení“ na samostatnou stránku a textový odkaz na refixaci ve stávajícím sloupci. |
| `app/content/testimonials.ts`, `public/images/testimonials/*-avatar.webp` | Tři WebP deriváty ve správném rozlišení; původní fotografie jsou zachované a hashově ověřené. |
| `app/components/Providers/LeadFormModalProvider.tsx` | Formulář se načítá až při otevření; jeho pole, validace a odesílání se nemění. |
| `eslint.config.mjs`, `src/app/ui/privacy/AnalyticsLoader.client.tsx` | Lint ignoruje generované browser artefakty; úzká zdokumentovaná výjimka pro původní Google `IArguments` protokol. Analytický runtime má stejnou funkční logiku. |
| `package.json`, `tests/unit/seo.test.mjs` | Regrese metadat, schema, canonical, sitemap a indexace zapojená do `test:release-safety`. |
| `tests/e2e/seo.spec.ts`, `seo-semantics.spec.ts`, `media-performance.spec.ts` | Nové testy skutečného HTML všech URL, sémantiky bez JS a skutečně dekódovaných obrazových derivátů/objemu. |
| Stávající E2E `articles`, `home`, `home-mobile-hero-polish`, `home-references-reader`, `footer`, `cursor-coverage`, `analytics-consent`, `form-privacy` | Aktualizovaná očekávání pro nové title/schema/assets a současné cookie texty, verzi politiky a dokončení animace při měření. |

Vizuální identita, DM Sans, hero, scroll animace, layout komponent, editorial, formulářová data a analytické události zůstávají zachované. Viditelné obsahové změny jsou omezené na jeden odkaz v patičce, cílovou URL osvědčení a sjednocení času čtení. Samostatné nové služby nejsou bez schváleného odborného textu publikovány.

Person odpovídá osobnímu webu poradce. FinancialService/Organization se nepřidávaly automaticky: neexistuje doložená potřeba vytvářet druhou identitu/provozovnu. FAQPage, skryté souhrny či `llms.txt` se nepřidávaly jako příslib AI viditelnosti. Google popisuje stejné základní požadavky na indexovatelnost, čitelný text a konzistentní strukturovaná data pro AI Overviews i AI Mode ([Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)). Pro lastmod platí významná doložená změna obsahu; priority a changefreq Google nepoužívá ([sitemap dokumentace](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)).

## C. Ověření a stav produkce

- Celý lint: PASS.
- TypeScript a produkční Next build v izolované stage: PASS.
- Všech **210 app unit testů**: PASS; samostatné SDK a cache-handler testy rovněž PASS.
- **12 nových SEO/sémantických browser testů**: PASS. Pokrývají všech 23 sitemap URL, všechny články, skutečné canonical/robots/JSON-LD/OG obrázky, 308, 404, filtraci archivu, formulářový noindex, SSR bez JS a cíle skip navigace.
- **6 výkonových a interakčních scénářů**: PASS. Dekódované avatary a 64KiB limit, mobilní CTA/form route, reference, první aktivace kurzoru a touch režim.
- **6 footer/FAQ scénářů**: PASS. Forward/reverse scroll, klávesnice, reduced motion, cookies, responsive layout a axe.
- **7 analytických scénářů**: PASS. Blokace před souhlasem/po odmítnutí, sanitizované GA události, odvolání a obnova souhlasu mezi taby, expirace, selhání storage a čekající provider script. Provider požadavky jsou mockované. Stávající test vyžadující reálně vypnutou analytiku nebyl aplikován na produkční profil s GA4.
- **2 formulářové scénáře**: PASS. Článkový kontakt a přechod do kontaktu v hlavním funnelu; POST je mockovaný/blokovaný, nevznikla skutečná poptávka ani e-mail.
- Stávající článkový test skip navigace: PASS. Dva další starší redakční testy **neprošly**: předpokládají starší styly a repository fixture (disc místo již existujícího číslování, výchozí autorský závěr, konkrétní nadpis/podobu případové studie, počet bloků a nepřítomnost screeningu), zatímco tento produkční profil používá publikovanou kolekci. Původní HTML před změnami už obsahuje odlišný nadpis a screening. Důkaz `article-legacy-test-provenance.json` rozlišuje tento původní nesoulad od regrese. Jejich obsahové aserce nebyly plošně oslabeny kvůli zelenému výsledku; kontrolu současného publikovaného HTML všech článků pokrývá nová SEO/sémantická sada. Celkem prošlo **34 cílených browser scénářů**, tyto **2 historické redakční scénáře zůstávají neúspěšné**.
- Tři reprezentativní stránky × šířky **390/768/1440/1920**: 12 browser scénářů před změnou a 12 na novém archivu; nulové page/console errors a nulové kladné horizontální přetékání. Dalších osm screenshotů footer/FAQ a dvě detailní kontroly portrétů.
- Původní samostatné testy při prvním běhu odkryly zastaralé fixture texty/verzi consentu a měření patičky během animace. Testy byly opraveny podle existujícího runtime; relevantní scénáře potom prošly. Nešlo o důvod měnit UX nebo snížit hranici 40px u patičkového odkazu.

Skutečná úspora portrétů činí **704 752 B (94,1 %)**: 748 914 → 44 162 B. Samostatný 26 814B chunk formuláře chybí v úvodních script tagech i mezi načtenými požadavky po inicializaci stránky. Font má oba potřebné preloads. Toto jsou důkazy přenosu a načítání kódu, nikoli prohlášení o field Core Web Vitals. Veřejná baseline měla laboratorní LCP přibližně 0,69–1,32 s a CLS téměř nula, ale bez mobilního throttlingu; lokální a veřejné timing nelze porovnávat jako kontrolovaný experiment. INP p75/CrUX ani dlouhodobé chování návštěvníků nejsou k dispozici. Testy animací explicitně zapínaly běžný runtime mimo standardní webdriver bypass Lenisu.

### Původní kvalifikovaný artefakt auditu

Tento archiv je zachován jako původní důkaz; pro budoucí release jej nahrazuje [nový archiv s doplněnými publikačními daty](publication-dates.md#release-archiv).

- Build ID: `SYHM6IeQKGeK_Uruv3b-Z`.
- SHA-256: `dc947f1e0daa3671281fa94d91d3197621abad778c945df9cdc6db47127082bf`.
- Velikost archivu: 42 629 321 B.
- Origin/indexing: `https://pokornydavid.cz`, zapnuto.
- Privacy notice: `privacy-notice-2026-10-05`.
- [Build summary](../../../../.tmp/seo-aeo-20261008/build-2/build-summary.json), [archiv](../../../../.tmp/seo-aeo-20261008/build-2/david-web-standalone.tgz), [20 veřejných route patterns](../../../../.tmp/seo-aeo-20261008/build-2/routes.json), [kompilovaný route důkaz](../../../../.tmp/seo-aeo-20261008/build-2/release-routes.json).

Archiv vznikl existujícím `infra/deploy/david-web/build-release.py`, prošel všech 12 kroků workflow a byl znovu rozbalen mimo checkout do `/tmp/seo-aeo-20261008-runtime`. Browser testy běžely nad tímto archivem, ne nad vývojovým serverem. Změny testových očekávání po sestavení nemění runtime soubory; kontrolu proti otiskům zdrojové stage dokládá `postbuild-source-delta.json`.

**Deployment: NEPROVEDEN.** Je to výslovné rozhodnutí uživatele během auditu. Produkční aktivní verze zůstává `18fbe872-8b78-47bc-a28f-a8f92bbadba1`; read-only ledger před/po je shodný a `pending=false`. Finální produkční smoke nových změn proto nemohl proběhnout. Žádná zde popsaná nová optimalizace se nevydává za nasazenou.

Pro budoucí aktivaci použít doložené `infra/deploy/david-web/upload-release.py` s nejnovějším ověřeným archivem z [navazujícího reportu](publication-dates.md), jeho SHA-256 a `routes.json`, apex origin, `--indexing` a odpovídající privacy verzí. Před aktivací znovu ověřit aktuální produkční předchůdce a stav článkového runtime; poté doplnit produkční smoke a shodu identity. Starší `package.json deploy:production` odkazující na historický SSH deployment se při této práci nepoužil.

Přesný [seznam změněných souborů](../../../../.tmp/seo-aeo-20261008/changed-files.json) a [závěrečný stavový záznam](../../../../.tmp/seo-aeo-20261008/completion-receipt.json) vymezují výstup této práce.

Surové důkazy jsou v [`.tmp/seo-aeo-20261008`](../../../../.tmp/seo-aeo-20261008): HTML před/po, HTTP statusy a hlavičky, screenshoty, browser trace/logy, source snapshoty a nezměněný produkční ledger. První build selhal pouze na nepodporované vlastnosti nového testu `test.use`; následný `build-2` je kvalifikovaný. Původní široce rozpracovaný checkout je zachován; úplný aktuální diff vůči Gitu obsahuje i starší práci a není výhradně výstupem tohoto auditu.

## D. Další příležitosti

1. **Publikační data — navazující úprava dokončena:** vlastník osmi článkům určil datum 8. 10. 2026. Lokální publikační dokumenty, dashboard registry a projekce pro HTML/JSON-LD/sitemap jsou sjednocené. Živé CMS se kvůli odloženému nasazení neměnilo; připravený web zpracuje i jeho starší revize. Podrobnosti v [reportu publikačních dat](publication-dates.md). Čtyři dříve datované články zachovávají aktualizaci 12. 8. 2026.
2. **Odborné zdroje a autorství:** pracovní JSON obsahují 38 neuzavřených ověřovacích položek. To neprokazuje stav právě publikované revize. Zkontrolovat je autorem, u relevantních tvrzení připojit veřejný aktuální primární zdroj a skutečné datum kontroly; nepublikovat automaticky interní klientské podklady.
3. **Tematické služby:** návrhy `/sluzby/hypoteky/`, `/sluzby/ochrana-prijmu/`, `/sluzby/investice-a-sporeni/`, `/sluzby/financni-plan/` a `/sluzby/pojisteni-majetku/` mají konkrétní osnovu, odlišený záměr a navazující články v [obsahovém reportu](content-audit.md). Existující refixaci využít, neduplikovat.
4. **Obsahové vazby:** devět relatedTopics se ještě páruje názvem místo stabilního slugu; současné cíle existují, ale při redakci názvu je vhodné přejít na slug v publikačních datech. Dlouhé SEO title lze redakčně zkrátit bez zásahu do výrazných viditelných headline.
5. **Další výkon:** skutečné CrUX/RUM/LCP/INP měření před většími zásahy. Globální kurzor/GSAP a velká textura noise jsou budoucí kandidáti; lazy cursor byl při posouzení odmítnut kvůli riziku ztráty prvního pointer eventu. Schválené intro, textury a animace zůstávají.
6. **Vyhodnocení po budoucím nasazení:** zopakovat veřejný crawl všech 23 URL, HTTP/WWW redirecty, robots a sitemap, porovnat identitu aktivního releasu a následně sledovat recrawl a coverage v GSC. Aktuální pravidla OpenAI a Perplexity rozlišují jejich vyhledávací crawlery; wildcard robots je neblokuje ([OpenAI](https://developers.openai.com/api/docs/bots), [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)).
