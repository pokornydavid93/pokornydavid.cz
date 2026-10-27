import { defineComposition } from "./helpers";

export const processCompositions = [
  defineComposition({
    id: "composition.process.advisoryJourney",
    name: "Advisory Journey",
    family: "process",
    displayGroup: "process",
    status: "reviewed",
    intent: "Normativní prezentace poradenského procesu.",
    useWhen: ["The advisory process needs ordered steps, expectations, and outcome."],
    avoidWhen: ["Use contentList if order is not meaningful."],
    tags: ["migration.processTimeline", "process"],
    slots: [
      { id: "introduction", roles: ["role.text.heading", "role.text.lead"] },
      { id: "steps", roles: ["role.collection.item"], max: "unbounded" },
      { id: "outcome", roles: ["role.proof.caseResult", "role.text.body"], min: 0, priority: "supporting" },
      { id: "action", roles: ["role.action.primary"], min: 0, priority: "optional" },
    ],
    layoutRecipeIds: ["recipe.layout.timeline", "recipe.layout.cardCollection"],
    defaultLayoutRecipeId: "recipe.layout.timeline",
    containerToken: "--container-page-cinematic-max",
    motion: {
      policy: "narrative",
      allowed: ["none", "reveal", "narrative", "pinned"],
      trigger: "scroll-progress",
      fallback: "Render all advisory steps as an ordered static list.",
    },
  }),
  defineComposition({
    id: "composition.process.stepSpotlight",
    name: "Step Spotlight",
    family: "process",
    displayGroup: "process",
    status: "draft",
    intent: "Detail jednoho kroku, očekávání, výstupu a supporting media/proof.",
    useWhen: ["A process page needs to expand one advisory step."],
    avoidWhen: ["Do not use for the whole journey; use advisoryJourney."],
    tags: ["process", "detail"],
    slots: [
      { id: "step", roles: ["role.text.heading", "role.text.metadata"] },
      { id: "expectation", roles: ["role.text.body"] },
      { id: "output", roles: ["role.proof.caseResult", "role.text.body"] },
      { id: "supporting", roles: ["role.media.editorial", "role.proof.metric"], min: 0, priority: "supporting" },
    ],
    layoutRecipeIds: ["recipe.layout.switcherMedia", "recipe.layout.spotlight"],
    defaultLayoutRecipeId: "recipe.layout.switcherMedia",
  }),
] as const;
