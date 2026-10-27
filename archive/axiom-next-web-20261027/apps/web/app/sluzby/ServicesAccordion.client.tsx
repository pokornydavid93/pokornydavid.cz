"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { createLeadHref } from "@/lib/leads/lead-contract";
import s from "./servicesPage.module.css";

export type ServicesAccordionItem = {
  id: string;
  number: string;
  label: string;
  title: string;
  description: string;
  serviceSummary: readonly string[];
  services: readonly {
    id: string;
    title: string;
    description: string;
    ctaLabel: string;
    href: string;
  }[];
};

type ServicesAccordionProps = {
  items: readonly ServicesAccordionItem[];
};

function getGroupIdFromHash(
  items: readonly ServicesAccordionItem[],
  hash: string,
) {
  const id = hash.replace(/^#/, "");
  return items.some((item) => item.id === id) ? id : null;
}

export default function ServicesAccordion({
  items,
}: ServicesAccordionProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const syncActiveGroup = () => {
      const groupId = getGroupIdFromHash(items, window.location.hash);
      if (groupId) setActiveId(groupId);
    };

    syncActiveGroup();
    window.addEventListener("hashchange", syncActiveGroup);
    window.addEventListener("popstate", syncActiveGroup);

    return () => {
      window.removeEventListener("hashchange", syncActiveGroup);
      window.removeEventListener("popstate", syncActiveGroup);
    };
  }, [items]);

  const selectGroup = (id: string) => {
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className={s.catalogAccordion} data-services-accordion>
      <div className={s.accordionList}>
        {items.map((item) => {
          const isOpen = item.id === activeId;
          const panelId = `${item.id}-panel`;
          const triggerId = `${item.id}-trigger`;
          const serviceCountLabel =
            item.services.length === 1
              ? "1 SLUŽBA"
              : item.services.length < 5
                ? `${item.services.length} SLUŽBY`
                : `${item.services.length} SLUŽEB`;

          return (
            <section
              className={s.accordionItem}
              data-route-reveal-group="row"
              data-services-accordion-item
              data-open={isOpen ? "true" : "false"}
              id={item.id}
              key={item.id}
            >
              <span
                aria-hidden="true"
                className={s.accordionRule}
                data-route-reveal-rule
                data-services-accordion-rule
              />
              <div data-services-accordion-content>
                <h3 className={s.accordionHeading}>
                  <button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className={s.accordionTrigger}
                    data-cursor-no-magnetic
                    id={triggerId}
                    onClick={() => selectGroup(item.id)}
                    type="button"
                  >
                    <span className={s.accordionMeta}>
                      <span data-route-reveal-item="meta">{item.number}</span>
                      <strong data-route-reveal-item="meta">{item.label}</strong>
                    </span>
                    <span className={s.accordionCopy}>
                      <span className={s.accordionTitle} data-route-reveal-item="title">{item.title}</span>
                      <span className={s.accordionDescription} data-route-reveal-item="body">
                        {item.description}
                      </span>
                      <span className={s.accordionServiceSummary} data-route-reveal-item="body">
                        {item.serviceSummary.join(" · ")}
                      </span>
                    </span>
                    <span className={s.accordionCount} data-route-reveal-item="control">
                      {serviceCountLabel}
                    </span>
                    <span className={s.accordionIcon} aria-hidden="true">
                      <span className={s.accordionIconMotion} data-route-reveal-item="control">
                        <ArrowDownRight />
                      </span>
                    </span>
                  </button>
                </h3>

                <div
                  aria-hidden={!isOpen}
                  aria-labelledby={triggerId}
                  className={s.accordionPanel}
                  id={panelId}
                  inert={!isOpen ? true : undefined}
                  role="region"
                >
                  <div className={s.accordionPanelInner}>
                    <div className={s.accordionServices}>
                      {item.services.map((service) => (
                        <Link
                          className={s.accordionService}
                          data-cursor-no-magnetic
                          data-route-reveal-group="row"
                          href={service.href}
                          id={service.id}
                          key={service.id}
                        >
                          <span className={s.accordionServiceCopy} data-route-reveal-item="detail">
                            <strong>{service.title}</strong>
                            <small>{service.description}</small>
                          </span>
                          <span className={s.accordionServiceAction} data-route-reveal-item="control">
                            {service.ctaLabel}
                            <ArrowUpRight aria-hidden="true" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <Link
        className={s.catalogEscape}
        data-cursor-no-magnetic
        data-route-reveal-group="row"
        data-services-catalog-escape
        href={createLeadHref({
          cta: "unsure-priorities",
          intent: "unsure",
          source: "services",
        })}
      >
        <span data-route-reveal-item="body">Nevíte, kam vaše situace patří?</span>
        <strong data-route-reveal-item="title">Popsat ji vlastními slovy</strong>
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </div>
  );
}
