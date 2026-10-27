import type {
  AssertionId,
  CapabilityRoleId,
  CompositionContract,
  CompositionExample,
  CompositionFamily,
  CompositionId,
  CompositionLayer,
  CompositionRelation,
  CompositionScope,
  CompositionSlot,
  CompositionStatus,
  CompositionVariant,
  CompositionVariantId,
  Density,
  FamilyDisplayGroup,
  FixtureId,
  LayoutMode,
  LayoutPrimitiveId,
  LayoutRecipeContract,
  LayoutRecipeId,
  MotionPolicy,
  OwnershipContract,
  QueryTokenId,
  SlotId,
  SurfaceRoleId,
  TemplateId,
  TemplateRegionId,
  TokenId,
  TreatmentRoleId,
} from "./types";

export const asCompositionId = (value: string) => value as CompositionId;
export const asCompositionInstanceId = (value: string) =>
  value as import("./types").CompositionInstanceId;
export const asVariantId = (value: string) => value as CompositionVariantId;
export const asSlotId = (value: string) => value as SlotId;
export const asRoleId = (value: string) => value as CapabilityRoleId;
export const asLayoutPrimitiveId = (value: string) => value as LayoutPrimitiveId;
export const asLayoutRecipeId = (value: string) => value as LayoutRecipeId;
export const asDomainRecipeId = (value: string) =>
  value as import("./types").DomainRecipeId;
export const asTemplateId = (value: string) => value as TemplateId;
export const asTemplateRegionId = (value: string) => value as TemplateRegionId;
export const asTokenId = (value: string) => value as TokenId;
export const asQueryTokenId = (value: string) => value as QueryTokenId;
export const asSurfaceRoleId = (value: string) => value as SurfaceRoleId;
export const asTreatmentRoleId = (value: string) => value as TreatmentRoleId;
export const asFixtureId = (value: string) => value as FixtureId;
export const asAssertionId = (value: string) => value as AssertionId;
export const asStateId = (value: string) => value as import("./types").StateId;

const embeddedOwnership: OwnershipContract = {
  landmark: "none",
  ownsContainer: false,
  surfaceOwnership: "inherited",
  ownsOuterRhythm: false,
};

const standaloneSectionOwnership: OwnershipContract = {
  landmark: "section",
  ownsContainer: true,
  surfaceOwnership: "owned",
  ownsOuterRhythm: true,
};

const globalOwnership: OwnershipContract = {
  landmark: "none",
  ownsContainer: false,
  surfaceOwnership: "owned",
  ownsOuterRhythm: false,
};

export type SlotInput = {
  id: string;
  roles: string[];
  min?: number;
  max?: number | "unbounded";
  priority?: CompositionSlot["responsivePriority"];
  emptyBehavior?: CompositionSlot["emptyBehavior"];
  acceptsCompositionIds?: string[];
  content?: CompositionSlot["contentOverride"];
};

export type CompositionDefinitionInput = {
  id: string;
  name: string;
  family: CompositionFamily;
  displayGroup: FamilyDisplayGroup;
  layer?: CompositionLayer;
  scope?: CompositionScope;
  status?: CompositionStatus;
  version?: string;
  intent: string;
  useWhen: string[];
  avoidWhen?: string[];
  tags?: string[];
  slots: SlotInput[];
  labelledBy?: string | null;
  relations?: Array<{
    type: CompositionRelation["type"];
    from: string;
    to: string;
  }>;
  variants?: Array<{
    id: string;
    label: string;
    description: string;
    layoutRecipeId?: string;
  }>;
  defaultVariantId?: string;
  layoutRecipeIds: string[];
  defaultLayoutRecipeId: string;
  containerToken?: string | null;
  spacingToken?: string;
  measureBySlot?: Record<string, string>;
  responsiveBasis?: CompositionContract["responsive"]["basis"];
  surfaces?: {
    default?: string | null;
    allowed?: string[];
    forbidden?: string[];
    treatments?: string[];
    maxNestedSurfaceDepth?: number;
  };
  density?: {
    default?: Density;
    allowed?: Density[];
  };
  motion?: {
    policy?: MotionPolicy;
    allowed?: MotionPolicy[];
    trigger?: CompositionContract["motion"]["trigger"];
    replay?: CompositionContract["motion"]["replay"];
    fallback?: string;
  };
  states?: CompositionContract["states"];
  nesting?: {
    acceptsCompositionIds?: string[];
    maxCompositionDepth?: number;
    forbiddenAncestors?: string[];
  };
  externalDependencies?: string[];
  examples?: CompositionExample[];
  systemOnlyReason?: string;
};

export function defineSlot(input: SlotInput): CompositionSlot {
  return {
    id: asSlotId(input.id),
    acceptsCapabilityRoles: input.roles.map(asRoleId),
    acceptsCompositionIds: input.acceptsCompositionIds?.map(asCompositionId),
    baseCardinality: {
      min: input.min ?? 1,
      max: input.max ?? 1,
    },
    contentOverride: input.content,
    responsivePriority: input.priority ?? "essential",
    emptyBehavior: input.emptyBehavior ?? "collapse",
  };
}

function defaultPlacement(slots: CompositionSlot[], mode: LayoutMode) {
  return Object.fromEntries(
    slots.map((slot, index) => [slot.id, `${mode}-area-${index + 1}`])
  ) as Record<SlotId, string>;
}

function makeDefaultVariant(
  compositionId: string,
  layoutRecipeId: string
): CompositionVariant {
  return {
    id: asVariantId(`${compositionId}.variant.standard`),
    label: "Standard",
    description: "Canonical source order with default layout recipe.",
    layoutRecipeId: asLayoutRecipeId(layoutRecipeId),
    slotRequirements: [],
  };
}

export function defineComposition(
  input: CompositionDefinitionInput
): CompositionContract {
  const slots = input.slots.map(defineSlot);
  const defaultLayoutRecipeId = asLayoutRecipeId(input.defaultLayoutRecipeId);
  const variants =
    input.variants?.map((variant) => ({
      id: asVariantId(variant.id),
      label: variant.label,
      description: variant.description,
      layoutRecipeId: variant.layoutRecipeId
        ? asLayoutRecipeId(variant.layoutRecipeId)
        : undefined,
      slotRequirements: [],
    })) ?? [makeDefaultVariant(input.id, input.defaultLayoutRecipeId)];
  const defaultVariantId = input.defaultVariantId
    ? asVariantId(input.defaultVariantId)
    : variants[0]?.id ?? asVariantId(`${input.id}.variant.standard`);
  const focusOrder = slots
    .filter((slot) => slot.responsivePriority !== "decorative")
    .map((slot) => slot.id);
  const allowedSurfaces = (input.surfaces?.allowed ?? [
    "surface.section.dark",
    "surface.card.dark",
    "surface.paper",
  ]).map(asSurfaceRoleId);
  const defaultSurface =
    input.surfaces?.default === null
      ? null
      : asSurfaceRoleId(input.surfaces?.default ?? allowedSurfaces[0]);
  const defaultDensity = input.density?.default ?? "standard";
  const allowedDensities = input.density?.allowed ?? [
    "compact",
    "standard",
    "spacious",
  ];
  const motionPolicy = input.motion?.policy ?? "reveal";
  const durationTokens =
    motionPolicy === "none" ? [] : [asTokenId("--duration-reveal")];
  const easingTokens =
    motionPolicy === "none" ? [] : [asTokenId("--ease-standard")];

  return {
    schemaVersion: "1.0",
    meta: {
      id: asCompositionId(input.id),
      name: input.name,
      family: input.family,
      displayGroup: input.displayGroup,
      layer: input.layer ?? "advisory",
      scope: input.scope ?? "section",
      status: input.status ?? "draft",
      version: input.version ?? "0.1.0",
      intent: input.intent,
      useWhen: input.useWhen,
      avoidWhen: input.avoidWhen ?? [],
      tags: input.tags ?? [],
      systemOnlyReason: input.systemOnlyReason,
    },
    anatomy: {
      labelledBy:
        input.labelledBy === undefined
          ? slots[0]?.id ?? null
          : input.labelledBy === null
            ? null
            : asSlotId(input.labelledBy),
      sourceOrder: slots.map((slot) => slot.id),
      slots,
      relations:
        input.relations?.map((relation) => ({
          type: relation.type,
          from: asSlotId(relation.from),
          to: asSlotId(relation.to),
        })) ?? [],
    },
    hosting: {
      standalone:
        input.scope === "global" ? globalOwnership : standaloneSectionOwnership,
      embedded: embeddedOwnership,
    },
    structuralVariants: {
      default: defaultVariantId,
      options: variants,
      incompatibleCombinations: [],
    },
    layout: {
      supportedRecipeIds: input.layoutRecipeIds.map(asLayoutRecipeId),
      defaultRecipeId: defaultLayoutRecipeId,
      containerToken:
        input.containerToken === null
          ? null
          : asTokenId(input.containerToken ?? "--container-page-standard-max"),
      internalSpacingToken: asTokenId(input.spacingToken ?? "--space-composition"),
      slotSpacingOverrides: {},
      measureBySlot: Object.fromEntries(
        Object.entries(input.measureBySlot ?? {}).map(([slotId, token]) => [
          asSlotId(slotId),
          asTokenId(token),
        ])
      ) as Partial<Record<SlotId, TokenId>>,
    },
    responsive: {
      basis: input.responsiveBasis ?? "container",
      modeQueries: {
        compact: asQueryTokenId("--breakpoint-compact-max"),
        medium: asQueryTokenId("--breakpoint-media-min"),
        wide: asQueryTokenId("--breakpoint-cinematic-min"),
      },
      modes: {
        compact: {
          layoutRecipeId: defaultLayoutRecipeId,
          placement: defaultPlacement(slots, "compact"),
        },
        medium: {
          layoutRecipeId: defaultLayoutRecipeId,
          placement: defaultPlacement(slots, "medium"),
        },
        wide: {
          layoutRecipeId: defaultLayoutRecipeId,
          placement: defaultPlacement(slots, "wide"),
        },
      },
      invariants: [
        "Canonical source order is stable across modes.",
        "Essential slots remain visible in compact, medium, and wide modes.",
        "Layout mode may change placement but not semantic ownership.",
      ],
    },
    surfaces: {
      default: defaultSurface,
      allowed: allowedSurfaces,
      forbidden: (input.surfaces?.forbidden ?? []).map(asSurfaceRoleId),
      maxNestedSurfaceDepth: input.surfaces?.maxNestedSurfaceDepth ?? 2,
      allowedTreatments: (input.surfaces?.treatments ?? [
        "treatment.none",
      ]).map(asTreatmentRoleId),
      ownsTreatment: false,
    },
    density: {
      default: defaultDensity,
      allowed: allowedDensities,
      tokenMappings: Object.fromEntries(
        allowedDensities.map((density) => [
          density,
          { gap: asTokenId(input.spacingToken ?? "--space-composition") },
        ])
      ) as Partial<Record<Density, Record<string, TokenId>>>,
    },
    motion: {
      defaultPolicy: motionPolicy,
      allowedPolicies: input.motion?.allowed ?? ["none", "micro", "reveal"],
      trigger: input.motion?.trigger ?? (motionPolicy === "none" ? "none" : "intersection"),
      choreography:
        motionPolicy === "none"
          ? []
          : focusOrder.slice(0, 2).map((slotId) => ({
              targetSlotId: slotId,
              effect: "fade" as const,
              durationToken: asTokenId("--duration-reveal"),
              easingToken: asTokenId("--ease-standard"),
            })),
      durationTokens,
      easingTokens,
      replay: input.motion?.replay ?? "never",
      reducedMotionFallback:
        input.motion?.fallback ??
        "Render all semantic content in static source order without choreography.",
      contentAccessibleBeforeCompletion: true,
    },
    states: input.states ?? [],
    accessibility: {
      headingPolicy: input.scope === "inline" ? "none" : "labelled-region",
      focusOrder,
      ariaRelations:
        input.relations?.map((relation) => ({
          type: relation.type,
          from: asSlotId(relation.from),
          to: asSlotId(relation.to),
        })) ?? [],
      keyboardRuleIds: ["keyboard.logical-focus-order"],
      motionRuleIds: ["motion.reduced-static-fallback"],
    },
    nesting: {
      forbiddenAncestors:
        input.nesting?.forbiddenAncestors?.map(asCompositionId) ?? [],
      maxCompositionDepth: input.nesting?.maxCompositionDepth ?? 2,
    },
    externalDependencies: input.externalDependencies ?? [],
    examples: input.examples ?? [],
    exceptions: [],
  };
}

export function defineLayoutRecipe(input: {
  id: string;
  intent: string;
  primitives: string[];
  areas: string[];
  tokens: string[];
  fallback: string;
}): LayoutRecipeContract {
  const placement = Object.fromEntries(
    input.areas.map((area) => [asSlotId(area), area])
  ) as Record<SlotId, string>;

  return {
    id: asLayoutRecipeId(input.id),
    intent: input.intent,
    primitiveIds: input.primitives.map(asLayoutPrimitiveId),
    supportedModes: ["compact", "medium", "wide"],
    areas: input.areas,
    placementByMode: {
      compact: placement,
      medium: placement,
      wide: placement,
    },
    tokenIds: input.tokens.map(asTokenId),
    intrinsicFallback: input.fallback,
  };
}
