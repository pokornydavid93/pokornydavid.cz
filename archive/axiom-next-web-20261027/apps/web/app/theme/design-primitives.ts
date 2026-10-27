export type DesignPrimitiveStatus =
  | "production"
  | "partial"
  | "planned"
  | "approved-exception"
  | "experimental"
  | "deprecated"
  | "decision-required";

export type DesignPrimitiveLayer =
  | "raw-value"
  | "primitive-scale"
  | "semantic-primitive"
  | "context-mapping"
  | "component-contract"
  | "composition-contract"
  | "concrete-usage";

export type DesignPrimitiveCategory =
  | "responsive"
  | "layout"
  | "container"
  | "measure"
  | "spacing"
  | "section-rhythm"
  | "sizing"
  | "iconography"
  | "shape"
  | "depth"
  | "layer"
  | "opacity"
  | "effect"
  | "typography"
  | "motion"
  | "interaction"
  | "scroll"
  | "media"
  | "component"
  | "composition"
  | "exception"
  | "governance"
  | "validation";

export type DesignPrimitiveDefinition = {
  id: string;
  category: DesignPrimitiveCategory;
  layer: DesignPrimitiveLayer;
  status: DesignPrimitiveStatus;
  name: string;
  description: string;
  cssVariable?: `--${string}`;
  value?: string;
  values?: readonly string[];
  sourceAuditSection: string;
  usage: readonly string[];
  owner?: string;
  decision?: string;
};

export type DesignPrimitiveBreakpoint = {
  id: string;
  label: string;
  type: "layout" | "behavior" | "component";
  max?: string;
  min?: string;
  status: DesignPrimitiveStatus;
  description: string;
  consumers: readonly string[];
};

export type DesignPrimitiveContract = {
  id: string;
  type: "component" | "composition";
  status: DesignPrimitiveStatus;
  name: string;
  description: string;
  primitives: Readonly<Record<string, string>>;
  sourceAuditSection: string;
};

export type DesignPrimitiveValidationRule = {
  id: string;
  status: DesignPrimitiveStatus;
  severity: "info" | "warning" | "error";
  detects: string;
  recommendation: string;
};

export type AxiomPrimitiveNodeType =
  | "PrimitiveValue"
  | "PrimitiveScale"
  | "SemanticPrimitive"
  | "ResponsiveCondition"
  | "ContainerRole"
  | "MeasureRole"
  | "LayoutPattern"
  | "ComponentContract"
  | "CompositionContract"
  | "MotionPreset"
  | "ElevationRole"
  | "LayerRole"
  | "MediaRole"
  | "UsageRule"
  | "Exception"
  | "ValidationRule"
  | "AdoptionStatus";

export type AxiomPrimitiveEdgeType =
  | "DERIVES_FROM"
  | "ALIASES"
  | "APPLIES_AT"
  | "MAPS_TO"
  | "USED_BY"
  | "COMPOSES_WITH"
  | "OVERRIDES"
  | "TRANSITIONS_TO"
  | "FORBIDS"
  | "VALIDATED_BY"
  | "FALLS_BACK_TO";

export const DESIGN_PRIMITIVE_ADOPTION_STATES = [
  {
    id: "production",
    label: "Production",
    description: "Implemented, documented, and available for production use.",
  },
  {
    id: "partial",
    label: "Partial",
    description: "Exists, but adoption or documentation is incomplete.",
  },
  {
    id: "planned",
    label: "Planned",
    description: "Accepted target that is not fully migrated yet.",
  },
  {
    id: "approved-exception",
    label: "Approved Exception",
    description: "Intentional deviation with a documented scope.",
  },
  {
    id: "experimental",
    label: "Experimental",
    description: "Exploration-only primitive that is not stable.",
  },
  {
    id: "deprecated",
    label: "Deprecated",
    description: "Should not be used in new work.",
  },
  {
    id: "decision-required",
    label: "Decision Required",
    description: "Blueprint identifies the role, but the final value is open.",
  },
] as const satisfies ReadonlyArray<{
  id: DesignPrimitiveStatus;
  label: string;
  description: string;
}>;

export const DESIGN_PRIMITIVE_BREAKPOINTS = [
  {
    id: "compact-layout-boundary",
    label: "Compact Layout Boundary",
    type: "layout",
    max: "720px",
    status: "planned",
    description: "Compact layout simplification boundary.",
    consumers: ["CSS layout", "section collapse", "Axiom preview"],
  },
  {
    id: "media-tablet-split",
    label: "Media / Tablet Split",
    type: "layout",
    max: "820px",
    min: "821px",
    status: "planned",
    description: "Shared boundary for tablet/media source decisions.",
    consumers: ["CSS layout", "React media switching", "Next Image sizes"],
  },
  {
    id: "cinematic-desktop-boundary",
    label: "Cinematic Desktop Boundary",
    type: "behavior",
    max: "920px",
    min: "921px",
    status: "planned",
    description: "Desktop gate for cinematic motion and advanced scenes.",
    consumers: ["GSAP", "hero motion", "process/story timelines"],
  },
  {
    id: "smooth-scroll-boundary",
    label: "Smooth Scroll Behavior Boundary",
    type: "behavior",
    min: "1024px",
    status: "planned",
    description: "Runtime boundary for smooth scrolling behavior.",
    consumers: ["LenisProvider", "scroll behavior validation"],
  },
  {
    id: "wide-layout-boundary",
    label: "Wide Layout Boundary",
    type: "layout",
    status: "decision-required",
    description:
      "Open boundary between current 1080 / 1100 / 1180 / 1200 values.",
    consumers: ["page containers", "card grid collapse", "rail layouts"],
  },
  {
    id: "cinematic-page-maximum",
    label: "Cinematic Page Maximum",
    type: "layout",
    max: "1480px",
    status: "planned",
    description: "Maximum width for premium cinematic page scenes.",
    consumers: ["hero", "editorial split", "system preview"],
  },
] as const satisfies ReadonlyArray<DesignPrimitiveBreakpoint>;

export const DESIGN_PRIMITIVE_BREAKPOINT_VALUES = {
  compactLayoutMax: "720px",
  mediaTabletMax: "820px",
  mediaTabletMin: "821px",
  cinematicDesktopMax: "920px",
  cinematicDesktopMin: "921px",
  smoothScrollMin: "1024px",
  pageCinematicMax: "1480px",
} as const;

export const DESIGN_PRIMITIVE_BREAKPOINT_NUMBERS = {
  compactLayoutMax: 720,
  mediaTabletMax: 820,
  mediaTabletMin: 821,
  cinematicDesktopMax: 920,
  cinematicDesktopMin: 921,
  smoothScrollMin: 1024,
  pageCinematicMax: 1480,
} as const;

export const DESIGN_PRIMITIVE_MEDIA_QUERIES = {
  compactLayout: `(max-width: ${DESIGN_PRIMITIVE_BREAKPOINT_VALUES.compactLayoutMax})`,
  mediaTabletAndBelow: `(max-width: ${DESIGN_PRIMITIVE_BREAKPOINT_VALUES.mediaTabletMax})`,
  mediaTabletAndUp: `(min-width: ${DESIGN_PRIMITIVE_BREAKPOINT_VALUES.mediaTabletMin})`,
  cinematicAndBelow: `(max-width: ${DESIGN_PRIMITIVE_BREAKPOINT_VALUES.cinematicDesktopMax})`,
  cinematicAndUp: `(min-width: ${DESIGN_PRIMITIVE_BREAKPOINT_VALUES.cinematicDesktopMin})`,
  smoothScrollAndUp: `(min-width: ${DESIGN_PRIMITIVE_BREAKPOINT_VALUES.smoothScrollMin})`,
  reducedMotion: "(prefers-reduced-motion: reduce)",
  noReducedMotion: "(prefers-reduced-motion: no-preference)",
} as const;

export const DESIGN_PRIMITIVE_IMAGE_SIZES = {
  pageCinematic:
    "(max-width: 720px) calc(100vw - 40px), (max-width: 1480px) calc(100vw - 112px), 1480px",
  pageWide:
    "(max-width: 720px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 96px), 1200px",
  content:
    "(max-width: 720px) calc(100vw - 40px), 720px",
  cardGrid:
    "(max-width: 720px) calc(100vw - 40px), (max-width: 1200px) 42vw, 380px",
  heroPortrait:
    "(max-width: 820px) 86vw, 460px",
} as const;

export type DesignPrimitiveMediaQuery =
  keyof typeof DESIGN_PRIMITIVE_MEDIA_QUERIES;

export type DesignPrimitiveImageSize =
  keyof typeof DESIGN_PRIMITIVE_IMAGE_SIZES;

export const DESIGN_PRIMITIVE_LAYER_VALUES = {
  background: -1,
  base: 0,
  raised: 10,
  sticky: 100,
  sectionChrome: 150,
  navigation: 200,
  popover: 500,
  dropdown: 600,
  overlay: 1000,
  modal: 2000,
  toast: 3000,
  cursor: 3500,
  routeTransition: 4000,
  transientFeedback: 11000,
  fullscreenExperience: 12000,
  devTools: 14000,
} as const;

export type DesignPrimitiveZLayer = keyof typeof DESIGN_PRIMITIVE_LAYER_VALUES;

export const DESIGN_PRIMITIVE_LAYER_CSS_VARIABLES = {
  background: "--layer-background",
  base: "--layer-base",
  raised: "--layer-raised",
  sticky: "--layer-sticky",
  sectionChrome: "--layer-section-chrome",
  navigation: "--layer-navigation",
  popover: "--layer-popover",
  dropdown: "--layer-dropdown",
  overlay: "--layer-overlay",
  modal: "--layer-modal",
  toast: "--layer-toast",
  cursor: "--layer-cursor",
  routeTransition: "--layer-route-transition",
  transientFeedback: "--layer-transient-feedback",
  fullscreenExperience: "--layer-fullscreen-experience",
  devTools: "--layer-dev-tools",
} as const satisfies Record<DesignPrimitiveZLayer, `--${string}`>;

export const DESIGN_PRIMITIVE_LAYER_OWNERS = {
  background: "Page or composition background",
  base: "Default document flow",
  raised: "Local component surface",
  sticky: "Sticky section owner",
  sectionChrome: "Section chrome and cross-section separators",
  navigation: "Navigation system",
  popover: "Popover system",
  dropdown: "Menu and dropdown system",
  overlay: "Generic overlay system",
  modal: "Modal and sheet system",
  toast: "Feedback system",
  cursor: "Contextual cursor system",
  routeTransition: "Route transition system",
  transientFeedback: "Transient fixed feedback effects",
  fullscreenExperience: "Fullscreen in-page experiences",
  devTools: "Internal tooling",
} as const satisfies Record<DesignPrimitiveZLayer, string>;

export const DESIGN_PRIMITIVE_ELEVATION_ROLES = [
  {
    id: "base",
    shadow: "--elevation-base-shadow",
    layer: "--layer-base",
    backdrop: "none",
    description: "Same-plane content without decorative glow.",
  },
  {
    id: "raised",
    shadow: "--elevation-raised-shadow",
    layer: "--layer-raised",
    backdrop: "none",
    description: "Subtle lift for cards and sticky surfaces.",
  },
  {
    id: "floating",
    shadow: "--elevation-floating-shadow",
    layer: "--layer-popover",
    backdrop: "--backdrop-soft",
    description: "Detached transient surface above base content.",
  },
  {
    id: "modal",
    shadow: "--elevation-modal-shadow",
    layer: "--layer-modal",
    backdrop: "--backdrop-medium",
    description: "Blocking overlay surface with managed focus.",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  shadow: `--${string}`;
  layer: `--${string}`;
  backdrop: "none" | `--${string}`;
  description: string;
}>;

export const DESIGN_PRIMITIVE_EFFECT_CSS_VARIABLES = {
  blurNone: "--blur-none",
  blurDecorativeSoft: "--blur-decorative-soft",
  blurDecorativeMedium: "--blur-decorative-medium",
  blurDecorativeStrong: "--blur-decorative-strong",
  backdropSoft: "--backdrop-soft",
  backdropMedium: "--backdrop-medium",
  backdropStrong: "--backdrop-strong",
} as const satisfies Record<string, `--${string}`>;

export const DESIGN_PRIMITIVE_OPACITY_CSS_VARIABLES = {
  hidden: "--opacity-hidden",
  decorativeSoft: "--opacity-decorative-soft",
  decorativeMedium: "--opacity-decorative-medium",
  mutedVisual: "--opacity-muted-visual",
  disabled: "--opacity-disabled",
  loading: "--opacity-loading",
  overlaySupport: "--opacity-overlay-support",
  visible: "--opacity-visible",
} as const satisfies Record<string, `--${string}`>;

export const DESIGN_PRIMITIVE_TYPE_ROLES = {
  display: {
    size: "--type-display-size",
    lineHeight: "--type-display-line-height",
    weight: "--type-display-weight",
    tracking: "--type-display-letter-spacing",
    measure: "--type-display-measure",
  },
  heading: {
    size: "--type-heading-size",
    lineHeight: "--type-heading-line-height",
    weight: "--type-heading-weight",
    tracking: "--type-heading-letter-spacing",
    measure: "--type-heading-measure",
  },
  lead: {
    size: "--type-lead-size",
    lineHeight: "--type-lead-line-height",
    weight: "--type-lead-weight",
    tracking: "--type-lead-letter-spacing",
    measure: "--type-lead-measure",
  },
  body: {
    size: "--type-body-size",
    lineHeight: "--type-body-line-height",
    weight: "--type-body-weight",
    tracking: "--type-body-letter-spacing",
    measure: "--type-body-measure",
  },
  label: {
    size: "--type-label-size",
    lineHeight: "--type-label-line-height",
    weight: "--type-label-weight",
    tracking: "--type-label-letter-spacing",
    measure: "--type-body-measure",
  },
  metadata: {
    size: "--type-metadata-size",
    lineHeight: "--type-metadata-line-height",
    weight: "--type-metadata-weight",
    tracking: "--type-metadata-letter-spacing",
    measure: "--type-body-measure",
  },
  eyebrow: {
    size: "--type-eyebrow-size",
    lineHeight: "--type-eyebrow-line-height",
    weight: "--type-eyebrow-weight",
    tracking: "--type-eyebrow-letter-spacing",
    measure: "--type-heading-measure",
  },
} as const satisfies Record<
  string,
  {
    size: `--${string}`;
    lineHeight: `--${string}`;
    weight: `--${string}`;
    tracking: `--${string}`;
    measure: `--${string}`;
  }
>;

export const DESIGN_PRIMITIVE_MOTION_DURATIONS_MS = {
  instant: 140,
  micro: 200,
  fast: 240,
  control: 260,
  component: 320,
  composed: 460,
  cinematic: 680,
  routeReveal: 620,
  reveal: 900,
  heroReveal: 1050,
  smoothScroll: 880,
  instantReduced: 80,
  controlReduced: 120,
  cinematicReduced: 180,
} as const;

export const DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS = {
  instant: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.instant / 1000,
  micro: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.micro / 1000,
  fast: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.fast / 1000,
  control: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.control / 1000,
  component: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.component / 1000,
  composed: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.composed / 1000,
  cinematic: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.cinematic / 1000,
  routeReveal: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.routeReveal / 1000,
  reveal: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.reveal / 1000,
  heroReveal: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.heroReveal / 1000,
  smoothScroll: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.smoothScroll / 1000,
  instantReduced: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.instantReduced / 1000,
  controlReduced: DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.controlReduced / 1000,
  cinematicReduced:
    DESIGN_PRIMITIVE_MOTION_DURATIONS_MS.cinematicReduced / 1000,
} as const;

export const DESIGN_PRIMITIVE_GSAP_EASES = {
  linear: "none",
  standard: "power2.out",
  out: "power3.out",
  in: "power2.in",
  emphasized: "power3.inOut",
  cinematic: "power3.out",
} as const;

export const DESIGN_PRIMITIVE_REVEAL_OFFSETS = {
  small: 64,
  medium: 100,
  large: 160,
} as const;

export const DESIGN_PRIMITIVE_STAGGER_SECONDS = {
  tight: 0.04,
  standard: 0.08,
  editorial: 0.12,
} as const;

export const DESIGN_PRIMITIVE_REDUCED_MOTION_CONTRACTS = {
  controlInteraction: {
    strategy: "shorten",
    duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.controlReduced,
  },
  reveal: {
    strategy: "replace",
    duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.instantReduced,
  },
  routeTransition: {
    strategy: "shorten",
    duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.cinematicReduced,
  },
  smoothScroll: {
    strategy: "fallback-to-native",
    duration: 0,
  },
} as const satisfies Record<
  string,
  {
    strategy: "remove" | "shorten" | "replace" | "freeze" | "fallback-to-native";
    duration: number;
  }
>;

export function designPrimitiveEaseOutQuart(progress: number) {
  return 1 - Math.pow(1 - progress, 4);
}

export function getDesignPrimitiveMediaQuery(
  query: DesignPrimitiveMediaQuery
) {
  return DESIGN_PRIMITIVE_MEDIA_QUERIES[query];
}

export function getDesignPrimitiveImageSizes(size: DesignPrimitiveImageSize) {
  return DESIGN_PRIMITIVE_IMAGE_SIZES[size];
}

export function getDesignPrimitiveLayerValue(layer: DesignPrimitiveZLayer) {
  return DESIGN_PRIMITIVE_LAYER_VALUES[layer];
}

export function getDesignPrimitiveLayerCssVariable(
  layer: DesignPrimitiveZLayer
) {
  return DESIGN_PRIMITIVE_LAYER_CSS_VARIABLES[layer];
}

export const DESIGN_PRIMITIVE_DEFINITIONS = [
  {
    id: "spacing.scale.0",
    category: "spacing",
    layer: "primitive-scale",
    status: "planned",
    name: "Space 0",
    cssVariable: "--space-0",
    value: "0",
    description: "No spacing.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["reset", "no gap"],
  },
  {
    id: "spacing.scale.4",
    category: "spacing",
    layer: "primitive-scale",
    status: "planned",
    name: "Space 4",
    cssVariable: "--space-4",
    value: "4px",
    description: "Micro separation.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["micro gaps", "dense labels"],
  },
  {
    id: "spacing.scale.6",
    category: "spacing",
    layer: "primitive-scale",
    status: "planned",
    name: "Space 6",
    cssVariable: "--space-6",
    value: "6px",
    description: "Dense metadata and compact inline spacing.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["metadata", "tight stacks"],
  },
  {
    id: "spacing.scale.8",
    category: "spacing",
    layer: "primitive-scale",
    status: "planned",
    name: "Space 8",
    cssVariable: "--space-8",
    value: "8px",
    description: "Compact gap.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["cluster", "compact controls"],
  },
  {
    id: "spacing.scale.12",
    category: "spacing",
    layer: "primitive-scale",
    status: "planned",
    name: "Space 12",
    cssVariable: "--space-12",
    value: "12px",
    description: "Common component gap.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["component internals", "control spacing"],
  },
  {
    id: "spacing.scale.16",
    category: "spacing",
    layer: "primitive-scale",
    status: "planned",
    name: "Space 16",
    cssVariable: "--space-16",
    value: "16px",
    description: "Base vertical and component spacing.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["stack", "component gap"],
  },
  {
    id: "spacing.scale.24",
    category: "spacing",
    layer: "primitive-scale",
    status: "planned",
    name: "Space 24",
    cssVariable: "--space-24",
    value: "24px",
    description: "Card and section relationship spacing.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["card padding", "content grouping"],
  },
  {
    id: "spacing.semantic.page",
    category: "spacing",
    layer: "semantic-primitive",
    status: "planned",
    name: "Page Gutter",
    cssVariable: "--space-page",
    description: "Fluid page gutter.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["page containers", "section wrappers"],
  },
  {
    id: "spacing.semantic.section",
    category: "section-rhythm",
    layer: "semantic-primitive",
    status: "planned",
    name: "Section Padding Block",
    cssVariable: "--section-padding-block",
    description: "Default vertical rhythm for content-driven sections.",
    sourceAuditSection: "9. Spacing and Section Rhythm",
    usage: ["sections", "system preview"],
  },
  {
    id: "container.pageCinematic",
    category: "container",
    layer: "semantic-primitive",
    status: "planned",
    name: "Page Cinematic",
    cssVariable: "--container-page-cinematic-max",
    value: "1480px",
    description: "Maximum width for premium cinematic scenes.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["hero", "editorial split", "cinematic composition"],
  },
  {
    id: "container.pageWide",
    category: "container",
    layer: "semantic-primitive",
    status: "decision-required",
    name: "Page Wide",
    cssVariable: "--container-page-wide-max",
    values: ["1180px", "1200px"],
    description: "Wide page grid boundary; final value is still open.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["card grids", "references", "certificates"],
    decision: "Choose between 1180px and 1200px before enforcement.",
  },
  {
    id: "container.runtime.measure",
    category: "container",
    layer: "semantic-primitive",
    status: "production",
    name: "Runtime Measure Container",
    cssVariable: "--container-measure",
    value: "var(--measure-body)",
    description: "Usable content-box cap for reading contexts.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["canonical Container measure size"],
  },
  {
    id: "container.runtime.content",
    category: "container",
    layer: "semantic-primitive",
    status: "production",
    name: "Runtime Content Container",
    cssVariable: "--container-content",
    value: "var(--container-page-standard-max)",
    description: "Usable content-box cap for standard page compositions.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["canonical Container content size"],
  },
  {
    id: "container.runtime.wide",
    category: "container",
    layer: "semantic-primitive",
    status: "production",
    name: "Runtime Wide Container",
    cssVariable: "--container-wide",
    value: "var(--container-page-wide-max)",
    description: "Usable content-box cap for grids, hero layouts, and wide media.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["canonical Container wide size"],
  },
  {
    id: "container.runtime.gutter",
    category: "container",
    layer: "semantic-primitive",
    status: "production",
    name: "Runtime Container Gutter",
    cssVariable: "--container-gutter",
    value: "var(--space-page)",
    description: "Fluid safe inline inset shared by every canonical Container size.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["canonical Container default gutter"],
  },
  {
    id: "sizing.coverCompact",
    category: "sizing",
    layer: "semantic-primitive",
    status: "production",
    name: "Cover Compact Minimum",
    cssVariable: "--size-cover-compact",
    value: "18rem",
    description: "Compact content-driven Cover minimum.",
    sourceAuditSection: "10. Sizing, Controls and Aspect Ratios",
    usage: ["canonical Cover compact minimum"],
  },
  {
    id: "sizing.coverStandard",
    category: "sizing",
    layer: "semantic-primitive",
    status: "production",
    name: "Cover Standard Minimum",
    cssVariable: "--size-cover-standard",
    value: "30rem",
    description: "Standard Cover minimum used by block-axis compositions.",
    sourceAuditSection: "10. Sizing, Controls and Aspect Ratios",
    usage: ["canonical Cover standard minimum"],
  },
  {
    id: "sizing.coverPage",
    category: "sizing",
    layer: "semantic-primitive",
    status: "production",
    name: "Cover Page Minimum",
    cssVariable: "--size-cover-page",
    value: "100svb",
    description: "Stable small-viewport block minimum without navigation coupling.",
    sourceAuditSection: "10. Sizing, Controls and Aspect Ratios",
    usage: ["canonical Cover viewport minimum"],
  },
  {
    id: "measure.body",
    category: "measure",
    layer: "semantic-primitive",
    status: "planned",
    name: "Measure Body",
    cssVariable: "--measure-body",
    value: "680px",
    description: "Readable body text measure.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["body copy", "FAQ", "legal text"],
  },
  {
    id: "measure.lead",
    category: "measure",
    layer: "semantic-primitive",
    status: "planned",
    name: "Measure Lead",
    cssVariable: "--measure-lead",
    value: "720px",
    description: "Hero and section introduction measure.",
    sourceAuditSection: "7. Page Containers and Content Measure",
    usage: ["hero lead", "section intro"],
  },
  {
    id: "sizing.touchTarget",
    category: "sizing",
    layer: "semantic-primitive",
    status: "planned",
    name: "Minimum Touch Target",
    cssVariable: "--control-touch-target-min",
    value: "44px",
    description: "Minimum interactive hit target.",
    sourceAuditSection: "10. Sizing, Controls and Aspect Ratios",
    usage: ["buttons", "icon buttons", "chips", "form controls"],
  },
  {
    id: "iconography.control",
    category: "iconography",
    layer: "semantic-primitive",
    status: "planned",
    name: "Icon Control",
    cssVariable: "--icon-size-control",
    value: "18px",
    description: "Default icon size for controls.",
    sourceAuditSection: "13. Iconography",
    usage: ["buttons", "icon buttons", "navigation"],
  },
  {
    id: "shape.radiusPrimary",
    category: "shape",
    layer: "primitive-scale",
    status: "production",
    name: "Radius Primary",
    cssVariable: "--radius-primary",
    value: "16px",
    description:
      "Single authored radius for standard controls, fields, cards, panels, modals, and media.",
    sourceAuditSection: "11. Radius and Border Geometry",
    usage: [
      "controls",
      "inputs",
      "cards",
      "panels",
      "modals",
      "standard media",
    ],
  },
  {
    id: "shape.radiusControl",
    category: "shape",
    layer: "semantic-primitive",
    status: "production",
    name: "Radius Control",
    cssVariable: "--radius-control",
    value: "16px",
    description: "Control alias of Radius Primary.",
    sourceAuditSection: "11. Radius and Border Geometry",
    usage: ["buttons", "chips", "compact controls"],
  },
  {
    id: "shape.radiusCta",
    category: "shape",
    layer: "semantic-primitive",
    status: "approved-exception",
    name: "Radius CTA",
    cssVariable: "--radius-cta",
    value: "999px",
    description:
      "Capsule silhouette reserved for conversion CTAs with an integrated icon dock.",
    sourceAuditSection: "11. Radius and Border Geometry",
    usage: ["docked conversion CTA"],
    owner: "Conversion actions",
  },
  {
    id: "shape.radiusCard",
    category: "shape",
    layer: "semantic-primitive",
    status: "production",
    name: "Radius Card",
    cssVariable: "--radius-card",
    value: "16px",
    description: "Card and panel alias of Radius Primary.",
    sourceAuditSection: "11. Radius and Border Geometry",
    usage: ["cards", "panels"],
  },
  {
    id: "shape.radiusCheckbox",
    category: "shape",
    layer: "semantic-primitive",
    status: "approved-exception",
    name: "Radius Checkbox",
    cssVariable: "--radius-checkbox",
    value: "4px",
    description:
      "Small semantic radius that preserves checkbox recognition at a 20px control size.",
    sourceAuditSection: "11. Radius and Border Geometry",
    usage: ["checkbox indicators"],
    owner: "Form controls",
  },
  {
    id: "shape.radiusCinematicOuter",
    category: "shape",
    layer: "semantic-primitive",
    status: "approved-exception",
    name: "Radius Cinematic Outer",
    cssVariable: "--radius-cinematic-outer",
    value: "39px",
    description: "Outer radius for cinematic media shells.",
    sourceAuditSection: "11. Radius and Border Geometry",
    usage: ["hero portrait frame", "cinematic media shell"],
    owner: "Hero composition",
  },
  {
    id: "shape.borderStructural",
    category: "shape",
    layer: "semantic-primitive",
    status: "planned",
    name: "Structural Border Width",
    cssVariable: "--border-width-structural",
    value: "1px",
    description: "Default border geometry.",
    sourceAuditSection: "11. Radius and Border Geometry",
    usage: ["cards", "inputs", "panels"],
  },
  {
    id: "media.ratioSquare",
    category: "media",
    layer: "semantic-primitive",
    status: "production",
    name: "Frame Square Ratio",
    cssVariable: "--ratio-square",
    value: "1 / 1",
    description: "Square canonical Frame ratio.",
    sourceAuditSection: "18. Media and Image Primitives",
    usage: ["canonical Frame"],
  },
  {
    id: "media.ratioPortrait",
    category: "media",
    layer: "semantic-primitive",
    status: "production",
    name: "Frame Portrait Ratio",
    cssVariable: "--ratio-portrait",
    value: "4 / 5",
    description: "Editorial portrait canonical Frame ratio.",
    sourceAuditSection: "18. Media and Image Primitives",
    usage: ["canonical Frame"],
  },
  {
    id: "media.ratioLandscape",
    category: "media",
    layer: "semantic-primitive",
    status: "production",
    name: "Frame Landscape Ratio",
    cssVariable: "--ratio-landscape",
    value: "3 / 2",
    description: "Landscape canonical Frame ratio.",
    sourceAuditSection: "18. Media and Image Primitives",
    usage: ["canonical Frame"],
  },
  {
    id: "media.ratioWide",
    category: "media",
    layer: "semantic-primitive",
    status: "production",
    name: "Frame Wide Ratio",
    cssVariable: "--ratio-wide",
    value: "16 / 9",
    description: "Wide canonical Frame ratio.",
    sourceAuditSection: "18. Media and Image Primitives",
    usage: ["canonical Frame"],
  },
  {
    id: "media.videoLandscape",
    category: "media",
    layer: "semantic-primitive",
    status: "planned",
    name: "Video Landscape Ratio",
    cssVariable: "--ratio-video-landscape",
    value: "16 / 9",
    description: "Desktop video frame ratio.",
    sourceAuditSection: "18. Media and Image Primitives",
    usage: ["video", "media frame"],
  },
  {
    id: "media.videoPortrait",
    category: "media",
    layer: "semantic-primitive",
    status: "planned",
    name: "Video Portrait Ratio",
    cssVariable: "--ratio-video-portrait",
    value: "9 / 16",
    description: "Mobile video frame ratio.",
    sourceAuditSection: "18. Media and Image Primitives",
    usage: ["video", "mobile media frame"],
  },
  {
    id: "media.frameRadius",
    category: "media",
    layer: "component-contract",
    status: "planned",
    name: "Media Frame Radius",
    cssVariable: "--media-frame-radius",
    description: "Default radius for reusable media frames.",
    sourceAuditSection: "17. Aspect Ratio System",
    usage: ["MediaFrame", "image wrappers", "video wrappers"],
  },
  {
    id: "depth.elevationRaised",
    category: "depth",
    layer: "semantic-primitive",
    status: "planned",
    name: "Elevation Raised",
    cssVariable: "--elevation-raised-shadow",
    description: "Subtle raised surface shadow alias with layer semantics.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["cards", "sticky elements"],
  },
  {
    id: "depth.elevationFloating",
    category: "depth",
    layer: "semantic-primitive",
    status: "planned",
    name: "Elevation Floating",
    cssVariable: "--elevation-floating-shadow",
    description: "Detached transient surface shadow.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["popover", "dropdown", "floating tools"],
  },
  {
    id: "depth.elevationModal",
    category: "depth",
    layer: "semantic-primitive",
    status: "planned",
    name: "Elevation Modal",
    cssVariable: "--elevation-modal-shadow",
    description: "Blocking overlay surface shadow.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["modal", "sheet"],
  },
  {
    id: "effect.backdropMedium",
    category: "effect",
    layer: "semantic-primitive",
    status: "planned",
    name: "Backdrop Medium",
    cssVariable: "--backdrop-medium",
    value: "16px",
    description: "Backdrop separation for modal or sheet support.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["modal", "tool drawer"],
  },
  {
    id: "opacity.overlaySupport",
    category: "opacity",
    layer: "semantic-primitive",
    status: "planned",
    name: "Opacity Overlay Support",
    cssVariable: "--opacity-overlay-support",
    value: "0.78",
    description: "Scrim opacity role for blocking overlays.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["modal backdrop", "route overlay"],
  },
  {
    id: "layer.sectionChrome",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Section Chrome",
    cssVariable: "--layer-section-chrome",
    value: "150",
    description:
      "Owned layer for cross-section dividers, trust bars, and section chrome above local hero media.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["service strip", "section separator chrome"],
    owner: "Section composition system",
  },
  {
    id: "layer.navigation",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Navigation",
    cssVariable: "--layer-navigation",
    value: "200",
    description: "Owned layer for persistent navigation surfaces.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["nav shell", "trust bar"],
    owner: "Navigation system",
  },
  {
    id: "layer.overlay",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Overlay",
    cssVariable: "--layer-overlay",
    value: "1000",
    description: "Owned layer for generic page overlays below modal.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["scrim", "non-blocking overlay"],
    owner: "Overlay system",
  },
  {
    id: "layer.modal",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Modal",
    cssVariable: "--layer-modal",
    value: "2000",
    description: "Owned layer for modal system.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["modal", "sheet"],
    owner: "Modal system",
  },
  {
    id: "layer.cursor",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Cursor",
    cssVariable: "--layer-cursor",
    value: "3500",
    description:
      "Owned layer for the single global contextual cursor, below route transitions and above page feedback.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["contextual cursor"],
    owner: "Interaction feedback system",
  },
  {
    id: "layer.routeTransition",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Route Transition",
    cssVariable: "--layer-route-transition",
    value: "4000",
    description: "Owned layer for route transition overlay.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["route transition"],
    owner: "Route transition system",
  },
  {
    id: "layer.devTools",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Dev Tools",
    cssVariable: "--layer-dev-tools",
    value: "14000",
    description: "Owned layer for internal tooling controls.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["dev settings", "internal controls"],
    owner: "Internal tooling",
  },
  {
    id: "layer.transientFeedback",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Transient Feedback",
    cssVariable: "--layer-transient-feedback",
    value: "11000",
    description:
      "Owned layer for short fixed feedback effects that must clear page chrome without becoming an infinite z-index escape hatch.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["CTA projectile feedback"],
    owner: "Interaction feedback system",
  },
  {
    id: "layer.fullscreenExperience",
    category: "layer",
    layer: "semantic-primitive",
    status: "planned",
    name: "Layer Fullscreen Experience",
    cssVariable: "--layer-fullscreen-experience",
    value: "12000",
    description:
      "Owned layer for fullscreen in-page experiences that must cover previous page chrome while remaining below dev tools.",
    sourceAuditSection: "12. Shadows, Elevation, Blur, Opacity and Layers",
    usage: ["hero explore overlay"],
    owner: "Fullscreen experience system",
  },
  {
    id: "typography.display",
    category: "typography",
    layer: "semantic-primitive",
    status: "planned",
    name: "Type Display",
    cssVariable: "--type-display-size",
    value: "clamp(2.75rem, 5vw, 5rem)",
    description: "Primary display role for the single dominant viewport statement.",
    sourceAuditSection: "14. Typography Primitives",
    usage: ["hero statements", "design-language route header"],
  },
  {
    id: "typography.lead",
    category: "typography",
    layer: "semantic-primitive",
    status: "planned",
    name: "Type Lead",
    cssVariable: "--type-lead-size",
    value: "clamp(1.25rem, 1.6vw, 1.625rem)",
    description: "Readable lead paragraph size between heading and body.",
    sourceAuditSection: "14. Typography Primitives",
    usage: ["section intros", "supporting hero copy"],
  },
  {
    id: "typography.weightDisplay",
    category: "typography",
    layer: "semantic-primitive",
    status: "planned",
    name: "Weight Display",
    cssVariable: "--type-display-weight",
    value: "700",
    description: "Dominant display weight with composed rather than heavy energy.",
    sourceAuditSection: "14. Typography Primitives",
    usage: ["display headings", "hero statements"],
  },
  {
    id: "typography.weightStrong",
    category: "typography",
    layer: "semantic-primitive",
    status: "planned",
    name: "Weight Strong",
    cssVariable: "--type-weight-strong",
    value: "650",
    description: "Strong label and action emphasis weight.",
    sourceAuditSection: "14. Typography Primitives",
    usage: ["buttons", "labels", "metadata"],
  },
  {
    id: "motion.durationReveal",
    category: "motion",
    layer: "semantic-primitive",
    status: "planned",
    name: "Duration Reveal",
    cssVariable: "--duration-reveal",
    value: "900ms",
    description: "Standard scroll reveal duration.",
    sourceAuditSection: "15. Motion, Transform and Scroll",
    usage: ["Reveal default", "card reveal"],
  },
  {
    id: "motion.durationHeroReveal",
    category: "motion",
    layer: "semantic-primitive",
    status: "planned",
    name: "Duration Hero Reveal",
    cssVariable: "--duration-hero-reveal",
    value: "1050ms",
    description: "Hero/display reveal duration.",
    sourceAuditSection: "15. Motion, Transform and Scroll",
    usage: ["hero reveal", "display intro"],
  },
  {
    id: "motion.durationControl",
    category: "motion",
    layer: "semantic-primitive",
    status: "planned",
    name: "Duration Control",
    cssVariable: "--duration-control",
    value: "260ms",
    description: "Default control transition duration.",
    sourceAuditSection: "15. Motion, Transform and Scroll",
    usage: ["buttons", "inputs", "nav controls"],
  },
  {
    id: "motion.durationCinematic",
    category: "motion",
    layer: "semantic-primitive",
    status: "planned",
    name: "Duration Cinematic",
    cssVariable: "--duration-cinematic",
    value: "680ms",
    description: "Cinematic route and scene duration candidate.",
    sourceAuditSection: "15. Motion, Transform and Scroll",
    usage: ["route transition", "cinematic scene"],
  },
  {
    id: "motion.easeEmphasized",
    category: "motion",
    layer: "semantic-primitive",
    status: "planned",
    name: "Ease Emphasized",
    cssVariable: "--ease-emphasized",
    value: "cubic-bezier(0.77, 0, 0.18, 1)",
    description: "Route and composed transition easing.",
    sourceAuditSection: "15. Motion, Transform and Scroll",
    usage: ["route transition", "composed scene"],
  },
  {
    id: "motion.revealOffsetMedium",
    category: "motion",
    layer: "semantic-primitive",
    status: "planned",
    name: "Reveal Offset Medium",
    cssVariable: "--reveal-offset-medium",
    value: "100px",
    description: "Default transform reveal offset.",
    sourceAuditSection: "15. Motion, Transform and Scroll",
    usage: ["Reveal default", "card reveal"],
  },
  {
    id: "motion.staggerStandard",
    category: "motion",
    layer: "semantic-primitive",
    status: "planned",
    name: "Stagger Standard",
    cssVariable: "--stagger-standard",
    value: "80ms",
    description: "Default list/card reveal stagger.",
    sourceAuditSection: "15. Motion, Transform and Scroll",
    usage: ["Reveal list", "card grid reveal"],
  },
  {
    id: "interaction.focusStandard",
    category: "interaction",
    layer: "semantic-primitive",
    status: "planned",
    name: "Focus Standard",
    cssVariable: "--focus-width-standard",
    value: "2px",
    description: "Default visible focus width.",
    sourceAuditSection: "16. Focus Geometry and Interaction States",
    usage: ["buttons", "links", "inputs"],
  },
  {
    id: "interaction.focusOffsetStandard",
    category: "interaction",
    layer: "semantic-primitive",
    status: "planned",
    name: "Focus Standard Offset",
    cssVariable: "--focus-offset-standard",
    value: "3px",
    description: "Default visible focus offset.",
    sourceAuditSection: "16. Focus Geometry and Interaction States",
    usage: ["buttons", "links", "inputs"],
  },
  {
    id: "interaction.focusInset",
    category: "interaction",
    layer: "semantic-primitive",
    status: "planned",
    name: "Focus Inset",
    cssVariable: "--focus-offset-inset",
    value: "-6px",
    description: "Inset focus variant for clipped media or card surfaces.",
    sourceAuditSection: "16. Focus Geometry and Interaction States",
    usage: ["interactive media", "clipped cards"],
  },
] as const satisfies ReadonlyArray<DesignPrimitiveDefinition>;

export const DESIGN_PRIMITIVE_COMPONENT_CONTRACTS = [
  {
    id: "component.button.primary",
    type: "component",
    status: "planned",
    name: "Button Primary",
    description: "Primary action geometry and motion contract.",
    primitives: {
      height: "--button-primary-height",
      paddingInline: "--button-primary-padding-inline",
      radius: "--button-primary-radius",
      iconSize: "--button-primary-icon-size",
      pressedTransform: "--press-scale",
      transition: "--duration-control + --ease-standard",
      focus: "Focus Standard",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.button.ctaDocked",
    type: "component",
    status: "production",
    name: "CTA Docked",
    description:
      "Content-fit conversion CTA with a capsule silhouette and circular paper-plane dock.",
    primitives: {
      height: "--button-cta-height",
      radius: "--button-cta-radius",
      labelPaddingStart: "--button-cta-label-padding-start",
      gap: "--button-cta-content-gap",
      iconInset: "--button-cta-icon-inset",
      iconShellSize: "--button-cta-icon-shell-size",
      iconSize: "--button-cta-icon-size",
      transition: "--duration-control + --ease-standard",
      focus: "Focus Standard",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.card",
    type: "component",
    status: "planned",
    name: "Card",
    description: "Reusable card geometry contract.",
    primitives: {
      padding: "--card-padding",
      compactPadding: "--card-padding-compact",
      gap: "--card-gap",
      radius: "--card-radius",
      border: "--card-border-width",
      elevation: "--card-elevation",
      hover: "Card Hover Motion",
      focus: "Focus Standard or Focus Inset",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.input",
    type: "component",
    status: "planned",
    name: "Input",
    description: "Input, select, and textarea geometry contract.",
    primitives: {
      height: "--input-height",
      paddingInline: "--input-padding-inline",
      paddingBlock: "--input-padding-block",
      gap: "--input-gap",
      radius: "--input-radius",
      border: "--input-border-width",
      transition: "--input-transition-duration + --ease-standard",
      focus: "--input-focus-width + --focus-offset-standard",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.badge",
    type: "component",
    status: "planned",
    name: "Badge / Chip",
    description: "Static badge and compact interactive chip contract.",
    primitives: {
      height: "--badge-height",
      paddingInline: "--badge-padding-inline",
      gap: "--badge-gap",
      radius: "--badge-radius",
      border: "--badge-border-width",
      motion: "--badge-transition-duration + --ease-standard",
      focus: "Focus Dense if interactive",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.navigationItem",
    type: "component",
    status: "planned",
    name: "Navigation Item",
    description: "Persistent nav item and menu control contract.",
    primitives: {
      height: "--nav-item-height",
      paddingInline: "--nav-item-padding-inline",
      gap: "--nav-item-gap",
      radius: "--nav-item-radius",
      layer: "--nav-item-layer",
      motion: "--duration-control + --ease-standard",
      focus: "Focus Standard",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.modal",
    type: "component",
    status: "planned",
    name: "Modal",
    description: "Modal geometry, elevation, and layer contract.",
    primitives: {
      radius: "--radius-modal",
      elevation: "--elevation-modal-shadow",
      layer: "--layer-modal",
      backdrop: "--modal-backdrop-blur",
      backdropOpacity: "--modal-backdrop-opacity",
      focus: "managed focus",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.sheet",
    type: "component",
    status: "planned",
    name: "Sheet",
    description: "Mobile sheet surface sharing modal ownership and geometry.",
    primitives: {
      radius: "--sheet-radius",
      layer: "--sheet-layer",
      elevation: "--elevation-modal-shadow",
      backdrop: "--modal-backdrop-blur",
      focus: "managed focus",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.popover",
    type: "component",
    status: "planned",
    name: "Popover",
    description: "Transient floating surface contract.",
    primitives: {
      padding: "--popover-padding",
      gap: "--popover-gap",
      radius: "--popover-radius",
      layer: "--popover-layer",
      elevation: "--popover-elevation",
      motion: "--duration-component + --ease-standard",
      focus: "trigger-managed focus",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.toast",
    type: "component",
    status: "planned",
    name: "Toast",
    description: "Feedback toast surface with owned layer and aria-live behavior.",
    primitives: {
      padding: "--toast-padding",
      radius: "--toast-radius",
      layer: "--toast-layer",
      overlayLayer: "--toast-overlay-layer",
      elevation: "--toast-elevation",
      motion: "--duration-component + --ease-standard",
      a11y: "aria-live without focus steal",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.routeTransitionOverlay",
    type: "component",
    status: "planned",
    name: "Route Transition Overlay",
    description: "Owned route transition layer and backdrop contract.",
    primitives: {
      layer: "--route-transition-layer",
      snapshotLayer: "--route-transition-snapshot-layer",
      backdrop: "--route-transition-backdrop-blur",
      motion:
        "--route-transition-cover-duration + --route-transition-ease",
      reducedMotion: "--route-transition-reduced-duration",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.revealMotion",
    type: "component",
    status: "planned",
    name: "Reveal Motion",
    description: "Shared reveal preset contract for GSAP and IO reveal engines.",
    primitives: {
      duration: "--duration-reveal",
      heroDuration: "--duration-hero-reveal",
      offset: "--reveal-offset-medium",
      stagger: "--stagger-standard",
      easing: "DESIGN_PRIMITIVE_GSAP_EASES",
      reducedMotion: "DESIGN_PRIMITIVE_REDUCED_MOTION_CONTRACTS.reveal",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.trustBar",
    type: "component",
    status: "planned",
    name: "Trust Bar",
    description: "Persistent navigation support bar layer and elevation contract.",
    primitives: {
      layer: "--trust-bar-layer",
      elevation: "--trust-bar-elevation",
      radius: "--radius-panel",
      motion: "Navigation motion family",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.devToolsOverlay",
    type: "component",
    status: "planned",
    name: "Dev Tools Overlay",
    description: "Internal tooling layer and backdrop contract.",
    primitives: {
      layer: "--dev-tools-layer",
      controlBackdrop: "--dev-tools-control-backdrop-blur",
      drawerBackdrop: "--dev-tools-drawer-backdrop-blur",
      focus: "Focus Standard",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
  {
    id: "component.mediaFrame",
    type: "component",
    status: "planned",
    name: "Media Frame",
    description: "Reusable media wrapper for aspect ratio, radius, border, and focus clipping.",
    primitives: {
      radius: "--media-frame-radius",
      border: "--media-frame-border-width",
      elevation: "--media-frame-elevation",
      focus: "Focus Inset when interactive",
      ratio: "Media role ratio",
    },
    sourceAuditSection: "28. Component Primitive Contracts",
  },
] as const satisfies ReadonlyArray<DesignPrimitiveContract>;

export const DESIGN_PRIMITIVE_COMPOSITION_CONTRACTS = [
  {
    id: "composition.heroIntroduction",
    type: "composition",
    status: "planned",
    name: "Hero Introduction",
    description: "First viewport thesis with display heading, lead, actions, and optional media.",
    primitives: {
      container: "--container-page-cinematic-max",
      rhythm: "Section Hero",
      measure: "--measure-display + --measure-lead",
      motion: "--duration-hero-reveal",
      exception: "Hero Media Shell",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.cardGrid",
    type: "composition",
    status: "planned",
    name: "Card Grid",
    description: "Repeated comparable cards with predictable collapse behavior.",
    primitives: {
      container: "--container-page-wide-max",
      gap: "--space-composition",
      card: "component.card",
      breakpoint: "Compact / Media boundary",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.sectionIntroduction",
    type: "composition",
    status: "planned",
    name: "Section Introduction",
    description: "Reusable section opening with heading, lead, and content gap.",
    primitives: {
      container: "--container-page-standard-max",
      measure: "--measure-lead",
      headingGap: "--heading-to-body-gap",
      contentGap: "--intro-to-content-gap",
      motion: "--duration-reveal",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.editorialSplit",
    type: "composition",
    status: "planned",
    name: "Editorial Split",
    description: "Text plus media or proof rail with controlled collapse.",
    primitives: {
      container: "--container-page-wide-max",
      measure: "--measure-lead",
      gap: "--space-composition",
      media: "component.mediaFrame",
      breakpoint: "Media / tablet split",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.processTimeline",
    type: "composition",
    status: "planned",
    name: "Process Timeline",
    description: "Ordered advisory process with timeline or composition grid.",
    primitives: {
      container: "--container-page-cinematic-max",
      measure: "--measure-body + --measure-lead",
      rhythm: "--space-section-spacious",
      motion: "--duration-cinematic",
      exception: "Pinned scene only if approved",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.trustStrip",
    type: "composition",
    status: "planned",
    name: "Trust Strip",
    description: "Compact proof cluster with metadata scale and micro motion.",
    primitives: {
      container: "--container-page-standard-max",
      gap: "--space-component",
      typography: "--type-metadata-size",
      motion: "--duration-micro",
      component: "component.badge",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.ctaBlock",
    type: "composition",
    status: "planned",
    name: "CTA Block",
    description: "Decision point with lead text and action priority.",
    primitives: {
      container: "--container-page-standard-max",
      rhythm: "--space-section-compact",
      measure: "--measure-lead",
      action: "component.button.ctaDocked",
      surface: "--surface-action",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.formSplit",
    type: "composition",
    status: "planned",
    name: "Form Split",
    description: "Form plus support rail or modal/sheet fallback.",
    primitives: {
      container: "--container-page-standard-max",
      rail: "--container-rail-max",
      fieldGap: "--form-field-gap",
      mobile: "Sheet or single column",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.articleHeader",
    type: "composition",
    status: "planned",
    name: "Article Header",
    description: "Editorial entry pattern for articles and long-form pages.",
    primitives: {
      container: "--container-content-wide-max",
      measure: "--measure-editorial",
      typography: "--type-display-size + --type-lead-size",
      rhythm: "--space-section-compact",
      media: "--ratio-article-feature",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
  {
    id: "composition.finalCta",
    type: "composition",
    status: "planned",
    name: "Final CTA",
    description: "Final conversion moment with lead copy and focused actions.",
    primitives: {
      container: "--container-page-wide-max",
      measure: "--measure-lead",
      rhythm: "--space-section",
      surface: "--surface-section-dark-deep",
      action: "component.button.ctaDocked",
    },
    sourceAuditSection: "29. Composition Primitive Contracts",
  },
] as const satisfies ReadonlyArray<DesignPrimitiveContract>;

export const DESIGN_PRIMITIVE_EXCEPTIONS = [
  {
    id: "exception.heroMediaShellRadius",
    category: "exception",
    layer: "semantic-primitive",
    status: "approved-exception",
    name: "Hero Media Shell Radius",
    cssVariable: "--radius-cinematic-outer",
    value: "39px",
    description: "Preserves the cinematic hero shell instead of forcing card radius.",
    sourceAuditSection: "30. Cinematic Exception Model",
    usage: ["hero portrait frame", "cinematic media shell"],
    owner: "Hero composition",
  },
  {
    id: "exception.strongDecorativeBlur",
    category: "exception",
    layer: "semantic-primitive",
    status: "decision-required",
    name: "Strong Decorative Blur",
    cssVariable: "--blur-decorative-strong",
    value: "34px",
    values: ["34px", "54px"],
    description: "Large decorative blur must be scoped before enforcement.",
    sourceAuditSection: "30. Cinematic Exception Model",
    usage: ["cinematic decorative layers"],
    decision: "54px requires explicit exception record before reuse.",
  },
] as const satisfies ReadonlyArray<DesignPrimitiveDefinition>;

export const DESIGN_PRIMITIVE_VALIDATION_RULES = [
  {
    id: "primitive-leakage",
    status: "planned",
    severity: "warning",
    detects: "Raw value is used directly while a canonical primitive exists.",
    recommendation: "Map the value to a primitive, semantic role, or exception.",
  },
  {
    id: "breakpoint-drift",
    status: "planned",
    severity: "error",
    detects: "CSS, TypeScript, or image sizes use different boundaries for the same meaning.",
    recommendation: "Read the shared breakpoint role from the primitive schema.",
  },
  {
    id: "layer-escalation",
    status: "planned",
    severity: "error",
    detects: "A component uses extreme z-index instead of an owned layer role.",
    recommendation: "Move the component to an owned layer or fix the stacking context.",
  },
  {
    id: "motion-drift",
    status: "planned",
    severity: "warning",
    detects: "A motion duration or easing is repeated outside the motion registry.",
    recommendation: "Map the value to a motion role or approved cinematic exception.",
  },
  {
    id: "raw-reduced-motion-query",
    status: "planned",
    severity: "warning",
    detects: "JavaScript uses a raw prefers-reduced-motion media query string.",
    recommendation: "Read DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion instead.",
  },
  {
    id: "unregistered-exception",
    status: "planned",
    severity: "warning",
    detects: "A cinematic or optical exception is not registered.",
    recommendation: "Create an exception record with scope, owner, and fallback behavior.",
  },
] as const satisfies ReadonlyArray<DesignPrimitiveValidationRule>;

export const DESIGN_PRIMITIVE_BLOCKED_VALUE_MAP = [
  {
    id: "blocked.layer.extreme",
    validationRule: "layer-escalation",
    severity: "error",
    values: ["99999", "222222", "300000", "400000", "2147483647"],
    canonical: "Use an owned layer token such as --layer-modal or --layer-route-transition.",
  },
  {
    id: "blocked.motion.raw-reduced-query",
    validationRule: "raw-reduced-motion-query",
    severity: "warning",
    values: ["(prefers-reduced-motion: reduce)"],
    canonical: "Use DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion in JavaScript.",
  },
  {
    id: "blocked.motion.local-duration",
    validationRule: "motion-drift",
    severity: "warning",
    values: ["duration: 0.88", "duration: 0.9", "duration: 0.92", "duration: 0.95"],
    canonical: "Use DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS or a registered exception.",
  },
] as const;

export const AXIOM_DESIGN_PRIMITIVE_NODE_TYPES = [
  "PrimitiveValue",
  "PrimitiveScale",
  "SemanticPrimitive",
  "ResponsiveCondition",
  "ContainerRole",
  "MeasureRole",
  "LayoutPattern",
  "ComponentContract",
  "CompositionContract",
  "MotionPreset",
  "ElevationRole",
  "LayerRole",
  "MediaRole",
  "UsageRule",
  "Exception",
  "ValidationRule",
  "AdoptionStatus",
] as const satisfies ReadonlyArray<AxiomPrimitiveNodeType>;

export const AXIOM_DESIGN_PRIMITIVE_EDGE_TYPES = [
  "DERIVES_FROM",
  "ALIASES",
  "APPLIES_AT",
  "MAPS_TO",
  "USED_BY",
  "COMPOSES_WITH",
  "OVERRIDES",
  "TRANSITIONS_TO",
  "FORBIDS",
  "VALIDATED_BY",
  "FALLS_BACK_TO",
] as const satisfies ReadonlyArray<AxiomPrimitiveEdgeType>;

export const DESIGN_PRIMITIVE_IMPLEMENTATION_PHASES = [
  "Architecture and Source of Truth",
  "Responsive and Spatial Core",
  "Shape and Dimensions",
  "Depth and Layering",
  "Typography and Motion",
  "Component Contracts",
  "Composition Contracts",
  "Migration and Enforcement",
] as const;

export const DESIGN_PRIMITIVE_REGISTRY = [
  ...DESIGN_PRIMITIVE_DEFINITIONS,
  ...DESIGN_PRIMITIVE_EXCEPTIONS,
] as const;

export const DESIGN_PRIMITIVE_IDS = DESIGN_PRIMITIVE_REGISTRY.map(
  (primitive) => primitive.id
);

export function getDesignPrimitiveById(id: string) {
  return DESIGN_PRIMITIVE_REGISTRY.find((primitive) => primitive.id === id);
}

export function getDesignPrimitivesByCategory(
  category: DesignPrimitiveCategory
) {
  return DESIGN_PRIMITIVE_REGISTRY.filter(
    (primitive) => primitive.category === category
  );
}
