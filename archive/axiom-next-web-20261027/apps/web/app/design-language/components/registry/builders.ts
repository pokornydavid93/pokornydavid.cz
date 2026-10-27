import type {
  MaturityStage,
  PatternRegistryEntry,
  RegistryAnatomyItem,
  RegistryKind,
  RegistryProp,
  RegistryResponsiveContract,
  RegistryScope,
  RegistrySemantics,
  RegistryTests,
  RegistryVerification,
  RouteFamilyId,
  RuntimeRegistryEntry,
  RuntimeRegistryLayer,
  SurfaceTone,
  TemplateRegistryEntry,
  TestStatus,
} from "./types";

const allTones: SurfaceTone[] = ["dark", "light", "action"];

const missingTests = (): RegistryTests => ({
  unit: "missing",
  accessibility: "missing",
  visual: "missing",
  responsive: "missing",
  evidence: [],
});

const maturityRank: Record<MaturityStage, number> = {
  specified: 0,
  implemented: 1,
  verified: 2,
  live: 3,
};

const inferRuntimeKind = (id: string, layer: RuntimeRegistryLayer): RegistryKind => {
  if (layer === "layout" || layer === "ui" || layer === "form") return "primitive";
  if (layer === "navigation") return id === "site.skip-link" ? "primitive" : "compound";
  if (id === "domain.hero" || id === "domain.enquiry-form") return "composition";
  if (id === "domain.booking-panel" || id === "domain.cookie-consent") return "integration";
  return "compound";
};

const inferRuntimeScope = (id: string, layer: RuntimeRegistryLayer): RegistryScope => {
  if (layer === "navigation") return "shell";
  if (layer === "domain") return id === "domain.cookie-consent" ? "global" : "domain";
  return "global";
};

const inferredVerification = ({
  kind,
  maturity,
  tests,
}: {
  kind: RegistryKind;
  maturity: MaturityStage;
  tests: RegistryTests;
}): RegistryVerification => {
  const implemented = maturityRank[maturity] >= maturityRank.implemented;
  const evidencePassing = tests.evidence.length > 0 ? "passing" : "missing";

  return {
    runtime: implemented ? "passing" : "missing",
    surfaces: tests.visual,
    reflow: tests.responsive,
    interaction: tests.accessibility,
    accessibility: tests.accessibility,
    route: evidencePassing,
    integration: kind === "integration" ? evidencePassing : "not-applicable",
  };
};

type RuntimeInput = {
  id: string;
  name: string;
  /** Registry layer retained for workspace grouping. */
  kind: RuntimeRegistryLayer;
  registryKind?: RegistryKind;
  scope?: RegistryScope;
  capability: string;
  responsibility: string;
  anatomy: RegistryAnatomyItem[];
  props: RegistryProp[];
  responsive: RegistryResponsiveContract;
  antiUse: string[];
  maturity?: MaturityStage;
  codeRef?: string;
  usageEvidence?: string[];
  routes?: RouteFamilyId[];
  tones?: SurfaceTone[];
  dependencies?: string[];
  variants?: string[];
  sizes?: string[];
  states?: string[];
  semantics?: Partial<RegistrySemantics>;
  tokens?: string[];
  tests?: Partial<RegistryTests>;
  verification?: Partial<RegistryVerification>;
};

export function runtimeEntry(input: RuntimeInput): RuntimeRegistryEntry {
  const {
    kind: layer,
    registryKind,
    scope,
    tones,
    verification,
    ...entry
  } = input;
  const maturity = entry.maturity ?? "specified";
  const kind = registryKind ?? inferRuntimeKind(entry.id, layer);
  const tests: RegistryTests = {
    ...missingTests(),
    ...entry.tests,
    evidence: entry.tests?.evidence ?? [],
  };

  return {
    maturity,
    codeRef: entry.codeRef,
    usageEvidence: [],
    routes: [],
    dependencies: [],
    variants: [],
    sizes: [],
    states: [],
    tokens: [],
    ...entry,
    layer,
    kind,
    scope: scope ?? inferRuntimeScope(entry.id, layer),
    supportedTones: tones ?? allTones,
    semantics: {
      keyboard: [],
      aria: [],
      ...entry.semantics,
    },
    tests,
    verification: {
      ...inferredVerification({ kind, maturity, tests }),
      ...verification,
    },
  };
}

type PatternInput = Omit<
  PatternRegistryEntry,
  | "layer"
  | "kind"
  | "scope"
  | "supportedTones"
  | "verification"
  | "maturity"
  | "codeRef"
  | "usageEvidence"
  | "routes"
  | "dependencies"
  | "variants"
  | "sizes"
  | "states"
  | "semantics"
  | "tokens"
  | "tests"
> &
  Partial<
    Pick<
      PatternRegistryEntry,
      | "maturity"
      | "codeRef"
      | "usageEvidence"
      | "routes"
      | "dependencies"
      | "variants"
      | "sizes"
      | "states"
      | "semantics"
      | "tokens"
      | "tests"
      | "verification"
    >
  > & {
    tones?: SurfaceTone[];
    scope?: RegistryScope;
  };

export function patternEntry(input: PatternInput): PatternRegistryEntry {
  const { scope, tones, verification, ...entry } = input;
  const maturity = entry.maturity ?? "specified";
  const tests: RegistryTests = {
    ...missingTests(),
    ...entry.tests,
    evidence: entry.tests?.evidence ?? [],
  };

  return {
    layer: "pattern",
    kind: "composition",
    scope: scope ?? "domain",
    maturity,
    codeRef: entry.codeRef,
    usageEvidence: [],
    routes: entry.routeFamilies,
    supportedTones: tones ?? allTones,
    dependencies: entry.allowedChildren,
    variants: [],
    sizes: [],
    states: [],
    tokens: [],
    ...entry,
    semantics: {
      keyboard: [],
      aria: [],
      ...entry.semantics,
    },
    tests,
    verification: {
      ...inferredVerification({ kind: "composition", maturity, tests }),
      ...verification,
    },
  };
}

type TemplateInput = Omit<
  TemplateRegistryEntry,
  | "layer"
  | "kind"
  | "scope"
  | "supportedTones"
  | "verification"
  | "maturity"
  | "codeRef"
  | "usageEvidence"
  | "routes"
  | "dependencies"
  | "variants"
  | "sizes"
  | "states"
  | "semantics"
  | "tokens"
  | "tests"
> &
  Partial<
    Pick<
      TemplateRegistryEntry,
      | "maturity"
      | "codeRef"
      | "usageEvidence"
      | "routes"
      | "dependencies"
      | "variants"
      | "sizes"
      | "states"
      | "semantics"
      | "tokens"
      | "tests"
      | "verification"
    >
  > & {
    tones?: SurfaceTone[];
    scope?: RegistryScope;
  };

export function templateEntry(input: TemplateInput): TemplateRegistryEntry {
  const { scope, tones, verification, ...entry } = input;
  const maturity = entry.maturity ?? "specified";
  const tests: RegistryTests = {
    ...missingTests(),
    ...entry.tests,
    evidence: entry.tests?.evidence ?? [],
  };

  return {
    layer: "template",
    kind: "composition",
    scope: scope ?? "shell",
    maturity,
    codeRef: entry.codeRef,
    usageEvidence: [],
    routes: entry.routeFamilies,
    supportedTones: tones ?? allTones,
    dependencies: entry.allowedPatterns,
    variants: [],
    sizes: [],
    states: [],
    tokens: [],
    ...entry,
    semantics: {
      element: "main",
      keyboard: [],
      aria: [],
      ...entry.semantics,
    },
    tests,
    verification: {
      ...inferredVerification({ kind: "composition", maturity, tests }),
      ...verification,
    },
  };
}

export const passingFacet = "passing" satisfies TestStatus;
