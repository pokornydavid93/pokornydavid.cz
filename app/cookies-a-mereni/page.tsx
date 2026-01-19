import Link from "next/link";
import Container from "@/app/ui/container/Container";
import styles from "../legal.module.css";
import LegalBackButton from "@/app/ui/legal/LegalBackButton.client";

export const metadata = {
  title: "Cookies a měření | David Pokorný",
  description:
    "Informace o cookies a způsobu měření návštěvnosti na webu Davida Pokorného.",
};

const CookiesPage = () => {
  return (
    <main className={styles.legalMain}>
      <Container maxWidth={960}>
        <div className={styles.legalWrap}>
          <div className={styles.backRow}>
            <LegalBackButton className={styles.backButton} />
          </div>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              <span>Cookies</span>
            </div>
            <h1 className={styles.title}>Cookies &amp; měření</h1>
            <p className={styles.lead}>
              Na tomto webu nepoužíváme marketingové ani reklamní cookies. Po vašem
              souhlasu používáme analytické cookies (Google Analytics 4) pro měření
              návštěvnosti a zlepšování webu.
            </p>
          </div>

          <section className={styles.section}>
            <h2>Co měříme</h2>
            <ul className={styles.list}>
              <li>počet návštěv a zobrazení stránek,</li>
              <li>zdroj návštěvy (např. Google),</li>
              <li>
                základní technické informace (např. zařízení / prohlížeč) pro zlepšení
                výkonu webu.
              </li>
            </ul>
            <p className={styles.text}>
              Tyto údaje nám pomáhají porozumět tomu, jak je web používán, a zlepšovat
              jeho obsah i výkon.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Co neděláme</h2>
            <ul className={styles.list}>
              <li>
                žádný remarketing ani reklamní systémy (Google Ads, Sklik, Facebook Pixel),
              </li>
              <li>žádné profilování ani personalizace reklamy.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Souhlas a změna nastavení</h2>
            <p className={styles.text}>
              Analytické cookies se aktivují až po vašem souhlasu. Volbu můžete kdykoli
              změnit přes ikonu cookies vpravo dole.
            </p>
            <p className={styles.text}>
              Souhlas je dobrovolný a odmítnutí nemá vliv na fungování webu.
            </p>
            <p className={styles.text}>
              Vaše volba se ukládá, abychom ji nemuseli zobrazovat při každé návštěvě.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Předávání třetím stranám</h2>
            <p className={styles.text}>
              Poskytovatelem analytiky je Google Analytics 4. Data využíváme pouze ke
              statistickým účelům a ke zlepšování webu, nikoli k marketingu.
            </p>
          </section>
          <p className={styles.text}>
            Více informací o zpracování osobních údajů najdete v{" "}
            <Link href="/zasady-zpracovani-osobnich-udaju">
              Zásadách zpracování osobních údajů
            </Link>
            .
          </p>

          <div className={styles.backRow}>
            <LegalBackButton
              className={styles.backButton}
              label="← Zpět na hlavní stránku"
            />
          </div>
        </div>
      </Container>
    </main>
  );
};

export default CookiesPage;
