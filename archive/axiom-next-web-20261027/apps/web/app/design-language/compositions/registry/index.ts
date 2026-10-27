import { navigationCompositions } from "./navigation";
import { entryCompositions } from "./entry";
import { narrativeCompositions } from "./narrative";
import { discoveryCompositions } from "./discovery";
import { processCompositions } from "./process";
import { proofCompositions } from "./proof";
import { editorialCompositions } from "./editorial";
import { conversionCompositions } from "./conversion";
import { capabilityRoles } from "./roles";
import { layoutPrimitives, layoutRecipes } from "./layout-primitives";
import { domainRecipes } from "./recipes";
import { pageTemplates } from "./templates";
import {
  compositionInstances,
  routeCompositionCoverage,
} from "./coverage";
import {
  candidateClassifications,
  deprecatedCompositionAliases,
} from "./deprecated-aliases";
import {
  compositionFixtureCatalog,
} from "./fixtures";
import {
  compositionSpecimenRecords,
  getCompositionExamples,
  requiredReviewedSpecimenKinds,
  reviewedSpecimenSeeds,
} from "./specimens";
import {
  internalRouteSourcePrefixes,
  routeSourceManifests,
} from "./source-manifest";
import type {
  CompositionContract,
  CompositionFamilyDefinition,
  CompositionId,
  InterfaceInventoryEntry,
  RouteCompositionCoverage,
} from "./types";

export type * from "./types";

export const COMPOSITION_SCHEMA_VERSION = "1.0";

export const compositionFamilyDefinitions = [
  {
    id: "navigation-structure",
    label: "Navigation & Structure",
    description: "Global shell, local orientation, sticky actions, and page closure.",
  },
  {
    id: "entry-introductions",
    label: "Entry & Introductions",
    description: "Page and section openings with stable heading/action anatomy.",
  },
  {
    id: "content-narrative",
    label: "Content & Narrative",
    description: "Narrative relationships, collections, comparisons, disclosure, and longform flow.",
  },
  {
    id: "discovery-services",
    label: "Discovery & Services",
    description: "Visitor situation mapping, service overview, scope, and decision guidance.",
  },
  {
    id: "process",
    label: "Process",
    description: "Advisory journey, step spotlight, and narrative process behavior.",
  },
  {
    id: "evidence-trust",
    label: "Evidence & Trust",
    description: "Advisor profile, proof clusters, testimonials, case snapshots, and regulatory proof.",
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Article hub, article detail, longform shells, evidence footers, and related content.",
  },
  {
    id: "conversion-forms",
    label: "Conversion & Forms",
    description: "Decision prompts, contact paths, lead capture, screening, and completion states.",
  },
  {
    id: "credentials-documentation",
    label: "Credentials & Documentation",
    description: "Credential registries and document detail patterns.",
  },
] as const satisfies ReadonlyArray<CompositionFamilyDefinition>;

export const surfaceRoleIds = [
  "surface.section.dark",
  "surface.card.dark",
  "surface.paper",
  "surface.action",
  "surface.hero",
] as const;

export const treatmentRoleIds = [
  "treatment.none",
  "treatment.cinematic",
  "treatment.transparent-overlay",
] as const;

const baseCompositionContracts = [
  ...navigationCompositions,
  ...entryCompositions,
  ...narrativeCompositions,
  ...discoveryCompositions,
  ...processCompositions,
  ...proofCompositions,
  ...editorialCompositions,
  ...conversionCompositions,
] as const satisfies ReadonlyArray<CompositionContract>;

export const compositionContracts = baseCompositionContracts.map((composition) => ({
  ...composition,
  examples: getCompositionExamples(composition.meta.id),
})) satisfies ReadonlyArray<CompositionContract>;

export const compositionRegistry = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  families: compositionFamilyDefinitions,
  capabilityRoles,
  layoutPrimitives,
  layoutRecipes,
  compositions: compositionContracts,
  domainRecipes,
  pageTemplates,
  compositionInstances,
  routeCompositionCoverage,
  compositionFixtureCatalog,
  compositionSpecimens: compositionSpecimenRecords,
  routeSourceManifests,
  deprecatedAliases: deprecatedCompositionAliases,
  candidateClassifications,
} as const;

export {
  capabilityRoles,
  layoutPrimitives,
  layoutRecipes,
  domainRecipes,
  pageTemplates,
  compositionInstances,
  routeCompositionCoverage,
  compositionFixtureCatalog,
  compositionSpecimenRecords,
  internalRouteSourcePrefixes,
  routeSourceManifests,
  requiredReviewedSpecimenKinds,
  reviewedSpecimenSeeds,
  deprecatedCompositionAliases,
  candidateClassifications,
};

export const compositionById = new Map(
  compositionContracts.map((composition) => [composition.meta.id, composition])
);

export const compositionInstanceById = new Map(
  compositionInstances.map((instance) => [instance.instanceId, instance])
);

export function getCompositionById(id: CompositionId) {
  return compositionById.get(id);
}

function getMappedCoverageSections(coverage: RouteCompositionCoverage) {
  return coverage.sections.filter((section) => section.status === "mapped");
}

export function getRouteUsageCount(compositionId: CompositionId) {
  const instanceIds = new Set(
    compositionInstances
      .filter((instance) => instance.compositionId === compositionId)
      .map((instance) => instance.instanceId)
  );

  return routeCompositionCoverage.reduce((count, route) => {
    return (
      count +
      getMappedCoverageSections(route).filter((section) =>
        instanceIds.has(section.instanceId)
      ).length
    );
  }, 0);
}

export const routeCoverageSummary = {
  routes: routeCompositionCoverage.length,
  sections: routeCompositionCoverage.reduce(
    (count, route) => count + route.sections.length,
    0
  ),
  mapped: routeCompositionCoverage.reduce(
    (count, route) =>
      count + route.sections.filter((section) => section.status === "mapped").length,
    0
  ),
  templateOwned: routeCompositionCoverage.reduce(
    (count, route) =>
      count +
      route.sections.filter((section) => section.status === "template-owned").length,
    0
  ),
  exceptions: routeCompositionCoverage.reduce(
    (count, route) =>
      count + route.sections.filter((section) => section.status === "exception").length,
    0
  ),
  unmapped: routeCompositionCoverage.reduce(
    (count, route) =>
      count + route.sections.filter((section) => section.status === "unmapped").length,
    0
  ),
};

const statusCounts = compositionContracts.reduce(
  (counts, composition) => ({
    ...counts,
    [composition.meta.status]: counts[composition.meta.status] + 1,
  }),
  { draft: 0, reviewed: 0, stable: 0, deprecated: 0 }
);

function hasRequiredReviewedSpecimens(composition: CompositionContract) {
  const kinds = new Set(composition.examples.map((example) => example.specimenKind));

  return requiredReviewedSpecimenKinds.every((kind) => kinds.has(kind));
}

const reviewedOrStableCompositions = compositionContracts.filter(
  (composition) =>
    composition.meta.status === "reviewed" || composition.meta.status === "stable"
);

export const compositionSpecimenSummary = {
  totalSpecimens: compositionSpecimenRecords.length,
  fixtureProfiles: compositionFixtureCatalog.length,
  requiredKinds: requiredReviewedSpecimenKinds.length,
  reviewedOrStableTargets: reviewedOrStableCompositions.length,
  reviewedOrStableComplete: reviewedOrStableCompositions.filter(
    hasRequiredReviewedSpecimens
  ).length,
};

export const compositionRegistrySummary = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  totalCompositions: compositionContracts.length,
  totalFamilies: compositionFamilyDefinitions.length,
  statusCounts,
  structuralVariants: compositionContracts.reduce(
    (count, composition) => count + composition.structuralVariants.options.length,
    0
  ),
  layoutRecipes: layoutRecipes.length,
  domainRecipes: domainRecipes.length,
  templates: pageTemplates.length,
  compositionInstances: compositionInstances.length,
  candidateClassifications: candidateClassifications.length,
  deprecatedAliases: deprecatedCompositionAliases.length,
  fixtures: compositionFixtureCatalog.length,
  specimens: compositionContracts.reduce(
    (count, composition) => count + composition.examples.length,
    0
  ),
  specimenCoverage: compositionSpecimenSummary,
  routeSourceManifests: routeSourceManifests.length,
  routeCoverage: routeCoverageSummary,
};

export const interfaceInventory = routeCompositionCoverage.flatMap((route) =>
  route.sections.flatMap((section): InterfaceInventoryEntry[] => {
    if (section.status !== "mapped") return [];

    const instance = compositionInstanceById.get(section.instanceId);
    const composition = instance ? compositionById.get(instance.compositionId) : undefined;
    if (!instance || !composition) return [];

    const requiredRoles = composition.anatomy.slots
      .filter((slot) => slot.baseCardinality.min > 0)
      .flatMap((slot) => slot.acceptsCapabilityRoles);
    const optionalRoles = composition.anatomy.slots
      .filter((slot) => slot.baseCardinality.min === 0)
      .flatMap((slot) => slot.acceptsCapabilityRoles);

    return [
      {
        route: route.routePattern,
        sourceFiles: instance.sourceFiles,
        sectionKey: section.sectionKey,
        currentName: composition.meta.name,
        intent: composition.meta.intent,
        requiredRoles,
        optionalRoles,
        currentLayoutPrimitives:
          layoutRecipes.find((recipe) => recipe.id === instance.layoutRecipeId)
            ?.primitiveIds ?? [],
        currentSurfaceContext: instance.surfaceRole,
        currentResponsiveBehavior: composition.responsive.basis,
        currentMotionBehavior: instance.motionPolicy,
        proposedCompositionId: composition.meta.id,
        proposedVariant: instance.structuralVariantId,
        classification: "composition",
        duplicationGroup: composition.meta.id,
        notes: ["Generated from CompositionInstanceContract seed manifest."],
      },
    ];
  })
);
