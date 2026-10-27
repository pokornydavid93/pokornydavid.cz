# Doplnění publikačních dat — 8. 10. 2026

Na výslovný pokyn vlastníka mají následující články datum publikace i poslední aktualizace **2026-10-08**. Jde o určené redakční datum, nikoli datum odvozené z buildu nebo nasazení. Změny jsou připravené v novém ověřeném release archivu. **Produkce ani živé CMS nebyly změněny.**

## Rozsah

U těchto osmi slugů jsou `publishedAt`, `updatedAt`, HTML/OG metadata, JSON-LD `datePublished`/`dateModified` a sitemap `lastmod` sjednocené na 2026-10-08:

- `mate-financni-produkty-ale-mate-skutecne-financni-plan`
- `v-jakem-poradi-resit-osobni-finance`
- `kolik-ma-mit-domacnost-v-rezerve`
- `banka-vam-pujci-vic-nez-si-muzete-dovolit`
- `urokova-sazba-neni-cena-hypoteky`
- `penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku`
- `cestovko-zdarma-od-karty-vas-nemusi-zachranit`
- `planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou`

Zbývající čtyři zdrojové dokumenty jsou byte-for-byte totožné s výchozím stavem této úpravy:

| Slug | Publikace | Poslední aktualizace |
|---|---|---|
| `chcete-investovat-zacnete-planem` | 2026-06-22 | 2026-08-12 |
| `mate-pojisteni-prijmu-nebo-jen-pocit` | 2026-06-23 | 2026-08-12 |
| `zdrazilo-vam-pojisteni` | 2026-06-24 | 2026-08-12 |
| `konec-fixace-hypoteky` | 2026-06-25 | 2026-08-12 |

Článkový archiv `/clanky/` nyní může uvádět `lastmod=2026-10-08`, protože je datum doložené u všech jeho článků. Počet URL v sitemap zůstává 23.

## Implementace

Produkční konfigurace čte články z publikovaného Control API, nikoli přímo ze souborů v repozitáři. Pouhá změna lokálních JSON by se proto do skutečného releasu nepromítla. Publikovat nové CMS revize v této fázi by naopak zasáhlo živý web ještě před schválením nasazení.

- Do přesně osmi `content/blog/**/*.article.json` přibyla pouze dvě publikační pole. Existující příkaz `pnpm content:articles:generate` přenesl stejná data do `packages/article-editorial/generated/dashboard-articles.json`; ostatní obsah registru je beze změny.
- Nový `lib/article-publication-dates.ts` deklaruje vlastníkem schválená data pro přesný seznam osmi slugů autora Davida Pokorného. Sdílený `lib/article-document-adapter.ts` je použije při převodu starší publikované revize bez `publishedAt` do zobrazovacího modelu. Stejný model používají HTML, Open Graph, JSON-LD i sitemap. Nevzniká druhý publikační systém ani obecné dosazování dnešního data.
- Nezávislé čtení živého zdroje upřesnilo původní audit: rodinný článek už obsahoval `updatedAt=2026-09-13T07:25:34.755Z`, stále však neměl `publishedAt`. U něj schválené datum 8. 10. nahrazuje i tento starší update. Pozdější aktualizace z CMS zůstanou zachované; explicitně vyplněné datum publikace v budoucí CMS revizi má přednost.
- Validovaný původní dokument, číslo revize a digest API se nemění. Projekce doplňuje publikační metadata až za validační hranicí. Pro upravenou projekci má cache v `lib/article-content.server.ts` nový klíč; její dosavadní 60sekundová revalidace zůstává.
- `tests/unit/article-publication-dates.test.mjs` je zapojen do `test:release-safety` v `package.json`. Nový `tests/e2e/article-publication-dates.spec.ts` ověřuje všech 12 skutečně vykreslených článků bez klientského JavaScriptu.

HTML používá dosavadní komponentu `<time datetime>` a český formát „8. října 2026“. Nebyly měněny styly, struktura editorialu, formuláře ani analytika. Jediné viditelné doplnění této úpravy tvoří určená data.

## Ověření

- Celý `pnpm lint`: PASS.
- `pnpm test:articles`: 89/89 PASS; `pnpm test:release-safety`: 21/21 PASS. Jde o podmnožiny celkové sady níže, nikoli další nezávislé počty.
- Existující release workflow: všech 12 kroků PASS, včetně TypeScriptu, Next produkčního buildu, 218/218 app unit testů, SDK/cache testů a zabalení archivu.
- Přesný výsledný `.tgz` byl hashově ověřen a rozbalen do `/tmp/seo-article-dates-20261008-runtime`. Testy běžely proti tomuto lokálnímu produkčnímu serveru s publikovaným API zdrojem.
- 13/13 cílených Playwright scénářů PASS: nová kontrola všech dat, stávající SEO a sémantika bez JS. Pokrývají i všech 23 sitemap URL, canonical, robots, schema, 308, 404 a funnel noindex. Dva starší redakční scénáře s nesouladem fixture popsaným v původním auditu se touto úpravou neřešily ani znovu nespouštěly.
- Nezávislá kontrola surového HTML všech 12 článků potvrzuje přesnou shodu lokálního publikačního zdroje, `<time>`, OG, JSON-LD a sitemap. Zachované datum ostatních čtyř je součástí stejných asercí.
- Opakované načtení všech článků po uplynutí 60sekundové revalidační lhůty vrací stejná data. Všech 15 souborů této změny je byte-identických s kvalifikovanou build stage; veřejné route patterns a metody jsou beze změny proti předchozímu archivu.
- Read-only snímky veřejného článkového API a produkčního deployment ledgeru před/po jsou shodné. Žádná publikace CMS, upload archivu ani aktivace neproběhla.

Důkazy: [změny zdrojových dat](../../../../.tmp/seo-article-dates-20261008/source-change-verification.json), [datum každého vykresleného článku](../../../../.tmp/seo-article-dates-20261008/local-html/date-consistency.json), [stejná data po revalidační lhůtě](../../../../.tmp/seo-article-dates-20261008/after-revalidation/date-consistency.json), [Playwright log](../../../../.tmp/seo-article-dates-20261008/browser.log), [shoda se sestavenými zdroji a routami](../../../../.tmp/seo-article-dates-20261008/stage-verification.json), [nezměněná produkce](../../../../.tmp/seo-article-dates-20261008/production-unchanged.json).

## Release archiv

- Build ID: `xtThueeCxEk4DkULjVrrb`.
- SHA-256: `4b66ceab77802038266e32fd007daefb17e766c2ed4bc7e9f6ed9b373b61ef66`.
- Velikost: 42 678 162 B.
- Origin: `https://pokornydavid.cz`, indexing zapnutý.
- Privacy notice: `privacy-notice-2026-10-05`.
- [Aktuální archiv](../../../../.tmp/seo-article-dates-20261008/build/david-web-standalone.tgz), [build summary](../../../../.tmp/seo-article-dates-20261008/build/build-summary.json), [routes.json](../../../../.tmp/seo-article-dates-20261008/build/routes.json), [compiled route manifest](../../../../.tmp/seo-article-dates-20261008/build/release-routes.json).

Nový archiv obsahuje předchozí SEO/AEO optimalizace i tuto úpravu a pro budoucí nasazení nahrazuje původní archiv z `seo-aeo-20261008/build-2`. Původní archiv nebyl přepsán. Vznikl stejným `infra/deploy/david-web/build-release.py`; deployment mechanismus ani infrastruktura se neměnily.

**Stav: připraveno, nenasazeno.** Aktivní produkční verze zůstává `18fbe872-8b78-47bc-a28f-a8f92bbadba1`, `pending=false`. Produkční ověření nových dat bude možné až po pozdější aktivaci na pokyn vlastníka. [Závěrečný stavový záznam](../../../../.tmp/seo-article-dates-20261008/completion-receipt.json).
