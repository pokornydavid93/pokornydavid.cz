import {
  asCompositionId,
  asDomainRecipeId,
  asLayoutRecipeId,
  asSurfaceRoleId,
  asTreatmentRoleId,
  asVariantId,
} from "./helpers";
import type { DomainRecipeContract } from "./types";

function recipe(input: {
  id: string;
  compositionId: string;
  intent: string;
  structuralVariantId: string;
  layoutRecipeId: string;
  placementContext: DomainRecipeContract["placementContext"];
  surfaceRole: string;
  treatmentRole?: string;
  density?: DomainRecipeContract["density"];
  motionPolicy: DomainRecipeContract["motionPolicy"];
  fixture: string;
  systemReason?: string;
}): DomainRecipeContract {
  return {
    id: asDomainRecipeId(input.id),
    compositionId: asCompositionId(input.compositionId),
    intent: input.intent,
    structuralVariantId: asVariantId(input.structuralVariantId),
    layoutRecipeId: asLayoutRecipeId(input.layoutRecipeId),
    placementContext: input.placementContext,
    surfaceRole: asSurfaceRoleId(input.surfaceRole),
    treatmentRole: input.treatmentRole
      ? asTreatmentRoleId(input.treatmentRole)
      : undefined,
    density: input.density ?? "standard",
    motionPolicy: input.motionPolicy,
    requiredFixtureSchema: input.fixture,
    systemReason: input.systemReason,
  };
}

export const domainRecipes = [
  recipe({
    id: "recipe.pokorny.homeHero",
    compositionId: "composition.entry.pageHero",
    intent: "Homepage thesis with portrait/process context and primary contact action.",
    structuralVariantId: "composition.entry.pageHero.variant.cinematic",
    layoutRecipeId: "recipe.layout.spotlight",
    placementContext: "page",
    surfaceRole: "surface.hero",
    treatmentRole: "treatment.cinematic",
    motionPolicy: "narrative",
    fixture: "fixture.home.hero",
  }),
  recipe({
    id: "recipe.pokorny.servicePageHero",
    compositionId: "composition.entry.pageHero",
    intent: "Inner service entry with copy and supporting action panel.",
    structuralVariantId: "composition.entry.pageHero.variant.textLed",
    layoutRecipeId: "recipe.layout.switcherMedia",
    placementContext: "page",
    surfaceRole: "surface.section.dark",
    motionPolicy: "reveal",
    fixture: "fixture.page.hero.inner",
  }),
  recipe({
    id: "recipe.pokorny.homeNeedsSelector",
    compositionId: "composition.discovery.needsSelector",
    intent: "Homepage situation selector for first financial topic.",
    structuralVariantId: "composition.discovery.needsSelector.variant.standard",
    layoutRecipeId: "recipe.layout.cardCollection",
    placementContext: "section",
    surfaceRole: "surface.section.dark",
    motionPolicy: "reveal",
    fixture: "fixture.home.needs",
  }),
  recipe({
    id: "recipe.pokorny.serviceOverview",
    compositionId: "composition.discovery.serviceOverview",
    intent: "Service catalog with outcome-oriented cards.",
    structuralVariantId: "composition.discovery.serviceOverview.variant.standard",
    layoutRecipeId: "recipe.layout.cardCollection",
    placementContext: "section",
    surfaceRole: "surface.section.dark",
    motionPolicy: "reveal",
    fixture: "fixture.services.catalog",
  }),
  recipe({
    id: "recipe.pokorny.advisoryProcess",
    compositionId: "composition.process.advisoryJourney",
    intent: "Five-step advisory process from first call to long-term care.",
    structuralVariantId: "composition.process.advisoryJourney.variant.standard",
    layoutRecipeId: "recipe.layout.timeline",
    placementContext: "section",
    surfaceRole: "surface.section.dark",
    motionPolicy: "narrative",
    fixture: "fixture.process.journey",
  }),
  recipe({
    id: "recipe.pokorny.trustEvidenceStrip",
    compositionId: "composition.proof.trustEvidence",
    intent: "Compact trust evidence cluster for claims and route reassurance.",
    structuralVariantId: "composition.proof.trustEvidence.variant.standard",
    layoutRecipeId: "recipe.layout.cardCollection",
    placementContext: "section",
    surfaceRole: "surface.card.dark",
    motionPolicy: "micro",
    fixture: "fixture.trust.strip",
  }),
  recipe({
    id: "recipe.pokorny.advisorProfile",
    compositionId: "composition.proof.advisorProfile",
    intent: "Human advisor profile with portrait, facts, and action.",
    structuralVariantId: "composition.proof.advisorProfile.variant.standard",
    layoutRecipeId: "recipe.layout.switcherMedia",
    placementContext: "section",
    surfaceRole: "surface.section.dark",
    motionPolicy: "reveal",
    fixture: "fixture.about.profile",
  }),
  recipe({
    id: "recipe.pokorny.articleHubFeature",
    compositionId: "composition.editorial.articleHubFeature",
    intent: "Featured article opening for the articles hub.",
    structuralVariantId: "composition.editorial.articleHubFeature.variant.standard",
    layoutRecipeId: "recipe.layout.spotlight",
    placementContext: "section",
    surfaceRole: "surface.section.dark",
    motionPolicy: "reveal",
    fixture: "fixture.articleHub.feature",
  }),
  recipe({
    id: "recipe.pokorny.articleHeader",
    compositionId: "composition.editorial.articleHeader",
    intent: "Article detail header with topic, title, perex, meta, and quick check.",
    structuralVariantId: "composition.editorial.articleHeader.variant.standard",
    layoutRecipeId: "recipe.layout.switcherMedia",
    placementContext: "page",
    surfaceRole: "surface.section.dark",
    motionPolicy: "reveal",
    fixture: "fixture.article.header",
  }),
  recipe({
    id: "recipe.pokorny.articleScreeningInsert",
    compositionId: "composition.form.screeningFlow",
    intent: "Embedded article screening handoff for reader context.",
    structuralVariantId: "composition.form.screeningFlow.variant.standard",
    layoutRecipeId: "recipe.layout.formSplit",
    placementContext: "inline",
    surfaceRole: "surface.card.dark",
    motionPolicy: "micro",
    fixture: "fixture.article.screening",
  }),
  recipe({
    id: "recipe.pokorny.credentialRegistry",
    compositionId: "composition.proof.credentialRegistry",
    intent: "Credential and certificate browser.",
    structuralVariantId: "composition.proof.credentialRegistry.variant.standard",
    layoutRecipeId: "recipe.layout.cardCollection",
    placementContext: "section",
    surfaceRole: "surface.section.dark",
    motionPolicy: "reveal",
    fixture: "fixture.credentials.registry",
  }),
  recipe({
    id: "recipe.pokorny.leadCapture",
    compositionId: "composition.conversion.leadCapture",
    intent: "Primary lead form with support copy and consent.",
    structuralVariantId: "composition.conversion.leadCapture.variant.standard",
    layoutRecipeId: "recipe.layout.formSplit",
    placementContext: "section",
    surfaceRole: "surface.section.dark",
    motionPolicy: "micro",
    fixture: "fixture.lead.capture",
  }),
  recipe({
    id: "recipe.pokorny.terminalOverviewCta",
    compositionId: "composition.conversion.decisionPrompt",
    intent: "Terminal conversion prompt at the end of a page.",
    structuralVariantId: "composition.conversion.decisionPrompt.variant.standard",
    layoutRecipeId: "recipe.layout.stackIntro",
    placementContext: "terminal",
    surfaceRole: "surface.action",
    motionPolicy: "micro",
    fixture: "fixture.cta.terminal",
  }),
] as const satisfies ReadonlyArray<DomainRecipeContract>;
