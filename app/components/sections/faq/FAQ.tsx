import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import Container from "@/app/ui/container/Container";
import s from "./faq.module.css";
import RevealClient from "@/app/ui/animations/RevealClient";
import FAQAccordion from "./FAQAccordion.client";
import FAQCTAButton from "./FAQCTAButton.client";

type FaqItem = {
  question: string;
  answer: string;
};

const faqs: FaqItem[] = [
  {
    question: "Jak probíhá první konzultace?",
    answer:
      "Úvodní hovor je nezávazný. Krátce projdeme vaši situaci a cíle, ujasníme si priority a domluvíme se na dalším kroku. Bez tlaku na produkt a bez složitých výrazů.",
  },
  {
    question: "Umíte připravit finanční plán?",
    answer:
      "Ano. Na základě vašich příjmů, výdajů, rezerv a stávajících smluv připravím srozumitelný plán s prioritami a konkrétními kroky. Vždy tak, aby dával smysl v běžném životě. Konkrétní návrhy vždy vychází z individuální situace.",
  },
  {
    question: "Jak vybíráte konkrétní řešení?",
    answer:
      "Začínám tím, co je pro vás důležité – cíle, rizika a časový horizont. Srovnám možnosti, vysvětlím rozdíly a doporučím varianty, které dávají smysl. Finální volba je vždy na vás.",
  },
  {
    question: "Kolik stojí spolupráce?",
    answer:
      "Úvodní konzultace je zdarma. U dalších kroků vždy předem řeknu, co bude součástí práce a jaká bude odměna – transparentně a bez překvapení.",
  },
  {
    question: "V čem je váš přístup jiný?",
    answer:
      "Mluvím srozumitelně a začínám u vašich cílů, ne u produktů. Spolupráci vnímám jako dlouhodobou péči – plán pravidelně kontrolujeme a upravujeme podle toho, jak se vyvíjí váš život.",
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
    <section className={s.faqCont} id="faq">
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
                <FAQCTAButton className={s.cta}>
                  Probrat vaši situaci
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
                  <MapPin size={18} />
                  <span>Za zbrojnici 446, 784 01 Červenka</span>
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
