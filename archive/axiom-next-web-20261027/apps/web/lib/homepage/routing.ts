import type {
  InternalRoute,
  OverviewSource,
  SituationId,
} from "./types";

export const INTERNAL_ROUTE_PATHS = [
  "/",
  "/sluzby/",
  "/jak-pracuji/",
  "/reference/",
  "/kdo-jsem/",
  "/clanky/",
  "/pravni-informace/",
  "/zasady-zpracovani-osobnich-udaju/",
  "/cookies-a-mereni/",
  "/refixace-hypoteky/",
  "/ziskat-prehled/",
  "/ziskat-prehled/dekujeme/",
] as const;

export const SITUATION_IDS = [
  "plan",
  "financovani",
  "ochrana",
  "rezerva-investice",
  "mortgage-refixation",
  "new-housing",
  "insurance-review",
  "income-protection",
  "investing",
  "refixace",
  "nova-hypoteka",
  "kontrola-pojisteni",
  "vypadek-prijmu",
  "investice",
  "orientace",
] as const satisfies readonly SituationId[];

export const PRIMARY_SITUATION_IDS = [
  "mortgage-refixation",
  "new-housing",
  "insurance-review",
  "income-protection",
  "investing",
] as const satisfies readonly SituationId[];

export const OVERVIEW_SOURCES = [
  "home-header",
  "home-hero",
  "home-profile",
  "home-process",
  "home-references",
  "home-situation",
  "home-situations",
  "home-final",
  "direct",
] as const satisfies readonly OverviewSource[];

const routePathSet = new Set<string>(INTERNAL_ROUTE_PATHS);
const situationSet = new Set<string>(SITUATION_IDS);
const sourceSet = new Set<string>(OVERVIEW_SOURCES);
const legacySituationAliases: Record<string, SituationId> = {
  bydleni: "financovani",
  "ochrana-prijmu": "ochrana",
};

export const internalRoute = (href: string): InternalRoute => {
  const path = href.split(/[?#]/u, 1)[0] || "/";
  const normalizedPath = path === "/" || path.endsWith("/") ? path : `${path}/`;

  if (!routePathSet.has(normalizedPath)) {
    throw new Error(`Unknown internal route: ${href}`);
  }

  return href as InternalRoute;
};

export const buildOverviewHref = ({
  situation,
  source,
}: {
  situation?: SituationId;
  source: Exclude<OverviewSource, "direct">;
}): InternalRoute => {
  const query = new URLSearchParams({ src: source });
  if (situation) query.set("situation", situation);
  return internalRoute(`/ziskat-prehled/?${query.toString()}`);
};

export const buildSituationHref = ({
  path,
  situation,
  source,
}: {
  path: (typeof INTERNAL_ROUTE_PATHS)[number];
  situation: SituationId;
  source: Exclude<OverviewSource, "direct">;
}): InternalRoute => {
  const query = new URLSearchParams({ src: source, situation });
  return internalRoute(`${path}?${query.toString()}`);
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parseOverviewQuery = (query: {
  situation?: string | string[];
  situace?: string | string[];
  src?: string | string[];
}) => {
  const canonicalValue = firstParam(query.situation);
  const legacyValue = firstParam(query.situace);
  const sourceValue = firstParam(query.src);
  const canonicalSituation = canonicalValue && situationSet.has(canonicalValue)
    ? canonicalValue
    : !canonicalValue && legacyValue
      ? legacySituationAliases[legacyValue] ?? legacyValue
      : undefined;

  return {
    situation: canonicalSituation && situationSet.has(canonicalSituation)
      ? (canonicalSituation as SituationId)
      : undefined,
    source: sourceValue && sourceSet.has(sourceValue)
      ? (sourceValue as OverviewSource)
      : "direct",
  } as const;
};

export const isKnownInternalHref = (href: string) => {
  const path = href.split(/[?#]/u, 1)[0] || "/";
  const normalizedPath = path === "/" || path.endsWith("/") ? path : `${path}/`;
  return routePathSet.has(normalizedPath);
};

export const isSituationId = (value: string): value is SituationId =>
  situationSet.has(value);

export const isOverviewSource = (value: string): value is OverviewSource =>
  sourceSet.has(value);
