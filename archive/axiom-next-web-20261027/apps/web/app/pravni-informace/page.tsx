import type { Metadata } from "next";
import {
  PublicSiteFooter,
  PublicSiteHeader,
} from "@/app/_components/PublicSiteChrome";
import Container from "@/app/ui/container/Container";
import { cnbRegistryUrl } from "@/app/content/multipage";
import styles from "../legal.module.css";
import LegalBackButton from "@/app/ui/legal/LegalBackButton.client";
import { createPageMetadata } from "@/lib/seo";

const PAGE_TITLE = "Právní informace";
const PAGE_DESCRIPTION =
  "Základní právní informace k poskytování finančních služeb a odkaz na podrobnou dokumentaci.";

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: "/pravni-informace/",
});

const LEGAL_CONTENT = {
  page: {
    eyebrow: "Právní informace",
    title: "Právní informace",
    lead: "Identifikace Davida Pokorného, rozsah jeho oprávnění a odkazy na ověření registrace i podrobnou dokumentaci.",
  },
  sections: {
    authorization: {
      title: "Oprávnění a registrace",
      paragraphs: [
        "David Pokorný, IČO 09016236, se sídlem Za Zbrojnicí 446, 784 01 Červenka, působí jako vázaný zástupce společnosti SAB servis s.r.o., IČO 24704008, se sídlem Jungmannova 748/30, 110 00 Praha 1, která je registrována u České národní banky.",
        "Finanční služby prezentované na tomto webu David Pokorný zprostředkovává v rámci oprávnění společnosti SAB servis s.r.o. zejména v oblastech investic podle zákona č. 256/2004 Sb., spotřebitelských úvěrů podle zákona č. 257/2016 Sb., pojištění podle zákona č. 170/2018 Sb. a doplňkového penzijního spoření podle zákona č. 427/2011 Sb.",
      ],
      verify: {
        prefix:
          "Oprávnění Davida Pokorného si můžete ověřit v Seznamu regulovaných a registrovaných subjektů finančního trhu České národní banky",
        linkText: "JERRS ČNB",
        href: cnbRegistryUrl,
        suffix: " přímo v jeho záznamu (David Pokorný, IČO 09016236).",
      },
    },
    documentation: {
      title: "Podrobná právní dokumentace",
      paragraphs: [
        {
          prefix:
            "Podrobné právní informace k nabízeným službám a produktům (včetně reklamačního řádu, možnosti podání stížnosti, řešení sporů, orgánu dohledu a udržitelnosti) najdete v",
          linkText: "právní dokumentaci společnosti SAB servis",
          href: "https://sabservis.cz/informace",
          suffix: ".",
        },
      ],
    },
    disclaimer: {
      title: "Povaha informací na webu",
      paragraphs: [
        "Informace uvedené na tomto webu mají obecný informační charakter a nepředstavují investiční doporučení ani individuální finanční, investiční, úvěrové nebo pojistné poradenství.",
        "Konkrétní doporučení vám David Pokorný může poskytnout až na základě individuálního posouzení vaší situace, cílů, znalostí, zkušeností a dalších relevantních okolností.",
      ],
    },
  },
} as const;

const LegalInfoPage = () => {
  const { page, sections } = LEGAL_CONTENT;

  return (
    <>
      <PublicSiteHeader
        currentPath="/pravni-informace/"
        initialTheme="light"
      />
      <main data-route-reveal-root data-route-reveal-profile="staged" id="main-content" tabIndex={-1} className={styles.legalMain} data-surface-tone="light">
      <Container maxWidth={960}>
        <div className={styles.legalWrap}>
          <div className={styles.backRow}></div>
          <div className={styles.titleBlock} data-route-reveal-group>
            <div className={styles.eyebrow} data-route-reveal-item="meta">
              <span className={styles.eyebrowDot} />
              <span>{page.eyebrow}</span>
            </div>
            <h1 className={styles.title} data-route-reveal-item="title">{page.title}</h1>
            <p className={styles.lead} data-route-reveal-item="body">{page.lead}</p>
          </div>

          <section data-route-reveal-group className={styles.section}>
            <h2 data-route-reveal-item="title">{sections.authorization.title}</h2>

            {sections.authorization.paragraphs.map((text, i) => (
              <p data-route-reveal-item="body" key={i} className={styles.text}>
                {text}
              </p>
            ))}

            <p data-route-reveal-item="body" className={styles.text}>
              {sections.authorization.verify.prefix}{" "}
              <a
                className={styles.link}
                href={sections.authorization.verify.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {sections.authorization.verify.linkText}
              </a>
              {sections.authorization.verify.suffix}
            </p>
          </section>

          <section data-route-reveal-group className={styles.section}>
            <h2 data-route-reveal-item="title">{sections.documentation.title}</h2>

            {sections.documentation.paragraphs.map((p, i) => (
              <p data-route-reveal-item="body" key={i} className={styles.text}>
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

          <section data-route-reveal-group className={styles.section}>
            <h2 data-route-reveal-item="title">{sections.disclaimer.title}</h2>
            {sections.disclaimer.paragraphs.map((text, i) => (
              <p data-route-reveal-item="body" key={i} className={styles.text}>
                {text}
              </p>
            ))}
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
};

export default LegalInfoPage;
