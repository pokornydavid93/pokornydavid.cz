"use client";

import { useState } from "react";
import type { HomeFaqItem } from "@/lib/homepage/types";
import s from "./HomeFaqAccordion.module.css";

type HomeFaqAccordionProps = {
  idPrefix: string;
  items: readonly HomeFaqItem[];
};

export default function HomeFaqAccordion({
  idPrefix,
  items,
}: HomeFaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    items.length > 0 ? 0 : null,
  );

  return (
    <div className={s.accordion} data-home-faq-accordion>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `${idPrefix}-${item.id}-panel`;
        const triggerId = `${idPrefix}-${item.id}-trigger`;

        return (
          <div
            className={s.item}
            data-cursor="link"
            data-cursor-click-target="[data-home-faq-trigger]"
            data-cursor-frame-target="[data-home-faq-indicator]"
            data-cursor-split-core
            data-faq-reveal-row
            data-home-faq-item={item.id}
            data-open={isOpen}
            key={item.id}
          >
            <h3 className={s.heading}>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className={s.trigger}
                data-home-faq-trigger
                id={triggerId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                type="button"
              >
                <span className={s.question} data-home-faq-question>
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={s.indicator}
                  data-home-faq-indicator
                  data-open={isOpen}
                />
              </button>
            </h3>
            <div
              aria-hidden={!isOpen}
              aria-labelledby={triggerId}
              className={s.panel}
              data-open={isOpen}
              id={panelId}
              inert={isOpen ? undefined : true}
              role="region"
            >
              <div className={s.panelInner}>
                <p className={s.answer} data-home-faq-answer>
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
