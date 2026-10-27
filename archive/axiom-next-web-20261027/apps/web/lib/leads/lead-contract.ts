export type LeadIntent =
  | "overview"
  | "housing"
  | "financing"
  | "protection"
  | "future"
  | "unsure";

export type LeadIntentOption = {
  value: LeadIntent;
  label: string;
};

export type LeadTopic =
  | "financial-plan"
  | "mortgage"
  | "property-sale"
  | "business-financing"
  | "income-protection"
  | "property-insurance"
  | "vehicle-insurance"
  | "liability-insurance"
  | "investments"
  | "mortgage-refixation";

// This is a projection vocabulary, not a browser-selected identifier. The
// form submits only a closed LeadTopic; the server adapter derives the key and
// the lead API independently verifies the same topic-to-key relationship.
export const leadTopicOfferingKeys = {
  "financial-plan": "financni-plan",
  mortgage: "hypoteka-a-financovani",
  "property-sale": "prodej-nemovitosti",
  "business-financing": "spotrebitelske-a-podnikatelske-uvery",
  "income-protection": "zajisteni-prijmu",
  "property-insurance": "pojisteni-majetku",
  "vehicle-insurance": "pojisteni-vozidla",
  "liability-insurance": "pojisteni-odpovednosti",
  investments: "investice-a-sporeni",
  "mortgage-refixation": "hypoteka-a-financovani",
} as const satisfies Record<LeadTopic, string>;

export type LeadOfferingKey =
  (typeof leadTopicOfferingKeys)[LeadTopic];

export type PreferredCallTime =
  | "morning"
  | "afternoon"
  | "evening"
  | "any";

export type LeadSourceContext =
  | "direct"
  | "header"
  | "homepage"
  | "services"
  | "service-detail"
  | "article"
  | "funnel"
  | "references"
  | "about"
  | "process"
  | "footer";

export type LeadSource = {
  route: "/ziskat-prehled/";
  cta?: string;
  context?: LeadSourceContext;
};

export type LeadFormPayload = {
  intent: LeadIntent;
  topic?: LeadTopic;
  situationNote?: string;
  phone: string;
  email: string;
  firstName?: string;
  preferredCallTime?: PreferredCallTime;
  source: LeadSource;
};

export const leadIntentOptions = [
  {
    value: "overview",
    label: "Chci se zorientovat ve svých financích",
  },
  {
    value: "housing",
    label: "Řeším bydlení nebo nemovitost",
  },
  {
    value: "financing",
    label: "Potřebuji financovat větší výdaj nebo podnikání",
  },
  {
    value: "protection",
    label: "Chci chránit příjem, rodinu nebo majetek",
  },
  {
    value: "future",
    label: "Chci dát rezervám a investicím jasný směr",
  },
  {
    value: "unsure",
    label: "Nevím přesně, kde začít",
  },
] as const satisfies readonly LeadIntentOption[];

export const leadIntentSummary = {
  overview: "Orientace ve financích",
  housing: "Bydlení nebo nemovitost",
  financing: "Větší financování nebo podnikání",
  protection: "Ochrana příjmu, rodiny nebo majetku",
  future: "Rezervy a investice",
  unsure: "Nevím přesně, kde začít",
} as const satisfies Record<LeadIntent, string>;

export const preferredCallTimeOptions = [
  { value: "morning", label: "Dopoledne" },
  { value: "afternoon", label: "Odpoledne" },
  { value: "evening", label: "Podvečer" },
  { value: "any", label: "Bez preference" },
] as const satisfies ReadonlyArray<{ value: PreferredCallTime; label: string }>;

export const preferredCallTimeLabels = Object.fromEntries(
  preferredCallTimeOptions.map(({ label, value }) => [value, label]),
) as Record<PreferredCallTime, string>;

export const leadTopicLabels = {
  "financial-plan": "Finanční plán",
  mortgage: "Hypotéka a bydlení",
  "property-sale": "Finance kolem prodeje nemovitosti",
  "business-financing": "Větší nebo podnikatelské financování",
  "income-protection": "Ochrana příjmu",
  "property-insurance": "Pojištění majetku",
  "vehicle-insurance": "Pojištění vozidla",
  "liability-insurance": "Pojištění odpovědnosti",
  investments: "Rezerva a investice",
  "mortgage-refixation": "Konec fixace hypotéky",
} as const satisfies Record<LeadTopic, string>;

export const leadSourceContextLabels = {
  direct: "Přímý vstup",
  header: "Hlavní navigace",
  homepage: "Hlavní stránka",
  services: "Služby",
  "service-detail": "Konkrétní služba",
  article: "Články",
  funnel: "Tematický průvodce",
  references: "Reference",
  about: "Kdo jsem",
  process: "Jak pracuji",
  footer: "Patička webu",
} as const satisfies Record<LeadSourceContext, string>;

const LEAD_INTENTS = new Set<LeadIntent>(
  leadIntentOptions.map(({ value }) => value),
);
const LEAD_TOPICS = new Set<LeadTopic>(
  Object.keys(leadTopicLabels) as LeadTopic[],
);
const PREFERRED_CALL_TIMES = new Set<PreferredCallTime>(
  preferredCallTimeOptions.map(({ value }) => value),
);
const LEAD_SOURCE_CONTEXTS = new Set<LeadSourceContext>(
  Object.keys(leadSourceContextLabels) as LeadSourceContext[],
);

const ALLOWED_CTA_IDS = new Set([
  "header-primary",
  "footer-primary",
  "home-header",
  "home-hero",
  "home-profile",
  "home-process",
  "home-references",
  "home-situation",
  "home-situations",
  "home-final",
  "situation-mortgage-refixation",
  "situation-new-housing",
  "situation-insurance-review",
  "situation-income-protection",
  "situation-investing",
  "unsure-priorities",
  "services-hero",
  "services-final",
  "service-financial-plan",
  "service-mortgage",
  "service-property-sale",
  "service-business-financing",
  "service-income-protection",
  "service-property-insurance",
  "service-vehicle-insurance",
  "service-liability-insurance",
  "service-investments",
  "article-inline",
  "article-screening",
  "article-final",
  "article-inline-check",
  "article-screening-check",
  "article-sticky-check",
  "article-final-check",
  "quick-refixation-check",
  "article-mortgage-refixation",
  "process-hero",
  "process-final",
  "about-hero",
  "about-final",
  "references-final",
  "funnel-primary",
]);

export const topicIntent = {
  "financial-plan": "overview",
  mortgage: "housing",
  "property-sale": "housing",
  "business-financing": "financing",
  "income-protection": "protection",
  "property-insurance": "protection",
  "vehicle-insurance": "protection",
  "liability-insurance": "protection",
  investments: "future",
  "mortgage-refixation": "housing",
} as const satisfies Record<LeadTopic, LeadIntent>;

export const isLeadIntent = (value: string): value is LeadIntent =>
  LEAD_INTENTS.has(value as LeadIntent);

export const isLeadTopic = (value: string): value is LeadTopic =>
  LEAD_TOPICS.has(value as LeadTopic);

export const isPreferredCallTime = (
  value: string,
): value is PreferredCallTime =>
  PREFERRED_CALL_TIMES.has(value as PreferredCallTime);

export const isLeadSourceContext = (
  value: string,
): value is LeadSourceContext =>
  LEAD_SOURCE_CONTEXTS.has(value as LeadSourceContext);

export const isAllowedLeadCta = (value: string) =>
  ALLOWED_CTA_IDS.has(value);

export const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/gu, "");
  return `${hasLeadingPlus ? "+" : ""}${digits}`;
};

export const isValidPhone = (value: string) => {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/gu, "");
  return value.length <= 32
    && !/[\u0000-\u001f\u007f]/u.test(value)
    && digits.length >= 9
    && digits.length <= 15;
};

const EMAIL_LOCAL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u;

export const isValidLeadEmail = (value: string) => {
  if (value !== value.trim() || new TextEncoder().encode(value).length > 254) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0
    && local.length <= 64
    && EMAIL_LOCAL_PATTERN.test(local)
    && !local.startsWith(".")
    && !local.endsWith(".")
    && !local.includes("..")
    && domain.length <= 253
    && domain.split(".").length >= 2
    && domain.split(".").every((label) => EMAIL_DOMAIN_LABEL_PATTERN.test(label));
};

export const createLeadHref = ({
  cta,
  intent,
  source,
  topic,
}: {
  cta?: string;
  intent?: LeadIntent;
  source: LeadSourceContext;
  topic?: LeadTopic;
}) => {
  const query = new URLSearchParams({ source });
  const resolvedIntent = intent ?? (topic ? topicIntent[topic] : undefined);
  if (resolvedIntent) query.set("intent", resolvedIntent);
  if (topic && resolvedIntent && topicIntent[topic] === resolvedIntent) {
    query.set("topic", topic);
  }
  if (cta && isAllowedLeadCta(cta)) query.set("cta", cta);
  return `/ziskat-prehled/?${query.toString()}`;
};
