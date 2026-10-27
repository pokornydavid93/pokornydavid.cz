import type { Metadata } from "next";
import { PublicSiteFooter, PublicSiteHeader } from "@/app/_components/PublicSiteChrome";
import Container from "@/app/ui/container/Container";
import LegalLink from "@/app/ui/legal/LegalLink";
import LegalBackButton from "@/app/ui/legal/LegalBackButton.client";
import { createPageMetadata } from "@/lib/seo";
import { getWebPrivacyConfiguration } from "@/lib/privacy/webPrivacyRuntime.server";
import {
  formatPrivacyDate,
  SAB_PRIVACY_INFORMATION_URL,
  WEB_PRIVACY_EFFECTIVE_DATE,
  WEB_PRIVACY_NOTICE_VERSION,
  WEB_TECHNICAL_LOG_RETENTION_DAYS,
} from "@/lib/privacy/policy";
import styles from "../legal.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Zásady zpracování osobních údajů",
  description: "Kdo zpracovává údaje z webu PokornyDavid.cz, proč je potřebuje a jak můžete uplatnit svá práva.",
  path: "/zasady-zpracovani-osobnich-udaju/",
});

export default async function PrivacyPolicyPage() {
  const privacy = await getWebPrivacyConfiguration();
  const analyticsEnabled = privacy.analytics_mode !== "disabled";
  const ga4Enabled = privacy.analytics_mode === "ga4_only" || privacy.analytics_mode === "axiom_and_ga4";

  return (
    <>
      <PublicSiteHeader currentPath="/zasady-zpracovani-osobnich-udaju/" initialTheme="dark" themeBehavior="static" />
      <main data-route-reveal-root data-route-reveal-profile="staged" id="main-content" tabIndex={-1} className={styles.legalMain} data-surface-tone="light" data-privacy-notice-version={WEB_PRIVACY_NOTICE_VERSION}>
        <Container maxWidth={960}>
          <div className={styles.legalWrap}>
            <div className={styles.titleBlock} data-route-reveal-group>
              <div className={styles.eyebrow} data-route-reveal-item="meta">
                <span className={styles.eyebrowDot} aria-hidden="true" />
                <span>Ochrana soukromí</span>
              </div>
              <h1 className={styles.title} data-route-reveal-item="title">Zásady zpracování osobních údajů</h1>
              <p className={styles.lead} data-route-reveal-item="body">
                Jak se zpracovávají údaje při návštěvě webu, vyřízení vaší žádosti
                a domluvě konzultace. Najdete zde také informace o svých možnostech a právech.
              </p>
            </div>

            <section data-route-reveal-group className={styles.section} aria-labelledby="spravce">
              <h2 data-route-reveal-item="title" id="spravce">1. Kdo odpovídá za vaše údaje</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Správcem údajů pro provoz webu PokornyDavid.cz, vyřízení webových
                poptávek a vlastní webovou analytiku je {privacy.controller_name},
                {" "}{privacy.controller_registration_id}, se sídlem {privacy.controller_address}.
                Správce určuje účel a způsob tohoto zpracování.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Webová poptávka slouží k prvnímu kontaktu a domluvě dalšího kroku
                se správcem. Je oddělená od klientské agendy pro konkrétní finanční produkt.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                S dotazy, žádostmi nebo při uplatnění práv se obraťte na správce na e-mailu{" "}
                <a className={styles.link} href={`mailto:${privacy.privacy_contact_email}`}>{privacy.privacy_contact_email}</a>
                {" "}nebo na uvedenou poštovní adresu.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                David Pokorný zprostředkovává finanční služby jako vázaný zástupce společnosti
                SAB servis s.r.o., IČO 24704008, se sídlem Jungmannova 748/30,
                110 00 Praha 1. Zpracování v její klientské agendě má vlastní účely,
                právní základy a pravidla. Podrobnosti a kontakty SAB najdete v jejích{" "}
                <a className={styles.link} href={SAB_PRIVACY_INFORMATION_URL}>informacích o zpracování osobních údajů</a>.
                Tyto webové zásady klientskou dokumentaci SAB nenahrazují.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Správce nepředává webovou poptávku do klientské agendy SAB automaticky.
                Předání provádí ručně při navazujícím jednání o konkrétní finanční službě,
                v rozsahu potřebném pro tuto službu. Navazující zpracování se řídí
                příslušnou klientskou dokumentací SAB.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="udaje">
              <h2 data-route-reveal-item="title" id="udaje">2. Jaké údaje se zpracovávají a odkud pocházejí</h2>
              <ul className={styles.list}>
                <li data-route-reveal-group="row"><strong>Údaje, které sdělíte správci:</strong> jméno, telefon, e-mail,
                  zvolené téma, případná zpráva a preferovaný čas kontaktu.
                  Podle způsobu komunikace také obsah a čas navazujícího e-mailu či hovoru.</li>
                <li data-route-reveal-group="row"><strong>Souvislosti žádosti:</strong> stránka nebo článek,
                  ze kterého žádost posíláte, čas odeslání a identifikátor žádosti.
                  Při rezervaci konzultace také vybraný termín a způsob setkání.</li>
                <li data-route-reveal-group="row"><strong>Údaje z Testu jednoho příjmu při žádosti o odeslání:</strong>{" "}
                  čisté příjmy domácnosti, splátka hypotéky, ostatní nutné výdaje včetně dalších závazků,
                  dostupná rezerva, zvolené období a případný příjem při výpadku.
                  Z těchto údajů se vypočítávají oba scénáře, měsíční rozdíl a výdrž rezervy.
                  Způsob předání závisí na vámi zvoleném kroku popsaném v části 6.</li>
                <li data-route-reveal-group="row"><strong>Technické údaje při návštěvě:</strong> IP adresa,
                  čas a adresa požadavku, základní informace o prohlížeči či zařízení
                  a provozní nebo chybové záznamy potřebné pro doručení a zabezpečení webu.</li>
                <li data-route-reveal-group="row"><strong>Volitelné měření:</strong> po udělení souhlasu s analytikou údaje
                  o návštěvách a interakcích, včetně aktivního času a průchodu testem,
                  v rozsahu právě používaného nástroje popsaném na stránce{" "}
                  <LegalLink className={styles.link} href={privacy.cookie_policy_path}>Cookies a měření</LegalLink>.</li>
              </ul>
              <p data-route-reveal-item="body" className={styles.note}>
                Do webových formulářů neuvádějte rodné číslo, údaje o zdraví,
                kopie dokladů, čísla účtů, hesla ani jiné důvěrné nebo nadbytečné
                informace. Pro první kontakt nejsou potřebné.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Správce získává kontaktní údaje přímo od vás. Technické údaje vznikají
                při použití webu; údaje o potvrzení nebo doručení mohou vznikat
                také při zpracování žádosti a komunikace v používaných systémech.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="ucely">
              <h2 data-route-reveal-item="title" id="ucely">3. Proč se údaje používají a na jakém základě</h2>
              <ul className={styles.list}>
                <li data-route-reveal-group="row"><strong>Vyřízení vaší žádosti a domluva kontaktu.</strong>{" "}
                  Správce používá kontaktní údaje a souvislosti žádosti pro odpověď,
                  potvrzení přijetí, domluvu konzultace a navazující komunikaci k vámi
                  zvolenému tématu. Základem je oprávněný zájem podle čl. 6 odst. 1
                  písm. f) GDPR: vyřídit vaši žádost a navázat na komunikaci, kterou jste sami zahájili.</li>
                <li data-route-reveal-group="row"><strong>Provoz a bezpečnost webu.</strong>{" "}
                  Nezbytné technické záznamy slouží k doručení požadavků, ochraně
                  před zneužitím a řešení chyb nebo incidentů. Základem je oprávněný
                  zájem na dostupném a bezpečném webu podle čl. 6 odst. 1 písm. f) GDPR.</li>
                <li data-route-reveal-group="row"><strong>Doložení komunikace a ochrana práv.</strong>{" "}
                  Správce může uchovat potřebné části komunikace pro určení, výkon nebo
                  obhajobu konkrétních právních nároků. Základem je tento oprávněný
                  zájem podle čl. 6 odst. 1 písm. f) GDPR.</li>
                <li data-route-reveal-group="row"><strong>Vyřízení žádostí o uplatnění práv podle GDPR.</strong>{" "}
                  Kontaktní údaje, obsah žádosti a záznam o jejím vyřízení slouží
                  ke splnění povinností podle GDPR. Základem je právní povinnost
                  podle čl. 6 odst. 1 písm. c) GDPR.</li>
                <li data-route-reveal-group="row"><strong>Volitelná analytika.</strong>{" "}
                  {analyticsEnabled
                    ? "Ke statistice návštěvnosti a zlepšování obsahu slouží měření pouze po vašem souhlasu podle čl. 6 odst. 1 písm. a) GDPR."
                    : "Analytické měření je v aktuální konfiguraci vypnuté. Pokud bude zapnuto, spustí se pouze po vašem souhlasu podle čl. 6 odst. 1 písm. a) GDPR."}
                  {" "}Ukládání a čtení volitelných identifikátorů se opírá také o váš
                  souhlas podle § 89 odst. 3 zákona č. 127/2005 Sb.</li>
              </ul>
              <p data-route-reveal-item="body" className={styles.text}>
                Vyřízení poptávky není podmíněné souhlasem s analytikou ani souhlasem s odběrem newsletteru.
                Správce nepoužívá údaje z poptávky k automatickému přihlášení do marketingové rozesílky.
              </p>
              <p data-route-reveal-item="body" className={styles.note}>
                Proti zpracování na základě oprávněného zájmu můžete kdykoli vznést
                námitku z důvodů týkajících se vaší konkrétní situace. Napište na{" "}
                <a className={styles.link} href={`mailto:${privacy.privacy_contact_email}`}>{privacy.privacy_contact_email}</a>.
                Správce vaši námitku posoudí; ve zpracování může pokračovat pouze za podmínek čl. 21 GDPR.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="newsletter">
              <h2 data-route-reveal-item="title" id="newsletter">4. Newsletter a nabídky služeb</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Přihlášení k newsletteru na tomto webu zatím není spuštěné.
                Odesláním poptávky se k odběru nepřihlašujete.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Připravovaný newsletter bude obsahovat finanční tipy a nabídky
                služeb Davida Pokorného. Pro tento samostatný účel bude správcem David Pokorný.
                Přihlášení bude dobrovolné, oddělené od poptávky a založené na souhlasu
                podle čl. 6 odst. 1 písm. a) GDPR a § 7 odst. 2 zákona č. 480/2004 Sb.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Před zpřístupněním odběru zde správce doplní informace o evidenci a potvrzení
                přihlášení, době uchování a dodavatelích rozesílky. Souhlas půjde kdykoli
                odvolat odkazem v každém newsletteru nebo zprávou na kontaktní e-mail.
                Správce nezařadí stávající poptávky ani klientské kontakty SAB do odběru automaticky.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="poskytnuti">
              <h2 data-route-reveal-item="title" id="poskytnuti">5. Jaké údaje jsou potřebné pro odpověď</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Poskytnutí údajů v nezávazné poptávce není zákonnou ani smluvní povinností.
                Pole potřebná pro použití formuláře jsou označena jako povinná.
                Telefon slouží k domluvení hovoru, e-mail k potvrzení žádosti
                a navazující písemné komunikaci. Bez vyplnění povinných polí nelze daný formulář odeslat;
                můžete správci také zavolat nebo napsat přímo.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Dobrovolnou poznámku a další pole označená jako nepovinná nemusíte vyplnit.
                Pro zahájení konkrétní finanční služby mohou být nezbytné další údaje
                podle smlouvy nebo právních předpisů; příslušné informace dostanete při tomto dalším kroku.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="screening">
              <h2 data-route-reveal-item="title" id="screening">6. Orientační nástroje a automatické vyhodnocení</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Odpovědi a orientační výsledek článkového screeningu se vyhodnocují
                v prohlížeči. Při následné žádosti o kontakt se jednotlivé odpovědi
                ani výsledek neodesílají; předají se kontaktní údaje a související téma nebo článek.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Test jednoho příjmu počítá se zadanými částkami v paměti vašeho prohlížeče.
                Dokud výslovně nepožádáte o zaslání výsledku e-mailem nebo o osobní kontakt,
                jeho vstupy ani výsledek se správci neodesílají.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Při žádosti o zaslání výsledku se vaše jméno, e-mail a vstupy testu použijí
                pouze pro vytvoření a odeslání vyžádaného e-mailu s vypočteným souhrnem.
                Souhrn je součástí této e-mailové komunikace. Tímto krokem se nevytváří
                záznam kontaktu ani poptávka v CRM, nežádáte o zavolání a nepřihlašujete
                se k newsletteru.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Pokud samostatně požádáte o osobní kontakt, Davidovi Pokornému se pro vyřízení
                této žádosti předají jméno, e-mail, telefon, případně preferovaný čas a zpráva
                spolu se vstupy a výsledkem testu. Tyto údaje se uloží do chráněné evidence
                kontaktů a poptávek, aby bylo možné navázat na váš výsledek.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Zadané částky, kontaktní údaje ani výsledek Testu jednoho příjmu se do analytiky
                nepředávají. Případné měření kroků při použití testu se řídí vaší volbou
                analytického souhlasu.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Orientační výsledek vám pomáhá zvolit další krok. Nerozhoduje o poskytnutí
                finančního produktu, ceně nebo vašich právech a nenahrazuje individuální doporučení.
                Správce na základě webových nástrojů neprovádí výhradně automatizované rozhodování
                s právními nebo obdobně významnými účinky podle čl. 22 GDPR.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="uchovani">
              <h2 data-route-reveal-item="title" id="uchovani">7. Jak se určuje doba uchování</h2>
              <ul className={styles.list}>
                <li data-route-reveal-group="row"><strong>Webová žádost a běžná komunikace:</strong> po dobu jejího
                  vyřízení a navazující domluvy. Tento účel končí dokončením domluvených
                  kroků, ukončením jednání nebo přechodem do samostatné klientské agendy.</li>
                <li data-route-reveal-group="row"><strong>Doložení konkrétních právních nároků:</strong> jen potřebné
                  údaje po dobu příslušné promlčecí lhůty; při zahájeném sporu do jeho
                  pravomocného skončení a vypořádání souvisejících povinností.</li>
                <li data-route-reveal-group="row"><strong>Běžné technické provozní záznamy:</strong> nejdéle{" "}
                  {WEB_TECHNICAL_LOG_RETENTION_DAYS} dní od vzniku. Pro řešení konkrétní
                  chyby, incidentu nebo nároku lze oddělit jen nezbytný související
                  záznam; jeho další uchování se řídí následujícím pravidlem.</li>
                <li data-route-reveal-group="row"><strong>Záznamy o konkrétní chybě nebo bezpečnostním incidentu:</strong>{" "}
                  do vyřešení a uzavření dané chyby nebo incidentu. Pokud je záznam potřebný pro doložení nároku,
                  uplatní se výše uvedená nároková lhůta.</li>
                <li data-route-reveal-group="row"><strong>Žádosti podle GDPR:</strong> po dobu vyřízení. Nezbytný
                  doklad o vyřízení správce uchovává po dobu příslušné promlčecí lhůty
                  souvisejícího právního nároku; při stížnosti nebo zahájeném řízení
                  do pravomocného skončení příslušného řízení a vypořádání souvisejících povinností.</li>
                <li data-route-reveal-group="row"><strong>Analytické identifikátory a volba cookies:</strong>{" "}
                  jejich životnost a pravidla jsou na stránce{" "}
                  <LegalLink className={styles.link} href={privacy.cookie_policy_path}>Cookies a měření</LegalLink>.</li>
              </ul>
              <p data-route-reveal-item="body" className={styles.text}>
                Uchování pro právní nárok nebo povinnost není důvodem pro jiné použití údajů.
                Zpracování údajů v klientské agendě SAB se řídí její samostatnou dokumentací
                a příslušnými povinnostmi pro konkrétní finanční službu.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="prijemci">
              <h2 data-route-reveal-item="title" id="prijemci">8. Kdo může mít k údajům přístup</h2>
              <p data-route-reveal-item="body" className={styles.text}>Podle konkrétního účelu mohou údaje zpracovávat tyto kategorie příjemců:</p>
              <ul className={styles.list}>
                <li data-route-reveal-group="row">dodavatelé hostingu, serverové infrastruktury a technické podpory webu,</li>
                <li data-route-reveal-group="row">dodavatelé systémů pro doručení a evidenci žádostí, rezervaci konzultace
                  a e-mailovou komunikaci; web používá platformu Axiom a Axiom Mail,</li>
                {ga4Enabled ? <li data-route-reveal-group="row">Google Ireland Limited a její zapojení dodavatelé při použití
                  Google Analytics 4 po udělení analytického souhlasu,</li> : null}
                <li data-route-reveal-group="row">SAB servis s.r.o., pokud je předání potřebné pro vámi požadovanou
                  finanční službu; o navazujícím zpracování vás informuje její klientská dokumentace,</li>
                <li data-route-reveal-group="row">odborní poradci a příslušné orgány veřejné moci nebo dohledu,
                  pokud je předání nezbytné pro právní povinnost nebo konkrétní právní nárok.</li>
              </ul>
              <p data-route-reveal-item="body" className={styles.text}>
                Správce omezuje přístup podle účelu a potřebného rozsahu. Kontaktní údaje
                neprodává ani je nepředává jiným subjektům pro jejich vlastní marketing.
                Informace o konkrétním příjemci vašich údajů si můžete vyžádat na kontaktním e-mailu.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Správce využívá Axiom a Axiom Mail pro webové poptávky jako zpracovatele
                pro hosting, doručení a evidenci žádostí a komunikaci. Rozsah jeho
                pokynů je omezen na tyto účely a nezbytné provozní zabezpečení.
                Tyto pokyny neopravňují Axiom k použití obsahu poptávek pro vlastní
                marketing či jiné vlastní účely, k jejich spojování mezi zákazníky
                ani k trénování modelů.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="predavani">
              <h2 data-route-reveal-item="title" id="predavani">9. Předávání mimo Evropský hospodářský prostor</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                {ga4Enabled
                  ? "Při použití Google Analytics 4 může docházet ke zpracování údajů mimo Evropský hospodářský prostor, včetně USA."
                  : "Google Analytics 4 není v aktuální konfiguraci zapnuté. Jeho případné využití může zahrnovat zpracování údajů mimo Evropský hospodářský prostor, včetně USA."}
                {" "}Google popisuje použití rozhodnutí o odpovídající ochraně,
                včetně rámce EU–USA pro ochranu údajů u zapojených certifikovaných subjektů,
                a standardních smluvních doložek pro další případy v{" "}
                <a className={styles.link} href="https://business.safety.google/adsdatatransfers/">informacích o mezinárodním předávání údajů</a>.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Pro každé předání mimo EHP musí být splněny podmínky kapitoly V GDPR.
                Informace o konkrétním předání, použité záruce a možnosti získat její
                kopii si můžete vyžádat na kontaktním e-mailu. To se týká také případného
                přístupu dodavatelů nebo podpory ze třetích zemí.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="prava">
              <h2 data-route-reveal-item="title" id="prava">10. Vaše práva a jak je uplatnit</h2>
              <ul className={styles.list}>
                <li data-route-reveal-group="row">Právo získat informace a přístup k osobním údajům, včetně jejich kopie.</li>
                <li data-route-reveal-group="row">Právo na opravu nepřesných údajů a doplnění neúplných údajů.</li>
                <li data-route-reveal-group="row">Právo na výmaz a omezení zpracování, jsou-li splněny podmínky GDPR.</li>
                <li data-route-reveal-group="row">Právo na přenositelnost údajů, pokud se zpracovávají automatizovaně
                  na základě souhlasu nebo smlouvy a jsou splněny další podmínky GDPR.</li>
                <li data-route-reveal-group="row">Právo vznést námitku z důvodů vaší konkrétní situace proti zpracování
                  na základě oprávněného zájmu. Správce pak musí doložit převažující závažné
                  oprávněné důvody nebo nezbytnost pro právní nároky, jinak ve zpracování nesmí pokračovat.</li>
                <li data-route-reveal-group="row">Právo kdykoli odvolat souhlas. Odvolání neovlivňuje zákonnost
                  zpracování před jeho odvoláním. Analytický souhlas změníte v nastavení cookies.</li>
              </ul>
              <p data-route-reveal-item="body" className={styles.note}>
                Proti zpracování pro přímý marketing můžete vznést námitku kdykoli
                bez uvedení důvodu. Pro tento účel pak správce nesmí vaše údaje dál zpracovávat;
                při rozesílce na základě souhlasu můžete také jednoduše odvolat souhlas.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Napište správci na{" "}
                <a className={styles.link} href={`mailto:${privacy.privacy_contact_email}`}>{privacy.privacy_contact_email}</a>.
                O vyřízení vás správce informuje bez zbytečného odkladu, nejpozději do jednoho
                měsíce od obdržení žádosti. S ohledem na složitost a počet žádostí lze lhůtu
                prodloužit o další dva měsíce; v prvním měsíci vám správce sdělí prodloužení a jeho důvody.
                Při důvodných pochybnostech o totožnosti si může vyžádat přiměřené doplnění.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů,
                Pplk. Sochora 27, 170 00 Praha 7. Kontakty a postupy najdete na{" "}
                <a className={styles.link} href="https://uoou.gov.cz">uoou.gov.cz</a>.
                Žádosti ke klientské agendě SAB můžete adresovat přímo SAB prostřednictvím
                kontaktů v její dokumentaci; pokud je obdrží David Pokorný, pomůže je předat k vyřízení.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="cookies">
              <h2 data-route-reveal-item="title" id="cookies">11. Cookies a zabezpečení</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Web nepoužívá reklamní ani remarketingové cookies. Volitelné měření
                je oddělené od vyřízení poptávky a připravovaného newsletteru.
                Podrobnosti, příjemce a způsob změny souhlasu najdete na stránce{" "}
                <LegalLink className={styles.link} href={privacy.cookie_policy_path}>Cookies a měření</LegalLink>.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>
                K ochraně údajů správce používá přiměřená technická a organizační opatření,
                zejména omezení přístupu a zabezpečení komunikace a používaných systémů.
              </p>
            </section>

            <section data-route-reveal-group className={styles.section} aria-labelledby="zmeny">
              <h2 data-route-reveal-item="title" id="zmeny">12. Změny těchto zásad</h2>
              <p data-route-reveal-item="body" className={styles.text}>
                Správce upraví zásady při změně účelů, používaných služeb nebo právních požadavků.
                Informace o novém účelu poskytne před zahájením takového zpracování;
                je-li k němu potřeba souhlas, vyžádá si jej samostatně.
              </p>
              <p data-route-reveal-item="body" className={styles.text}>Aktualizováno: <time dateTime={WEB_PRIVACY_EFFECTIVE_DATE}>
                {formatPrivacyDate(WEB_PRIVACY_EFFECTIVE_DATE)}
              </time>.</p>
            </section>

            <div className={styles.backRow}>
              <LegalBackButton className={styles.backButton} />
            </div>
          </div>
        </Container>
      </main>
      <PublicSiteFooter />
    </>
  );
}
