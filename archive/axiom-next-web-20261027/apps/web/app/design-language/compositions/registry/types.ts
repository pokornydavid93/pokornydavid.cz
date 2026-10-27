export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type CompositionId = Brand<string, "CompositionId">;
export type CompositionInstanceId = Brand<string, "CompositionInstanceId">;
export type CompositionVariantId = Brand<string, "CompositionVariantId">;
export type SlotId = Brand<string, "SlotId">;
export type CapabilityRoleId = Brand<string, "CapabilityRoleId">;
export type LayoutPrimitiveId = Brand<string, "LayoutPrimitiveId">;
export type LayoutRecipeId = Brand<string, "LayoutRecipeId">;
export type DomainRecipeId = Brand<string, "DomainRecipeId">;
export type TemplateId = Brand<string, "TemplateId">;
export type TemplateRegionId = Brand<string, "TemplateRegionId">;
export type TokenId = Brand<string, "TokenId">;
export type QueryTokenId = Brand<string, "QueryTokenId">;
export type SurfaceRoleId = Brand<string, "SurfaceRoleId">;
export type TreatmentRoleId = Brand<string, "TreatmentRoleId">;
export type FixtureId = Brand<string, "FixtureId">;
export type AssertionId = Brand<string, "AssertionId">;
export type StateId = Brand<string, "StateId">;

export type LayoutMode = "compact" | "medium" | "wide";
export type Density = "compact" | "standard" | "spacious";
export type MotionPolicy = "none" | "micro" | "reveal" | "narrative" | "pinned";
export type CompositionStatus = "draft" | "reviewed" | "stable" | "deprecated";

export type CompositionFamily =
  | "structure"
  | "navigation"
  | "entry"
  | "narrative"
  | "collection"
  | "comparison"
  | "disclosure"
  | "discovery"
  | "process"
  | "proof"
  | "editorial"
  | "conversion"
  | "form";

export type FamilyDisplayGroup =
  | "navigation-structure"
  | "entry-introductions"
  | "content-narrative"
  | "discovery-services"
  | "process"
  | "evidence-trust"
  | "editorial"
  | "conversion-forms"
  | "credentials-documentation";

export type CompositionScope = "section" | "region" | "inline" | "global";
export type CompositionLayer = "system" | "advisory";
export type CompositionSpecimenKind =
  | "canonical"
  | "compact"
  | "medium"
  | "wide"
  | "long-czech"
  | "minimal"
  | "empty"
  | "reduced-motion"
  | "state-submitting"
  | "state-success"
  | "state-error"
  | "invalid";

export type OwnershipContract = {
  landmark:
    | "header"
    | "nav"
    | "section"
    | "article"
    | "aside"
    | "footer"
    | "none";
  ownsContainer: boolean;
  surfaceOwnership: "inherited" | "owned";
  ownsOuterRhythm: boolean;
};

export type CompositionSlot = {
  id: SlotId;
  acceptsCapabilityRoles: CapabilityRoleId[];
  acceptsCompositionIds?: CompositionId[];
  previousComponentIds?: string[];
  baseCardinality: {
    min: number;
    max: number | "unbounded";
  };
  requirementsByVariant?: VariantSlotRequirement[];
  requirementsByMode?: ModeSlotRequirement[];
  contentOverride?: {
    idealWords?: [number, number];
    maxWords?: number;
    maxLines?: Partial<Record<LayoutMode, number>>;
    overflow: "wrap" | "truncate" | "scroll" | "forbidden";
  };
  responsivePriority: "essential" | "supporting" | "optional" | "decorative";
  emptyBehavior: "collapse" | "preserve" | "fallback";
};

export type VariantSlotRequirement = {
  variantId: CompositionVariantId;
  slotId: SlotId;
  cardinality?: Partial<CompositionSlot["baseCardinality"]>;
  requiredIn?: LayoutMode[];
};

export type ModeSlotRequirement = {
  mode: LayoutMode;
  slotId: SlotId;
  cardinality?: Partial<CompositionSlot["baseCardinality"]>;
};

export type CompositionRelation = {
  type: "labels" | "describes" | "controls" | "follows" | "groups";
  from: SlotId;
  to: SlotId;
};

export type CompositionVariant = {
  id: CompositionVariantId;
  label: string;
  description: string;
  layoutRecipeId?: LayoutRecipeId;
  slotRequirements: VariantSlotRequirement[];
};

export type ResponsiveModeContract = {
  layoutRecipeId: LayoutRecipeId;
  placement: Record<SlotId, string>;
  visibility?: Partial<Record<SlotId, "shown" | "hidden" | "collapsed">>;
};

export type MotionStep = {
  targetSlotId: SlotId;
  effect: "fade" | "translate" | "scale" | "clip" | "progress" | "none";
  durationToken?: TokenId;
  easingToken?: TokenId;
  staggerToken?: TokenId;
};

export type CompositionStateContract = {
  id: StateId;
  kind: "loading" | "empty" | "error" | "success" | "submitting" | "active";
  affectedSlots: SlotId[];
  statusAnnouncement?: string;
};

export type CompositionExample = {
  id: string;
  specimenKind: CompositionSpecimenKind;
  variantId: CompositionVariantId;
  domainRecipeId?: DomainRecipeId;
  layoutMode: LayoutMode;
  layoutRecipeId: LayoutRecipeId;
  hostContext: "standalone" | "embedded" | "modal-host" | "sheet-host";
  stateId?: StateId;
  surfaceRole: SurfaceRoleId;
  treatmentRole?: TreatmentRoleId;
  density: Density;
  motionPreference: "full" | "reduced";
  contentProfile: "canonical" | "long" | "minimal" | "empty" | "invalid";
  fixtureId: FixtureId;
  parentInstanceId?: CompositionInstanceId;
  assertionIds: AssertionId[];
};

export type CompositionFixtureProfile = {
  id: FixtureId;
  compositionId: CompositionId;
  contentProfile: CompositionExample["contentProfile"];
  label: string;
  headline: string;
  lead: string;
  slots: Record<string, string | readonly string[]>;
  stressors: string[];
  assertionIds: AssertionId[];
};

export type ContractException = {
  id: string;
  category: "redirect" | "content" | "layout" | "integration";
  owner: string;
  source: string;
  condition: string;
  override: string;
  rationale: string;
  reviewAt: string;
  cannotOverride: Array<
    "source-order" | "accessible-content" | "raw-token-ban" | "role-validation"
  >;
};

export type CompositionContract = {
  schemaVersion: "1.0";
  meta: {
    id: CompositionId;
    name: string;
    family: CompositionFamily;
    displayGroup: FamilyDisplayGroup;
    layer: CompositionLayer;
    scope: CompositionScope;
    status: CompositionStatus;
    version: string;
    intent: string;
    useWhen: string[];
    avoidWhen: string[];
    tags: string[];
    systemOnlyReason?: string;
    supersededBy?: CompositionId;
    removalReason?: string;
  };
  anatomy: {
    labelledBy: SlotId | null;
    sourceOrder: SlotId[];
    slots: CompositionSlot[];
    relations: CompositionRelation[];
  };
  hosting: {
    standalone: OwnershipContract;
    embedded?: OwnershipContract;
  };
  structuralVariants: {
    default: CompositionVariantId;
    options: CompositionVariant[];
    incompatibleCombinations: CompositionVariantId[][];
  };
  layout: {
    supportedRecipeIds: LayoutRecipeId[];
    defaultRecipeId: LayoutRecipeId;
    containerToken: TokenId | null;
    internalSpacingToken: TokenId;
    slotSpacingOverrides: Partial<Record<SlotId, TokenId>>;
    measureBySlot: Partial<Record<SlotId, TokenId>>;
  };
  responsive: {
    basis: "container" | "viewport" | "intrinsic";
    modeQueries: Partial<Record<LayoutMode, QueryTokenId>>;
    modes: Record<LayoutMode, ResponsiveModeContract>;
    invariants: string[];
  };
  surfaces: {
    default: SurfaceRoleId | null;
    allowed: SurfaceRoleId[];
    forbidden: SurfaceRoleId[];
    maxNestedSurfaceDepth: number;
    allowedTreatments: TreatmentRoleId[];
    ownsTreatment: false;
  };
  density: {
    default: Density;
    allowed: Density[];
    tokenMappings: Partial<Record<Density, Record<string, TokenId>>>;
  };
  motion: {
    defaultPolicy: MotionPolicy;
    allowedPolicies: MotionPolicy[];
    trigger: "none" | "enter" | "intersection" | "interaction" | "scroll-progress";
    choreography: MotionStep[];
    durationTokens: TokenId[];
    easingTokens: TokenId[];
    replay: "never" | "on-reentry" | "interactive";
    reducedMotionFallback: string;
    contentAccessibleBeforeCompletion: true;
  };
  states: CompositionStateContract[];
  accessibility: {
    headingPolicy: "none" | "labelled-region" | "document-heading";
    focusOrder: SlotId[];
    ariaRelations: CompositionRelation[];
    keyboardRuleIds: string[];
    motionRuleIds: string[];
  };
  nesting: {
    forbiddenAncestors: CompositionId[];
    maxCompositionDepth: number;
  };
  externalDependencies: string[];
  examples: CompositionExample[];
  exceptions: ContractException[];
};

export type LayoutPrimitiveContract = {
  id: LayoutPrimitiveId;
  intent: string;
  intrinsic: boolean;
  supportedConfiguration: string[];
  intrinsicFallback: string;
  tokenIds: TokenId[];
};

export type LayoutRecipeContract = {
  id: LayoutRecipeId;
  intent: string;
  primitiveIds: LayoutPrimitiveId[];
  supportedModes: LayoutMode[];
  areas: string[];
  placementByMode: Record<LayoutMode, Record<SlotId, string>>;
  tokenIds: TokenId[];
  intrinsicFallback: string;
};

export type CapabilityRoleContract = {
  id: CapabilityRoleId;
  intent: string;
  allowedComponentCapabilities: string[];
  defaultContentContract?: {
    idealWords?: [number, number];
    maxWords?: number;
    maxLines?: Partial<Record<LayoutMode, number>>;
    overflow: "wrap" | "truncate" | "scroll" | "forbidden";
  };
};

export type DomainRecipeContract = {
  id: DomainRecipeId;
  compositionId: CompositionId;
  intent: string;
  structuralVariantId: CompositionVariantId;
  layoutRecipeId: LayoutRecipeId;
  placementContext:
    | "page"
    | "section"
    | "inline"
    | "terminal"
    | "sticky"
    | "modal-host"
    | "sheet-host";
  surfaceRole: SurfaceRoleId;
  treatmentRole?: TreatmentRoleId;
  density: Density;
  motionPolicy: MotionPolicy;
  requiredFixtureSchema: string;
  systemReason?: string;
};

export type CandidateClassificationRecord = {
  candidateId: string;
  decision:
    | "promoted"
    | "merged"
    | "domain-recipe"
    | "layout-recipe"
    | "component-owned"
    | "template-owned"
    | "rejected";
  targetCompositionId?: CompositionId;
  targetDomainRecipeId?: DomainRecipeId;
  targetLayoutRecipeId?: LayoutRecipeId;
  rationale: string;
  evidenceRoutes: string[];
  sourceFiles: string[];
};

export type PageTemplateContract = {
  id: TemplateId;
  name: string;
  globalRegions: {
    headerInstanceId: CompositionInstanceId;
    mainLandmarkOwnedByTemplate: true;
    footerInstanceId: CompositionInstanceId;
  };
  orderedRegions: TemplateRegionContract[];
};

export type TemplateRegionContract = {
  id: TemplateRegionId;
  intent: string;
  cardinality: {
    min: number;
    max: number | "unbounded";
  };
  acceptsCompositionIds: CompositionId[];
  acceptsDomainRecipeIds?: DomainRecipeId[];
  conditionalRequirements?: string[];
};

export type CompositionInstanceContract = {
  instanceId: CompositionInstanceId;
  compositionId: CompositionId;
  structuralVariantId: CompositionVariantId;
  domainRecipeId?: DomainRecipeId;
  layoutRecipeId: LayoutRecipeId;
  placementContext: DomainRecipeContract["placementContext"];
  surfaceRole: SurfaceRoleId;
  treatmentRole?: TreatmentRoleId;
  density: Density;
  motionPolicy: MotionPolicy;
  sourceFiles: string[];
  routePattern?: string;
  fixtureOrDataVariants?: string[];
};

export type CoveredSection =
  | {
      status: "mapped";
      sectionKey: string;
      instanceId: CompositionInstanceId;
    }
  | {
      status: "template-owned";
      sectionKey: string;
      templateRegionId: TemplateRegionId;
    }
  | {
      status: "exception";
      sectionKey: string;
      exceptionId: string;
      reason: string;
    }
  | {
      status: "unmapped";
      sectionKey: string;
      sourceFiles: string[];
    };

export type RouteCompositionCoverage = {
  routePattern: string;
  templateId: TemplateId;
  sourceManifest: string;
  sections: CoveredSection[];
};

export type RouteSourceKind =
  | "public"
  | "redirect"
  | "runtime"
  | "not-found";

export type RouteSourceSection = {
  sectionKey: string;
  instanceId?: CompositionInstanceId;
  exceptionId?: string;
  sourceFiles: string[];
  fixtureOrDataVariants?: string[];
};

export type RouteSourceManifest = {
  routePattern: string;
  kind: RouteSourceKind;
  entryFile: string;
  sourceManifest: string;
  dynamic: boolean;
  sourceFiles: string[];
  fixtureOrDataVariants?: string[];
  sections: RouteSourceSection[];
};

export type InterfaceInventoryEntry = {
  route: string;
  sourceFiles: string[];
  sectionKey: string;
  currentName: string;
  intent: string;
  requiredRoles: CapabilityRoleId[];
  optionalRoles: CapabilityRoleId[];
  currentLayoutPrimitives: LayoutPrimitiveId[];
  currentSurfaceContext: string;
  currentResponsiveBehavior: string;
  currentMotionBehavior: string;
  proposedCompositionId: CompositionId | null;
  proposedVariant: CompositionVariantId | null;
  classification:
    | "primitive"
    | "component"
    | "composition"
    | "template"
    | "page-specific-exception";
  duplicationGroup?: string;
  notes?: string[];
};

export type CompositionFamilyDefinition = {
  id: FamilyDisplayGroup;
  label: string;
  description: string;
};
