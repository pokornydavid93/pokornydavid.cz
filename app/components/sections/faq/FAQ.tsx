'use client';

import { useState } from "react";
import {
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import s from "./faq.module.css";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { Reveal } from "@/app/ui/animations/Reveal";

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
  const [openIndex, setOpenIndex] = useState<number>(0);
  const { openLeadForm } = useLeadFormModal();

  return (
    <section className={s.faqCont} id="faq">
      <div className={s.bgPattern} aria-hidden />

      <Container className={s.inner}>
        <div className={s.header}>
          <Reveal as="p" from="left" className={s.eyebrow} delay={0.05}>
            Jasně a stručně
          </Reveal>

   
            <Reveal as="h2" from="left" delay={0.12}>
              Odpovědi na <span className={s.highlight}>vaše</span> otázky
            </Reveal>

            <Reveal as="p" from="left" delay={0.18}>
              Co vás nejčastěji zajímá před začátkem spolupráce. Klikněte a
              otevřete detail.
            </Reveal>
       
        </div>

        <div className={s.grid}>
          <div className={s.accordion}>
            {faqs.map((item, idx) => {
              const isOpen = openIndex === idx;

              return (
                <Reveal
                  key={item.question}
                  as="div"
                  from="left"
                  className={`${s.item} ${isOpen ? s.open : ""}`}
                  delay={0.22}
                  stagger={0.06}
                  index={idx}
                >
                  <button
                    type="button"
                    className={s.trigger}
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`${s.chevron} ${isOpen ? s.rotated : ""}`}
                      size={20}
                    />
                  </button>

                  {isOpen && (
                    <Reveal as="div" from="left" className={s.panel} delay={0.08}>
                      <p>{item.answer}</p>
                    </Reveal>
                  )}
                </Reveal>
              );
            })}
          </div>

          <Reveal as="aside" from="left" className={s.contactCard} delay={0.22}>
            <div className={s.contactOverlay} aria-hidden />

            <div className={s.contactContent}>
              <Reveal as="div" from="left" className={s.iconBadge} delay={0.06}>
                <MessageCircle />
              </Reveal>

              <Reveal as="h3" from="left" delay={0.12}>
                Máte dotaz? Rád vám pomohu
              </Reveal>

              <Reveal as="p" from="left" delay={0.18}>
                Napište nebo zavolejte — domluvíme si konzultaci a probereme, co
                je pro vaši situaci nejlepší.
              </Reveal>

              <Reveal as="div" from="left" delay={0.24}>
                <Button
                  variant="cta"
                  className={s.cta}
                  onClick={() => openLeadForm()}
                >
                  Probrat vaši situaci
                </Button>
              </Reveal>

              <div className={s.contactList}>
                <Reveal as="div" from="left" delay={0.30}>
                  <Phone size={18} />
                  <a href="tel:+420731830897">+420 731 830 897</a>
                </Reveal>

                <Reveal as="div" from="left" delay={0.36}>
                  <Mail size={18} />
                  <a href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</a>
                </Reveal>

                <Reveal as="div" from="left" delay={0.42}>
                  <MapPin size={18} />
                  <span>Praha & online</span>
                </Reveal>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
};

export default FAQ;
