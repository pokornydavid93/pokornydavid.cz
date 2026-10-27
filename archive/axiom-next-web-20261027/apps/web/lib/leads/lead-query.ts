import {
  isAllowedLeadCta,
  isLeadIntent,
  isLeadSourceContext,
  isLeadTopic,
  topicIntent,
  type LeadIntent,
  type LeadSourceContext,
  type LeadTopic,
} from "./lead-contract";

type QueryValue = string | string[] | undefined;

type ParsedLeadQuery = {
  intent?: LeadIntent;
  topic?: LeadTopic;
  source: LeadSourceContext;
  cta?: string;
  hasSpecificContext: boolean;
};

const legacyIntentAliases: Record<string, LeadIntent> = {
  plan: "overview",
  financovani: "housing",
  ochrana: "protection",
  "rezerva-investice": "future",
  orientace: "unsure",
  bydleni: "housing",
  "ochrana-prijmu": "protection",
  "mortgage-refixation": "housing",
  "new-housing": "housing",
  "insurance-review": "protection",
  "income-protection": "protection",
  investing: "future",
  refixace: "housing",
  "nova-hypoteka": "housing",
  "kontrola-pojisteni": "protection",
  "vypadek-prijmu": "protection",
  investice: "future",
};

const legacyTopics: Partial<Record<string, LeadTopic>> = {
  "mortgage-refixation": "mortgage-refixation",
  "new-housing": "mortgage",
  "insurance-review": "property-insurance",
  "income-protection": "income-protection",
  investing: "investments",
  refixace: "mortgage-refixation",
  "nova-hypoteka": "mortgage",
  "kontrola-pojisteni": "property-insurance",
  "vypadek-prijmu": "income-protection",
  investice: "investments",
};

const legacySources: Record<string, { source: LeadSourceContext; cta: string }> = {
  "home-header": { source: "header", cta: "header-primary" },
  "home-hero": { source: "homepage", cta: "home-hero" },
  "home-profile": { source: "homepage", cta: "home-profile" },
  "home-process": { source: "homepage", cta: "home-process" },
  "home-references": { source: "homepage", cta: "home-references" },
  "home-situation": { source: "homepage", cta: "home-situation" },
  "home-situations": { source: "homepage", cta: "home-situations" },
  "home-final": { source: "homepage", cta: "home-final" },
  "about-hero": { source: "about", cta: "about-hero" },
  "about-final": { source: "about", cta: "about-final" },
};

const legacyCanonicalSources: Partial<Record<string, LeadSourceContext>> = {
  home: "homepage",
};

const firstParam = (value: QueryValue) =>
  Array.isArray(value) ? value[0] : value;

export function parseLeadQuery(query: {
  intent?: QueryValue;
  topic?: QueryValue;
  source?: QueryValue;
  cta?: QueryValue;
  situation?: QueryValue;
  situace?: QueryValue;
  src?: QueryValue;
}): ParsedLeadQuery {
  const canonicalIntentValue = firstParam(query.intent);
  const canonicalTopicValue = firstParam(query.topic);
  const canonicalSourceValue = firstParam(query.source);
  const canonicalCtaValue = firstParam(query.cta);
  const canonicalLegacyValue = firstParam(query.situation);
  const secondaryLegacyValue = firstParam(query.situace);
  const legacySourceValue = firstParam(query.src);

  let topic = canonicalTopicValue && isLeadTopic(canonicalTopicValue)
    ? canonicalTopicValue
    : undefined;

  let intent = canonicalIntentValue && isLeadIntent(canonicalIntentValue)
    ? canonicalIntentValue
    : undefined;
  const hasInvalidCanonicalIntent = canonicalIntentValue !== undefined
    && !isLeadIntent(canonicalIntentValue);

  const legacyValue = canonicalLegacyValue === undefined
    ? secondaryLegacyValue
    : canonicalLegacyValue;
  const validLegacyValue = legacyValue && legacyIntentAliases[legacyValue]
    ? legacyValue
    : undefined;

  if (!intent && canonicalIntentValue === undefined && validLegacyValue) {
    intent = legacyIntentAliases[validLegacyValue];
    topic ??= legacyTopics[validLegacyValue];
  }

  if (hasInvalidCanonicalIntent) topic = undefined;
  if (!intent && topic) intent = topicIntent[topic];
  if (intent && topic && topicIntent[topic] !== intent) topic = undefined;

  const canonicalSource = canonicalSourceValue
    && isLeadSourceContext(canonicalSourceValue)
    ? canonicalSourceValue
    : canonicalSourceValue
      ? legacyCanonicalSources[canonicalSourceValue]
    : undefined;
  const legacySource = legacySourceValue
    ? legacySources[legacySourceValue]
    : undefined;
  const source = canonicalSource ?? legacySource?.source ?? "direct";

  const canonicalCta = canonicalCtaValue
    && isAllowedLeadCta(canonicalCtaValue)
    ? canonicalCtaValue
    : undefined;
  const cta = canonicalCta ?? legacySource?.cta;

  return {
    intent,
    topic,
    source,
    cta,
    hasSpecificContext: Boolean(intent && intent !== "unsure"),
  };
}
