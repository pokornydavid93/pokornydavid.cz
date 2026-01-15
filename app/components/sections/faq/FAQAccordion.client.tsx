"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import s from "./faq.module.css";
import RevealClient from "@/app/ui/animations/RevealClient";

type FaqItem = {
  question: string;
  answer: string;
};

type FAQAccordionProps = {
  faqs: FaqItem[];
};

const FAQAccordion = ({ faqs }: FAQAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className={s.accordion}>
      {faqs.map((item, idx) => {
        const isOpen = openIndex === idx;

        return (
          <RevealClient
            key={item.question}
            as="div"
            from="left"
            className={`${s.item} ${isOpen ? s.open : ""}`}
            delay={0.22}
            stagger={0.06}
            index={idx}
            debug
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
              <RevealClient
                as="div"
                from="left"
                className={s.panel}
                delay={0.08}
              >
                <p>{item.answer}</p>
              </RevealClient>
            )}
          </RevealClient>
        );
      })}
    </div>
  );
};

export default FAQAccordion;
