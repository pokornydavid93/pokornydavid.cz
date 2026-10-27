import { homepageContent, overviewOffer } from "../../app/content/homepage";
import { testimonialReviews } from "../../app/content/testimonials";
import { getAllPosts } from "../blog";
import { getVerifiedFactEvidence } from "./claims.server";
import { isKnownInternalHref, PRIMARY_SITUATION_IDS } from "./routing";

export type HomepageValidationFinding = {
  code: string;
  message: string;
  severity: "error" | "blocker";
};

const endOfDayUtc = (date: string) => new Date(`${date}T23:59:59.999Z`).getTime();
const unique = (values: readonly string[]) => new Set(values).size === values.length;
const APPROVED_PROFILE_TITLE_LINES = [
  "Nejdřív vy.",
  "Potom čísla.",
  "Teprve potom plán.",
] as const;
const APPROVED_PROFILE_INTRODUCTION =
  "Jsem David Pokorný. Nejdřív chci pochopit, co je pro vás důležité. Pak vám ukážu souvislosti a možnosti, abyste se mohli rozhodnout sami.";
const APPROVED_PROFILE_STATEMENT =
  "Co funguje, nechávám být.";

export function validateHomepageContent({
  now = new Date(),
  requireLaunchReady = false,
  articleSlugs,
}: {
  now?: Date;
  requireLaunchReady?: boolean;
  articleSlugs?: readonly string[];
} = {}) {
  const findings: HomepageValidationFinding[] = [];
  const error = (code: string, message: string) => findings.push({ code, message, severity: "error" });
  const blocker = (code: string, message: string) => findings.push({ code, message, severity: "blocker" });
  const content = homepageContent;

  if (content.situations.items.length !== 5) {
    error("situations.count", "Homepage must contain exactly five primary situations.");
  }
  if (content.processAndFees.steps.length !== 3) {
    error("process.count", "Homepage must contain exactly three process steps.");
  }
  if (content.faq.items.length < 4 || content.faq.items.length > 5) {
    error(
      "faq.count",
      "Homepage FAQ must contain four or five items; remuneration is included only after approval.",
    );
  }
  if (content.insights && content.insights.articleIds.length !== 3) {
    error("insights.count", "Insights must be omitted or contain exactly three articles.");
  }
  if (content.insights) {
    if (!unique(content.insights.articleIds)) {
      error("insights.duplicate", "Homepage insight article IDs must be unique.");
    }
    const articleIds = new Set(
      articleSlugs ?? getAllPosts().map((post) => post.slug),
    );
    content.insights.articleIds.forEach((id) => {
      if (!articleIds.has(id)) {
        error("insights.unknown", `Homepage insights reference unknown article: ${id}.`);
      }
    });
  }

  const situationIds = content.situations.items.map((item) => item.id);
  if (
    !unique(situationIds)
    || PRIMARY_SITUATION_IDS.some((id) => !situationIds.includes(id))
  ) {
    error("situations.ids", "Primary situation IDs must be unique and match the closed allowlist.");
  }

  const allIds = [
    ...content.shell.navigation.map((item) => item.id),
    ...situationIds,
    content.situations.orientation.id,
    ...content.processAndFees.steps.map((item) => item.id),
    ...content.outcome.items.map((item) => item.id),
    ...content.evidence.items.map((item) => item.id),
    ...content.faq.items.map((item) => item.id),
  ];
  if (!unique(allIds)) error("ids.duplicate", "Homepage content IDs must be globally unique.");

  if (content.shell.headerCta.label !== overviewOffer.ctaLabel) {
    error("header-cta.label", "Header CTA must match the introductory-call offer.");
  }
  if (content.hero.primaryCta.label !== overviewOffer.ctaLabel) {
    error("hero-cta.label", "Hero CTA must match the introductory-call offer.");
  }
  if (content.finalCta.primaryCta.label !== overviewOffer.ctaLabel) {
    error("final-cta.label", "Final CTA must match the introductory-call offer.");
  }

  const overviewCtas = [content.shell.headerCta, content.hero.primaryCta];
  const primaryCtas = [...overviewCtas, content.finalCta.primaryCta];
  primaryCtas.forEach((cta) => {
    if (!cta.href.startsWith("/ziskat-prehled/")) {
      error("cta.destination", `Primary CTA ${cta.source} has an invalid destination.`);
    }
  });

  const internalHrefs = [
    ...content.shell.navigation.map((item) => item.href),
    ...primaryCtas.map((item) => item.href),
    ...content.situations.items.map((item) => item.href),
    content.situations.orientation.href,
    content.situations.customSituationLink.href,
    content.hero.secondaryCta?.href,
    content.profile.aboutLink.href,
    content.processAndFees.cta.href,
    content.references.outro.cta.href,
    content.faq.privacyNote.href,
  ].filter((href): href is NonNullable<typeof href> => Boolean(href));
  internalHrefs.forEach((href) => {
    if (!isKnownInternalHref(href)) error("route.unknown", `Unknown internal href: ${href}`);
  });

  if (content.hero.title.length > 55) error("hero.title-length", "Hero title exceeds 55 characters.");
  if (content.hero.titleLines.join(" ") !== content.hero.title) {
    error("hero.title-lines", "Hero title lines must resolve to the canonical hero title.");
  }
  if (content.hero.lead.length > 180) error("hero.lead-length", "Hero lead exceeds 180 characters.");
  content.situations.items.forEach((item) => {
    if (item.titleLines.join(" ") !== item.title) {
      error(
        "situation.title-lines",
        `${item.id} title lines must resolve to the canonical situation title.`,
      );
    }
    if (item.title.trim().split(/\s+/u).length > 20) {
      error("situation.title-length", `${item.id} title exceeds twenty words.`);
    }
    if (item.description.length < 40 || item.description.length > 75) {
      error("situation.description-length", `${item.id} description must be 40–75 characters.`);
    }
    if (
      item.metadata.length !== 3
      || item.metadata.some((topic) => topic.trim().length === 0)
      || !unique(item.metadata)
    ) {
      error(
        "situation.metadata",
        `${item.id} must contain exactly three distinct, non-empty topics.`,
      );
    }
    if (item.routeExplanation.trim().length === 0) {
      error(
        "situation.route-explanation",
        `${item.id} must contain a direct first-step explanation.`,
      );
    }
  });
  if (content.situations.orientation.description.length > 140) {
    error("situations.orientation-length", "Orientation description exceeds 140 characters.");
  }
  if (content.references.reviewIds.length !== 3) {
    error(
      "references.count",
      "Homepage must contain exactly three featured references.",
    );
  }
  if (!unique(content.references.reviewIds)) {
    error("references.duplicate", "Homepage reference IDs must be unique.");
  }
  const testimonialIds = new Set(testimonialReviews.map((review) => review.id));
  content.references.reviewIds.forEach((id) => {
    if (!testimonialIds.has(id)) {
      error("references.unknown", `Homepage references unknown review: ${id}.`);
    }
  });
  content.processAndFees.steps.forEach((step) => {
    if (step.title.trim().split(/\s+/u).length > 8) {
      error("process.title-length", `${step.id} title exceeds eight words.`);
    }
    if (step.support.trim().length === 0 || step.support.length > 100) {
      error(
        "process.support-length",
        `${step.id} support must contain between one and 100 characters.`,
      );
    }
  });
  if (content.processAndFees.detail.length > 190) {
    error("process.detail-length", "Process detail exceeds 190 characters.");
  }
  if (
    content.processAndFees.result.eyebrow.trim().length === 0
    || content.processAndFees.result.title.trim().length === 0
    || content.processAndFees.result.description.trim().length === 0
    || content.processAndFees.result.description.length > 150
  ) {
    error(
      "process.result",
      "Process result must contain a concise eyebrow, title, and description.",
    );
  }
  if (
    content.profile.intro.title
      !== "Nejdřív vy. Potom čísla. Teprve potom plán."
  ) {
    error(
      "profile.intro",
      "Profile must use the approved homepage introduction.",
    );
  }
  if (
    content.profile.intro.titleLines.length
      !== APPROVED_PROFILE_TITLE_LINES.length
    || content.profile.intro.titleLines.some(
      (line, index) => line !== APPROVED_PROFILE_TITLE_LINES[index],
    )
    || content.profile.intro.titleLines.join(" ")
      !== content.profile.intro.title
  ) {
    error(
      "profile.title-lines",
      "Profile title lines must match the approved desktop composition.",
    );
  }
  if (content.profile.intro.introduction !== APPROVED_PROFILE_INTRODUCTION) {
    error(
      "profile.introduction",
      "Profile introduction must match the approved personal explanation.",
    );
  }
  if (content.profile.intro.statement.join(" ") !== APPROVED_PROFILE_STATEMENT) {
    error(
      "profile.statement",
      "Profile statement must match the approved advisor statement.",
    );
  }
  if (
    content.profile.aboutLink.label !== "Jak stavím finanční plán"
    || content.profile.aboutLink.href !== "/kdo-jsem/"
  ) {
    error(
      "profile.about-link",
      "Profile about link must lead to the canonical profile page.",
    );
  }
  if (content.outcome.items.length !== 3) {
    error("outcome.count", "Homepage outcome must contain exactly three items.");
  }
  if (content.outcome.intro.titleLines.join(" ") !== content.outcome.intro.title) {
    error(
      "outcome.title-lines",
      "Outcome title lines must resolve to the canonical outcome title.",
    );
  }
  if (!unique(content.outcome.items.map((item) => item.index))) {
    error("outcome.index", "Homepage outcome indexes must be unique.");
  }
  if (content.finalCta.description.length > 160) {
    error("final-cta.description-length", "Final CTA description exceeds 160 characters.");
  }
  content.faq.items.forEach((item) => {
    if (item.answer.length > 450) error("faq.answer-length", `${item.id} answer exceeds 450 characters.`);
  });

  if (content.overviewOfferId !== overviewOffer.id) {
    error("offer.reference", "Homepage does not reference the shared OverviewOfferContract.");
  }
  if (overviewOffer.status !== "approved") {
    blocker("offer.approval", "OverviewOfferContract is not approved.");
  }
  if (endOfDayUtc(overviewOffer.reviewAt) < now.getTime()) {
    blocker("offer.expired", "OverviewOfferContract is past its review date.");
  }
  if (!overviewOffer.approvedAt || !overviewOffer.approvedBy) {
    blocker("offer.approval-metadata", "OverviewOfferContract is missing approval metadata.");
  }

  const evidence = getVerifiedFactEvidence();
  const profileRoleFact = evidence.find(
    (fact) => fact.id === content.profile.roleFactId,
  );
  if (
    !profileRoleFact
    || profileRoleFact.kind !== "role"
    || !profileRoleFact.allowedPlacements.includes("home")
    || !profileRoleFact.sourceUrl
  ) {
    error(
      "profile.role-evidence",
      "Profile role must reference a home-approved role fact with a public source URL.",
    );
  }
  const referencedFactIds = [
    content.profile.roleFactId,
    ...content.evidence.items.flatMap((item) => item.kind === "fact" ? [item.factId] : []),
  ];
  referencedFactIds.forEach((id) => {
    const fact = evidence.find((candidate) => candidate.id === id);
    if (!fact) {
      error("evidence.missing", `Referenced fact ${id} does not exist.`);
      return;
    }
    if (fact.status !== "verified" || endOfDayUtc(fact.reviewAt) < now.getTime()) {
      blocker("evidence.not-publishable", `Referenced fact ${id} is not currently publishable.`);
    }
  });
  if (content.evidence.items.length < 1 || content.evidence.items.length > 3) {
    error("evidence.count", "Homepage must reference one to three evidence items.");
  }

  const launchBlockers = [
    "Lead provider and production shared stores are not configured or approved.",
    "Legal role map, collection notice and provider contracts require DPO/legal sign-off.",
    "No consented case study or testimonial is available; the optional slots remain omitted.",
  ];
  launchBlockers.forEach((message, index) => blocker(`launch.external-${index + 1}`, message));

  const invalid = findings.some(
    (finding) => finding.severity === "error" || (requireLaunchReady && finding.severity === "blocker"),
  );

  return {
    valid: !invalid,
    releaseReady: !findings.some((finding) => finding.severity === "blocker"),
    findings,
  };
}

export function assertHomepageStructure({
  articleSlugs,
}: {
  articleSlugs?: readonly string[];
} = {}) {
  const result = validateHomepageContent({ articleSlugs });
  const errors = result.findings.filter((finding) => finding.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((finding) => `${finding.code}: ${finding.message}`).join("\n"));
  }
  return result;
}
