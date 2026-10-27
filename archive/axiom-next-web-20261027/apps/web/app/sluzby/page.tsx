import type { Metadata } from "next";
import { OverviewActionLink } from "@/app/_components/PublicSiteChrome";
import ReactBitsSilk from "@/app/_components/effects/ReactBitsSilk.client";
import LiquidLinesBackdrop from "@/app/_components/effects/LiquidLinesBackdrop.client";
import flow from "@/app/_components/effects/liquidLines.module.css";
import { MarketingPageShell } from "@/app/components/multipage/MarketingPage";
import type { ServiceItem } from "@/app/content/services";
import ActionBand from "@/app/ui/patterns/ActionBand";
import {
  createLeadHref,
  type LeadIntent,
  type LeadTopic,
} from "@/lib/leads/lead-contract";
import { createPageMetadata } from "@/lib/seo";
import { getServiceItems } from "@/lib/services/offering-runtime.server";
import ServicesMotion from "./ServicesMotion.client";
import ServicesAccordion from "./ServicesAccordion.client";
import s from "./servicesPage.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Služby — finance v souvislostech",
  description:
    "Finanční plán, bydlení, ochrana příjmu, pojištění, rezerva a investice posouzené jako jeden celek.",
  path: "/sluzby/",
});

const overviewHref = (intent: LeadIntent, topic: LeadTopic) =>
  createLeadHref({
    cta: `service-${topic}`,
    intent,
    source: "service-detail",
    topic,
  });

type ServiceGroupDefinition = {
  id: string;
  index: string;
  label: string;
  title: string;
  description: string;
  intent: LeadIntent;
  services: readonly {
    slug: string;
    description: string;
    ctaLabel: string;
    topic: LeadTopic;
  }[];
};

const serviceGroups = [
  {
    id: "service-group-01",
    index: "01",
    label: "Celkový přehled",
    title: "Potřebuji srovnat finance jako celek.",
    description:
      "Příjmy, závazky, rezervy a cíle vám spojím do jednoho srozumitelného plánu.",
    intent: "overview",
    services: [
      {
        slug: "financni-plan",
        description: "Přehled priorit a konkrétní pořadí dalších kroků.",
        ctaLabel: "Začít celkovým přehledem",
        topic: "financial-plan",
      },
    ],
  },
  {
    id: "service-group-02",
    index: "02",
    label: "Bydlení",
    title: "Řeším bydlení nebo nemovitost.",
    description:
      "Koupi, hypotéku i prodej posoudím podle nákladů, rezervy a vašich dalších plánů.",
    intent: "housing",
    services: [
      {
        slug: "hypoteka-a-financovani",
        description:
          "Splátku, celkové náklady, rezervu a dopad financování posoudím v kontextu vašich dalších plánů.",
        ctaLabel: "Posoudit financování bydlení",
        topic: "mortgage",
      },
      {
        slug: "prodej-nemovitosti",
        description:
          "Zohledním úvěr, načasování dalšího bydlení, náklady i využití výnosu z prodeje.",
        ctaLabel: "Probrat finance kolem prodeje",
        topic: "property-sale",
      },
    ],
  },
  {
    id: "service-group-03",
    index: "03",
    label: "Financování",
    title: "Potřebuji financovat větší výdaj nebo podnikání.",
    description:
      "Porovnám možnosti podle účelu, celkových nákladů a zatížení vašeho rozpočtu.",
    intent: "financing",
    services: [
      {
        slug: "spotrebitelske-a-podnikatelske-uvery",
        description:
          "Financování auta, většího výdaje nebo podnikatelského záměru nastavím tak, aby zbytečně nepřetížilo váš rozpočet ani další cíle.",
        ctaLabel: "Posoudit možnosti financování",
        topic: "business-financing",
      },
    ],
  },
  {
    id: "service-group-04",
    index: "04",
    label: "Ochrana",
    title: "Chci chránit příjem, rodinu a majetek.",
    description:
      "Najdu rizika, která by nejvíc zasáhla chod vaší domácnosti, a nastavím pouze potřebnou ochranu.",
    intent: "protection",
    services: [
      {
        slug: "zajisteni-prijmu",
        description:
          "Ochranu rozpočtu nastavím pro případ nemoci, úrazu nebo dlouhodobého výpadku příjmu.",
        ctaLabel: "Prověřit ochranu příjmu",
        topic: "income-protection",
      },
      {
        slug: "pojisteni-majetku",
        description:
          "Srovnám hodnotu majetku, limity a výluky, aby v ochraně nezůstaly zásadní mezery.",
        ctaLabel: "Prověřit ochranu majetku",
        topic: "property-insurance",
      },
      {
        slug: "pojisteni-vozidla",
        description:
          "Rozsah krytí, limity, spoluúčast a asistenci posoudím podle hodnoty a používání vozu.",
        ctaLabel: "Prověřit pojištění vozidla",
        topic: "vehicle-insurance",
      },
      {
        slug: "pojisteni-odpovednosti",
        description:
          "Porovnám ochranu pro běžný život, zaměstnání i profesní nebo podnikatelskou činnost.",
        ctaLabel: "Prověřit odpovědnost",
        topic: "liability-insurance",
      },
    ],
  },
  {
    id: "service-group-05",
    index: "05",
    label: "Budoucnost",
    title: "Chci dát rezervám a investicím jasný směr.",
    description:
      "Peníze vám rozdělím podle účelu, časového horizontu a míry rizika, která vám vyhovuje.",
    intent: "future",
    services: [
      {
        slug: "investice-a-sporeni",
        description:
          "Prostředky rozdělím mezi dostupnou rezervu, střednědobé cíle a dlouhodobé investice.",
        ctaLabel: "Nastavit rezervu a investice",
        topic: "investments",
      },
    ],
  },
] satisfies readonly ServiceGroupDefinition[];

const evaluationPrinciples = [
  {
    number: "01",
    title: "Prostor v rozpočtu",
    description:
      "Co vám řešení vezme každý měsíc a kolik ponechá v dostupné rezervě.",
  },
  {
    number: "02",
    title: "Dopad na celek",
    description:
      "Jak ovlivní bydlení, ochranu příjmu, další závazky a dlouhodobé cíle.",
  },
  {
    number: "03",
    title: "Odolnost v čase",
    description:
      "Zda bude dávat smysl i při změně příjmu, sazeb nebo rodinné situace.",
  },
] as const;

function getService(serviceItems: readonly ServiceItem[], slug: string) {
  return serviceItems.find((service) => service.slug === slug);
}

function createAccordionGroups(serviceItems: readonly ServiceItem[]) {
  return serviceGroups.map((group) => {
    const services = group.services.flatMap((serviceDefinition) => {
      const service = getService(serviceItems, serviceDefinition.slug);

      return service
        ? [
            {
              id: service.slug,
              title: service.title,
              description: service.description,
              ctaLabel: serviceDefinition.ctaLabel,
              href: overviewHref(group.intent, service.leadTopic),
            },
          ]
        : [];
    });

    return {
      id: group.id,
      number: group.index,
      label: group.label,
      title: group.title,
      description: group.description,
      serviceSummary: services.map((service) => service.title),
      services,
    };
  });
}

export default async function ServicesPage() {
  const accordionGroups = createAccordionGroups(await getServiceItems());

  return (
    <MarketingPageShell
      currentPath="/sluzby/"
      footerClassName={s.servicesFooter}
      headerClassName={s.servicesHeader}
    >
      <div
        className={s.page}
        data-route-reveal-root
        data-route-reveal-profile="staged"
        data-services-page
      >
        <ServicesMotion />

        <section
          className={s.heroChapter}
          data-services-hero
          data-surface-tone="dark"
          aria-labelledby="services-title"
        >
          <ReactBitsSilk
            className={s.heroSilk}
            readyAttribute="data-services-silk-ready"
            readyTargetSelector="[data-services-hero]"
          />
          <div className={s.heroVeil} aria-hidden="true" />

          <div className={`${s.inner} ${s.heroGrid}`}>
            <div className={s.heroCopy}>
              <h1 id="services-title">
                <span data-services-hero-part data-route-hero-entry="0">
                  Každé rozhodnutí mění
                </span>
                <span
                  className={s.heroAccent}
                  data-services-hero-part
                  data-route-hero-entry="1"
                >
                  celý finanční obraz.
                </span>
              </h1>
              <p
                className={s.heroLead}
                data-services-hero-part
                data-route-hero-entry="2"
              >
                Bydlení, ochranu příjmu, rezervu ani investice neřeším
                odděleně. Každou oblast posuzuji podle toho, co udělá s vaším
                rozpočtem, jistotou a dalšími cíli.
              </p>
              <div
                className={s.heroActionGroup}
                data-services-hero-part
                data-route-hero-entry="3"
              >
                <OverviewActionLink
                  className={s.heroPrimaryAction}
                  cursorLabel="PRVNÍ KROK • UDĚLAT SI JASNO •"
                  href="/ziskat-prehled/?source=services&cta=services-hero"
                  label="Zjistit, čím začít"
                  placement="hero"
                  track={false}
                />
                <p className={s.heroNote}>
                  Bez dokumentů a citlivých údajů.
                </p>
              </div>
            </div>

          </div>
        </section>

        <section
          className={s.catalogChapter}
          data-services-catalog
          data-surface-tone="light"
          aria-labelledby="services-catalog-title"
          id="prehled-sluzeb"
        >
          <div className={`${s.inner} ${s.catalogLayout}`}>
            <header
              className={s.catalogIntro}
              data-route-reveal-group
              data-services-catalog-intro
            >
              <p
                className={`${s.eyebrow} ${s.catalogEyebrow}`}
                data-route-reveal-item="meta"
                data-services-catalog-part
              >
                Kde můžeme začít
              </p>
              <h2 id="services-catalog-title">
                <span
                  data-route-reveal-item="title"
                  data-services-catalog-heading-line
                >
                  Začněte tím, co řešíte
                </span>
                <span
                  data-route-reveal-item="title"
                  data-services-catalog-heading-line
                >
                  právě teď.
                </span>
              </h2>
              <p
                className={s.catalogDescription}
                data-route-reveal-item="body"
                data-services-catalog-part
              >
                Nemusíte znát název služby. Vyberte situaci, která je vám
                nejblíž; ostatní souvislosti doplníme společně.
              </p>
              <p
                className={s.catalogStats}
                data-route-reveal-item="meta"
                data-services-catalog-part
              >
                5 výchozích situací. 9 konkrétních služeb.
              </p>
            </header>

            <ServicesAccordion items={accordionGroups} />
          </div>
        </section>

        <section
          className={s.contextChapter}
          data-services-context
          data-surface-tone="dark"
          aria-labelledby="services-context-title"
        >
          <LiquidLinesBackdrop />
          <div className={`${s.inner} ${flow.content}`}>
            <div
              className={s.contextIntro}
              data-route-reveal-group
              data-services-context-stage
            >
              <header className={s.contextHeading}>
                <p
                  className={s.eyebrow}
                  data-route-reveal-item="meta"
                  data-services-context-part="eyebrow"
                >
                  Jak posuzuji doporučení
                </p>
                <h2 id="services-context-title">
                  <span className={s.contextHeadingMask}>
                    <span
                      data-route-reveal-item="title"
                      data-services-context-heading-line
                    >
                      Řešení musí fungovat dnes.
                    </span>
                  </span>
                  <span className={s.contextHeadingMask}>
                    <span
                      className={s.contextAccent}
                      data-route-reveal-item="title"
                      data-services-context-heading-line
                    >
                      A nezavřít cestu zítra.
                    </span>
                  </span>
                </h2>
              </header>
              <p
                className={s.contextDescription}
                data-route-reveal-item="body"
                data-services-context-part="description"
              >
                Každé doporučení posuzuji podle toho, co udělá s vaším
                rozpočtem, dalšími závazky a prostorem pro budoucí změny.
              </p>
            </div>

            <div
              className={s.criteriaFrame}
              data-route-reveal-group
              data-services-context-frame
            >
              <span
                aria-hidden="true"
                className={s.criteriaRuleTop}
                data-route-reveal-rule
                data-services-context-rule
              />
              <ul
                aria-label="Kritéria pro posouzení doporučení"
                className={s.criteriaGrid}
              >
                {evaluationPrinciples.map((principle, index) => (
                  <li
                    className={s.criterion}
                    data-route-reveal-group="row"
                    data-services-context-criterion
                    key={principle.number}
                  >
                    {index > 0 ? (
                      <span
                        aria-hidden="true"
                        className={s.criteriaDivider}
                        data-services-context-divider
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={s.criteriaIndex}
                      data-route-reveal-item="meta"
                      data-services-context-index
                    >
                      {principle.number}
                    </span>
                    <h3 data-route-reveal-item="title" data-services-context-title>{principle.title}</h3>
                    <p data-route-reveal-item="body" data-services-context-copy>{principle.description}</p>
                  </li>
                ))}
              </ul>
              <span
                aria-hidden="true"
                className={s.criteriaRuleBottom}
                data-route-reveal-rule
                data-services-context-rule
              />
            </div>
          </div>
        </section>

        <ActionBand
          actions={(
            <OverviewActionLink
              cursorLabel="PRVNÍ KROK • UDĚLAT SI JASNO •"
              data-route-reveal-item="control"
              data-services-action-cta
              href="/ziskat-prehled/?source=services&cta=services-final"
              label="Zjistit, čím začít"
              placement="services-final"
              track={false}
            />
          )}
          data-services-action
          data-route-reveal-group
          data-nav-theme="light"
          eyebrow={(
            <span data-route-reveal-item="meta" data-services-action-part>
              Když název služby nestačí
            </span>
          )}
          heading={(
            <>
              <span
                data-services-action-heading-line
                data-route-reveal-item="title"
              >
                Začněte situací,
              </span>{" "}
              <span
                data-services-action-heading-line
                data-route-reveal-item="title"
              >
                ne názvem služby.
              </span>
            </>
          )}
          headingId="services-action-title"
          lead={(
            <span data-route-reveal-item="body" data-services-action-part>
              Stručně popište, co se změnilo nebo jaké rozhodnutí vás čeká.
              Navrhnu, odkud má smysl začít.
            </span>
          )}
          surface="action"
        />
      </div>
    </MarketingPageShell>
  );
}
