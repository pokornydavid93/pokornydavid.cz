import { templateEntry } from "./builders";
import type { TemplateRegistryEntry } from "./types";

const templateResponsive = {
  invariant: "Landmarky, sloty a SEO obsah zůstávají v normálním HTML a logickém pořadí.",
  narrow: "Patterns se skládají podle vlastních intrinsic kontraktů.",
  wide: "Template omezuje pouze povolené sloty; layout vlastní vložené patterns.",
};

const verifiedPhase5 = (codeRef: string) => ({
  maturity: "verified" as const,
  codeRef,
  tests: {
    unit: "not-applicable" as const,
    accessibility: "passing" as const,
    visual: "passing" as const,
    responsive: "passing" as const,
    evidence: ["tests/e2e/design-language-patterns-templates.spec.ts"],
  },
});

const livePhase5 = (codeRef: string, usageEvidence: string[]) => ({
  ...verifiedPhase5(codeRef),
  maturity: "live" as const,
  usageEvidence,
});

export const templateRegistryEntries = [
  templateEntry({
    id: "template.home", name: "HomeTemplate", capability: "homepage-shell",
    ...verifiedPhase5("app/ui/templates/HomeTemplate.tsx"),
    responsibility: "Definuje homepage shell a povolené entry, trust, discovery a conversion sloty.",
    anatomy: [{ name: "header", required: true, description: "SiteHeader." }, { name: "main", required: true, description: "Homepage pattern sequence." }, { name: "footer", required: true, description: "SiteFooter." }],
    props: [{ name: "children", type: "HomePatternSequence", description: "Schválená homepage kompozice." }], responsive: templateResponsive,
    antiUse: ["Nenese marketingové copy ani route-specific interaction state."], slots: ["header", "hero", "main", "finalAction", "footer"],
    allowedPatterns: ["pattern.section-intro", "pattern.card-collection", "pattern.split-narrative", "pattern.trust-block", "pattern.process-and-fees", "pattern.faq-section", "pattern.action-band", "pattern.form-contact-split", "pattern.editorial-flow"],
    routeFamilies: ["route.home"], dependencies: ["site.header", "site.footer", "domain.hero"], tokens: [],
  }),
  templateEntry({
    id: "template.index", name: "IndexTemplate", capability: "collection-index-shell",
    responsibility: "Definuje index route s entry, kolekcí a volitelným conversion zakončením.",
    ...verifiedPhase5("app/ui/templates/IndexTemplate.tsx"),
    anatomy: [{ name: "header", required: true, description: "SiteHeader." }, { name: "entry", required: true, description: "Page hero nebo SectionIntro." }, { name: "collection", required: true, description: "Hlavní discovery kolekce." }, { name: "footer", required: true, description: "SiteFooter." }],
    props: [{ name: "children", type: "IndexPatternSequence", description: "Schválená index kompozice." }], responsive: templateResponsive,
    antiUse: ["Nepoužívat pro detailní longform nebo formulářový flow."], slots: ["header", "entry", "collection", "action", "footer"],
    allowedPatterns: ["pattern.section-intro", "pattern.card-collection", "pattern.split-narrative", "pattern.trust-block", "pattern.faq-section", "pattern.action-band", "pattern.editorial-flow"],
    routeFamilies: ["route.services-index", "route.blog-index"], dependencies: ["site.header", "site.footer", "domain.hero"], tokens: [],
  }),
  templateEntry({
    id: "template.content-detail", name: "ContentDetailTemplate", capability: "content-detail-shell",
    responsibility: "Definuje detailní marketingovou route s page hero, narrative, procesem a action sloty.",
    ...verifiedPhase5("app/ui/templates/ContentDetailTemplate.tsx"),
    anatomy: [{ name: "header", required: true, description: "SiteHeader." }, { name: "hero", required: true, description: "Page Hero." }, { name: "content", required: true, description: "Povolené narrative patterns." }, { name: "footer", required: true, description: "SiteFooter." }],
    props: [{ name: "children", type: "ContentDetailPatternSequence", description: "Schválená detail kompozice." }], responsive: templateResponsive,
    antiUse: ["Nevytvářet boolean GenericPage API pro každou route odlišnost."], slots: ["header", "hero", "main", "action", "footer"],
    allowedPatterns: ["pattern.section-intro", "pattern.card-collection", "pattern.split-narrative", "pattern.trust-block", "pattern.process-and-fees", "pattern.faq-section", "pattern.action-band", "pattern.form-contact-split", "pattern.editorial-flow"],
    routeFamilies: ["route.service-detail", "route.process", "route.about"], dependencies: ["site.header", "site.footer", "domain.hero"], tokens: [],
  }),
  templateEntry({
    id: "template.article-detail", name: "ArticleDetailTemplate", capability: "article-shell",
    responsibility: "Definuje article landmarky, editorial flow, related content a finální relevantní akci.",
    ...verifiedPhase5("app/ui/templates/ArticleDetailTemplate.tsx"),
    anatomy: [{ name: "header", required: true, description: "SiteHeader a article entry." }, { name: "article", required: true, description: "EditorialFlow." }, { name: "footer", required: true, description: "SiteFooter." }],
    props: [{ name: "article", type: "ArticleContent", description: "SSR article data." }], responsive: templateResponsive,
    antiUse: ["Nenahrazovat article HTML canvasem nebo client-only textem."], slots: ["header", "article", "related", "action", "footer"],
    allowedPatterns: ["pattern.section-intro", "pattern.split-narrative", "pattern.action-band", "pattern.editorial-flow"],
    routeFamilies: ["route.article-detail"], dependencies: ["site.header", "site.breadcrumbs", "site.footer", "domain.hero"], tokens: [],
  }),
  templateEntry({
    id: "template.conversion", name: "ConversionTemplate", capability: "conversion-shell",
    ...verifiedPhase5("app/ui/templates/ConversionTemplate.tsx"),
    responsibility: "Definuje soustředěný conversion flow s form/contact patternem a omezeným rozptýlením.",
    anatomy: [{ name: "header", required: true, description: "SiteHeader nebo zjednodušený shell." }, { name: "entry", required: true, description: "Conversion Hero nebo SectionIntro." }, { name: "form", required: true, description: "FormContactSplit." }, { name: "footer", required: true, description: "Legal zakončení." }],
    props: [{ name: "children", type: "ConversionPatternSequence", description: "Schválený conversion flow." }], responsive: templateResponsive,
    antiUse: ["Nepřidávat obecnou homepage navigační hustotu ani více rovnocenných conversion cílů."], slots: ["header", "entry", "trust", "form", "faq", "footer"],
    allowedPatterns: ["pattern.section-intro", "pattern.split-narrative", "pattern.trust-block", "pattern.faq-section", "pattern.action-band", "pattern.form-contact-split"],
    routeFamilies: ["route.overview"], dependencies: ["site.header", "site.footer", "domain.hero", "domain.enquiry-form"], tokens: [],
  }),
  templateEntry({
    id: "template.legal", name: "LegalTemplate", capability: "legal-shell",
    ...verifiedPhase5("app/ui/templates/LegalTemplate.tsx"),
    responsibility: "Definuje čitelné legal landmarky, Prose measure a návratovou navigaci.",
    anatomy: [{ name: "header", required: true, description: "Kompaktní shell." }, { name: "content", required: true, description: "Legal Prose." }, { name: "footer", required: true, description: "SiteFooter nebo legal closure." }],
    props: [{ name: "children", type: "LegalContent", description: "SSR legal obsah." }], responsive: templateResponsive,
    antiUse: ["Nepřidávat marketingové patterns, dekorativní motion nebo úzký nečitelný sloupec."], slots: ["header", "content", "footer"],
    allowedPatterns: ["pattern.section-intro", "pattern.editorial-flow"], routeFamilies: ["route.legal"],
    dependencies: ["site.header", "site.footer", "component.prose"], tokens: [],
  }),
  templateEntry({
    id: "template.system", name: "SystemTemplate", capability: "system-state-shell",
    ...livePhase5("app/ui/templates/SystemTemplate.tsx", ["app/not-found.tsx"]),
    responsibility: "Definuje přístupnou chybovou nebo systémovou stránku s jasnou návratovou akcí.",
    anatomy: [{ name: "header", required: false, description: "Identita webu a navigace." }, { name: "status", required: true, description: "Srozumitelný stav nebo error code." }, { name: "message", required: true, description: "Hlavní nadpis, co se stalo a jak pokračovat." }, { name: "action", required: true, description: "Bezpečná další cesta." }, { name: "footer", required: false, description: "Kontakty a právní informace." }],
    props: [{ name: "status", type: "SystemStatus", description: "Typovaný systémový stav." }], responsive: templateResponsive,
    antiUse: ["Nezobrazovat pouze kód chyby bez opravy nebo dalšího kroku."], slots: ["header", "status", "message", "action", "footer"],
    allowedPatterns: [], routeFamilies: ["route.system"],
    dependencies: ["site.header", "site.footer", "component.link"], tokens: [],
  }),
] satisfies TemplateRegistryEntry[];
