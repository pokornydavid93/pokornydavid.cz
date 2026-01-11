import Link from "next/link";
import Container from "@/app/ui/container/Container";
import styles from "../legal.module.css";

export const metadata = {
  title: "Zásady zpracování osobních údajů | David Pokorný",
  description:
    "Jak pracujeme s osobními údaji při domluvě úvodního hovoru a finanční konzultace.",
};

const PrivacyPolicyPage = () => {
  return (
    <main className={styles.legalMain}>
      <Container maxWidth={960}>
        <div className={styles.legalWrap}>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              <span>Právní informace</span>
            </div>
            <h1 className={styles.title}>Zásady zpracování osobních údajů</h1>
            <p className={styles.lead}>
              Tento dokument vysvětluje, jak nakládáme s osobními údaji
              návštěvníků, kteří nám zanechají kontakt přes webový formulář za
              účelem domluvy úvodního hovoru.
            </p>
          </div>

          <section className={styles.section}>
            <h2>1) Kdo je kdo</h2>
            <ul className={styles.pillList}>
              <li className={styles.pill}>
                <p className={styles.pillTitle}>Správce</p>
                <p className={styles.pillDesc}>
                  SAB servis s.r.o. (IČ 24704008). Určuje účel a způsob
                  zpracování osobních údajů.
                </p>
              </li>
              <li className={styles.pill}>
                <p className={styles.pillTitle}>Vázaný zástupce správce</p>
                <p className={styles.pillDesc}>
                  David Pokorný. Zpracovává údaje zájemců při domluvě
                  konzultace a poskytování služby.
                </p>
              </li>
              <li className={styles.pill}>
                <p className={styles.pillTitle}>Podzpracovatel – technický provoz</p>
                <p className={styles.pillDesc}>
                  Externí technická podpora. Zajišťuje údržbu, zabezpečení a
                  provoz webu. Přístup pouze v nezbytných případech, logovaný.
                </p>
              </li>
              <li className={styles.pill}>
                <p className={styles.pillTitle}>Infrastruktura (hosting)</p>
                <p className={styles.pillDesc}>
                  Server v EU. Poskytuje provozní prostředí, bez přístupu k
                  obsahu dat.
                </p>
              </li>
            </ul>
            <p className={styles.note}>
              Zdroj dat: výhradně přímo od vás (formulář, e-mail, telefon).
            </p>
          </section>

          <section className={styles.section}>
            <h2>2) Jaké údaje zpracováváme a proč</h2>
            <p className={styles.text}>Rozsah (minimální):</p>
            <ul className={styles.list}>
              <li>jméno,</li>
              <li>příjmení,</li>
              <li>e-mail a/nebo telefon,</li>
              <li>stručná poznámka (volitelně, např. „řeším bydlení / pojištění apod.“).</li>
            </ul>
            <div className={styles.divider} />
            <p className={styles.text}>Účel zpracování:</p>
            <ul className={styles.list}>
              <li>domluva nezávazného úvodního hovoru,</li>
              <li>orientační posouzení, zda má smysl pokračovat ve spolupráci.</li>
            </ul>
            <p className={styles.text}>Právní titul:</p>
            <ul className={styles.list}>
              <li>
                oprávněný zájem správce (čl. 6 odst. 1 písm. f GDPR) – odpověď
                na vaši poptávku.
              </li>
            </ul>
            <p className={styles.text}>Automatizované rozhodování: neprovádíme.</p>
          </section>

          <section className={styles.section}>
            <h2>3) Doba uchování</h2>
            <ul className={styles.list}>
              <li>
                Pokud nevznikne spolupráce → údaje uchováme max. 6 měsíců, poté je smažeme
                nebo anonymizujeme.
              </li>
              <li>
                Pokud vznikne spolupráce → údaje se dále zpracovávají v interních systémech
                správce (např. myDock / myPlan).
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4) Příjemci a předávání</h2>
            <ul className={styles.list}>
              <li>Vázaný zástupce správce (David Pokorný)</li>
              <li>Technická podpora (provoz a údržba webu)</li>
              <li>Hosting v rámci EU</li>
              <li>Nepředáváme údaje marketingovým třetím stranám.</li>
              <li>Předávání mimo EU/EHP neprobíhá.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5) Bezpečnost</h2>
            <ul className={styles.list}>
              <li>Veškerá komunikace probíhá přes HTTPS.</li>
              <li>Přístupy jsou role-based a logované.</li>
              <li>Zálohy jsou šifrované a uchovávané odděleně.</li>
              <li>Server je pravidelně aktualizován a monitorován.</li>
              <li>Logy neobsahují nadbytečné osobní údaje.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>6) Vaše práva</h2>
            <p className={styles.text}>Máte právo požadovat:</p>
            <ul className={styles.list}>
              <li>přístup k údajům,</li>
              <li>opravu nepřesností,</li>
              <li>výmaz,</li>
              <li>omezení zpracování,</li>
              <li>námitku proti zpracování,</li>
              <li>přenositelnost údajů (pokud je relevantní).</li>
            </ul>
            <p className={styles.text}>
              Žádosti o uplatnění práv:{" "}
              <a className={styles.link} href="mailto:info@pokornydavid.cz">
                info@pokornydavid.cz
              </a>
              .
            </p>
            <p className={styles.text}>
              Dozorový orgán: ÚOOÚ (
              <a className={styles.link} href="https://www.uoou.gov.cz" target="_blank" rel="noreferrer">
                www.uoou.gov.cz
              </a>
              ).
            </p>
          </section>

          <section className={styles.section}>
            <h2>7) Cookies & měření</h2>
            <p className={styles.text}>
              Nepoužíváme marketingové ani remarketingové cookies. Probíhá pouze
              základní anonymizované měření návštěvnosti.
            </p>
            <p className={styles.text}>
              Podrobnosti najdete na stránce{" "}
              <Link className={styles.link} href="/cookies-a-mereni">
                Cookies &amp; měření
              </Link>
              .
            </p>
          </section>

          <section className={styles.section}>
            <h2>8) Změny dokumentu</h2>
            <p className={styles.text}>
              Tento dokument může být aktualizován při změně poskytovatele
              služeb nebo technického řešení.
            </p>
            <p className={styles.text}>Účinné od: 11. 1. 2026</p>
          </section>

          <div className={styles.backRow}>
            <Link className={styles.backButton} href="/">
              ← Zpět na hlavní stránku
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
};

export default PrivacyPolicyPage;
