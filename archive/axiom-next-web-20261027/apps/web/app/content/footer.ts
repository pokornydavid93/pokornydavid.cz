import { createLeadHref } from "../../lib/leads/lead-contract";
import type { FooterLinkGroup } from "../ui/site/types";
import { cnbRegistryUrl } from "./multipage";

export const FINANCIAL_CONTENT_DISCLAIMER =
  "Informace na tomto webu mají obecný informační a vzdělávací charakter. Nepředstavují individuální investiční poradenství ani doporučení ke konkrétnímu finančnímu produktu nebo investičnímu nástroji. Vhodnost konkrétního řešení lze posoudit až podle vaší situace, cílů a souvisejících rizik.";

export const FOOTER_BRAND_STATEMENT =
  "Pomohu vám vidět finance v souvislostech a rozhodovat se srozumitelně.";

export const FOOTER_OVERVIEW_HREF = createLeadHref({
  cta: "footer-primary",
  source: "footer",
});

export const footerGroups = [
  {
    label: "Orientace",
    links: [
      { href: "/sluzby/", label: "Služby" },
      { href: "/jak-pracuji/", label: "Jak pracuji" },
      { href: "/kdo-jsem/", label: "Kdo jsem" },
    ],
  },
  {
    label: "Důvěra a ověření",
    links: [
      { href: "/reference/", label: "Reference" },
      {
        href: cnbRegistryUrl,
        label: "Registrace ČNB",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      {
        href: "/osvedceni-a-certifikace/",
        label: "Odborná osvědčení",
      },
      { href: "/pravni-informace/", label: "Právní informace" },
    ],
  },
  {
    label: "Obsah a další krok",
    links: [
      { href: "/clanky/", label: "Články" },
      { href: FOOTER_OVERVIEW_HREF, label: "Získat přehled" },
    ],
  },
] as const satisfies readonly FooterLinkGroup[];
