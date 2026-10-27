import {
  LEAD_TOPICS,
  type LeadTopic as LegacyLeadTopic,
} from "@axiom-dp/contracts/lead";

export const SERVICE_PRESENTATION_ICON_KEYS = [
  "building-2",
  "car",
  "compass",
  "home",
  "landmark",
  "line-chart",
  "shield-alert",
  "shield-check",
  "wallet-cards",
] as const;

export type ServicePresentationIconKey =
  (typeof SERVICE_PRESENTATION_ICON_KEYS)[number];

export const SERVICE_PRESENTATION_LEAD_TOPICS = [
  "financial-plan",
  "mortgage",
  "property-sale",
  "business-financing",
  "income-protection",
  "property-insurance",
  "vehicle-insurance",
  "liability-insurance",
  "investments",
] as const;

export type ServicePresentationLeadTopic =
  (typeof SERVICE_PRESENTATION_LEAD_TOPICS)[number];

export type RepositoryServicePresentationV1 = Readonly<{
  icon_key: ServicePresentationIconKey;
  short_description: string;
  tags: readonly [string, string, string];
  cta_label: string;
  lead_topic: ServicePresentationLeadTopic;
  legacy_lead_topic: LegacyLeadTopic;
  featured_on_landing: boolean;
  badge?: string;
}>;

export type RepositoryServiceV1 = Readonly<{
  key: string;
  kind: "service";
  name: string;
  description: string;
  presentation: RepositoryServicePresentationV1;
}>;

export type RepositoryServiceCatalogV1 = Readonly<{
  schema_version: 1;
  items: readonly RepositoryServiceV1[];
}>;

type UnknownRecord = Record<string, unknown>;

const KEY_PATTERN =
  /^(?:[a-z0-9]|[a-z0-9][a-z0-9-]{0,62}[a-z0-9])$/u;
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;
const ICON_KEYS = new Set<string>(SERVICE_PRESENTATION_ICON_KEYS);
const LEAD_TOPIC_KEYS = new Set<string>(SERVICE_PRESENTATION_LEAD_TOPICS);
const LEGACY_LEAD_TOPICS = new Set<string>(LEAD_TOPICS);

export class ServicePresentationIntegrityError extends Error {
  constructor() {
    super("Repository service presentation contract is invalid.");
    this.name = "ServicePresentationIntegrityError";
  }
}

function invalid(): never {
  throw new ServicePresentationIntegrityError();
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: UnknownRecord,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function isSafeText(value: unknown, maximumRunes: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim() &&
    [...value].length <= maximumRunes &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}

function isPresentation(value: unknown): value is RepositoryServicePresentationV1 {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "icon_key",
        "short_description",
        "tags",
        "cta_label",
        "lead_topic",
        "legacy_lead_topic",
        "featured_on_landing",
      ],
      ["badge"],
    ) ||
    typeof value.icon_key !== "string" ||
    !ICON_KEYS.has(value.icon_key) ||
    !isSafeText(value.short_description, 500) ||
    !Array.isArray(value.tags) ||
    value.tags.length !== 3 ||
    !value.tags.every((tag) => isSafeText(tag, 80)) ||
    new Set(value.tags).size !== value.tags.length ||
    !isSafeText(value.cta_label, 160) ||
    typeof value.lead_topic !== "string" ||
    !LEAD_TOPIC_KEYS.has(value.lead_topic) ||
    typeof value.legacy_lead_topic !== "string" ||
    !LEGACY_LEAD_TOPICS.has(value.legacy_lead_topic) ||
    typeof value.featured_on_landing !== "boolean"
  ) {
    return false;
  }
  return value.badge === undefined || isSafeText(value.badge, 80);
}

function isRepositoryService(value: unknown): value is RepositoryServiceV1 {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["key", "kind", "name", "description", "presentation"]) &&
    typeof value.key === "string" &&
    KEY_PATTERN.test(value.key) &&
    value.kind === "service" &&
    isSafeText(value.name, 160) &&
    isSafeText(value.description, 2_000) &&
    isPresentation(value.presentation)
  );
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as UnknownRecord)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

export function assertRepositoryServiceCatalogV1(
  value: unknown,
): RepositoryServiceCatalogV1 {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "items"]) ||
    value.schema_version !== 1 ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > 100
  ) {
    return invalid();
  }

  const keys = new Set<string>();
  for (const item of value.items) {
    if (!isRepositoryService(item) || keys.has(item.key)) return invalid();
    keys.add(item.key);
  }

  return deepFreeze(value as RepositoryServiceCatalogV1);
}
