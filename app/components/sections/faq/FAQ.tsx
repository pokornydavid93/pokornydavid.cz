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

type FaqItem = {
  question: string;
  answer: string;
};

const faqs: FaqItem[] = [
  {
    question: "Jak probíhá první konzultace?",
    answer:
      "Úvodní hovor je nezávazný. Projdeme vaši situaci, cíle a to, co právě potřebujete řešit. Zjistíte, jak pracuji, bez tlaku na jakýkoli produkt.",
  },
  {
    question: "Můžete mi zpracovat kompletní finanční plán?",
    answer:
      "Ano. Zmapujeme tok peněz, rezervy, investice i pojištění a připravím plán s jasnými kroky, prioritami a odůvodněním.",
  },
  {
    question: "Jak vybíráte konkrétní produkty a řešení?",
    answer:
      "Začínám cíli a potřebami, ne produkty. Srovnám dostupné možnosti, vysvětlím rozdíly a společně vybereme variantu, která vám sedí.",
  },
  {
    question: "Kolik stojí vaše služby?",
    answer:
      "Úvodní konzultace je zdarma. Další kroky nacením transparentně podle rozsahu práce, vždy předem a bez překvapení.",
  },
  {
    question: "Proč řešit finance právě se mnou?",
    answer:
      "Držím kurz podle toho, co je pro vás důležité. Mluvím srozumitelně, stavím na dlouhodobém partnerství a hlídám, aby plán držel krok s vaším životem.",
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
          <p className={s.eyebrow}>Jasně a stručně</p>
          <div>
            <h2>
              Odpovědi na{" "}
              <span className={s.highlight}>vaše</span> otázky
            </h2>
            <p>
              Co vás nejčastěji zajímá před začátkem spolupráce. Klikněte a
              otevřete detail.
            </p>
          </div>
        </div>

        <div className={s.grid}>
          <div className={s.accordion}>
            {faqs.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.question}
                  className={`${s.item} ${isOpen ? s.open : ""}`}
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
                    <div className={s.panel}>
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <aside className={s.contactCard}>
            <div className={s.contactOverlay} aria-hidden />
            <div className={s.contactContent}>
              <div className={s.iconBadge}>
                <MessageCircle />
              </div>
              <h3>Máte dotaz? Rád vám pomohu</h3>
              <p>
                Napište nebo zavolejte — domluvíme si konzultaci a probereme,
                co je pro vaši situaci nejlepší.
              </p>
              <Button
                variant="cta"
                className={s.cta}
                onClick={() => openLeadForm()}
              >
                Sjednat konzultaci
              </Button>

              <div className={s.contactList}>
                <div>
                  <Phone size={18} />
                  <a href="tel:+420731830897">+420 731 830 897</a>
                </div>
                <div>
                  <Mail size={18} />
                  <a href="mailto:info@pokornydavid.cz">
                    info@pokornydavid.cz
                  </a>
                </div>
                <div>
                  <MapPin size={18} />
                  <span>Praha & online</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
};

export default FAQ;
