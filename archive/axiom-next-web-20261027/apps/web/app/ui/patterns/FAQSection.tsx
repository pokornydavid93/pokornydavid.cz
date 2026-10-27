import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Stack from "../layout/Stack";
import Disclosure from "../primitives/Disclosure";
import s from "./patterns.module.css";

export type FAQItem = {
  id?: string;
  question: ReactNode;
  answer: ReactNode;
};

export type FAQSectionProps = {
  intro: ReactNode;
  items: readonly FAQItem[];
  action?: ReactNode;
  defaultExpandedIndex?: number;
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
};

export default function FAQSection({
  action,
  ariaLabelledBy,
  className,
  defaultExpandedIndex,
  id,
  intro,
  items,
}: FAQSectionProps) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={clsx(s.patternSection, className)}
      data-pattern="faq-section"
      id={id}
    >
      <Container size="content">
        <Stack gap="l">
          {intro}
          <div className={s.faqList}>
            {items.map((item, index) => (
              <Disclosure
                defaultExpanded={defaultExpandedIndex === index}
                key={item.id ?? `${index}-${String(item.question)}`}
                summary={item.question}
              >
                {item.answer}
              </Disclosure>
            ))}
          </div>
          {action ? <div className={s.patternAction}>{action}</div> : null}
        </Stack>
      </Container>
    </section>
  );
}
