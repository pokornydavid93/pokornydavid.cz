import Container from "@/app/ui/container/Container";
import styles from "../legal.module.css";

export const metadata = {
  title: "Právní informace | David Pokorný",
  description:
    "Základní právní informace k poskytování finančních služeb a odkaz na detailní dokumentaci.",
};

const LEGAL_CONTENT = {
  page: {
    eyebrow: "Právní informace",
    title: "Právní informace",
    lead: "Shrnutí oprávnění k poskytování finančních služeb a odkaz na detailní dokumentaci.",
  },
  sections: {
    authorization: {
      title: "Oprávnění a registrace",
      paragraphs: [
        // TODO: doplň Dejvovo IČO
        "David Pokorný, IČO: 09016236 se sídlem (Tovární 1197/42a, 779 00, Olomouc), je vázaným zástupcem investičního/samostatného zprostředkovatele SAB servis s.r.o., IČ: 24704008, se sídlem Jungmannova 748/30, 110 00 Praha 1, registrovaného u České národní banky.",
        "Finanční služby prezentované na tomto webu jsou zprostředkovávány Davidem Pokorným v roli vázaného zástupce v rámci oprávnění společnosti SAB servis s.r.o. v těchto oblastech: investice dle zákona č. 256/2004 Sb., spotřebitelské úvěry dle zákona č. 257/2016 Sb., pojištění dle zákona č. 170/2018 Sb. a doplňkové penzijní spoření dle zákona č. 427/2011 Sb.",
      ],
      verify: {
        prefix:
          "Oprávnění a registraci je možné ověřit v Seznamu regulovaných a registrovaných subjektů finančního trhu České národní banky na",
        linkText: "www.cnb.cz",
        href: "https://www.cnb.cz",
        suffix: ".",
      },
    },
    documentation: {
      title: "Detailní právní dokumentace",
      paragraphs: [
        {
          prefix:
            "Detailní právní informace k nabízeným službám a produktům (včetně reklamačního řádu, možnosti podání stížnosti, řešení sporů, orgánu dohledu, udržitelnosti atd.) najdete na",
          linkText: "https://sabservis.cz/informace",
          href: "https://sabservis.cz/informace",
          suffix: ".",
        },
      ],
    },
  },
} as const;

const LegalInfoPage = () => {
  const { page, sections } = LEGAL_CONTENT;

  return (
    <main className={styles.legalMain}>
      <Container maxWidth={960}>
        <div className={styles.legalWrap}>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              <span>{page.eyebrow}</span>
            </div>
            <h1 className={styles.title}>{page.title}</h1>
            <p className={styles.lead}>{page.lead}</p>
          </div>

          <section className={styles.section}>
            <h2>{sections.authorization.title}</h2>

            {sections.authorization.paragraphs.map((text, i) => (
              <p key={i} className={styles.text}>
                {text}
              </p>
            ))}

            <p className={styles.text}>
              {sections.authorization.verify.prefix}{" "}
              <a
                className={styles.link}
                href={sections.authorization.verify.href}
                target="_blank"
                rel="noreferrer"
              >
                {sections.authorization.verify.linkText}
              </a>
              {sections.authorization.verify.suffix}
            </p>
          </section>

        <section className={styles.section}>
          <h2>{sections.documentation.title}</h2>

          {sections.documentation.paragraphs.map((p, i) => (
            <p key={i} className={styles.text}>
                {p.prefix}{" "}
                <a
                  className={styles.link}
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.linkText}
                </a>
                {p.suffix}
              </p>
            ))}
          </section>

          <div className={styles.backRow}>
            <a className={styles.backButton} href="/">
              ← Zpět na hlavní stránku
            </a>
          </div>
        </div>
      </Container>
    </main>
  );
};

export default LegalInfoPage;
