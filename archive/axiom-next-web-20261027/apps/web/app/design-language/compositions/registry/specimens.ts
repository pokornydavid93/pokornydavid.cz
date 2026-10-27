import {
  asAssertionId,
  asCompositionId,
  asDomainRecipeId,
  asFixtureId,
  asLayoutRecipeId,
  asSurfaceRoleId,
  asTreatmentRoleId,
  asVariantId,
} from "./helpers";
import type {
  CompositionExample,
  CompositionId,
  CompositionSpecimenKind,
  StateId,
} from "./types";

export type CompositionSpecimenRecord = CompositionExample & {
  compositionId: CompositionId;
};

type ReviewedSpecimenSeed = {
  compositionId: string;
  variantId: string;
  layoutRecipeId: string;
  fixtureId: string;
  surfaceRole: string;
  domainRecipeId?: string;
  treatmentRole?: string;
  hostContext?: CompositionExample["hostContext"];
  assertionIds: string[];
  stateScenarios?: Array<{
    kind: Extract<
      CompositionSpecimenKind,
      "state-submitting" | "state-success" | "state-error"
    >;
    stateId: string;
    assertionId: string;
  }>;
};

type RequiredScenario = {
  kind: CompositionSpecimenKind;
  layoutMode: CompositionExample["layoutMode"];
  density: CompositionExample["density"];
  motionPreference: CompositionExample["motionPreference"];
  contentProfile: CompositionExample["contentProfile"];
  assertionId: string;
};

export const requiredReviewedSpecimenKinds = [
  "canonical",
  "compact",
  "medium",
  "wide",
  "long-czech",
  "minimal",
  "reduced-motion",
] as const satisfies readonly CompositionSpecimenKind[];

const requiredReviewedScenarios = [
  {
    kind: "canonical",
    layoutMode: "wide",
    density: "standard",
    motionPreference: "full",
    contentProfile: "canonical",
    assertionId: "assertion.specimen.canonical",
  },
  {
    kind: "compact",
    layoutMode: "compact",
    density: "compact",
    motionPreference: "full",
    contentProfile: "canonical",
    assertionId: "assertion.specimen.compact",
  },
  {
    kind: "medium",
    layoutMode: "medium",
    density: "standard",
    motionPreference: "full",
    contentProfile: "canonical",
    assertionId: "assertion.specimen.medium",
  },
  {
    kind: "long-czech",
    layoutMode: "wide",
    density: "standard",
    motionPreference: "full",
    contentProfile: "long",
    assertionId: "assertion.specimen.long-czech",
  },
  {
    kind: "wide",
    layoutMode: "wide",
    density: "spacious",
    motionPreference: "full",
    contentProfile: "canonical",
    assertionId: "assertion.specimen.wide",
  },
  {
    kind: "minimal",
    layoutMode: "compact",
    density: "compact",
    motionPreference: "full",
    contentProfile: "minimal",
    assertionId: "assertion.specimen.minimal",
  },
  {
    kind: "reduced-motion",
    layoutMode: "wide",
    density: "standard",
    motionPreference: "reduced",
    contentProfile: "canonical",
    assertionId: "assertion.specimen.reduced-motion",
  },
] as const satisfies readonly RequiredScenario[];

export const reviewedSpecimenSeeds: readonly ReviewedSpecimenSeed[] = [
  {
    compositionId: "composition.navigation.siteHeader",
    variantId: "composition.navigation.siteHeader.variant.standard",
    layoutRecipeId: "recipe.layout.stickyAction",
    fixtureId: "fixture.composition.siteHeader",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.navigation.brand-visible",
      "assertion.keyboard.focus-order",
    ],
  },
  {
    compositionId: "composition.navigation.siteFooter",
    variantId: "composition.navigation.siteFooter.variant.standard",
    layoutRecipeId: "recipe.layout.footerGrid",
    fixtureId: "fixture.composition.siteFooter",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.footer.landmark",
      "assertion.source-order.stable",
    ],
  },
  {
    compositionId: "composition.entry.pageHero",
    variantId: "composition.entry.pageHero.variant.cinematic",
    domainRecipeId: "recipe.pokorny.homeHero",
    layoutRecipeId: "recipe.layout.spotlight",
    fixtureId: "fixture.composition.pageHero",
    surfaceRole: "surface.hero",
    treatmentRole: "treatment.cinematic",
    hostContext: "standalone",
    assertionIds: [
      "assertion.hero.first-viewport-focus",
      "assertion.action.primary-visible",
    ],
  },
  {
    compositionId: "composition.entry.sectionIntroduction",
    variantId: "composition.entry.sectionIntroduction.variant.standard",
    layoutRecipeId: "recipe.layout.stackIntro",
    fixtureId: "fixture.composition.sectionIntroduction",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.heading.region-label",
      "assertion.rhythm.section-gap",
    ],
  },
  {
    compositionId: "composition.narrative.contentSplit",
    variantId: "composition.narrative.contentSplit.variant.standard",
    layoutRecipeId: "recipe.layout.switcherMedia",
    fixtureId: "fixture.composition.contentSplit",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.source-order.stable",
      "assertion.supporting-rail.secondary",
    ],
  },
  {
    compositionId: "composition.collection.cardCollection",
    variantId: "composition.collection.cardCollection.variant.standard",
    layoutRecipeId: "recipe.layout.cardCollection",
    fixtureId: "fixture.composition.cardCollection",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.collection.equal-weight",
      "assertion.grid.responsive-wrap",
    ],
  },
  {
    compositionId: "composition.process.advisoryJourney",
    variantId: "composition.process.advisoryJourney.variant.standard",
    domainRecipeId: "recipe.pokorny.advisoryProcess",
    layoutRecipeId: "recipe.layout.timeline",
    fixtureId: "fixture.composition.advisoryJourney",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.process.ordered",
      "assertion.scroll-progress.non-blocking",
    ],
  },
  {
    compositionId: "composition.proof.trustEvidence",
    variantId: "composition.proof.trustEvidence.variant.standard",
    domainRecipeId: "recipe.pokorny.trustEvidenceStrip",
    layoutRecipeId: "recipe.layout.cardCollection",
    fixtureId: "fixture.composition.trustEvidence",
    surfaceRole: "surface.card.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.proof.claim-binding",
      "assertion.proof.source-visible",
    ],
  },
  {
    compositionId: "composition.editorial.articleHeader",
    variantId: "composition.editorial.articleHeader.variant.standard",
    domainRecipeId: "recipe.pokorny.articleHeader",
    layoutRecipeId: "recipe.layout.switcherMedia",
    fixtureId: "fixture.composition.articleHeader",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.article.metadata-before-heading",
      "assertion.heading.document",
    ],
  },
  {
    compositionId: "composition.conversion.decisionPrompt",
    variantId: "composition.conversion.decisionPrompt.variant.standard",
    domainRecipeId: "recipe.pokorny.terminalOverviewCta",
    layoutRecipeId: "recipe.layout.stackIntro",
    fixtureId: "fixture.composition.decisionPrompt",
    surfaceRole: "surface.action",
    hostContext: "standalone",
    assertionIds: [
      "assertion.action.primary-visible",
      "assertion.conversion.single-focus",
    ],
  },
  {
    compositionId: "composition.conversion.leadCapture",
    variantId: "composition.conversion.leadCapture.variant.standard",
    domainRecipeId: "recipe.pokorny.leadCapture",
    layoutRecipeId: "recipe.layout.formSplit",
    fixtureId: "fixture.composition.leadCapture",
    surfaceRole: "surface.section.dark",
    hostContext: "standalone",
    assertionIds: [
      "assertion.form.labels-visible",
      "assertion.form.status-announcement",
    ],
    stateScenarios: [
      {
        kind: "state-submitting",
        stateId: "leadCapture.state.submitting",
        assertionId: "assertion.form.state-submitting",
      },
      {
        kind: "state-success",
        stateId: "leadCapture.state.success",
        assertionId: "assertion.form.state-success",
      },
      {
        kind: "state-error",
        stateId: "leadCapture.state.error",
        assertionId: "assertion.form.state-error",
      },
    ],
  },
];

function specimenId(seed: ReviewedSpecimenSeed, scenario: RequiredScenario) {
  return `specimen.${seed.compositionId.replace("composition.", "").replaceAll(".", "-")}.${scenario.kind}`;
}

function fixtureIdForScenario(seed: ReviewedSpecimenSeed, scenario: RequiredScenario) {
  if (scenario.contentProfile === "minimal") return `${seed.fixtureId}.minimal`;

  return scenario.contentProfile === "long"
    ? `${seed.fixtureId}.long`
    : seed.fixtureId;
}

function createSpecimen(
  seed: ReviewedSpecimenSeed,
  scenario: RequiredScenario
): CompositionSpecimenRecord {
  return {
    compositionId: asCompositionId(seed.compositionId),
    id: specimenId(seed, scenario),
    specimenKind: scenario.kind,
    variantId: asVariantId(seed.variantId),
    domainRecipeId: seed.domainRecipeId
      ? asDomainRecipeId(seed.domainRecipeId)
      : undefined,
    layoutMode: scenario.layoutMode,
    layoutRecipeId: asLayoutRecipeId(seed.layoutRecipeId),
    hostContext: seed.hostContext ?? "standalone",
    surfaceRole: asSurfaceRoleId(seed.surfaceRole),
    treatmentRole: seed.treatmentRole
      ? asTreatmentRoleId(seed.treatmentRole)
      : undefined,
    density: scenario.density,
    motionPreference: scenario.motionPreference,
    contentProfile: scenario.contentProfile,
    fixtureId: asFixtureId(fixtureIdForScenario(seed, scenario)),
    assertionIds: [
      ...seed.assertionIds.map(asAssertionId),
      asAssertionId(scenario.assertionId),
    ],
  };
}

export const compositionSpecimenRecords = reviewedSpecimenSeeds.flatMap(
  (seed: ReviewedSpecimenSeed) => [
    ...requiredReviewedScenarios.map((scenario) => createSpecimen(seed, scenario)),
    ...(seed.stateScenarios ?? []).map((scenario) => ({
      compositionId: asCompositionId(seed.compositionId),
      id: `specimen.${seed.compositionId.replace("composition.", "").replaceAll(".", "-")}.${scenario.kind}`,
      specimenKind: scenario.kind,
      variantId: asVariantId(seed.variantId),
      domainRecipeId: seed.domainRecipeId
        ? asDomainRecipeId(seed.domainRecipeId)
        : undefined,
      layoutMode: "medium" as const,
      layoutRecipeId: asLayoutRecipeId(seed.layoutRecipeId),
      hostContext: seed.hostContext ?? "standalone",
      stateId: scenario.stateId as StateId,
      surfaceRole: asSurfaceRoleId(seed.surfaceRole),
      treatmentRole: seed.treatmentRole
        ? asTreatmentRoleId(seed.treatmentRole)
        : undefined,
      density: "standard" as const,
      motionPreference: "reduced" as const,
      contentProfile: "canonical" as const,
      fixtureId: asFixtureId(seed.fixtureId),
      assertionIds: [
        ...seed.assertionIds.map(asAssertionId),
        asAssertionId(scenario.assertionId),
      ],
    })),
  ]
);

export const compositionSpecimenRecordsByCompositionId = new Map<
  CompositionId,
  CompositionSpecimenRecord[]
>();

compositionSpecimenRecords.forEach((specimen) => {
  const existing =
    compositionSpecimenRecordsByCompositionId.get(specimen.compositionId) ?? [];
  existing.push(specimen);
  compositionSpecimenRecordsByCompositionId.set(specimen.compositionId, existing);
});

export function getCompositionExamples(
  compositionId: CompositionId
): CompositionExample[] {
  return (
    compositionSpecimenRecordsByCompositionId.get(compositionId) ?? []
  ).map((specimen) => ({
    id: specimen.id,
    specimenKind: specimen.specimenKind,
    variantId: specimen.variantId,
    domainRecipeId: specimen.domainRecipeId,
    layoutMode: specimen.layoutMode,
    layoutRecipeId: specimen.layoutRecipeId,
    hostContext: specimen.hostContext,
    stateId: specimen.stateId,
    surfaceRole: specimen.surfaceRole,
    treatmentRole: specimen.treatmentRole,
    density: specimen.density,
    motionPreference: specimen.motionPreference,
    contentProfile: specimen.contentProfile,
    fixtureId: specimen.fixtureId,
    parentInstanceId: specimen.parentInstanceId,
    assertionIds: specimen.assertionIds,
  }));
}
