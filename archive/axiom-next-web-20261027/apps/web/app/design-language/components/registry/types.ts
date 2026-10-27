export type RegistryLayer =
  | "layout"
  | "ui"
  | "form"
  | "navigation"
  | "domain"
  | "pattern"
  | "template";

export type RuntimeRegistryLayer = Exclude<RegistryLayer, "pattern" | "template">;
export type RegistryKind = "primitive" | "compound" | "composition" | "integration";
export type RegistryScope = "global" | "shell" | "domain";
export type MaturityStage = "specified" | "implemented" | "verified" | "live";
export type SurfaceTone = "dark" | "light" | "action";
export type TestStatus = "not-applicable" | "missing" | "passing" | "failing";
export type VerificationFacet =
  | "runtime"
  | "surfaces"
  | "reflow"
  | "interaction"
  | "accessibility"
  | "route"
  | "integration";

export type RegistryVerification = Record<VerificationFacet, TestStatus>;

export type RouteFamilyId =
  | "route.home"
  | "route.services-index"
  | "route.service-detail"
  | "route.process"
  | "route.about"
  | "route.blog-index"
  | "route.article-detail"
  | "route.overview"
  | "route.legal"
  | "route.system";

export type RegistryAnatomyItem = {
  name: string;
  required: boolean;
  description: string;
};

export type RegistryProp = {
  name: string;
  type: string;
  default?: string;
  description: string;
};

export type RegistrySemantics = {
  element?: string;
  role?: string;
  keyboard: string[];
  aria: string[];
};

export type RegistryResponsiveContract = {
  invariant: string;
  narrow: string;
  wide: string;
};

export type RegistryTests = {
  unit: TestStatus;
  accessibility: TestStatus;
  visual: TestStatus;
  responsive: TestStatus;
  evidence: string[];
};

export type RegistryEntryBase = {
  id: string;
  name: string;
  layer: RegistryLayer;
  kind: RegistryKind;
  scope: RegistryScope;
  capability: string;
  responsibility: string;
  maturity: MaturityStage;
  codeRef?: string;
  usageEvidence: string[];
  routes: RouteFamilyId[];
  supportedTones: SurfaceTone[];
  dependencies: string[];
  anatomy: RegistryAnatomyItem[];
  variants: string[];
  sizes: string[];
  states: string[];
  props: RegistryProp[];
  semantics: RegistrySemantics;
  responsive: RegistryResponsiveContract;
  tokens: string[];
  antiUse: string[];
  tests: RegistryTests;
  verification: RegistryVerification;
};

export type RuntimeRegistryEntry = RegistryEntryBase & {
  layer: RuntimeRegistryLayer;
};

export type PatternRegistryEntry = RegistryEntryBase & {
  layer: "pattern";
  kind: "composition";
  slots: string[];
  allowedChildren: string[];
  surfaceSequence: string[];
  routeFamilies: RouteFamilyId[];
};

export type TemplateRegistryEntry = RegistryEntryBase & {
  layer: "template";
  kind: "composition";
  slots: string[];
  allowedPatterns: string[];
  routeFamilies: RouteFamilyId[];
};

export type ComponentRegistryEntry =
  | RuntimeRegistryEntry
  | PatternRegistryEntry
  | TemplateRegistryEntry;

export type RouteFamilyContract = {
  id: RouteFamilyId;
  label: string;
  templateId: string;
  paths: string[];
  sourceFiles: string[];
  requiredPatternIds: string[];
  optionalPatternIds: string[];
  status: "current" | "planned";
};

export type RegistryMigration = {
  previous: string;
  target: string;
  disposition: "merged" | "split" | "internalized" | "removed";
  note: string;
};

export type ComponentRegistry = {
  schemaVersion: string;
  runtime: RuntimeRegistryEntry[];
  patterns: PatternRegistryEntry[];
  templates: TemplateRegistryEntry[];
  routeFamilies: RouteFamilyContract[];
  migrations: RegistryMigration[];
};
