import {
  capabilityRoles,
  candidateClassifications,
  compositionContracts,
  compositionFixtureCatalog,
  compositionInstances,
  deprecatedCompositionAliases,
  domainRecipes,
  internalRouteSourcePrefixes,
  layoutPrimitives,
  layoutRecipes,
  pageTemplates,
  requiredReviewedSpecimenKinds,
  routeCompositionCoverage,
  routeSourceManifests,
  surfaceRoleIds,
  treatmentRoleIds,
} from "../registry";
import type { CompositionContract } from "../registry";

export type CompositionRegistryValidationResult = {
  errors: string[];
  warnings: string[];
  summary: {
    compositions: number;
    layoutRecipes: number;
    domainRecipes: number;
    templates: number;
    instances: number;
    routes: number;
    mappedSections: number;
    exceptions: number;
    unmapped: number;
    fixtures: number;
    specimens: number;
    reviewedSpecimenTargets: number;
    reviewedSpecimenComplete: number;
    routeSourceManifests: number;
    routeSourceInventoryFiles: number;
  };
};

export type CompositionRegistryValidationOptions = {
  appSourceFiles?: string[];
  appRouteSourceFiles?: string[];
};

const compositionIdPattern = /^composition\.[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/;
const layoutIdPattern = /^layout\.[a-z][a-zA-Z0-9]*$/;
const recipeIdPattern = /^recipe\.[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/;
const roleIdPattern = /^role\.[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/;

const forbiddenCompositionNameParts = [
  "left",
  "right",
  "dark",
  "light",
  "split",
  "strip",
  "threeColumn",
  "mobile",
  "desktop",
  "final",
  "green",
  "large",
  "small",
];

function addDuplicateErrors(
  errors: string[],
  values: readonly string[],
  label: string
) {
  const seen = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      errors.push(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  });
}

function hasForbiddenNamePart(id: string) {
  const tail = (id.split(".").at(-1) ?? id).toLowerCase();
  return forbiddenCompositionNameParts.some((part) =>
    tail === part.toLowerCase()
  );
}

function sameStringSet(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;

  const right = new Set(b);
  return a.every((value) => right.has(value));
}

function isInternalRouteSourceFile(sourceFile: string) {
  return internalRouteSourcePrefixes.some((prefix) =>
    sourceFile.startsWith(prefix)
  );
}

function validateComposition(
  composition: CompositionContract,
  refs: {
    roleIds: Set<string>;
    layoutRecipeIds: Set<string>;
    compositionIds: Set<string>;
    domainRecipeIds: Set<string>;
    fixtureIds: Set<string>;
    surfaceIds: Set<string>;
    treatmentIds: Set<string>;
  },
  errors: string[],
  warnings: string[]
) {
  const id = composition.meta.id;
  const slotIds = new Set(composition.anatomy.slots.map((slot) => String(slot.id)));
  const sourceOrder = composition.anatomy.sourceOrder.map(String);
  const variantIds = new Set(
    composition.structuralVariants.options.map((variant) => String(variant.id))
  );
  const stateIds = new Set(composition.states.map((state) => String(state.id)));

  if (!compositionIdPattern.test(id)) {
    errors.push(`Invalid composition ID: ${id}`);
  }

  if (hasForbiddenNamePart(id)) {
    errors.push(`Composition ID uses a forbidden realization axis: ${id}`);
  }

  addDuplicateErrors(
    errors,
    composition.structuralVariants.options.map((variant) => variant.id),
    `${id} variant ID`
  );

  composition.anatomy.slots.forEach((slot) => {
    if (!slotIds.has(slot.id)) {
      errors.push(`${id} has an unreachable slot: ${slot.id}`);
    }
    if (slot.baseCardinality.max !== "unbounded" && slot.baseCardinality.max < slot.baseCardinality.min) {
      errors.push(`${id}.${slot.id} has max cardinality below min.`);
    }
    if (slot.baseCardinality.min > 0 && slot.emptyBehavior === "fallback") {
      warnings.push(`${id}.${slot.id} is required but uses fallback empty behavior.`);
    }
    slot.acceptsCapabilityRoles.forEach((role) => {
      if (!refs.roleIds.has(role)) {
        errors.push(`${id}.${slot.id} references unknown capability role ${role}`);
      }
      if (!roleIdPattern.test(role)) {
        errors.push(`${id}.${slot.id} uses invalid role ID ${role}`);
      }
    });
    slot.acceptsCompositionIds?.forEach((childId) => {
      if (!refs.compositionIds.has(childId)) {
        errors.push(`${id}.${slot.id} accepts unknown child composition ${childId}`);
      }
    });
  });

  composition.anatomy.sourceOrder.forEach((slotId) => {
    if (!slotIds.has(slotId)) {
      errors.push(`${id} sourceOrder references unknown slot ${slotId}`);
    }
  });

  if (new Set(sourceOrder).size !== sourceOrder.length) {
    errors.push(`${id} sourceOrder contains duplicate slots.`);
  }

  composition.anatomy.relations.forEach((relation) => {
    if (!slotIds.has(relation.from) || !slotIds.has(relation.to)) {
      errors.push(`${id} relation references unknown slot ${relation.from} → ${relation.to}`);
    }
  });

  composition.accessibility.focusOrder.forEach((slotId) => {
    if (!slotIds.has(slotId)) {
      errors.push(`${id} focusOrder references unknown slot ${slotId}`);
    }
  });

  composition.layout.supportedRecipeIds.forEach((recipeId) => {
    if (!refs.layoutRecipeIds.has(recipeId)) {
      errors.push(`${id} references unknown layout recipe ${recipeId}`);
    }
  });

  if (!refs.layoutRecipeIds.has(composition.layout.defaultRecipeId)) {
    errors.push(`${id} references unknown default layout recipe ${composition.layout.defaultRecipeId}`);
  }

  Object.entries(composition.responsive.modes).forEach(([mode, contract]) => {
    if (!refs.layoutRecipeIds.has(contract.layoutRecipeId)) {
      errors.push(`${id}.${mode} references unknown layout recipe ${contract.layoutRecipeId}`);
    }
    Object.keys(contract.placement).forEach((slotId) => {
      if (!slotIds.has(slotId)) {
        errors.push(`${id}.${mode} placement references unknown slot ${slotId}`);
      }
    });
    Object.entries(contract.visibility ?? {}).forEach(([slotId, visibility]) => {
      const slot = composition.anatomy.slots.find((item) => item.id === slotId);
      if (!slot) {
        errors.push(`${id}.${mode} visibility references unknown slot ${slotId}`);
      }
      if (slot?.responsivePriority === "essential" && visibility !== "shown") {
        errors.push(`${id}.${mode} hides or collapses essential slot ${slotId}`);
      }
    });
  });

  composition.surfaces.allowed.forEach((surfaceId) => {
    if (!refs.surfaceIds.has(surfaceId)) {
      errors.push(`${id} references unknown surface role ${surfaceId}`);
    }
  });

  composition.surfaces.forbidden.forEach((surfaceId) => {
    if (!refs.surfaceIds.has(surfaceId)) {
      errors.push(`${id} forbids unknown surface role ${surfaceId}`);
    }
    if (composition.surfaces.allowed.includes(surfaceId)) {
      errors.push(`${id} has surface ${surfaceId} in both allowed and forbidden.`);
    }
  });

  if (
    composition.surfaces.default &&
    !composition.surfaces.allowed.includes(composition.surfaces.default)
  ) {
    errors.push(`${id} default surface is not in allowed surfaces.`);
  }

  composition.surfaces.allowedTreatments.forEach((treatmentId) => {
    if (!refs.treatmentIds.has(treatmentId)) {
      errors.push(`${id} references unknown treatment ${treatmentId}`);
    }
  });

  if (composition.surfaces.ownsTreatment !== false) {
    errors.push(`${id} attempts to own treatment.`);
  }

  if (!composition.density.allowed.includes(composition.density.default)) {
    errors.push(`${id} default density is not allowed.`);
  }

  if (
    (composition.motion.defaultPolicy === "narrative" ||
      composition.motion.defaultPolicy === "pinned") &&
    !composition.motion.reducedMotionFallback
  ) {
    errors.push(`${id} uses narrative/pinned motion without reduced-motion fallback.`);
  }

  if (composition.motion.contentAccessibleBeforeCompletion !== true) {
    errors.push(`${id} does not guarantee accessible content before motion completion.`);
  }

  addDuplicateErrors(
    errors,
    composition.examples.map((example) => example.id),
    `${id} specimen ID`
  );

  composition.examples.forEach((example) => {
    if (!variantIds.has(example.variantId)) {
      errors.push(`${id}.${example.id} references unknown variant ${example.variantId}`);
    }
    if (!refs.layoutRecipeIds.has(example.layoutRecipeId)) {
      errors.push(`${id}.${example.id} references unknown layout recipe ${example.layoutRecipeId}`);
    }
    if (!composition.layout.supportedRecipeIds.includes(example.layoutRecipeId)) {
      errors.push(`${id}.${example.id} uses layout recipe ${example.layoutRecipeId} outside the composition support list.`);
    }
    if (example.domainRecipeId && !refs.domainRecipeIds.has(example.domainRecipeId)) {
      errors.push(`${id}.${example.id} references unknown domain recipe ${example.domainRecipeId}`);
    }
    if (!refs.fixtureIds.has(example.fixtureId)) {
      errors.push(`${id}.${example.id} references unknown fixture ${example.fixtureId}`);
    }
    if (!refs.surfaceIds.has(example.surfaceRole)) {
      errors.push(`${id}.${example.id} references unknown surface ${example.surfaceRole}`);
    }
    if (!composition.surfaces.allowed.includes(example.surfaceRole)) {
      errors.push(`${id}.${example.id} uses surface ${example.surfaceRole} outside the composition allowed surfaces.`);
    }
    if (example.treatmentRole && !refs.treatmentIds.has(example.treatmentRole)) {
      errors.push(`${id}.${example.id} references unknown treatment ${example.treatmentRole}`);
    }
    if (
      example.treatmentRole &&
      !composition.surfaces.allowedTreatments.includes(example.treatmentRole)
    ) {
      errors.push(`${id}.${example.id} uses treatment ${example.treatmentRole} outside the composition allowed treatments.`);
    }
    if (!composition.density.allowed.includes(example.density)) {
      errors.push(`${id}.${example.id} uses density ${example.density} outside the composition allowed densities.`);
    }
    if (example.stateId && !stateIds.has(example.stateId)) {
      errors.push(`${id}.${example.id} references unknown state ${example.stateId}`);
    }
    if (example.assertionIds.length === 0) {
      errors.push(`${id}.${example.id} has no specimen assertions.`);
    }
  });

  if (composition.meta.status === "reviewed" || composition.meta.status === "stable") {
    const specimenKinds = new Set(
      composition.examples.map((example) => example.specimenKind)
    );
    const specimenStateIds = new Set(
      composition.examples
        .map((example) => example.stateId)
        .filter((stateId): stateId is NonNullable<typeof stateId> =>
          Boolean(stateId)
        )
    );

    requiredReviewedSpecimenKinds.forEach((kind) => {
      if (!specimenKinds.has(kind)) {
        errors.push(`${id} is ${composition.meta.status} but lacks ${kind} specimen.`);
      }
    });

    composition.states.forEach((state) => {
      if (
        (state.kind === "submitting" ||
          state.kind === "success" ||
          state.kind === "error") &&
        !specimenStateIds.has(state.id)
      ) {
        errors.push(`${id} is ${composition.meta.status} but lacks specimen for state ${state.id}.`);
      }
    });
  }
}

export function validateCompositionRegistry(
  options: CompositionRegistryValidationOptions = {}
): CompositionRegistryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const roleIds = new Set(capabilityRoles.map((role) => String(role.id)));
  const primitiveIds = new Set(layoutPrimitives.map((primitive) => String(primitive.id)));
  const layoutRecipeIds = new Set(layoutRecipes.map((recipe) => String(recipe.id)));
  const compositionIds = new Set(compositionContracts.map((composition) => String(composition.meta.id)));
  const domainRecipeIds = new Set(domainRecipes.map((recipe) => String(recipe.id)));
  const templateIds = new Set(pageTemplates.map((template) => String(template.id)));
  const instanceIds = new Set(compositionInstances.map((instance) => String(instance.instanceId)));
  const fixtureIds = new Set(compositionFixtureCatalog.map((fixture) => String(fixture.id)));
  const routeSourceEntryFiles = new Set(
    routeSourceManifests.map((source) => source.entryFile)
  );
  const routeSourceFiles = new Set(
    routeSourceManifests.flatMap((source) => [
      source.entryFile,
      source.sourceManifest,
      ...source.sourceFiles,
      ...source.sections.flatMap((section) => section.sourceFiles),
    ])
  );
  const surfaceIds = new Set<string>(surfaceRoleIds);
  const treatmentIds = new Set<string>(treatmentRoleIds);

  addDuplicateErrors(errors, capabilityRoles.map((role) => String(role.id)), "capability role ID");
  addDuplicateErrors(errors, layoutPrimitives.map((primitive) => String(primitive.id)), "layout primitive ID");
  addDuplicateErrors(errors, layoutRecipes.map((recipe) => String(recipe.id)), "layout recipe ID");
  addDuplicateErrors(errors, compositionContracts.map((composition) => String(composition.meta.id)), "composition ID");
  addDuplicateErrors(errors, domainRecipes.map((recipe) => String(recipe.id)), "domain recipe ID");
  addDuplicateErrors(errors, pageTemplates.map((template) => String(template.id)), "template ID");
  addDuplicateErrors(errors, compositionInstances.map((instance) => String(instance.instanceId)), "composition instance ID");
  addDuplicateErrors(errors, compositionFixtureCatalog.map((fixture) => String(fixture.id)), "composition fixture ID");
  addDuplicateErrors(errors, routeSourceManifests.map((source) => source.routePattern), "route source pattern");

  capabilityRoles.forEach((role) => {
    if (!roleIdPattern.test(role.id)) {
      errors.push(`Invalid role ID: ${role.id}`);
    }
  });

  layoutPrimitives.forEach((primitive) => {
    if (!layoutIdPattern.test(primitive.id)) {
      errors.push(`Invalid layout primitive ID: ${primitive.id}`);
    }
  });

  layoutRecipes.forEach((recipe) => {
    if (!recipeIdPattern.test(recipe.id)) {
      errors.push(`Invalid layout recipe ID: ${recipe.id}`);
    }
    recipe.primitiveIds.forEach((primitiveId) => {
      if (!primitiveIds.has(primitiveId)) {
        errors.push(`${recipe.id} references unknown primitive ${primitiveId}`);
      }
    });
  });

  compositionContracts.forEach((composition) =>
    validateComposition(
      composition,
      { roleIds, layoutRecipeIds, compositionIds, domainRecipeIds, fixtureIds, surfaceIds, treatmentIds },
      errors,
      warnings
    )
  );

  compositionFixtureCatalog.forEach((fixture) => {
    if (!compositionIds.has(fixture.compositionId)) {
      errors.push(`${fixture.id} references unknown composition ${fixture.compositionId}`);
    }
    if (!fixture.headline.trim()) {
      errors.push(`${fixture.id} has no headline.`);
    }
    if (!fixture.lead.trim()) {
      errors.push(`${fixture.id} has no lead.`);
    }
    if (Object.keys(fixture.slots).length === 0) {
      errors.push(`${fixture.id} has no slot fixture data.`);
    }
    if (fixture.assertionIds.length === 0) {
      errors.push(`${fixture.id} has no fixture assertions.`);
    }
    if (JSON.stringify(fixture).toLowerCase().includes("lorem")) {
      errors.push(`${fixture.id} contains placeholder lorem content.`);
    }
  });

  routeSourceManifests.forEach((source) => {
    if (!source.entryFile.trim()) {
      errors.push(`${source.routePattern} source manifest has no entry file.`);
    }
    if (!source.sourceManifest.trim()) {
      errors.push(`${source.routePattern} source manifest has no sourceManifest file.`);
    }
    if (source.sourceFiles.length === 0) {
      errors.push(`${source.routePattern} source manifest has no source files.`);
    }
    addDuplicateErrors(
      errors,
      source.sections.map((section) => section.sectionKey),
      `${source.routePattern} source section key`
    );
    source.sections.forEach((section) => {
      if (section.sourceFiles.length === 0) {
        errors.push(`${source.routePattern}.${section.sectionKey} has no source files.`);
      }
      if (section.instanceId && !instanceIds.has(section.instanceId)) {
        errors.push(`${source.routePattern}.${section.sectionKey} references unknown source instance ${section.instanceId}`);
      }
    });
    if (
      source.dynamic &&
      source.kind === "public" &&
      (source.fixtureOrDataVariants?.length ?? 0) < 2
    ) {
      errors.push(`${source.routePattern} is dynamic public route without at least two fixture/data variants.`);
    }
  });

  routeSourceFiles.forEach((sourceFile) => {
    if (options.appSourceFiles && !options.appSourceFiles.includes(sourceFile)) {
      errors.push(`Route source manifest references missing source file: ${sourceFile}`);
    }
  });

  options.appRouteSourceFiles?.forEach((sourceFile) => {
    if (isInternalRouteSourceFile(sourceFile)) return;
    if (!routeSourceEntryFiles.has(sourceFile)) {
      errors.push(`Route source file is not declared in route source manifest: ${sourceFile}`);
    }
  });

  domainRecipes.forEach((recipe) => {
    if (!compositionIds.has(recipe.compositionId)) {
      errors.push(`${recipe.id} references unknown composition ${recipe.compositionId}`);
    }
    if (!layoutRecipeIds.has(recipe.layoutRecipeId)) {
      errors.push(`${recipe.id} references unknown layout recipe ${recipe.layoutRecipeId}`);
    }
    if (!surfaceIds.has(recipe.surfaceRole)) {
      errors.push(`${recipe.id} references unknown surface role ${recipe.surfaceRole}`);
    }
    if (recipe.treatmentRole && !treatmentIds.has(recipe.treatmentRole)) {
      errors.push(`${recipe.id} references unknown treatment ${recipe.treatmentRole}`);
    }
  });

  pageTemplates.forEach((template) => {
    template.orderedRegions.forEach((region) => {
      if (region.cardinality.max !== "unbounded" && region.cardinality.max < region.cardinality.min) {
        errors.push(`${template.id}.${region.id} has max cardinality below min.`);
      }
      region.acceptsCompositionIds.forEach((compositionId) => {
        if (!compositionIds.has(compositionId)) {
          errors.push(`${template.id}.${region.id} references unknown composition ${compositionId}`);
        }
      });
    });
  });

  compositionInstances.forEach((instance) => {
    if (!compositionIds.has(instance.compositionId)) {
      errors.push(`${instance.instanceId} references unknown composition ${instance.compositionId}`);
    }
    if (!layoutRecipeIds.has(instance.layoutRecipeId)) {
      errors.push(`${instance.instanceId} references unknown layout recipe ${instance.layoutRecipeId}`);
    }
    if (instance.domainRecipeId && !domainRecipeIds.has(instance.domainRecipeId)) {
      errors.push(`${instance.instanceId} references unknown domain recipe ${instance.domainRecipeId}`);
    }
    if (!surfaceIds.has(instance.surfaceRole)) {
      errors.push(`${instance.instanceId} references unknown surface role ${instance.surfaceRole}`);
    }
  });

  routeCompositionCoverage.forEach((coverage) => {
    const routeSource = routeSourceManifests.find(
      (source) => source.routePattern === coverage.routePattern
    );

    if (!routeSource) {
      errors.push(`${coverage.routePattern} has coverage but no route source manifest.`);
    } else if (coverage.sourceManifest !== routeSource.sourceManifest) {
      errors.push(`${coverage.routePattern} coverage sourceManifest ${coverage.sourceManifest} does not match route source manifest ${routeSource.sourceManifest}.`);
    }

    if (!templateIds.has(coverage.templateId)) {
      errors.push(`${coverage.routePattern} references unknown template ${coverage.templateId}`);
    }
    coverage.sections.forEach((section) => {
      const routeSourceSection = routeSource?.sections.find(
        (sourceSection) => sourceSection.sectionKey === section.sectionKey
      );

      if (!routeSourceSection) {
        errors.push(`${coverage.routePattern}.${section.sectionKey} has coverage but no route source section.`);
      }

      if (section.status === "mapped" && !instanceIds.has(section.instanceId)) {
        errors.push(`${coverage.routePattern}.${section.sectionKey} references unknown instance ${section.instanceId}`);
      }
      if (
        section.status === "mapped" &&
        routeSourceSection?.instanceId &&
        routeSourceSection.instanceId !== section.instanceId
      ) {
        errors.push(`${coverage.routePattern}.${section.sectionKey} maps ${section.instanceId} but source manifest maps ${routeSourceSection.instanceId}.`);
      }
      if (
        section.status === "exception" &&
        routeSourceSection?.exceptionId &&
        routeSourceSection.exceptionId !== section.exceptionId
      ) {
        errors.push(`${coverage.routePattern}.${section.sectionKey} exception ${section.exceptionId} does not match source manifest ${routeSourceSection.exceptionId}.`);
      }
    });
  });

  routeSourceManifests.forEach((source) => {
    if (source.kind === "not-found") return;
    if (!routeCompositionCoverage.some((coverage) => coverage.routePattern === source.routePattern)) {
      errors.push(`${source.routePattern} has a route source manifest but no route coverage.`);
    }
  });

  compositionInstances.forEach((instance) => {
    if (!instance.routePattern) return;

    const routeSource = routeSourceManifests.find(
      (source) => source.routePattern === instance.routePattern
    );
    const sourceSection = routeSource?.sections.find(
      (section) => section.instanceId === instance.instanceId
    );

    if (!routeSource) {
      errors.push(`${instance.instanceId} references route ${instance.routePattern} without source manifest.`);
      return;
    }
    if (!sourceSection) {
      errors.push(`${instance.instanceId} is not declared in source manifest for ${instance.routePattern}.`);
      return;
    }
    if (!sameStringSet(instance.sourceFiles, sourceSection.sourceFiles)) {
      errors.push(`${instance.instanceId} source files do not match ${instance.routePattern}.${sourceSection.sectionKey} source manifest.`);
    }
    if (
      sourceSection.fixtureOrDataVariants &&
      !sameStringSet(
        instance.fixtureOrDataVariants ?? [],
        sourceSection.fixtureOrDataVariants
      )
    ) {
      errors.push(`${instance.instanceId} fixture/data variants do not match ${instance.routePattern}.${sourceSection.sectionKey} source manifest.`);
    }
  });

  deprecatedCompositionAliases.forEach((alias) => {
    if (!compositionIds.has(alias.targetId)) {
      errors.push(`${alias.sourceId} targets unknown composition ${alias.targetId}`);
    }
  });

  candidateClassifications.forEach((classification) => {
    if (
      classification.targetCompositionId &&
      !compositionIds.has(classification.targetCompositionId)
    ) {
      errors.push(`${classification.candidateId} targets unknown composition ${classification.targetCompositionId}`);
    }
    if (
      classification.targetDomainRecipeId &&
      !domainRecipeIds.has(classification.targetDomainRecipeId)
    ) {
      errors.push(`${classification.candidateId} targets unknown domain recipe ${classification.targetDomainRecipeId}`);
    }
  });

  const mappedSections = routeCompositionCoverage.reduce(
    (count, route) =>
      count + route.sections.filter((section) => section.status === "mapped").length,
    0
  );
  const exceptions = routeCompositionCoverage.reduce(
    (count, route) =>
      count + route.sections.filter((section) => section.status === "exception").length,
    0
  );
  const unmapped = routeCompositionCoverage.reduce(
    (count, route) =>
      count + route.sections.filter((section) => section.status === "unmapped").length,
    0
  );
  const specimens = compositionContracts.reduce(
    (count, composition) => count + composition.examples.length,
    0
  );
  const reviewedOrStableCompositions = compositionContracts.filter(
    (composition) =>
      composition.meta.status === "reviewed" || composition.meta.status === "stable"
  );
  const reviewedSpecimenComplete = reviewedOrStableCompositions.filter(
    (composition) => {
      const specimenKinds = new Set(
        composition.examples.map((example) => example.specimenKind)
      );

      return requiredReviewedSpecimenKinds.every((kind) =>
        specimenKinds.has(kind)
      );
    }
  ).length;

  return {
    errors,
    warnings,
    summary: {
      compositions: compositionContracts.length,
      layoutRecipes: layoutRecipes.length,
      domainRecipes: domainRecipes.length,
      templates: pageTemplates.length,
      instances: compositionInstances.length,
      routes: routeCompositionCoverage.length,
      mappedSections,
      exceptions,
      unmapped,
      fixtures: compositionFixtureCatalog.length,
      specimens,
      reviewedSpecimenTargets: reviewedOrStableCompositions.length,
      reviewedSpecimenComplete,
      routeSourceManifests: routeSourceManifests.length,
      routeSourceInventoryFiles: options.appRouteSourceFiles?.filter(
        (sourceFile) => !isInternalRouteSourceFile(sourceFile)
      ).length ?? 0,
    },
  };
}
