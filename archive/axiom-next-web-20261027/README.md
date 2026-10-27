# Archiv Next.js webu z 27. října 2026

Tento adresář zachovává poslední lokální zdrojový stav `apps/web` z Axiomu. Aktuální produkční web používá Surface. Archiv slouží k obnově a historické kontrole; neobsahuje aktivní nasazovací workflow.

Všech 806 zahrnutých souborů aplikace má původní obsah a příznak spustitelnosti. `SOURCE-MANIFEST.json` uvádí SHA256 každého souboru a výslovně vynechané výstupy. Zahrnuto je všech 64 skutečných veřejných médií. Cache, `node_modules`, sestavené výstupy a lokální `.env` nejsou zdrojovým archivem.

Sdílené balíčky Axiomu zůstávají soukromé. K obnově potřebujete SSH přístup do `Perfekt235/axiom`, Git, Python 3 a verzi Node/pnpm odpovídající `packageManager` v tomto adresáři. Bootstrap stáhne pouze osm balíčků z pevného commitu `a8655da30fa9f3b7ff9a5a4931d4e1f25346581a`, ověří jejich SHA256 a zkopíruje je do lokálního gitignored `packages/`. Soukromý obsah se nikdy nestává součástí tohoto veřejného repozitáře.

Z čerstvého Git checkoutu tohoto repozitáře:

```sh
cd archive/axiom-next-web-20261027
python3 scripts/bootstrap-private-dependencies.py
pnpm install --frozen-lockfile
pnpm verify:private
# Nastavte publikovaný runtime podle následující sekce.
pnpm build
HOSTNAME=127.0.0.1 PORT=3010 pnpm start
```

Pro vývoj použijte `pnpm dev`. `pnpm typecheck` a `pnpm test:release-safety` spouštějí původní kontroly aplikace. Lockfile zachovává vybrané původní workspace importery a pevné registry verze; jiné aplikace Axiomu nejsou workspace tohoto archivu.

Produkční `pnpm build` záměrně vyžaduje publikované články a nabídkový katalog. Režim `repository` je v původní aplikaci povolen pouze pro lokální vývoj a testy; produkční kontrola zůstává zachovaná. Před buildem a spuštěním nastavte tyto veřejné vazby na vlastní dostupný runtime (hodnoty níže jsou pouze šablona):

```sh
export AXIOM_PUBLIC_ARTICLE_SOURCE=published
export AXIOM_PUBLIC_ARTICLE_RUNTIME_ORIGIN=https://runtime.example.test
export AXIOM_PUBLIC_ARTICLE_RUNTIME_WORKSPACE_ID=11111111-1111-4111-8111-111111111111
export AXIOM_PUBLIC_OFFERING_CATALOG_ORIGIN="$AXIOM_PUBLIC_ARTICLE_RUNTIME_ORIGIN"
export AXIOM_PUBLIC_OFFERING_CATALOG_WORKSPACE_ID="$AXIOM_PUBLIC_ARTICLE_RUNTIME_WORKSPACE_ID"
```

Runtime poskytuje anonymní čtení `GET /public/content/workspaces/{workspace_id}/articles` a `GET /public/catalog/workspaces/{workspace_id}/offerings` v původním kontraktu. Katalog musí obsahovat všechny `offeringKey` používané zdrojovým webem. Kvalifikace archivu použila izolovanou read-only fixture odvozenou z 12 původních článků a původního katalogu služeb. Obnovený publikovaný seznam musí zahrnovat také slugs odkazované domovskou stránkou; prázdný seznam nestačí pro její kontrolu integrity. Tato lokální zkouška neprokazuje dostupnost původního živého backendu.

Původní backendové integrace, formuláře a publikace potřebují odpovídající samostatný backend a lokální konfiguraci. Přístupové údaje ani interní služby Axiomu nejsou součástí veřejného archivu. Původní aplikační deploy skripty jsou zachované historické zdroje; pro archiv používejte příkazy zdejšího kořenového wrapperu.

`PRIVATE-DEPENDENCIES.json` obsahuje pouze adresy balíčků, pin a kontrolní součty. `ARCHIVE-PROVENANCE.json` popisuje původ snapshotu a nově přidané obnovovací soubory. Historie původního veřejného repozitáře zůstává zachovaná.
