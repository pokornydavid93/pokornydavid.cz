import { internalRoute } from "../../lib/homepage/routing";
import type { OverviewFlowContent } from "../../lib/homepage/types";
import {
  leadIntentOptions,
  type LeadIntent,
} from "../../lib/leads/lead-contract";
import { formPrivacyNotice } from "./form-privacy";

const situationCopy = {
  overview: {
    label: "Chci mít přehled o svých financích",
    description: "Příjmy, výdaje, úspory i současné smlouvy.",
    summary: "Přehled o financích",
  },
  housing: {
    label: "Řeším bydlení nebo hypotéku",
    description: "Koupě, stavba, prodej nebo konec fixace.",
    summary: "Bydlení a hypotéka",
  },
  financing: {
    label: "Potřebuji financovat větší výdaj",
    description: "Rekonstrukce, auto nebo rozvoj podnikání.",
    summary: "Financování většího výdaje",
  },
  protection: {
    label: "Chci vyřešit pojištění",
    description: "Příjem, rodina, nemovitost, auto i odpovědnost.",
    summary: "Pojištění",
  },
  future: {
    label: "Chci spořit nebo investovat",
    description: "Vytvořit rezervu, spořit dětem nebo na důchod.",
    summary: "Rezerva a investice",
  },
  unsure: {
    label: "Nevím, čím začít",
    description: "Chci se nejdřív poradit o své situaci.",
    summary: "Úvodní rozhovor o vaší situaci",
  },
} as const satisfies Record<LeadIntent, { label: string; description: string; summary: string }>;

export const overviewSituationOptions = leadIntentOptions.map(({ value }) => ({
  value,
  ...situationCopy[value],
}));

export const overviewSituationLabels = Object.fromEntries(
  overviewSituationOptions.map(({ value, summary }) => [value, summary]),
) as Record<LeadIntent, string>;

export const overviewConversation = {
  situation: {
    question: {
      lead: "Co právě potřebujete",
      body: "\nvyřešit?",
      emphasis: "body",
    },
    description:
      "Vyberte, co se vás týká. Podrobnosti spolu probereme při úvodním hovoru.",
    continueLabel: "Doplnit kontakt",
    reassurance: "Smlouvy ani výpisy teď nepotřebuji.",
  },
  contact: {
    question: {
      lead: "Kam vám",
      body: "\nmůžu zavolat?",
    },
    description:
      "Do 24 hodin vám zavolám. Probereme, co řešíte, a domluvíme se, jestli má smysl pokračovat.",
    summaryLabel: "Téma hovoru",
    changeLabel: "Vybrat jiné téma",
    submitLabel: "Zavolejte mi",
    pendingLabel: "Odesílám…",
    reassurance: "Úvodní hovor je nezávazný.",
  },
  note: {
    addLabel: "Doplnit podrobnosti",
    editLabel: "Upravit poznámku",
    hideLabel: "Skrýt poznámku",
    placeholder: "Co teď řešíte a s čím potřebujete pomoct…",
  },
} as const;

export const overviewFlowContent = {
  intro: {
    title: "Co právě potřebujete vyřešit?",
    lead: overviewConversation.situation.description,
  },
  collectionNotice: {
    shortText: formPrivacyNotice.leadText,
    detailHref: internalRoute(formPrivacyNotice.detailHref),
    version: formPrivacyNotice.version,
  },
  fields: {
    intent: {
      label: "Co právě potřebujete vyřešit?",
      hint: "Vyberte téma, které se vás týká.",
      requiredText: "Povinné",
    },
    situationNote: {
      label: "Co bych měl vědět předem?",
      hint: "Stačí pár vět. Citlivé osobní ani finanční údaje sem nepište.",
    },
    phone: {
      label: "Telefonní číslo",
      hint: "České i zahraniční číslo.",
      requiredText: "Povinné",
    },
    email: {
      label: "E-mail pro potvrzení",
      hint: "Pošlu vám sem potvrzení, že zpráva dorazila.",
      requiredText: "Povinné",
    },
    firstName: {
      label: "Jak vám mám říkat?",
      hint: "Stačí křestní jméno.",
    },
  },
  errorSummaryTitle: "Zkontrolujte formulář",
  validation: {
    intent: "Vyberte oblast, která je vaší situaci nejblíž.",
    situationNote: "Popis může mít nejvýše 500 znaků.",
    phone: "Zadejte prosím platné telefonní číslo.",
    email: "Zadejte prosím platnou e-mailovou adresu.",
    firstName: "Jméno může mít nejvýše 80 znaků.",
    preferredCallTime: "Vyberte jednu z nabízených částí dne.",
  },
  messages: {
    providerUnavailable:
      "Formulář se teď nepodařilo odeslat. Zkuste to prosím znovu nebo zavolejte přímo.",
    rateLimited:
      "Formulář se teď nepodařilo odeslat. Zkuste to prosím znovu nebo zavolejte přímo.",
    duplicateOrAmbiguous:
      "Formulář se teď nepodařilo odeslat. Zkuste to prosím znovu nebo zavolejte přímo.",
    requestReceived: "Vaši žádost server přijal.",
  },
} as const satisfies OverviewFlowContent;
