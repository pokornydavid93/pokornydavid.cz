import type { RegistryMigration, RouteFamilyContract } from "./types";

export const routeFamilyContracts = [
  {
    id: "route.home", label: "Homepage", templateId: "template.home", paths: ["/"],
    sourceFiles: ["app/page.tsx"],
    requiredPatternIds: ["pattern.trust-block", "pattern.action-band"],
    optionalPatternIds: ["pattern.section-intro", "pattern.card-collection", "pattern.split-narrative", "pattern.process-and-fees", "pattern.faq-section", "pattern.form-contact-split", "pattern.editorial-flow"], status: "current",
  },
  {
    id: "route.services-index", label: "Služby index", templateId: "template.index", paths: ["/sluzby"],
    sourceFiles: ["app/sluzby/page.tsx"], requiredPatternIds: ["pattern.section-intro", "pattern.card-collection", "pattern.action-band"],
    optionalPatternIds: ["pattern.split-narrative", "pattern.trust-block", "pattern.process-and-fees", "pattern.faq-section"], status: "current",
  },
  {
    id: "route.service-detail", label: "Detail služby", templateId: "template.content-detail", paths: ["/sluzby/[slug]"],
    sourceFiles: [], requiredPatternIds: ["pattern.section-intro", "pattern.split-narrative", "pattern.process-and-fees", "pattern.faq-section", "pattern.action-band"],
    optionalPatternIds: ["pattern.card-collection", "pattern.trust-block", "pattern.form-contact-split"], status: "planned",
  },
  {
    id: "route.process", label: "Jak pracuji", templateId: "template.content-detail", paths: ["/jak-pracuji"],
    sourceFiles: ["app/jak-pracuji/page.tsx"], requiredPatternIds: ["pattern.section-intro", "pattern.split-narrative", "pattern.process-and-fees", "pattern.action-band"],
    optionalPatternIds: ["pattern.trust-block", "pattern.faq-section", "pattern.form-contact-split"], status: "current",
  },
  {
    id: "route.about", label: "O mně", templateId: "template.content-detail", paths: ["/kdo-jsem"],
    sourceFiles: ["app/kdo-jsem/page.tsx"], requiredPatternIds: ["pattern.section-intro", "pattern.split-narrative", "pattern.trust-block", "pattern.action-band"],
    optionalPatternIds: ["pattern.card-collection", "pattern.process-and-fees", "pattern.form-contact-split", "pattern.editorial-flow"], status: "current",
  },
  {
    id: "route.blog-index", label: "Blog index", templateId: "template.index", paths: ["/clanky", "/blog"],
    sourceFiles: ["app/clanky/page.tsx", "app/blog/page.tsx"], requiredPatternIds: ["pattern.section-intro", "pattern.card-collection", "pattern.editorial-flow"],
    optionalPatternIds: ["pattern.action-band"], status: "current",
  },
  {
    id: "route.article-detail", label: "Detail článku", templateId: "template.article-detail", paths: ["/clanky/[slug]"],
    sourceFiles: ["app/clanky/[slug]/page.tsx"], requiredPatternIds: ["pattern.action-band", "pattern.editorial-flow"],
    optionalPatternIds: ["pattern.section-intro", "pattern.split-narrative"], status: "current",
  },
  {
    id: "route.overview", label: "Získat přehled", templateId: "template.conversion", paths: ["/ziskat-prehled"],
    sourceFiles: ["app/ziskat-prehled/page.tsx", "app/ziskat-prehled/dekujeme/page.tsx"], requiredPatternIds: ["pattern.section-intro", "pattern.form-contact-split"],
    optionalPatternIds: ["pattern.split-narrative", "pattern.trust-block", "pattern.faq-section", "pattern.action-band"], status: "current",
  },
  {
    id: "route.legal", label: "Legal", templateId: "template.legal", paths: ["/cookies-a-mereni", "/pravni-informace", "/zasady-zpracovani-osobnich-udaju"],
    sourceFiles: ["app/cookies-a-mereni/page.tsx", "app/pravni-informace/page.tsx", "app/zasady-zpracovani-osobnich-udaju/page.tsx"],
    requiredPatternIds: ["pattern.editorial-flow"], optionalPatternIds: ["pattern.section-intro"], status: "current",
  },
  {
    id: "route.system", label: "404 / system", templateId: "template.system", paths: ["/404"],
    sourceFiles: ["app/not-found.tsx"], requiredPatternIds: ["pattern.action-band"], optionalPatternIds: ["pattern.section-intro"], status: "current",
  },
] satisfies RouteFamilyContract[];

export const registryMigrations = [
  { previous: "Button Primary", target: "component.button + variant primary", disposition: "merged", note: "Primary je varianta jedné Button family." },
  { previous: "Card", target: "component.surface + domain card anatomy", disposition: "internalized", note: "Generic Card nesmí vytvořit paralelní surface systém." },
  { previous: "Input", target: "form.field + form.text-field + form.textarea-field + form.select-field + form.checkbox + form.radio-group", disposition: "split", note: "Autor-facing fields sdílejí interní wiring, ale zachovávají odlišnou HTML sémantiku." },
  { previous: "Badge / Chip", target: "component.badge + component.selection-chip", disposition: "split", note: "Statická informace a persistentní volba nejsou jedna komponenta." },
  { previous: "Navigation Item", target: "site.navigation anatomy", disposition: "internalized", note: "Navigation item je interní část SiteNavigation." },
  { previous: "DRAFT", target: "specified → implemented → verified → live", disposition: "removed", note: "Maturity je monotónní a podložená evidencí." },
  { previous: "Token pills as primary content", target: "expanded token dependencies", disposition: "internalized", note: "Tokeny nejsou hlavní identitou registry řádku." },
] satisfies RegistryMigration[];
