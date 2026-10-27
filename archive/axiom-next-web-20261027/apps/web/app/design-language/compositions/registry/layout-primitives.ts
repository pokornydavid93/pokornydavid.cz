import {
  asLayoutPrimitiveId,
  asTokenId,
  defineLayoutRecipe,
} from "./helpers";
import type { LayoutPrimitiveContract, LayoutRecipeContract } from "./types";

function primitive(
  id: string,
  intent: string,
  intrinsic: boolean,
  supportedConfiguration: string[],
  intrinsicFallback: string,
  tokenIds: string[]
): LayoutPrimitiveContract {
  return {
    id: asLayoutPrimitiveId(id),
    intent,
    intrinsic,
    supportedConfiguration,
    intrinsicFallback,
    tokenIds: tokenIds.map(asTokenId),
  };
}

export const layoutPrimitives = [
  primitive("layout.container", "Page/content containment and gutters.", false, [
    "max inline size",
    "fluid inline padding",
  ], "Falls back to parent inline size.", [
    "--container-page-standard-max",
    "--space-page",
  ]),
  primitive("layout.center", "Intrinsic centering with readable measure.", true, [
    "max measure",
    "logical margin auto",
  ], "Content remains in normal flow.", ["--measure-body"]),
  primitive("layout.stack", "Vertical flow with tokenized gap.", true, [
    "gap token",
    "optional split after",
  ], "Children stack in source order.", ["--space-stack"]),
  primitive("layout.cluster", "Inline grouping with wrapping alignment.", true, [
    "wrap",
    "alignment",
    "justification",
  ], "Items wrap without changing source order.", ["--space-inline"]),
  primitive("layout.grid", "Repeated comparable units.", false, [
    "minimum item size",
    "auto-fit or explicit tracks",
  ], "Falls back to one source-order column.", ["--space-composition"]),
  primitive("layout.switcher", "Horizontal to vertical intrinsic reflow.", true, [
    "container threshold",
    "intrinsic minimum",
  ], "Stacks when available inline size is constrained.", ["--space-composition"]),
  primitive("layout.sidebar", "Dominant content plus supporting rail.", false, [
    "rail width",
    "content minimum",
  ], "Rail follows content in source order.", [
    "--container-rail-max",
    "--space-composition",
  ]),
  primitive("layout.frame", "Media aspect ratio and fit contract.", true, [
    "required square, portrait, landscape, or wide ratio",
    "object fit",
    "named or asset focal-point object position",
  ], "Media reserves the selected intrinsic aspect ratio.", ["--ratio-wide"]),
  primitive("layout.cover", "Positive block-space distribution around one principal region.", true, [
    "required semantic minimum",
    "optional start and end slots",
    "exactly one principal slot",
    "tokenized padding and gap",
  ], "Content grows beyond the minimum without clipping.", ["--size-cover-standard"]),
  primitive("layout.reel", "Horizontal overflow collection.", false, [
    "snap",
    "overflow",
    "controls",
  ], "Falls back to stacked collection.", ["--space-component"]),
  primitive("layout.overlay", "Layered content with focus safety.", false, [
    "inset",
    "layer token",
    "focus escape",
  ], "Overlay renders after trigger in DOM.", ["--layer-overlay"]),
  primitive("layout.bleed", "Named track selection outside reading measure.", true, [
    "wide or full target",
    "explicit reading layout context",
  ], "Wide converges with measure in constrained contexts.", ["--container-wide"]),
  primitive("layout.boundary", "Visual or rhythmic separation.", true, [
    "divider",
    "surface transition",
  ], "Boundary collapses to rhythm-only separation.", ["--border-subtle"]),
] as const satisfies ReadonlyArray<LayoutPrimitiveContract>;

export const layoutRecipes = [
  defineLayoutRecipe({
    id: "recipe.layout.stackIntro",
    intent: "Vertical intro with action cluster below copy.",
    primitives: ["layout.stack", "layout.cluster"],
    areas: ["eyebrow", "heading", "lead", "actions"],
    tokens: ["--measure-lead", "--heading-to-body-gap", "--space-component"],
    fallback: "One column stack.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.switcherMedia",
    intent: "Narrative copy and media/proof reflow from two regions to stack.",
    primitives: ["layout.switcher", "layout.frame"],
    areas: ["copy", "supporting"],
    tokens: ["--container-page-wide-max", "--space-composition"],
    fallback: "Copy before supporting region.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.cardCollection",
    intent: "Comparable repeated items in responsive grid.",
    primitives: ["layout.grid"],
    areas: ["introduction", "items", "action"],
    tokens: ["--container-page-wide-max", "--space-composition"],
    fallback: "Single-column item stack.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.contentRail",
    intent: "Main content with support, proof, TOC, or conversion rail.",
    primitives: ["layout.sidebar", "layout.stack"],
    areas: ["main", "rail"],
    tokens: ["--container-content-wide-max", "--container-rail-max"],
    fallback: "Main content followed by rail.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.spotlight",
    intent: "One dominant item with secondary context.",
    primitives: ["layout.cover", "layout.stack"],
    areas: ["focus", "context", "action"],
    tokens: ["--container-page-cinematic-max", "--space-section-spacious"],
    fallback: "Focused stack.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.timeline",
    intent: "Ordered process steps with progress or stepper affordance.",
    primitives: ["layout.stack", "layout.boundary"],
    areas: ["introduction", "steps", "outcome", "action"],
    tokens: ["--container-page-cinematic-max", "--space-composition"],
    fallback: "Ordered list of steps.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.matrix",
    intent: "Comparison matrix with structured rows or cards.",
    primitives: ["layout.grid", "layout.boundary"],
    areas: ["introduction", "matrix", "summary"],
    tokens: ["--container-page-wide-max", "--space-component"],
    fallback: "Stacked comparison cards.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.disclosureStack",
    intent: "Grouped disclosure rows with stable section label.",
    primitives: ["layout.stack", "layout.boundary"],
    areas: ["introduction", "items"],
    tokens: ["--container-content-wide-max", "--space-stack"],
    fallback: "Expanded static content stack.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.articleShell",
    intent: "Article body with optional TOC, support, and conversion rail.",
    primitives: ["layout.sidebar", "layout.center", "layout.stack"],
    areas: ["body", "toc", "support", "conversion"],
    tokens: ["--measure-editorial", "--container-content-wide-max"],
    fallback: "Body followed by support regions.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.formSplit",
    intent: "Form with support rail or stacked host behavior.",
    primitives: ["layout.switcher", "layout.stack"],
    areas: ["introduction", "fields", "support", "status"],
    tokens: ["--form-field-gap", "--container-rail-max"],
    fallback: "Introduction, fields, support, status.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.stickyAction",
    intent: "Persistent context action without taking main reading order.",
    primitives: ["layout.cluster", "layout.overlay"],
    areas: ["context", "actions"],
    tokens: ["--layer-sticky", "--space-inline"],
    fallback: "Inline action cluster.",
  }),
  defineLayoutRecipe({
    id: "recipe.layout.footerGrid",
    intent: "Footer navigation, contact, and legal metadata.",
    primitives: ["layout.grid", "layout.stack"],
    areas: ["brand", "navigation", "contact", "legal"],
    tokens: ["--container-page-wide-max", "--space-component"],
    fallback: "Stacked footer sections.",
  }),
] as const satisfies ReadonlyArray<LayoutRecipeContract>;
