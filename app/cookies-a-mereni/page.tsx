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
              <span>Právní informace</span>
            </div>
            <h1 className={styles.title}>Cookies &amp; měření</h1>
            <p className={styles.lead}>
              Na tomto webu nepoužíváme marketingové ani reklamní cookies. Měření
              návštěvnosti probíhá pouze v podobě základních statistických údajů.
            </p>
          </div>

          <section className={styles.section}>
            <h2>Základní principy</h2>
            <ul className={styles.list}>
              <li>nejsou spojeny s vaší identitou,</li>
              <li>nejsou ukládány do vašeho zařízení formou identifikačních cookies,</li>
              <li>
                nevyužívají služby jako Facebook Pixel, Google Ads, Sklik nebo remarketing.
              </li>
            </ul>
            <p className={styles.text}>
              Používáme cookieless analytiku, která zaznamenává pouze:
            </p>
            <ul className={styles.list}>
              <li>počet návštěv,</li>
              <li>zdroj návštěvy (Google),</li>
              <li>
                základní technické parametry pro zlepšení výkonu webu (například typ zařízení).
              </li>
            </ul>
            <p className={styles.text}>
              Tyto údaje nám pomáhají porozumět, jak je web používán, abychom jej mohli
              postupně vylepšovat.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Profilování a reklama</h2>
            <ul className={styles.list}>
              <li>Neprovádíme profilování, personalizaci ani cílení reklamy.</li>
              <li>Nepředáváme data marketingovým ani reklamním službám třetích stran.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Předávání třetím stranám</h2>
            <p className={styles.text}>
              Pokud používáme externí analytický nástroj, je provozován výhradně v EU nebo
              s anonymizací. Data nejsou využívána k marketingovým účelům.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Chcete-li měření vypnout úplně</h2>
            <p className={styles.text}>
              Stačí použít funkci „Do Not Track“ ve vašem prohlížeči — web ji automaticky
              respektuje.
            </p>
          </section>

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
