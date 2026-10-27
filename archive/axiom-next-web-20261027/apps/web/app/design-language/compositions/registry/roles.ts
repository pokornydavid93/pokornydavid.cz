import { asRoleId } from "./helpers";
import type { CapabilityRoleContract } from "./types";

const textContent = {
  idealWords: [3, 10] as [number, number],
  maxWords: 18,
  maxLines: { compact: 3, medium: 3, wide: 3 },
  overflow: "wrap" as const,
};

const bodyContent = {
  idealWords: [12, 36] as [number, number],
  maxWords: 70,
  maxLines: { compact: 8, medium: 6, wide: 5 },
  overflow: "wrap" as const,
};

function role(
  id: string,
  intent: string,
  capabilities: string[],
  content = bodyContent
): CapabilityRoleContract {
  return {
    id: asRoleId(id),
    intent,
    allowedComponentCapabilities: capabilities,
    defaultContentContract: content,
  };
}

export const capabilityRoles = [
  role("role.text.eyebrow", "Short context label before a region heading.", [
    "text.label",
    "text.metadata",
  ], textContent),
  role("role.text.heading", "Primary readable heading for a composition.", [
    "text.heading",
  ], {
    idealWords: [3, 12],
    maxWords: 18,
    maxLines: { compact: 4, medium: 3, wide: 3 },
    overflow: "wrap",
  }),
  role("role.text.lead", "Lead paragraph that sets context and outcome.", [
    "text.lead",
  ]),
  role("role.text.body", "Supporting body copy.", ["text.body"]),
  role("role.text.metadata", "Compact metadata or classification text.", [
    "text.metadata",
  ], textContent),
  role("role.text.caption", "Caption or supporting note tied to media.", [
    "text.caption",
  ], textContent),
  role("role.text.quote", "Quoted testimonial or editorial statement.", [
    "text.quote",
  ], {
    idealWords: [14, 42],
    maxWords: 80,
    maxLines: { compact: 8, medium: 7, wide: 6 },
    overflow: "wrap",
  }),
  role("role.text.disclaimer", "Legal or risk note that must remain readable.", [
    "text.disclaimer",
  ], {
    idealWords: [10, 44],
    maxWords: 90,
    maxLines: { compact: 10, medium: 8, wide: 7 },
    overflow: "wrap",
  }),

  role("role.action.primary", "Main action with highest priority.", [
    "action.primary",
  ], textContent),
  role("role.action.secondary", "Subordinate action beside the primary action.", [
    "action.secondary",
  ], textContent),
  role("role.action.tertiary", "Low emphasis action within supporting content.", [
    "action.tertiary",
  ], textContent),
  role("role.action.inline", "Inline action in prose or metadata.", [
    "action.inline",
  ], textContent),
  role("role.action.navigation", "Action that moves within a page or route set.", [
    "action.navigation",
  ], textContent),
  role("role.action.dismiss", "Dismiss or close action owned by a host surface.", [
    "action.dismiss",
  ], textContent),

  role("role.media.hero", "Primary hero media or cinematic visual support.", [
    "media.hero",
  ]),
  role("role.media.portrait", "Advisor portrait or human visual proof.", [
    "media.portrait",
  ]),
  role("role.media.editorial", "Editorial or article media.", ["media.editorial"]),
  role("role.media.video", "Playable or representative video media.", [
    "media.video",
  ]),
  role("role.media.document", "Document, certificate, or proof artifact.", [
    "media.document",
  ]),
  role("role.media.decorative", "Non-semantic visual treatment.", [
    "media.decorative",
  ]),

  role("role.proof.metric", "Quantified proof point or outcome metric.", [
    "proof.metric",
  ], textContent),
  role("role.proof.credential", "Certificate, registration, or credential proof.", [
    "proof.credential",
  ]),
  role("role.proof.regulatory", "Regulatory or institution verification.", [
    "proof.regulatory",
  ]),
  role("role.proof.rating", "Rating summary or review aggregate.", [
    "proof.rating",
  ], textContent),
  role("role.proof.testimonial", "Client testimonial with attribution.", [
    "proof.testimonial",
  ]),
  role("role.proof.caseResult", "Case outcome, before/after, or result summary.", [
    "proof.caseResult",
  ]),
  role("role.proof.source", "Source, issuer, or verification metadata.", [
    "proof.source",
  ]),

  role("role.collection.item", "Repeated comparable collection item.", [
    "collection.item",
  ]),
  role("role.collection.featuredItem", "Featured collection item.", [
    "collection.featuredItem",
  ]),
  role("role.collection.filter", "Filtering or segmentation control.", [
    "collection.filter",
  ]),
  role("role.collection.pagination", "Pagination or progressive loading control.", [
    "collection.pagination",
  ], textContent),
  role("role.collection.emptyState", "Empty state explanation and next action.", [
    "collection.emptyState",
  ]),

  role("role.form.introduction", "Form purpose and trust context.", [
    "form.introduction",
  ]),
  role("role.form.fieldGroup", "Grouped form fields.", ["form.fieldGroup"]),
  role("role.form.progress", "Step or completion progress.", ["form.progress"]),
  role("role.form.support", "Support copy, proof, or contact help for a form.", [
    "form.support",
  ]),
  role("role.form.consent", "Consent and privacy statement.", ["form.consent"]),
  role("role.form.summary", "Submitted or reviewed answer summary.", [
    "form.summary",
  ]),
  role("role.form.status", "Submitting, success, or error status.", [
    "form.status",
  ]),

  role("role.navigation.brand", "Brand identity link in navigation.", [
    "navigation.brand",
  ], textContent),
  role("role.navigation.primary", "Primary navigation links.", [
    "navigation.primary",
  ]),
  role("role.navigation.secondary", "Secondary navigation links.", [
    "navigation.secondary",
  ]),
  role("role.navigation.context", "Contextual navigation for the current page.", [
    "navigation.context",
  ]),
  role("role.navigation.mobileTrigger", "Small-viewport navigation trigger.", [
    "navigation.mobileTrigger",
  ], textContent),
] as const satisfies ReadonlyArray<CapabilityRoleContract>;

export const capabilityRoleIds = capabilityRoles.map((role) => role.id);
