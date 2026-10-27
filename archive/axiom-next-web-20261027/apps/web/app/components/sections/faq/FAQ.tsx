import { Phone, Mail, MessageCircle } from "lucide-react";
import Container from "@/app/ui/container/Container";
import s from "./faq.module.css";
import RevealClient from "@/app/ui/animations/RevealClient";
import FAQAccordion from "./FAQAccordion.client";
import FAQCTAButton from "./FAQCTAButton.client";
import FooterOfficeMapButton from "../footer/FooterOfficeMapButton.client";

type FaqItem = {
  question: string;
  answer: string;
};

const faqs: FaqItem[] = [
  {
    question: "Jak probíhá první konzultace?",
    answer:
      "Úvodní hovor je nezávazný. Krátce projdeme vaši situaci, cíle a to, co aktuálně řešíte. Pokud bude dávat smysl pokračovat, domluvíme se na dalším kroku.",
  },
  {
    question: "Musím už vědět, co přesně potřebuji?",
    answer:
      "Nemusíte. Často stačí vědět, že chcete mít ve financích větší přehled. Společně si ujasníme, co je důležité řešit teď a co může počkat.",
  },
  {
    question: "Co si z první konzultace odnesu?",
    answer:
      "Konzultace je zaměřená na pochopení vaší situace a návrh dalšího postupu. Cílem je, abyste přesně věděli, jaké možnosti máte a proč dávají smysl.",
  },
  {
    question: "Kolik stojí úvodní konzultace a další spolupráce?",
    answer:
      "Úvodní konzultace je zdarma. U dalších kroků vždy předem vysvětlím, co bude součástí spolupráce a jaká bude odměna — transparentně a bez překvapení.",
  },
  {
    question: "Co když už mám hypotéku, pojištění nebo smlouvy jinde?",
    answer:
      "To je běžné. Podíváme se, co už máte nastavené, co dává smysl ponechat a kde může být prostor pro úpravu. Cílem není měnit vše, ale dát věci do souvislostí.",
  },
];

const FAQ = () => {
  // ✅ SEO: FAQPage structured data (must match visible FAQs)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className={s.faqCont} id="faq" data-surface-tone="dark">
      {/* ✅ JSON-LD rendered on server (SSR) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className={s.bgPattern} aria-hidden />

      <Container className={s.inner}>
        <div className={s.header}>
          <RevealClient as="p" from="left" className={s.eyebrow} delay={0.05}>
            Jasně a stručně
          </RevealClient>

          <RevealClient as="h2" from="left" delay={0.12}>
            Odpovědi na <span className={s.highlight}>vaše</span> otázky
          </RevealClient>

          <RevealClient as="p" from="left" delay={0.18}>
            Co vás nejčastěji zajímá před začátkem spolupráce. Klikněte a
            otevřete detail.
          </RevealClient>
        </div>

        <div className={s.grid}>
          <FAQAccordion faqs={faqs} />

          <RevealClient
            as="aside"
            from="left"
            className={s.contactCard}
            delay={0.22}
          >
            <div className={s.contactOverlay} aria-hidden />

            <div className={s.contactContent}>
              <RevealClient
                as="div"
                from="left"
                className={s.iconBadge}
                delay={0.06}
              >
                <MessageCircle />
              </RevealClient>

              <RevealClient as="h3" from="left" delay={0.12}>
                Máte dotaz? Rád vám pomohu
              </RevealClient>

              <RevealClient as="p" from="left" delay={0.18}>
                Napište nebo zavolejte — domluvíme si konzultaci a probereme, co
                je pro vaši situaci nejlepší.
              </RevealClient>

              <RevealClient as="div" from="left" delay={0.24}>
                <FAQCTAButton className={s.cta} label="Domluvit konzultaci">
                  Domluvit konzultaci
                </FAQCTAButton>
              </RevealClient>

              <div className={s.contactList}>
                <RevealClient as="div" from="left" delay={0.30}>
                  <Phone size={18} />
                  <a href="tel:+420731830897">+420 731 830 897</a>
                </RevealClient>

                <RevealClient as="div" from="left" delay={0.36}>
                  <Mail size={18} />
                  <a href="mailto:info@pokornydavid.cz">
                    info@pokornydavid.cz
                  </a>
                </RevealClient>

                <RevealClient as="div" from="left" delay={0.42}>
                  <FooterOfficeMapButton
                    as="div"
                    itemClassName={s.officeMapItem}
                    buttonClassName={s.officeMapButton}
                  />
                </RevealClient>
              </div>
            </div>
          </RevealClient>
        </div>
      </Container>
    </section>
  );
};

export default FAQ;
