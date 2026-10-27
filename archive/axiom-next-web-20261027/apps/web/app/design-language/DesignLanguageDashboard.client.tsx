"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import s from "./designLanguage.module.css";

type TokenState = Record<string, string>;

type TokenItem = {
  name: string;
  label?: string;
  role?: string;
  aliasOf?: string;
};

type FoundationColor = {
  name: string;
  hex: string;
  token: string;
  role: string;
};

type SurfaceTone = "dark" | "light";

type StructuralSurface = {
  label: string;
  name: string;
  role: string;
  source: string;
  textFamily: "--text-on-dark-*" | "--text-on-light-*";
  tone: SurfaceTone;
  type: string;
  accent: "--brand-lime";
};

type StructuralSurfaceGroup = {
  label: string;
  items: StructuralSurface[];
};

type ActionKind =
  | "primary"
  | "secondary"
  | "nav"
  | "badge"
  | "focus"
  | "border";

type ActionState = {
  label: string;
  token?: string;
  value: string;
  tone: "accent" | "dark" | "muted";
  focus?: boolean;
};

type ActionPreview = TokenItem & {
  kind: ActionKind;
  source: string;
  states?: ActionState[];
};

type ActionColumn = {
  label: string;
  items: ActionPreview[];
};

type ActionReferenceToken = {
  name: string;
  source: string;
};

type ActionReferenceGroup = {
  label: string;
  items: ActionReferenceToken[];
};

type BorderPreview = TokenItem & {
  label: string;
  surface: string;
  foreground: string;
  tokenColor: string;
  tone: SurfaceContext;
  sourceColor: string;
  contextAlias: string;
};

type BorderGroup = {
  label: string;
  items: BorderPreview[];
};

type BorderActionSurfaceTest = {
  label: string;
  surface: string;
  tone: SurfaceContext;
  note: string;
};

type BorderIntensityGroup = {
  label: string;
  items: {
    label: string;
    value: string;
  }[];
};

type ActionSurface = {
  label: string;
  name: string;
  meaning: string;
  foreground: string;
  border: string;
  tone: "light" | "dark";
  derivation: string;
  textTokens: string[];
};

type SummaryCard = {
  label: string;
  status: string;
  description?: string;
  href?: string;
};

type SurfaceContext = "dark" | "light" | "action";
type TextTone = "dark" | "light" | "accent";
type TextRole = "primary" | "secondary" | "muted";

type TextPreview = {
  label: string;
  name: string;
  role: TextRole;
};

type TextSurfaceRow = {
  label: string;
  surface: string;
  tone: TextTone;
  surfaceTone: SurfaceContext;
  coverage: string[];
  previews: TextPreview[];
};

type TextEmphasisPreview = {
  label: string;
  token: string;
  alias: string;
  surface: string;
  tone: TextTone;
  surfaceTone: SurfaceContext;
  primaryToken: string;
  role: string;
  emphasisLine: string;
  primaryLine: string;
};

type TypographyRolePreview = {
  label: string;
  sample: string;
  className: string;
  tokenFamily: string;
  colorAlias: string;
  usage: string;
};

type TypographySurfaceOption = {
  label: string;
  tone: SurfaceContext;
  surface: string;
  border: string;
};

const navigationItems = [
  { href: "#overview", label: "Overview" },
  { href: "#foundation", label: "Foundations" },
  { href: "#surfaces", label: "Surfaces" },
  { href: "#typography", label: "Text hierarchy" },
  { href: "#type-roles", label: "Type roles" },
  { href: "#text-compositions", label: "Compositions" },
  { href: "#actions", label: "Actions" },
  { href: "#borders", label: "Borders" },
  { href: "#components", label: "Components" },
];

const summaryCards: SummaryCard[] = [
  { label: "Foundation palette", status: "Ready for review" },
  { label: "Surface system", status: "Ready for review" },
  { label: "Text on surfaces", status: "Ready for review" },
  { label: "Text emphasis", status: "Ready for review" },
  { label: "Typography roles", status: "Ready for review" },
  { label: "Action language", status: "Ready for review" },
  { label: "Component primitives", status: "Ready for review" },
  {
    label: "System Preview",
    status: "Ready for review",
    description:
      "Full-page composition for validating surfaces, components, typography, and layout rhythm together.",
    href: "/design-language/system-preview/",
  },
];

const foundationColors: FoundationColor[] = [
  {
    name: "Lime Green",
    hex: "#B0E454",
    token: "--brand-lime",
    role: "action / accent / active signal",
  },
  {
    name: "Forest Green",
    hex: "#224F10",
    token: "--brand-forest",
    role: "trust / depth / finance",
  },
  {
    name: "Soft Ivory",
    hex: "#EAFFD0",
    token: "--brand-ivory",
    role: "readable surface / calm space",
  },
  {
    name: "Jet Black",
    hex: "#0D0D0D",
    token: "--brand-jet",
    role: "cinematic base / focus",
  },
];

const structuralSurfaceGroups: StructuralSurfaceGroup[] = [
  {
    label: "BASE SURFACES",
    items: [
      {
        label: "Page Base",
        name: "--surface-page",
        role: "global canvas / page background",
        source: "alias -> --brand-jet",
        textFamily: "--text-on-dark-*",
        tone: "dark",
        type: "CANVAS",
        accent: "--brand-lime",
      },
      {
        label: "Hero Base",
        name: "--surface-hero",
        role: "hero canvas / alias of page base",
        source: "alias -> --surface-page",
        textFamily: "--text-on-dark-*",
        tone: "dark",
        type: "CANVAS",
        accent: "--brand-lime",
      },
      {
        label: "Deep Section",
        name: "--surface-section-dark-deep",
        role: "subtle section separation / cinematic depth",
        source: "mix -> --brand-jet 94% + --brand-forest 6%",
        textFamily: "--text-on-dark-*",
        tone: "dark",
        type: "SECTION",
        accent: "--brand-lime",
      },
    ],
  },
  {
    label: "DARK STRUCTURAL SURFACES",
    items: [
      {
        label: "Dark Section",
        name: "--surface-section-dark",
        role: "primary dark content region",
        source: "mix -> --brand-jet 86% + --brand-forest 14%",
        textFamily: "--text-on-dark-*",
        tone: "dark",
        type: "REGION",
        accent: "--brand-lime",
      },
      {
        label: "Dark Card",
        name: "--surface-card-dark",
        role: "elevated content / grouped information",
        source: "mix -> --brand-jet 82% + --brand-forest 18%",
        textFamily: "--text-on-dark-*",
        tone: "dark",
        type: "COMPONENT",
        accent: "--brand-lime",
      },
      {
        label: "Dark Card Hover",
        name: "--surface-card-dark-hover",
        role: "interactive elevation / active card state",
        source: "mix -> --brand-jet 72% + --brand-forest 28%",
        textFamily: "--text-on-dark-*",
        tone: "dark",
        type: "INTERACTION",
        accent: "--brand-lime",
      },
    ],
  },
  {
    label: "LIGHT CONTENT SURFACES",
    items: [
      {
        label: "Light Section",
        name: "--surface-section-light",
        role: "editorial region / readable content break",
        source: "alias -> --brand-ivory",
        textFamily: "--text-on-light-*",
        tone: "light",
        type: "REGION",
        accent: "--brand-lime",
      },
      {
        label: "Editorial Paper",
        name: "--surface-paper",
        role: "long-form content / article surface",
        source: "mix -> --brand-ivory 90% + white 10%",
        textFamily: "--text-on-light-*",
        tone: "light",
        type: "EDITORIAL",
        accent: "--brand-lime",
      },
      {
        label: "Light Card",
        name: "--surface-card-light",
        role: "contained content / light component surface",
        source: "mix -> --brand-ivory 84% + white 16%",
        textFamily: "--text-on-light-*",
        tone: "light",
        type: "COMPONENT",
        accent: "--brand-lime",
      },
    ],
  },
];

const interactionSurfaceTokens: StructuralSurface[] = [
  {
    label: "Dark Card Hover",
    name: "--surface-card-dark-hover",
    role: "interactive elevation / active card state",
    source: "mix -> --brand-jet 72% + --brand-forest 28%",
    textFamily: "--text-on-dark-*",
    tone: "dark",
    type: "INTERACTION",
    accent: "--brand-lime",
  },
  {
    label: "Light Card Hover",
    name: "--surface-card-light-hover",
    role: "light interactive elevation / active card state",
    source: "mix -> --brand-ivory 74% + white 26%",
    textFamily: "--text-on-light-*",
    tone: "light",
    type: "INTERACTION",
    accent: "--brand-lime",
  },
];

const actionSurfaceTokens: ActionSurface[] = [
  {
    label: "PRIMARY ACTION",
    name: "--surface-action",
    meaning: "primary CTA block / decisive conversion moment",
    foreground: "--text-on-accent-primary",
    border: "--border-accent-emphasis",
    tone: "light",
    derivation: "alias -> --brand-lime",
    textTokens: [
      "--text-on-accent-primary",
      "--text-on-accent-secondary",
      "--text-on-accent-muted",
    ],
  },
  {
    label: "SOFT ACTION",
    name: "--surface-action-soft",
    meaning: "supporting CTA / guided entry / contextual callout",
    foreground: "--text-on-accent-primary",
    border: "--border-accent-subtle",
    tone: "light",
    derivation: "mix -> --brand-lime 40% + --brand-ivory 60%",
    textTokens: [
      "--text-on-accent-primary",
      "--text-on-accent-secondary",
      "--text-on-accent-muted",
    ],
  },
  {
    label: "DARK ACTION",
    name: "--surface-action-dark",
    meaning: "trust-led CTA / consultation block / high-value decision",
    foreground: "--text-on-dark-primary",
    border: "--border-accent-emphasis",
    tone: "dark",
    derivation: "alias -> --brand-forest",
    textTokens: [
      "--text-on-dark-primary",
      "--text-on-dark-secondary",
      "--text-on-dark-muted",
    ],
  },
];

const sampleSurfaceText = "Nejdřív přehled. Potom jasný plán.";

const darkSurfaceCoverage = [
  "--surface-page",
  "--surface-hero",
  "--surface-section-dark-deep",
  "--surface-section-dark",
  "--surface-card-dark",
  "--surface-card-dark-hover",
  "--surface-action-dark",
];

const lightSurfaceCoverage = [
  "--surface-section-light",
  "--surface-paper",
  "--surface-card-light",
  "--surface-card-light-hover",
];

const actionSurfaceCoverage = ["--surface-action", "--surface-action-soft"];

const textSurfaceRows: TextSurfaceRow[] = [
  {
    label: "DARK SURFACE",
    surface: "--surface-card-dark",
    tone: "dark",
    surfaceTone: "dark",
    coverage: darkSurfaceCoverage,
    previews: [
      {
        label: "PRIMARY ON DARK",
        name: "--text-on-dark-primary",
        role: "primary",
      },
      {
        label: "SECONDARY ON DARK",
        name: "--text-on-dark-secondary",
        role: "secondary",
      },
      {
        label: "MUTED ON DARK",
        name: "--text-on-dark-muted",
        role: "muted",
      },
    ],
  },
  {
    label: "LIGHT SURFACE",
    surface: "--surface-section-light",
    tone: "light",
    surfaceTone: "light",
    coverage: lightSurfaceCoverage,
    previews: [
      {
        label: "PRIMARY ON LIGHT",
        name: "--text-on-light-primary",
        role: "primary",
      },
      {
        label: "SECONDARY ON LIGHT",
        name: "--text-on-light-secondary",
        role: "secondary",
      },
      {
        label: "MUTED ON LIGHT",
        name: "--text-on-light-muted",
        role: "muted",
      },
    ],
  },
  {
    label: "ACTION SURFACE",
    surface: "--surface-action",
    tone: "accent",
    surfaceTone: "action",
    coverage: actionSurfaceCoverage,
    previews: [
      {
        label: "PRIMARY ON ACTION",
        name: "--text-on-accent-primary",
        role: "primary",
      },
      {
        label: "SECONDARY ON ACTION",
        name: "--text-on-accent-secondary",
        role: "secondary",
      },
      {
        label: "MUTED ON ACTION",
        name: "--text-on-accent-muted",
        role: "muted",
      },
    ],
  },
];

const textEmphasisPreviews: TextEmphasisPreview[] = [
  {
    label: "EMPHASIS ON DARK",
    token: "--text-emphasis-on-dark",
    alias: "--brand-lime",
    surface: "--surface-card-dark",
    tone: "dark",
    surfaceTone: "dark",
    primaryToken: "--text-on-dark-primary",
    role: "highlighted phrase / decisive meaning / active message",
    emphasisLine: "Nejdřív přehled.",
    primaryLine: "Potom jasný plán.",
  },
  {
    label: "EMPHASIS ON LIGHT",
    token: "--text-emphasis-on-light",
    alias: "--brand-forest",
    surface: "--surface-section-light",
    tone: "light",
    surfaceTone: "light",
    primaryToken: "--text-on-light-primary",
    role: "editorial emphasis / important concept / contextual highlight",
    emphasisLine: "Celý obraz.",
    primaryLine: "Lepší rozhodnutí.",
  },
  {
    label: "EMPHASIS ON ACTION",
    token: "--text-emphasis-on-action",
    alias: "--brand-jet",
    surface: "--surface-action",
    tone: "accent",
    surfaceTone: "action",
    primaryToken: "--text-on-accent-primary",
    role: "strong contrast / decisive message / action hierarchy",
    emphasisLine: "Jeden jasný krok.",
    primaryLine: "Začněte přehledem.",
  },
];

const typographySurfaceOptions: TypographySurfaceOption[] = [
  {
    label: "Dark",
    tone: "dark",
    surface: "--surface-card-dark",
    border: "--border-on-dark-subtle",
  },
  {
    label: "Light",
    tone: "light",
    surface: "--surface-section-light",
    border: "--border-on-light-subtle",
  },
  {
    label: "Action",
    tone: "action",
    surface: "--surface-action",
    border: "--border-accent-subtle",
  },
];

const typographyRolePreviews: TypographyRolePreview[] = [
  {
    label: "DISPLAY",
    sample: "Nejdřív přehled. Potom jasný plán.",
    className: "typeDisplay",
    tokenFamily: "--type-display-*",
    colorAlias: "--text-primary + --text-emphasis",
    usage: "hero headings / campaign statements / cinematic messages",
  },
  {
    label: "HEADING",
    sample: "Finance, které odpovídají vašemu životu.",
    className: "typeHeading",
    tokenFamily: "--type-heading-*",
    colorAlias: "--text-primary",
    usage: "section titles / component group titles / editorial headings",
  },
  {
    label: "LEAD",
    sample:
      "Získáte přehled o tom, co ve financích drží pohromadě.",
    className: "typeLead",
    tokenFamily: "--type-lead-*",
    colorAlias: "--text-secondary",
    usage: "hero descriptions / section introductions / important support copy",
  },
  {
    label: "BODY",
    sample:
      "Nejdřív se podíváme na celou situaci. Teprve potom vybíráme konkrétní řešení.",
    className: "typeBody",
    tokenFamily: "--type-body-*",
    colorAlias: "--text-secondary",
    usage: "paragraphs / descriptions / long-form copy",
  },
  {
    label: "EYEBROW",
    sample: "FINANČNÍ PLÁN, KTERÝ DÁVÁ SMYSL",
    className: "typeEyebrow",
    tokenFamily: "--type-eyebrow-*",
    colorAlias: "--text-emphasis",
    usage: "section context / category / semantic introduction",
  },
  {
    label: "LABEL",
    sample: "Primární doporučení",
    className: "typeLabel",
    tokenFamily: "--type-label-*",
    colorAlias: "--text-primary",
    usage: "form labels / card categories / control labels",
  },
  {
    label: "CAPTION",
    sample: "Ilustrační model finančního plánu.",
    className: "typeCaption",
    tokenFamily: "--type-caption-*",
    colorAlias: "--text-muted",
    usage: "image captions / small supporting explanations / notes",
  },
  {
    label: "METADATA",
    sample: "Aktualizováno před 3 minutami",
    className: "typeMetadata",
    tokenFamily: "--type-metadata-*",
    colorAlias: "--text-muted",
    usage: "timestamps / status details / technical information",
  },
  {
    label: "INLINE LINK",
    sample: "Zjistit více",
    className: "typeInlineLink",
    tokenFamily: "--type-link-*",
    colorAlias: "--text-emphasis",
    usage: "text links / contextual actions / editorial links",
  },
];

const typographyTokenNames = [
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--text-emphasis",
  "--text-emphasis-on-dark",
  "--text-emphasis-on-light",
  "--text-emphasis-on-action",
  "--type-display-size",
  "--type-display-line-height",
  "--type-display-weight",
  "--type-display-tracking",
  "--type-heading-size",
  "--type-heading-line-height",
  "--type-heading-weight",
  "--type-heading-tracking",
  "--type-lead-size",
  "--type-lead-line-height",
  "--type-lead-weight",
  "--type-body-size",
  "--type-body-line-height",
  "--type-body-weight",
  "--type-eyebrow-size",
  "--type-eyebrow-line-height",
  "--type-eyebrow-weight",
  "--type-eyebrow-tracking",
  "--type-eyebrow-transform",
  "--type-label-size",
  "--type-label-line-height",
  "--type-label-weight",
  "--type-label-tracking",
  "--type-caption-size",
  "--type-caption-line-height",
  "--type-caption-weight",
  "--type-metadata-size",
  "--type-metadata-line-height",
  "--type-metadata-weight",
  "--type-link-weight",
];

const actionColumns: ActionColumn[] = [
  {
    label: "DECISION ACTIONS",
    items: [
      {
        name: "--cta-primary-bg",
        label: "Primary action",
        role: "main conversion action",
        kind: "primary",
        source: "alias -> --accent-primary",
        states: [
          {
            label: "Default",
            token: "--accent-primary",
            value: "--accent-primary",
            tone: "accent",
          },
          {
            label: "Hover",
            token: "--accent-primary-hover",
            value: "--accent-primary-hover",
            tone: "accent",
          },
          {
            label: "Pressed",
            token: "--accent-primary-active",
            value: "--accent-primary-active",
            tone: "accent",
          },
          {
            label: "Focus",
            token: "--focus-ring",
            value: "--focus-ring",
            tone: "dark",
            focus: true,
          },
          {
            label: "Disabled",
            value: "neutral + reduced",
            tone: "muted",
          },
        ],
      },
      {
        name: "--cta-secondary-bg",
        label: "Secondary action",
        role: "quiet supporting action",
        kind: "secondary",
        source: "quiet surface with lime hover signal",
        states: [
          {
            label: "Default",
            token: "--cta-secondary-bg",
            value: "--cta-secondary-bg",
            tone: "dark",
          },
          {
            label: "Hover",
            token: "--cta-secondary-bg-hover",
            value: "--cta-secondary-bg-hover",
            tone: "dark",
          },
          {
            label: "Focus",
            token: "--focus-ring",
            value: "--focus-ring",
            tone: "dark",
            focus: true,
          },
          {
            label: "Disabled",
            value: "neutral + reduced",
            tone: "muted",
          },
        ],
      },
    ],
  },
  {
    label: "STATE SIGNALS",
    items: [
      {
        name: "--accent-primary",
        label: "Current nav item",
        role: "current location / selected navigation state",
        kind: "nav",
        source: "alias -> --brand-lime",
      },
      {
        name: "--accent-primary-muted",
        label: "Status badge",
        role: "low-pressure status signal",
        kind: "badge",
        source: "opacity -> --brand-lime 18%",
      },
    ],
  },
  {
    label: "INTERACTION FEEDBACK",
    items: [
      {
        name: "--focus-ring",
        label: "Keyboard focus",
        role: "visible keyboard navigation state",
        kind: "focus",
        source: "opacity -> --brand-lime 42%",
      },
      {
        name: "--border-accent-emphasis",
        label: "Emphasis border",
        role: "selected or highlighted boundary",
        kind: "border",
        source: "opacity -> --brand-lime 32%",
      },
    ],
  },
];

const actionReferenceGroups: ActionReferenceGroup[] = [
  {
    label: "Accent core",
    items: [
      { name: "--accent-primary", source: "alias -> --brand-lime" },
      {
        name: "--accent-primary-hover",
        source: "mix -> --brand-lime 86% + white 14%",
      },
      {
        name: "--accent-primary-active",
        source: "mix -> --brand-lime 76% + --brand-forest 24%",
      },
      {
        name: "--accent-primary-muted",
        source: "opacity -> --brand-lime 18%",
      },
    ],
  },
  {
    label: "Action components",
    items: [
      { name: "--cta-primary-bg", source: "alias -> --accent-primary" },
      {
        name: "--cta-primary-text",
        source: "alias -> --text-on-accent-primary",
      },
      { name: "--cta-secondary-bg", source: "opacity -> --brand-ivory 4%" },
      {
        name: "--cta-secondary-text",
        source: "alias -> --text-on-dark-primary",
      },
    ],
  },
  {
    label: "Feedback",
    items: [
      { name: "--focus-ring", source: "context alias -> tone focus ring" },
      {
        name: "--border-accent-emphasis",
        source: "opacity -> --brand-lime 32%",
      },
    ],
  },
];

const borderGroups: BorderGroup[] = [
  {
    label: "BORDERS ON DARK",
    items: [
      {
        label: "Dark Subtle",
        name: "--border-on-dark-subtle",
        role: "section boundaries / passive card edges",
        surface: "--surface-card-dark",
        foreground: "--text-on-dark-primary",
        tokenColor: "--brand-ivory",
        tone: "dark",
        sourceColor: "--brand-ivory",
        contextAlias: "--border-subtle",
      },
      {
        label: "Dark Medium",
        name: "--border-on-dark-medium",
        role: "nested regions / stronger component separation",
        surface: "--surface-card-dark",
        foreground: "--text-on-dark-primary",
        tokenColor: "--brand-ivory",
        tone: "dark",
        sourceColor: "--brand-ivory",
        contextAlias: "--border-medium",
      },
    ],
  },
  {
    label: "ACCENT BORDERS ON DARK",
    items: [
      {
        label: "Accent Subtle on Dark",
        name: "--border-accent-on-dark-subtle",
        role: "quiet emphasis / selected context",
        surface: "--surface-card-dark",
        foreground: "--text-on-dark-primary",
        tokenColor: "--brand-lime",
        tone: "dark",
        sourceColor: "--brand-lime",
        contextAlias: "--border-emphasis-subtle",
      },
      {
        label: "Accent Emphasis on Dark",
        name: "--border-on-dark-emphasis",
        role: "selected state / meaningful highlighted boundary",
        surface: "--surface-card-dark",
        foreground: "--text-on-dark-primary",
        tokenColor: "--brand-lime",
        tone: "dark",
        sourceColor: "--brand-lime",
        contextAlias: "--border-emphasis",
      },
    ],
  },
  {
    label: "BORDERS ON LIGHT",
    items: [
      {
        label: "Light Subtle",
        name: "--border-on-light-subtle",
        role: "editorial separation / passive light card edge",
        surface: "--surface-card-light",
        foreground: "--text-on-light-primary",
        tokenColor: "--brand-jet",
        tone: "light",
        sourceColor: "--brand-jet",
        contextAlias: "--border-subtle",
      },
      {
        label: "Light Medium",
        name: "--border-on-light-medium",
        role: "nested light regions / stronger component edge",
        surface: "--surface-card-light",
        foreground: "--text-on-light-primary",
        tokenColor: "--brand-jet",
        tone: "light",
        sourceColor: "--brand-jet",
        contextAlias: "--border-medium",
      },
    ],
  },
  {
    label: "ACCENT BORDERS ON LIGHT",
    items: [
      {
        label: "Accent Subtle on Light",
        name: "--border-accent-on-light-subtle",
        role: "quiet semantic emphasis / selected light context",
        surface: "--surface-card-light",
        foreground: "--text-on-light-primary",
        tokenColor: "--brand-forest",
        tone: "light",
        sourceColor: "--brand-forest",
        contextAlias: "--border-emphasis-subtle",
      },
      {
        label: "Accent Emphasis on Light",
        name: "--border-accent-on-light-emphasis",
        role: "selected state / highlighted boundary on light",
        surface: "--surface-card-light",
        foreground: "--text-on-light-primary",
        tokenColor: "--brand-forest",
        tone: "light",
        sourceColor: "--brand-forest",
        contextAlias: "--border-emphasis",
      },
    ],
  },
];

const borderIntensityGroups: BorderIntensityGroup[] = [
  {
    label: "STRUCTURAL",
    items: [
      { label: "Dark", value: "8% -> 14%" },
      { label: "Light", value: "10% -> 16%" },
    ],
  },
  {
    label: "SEMANTIC EMPHASIS",
    items: [
      { label: "Dark / Lime", value: "18% -> 32%" },
      { label: "Light / Forest", value: "18% -> 32%" },
    ],
  },
  {
    label: "INTERACTION VISIBILITY",
    items: [{ label: "Focus ring", value: "42%" }],
  },
];

const borderActionSurfaceTests: BorderActionSurfaceTest[] = [
  {
    label: "Primary Action",
    surface: "--surface-action",
    tone: "action",
    note: "lime action surface / light border context",
  },
  {
    label: "Soft Action",
    surface: "--surface-action-soft",
    tone: "action",
    note: "soft lime action surface / light border context",
  },
  {
    label: "Dark Action",
    surface: "--surface-action-dark",
    tone: "dark",
    note: "forest action surface / dark border context",
  },
];

const primitiveItems = [
  "Button",
  "Card",
  "Badge",
  "Chip",
  "Input",
  "Section",
  "Panel",
  "Hero frame",
  "Navigation pill",
];

function readCssVar(name: string): string {
  if (typeof window === "undefined") return "";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return normalizeCssVarValue(value);
}

function normalizeCssVarValue(value: string): string {
  const hexAlphaMatch = value.match(/^#([0-9a-f]{8})$/i);

  if (!hexAlphaMatch) return value;

  const hex = hexAlphaMatch[1];
  const alpha = Number.parseInt(hex.slice(6, 8), 16);
  const alphaPercent = Math.round((alpha / 255) * 100);

  return `rgb(${Number.parseInt(hex.slice(0, 2), 16)} ${Number.parseInt(
    hex.slice(2, 4),
    16
  )} ${Number.parseInt(hex.slice(4, 6), 16)} / ${alphaPercent}%)`;
}

function colorToHex(color: string): string {
  const rgbMatch = color.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i
  );

  if (rgbMatch) {
    const [, r, g, b, alpha] = rgbMatch;
    if (alpha && Number(alpha) < 1) {
      return `rgba(${r}, ${g}, ${b}, ${Number(alpha)
        .toFixed(2)
        .replace(/0$/, "")
        .replace(/\.0$/, "")})`;
    }

    return `#${[r, g, b]
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
  }

  const srgbMatch = color.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i
  );

  if (srgbMatch) {
    const [, r, g, b] = srgbMatch;
    return `#${[r, g, b]
      .map((channel) =>
        Math.round(Number(channel) * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")}`.toUpperCase();
  }

  return color;
}

type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function parseColor(color: string): ParsedColor | null {
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);

  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgbMatch = color.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i
  );

  if (!rgbMatch) return null;

  const [, r, g, b, alpha] = rgbMatch;
  return {
    r: Number(r),
    g: Number(g),
    b: Number(b),
    a: alpha ? Number(alpha) : 1,
  };
}

function compositeColor(foreground: ParsedColor, background: ParsedColor) {
  if (foreground.a >= 1) return foreground;

  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: ParsedColor): number {
  return (
    channelLuminance(color.r) * 0.2126 +
    channelLuminance(color.g) * 0.7152 +
    channelLuminance(color.b) * 0.0722
  );
}

function contrastRatio(foregroundValue: string, backgroundValue: string) {
  const foreground = parseColor(foregroundValue);
  const background = parseColor(backgroundValue);

  if (!foreground || !background) return null;

  const solidForeground = compositeColor(foreground, background);
  const foregroundLuminance = relativeLuminance(solidForeground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function contrastGrade(ratio: number | null): string {
  if (ratio === null) return "pending";
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Review";
}

function readCssVarAsColor(name: string): string {
  if (typeof window === "undefined") return "";

  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.pointerEvents = "none";
  probe.style.visibility = "hidden";
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);

  const value = getComputedStyle(probe).color.trim();
  probe.remove();

  return value ? colorToHex(value) : "";
}

function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

function cssVarRef(name: string, fallback: string): string {
  return `var(${name}, ${fallback})`;
}

function tokenValue(values: TokenState, name: string): string {
  return values[name] || "not defined";
}

function TokenValue({ name, values }: { name: string; values: TokenState }) {
  const value = tokenValue(values, name);
  const isMissing = value === "not defined";

  return (
    <span className={isMissing ? s.tokenMissing : s.tokenValue}>
      {value}
    </span>
  );
}

function TokenResolvedValue({
  name,
  values,
}: {
  name: string;
  values: TokenState;
}) {
  const value = tokenValue(values, name);
  const isMissing = value === "not defined";

  return (
    <span className={isMissing ? s.tokenMissing : s.tokenValue}>
      {value}
    </span>
  );
}

export default function DesignLanguageDashboard() {
  const allTokenNames = useMemo(() => {
    const names = new Set<string>();

    foundationColors.forEach((item) => names.add(item.token));
    structuralSurfaceGroups.forEach((group) => {
      group.items.forEach((item) => {
        names.add(item.name);
        names.add(item.accent);
      });
    });
    interactionSurfaceTokens.forEach((item) => {
      names.add(item.name);
      names.add(item.accent);
    });
    actionSurfaceTokens.forEach((item) => {
      names.add(item.name);
      names.add(item.foreground);
      names.add(item.border);
      item.textTokens.forEach((token) => names.add(token));
    });
    textSurfaceRows.forEach((row) => {
      names.add(row.surface);
      row.coverage.forEach((token) => names.add(token));
      row.previews.forEach((item) => names.add(item.name));
    });
    textEmphasisPreviews.forEach((item) => {
      names.add(item.token);
      names.add(item.alias);
      names.add(item.surface);
      names.add(item.primaryToken);
    });
    typographySurfaceOptions.forEach((item) => {
      names.add(item.surface);
      names.add(item.border);
    });
    typographyTokenNames.forEach((name) => names.add(name));
    actionColumns.forEach((column) => {
      column.items.forEach((item) => {
        names.add(item.name);
        item.states?.forEach((state) => {
          if (state.token) names.add(state.token);
        });
      });
    });
    actionReferenceGroups.forEach((group) => {
      group.items.forEach((item) => names.add(item.name));
    });
    borderGroups.forEach((group) => {
      group.items.forEach((item) => {
        names.add(item.name);
        names.add(item.surface);
        names.add(item.foreground);
        names.add(item.tokenColor);
        names.add(item.sourceColor);
        names.add(item.contextAlias);
      });
    });
    borderActionSurfaceTests.forEach((item) => {
      names.add(item.surface);
    });
    [
      "--border-accent-on-dark-subtle",
      "--border-on-dark-emphasis",
      "--border-accent-on-light-subtle",
      "--border-accent-on-light-emphasis",
      "--border-accent-subtle",
      "--border-accent-emphasis",
      "--border-subtle",
      "--border-medium",
      "--border-emphasis-subtle",
      "--border-emphasis",
      "--focus-ring",
    ].forEach((name) => names.add(name));

    return Array.from(names);
  }, []);

  const [values, setValues] = useState<TokenState>({});
  const [resolvedValues, setResolvedValues] = useState<TokenState>({});
  const [typographyTone, setTypographyTone] = useState<SurfaceContext>("dark");

  const activeTypographySurface =
    typographySurfaceOptions.find((item) => item.tone === typographyTone) ??
    typographySurfaceOptions[0];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextValues = Object.fromEntries(
        allTokenNames.map((name) => [name, readCssVar(name) || "not defined"])
      );
      const nextResolvedValues = Object.fromEntries(
        allTokenNames.map((name) => [
          name,
          readCssVarAsColor(name) || "not defined",
        ])
      );

      setValues(nextValues);
      setResolvedValues(nextResolvedValues);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [allTokenNames]);

  const hasReadTokens = Object.keys(values).length > 0;
  const missingTokens = hasReadTokens
    ? allTokenNames.filter((name) => tokenValue(values, name) === "not defined")
    : [];

  const renderStructuralSurfaceCard = (surface: StructuralSurface) => {
    const textToken =
      surface.tone === "light"
        ? "--text-on-light-primary"
        : "--text-on-dark-primary";
    const borderToken =
      surface.tone === "light"
        ? "var(--border-on-light-subtle)"
        : "var(--border-on-dark-subtle)";

    return (
      <article
        key={surface.name}
        className={`${s.surfaceCard} ${s.structuralSurfaceCard} ${
          surface.tone === "light" ? s.structuralSurfaceLight : ""
        }`}
        style={cssVars({
          "--preview-bg": cssVarRef(
            surface.name,
            "var(--surface-card-dark)"
          ),
          "--preview-fg": cssVarRef(
            textToken,
            "var(--text-on-dark-primary)"
          ),
          "--preview-border": borderToken,
        })}
      >
        <div>
          <div className={s.surfaceTopline}>
            <span>{surface.label}</span>
            <i aria-hidden="true" />
          </div>
          <span className={s.surfaceType}>TYPE: {surface.type}</span>
          <h3>{surface.name}</h3>
          <span className={s.surfaceMeaning}>{surface.role}</span>
          <p>{sampleSurfaceText}</p>
        </div>
        <dl className={s.surfaceSpec}>
          <div>
            <dt>Source</dt>
            <dd>{surface.source}</dd>
          </div>
          <div>
            <dt>Resolved</dt>
            <dd>
              <TokenResolvedValue
                name={surface.name}
                values={resolvedValues}
              />
            </dd>
          </div>
          <div>
            <dt>Text family</dt>
            <dd>{surface.textFamily}</dd>
          </div>
          <div>
            <dt>Accent</dt>
            <dd>{surface.accent}</dd>
          </div>
        </dl>
      </article>
    );
  };

  return (
    <main id="main-content" className={s.page} data-surface-tone="dark">
      <div className={s.shell}>
        <aside className={s.sidebar} aria-label="Design language navigation">
          <div className={s.sidebarHeader}>
            <span className={s.systemMark}>PD</span>
            <div>
              <p>Design Language</p>
              <span>PokornyDavid.cz</span>
            </div>
          </div>
          <nav className={s.navList}>
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className={s.sidebarStatus}>
            <span>Status</span>
            <strong>Internal lab</strong>
          </div>
        </aside>

        <div className={s.content}>
          <header className={s.header}>
            <div>
              <p className={s.kicker}>Visual system dashboard</p>
              <h1>Design Language / PokornyDavid.cz</h1>
              <p>
                Design language dashboard for the PokornyDavid.cz visual
                system.
              </p>
            </div>
            <div className={s.headerMeta} aria-label="Dashboard scope">
              <span>No gradients</span>
              <span>Token first</span>
              <span>Internal route</span>
            </div>
          </header>

          <section id="overview" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>Overview</p>
              <h2>Foundation Audit Surface</h2>
              <p>
                The route keeps the public website untouched while exposing the
                color, surface, border, and action primitives in one controlled
                workspace.
              </p>
            </div>
            <div className={s.summaryGrid}>
              {summaryCards.map((card) => {
                const content = (
                  <>
                    <span>{card.label}</span>
                    {card.description ? <p>{card.description}</p> : null}
                    <strong>{card.status}</strong>
                  </>
                );

                return card.href ? (
                  <Link
                    key={card.label}
                    className={`${s.summaryCard} ${s.summaryCardLink}`}
                    href={card.href}
                  >
                    {content}
                  </Link>
                ) : (
                  <article key={card.label} className={s.summaryCard}>
                    {content}
                  </article>
                );
              })}
            </div>
            <div className={s.grammarPanel}>
              <span>Color grammar</span>
              <p>
                Jet Black defines space. Forest Green creates depth. Soft Ivory
                opens a readable editorial layer. Lime Green signals action.
              </p>
            </div>
          </section>

          <section id="foundation" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>Foundation palette</p>
              <h2>Four Base Colors</h2>
              <p>
                The palette starts with one action color, one trust color, one
                readable surface, and one cinematic base.
              </p>
            </div>
            <div className={s.foundationGrid}>
              {foundationColors.map((color) => (
                <article key={color.token} className={s.foundationCard}>
                  <div
                    className={s.swatch}
                    style={cssVars({
                      "--swatch-bg": cssVarRef(color.token, "transparent"),
                    })}
                    aria-hidden="true"
                  />
                  <div className={s.cardBody}>
                    <h3>{color.name}</h3>
                    <dl>
                      <div>
                        <dt>Hex</dt>
                        <dd>{color.hex}</dd>
                      </div>
                      <div>
                        <dt>Token</dt>
                        <dd>{color.token}</dd>
                      </div>
                      <div>
                        <dt>Current</dt>
                        <dd>
                          <TokenValue name={color.token} values={values} />
                        </dd>
                      </div>
                    </dl>
                    <p>{color.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="surfaces" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>Surfaces</p>
              <h2>Structural Surface Hierarchy</h2>
              <p>
                Page, section, and component surfaces arranged by depth,
                content role, and interaction state.
              </p>
            </div>
            <div className={s.surfaceMatrix}>
              {structuralSurfaceGroups.map((group) => (
                <div key={group.label} className={s.surfaceGroup}>
                  <div className={s.surfaceGroupHeader}>
                    <span>{group.label}</span>
                  </div>
                  <div className={s.surfaceGrid}>
                    {group.items.map((surface) =>
                      renderStructuralSurfaceCard(surface)
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={s.surfaceSubsection}>
              <div className={s.sectionHeader}>
                <p className={s.sectionEyebrow}>INTERACTION STATES</p>
                <h2>Card Hover Surfaces</h2>
                <p>
                  Dark and light component hover surfaces define interactive
                  elevation without changing the structural hierarchy.
                </p>
              </div>
              <div className={`${s.surfaceGrid} ${s.surfaceInteractionGrid}`}>
                {interactionSurfaceTokens.map((surface) =>
                  renderStructuralSurfaceCard(surface)
                )}
              </div>
            </div>
            <div className={s.surfaceSubsection}>
              <div className={s.sectionHeader}>
                <p className={s.sectionEyebrow}>ACTION SURFACES</p>
                <h2>Action &amp; Emphasis Surfaces</h2>
                <p>
                  Primary, supporting, and deep action surfaces for CTA blocks,
                  callouts, and conversion moments.
                </p>
              </div>
              <div className={s.surfaceGrid}>
                {actionSurfaceTokens.map((surface) => (
                  <article
                    key={surface.name}
                    className={`${s.surfaceCard} ${s.actionSurfaceCard} ${
                      surface.tone === "dark" ? s.actionSurfaceDark : ""
                    }`}
                    style={cssVars({
                      "--preview-bg": cssVarRef(
                        surface.name,
                        "var(--surface-card-dark)"
                      ),
                      "--preview-fg": cssVarRef(
                        surface.foreground,
                        surface.tone === "dark"
                          ? "var(--text-on-dark-primary)"
                          : "var(--text-on-accent)"
                      ),
                      "--preview-border": cssVarRef(
                        surface.border,
                        "var(--border-accent-subtle)"
                      ),
                    })}
                  >
                    <div className={s.surfaceTopline}>
                      <span>{surface.label}</span>
                      <i aria-hidden="true" />
                    </div>
                    <h3>{surface.name}</h3>
                    <p>{sampleSurfaceText}</p>
                    <span className={s.surfaceMeaning}>{surface.meaning}</span>
                    <code className={s.surfaceDerivation}>
                      {surface.derivation}
                      <br />
                      resolved:{" "}
                      <TokenResolvedValue
                        name={surface.name}
                        values={resolvedValues}
                      />
                    </code>
                    <div className={s.surfaceTextBranch}>
                      <span>Text:</span>
                      {surface.textTokens.map((token) => (
                        <code key={token}>{token}</code>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="typography" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>TEXT ON SURFACES</p>
              <h2>Text Hierarchy by Surface</h2>
              <p>
                Primary, secondary, and muted text roles validated across dark,
                light, and action surfaces.
              </p>
            </div>
            <div className={s.textMatrix}>
              {textSurfaceRows.map((row) => (
                <div key={row.label} className={s.textSurfaceRow}>
                  <div className={s.textRowHeader}>
                    <div>
                      <span>{row.label}</span>
                      <code>Preview surface: {row.surface}</code>
                    </div>
                    <div className={s.surfaceCoverage}>
                      <span>Used on</span>
                      <div>
                        {row.coverage.map((token) => (
                          <code key={token}>{token}</code>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={s.textRoleGrid}>
                    {row.previews.map((item) => {
                      const contrast = contrastRatio(
                        tokenValue(resolvedValues, item.name),
                        tokenValue(resolvedValues, row.surface)
                      );

                      return (
                        <article
                          key={item.name}
                          data-surface-tone={row.surfaceTone}
                          className={`${s.textCard} ${s[row.tone]} ${
                            s[`${item.role}Text`]
                          }`}
                          style={cssVars({
                            "--preview-bg": cssVarRef(
                              row.surface,
                              "var(--surface-card-dark)"
                            ),
                            "--preview-fg": cssVarRef(
                              item.name,
                              "var(--text-on-dark-primary)"
                            ),
                            "--preview-border":
                              row.tone === "dark"
                                ? "var(--border-on-dark-subtle)"
                                : "var(--border-on-light-subtle)",
                          })}
                        >
                          <div>
                            <div className={s.tokenLine}>
                              <span>{item.label}</span>
                              <TokenResolvedValue
                                name={item.name}
                                values={resolvedValues}
                              />
                            </div>
                            <code className={s.textToken}>{item.name}</code>
                          </div>
                          <div className={s.textSample}>
                            {item.role === "primary" ? (
                              <h3>
                                Nejdřív přehled.
                                <br />
                                Potom jasný plán.
                              </h3>
                            ) : null}
                            {item.role === "secondary" ? (
                              <p>
                                Získáte přehled o tom, co ve financích drží
                                pohromadě.
                              </p>
                            ) : null}
                            {item.role === "muted" ? (
                              <small>Aktualizováno před 3 minutami</small>
                            ) : null}
                          </div>
                          <dl className={s.textMeta}>
                            <div>
                              <dt>Role</dt>
                              <dd>{item.role}</dd>
                            </div>
                            <div>
                              <dt>Source</dt>
                              <dd>{item.name}</dd>
                            </div>
                            <div>
                              <dt>Resolved</dt>
                              <dd>
                                <TokenResolvedValue
                                  name={item.name}
                                  values={resolvedValues}
                                />
                              </dd>
                            </div>
                            <div>
                              <dt>Surface</dt>
                              <dd>{row.surface}</dd>
                            </div>
                            <div>
                              <dt>Contrast</dt>
                              <dd>
                                {contrast === null
                                  ? "pending"
                                  : `${contrast.toFixed(1)}:1`}
                              </dd>
                            </div>
                            <div>
                              <dt>WCAG</dt>
                              <dd>{contrastGrade(contrast)}</dd>
                            </div>
                            <div>
                              <dt>CSS</dt>
                              <dd>
                                <TokenValue name={item.name} values={values} />
                              </dd>
                            </div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className={s.surfaceSubsection}>
              <div className={s.sectionHeader}>
                <p className={s.sectionEyebrow}>TEXT EMPHASIS</p>
                <h2>Emphasis Text by Surface</h2>
                <p>
                  Semantic text accents used to highlight meaning without
                  replacing the primary, secondary, and muted readability
                  hierarchy.
                </p>
              </div>
              <div className={s.emphasisGrid}>
                {textEmphasisPreviews.map((item) => {
                  const contrast = contrastRatio(
                    tokenValue(resolvedValues, item.token),
                    tokenValue(resolvedValues, item.surface)
                  );

                  return (
                    <article
                      key={item.token}
                      data-surface-tone={item.surfaceTone}
                      className={`${s.textCard} ${s.emphasisCard} ${
                        s[item.tone]
                      }`}
                      style={cssVars({
                        "--preview-bg": cssVarRef(
                          item.surface,
                          "var(--surface-card-dark)"
                        ),
                        "--preview-fg": cssVarRef(
                          item.primaryToken,
                          "var(--text-primary)"
                        ),
                        "--preview-emphasis": cssVarRef(
                          item.token,
                          "var(--text-emphasis)"
                        ),
                        "--preview-border":
                          item.surfaceTone === "light" ||
                          item.surfaceTone === "action"
                            ? "var(--border-on-light-subtle)"
                            : "var(--border-on-dark-subtle)",
                      })}
                    >
                      <div>
                        <div className={s.tokenLine}>
                          <span>{item.label}</span>
                          <TokenResolvedValue
                            name={item.token}
                            values={resolvedValues}
                          />
                        </div>
                        <code className={s.textToken}>{item.token}</code>
                      </div>
                      <div className={s.emphasisSample}>
                        <p>
                          <span className={s.emphasis}>
                            {item.emphasisLine}
                          </span>
                          <span>{item.primaryLine}</span>
                        </p>
                      </div>
                      <dl className={s.textMeta}>
                        <div>
                          <dt>Token</dt>
                          <dd>{item.token}</dd>
                        </div>
                        <div>
                          <dt>Alias</dt>
                          <dd>{item.alias}</dd>
                        </div>
                        <div>
                          <dt>Resolved</dt>
                          <dd>
                            <TokenResolvedValue
                              name={item.token}
                              values={resolvedValues}
                            />
                          </dd>
                        </div>
                        <div>
                          <dt>Surface</dt>
                          <dd>{item.surface}</dd>
                        </div>
                        <div>
                          <dt>Contrast</dt>
                          <dd>
                            {contrast === null
                              ? "pending"
                              : `${contrast.toFixed(1)}:1`}
                          </dd>
                        </div>
                        <div>
                          <dt>WCAG</dt>
                          <dd>{contrastGrade(contrast)}</dd>
                        </div>
                        <div>
                          <dt>Role</dt>
                          <dd>{item.role}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
              <div className={s.actionContract}>
                <div>
                  <span>Use for</span>
                  <p>
                    key phrases · decisive statements · selected words in large
                    headings · meaningful contrast
                  </p>
                </div>
                <div>
                  <span>Do not use for</span>
                  <p>
                    entire paragraphs · passive body copy · decorative
                    repetition · every heading
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="type-roles" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>TYPOGRAPHY ROLES</p>
              <h2>Text Roles</h2>
              <p>
                Reusable typographic roles that define scale, rhythm, weight,
                tracking, and semantic purpose independently from surface color.
              </p>
            </div>
            <div className={s.surfaceSwitcher} aria-label="Surface tone">
              {typographySurfaceOptions.map((option) => (
                <button
                  key={option.tone}
                  type="button"
                  aria-pressed={typographyTone === option.tone}
                  onClick={() => setTypographyTone(option.tone)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div
              className={s.rolePreviewShell}
              data-surface-tone={activeTypographySurface.tone}
              style={cssVars({
                "--preview-bg": cssVarRef(
                  activeTypographySurface.surface,
                  "var(--surface-card-dark)"
                ),
                "--preview-border": cssVarRef(
                  activeTypographySurface.border,
                  "var(--border-on-dark-subtle)"
                ),
              })}
            >
              <div className={s.rolePreviewHeader}>
                <span>Surface context</span>
                <code>
                  {`data-surface-tone="${activeTypographySurface.tone}" · ${activeTypographySurface.surface}`}
                </code>
              </div>
              <div className={s.roleGrid}>
                {typographyRolePreviews.map((role) => (
                  <article key={role.label} className={s.roleCard}>
                    <span className={s.roleLabel}>{role.label}</span>
                    {role.label === "DISPLAY" ? (
                      <p className={s.typeDisplay}>
                        <span className={s.emphasis}>Nejdřív přehled.</span>
                        <span>Potom jasný plán.</span>
                      </p>
                    ) : role.label === "INLINE LINK" ? (
                      <a href="#text-compositions" className={s.typeInlineLink}>
                        {role.sample}
                      </a>
                    ) : (
                      <p className={s[role.className]}>{role.sample}</p>
                    )}
                    <dl className={s.roleMeta}>
                      <div>
                        <dt>Typography</dt>
                        <dd>{role.tokenFamily}</dd>
                      </div>
                      <div>
                        <dt>Color</dt>
                        <dd>{role.colorAlias}</dd>
                      </div>
                      <div>
                        <dt>Usage</dt>
                        <dd>{role.usage}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="text-compositions" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>TEXT COMPOSITIONS</p>
              <h2>Text Compositions in Use</h2>
              <p>
                Reference combinations showing how typography roles, hierarchy,
                and emphasis work together in realistic interface contexts.
              </p>
            </div>
            <div className={s.compositionGrid}>
              <article className={s.compositionPattern}>
                <div className={s.compositionPatternIntro}>
                  <div>
                    <span className={s.compositionLabel}>Composition</span>
                    <h3>Hero Introduction</h3>
                    <p className={s.compositionVariant}>
                      Variant: Editorial Split
                    </p>
                  </div>
                  <p className={s.compositionDescription}>
                    Text-first hero composition with a split-color statement,
                    supporting lead, and a focused two-action hierarchy.
                  </p>
                </div>

                <div className={s.compositionHeroPreview} data-surface-tone="dark">
                  <div className={s.compositionHeroCopy}>
                    <div className={s.compositionHeroHeadingGroup}>
                      <p className={s.typeEyebrow}>
                        FINANČNÍ PLÁN, KTERÝ DÁVÁ SMYSL
                      </p>
                      <h3 className={s.typeDisplay}>
                        <span className={s.emphasis}>Nejdřív přehled.</span>
                        <span>Potom jasný plán.</span>
                      </h3>
                    </div>
                    <p className={`${s.typeLead} ${s.compositionHeroLead}`}>
                      Finance nemusí být složitá změť produktů. Začínají
                      pochopením toho, co právě řešíte a kam se chcete dostat.
                    </p>
                    <div
                      className={`${s.compositionActions} ${s.compositionHeroActions}`}
                    >
                      <a href="#surfaces" className={s.compositionPrimaryAction}>
                        Získat přehled
                      </a>
                      <a
                        href="#typography"
                        className={`${s.compositionSecondaryAction} ${s.compositionHeroSecondaryAction}`}
                      >
                        Co právě řešíte?
                      </a>
                    </div>
                  </div>
                </div>

                <div className={s.compositionContractGrid}>
                  <section className={s.compositionDocBlock}>
                    <h4>Composition contract</h4>
                    <ul>
                      <li>1× eyebrow</li>
                      <li>1× display heading</li>
                      <li>maximum 2 semantic color segments</li>
                      <li>1× lead block</li>
                      <li>maximum 2 actions</li>
                    </ul>
                  </section>

                  <section className={s.compositionDocBlock}>
                    <h4>Color contract</h4>
                    <dl>
                      <div>
                        <dt>Eyebrow</dt>
                        <dd>text-emphasis</dd>
                      </div>
                      <div>
                        <dt>Display key</dt>
                        <dd>text-emphasis</dd>
                      </div>
                      <div>
                        <dt>Display rest</dt>
                        <dd>text-primary</dd>
                      </div>
                      <div>
                        <dt>Lead</dt>
                        <dd>text-secondary</dd>
                      </div>
                      <div>
                        <dt>Primary CTA</dt>
                        <dd>primary action</dd>
                      </div>
                      <div>
                        <dt>Secondary CTA</dt>
                        <dd>quiet supporting action</dd>
                      </div>
                    </dl>
                  </section>

                  <section className={s.compositionDocBlock}>
                    <h4>Metadata</h4>
                    <dl>
                      <div>
                        <dt>Surface</dt>
                        <dd>--surface-hero</dd>
                      </div>
                      <div>
                        <dt>Surface tone</dt>
                        <dd>dark</dd>
                      </div>
                      <div>
                        <dt>Text roles</dt>
                        <dd>Eyebrow / Display / Lead</dd>
                      </div>
                      <div>
                        <dt>Text colors</dt>
                        <dd>Emphasis / Primary / Secondary</dd>
                      </div>
                      <div>
                        <dt>Actions</dt>
                        <dd>Primary / Secondary</dd>
                      </div>
                    </dl>
                  </section>

                  <section className={s.compositionDocBlock}>
                    <h4>Use when</h4>
                    <p>
                      the page needs one dominant proposition, a clear semantic
                      contrast, and no more than two immediate actions.
                    </p>
                    <h4>Avoid when</h4>
                    <p>
                      the hero contains multiple competing messages, dense
                      product UI, or more than two equal-priority actions.
                    </p>
                  </section>
                </div>
              </article>

              <article
                className={s.compositionCard}
                data-surface-tone="light"
                style={cssVars({
                  "--preview-bg": "var(--surface-section-light)",
                  "--preview-border": "var(--border-on-light-subtle)",
                })}
              >
                <span className={s.compositionLabel}>Section introduction</span>
                <p className={s.typeEyebrow}>CO PRÁVĚ ŘEŠÍTE</p>
                <h3 className={s.typeHeading}>
                  Finance, které odpovídají vašemu životu.
                </h3>
                <p className={s.typeBody}>
                  Nejdřív se podíváme na celou situaci. Teprve potom vybíráme
                  konkrétní řešení.
                </p>
                <a href="#actions" className={s.typeInlineLink}>
                  Zjistit více
                </a>
              </article>

              <article
                className={s.compositionCard}
                data-surface-tone="light"
                style={cssVars({
                  "--preview-bg": "var(--surface-paper)",
                  "--preview-border": "var(--border-on-light-subtle)",
                })}
              >
                <span className={s.compositionLabel}>Editorial block</span>
                <p className={s.typeMetadata}>Článek · 6 minut čtení</p>
                <h3 className={s.typeHeading}>
                  Celý obraz před konkrétním produktem.
                </h3>
                <p className={s.typeLead}>
                  Dobré rozhodnutí začíná porozuměním souvislostem, ne výběrem
                  první nabídky.
                </p>
                <p className={s.typeBody}>
                  Proto dává textová hierarchie prostoru hlavní informaci,
                  podpůrnému vysvětlení i tichým metadatům.
                </p>
                <a href="#type-roles" className={s.typeInlineLink}>
                  Projít textové role
                </a>
                <p className={s.typeCaption}>
                  Ukázka ověřuje dlouhodobou čitelnost na paper surface.
                </p>
              </article>

              <article
                className={s.compositionCard}
                data-surface-tone="dark"
                style={cssVars({
                  "--preview-bg": "var(--surface-card-dark)",
                  "--preview-border": "var(--border-on-dark-subtle)",
                })}
              >
                <span className={s.compositionLabel}>Card content / dark</span>
                <p className={s.typeLabel}>Osobní plán</p>
                <h3 className={s.typeHeading}>Jeden přehled místo dojmů.</h3>
                <p className={s.typeBody}>
                  Stejná typografická kompozice používá dark surface kontext.
                </p>
                <p className={s.typeMetadata}>Aktualizováno dnes</p>
                <a href="#typography" className={s.typeInlineLink}>
                  Zobrazit princip
                </a>
              </article>

              <article
                className={s.compositionCard}
                data-surface-tone="light"
                style={cssVars({
                  "--preview-bg": "var(--surface-card-light)",
                  "--preview-border": "var(--border-on-light-subtle)",
                })}
              >
                <span className={s.compositionLabel}>Card content / light</span>
                <p className={s.typeLabel}>Osobní plán</p>
                <h3 className={s.typeHeading}>Jeden přehled místo dojmů.</h3>
                <p className={s.typeBody}>
                  Bez změny komponenty se text přizpůsobí light kontextu.
                </p>
                <p className={s.typeMetadata}>Aktualizováno dnes</p>
                <a href="#typography" className={s.typeInlineLink}>
                  Zobrazit princip
                </a>
              </article>

              <article
                className={s.compositionCard}
                data-surface-tone="action"
                style={cssVars({
                  "--preview-bg": "var(--surface-action)",
                  "--preview-border": "var(--border-accent-subtle)",
                })}
              >
                <span className={s.compositionLabel}>Action block</span>
                <p className={s.typeEyebrow}>DALŠÍ KROK</p>
                <h3 className={s.typeHeading}>Začněte jedním přehledem.</h3>
                <p className={s.typeBody}>
                  Action surface používá tmavou textovou hierarchii bez bílého
                  textu na lime ploše.
                </p>
                <a href="#surfaces" className={s.compositionActionOnLime}>
                  Domluvit konzultaci
                </a>
                <p className={s.typeMetadata}>Odpověď obvykle do 24 hodin</p>
              </article>
            </div>
          </section>

          <section id="actions" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>Accent / Action language</p>
              <h2>Lime as a Decision Signal</h2>
              <p>
                Use lime where the interface asks for attention, communicates a
                current state, or guarantees interaction visibility.
              </p>
            </div>
            <div className={s.actionContract}>
              <div>
                <span>Use for</span>
                <p>decisions · current state · keyboard focus · meaningful emphasis</p>
              </div>
              <div>
                <span>Avoid for</span>
                <p>ambient decoration · large background areas · passive ornament</p>
              </div>
            </div>
            <div className={s.actionColumnGrid}>
              {actionColumns.map((column) => (
                <div key={column.label} className={s.actionColumn}>
                  <div className={s.actionColumnHeader}>
                    <span>{column.label}</span>
                  </div>
                  <div className={s.actionColumnCards}>
                    {column.items.map((item) => (
                      <article
                        key={item.kind}
                        className={`${s.actionCard} ${s[item.kind]}`}
                      >
                        <div className={s.actionPreview}>
                          <span>{item.label}</span>
                        </div>
                        {item.states ? (
                          <div
                            className={s.stateStrip}
                            aria-label={`${item.label} interaction states`}
                          >
                            {item.states.map((state) => (
                              <span
                                key={`${item.kind}-${state.label}`}
                                className={`${s.stateChip} ${
                                  state.focus ? s.stateFocus : ""
                                }`}
                                style={cssVars({
                                  "--state-bg": state.focus
                                    ? "var(--surface-card-dark-hover)"
                                    : state.token
                                      ? cssVarRef(
                                          state.token,
                                          "var(--surface-card-dark)"
                                        )
                                      : "var(--surface-card-dark)",
                                  "--state-fg":
                                    state.tone === "accent"
                                      ? "var(--text-on-accent-primary)"
                                      : state.tone === "muted"
                                        ? "var(--text-on-dark-muted)"
                                        : "var(--text-on-dark-primary)",
                                  "--state-border": state.focus
                                    ? "var(--focus-ring)"
                                    : state.tone === "accent"
                                      ? "var(--cta-primary-border)"
                                      : "var(--border-on-dark-subtle)",
                                })}
                              >
                                <strong>{state.label}</strong>
                                <small>{state.value}</small>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div>
                          <h3>{item.label}</h3>
                          <p>{item.role}</p>
                          <dl className={s.actionMeta}>
                            <div>
                              <dt>Token</dt>
                              <dd>{item.name}</dd>
                            </div>
                            <div>
                              <dt>Source</dt>
                              <dd>{item.source}</dd>
                            </div>
                            <div>
                              <dt>Resolved</dt>
                              <dd>
                                <TokenResolvedValue
                                  name={item.name}
                                  values={resolvedValues}
                                />
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              className={s.actionInspector}
              aria-label="Action reference tokens"
            >
              {actionReferenceGroups.map((group) => (
                <div key={group.label} className={s.actionReferenceGroup}>
                  <h3>{group.label}</h3>
                  <div className={s.actionReferenceList}>
                    {group.items.map((item) => (
                      <article key={item.name} className={s.actionReference}>
                        <div>
                          <span>{item.name}</span>
                          <small>{item.source}</small>
                        </div>
                        <code>
                          resolved:{" "}
                          <TokenResolvedValue
                            name={item.name}
                            values={resolvedValues}
                          />
                        </code>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="borders" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>Borders / separation</p>
              <h2>Separation Without Fog</h2>
              <p>
                Border tokens create hierarchy, containment, and active states
                without relying on shadows, glow, or atmospheric gradients.
              </p>
            </div>
            <div className={s.borderMatrix}>
              {borderGroups.map((group) => (
                <div key={group.label} className={s.borderGroup}>
                  <div className={s.borderGroupHeader}>
                    <span>{group.label}</span>
                  </div>
                  <div className={s.borderGrid}>
                    {group.items.map((item) => (
                      <article
                        key={item.name}
                        data-surface-tone={item.tone}
                        className={`${s.borderCard} ${
                          item.tone === "light" ? s.borderCardLight : ""
                        }`}
                        style={cssVars({
                          "--preview-bg": cssVarRef(
                            item.surface,
                            "var(--surface-card-dark)"
                          ),
                          "--preview-fg": cssVarRef(
                            item.foreground,
                            "var(--text-on-dark-primary)"
                          ),
                          "--preview-token": cssVarRef(
                            item.tokenColor,
                            "var(--accent-primary)"
                          ),
                          "--preview-border": cssVarRef(
                            item.name,
                            "var(--border-on-dark-subtle)"
                          ),
                        })}
                      >
                        <span>{item.label}</span>
                        <h3>{item.name}</h3>
                        <strong>{item.role}</strong>
                        <i className={s.borderSampleLine} aria-hidden="true" />
                        <dl>
                          <div>
                            <dt>Preview surface</dt>
                            <dd>{item.surface}</dd>
                          </div>
                          <div>
                            <dt>Source color</dt>
                            <dd>{item.sourceColor}</dd>
                          </div>
                          <div>
                            <dt>Declared</dt>
                            <dd>
                              <TokenValue name={item.name} values={values} />
                            </dd>
                          </div>
                          <div>
                            <dt>Resolved</dt>
                            <dd>
                              <TokenResolvedValue
                                name={item.name}
                                values={resolvedValues}
                              />
                            </dd>
                          </div>
                          <div>
                            <dt>Context alias</dt>
                            <dd>{item.contextAlias}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={s.borderIntensityPanel}>
              {borderIntensityGroups.map((group) => (
                <article key={group.label}>
                  <span>{group.label}</span>
                  <div>
                    {group.items.map((item) => (
                      <p key={item.label}>
                        <strong>{item.label}</strong>
                        <code>{item.value}</code>
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className={s.surfaceSubsection}>
              <div className={s.sectionHeader}>
                <p className={s.sectionEyebrow}>ACTION SURFACE BORDER TEST</p>
                <h2>Contextual Border Aliases in Action</h2>
                <p>
                  Action surfaces validate structural borders, semantic
                  emphasis borders, and keyboard focus as separate systems.
                </p>
              </div>
              <div className={s.borderActionGrid}>
                {borderActionSurfaceTests.map((item) => (
                  <article
                    key={item.surface}
                    className={s.borderActionCard}
                    data-surface-tone={item.tone}
                    style={cssVars({
                      "--preview-bg": cssVarRef(
                        item.surface,
                        "var(--surface-action)"
                      ),
                    })}
                  >
                    <span>{item.label}</span>
                    <h3>{item.surface}</h3>
                    <p>{item.note}</p>
                    <div
                      className={s.borderActionSamples}
                      aria-label={`${item.label} border alias samples`}
                    >
                      <i>
                        <strong>Structural</strong>
                        <code>--border-subtle</code>
                      </i>
                      <i>
                        <strong>Emphasis</strong>
                        <code>--border-emphasis</code>
                      </i>
                      <i>
                        <strong>Focus</strong>
                        <code>--focus-ring</code>
                      </i>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="components" className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>Component primitives</p>
              <h2>Placeholder Registry</h2>
              <p>
                These rows reserve space for future component variants without
                pretending the component system is finished.
              </p>
            </div>
            <div className={s.primitiveList}>
              {primitiveItems.map((item) => (
                <article key={item} className={s.primitiveRow}>
                  <span>{item}</span>
                  <p>Pending variant definition</p>
                  <button type="button" disabled>
                    Planned
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className={s.section}>
            <div className={s.sectionHeader}>
              <p className={s.sectionEyebrow}>Token health</p>
              <h2>Missing Tokens</h2>
              <p>
                Undefined tokens are surfaced here so the palette can be
                tightened without breaking the dashboard.
              </p>
            </div>
            <div className={s.missingPanel}>
              {missingTokens.length > 0 ? (
                missingTokens.map((name) => <span key={name}>{name}</span>)
              ) : (
                <strong>No missing requested tokens detected.</strong>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
