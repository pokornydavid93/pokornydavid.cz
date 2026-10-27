import {
  asCompositionId,
  asCompositionInstanceId,
  asTemplateId,
  asTemplateRegionId,
} from "./helpers";
import type { PageTemplateContract } from "./types";

function region(
  id: string,
  intent: string,
  compositionIds: string[],
  min = 1,
  max: number | "unbounded" = 1
) {
  return {
    id: asTemplateRegionId(id),
    intent,
    cardinality: { min, max },
    acceptsCompositionIds: compositionIds.map(asCompositionId),
  };
}

function template(
  id: string,
  name: string,
  regions: ReturnType<typeof region>[]
): PageTemplateContract {
  return {
    id: asTemplateId(id),
    name,
    globalRegions: {
      headerInstanceId: asCompositionInstanceId("instance.global.siteHeader"),
      mainLandmarkOwnedByTemplate: true,
      footerInstanceId: asCompositionInstanceId("instance.global.siteFooter"),
    },
    orderedRegions: regions,
  };
}

export const pageTemplates = [
  template("template.homepage", "Homepage", [
    region("template.homepage.hero", "Primary thesis and first decision.", ["composition.entry.pageHero"]),
    region("template.homepage.discovery", "Situational discovery.", ["composition.discovery.needsSelector"]),
    region("template.homepage.references", "Client proof after situational discovery.", ["composition.proof.testimonialCollection"]),
    region("template.homepage.process", "Advisory process explanation.", ["composition.process.advisoryJourney"]),
    region("template.homepage.proof", "Verifiable trust and advisor context.", ["composition.proof.trustEvidence", "composition.proof.advisorProfile"], 1, "unbounded"),
    region("template.homepage.faq", "Practical disclosure stack.", ["composition.disclosure.stack"]),
    region("template.homepage.editorial", "Latest article previews.", ["composition.editorial.relatedContent", "composition.editorial.collectionBrowser"], 0, "unbounded"),
    region("template.homepage.conversion", "Terminal next-step prompt.", ["composition.conversion.decisionPrompt"]),
  ]),
  template("template.conversion", "Conversion", [
    region("template.conversion.entry", "Focused route entry and expectation setting.", ["composition.entry.pageHero", "composition.entry.pageIntroduction"]),
    region("template.conversion.form", "Minimal lead capture.", ["composition.conversion.leadCapture"], 0, 1),
    region("template.conversion.completion", "Server-confirmed completion state.", ["composition.form.completionState"], 0, 1),
    region("template.conversion.continuation", "Optional direct or booking continuation.", ["composition.conversion.contactOptions"], 0, 1),
  ]),
  template("template.servicesHub", "Services Hub", [
    region("template.servicesHub.intro", "Services hub entry.", ["composition.entry.pageHero", "composition.entry.pageIntroduction"]),
    region("template.servicesHub.catalog", "Service overview or decision guide.", ["composition.discovery.serviceOverview", "composition.discovery.decisionGuide"]),
    region("template.servicesHub.conversion", "Next step prompt.", ["composition.conversion.decisionPrompt"]),
  ]),
  template("template.serviceDetail", "Service Detail", [
    region("template.serviceDetail.intro", "Service detail entry.", ["composition.entry.pageIntroduction"]),
    region("template.serviceDetail.problem", "Problem and outcome.", ["composition.narrative.problemOutcome"]),
    region("template.serviceDetail.scope", "Service scope.", ["composition.discovery.serviceScope"]),
    region("template.serviceDetail.conversion", "Next step prompt or lead capture.", ["composition.conversion.decisionPrompt", "composition.conversion.leadCapture"]),
  ]),
  template("template.process", "Process", [
    region("template.process.intro", "Process entry.", ["composition.entry.pageHero", "composition.entry.pageIntroduction"]),
    region("template.process.journey", "Advisory journey.", ["composition.process.advisoryJourney"]),
    region("template.process.detail", "Step spotlight or outcome.", ["composition.process.stepSpotlight", "composition.narrative.problemOutcome"], 0, "unbounded"),
    region("template.process.conversion", "Process CTA.", ["composition.conversion.decisionPrompt"]),
  ]),
  template("template.about", "About", [
    region("template.about.intro", "About page entry.", ["composition.entry.pageHero", "composition.entry.pageIntroduction"]),
    region("template.about.profile", "Advisor profile and method.", ["composition.proof.advisorProfile", "composition.narrative.problemOutcome"]),
    region("template.about.proof", "Credentials and trust evidence.", ["composition.proof.trustEvidence", "composition.proof.credentialRegistry"], 1, "unbounded"),
    region("template.about.conversion", "About CTA.", ["composition.conversion.decisionPrompt"]),
  ]),
  template("template.references", "References", [
    region("template.references.intro", "References entry.", ["composition.entry.pageIntroduction"]),
    region("template.references.proof", "Testimonials and trust context.", ["composition.proof.testimonialCollection", "composition.proof.evidenceSpotlight", "composition.proof.trustEvidence"]),
    region("template.references.conversion", "References CTA.", ["composition.conversion.decisionPrompt"]),
  ]),
  template("template.articlesHub", "Articles Hub", [
    region("template.articlesHub.intro", "Articles hub entry.", ["composition.entry.pageIntroduction", "composition.editorial.articleHubFeature"]),
    region("template.articlesHub.browser", "Article browser.", ["composition.editorial.collectionBrowser"]),
    region("template.articlesHub.conversion", "Article hub next step.", ["composition.conversion.decisionPrompt"], 0, 1),
  ]),
  template("template.articleDetail", "Article Detail", [
    region("template.articleDetail.header", "Article header.", ["composition.editorial.articleHeader"]),
    region("template.articleDetail.shell", "Article reading shell.", ["composition.editorial.articleReadingShell"]),
    region("template.articleDetail.footer", "Evidence footer and related content.", ["composition.editorial.articleEvidenceFooter", "composition.editorial.relatedContent"], 1, "unbounded"),
  ]),
  template("template.screening", "Screening", [
    region("template.screening.intro", "Screening entry.", ["composition.entry.pageIntroduction"]),
    region("template.screening.flow", "Screening flow.", ["composition.form.screeningFlow"]),
  ]),
  template("template.credentialsHub", "Credentials Hub", [
    region("template.credentialsHub.intro", "Credentials entry.", ["composition.entry.pageIntroduction"]),
    region("template.credentialsHub.registry", "Credential registry.", ["composition.proof.credentialRegistry"]),
    region("template.credentialsHub.conversion", "Credential CTA.", ["composition.conversion.decisionPrompt"], 0, 1),
  ]),
  template("template.credentialDetail", "Credential Detail", [
    region("template.credentialDetail.intro", "Credential detail entry.", ["composition.entry.pageIntroduction"]),
    region("template.credentialDetail.detail", "Credential detail.", ["composition.proof.credentialDetail"]),
  ]),
  template("template.utility", "Utility", [
    region("template.utility.intro", "Utility page entry.", ["composition.entry.pageIntroduction"], 0, 1),
    region("template.utility.body", "Longform utility body.", ["composition.editorial.longformFlow", "composition.disclosure.stack"]),
  ]),
] as const satisfies ReadonlyArray<PageTemplateContract>;
