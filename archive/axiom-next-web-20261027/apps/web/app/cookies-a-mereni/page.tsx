import type { Metadata } from "next";
import { PublicSiteFooter, PublicSiteHeader } from "@/app/_components/PublicSiteChrome";
import Container from "@/app/ui/container/Container";
import LegalBackButton from "@/app/ui/legal/LegalBackButton.client";
import LegalCookieSettingsButton from "@/app/ui/legal/LegalCookieSettingsButton.client";
import LegalLink from "@/app/ui/legal/LegalLink";
import { createPageMetadata } from "@/lib/seo";
import { getWebPrivacyConfiguration } from "@/lib/privacy/webPrivacyRuntime.server";
import { formatPrivacyDate, WEB_PRIVACY_EFFECTIVE_DATE } from "@/lib/privacy/policy";
import styles from "../legal.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Cookies a měření",
  description: "Co tento web ukládá do prohlížeče, jak funguje volitelná analytika a jak změnit nebo odvolat souhlas.",
  path: "/cookies-a-mereni/",
});

export default async function CookiesPage() {
  const privacy = await getWebPrivacyConfiguration();
  const analyticsEnabled = privacy.analytics_mode !== "disabled";
  const axiomEnabled = privacy.analytics_mode === "axiom_only" || privacy.analytics_mode === "axiom_and_ga4";
  const ga4Enabled = privacy.analytics_mode === "ga4_only" || privacy.analytics_mode === "axiom_and_ga4";
  const providerLabel = axiomEnabled && ga4Enabled
    ? "Axiom a Google Analytics 4"
    : ga4Enabled ? "Google Analytics 4" : "Axiom";
  const analyticsRetention = privacy.analytics_retention_months === 2 ? "2 měsíce" : "14 měsíců";

  return (
    <>
      <PublicSiteHeader currentPath="/cookies-a-mereni/" initialTheme="dark" themeBehavior="static" />
      <main data-route-reveal-root data-route-reveal-profile="staged" id="main-content" tabIndex={-1} className={styles.legalMain} data-surface-tone="light">
        <Container maxWidth={960}>
          <div className={styles.legalWrap}>
            <div className={styles.titleBlock} data-route-reveal-group>
              <div className={styles.eyebrow} data-route-reveal-item="meta">
                <span className={styles.eyebrowDot} aria-hidden="true" />
                <span>Soukromí v prohlížeči</span>
              </div>
              <h1 className={styles.title} data-route-reveal-item="title">Cookies a měření</h1>
              <p className={styles.lead} data-route-reveal-item="body">
                {analyticsEnabled
                  ? `Volitelné měření návštěvnosti pomocí ${providerLabel} se spouští pouze po vašem souhlasu.`
                  : "Volitelné analytické měření je aktuálně vypnuté."}
                {" "}Odmítnutí neomezuje používání webu ani odeslání poptávky.
                Web nepoužívá reklamní ani remarketingové cookies.
              </p>
            </div>

            <section data-route-reveal-group className={styles.section} aria-labelledby="cookies-spravce">
              <h2 data-route-reveal-item="title" id="cookies-spravce">1. Kdo odpovídá za měření</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Správcem údajů pro provoz a analytiku tohoto webu je {privacy.controller_name},
                {" "}{privacy.controller_registration_id}, se sídlem {privacy.controller_address}.
                S dotazy nebo při uplatnění práv se obraťte na správce na e-mailu{" "}
                <a className={styles.link} href={`mailto:${privacy.privacy_contact_email}`}>{privacy.privacy_contact_email}</a>.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="nezbytne-ulozeni">
              <h2 data-route-reveal-item="title" id="nezbytne-ulozeni">2. Uložení pro fungování webu a vaše nastavení</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Vedle cookies může prohlížeč uchovávat údaje v místním úložišti
                (localStorage) nebo v úložišti aktuální relace (sessionStorage).
                Následující klíče neslouží ke sledování návštěvnosti ani k reklamě:
              </p>
              <ul className={styles.pillList}>
                <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Potvrzení odeslané poptávky</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    Cookie <code>overview_receipt_v1</code> umožňuje zobrazit potvrzení
                    přijaté poptávky. Podle způsobu jejího přijetí obsahuje identifikátor
                    nebo podepsané potvrzení, které může zahrnovat téma, zdroj poptávky
                    a maskovanou část telefonu. Platí nejvýše 15 minut a používá se
                    jen v části <code>/ziskat-prehled</code>. Je dostupná pouze serveru
                    (HttpOnly), nikoli skriptům stránky.
                  </p>
                </li>
                <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Stav potvrzovacího e-mailu</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    Cookie <code>overview_confirmation_email_v1</code> se ukládá pouze,
                    pokud web zařadí potvrzovací e-mail k odeslání. Obsahuje podepsané
                    potvrzení navázané na přijatou poptávku, nikoli e-mailovou adresu.
                    Má stejný rozsah <code>/ziskat-prehled</code>, je dostupná pouze
                    serveru (HttpOnly) a platí nejvýše 15 minut. Pokud se e-mail
                    tímto způsobem nezařadí, web ji odstraní.
                  </p>
                </li>
                <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Vaše volba analytiky</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    <code>cookie_consent_v1</code> v localStorage uchovává rozhodnutí,
                    čas rozhodnutí, konec platnosti a verzi souhlasu. Souhlas platí nejdéle {privacy.consent_grant_ttl_days} dní,
                    odmítnutí nejdéle {privacy.consent_reject_ttl_days} dní. Po uplynutí platnosti nebo
                    změně verze web požádá o novou volbu před případným spuštěním měření.
                  </p>
                </li>
                <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Vzhled webu</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    <code>dp.siteTheme.v2</code> v localStorage uchovává zvolený barevný
                    vzhled. Nemá automaticky omezenou platnost; můžete jej odstranit vymazáním
                    dat tohoto webu v prohlížeči.
                  </p>
                </li>
                <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Vzhled záhlaví při návratu</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    <code>site_header_theme_v1</code> v sessionStorage uchovává cestu
                    stránky, vzhled záhlaví a čas uložení. Při obnovení nebo návratu
                    se použije jen záznam nejvýše 30 minut starý pro stejnou stránku.
                    Záznam zaniká s relací dané karty.
                  </p>
                </li>
                <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Návrat z právních stránek</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    Klíče <code>legal:returnToPath</code>, <code>legal:returnToScrollY</code>
                    {" "}a <code>legal:restoreScrollY</code> v sessionStorage umožňují návrat
                    na původní stránku a pozici. Po použití se odstraňují,
                    nejpozději zanikají s relací dané karty.
                  </p>
                </li>
              </ul>
              <p data-route-reveal-item="body" className={styles.text}>
                Pro uložení nezbytné k poskytnutí vámi požadované funkce se souhlas
                podle § 89 odst. 3 zákona č. 127/2005 Sb. nevyžaduje. Zpracování
                souvisejících osobních údajů pro provoz a bezpečnost se opírá
                o oprávněný zájem podle čl. 6 odst. 1 písm. f) GDPR.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="volitelna-analytika">
              <h2 data-route-reveal-item="title" id="volitelna-analytika">3. Volitelná analytika</h2>
              {analyticsEnabled ? (
                <>
                  <p data-route-reveal-item="body" className={styles.text}>
                    Po udělení souhlasu web používá {providerLabel} pro statistiku návštěvnosti
                    a zlepšování obsahu a použitelnosti webu. Zpracovávají se zejména:
                  </p>
                  <ul className={styles.list}>
                    <li data-route-reveal-group="row">návštěvy, navštívené stránky a zdroj návštěvy,</li>
                    <li data-route-reveal-group="row">parametry kampaně v odkazu (UTM), pokud jsou uvedeny,</li>
                    <li data-route-reveal-group="row">vybrané interakce, například kliknutí na odkaz, otevření nebo odeslání formuláře,</li>
                    {axiomEnabled ? <li data-route-reveal-group="row">průchod jednotlivými kroky testu, viditelné části stránky,
                      přibližná hloubka posunu a aktivní čas na stránce nebo v kroku,</li> : null}
                    <li data-route-reveal-group="row">technické informace o prohlížeči či zařízení a analytické identifikátory.</li>
                  </ul>
                  <p data-route-reveal-item="body" className={styles.text}>
                    Vyřízení poptávky funguje i bez analytiky. Do vlastních analytických
                    událostí web neodesílá obsah kontaktních polí ani detailní finanční odpovědi.
                    Správce nevytváří reklamní publika ani nezapojuje remarketing.
                  </p>
                  {axiomEnabled ? <p data-route-reveal-item="body" className={styles.text}>
                    Měření Axiom používá náhodný identifikátor návštěvy. Aktivní čas se
                    nezapočítává při skryté kartě nebo po 30 sekundách bez aktivity.
                    Z posledního zaznamenaného kroku lze odhadnout, kde návštěva skončila;
                    nejde o jistotu, že člověk právě v tomto místě web opustil.
                    Nezaznamenává se obrazovka, pohyb kurzoru, stisknuté klávesy ani text,
                    který píšete do formuláře. Měření začíná až po souhlasu a nedoplňuje
                    zpětně předchozí průchod webem.
                  </p> : null}
                </>
              ) : <p data-route-reveal-item="body" className={styles.text}>
                V aktuální konfiguraci se volitelné analytické události neměří.
                Před případným zapnutím bude dostupná informace o používaném nástroji a možnost rozhodnout se o měření.
              </p>}

              <p data-route-reveal-item="body" className={styles.text}>
                Cookie <code>overview_analytics_claim_v1</code> slouží pouze k tomu,
                aby se přijatá poptávka nezapočítala do analytiky vícekrát. Obsahuje
                podepsanou značku navázanou na potvrzení poptávky, nikoli obsah
                kontaktních polí. Je dostupná pouze serveru (HttpOnly), omezená
                na <code>/ziskat-prehled</code> a platí nejdéle do konce
                patnáctiminutové platnosti potvrzení poptávky.
                {" "}{analyticsEnabled
                  ? "Vzniká pouze při zapnuté analytice a platném aktuálním souhlasu."
                  : "Při nyní vypnuté analytice se nevytváří, ani pokud je v prohlížeči uložen dřívější souhlas."}
              </p>

              {(axiomEnabled || ga4Enabled) ? <ul className={styles.pillList}>
                {axiomEnabled ? <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Měření Axiom</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    Po souhlasu se v sessionStorage uloží záznam
                    <code> axiom_measurement_session_v2</code> s náhodným identifikátorem
                    návštěvy, časem poslední aktivity a vybranými údaji o zdroji či kampani.
                    Klíč <code>axiom_measurement_sequence_v1</code> uchovává počítadlo
                    událostí. Po 30 minutách nečinnosti začne další aktivita novou návštěvu.
                    Záznamy zanikají s relací karty nebo při odvolání souhlasu;
                    nevytváří se trvalý identifikátor pro propojování dalších návštěv.
                    Události zpracovává platforma Axiom.
                  </p>
                </li> : null}
                {ga4Enabled ? <li data-route-reveal-group="row" className={styles.pill}>
                  <p data-route-reveal-item="body" className={styles.pillTitle}>Google Analytics 4</p>
                  <p data-route-reveal-item="body" className={styles.pillDesc}>
                    Po souhlasu může do prohlížeče uložit cookies <code>_ga</code>
                    {" "}a <code>_ga_&lt;id&gt;</code> pro rozlišení návštěv.
                    Jejich životnost je nastavena nejvýše na {privacy.consent_grant_ttl_days} dní;
                    při další návštěvě může být obnovena.
                  </p>
                </li> : null}
              </ul> : null}
              <p data-route-reveal-item="body" className={styles.text}>
                Právním základem zpracování analytických údajů je souhlas podle
                čl. 6 odst. 1 písm. a) GDPR. Pro uložení a čtení analytických
                identifikátorů je základem souhlas podle § 89 odst. 3 zákona č. 127/2005 Sb.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="zmena-souhlasu">
              <h2 data-route-reveal-item="title" id="zmena-souhlasu">4. Jak změnit nebo odvolat souhlas</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                {analyticsEnabled
                  ? "S analytikou můžete souhlasit nebo ji odmítnout přímo v první vrstvě lišty. Zavření lišty ani nečinnost nepředstavují udělení souhlasu."
                  : "Analytika je vypnutá. Pokud bude zapnuta, před jejím spuštěním vám web nabídne možnost souhlasit nebo odmítnout."}
                {" "}Volbu můžete kdykoli změnit v nastavení cookies dostupném také v patičce webu.
              </p>
              <LegalCookieSettingsButton />
              <p data-route-reveal-item="body" className={styles.text}>
                Po odmítnutí nebo odvolání web zastaví další odesílání analytických údajů,
                odstraní místní identifikátor Axiom a dostupné cookies Google Analytics
                z tohoto webu. Vymazání cookies v prohlížeči samo nevymaže údaje dříve
                předané poskytovateli; pro uplatnění práv můžete napsat správci.
                Odvolání neovlivňuje zákonnost předchozího zpracování.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Analytický souhlas nepřihlašuje k newsletteru. Souhlas s newsletterem
                bude samostatný a nebude podmínkou pro používání webu nebo konzultaci.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="analytics-uchovani">
              <h2 data-route-reveal-item="title" id="analytics-uchovani">5. Doba uchování analytických údajů</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Životnost identifikátorů v prohlížeči je uvedena výše. Jde o jinou dobu
                než uchování údajů u poskytovatele analytiky.
              </p>
              {analyticsEnabled ? <p data-route-reveal-item="body" className={styles.text}>
                Pro analytické záznamy o uživatelích a jednotlivých událostech je v pravidlech
                tohoto webu stanovena doba {analyticsRetention}.
                {axiomEnabled ? " Axiom podrobné záznamy průchodu webem automaticky maže po 56 dnech; úklid probíhá každou hodinu." : null}
                {ga4Enabled ? <> V Google Analytics se tento limit nevztahuje na standardní
                  souhrnné reporty. Rozsah nastavení vysvětluje{" "}
                  <a className={styles.link} href="https://support.google.com/analytics/answer/7667196?hl=en">
                    dokumentace k uchovávání dat Google Analytics
                  </a>.</> : null}
              </p> : <p data-route-reveal-item="body" className={styles.text}>Web nyní nesbírá volitelná analytická data.</p>}
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="analytics-prijemci">
              <h2 data-route-reveal-item="title" id="analytics-prijemci">6. Příjemci a předávání mimo EHP</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Pro provoz webu správce využívá dodavatele hostingu, infrastruktury a technické podpory.
                {axiomEnabled ? " Události měření Axiom zpracovává platforma Axiom." : ""}
                {ga4Enabled
                  ? " Google Analytics 4 poskytuje společnost Google Ireland Limited spolu se zapojenými dodavateli."
                  : " Google Analytics 4 není v aktuální konfiguraci zapnuté."}
              </p>
              {ga4Enabled ? <p data-route-reveal-item="body" className={styles.text}>
                V rámci Google Analytics může dojít ke zpracování mimo EHP, včetně USA.
                Google uvádí použití rámce EU–USA pro ochranu údajů pro příslušné
                certifikované subjekty a standardních smluvních doložek v dalších případech.
                Podrobnosti a odkazy na záruky zveřejňuje v{" "}
                <a className={styles.link} href="https://business.safety.google/adsdatatransfers/">
                  informacích o mezinárodním předávání
                </a>.
                O informace ke konkrétnímu předání nebo kopii použitých záruk můžete požádat správce.
              </p> : null}
              <p data-route-reveal-item="body" className={styles.text}>
                Další informace o příjemcích, právech, námitce a podání stížnosti
                najdete v{" "}
                <LegalLink className={styles.link} href={privacy.privacy_policy_path}>zásadách zpracování osobních údajů</LegalLink>.
              </p>
            </section>

            <p data-route-reveal-item="body" className={styles.text}>Aktualizováno: <time dateTime={WEB_PRIVACY_EFFECTIVE_DATE}>
              {formatPrivacyDate(WEB_PRIVACY_EFFECTIVE_DATE)}
            </time>.</p>
            <div className={styles.backRow}><LegalBackButton className={styles.backButton} /></div>
          </div>
        </Container>
      </main>
      <PublicSiteFooter />
    </>
  );
}
