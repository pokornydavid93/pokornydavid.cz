"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Check,
  Clipboard,
  Copy,
  Eye,
  Gauge,
  LayoutDashboard,
  Layers3,
  Palette,
  Search,
  SlidersHorizontal,
  SquareStack,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DESIGN_PRIMITIVE_COMPONENT_CONTRACTS,
  DESIGN_PRIMITIVE_REGISTRY,
} from "../theme/design-primitives";
import {
  candidateClassifications,
  compositionContracts as canonicalCompositionContracts,
  compositionFixtureCatalog,
  compositionFamilyDefinitions,
  compositionRegistrySummary,
  domainRecipes,
  getRouteUsageCount,
  layoutRecipes,
  pageTemplates,
  routeCompositionCoverage,
  type CompositionContract,
} from "./compositions/registry";
import CompositionSpecimenPreview, {
  getAllowedVisualContexts,
  getDefaultVisualContextId,
} from "./compositions/CompositionSpecimenPreview";
import ComponentWorkspace, {
  type ComponentsWorkspaceView,
} from "./components/workspace/ComponentWorkspace.client";
import { THEME_TOKEN_DEFINITIONS } from "../theme/theme-tokens";
import PrimitiveBadge, { type PrimitiveBadgeTone } from "../ui/badge/PrimitiveBadge";
import PrimitiveCard from "../ui/card/PrimitiveCard";
import Button from "../ui/cta/Button";
import s from "./designLanguageApp.module.css";

export type DesignLanguageRouteId =
  | "overview"
  | "foundations"
  | "surfaces"
  | "typography"
  | "actions"
  | "borders"
  | "components"
  | "compositions"
  | "tools";

type DashboardRoute = {
  id: DesignLanguageRouteId;
  href: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
};

type TokenRecord = {
  id: string;
  scope: string;
  cssVariable: `--${string}`;
  description: string;
  usage: string;
  color: boolean;
};

type TokenRuntimeValue = {
  declared: string;
  resolved: string;
};

type TokenRuntimeMap = Record<string, TokenRuntimeValue>;

type FoundationColor = {
  name: string;
  token: `--${string}`;
  hex: string;
  role: string;
  note: string;
};

type SurfaceRecipe = {
  family: "dark" | "light" | "action";
  label: string;
  token: `--${string}`;
  tone: "dark" | "light" | "action";
  role: string;
  source: string;
  text: `--${string}`;
  edge: `--${string}`;
  expectedResolved: `#${string}`;
  usage: string;
};

type SurfaceToneContract = {
  id: "dark" | "light" | "action";
  label: string;
  surfaceTokens: `--${string}`[];
  rows: {
    label: string;
    alias: `--${string}`;
    target: `--${string}`;
  }[];
};

type TypographyRoleId =
  | "display"
  | "heading"
  | "lead"
  | "body"
  | "metadata"
  | "eyebrow";

type TypographyRole = {
  id: TypographyRoleId;
  label: string;
  tokenPrefix: string;
  sample: string;
  textTransform?: "uppercase";
  metadataSegments?: {
    updatedLabel: string;
    updatedDateTime: string;
    readingTime: string;
  };
  purpose: string;
  usage: string;
  metrics: {
    size: string;
    lineHeight: string;
    weight: string;
    tracking: string;
    case?: string;
    measure?: string;
  };
  tokens: `--${string}`[];
};

type TypographySurfaceTone = "dark" | "light" | "action";

type TypographySurfaceOption = {
  id: TypographySurfaceTone;
  label: string;
  token: `--${string}`;
  note: string;
};

type ActionSurface = "dark" | "light" | "action";

type ActionSurfaceConfig = {
  id: ActionSurface;
  label: string;
  surfaceToken: `--${string}`;
  note: string;
};

type TypePairing = {
  id: "display" | "section" | "article" | "card";
  label: string;
  description: string;
};

type ActionDemoState = "hover" | "active" | "focus-visible";
type SelectionDemoState = "hover" | "pressed" | "focus-visible";
type SelectionPersistence = "unselected" | "selected";
type SelectionInteraction =
  | "rest"
  | "hover"
  | "pressed"
  | "focus-visible"
  | "disabled";

type ContractTokenRow = {
  label: string;
  token: `--${string}`;
  swatch?: "fill" | "border" | "ring";
  foregroundToken?: `--${string}`;
  note?: string;
};

type ActionStateContract = {
  id: "default" | "hover" | "active" | "focus-visible" | "disabled";
  label: string;
  demoState?: ActionDemoState;
  disabled?: boolean;
  note?: string;
  tokens: ContractTokenRow[];
};

type ActionContract = {
  id: "primary" | "secondary";
  label: string;
  variant: "primary" | "secondary";
  token: `--${string}`;
  specimen: string;
  purpose: string;
  states: ActionStateContract[];
};

type SelectionStateContract = {
  id: `${SelectionPersistence}-${SelectionInteraction}`;
  label: string;
  interaction: SelectionInteraction;
  persistence: SelectionPersistence;
  selected: boolean;
  demoState?: SelectionDemoState;
  note: string;
  tokens: ContractTokenRow[];
};

type SelectionStateGroup = {
  id: SelectionPersistence;
  label: string;
  states: SelectionStateContract[];
};

type BorderLevelId = "subtle" | "default" | "emphasis";

type BorderLevelContract = {
  id: BorderLevelId;
  label: string;
  alias: `--${string}`;
  purpose: string;
};

type BorderToneContract = {
  id: "dark" | "light" | "action";
  label: string;
  representativeSurface: `--${string}`;
  surfaceTokens: `--${string}`[];
  sourceTokens: Record<BorderLevelId, `--${string}`>;
  focusToken: `--${string}`;
};

type CopyHandler = (value: string) => Promise<void>;

const dashboardRoutes: DashboardRoute[] = [
  {
    id: "overview",
    href: "/design-language/",
    label: "Overview",
    eyebrow: "Visual system dashboard",
    title: "Design Language",
    description:
      "Interní pracovní plocha pro tokeny, komponenty, routy a kontrolu kvality PokornyDavid.cz.",
    badge: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "foundations",
    href: "/design-language/foundations/",
    label: "Foundations",
    eyebrow: "Foundation tokens",
    title: "Barvy a základní tokeny",
    description:
      "Čtyři zdrojové barvy, jejich role a navazující semantické aliasy pro celý web.",
    badge: "Palette",
    icon: Palette,
  },
  {
    id: "surfaces",
    href: "/design-language/surfaces/",
    label: "Surfaces",
    eyebrow: "Surface system",
    title: "Plochy a hloubka",
    description:
      "Tmavé, světlé a akční surfaces s jasným textovým kontraktem a okraji.",
    badge: "Depth",
    icon: Layers3,
  },
  {
    id: "typography",
    href: "/design-language/typography/",
    label: "Typography",
    eyebrow: "Text hierarchy",
    title: "Typografie v kontextu",
    description:
      "Role textu, čitelnost na surface kontextech a kompozice používané ve veřejném webu.",
    badge: "Text",
    icon: Type,
  },
  {
    id: "actions",
    href: "/design-language/actions/",
    label: "Actions",
    eyebrow: "Action language",
    title: "Akce a stavy",
    description:
      "Primární CTA, sekundární akce, focus ring a aktivní stavy bez dekorativního šumu.",
    badge: "CTA",
    icon: BadgeCheck,
  },
  {
    id: "borders",
    href: "/design-language/borders/",
    label: "Borders",
    eyebrow: "Separation",
    title: "Okraje a oddělení",
    description:
      "Strukturální a významové okraje pro tmavé, světlé i akční kontexty.",
    badge: "Edges",
    icon: SquareStack,
  },
  {
    id: "components",
    href: "/design-language/components/",
    label: "Components",
    eyebrow: "Component contracts",
    title: "Komponenty a použití",
    description:
      "Pracovní registry komponent, jejich tokeny, stav připravenosti a navázání na routy.",
    badge: "Registry",
    icon: Blocks,
  },
  {
    id: "compositions",
    href: "/design-language/compositions/",
    label: "Compositions",
    eyebrow: "Composition contracts",
    title: "Kompozice a patterny",
    description:
      "Normativní patterny pro hero, sekční úvod, gridy, proces, důvěru, CTA, formuláře a články.",
    badge: "Patterns",
    icon: LayoutDashboard,
  },
  {
    id: "tools",
    href: "/design-language/tools/",
    label: "Tools",
    eyebrow: "Design tools",
    title: "Nástroje pro práci se systémem",
    description:
      "Token explorer, kontrastní laboratoř a surface composer pro rychlé ověření změn.",
    badge: "Tools",
    icon: SlidersHorizontal,
  },
];

const previewRoute = {
  href: "/design-language/system-preview/",
  label: "System Preview",
  icon: Eye,
};

const foundationColors: FoundationColor[] = [
  {
    name: "Lime Green",
    token: "--brand-lime",
    hex: "#B0E454",
    role: "akce, aktivní stav, významový důraz",
    note: "Používat úsporně, nikdy jako dekorativní plošný efekt.",
  },
  {
    name: "Forest Green",
    token: "--brand-forest",
    hex: "#224F10",
    role: "důvěra, hloubka, finanční kontext",
    note: "Vytváří strukturální hloubku bez modrého SaaS vzhledu.",
  },
  {
    name: "Soft Ivory",
    token: "--brand-ivory",
    hex: "#EAFFD0",
    role: "čitelnost, editorial, světlá plocha",
    note: "Nese text a dlouhý obsah, není dekorativní krémový motiv.",
  },
  {
    name: "Jet Black",
    token: "--brand-jet",
    hex: "#0D0D0D",
    role: "cinematický základ, soustředění, prostor",
    note: "Primární canvas a kotva vizuálního systému.",
  },
];

const surfaceRecipes: SurfaceRecipe[] = [
  {
    family: "dark",
    label: "Page base",
    token: "--surface-page",
    tone: "dark",
    role: "globální pozadí a první viewport",
    source: "--brand-jet",
    text: "--text-primary",
    edge: "--surface-page-edge",
    expectedResolved: "#0D0D0D",
    usage: "Page canvas, navigation shell and first viewport.",
  },
  {
    family: "dark",
    label: "Dark card",
    token: "--surface-card-dark",
    tone: "dark",
    role: "elevated informace na tmavém pozadí",
    source: "82% Jet + 18% Forest",
    text: "--text-primary",
    edge: "--surface-card-dark-edge",
    expectedResolved: "#11190E",
    usage: "Cards and grouped information nested on the page canvas.",
  },
  {
    family: "light",
    label: "Paper",
    token: "--surface-paper",
    tone: "light",
    role: "články, vysvětlení a delší text",
    source: "96% Ivory + 4% Forest",
    text: "--text-primary",
    edge: "--surface-paper-edge",
    expectedResolved: "#E2F8C8",
    usage: "Editorial parent sections and long-form reading surfaces.",
  },
  {
    family: "light",
    label: "Light card",
    token: "--surface-card-light",
    tone: "light",
    role: "světlá komponenta uvnitř editorial sekce",
    source: "--brand-ivory",
    text: "--text-primary",
    edge: "--surface-card-light-edge",
    expectedResolved: "#EAFFD0",
    usage: "Readable cards nested inside Paper sections.",
  },
  {
    family: "action",
    label: "Primary action",
    token: "--surface-action",
    tone: "action",
    role: "rozhodovací CTA blok",
    source: "--brand-lime",
    text: "--text-primary",
    edge: "--surface-action-edge",
    expectedResolved: "#B0E454",
    usage: "Decisive action bands with Jet content polarity.",
  },
  {
    family: "action",
    label: "Dark action",
    token: "--surface-action-dark",
    tone: "dark",
    role: "důvěryhodná konverzní plocha",
    source: "--brand-forest",
    text: "--text-primary",
    edge: "--surface-action-dark-edge",
    expectedResolved: "#224F10",
    usage: "Trust-led conversion sections with Ivory content polarity.",
  },
];

const surfaceFamilies = [
  {
    id: "dark",
    label: "Dark family",
    description: "Jet canvas with Forest-derived structural depth.",
    layout: "nested",
  },
  {
    id: "light",
    label: "Light family",
    description: "Forest-tinted Paper with a pure Ivory child card.",
    layout: "nested",
  },
  {
    id: "action",
    label: "Action family",
    description: "Lime and Forest as parallel functional action roles.",
    layout: "parallel",
  },
] as const;

const toneSurfaceFamilies: Record<BorderToneContract["id"], `--${string}`[]> = {
  dark: ["--surface-page", "--surface-card-dark", "--surface-action-dark"],
  light: ["--surface-paper", "--surface-card-light"],
  action: ["--surface-action"],
};

const surfaceToneContracts: SurfaceToneContract[] = [
  {
    id: "dark",
    label: "Dark",
    surfaceTokens: toneSurfaceFamilies.dark,
    rows: [
      { label: "Primary text", alias: "--text-primary", target: "--text-on-dark-primary" },
      { label: "Secondary text", alias: "--text-secondary", target: "--text-on-dark-secondary" },
      { label: "Muted text", alias: "--text-muted", target: "--text-on-dark-muted" },
      { label: "Subtle border", alias: "--border-subtle", target: "--border-on-dark-subtle" },
      { label: "Default border", alias: "--border-default", target: "--border-on-dark-default" },
      { label: "Emphasis border", alias: "--border-emphasis", target: "--border-on-dark-emphasis" },
      { label: "Control border", alias: "--border-control", target: "--border-control-on-dark" },
      { label: "State border", alias: "--border-state", target: "--border-state-on-dark" },
      { label: "Focus ring", alias: "--focus-ring", target: "--focus-ring-on-dark" },
    ],
  },
  {
    id: "light",
    label: "Light",
    surfaceTokens: toneSurfaceFamilies.light,
    rows: [
      { label: "Primary text", alias: "--text-primary", target: "--text-on-light-primary" },
      { label: "Secondary text", alias: "--text-secondary", target: "--text-on-light-secondary" },
      { label: "Muted text", alias: "--text-muted", target: "--text-on-light-muted" },
      { label: "Subtle border", alias: "--border-subtle", target: "--border-on-light-subtle" },
      { label: "Default border", alias: "--border-default", target: "--border-on-light-default" },
      { label: "Emphasis border", alias: "--border-emphasis", target: "--border-on-light-emphasis" },
      { label: "Control border", alias: "--border-control", target: "--border-control-on-light" },
      { label: "State border", alias: "--border-state", target: "--border-state-on-light" },
      { label: "Focus ring", alias: "--focus-ring", target: "--focus-ring-on-light" },
    ],
  },
  {
    id: "action",
    label: "Action",
    surfaceTokens: toneSurfaceFamilies.action,
    rows: [
      { label: "Primary text", alias: "--text-primary", target: "--text-on-action-primary" },
      { label: "Secondary text", alias: "--text-secondary", target: "--text-on-action-secondary" },
      { label: "Muted text", alias: "--text-muted", target: "--text-on-action-muted" },
      { label: "Subtle border", alias: "--border-subtle", target: "--border-on-action-subtle" },
      { label: "Default border", alias: "--border-default", target: "--border-on-action-default" },
      { label: "Emphasis border", alias: "--border-emphasis", target: "--border-on-action-emphasis" },
      { label: "Control border", alias: "--border-control", target: "--border-control-on-action" },
      { label: "State border", alias: "--border-state", target: "--border-state-on-action" },
      { label: "Focus ring", alias: "--focus-ring", target: "--focus-ring-on-action" },
    ],
  },
];

const typographyRoles: TypographyRole[] = [
  {
    id: "display",
    label: "Display",
    tokenPrefix: "--type-display-*",
    sample: "Nejdřív přehled. Potom jasný plán.",
    purpose: "hero statement a jediná hlavní myšlenka viewportu",
    usage: "Krátká dominantní věta. Používat jen tam, kde má být jeden hlavní fokus.",
    metrics: {
      size: "44-80 px",
      lineHeight: "0.98",
      weight: "700",
      tracking: "-0.04em",
      measure: "15ch",
    },
    tokens: [
      "--type-display-size",
      "--type-display-line-height",
      "--type-display-weight",
      "--type-display-letter-spacing",
      "--type-display-measure",
    ],
  },
  {
    id: "heading",
    label: "Heading",
    tokenPrefix: "--type-heading-*",
    sample: "Jak rozhodnout, co dává největší smysl",
    purpose: "nadpis sekce nebo významné karty",
    usage: "Orientační bod uvnitř stránky. Viditelně klidnější než display.",
    metrics: {
      size: "32-52 px",
      lineHeight: "1.06",
      weight: "680",
      tracking: "-0.03em",
      measure: "22ch",
    },
    tokens: [
      "--type-heading-size",
      "--type-heading-line-height",
      "--type-heading-weight",
      "--type-heading-letter-spacing",
      "--type-heading-measure",
    ],
  },
  {
    id: "lead",
    label: "Lead",
    tokenPrefix: "--type-lead-*",
    sample:
      "Získáte srozumitelný rámec pro rozhodnutí, než začneme vybírat konkrétní produkt nebo další krok.",
    purpose: "perex a interpretační text mezi nadpisem a běžným obsahem",
    usage: "Síla vychází z velikosti a rytmu, ne z těžkého bold řezu.",
    metrics: {
      size: "20-26 px",
      lineHeight: "1.4",
      weight: "500",
      tracking: "-0.012em",
      measure: "42ch",
    },
    tokens: [
      "--type-lead-size",
      "--type-lead-line-height",
      "--type-lead-weight",
      "--type-lead-letter-spacing",
      "--type-lead-measure",
    ],
  },
  {
    id: "body",
    label: "Body",
    tokenPrefix: "--type-body-*",
    sample:
      "Nejdřív si pojmenujeme příjmy, rezervu, závazky a horizont rozhodnutí. Díky tomu je jasné, co má prioritu, co může počkat a kde by rychlé řešení vytvořilo zbytečné riziko. Teprve potom dává smysl porovnávat hypotéku, investici nebo pojištění.",
    purpose: "běžný text, vysvětlení, popisy a obsah formulářů",
    usage: "Klidná čtecí vrstva pro několik vět za sebou.",
    metrics: {
      size: "16-18 px",
      lineHeight: "1.62",
      weight: "400",
      tracking: "0em",
      measure: "66ch",
    },
    tokens: [
      "--type-body-size",
      "--type-body-line-height",
      "--type-body-weight",
      "--type-body-letter-spacing",
      "--type-body-measure",
    ],
  },
  {
    id: "metadata",
    label: "Metadata",
    tokenPrefix: "--type-metadata-*",
    sample: "Aktualizováno před 3 minutami",
    metadataSegments: {
      updatedLabel: "Aktualizováno před 3 minutami",
      updatedDateTime: "2026-07-10T20:27:00+02:00",
      readingTime: "6 minut čtení",
    },
    purpose: "stav, čas, drobný technický kontext",
    usage: "Podřízená informace. Nikdy nemá soutěžit s headingem ani leadem.",
    metrics: {
      size: "13 px",
      lineHeight: "1.4",
      weight: "550",
      tracking: "0.01em",
    },
    tokens: [
      "--type-metadata-size",
      "--type-metadata-line-height",
      "--type-metadata-weight",
      "--type-metadata-letter-spacing",
    ],
  },
  {
    id: "eyebrow",
    label: "Eyebrow",
    tokenPrefix: "--type-eyebrow-*",
    sample: "OSOBNÍ FINANČNÍ PLÁN",
    textTransform: "uppercase",
    purpose: "krátký orientační label před sekcí nebo kompozicí",
    usage: "Používat střídmě pro kontext. Není povinný v každé kartě.",
    metrics: {
      size: "12 px",
      lineHeight: "1.25",
      weight: "700",
      tracking: "0.075em",
      case: "Uppercase",
    },
    tokens: [
      "--type-eyebrow-size",
      "--type-eyebrow-line-height",
      "--type-eyebrow-weight",
      "--type-eyebrow-letter-spacing",
      "--type-eyebrow-transform",
    ],
  },
];

const typographySurfaceOptions: TypographySurfaceOption[] = [
  {
    id: "dark",
    label: "Dark",
    token: "--surface-card-dark",
    note: "Ivory foreground on a quiet dark card surface.",
  },
  {
    id: "light",
    label: "Light",
    token: "--surface-paper",
    note: "Jet foreground on an editorial reading surface.",
  },
  {
    id: "action",
    label: "Action",
    token: "--surface-action",
    note: "Jet foreground on the decisive Lime action surface.",
  },
];

const actionSurfaceConfig = {
  dark: {
    id: "dark",
    label: "Dark",
    surfaceToken: "--surface-card-dark",
    note: "Controls resolve through dark on-surface action aliases.",
  },
  light: {
    id: "light",
    label: "Light",
    surfaceToken: "--surface-paper",
    note: "Controls resolve through light editorial action aliases.",
  },
  action: {
    id: "action",
    label: "Action",
    surfaceToken: "--surface-action",
    note: "Controls resolve through inverse action-surface aliases.",
  },
} satisfies Record<ActionSurface, ActionSurfaceConfig>;

const actionSurfaceOptions = Object.values(actionSurfaceConfig);

const typePairings: TypePairing[] = [
  {
    id: "display",
    label: "Display composition",
    description: "eyebrow + display + lead + actions",
  },
  {
    id: "section",
    label: "Section composition",
    description: "eyebrow + heading + body",
  },
  {
    id: "article",
    label: "Article composition",
    description: "metadata + heading + lead + body",
  },
  {
    id: "card",
    label: "Card composition",
    description: "metadata + heading + body",
  },
];

const actionFocusTokens: ContractTokenRow[] = [
  {
    label: "Ring color",
    token: "--button-focus-ring",
    swatch: "ring",
    foregroundToken: "--text-primary",
  },
  {
    label: "Ring width",
    token: "--button-focus-width",
  },
  {
    label: "Ring offset",
    token: "--button-focus-offset",
  },
];

const actionContracts: ActionContract[] = [
  {
    id: "primary",
    label: "Primary CTA",
    variant: "primary",
    token: "--cta-primary-bg",
    specimen: "Získat přehled",
    purpose: "jediný dominantní další krok",
    states: [
      {
        id: "default",
        label: "Default",
        tokens: [
          {
            label: "Background",
            token: "--cta-primary-bg",
            swatch: "fill",
            foregroundToken: "--cta-primary-text",
          },
          { label: "Foreground", token: "--cta-primary-text" },
          { label: "Border", token: "--cta-primary-border", swatch: "border" },
        ],
      },
      {
        id: "hover",
        label: "Hover",
        demoState: "hover",
        tokens: [
          {
            label: "Background",
            token: "--cta-primary-bg-hover",
            swatch: "fill",
            foregroundToken: "--cta-primary-text-hover",
          },
          { label: "Foreground", token: "--cta-primary-text-hover" },
          { label: "Border", token: "--cta-primary-border-hover", swatch: "border" },
        ],
      },
      {
        id: "active",
        label: "Active",
        demoState: "active",
        note: "Pressed state keeps the CTA decisive without adding glow.",
        tokens: [
          {
            label: "Background",
            token: "--cta-primary-bg-active",
            swatch: "fill",
            foregroundToken: "--cta-primary-text-active",
          },
          { label: "Foreground", token: "--cta-primary-text-active" },
          { label: "Border", token: "--cta-primary-border-active", swatch: "border" },
        ],
      },
      {
        id: "focus-visible",
        label: "Focus-visible",
        demoState: "focus-visible",
        note: "Keyboard focus is an outer ring, not another fill state.",
        tokens: actionFocusTokens,
      },
      {
        id: "disabled",
        label: "Disabled",
        disabled: true,
        note: "Native disabled button: no hover, active, or pointer affordance.",
        tokens: [
          {
            label: "Background",
            token: "--cta-primary-bg-disabled",
            swatch: "fill",
            foregroundToken: "--cta-primary-text-disabled",
          },
          { label: "Foreground", token: "--cta-primary-text-disabled" },
          {
            label: "Border",
            token: "--cta-primary-border-disabled",
            swatch: "border",
          },
        ],
      },
    ],
  },
  {
    id: "secondary",
    label: "Secondary CTA",
    variant: "secondary",
    token: "--cta-secondary-bg",
    specimen: "Jak to probíhá",
    purpose: "podpůrná cesta bez soutěžení s primární akcí",
    states: [
      {
        id: "default",
        label: "Default",
        tokens: [
          {
            label: "Background",
            token: "--cta-secondary-bg",
            swatch: "fill",
            foregroundToken: "--cta-secondary-text",
          },
          { label: "Foreground", token: "--cta-secondary-text" },
          { label: "Border", token: "--cta-secondary-border", swatch: "border" },
        ],
      },
      {
        id: "hover",
        label: "Hover",
        demoState: "hover",
        tokens: [
          {
            label: "Background",
            token: "--cta-secondary-bg-hover",
            swatch: "fill",
            foregroundToken: "--cta-secondary-text-hover",
          },
          { label: "Foreground", token: "--cta-secondary-text-hover" },
          {
            label: "Border",
            token: "--cta-secondary-border-hover",
            swatch: "border",
          },
        ],
      },
      {
        id: "active",
        label: "Active",
        demoState: "active",
        note: "Pressed secondary stays subordinate to the primary CTA.",
        tokens: [
          {
            label: "Background",
            token: "--cta-secondary-bg-active",
            swatch: "fill",
            foregroundToken: "--cta-secondary-text-active",
          },
          { label: "Foreground", token: "--cta-secondary-text-active" },
          {
            label: "Border",
            token: "--cta-secondary-border-active",
            swatch: "border",
          },
        ],
      },
      {
        id: "focus-visible",
        label: "Focus-visible",
        demoState: "focus-visible",
        note: "Same keyboard focus contract as primary CTA.",
        tokens: actionFocusTokens,
      },
      {
        id: "disabled",
        label: "Disabled",
        disabled: true,
        note: "Native disabled button: visible but intentionally inactive.",
        tokens: [
          {
            label: "Background",
            token: "--cta-secondary-bg-disabled",
            swatch: "fill",
            foregroundToken: "--cta-secondary-text-disabled",
          },
          { label: "Foreground", token: "--cta-secondary-text-disabled" },
          {
            label: "Border",
            token: "--cta-secondary-border-disabled",
            swatch: "border",
          },
        ],
      },
    ],
  },
];

const selectionStateGroups: SelectionStateGroup[] = [
  {
    id: "unselected",
    label: "Unselected",
    states: [
      {
        id: "unselected-rest",
        interaction: "rest",
        label: "Rest",
        persistence: "unselected",
        selected: false,
        note: "Available option without persistent selection meaning.",
        tokens: [
          {
            label: "Background",
            token: "--selection-bg",
            swatch: "fill",
            foregroundToken: "--selection-text",
          },
          { label: "Foreground", token: "--selection-text" },
          { label: "Border", token: "--selection-border", swatch: "border" },
        ],
      },
      {
        id: "unselected-hover",
        interaction: "hover",
        label: "Hover",
        persistence: "unselected",
        selected: false,
        demoState: "hover",
        note: "Hover previews availability without creating a selection.",
        tokens: [
          {
            label: "Background",
            token: "--selection-bg-hover",
            swatch: "fill",
            foregroundToken: "--selection-text-hover",
          },
          { label: "Foreground", token: "--selection-text-hover" },
          { label: "Border", token: "--selection-border-hover", swatch: "border" },
        ],
      },
      {
        id: "unselected-pressed",
        interaction: "pressed",
        label: "Pressed",
        persistence: "unselected",
        selected: false,
        demoState: "pressed",
        note: "Pointer down is stronger than hover but does not imply selection.",
        tokens: [
          {
            label: "Background",
            token: "--selection-bg-pressed",
            swatch: "fill",
            foregroundToken: "--selection-text-pressed",
          },
          { label: "Foreground", token: "--selection-text-pressed" },
          { label: "Border", token: "--selection-border-pressed", swatch: "border" },
        ],
      },
      {
        id: "unselected-focus-visible",
        interaction: "focus-visible",
        label: "Focus-visible",
        persistence: "unselected",
        selected: false,
        demoState: "focus-visible",
        note: "Keyboard focus composes a ring over the unselected rest state.",
        tokens: [
          {
            label: "Background",
            token: "--selection-bg",
            swatch: "fill",
            foregroundToken: "--selection-text",
          },
          { label: "Foreground", token: "--selection-text" },
          { label: "Border", token: "--selection-border", swatch: "border" },
          { label: "Ring color", token: "--selection-focus-ring", swatch: "ring" },
          { label: "Ring width", token: "--focus-width-standard" },
          { label: "Ring offset", token: "--focus-offset-standard" },
        ],
      },
      {
        id: "unselected-disabled",
        interaction: "disabled",
        label: "Disabled",
        persistence: "unselected",
        selected: false,
        note: "Unavailable option remains identifiable without interaction affordance.",
        tokens: [
          {
            label: "Background",
            token: "--selection-bg-disabled",
            swatch: "fill",
            foregroundToken: "--selection-text-disabled",
          },
          { label: "Foreground", token: "--selection-text-disabled" },
          { label: "Border", token: "--selection-border-disabled", swatch: "border" },
        ],
      },
    ],
  },
  {
    id: "selected",
    label: "Selected",
    states: [
      {
        id: "selected-rest",
        interaction: "rest",
        label: "Rest",
        persistence: "selected",
        selected: true,
        note: "Persistent choice uses fill, border, stronger weight, and a checkmark.",
        tokens: [
          {
            label: "Background",
            token: "--selection-selected-bg",
            swatch: "fill",
            foregroundToken: "--selection-selected-text",
          },
          { label: "Foreground", token: "--selection-selected-text" },
          { label: "Border", token: "--selection-selected-border", swatch: "border" },
          { label: "Indicator", token: "--selection-indicator", swatch: "fill" },
        ],
      },
      {
        id: "selected-hover",
        interaction: "hover",
        label: "Hover",
        persistence: "selected",
        selected: true,
        demoState: "hover",
        note: "Hover strengthens the selected state while preserving its checkmark.",
        tokens: [
          {
            label: "Background",
            token: "--selection-selected-bg-hover",
            swatch: "fill",
            foregroundToken: "--selection-selected-text-hover",
          },
          { label: "Foreground", token: "--selection-selected-text-hover" },
          { label: "Border", token: "--selection-selected-border-hover", swatch: "border" },
          { label: "Indicator", token: "--selection-selected-indicator-hover", swatch: "fill" },
        ],
      },
      {
        id: "selected-pressed",
        interaction: "pressed",
        label: "Pressed",
        persistence: "selected",
        selected: true,
        demoState: "pressed",
        note: "Pointer down remains selected and keeps the checkmark visible.",
        tokens: [
          {
            label: "Background",
            token: "--selection-selected-bg-pressed",
            swatch: "fill",
            foregroundToken: "--selection-selected-text-pressed",
          },
          { label: "Foreground", token: "--selection-selected-text-pressed" },
          { label: "Border", token: "--selection-selected-border-pressed", swatch: "border" },
          { label: "Indicator", token: "--selection-selected-indicator-pressed", swatch: "fill" },
        ],
      },
      {
        id: "selected-focus-visible",
        interaction: "focus-visible",
        label: "Focus-visible",
        persistence: "selected",
        selected: true,
        demoState: "focus-visible",
        note: "Keyboard focus composes a ring over the selected state and its checkmark.",
        tokens: [
          {
            label: "Background",
            token: "--selection-selected-bg",
            swatch: "fill",
            foregroundToken: "--selection-selected-text",
          },
          { label: "Foreground", token: "--selection-selected-text" },
          { label: "Border", token: "--selection-selected-border", swatch: "border" },
          { label: "Indicator", token: "--selection-indicator", swatch: "fill" },
          { label: "Ring color", token: "--selection-focus-ring", swatch: "ring" },
          { label: "Ring width", token: "--focus-width-standard" },
          { label: "Ring offset", token: "--focus-offset-standard" },
        ],
      },
      {
        id: "selected-disabled",
        interaction: "disabled",
        label: "Disabled",
        persistence: "selected",
        selected: true,
        note: "The muted checkmark keeps an unavailable value visibly selected.",
        tokens: [
          {
            label: "Background",
            token: "--selection-selected-bg-disabled",
            swatch: "fill",
            foregroundToken: "--selection-selected-text-disabled",
          },
          { label: "Foreground", token: "--selection-selected-text-disabled" },
          { label: "Border", token: "--selection-selected-border-disabled", swatch: "border" },
          { label: "Indicator", token: "--selection-selected-indicator-disabled", swatch: "fill" },
        ],
      },
    ],
  },
];

const borderLevels: BorderLevelContract[] = [
  {
    id: "subtle",
    label: "Subtle",
    alias: "--border-subtle",
    purpose: "Nejtišší pasivní oddělení obsahu a vnořených regionů.",
  },
  {
    id: "default",
    label: "Default",
    alias: "--border-default",
    purpose: "Běžné strukturální oddělení uvnitř aktivní surface.",
  },
  {
    id: "emphasis",
    label: "Emphasis",
    alias: "--border-emphasis",
    purpose:
      "Silnější strukturální oddělení. Může podporovat významový stav, nikdy jej nenese samo.",
  },
];

const borderToneContracts: BorderToneContract[] = [
  {
    id: "dark",
    label: "Dark",
    representativeSurface: "--surface-card-dark",
    surfaceTokens: toneSurfaceFamilies.dark,
    sourceTokens: {
      subtle: "--border-on-dark-subtle",
      default: "--border-on-dark-default",
      emphasis: "--border-on-dark-emphasis",
    },
    focusToken: "--focus-ring-on-dark",
  },
  {
    id: "light",
    label: "Light",
    representativeSurface: "--surface-card-light",
    surfaceTokens: toneSurfaceFamilies.light,
    sourceTokens: {
      subtle: "--border-on-light-subtle",
      default: "--border-on-light-default",
      emphasis: "--border-on-light-emphasis",
    },
    focusToken: "--focus-ring-on-light",
  },
  {
    id: "action",
    label: "Action",
    representativeSurface: "--surface-action",
    surfaceTokens: toneSurfaceFamilies.action,
    sourceTokens: {
      subtle: "--border-on-action-subtle",
      default: "--border-on-action-default",
      emphasis: "--border-on-action-emphasis",
    },
    focusToken: "--focus-ring-on-action",
  },
];

function extractContractCssVariables(value: string): `--${string}`[] {
  return (value.match(/--[a-z0-9-]+/gi) ?? []) as `--${string}`[];
}

const familyFilterOptions = [
  { id: "all", label: "All families" },
  ...compositionFamilyDefinitions.map((family) => ({
    id: family.id,
    label: family.label,
  })),
] as const;

const statusFilterOptions = [
  { id: "all", label: "All statuses" },
  { id: "draft", label: "Draft" },
  { id: "reviewed", label: "Reviewed" },
  { id: "stable", label: "Stable" },
  { id: "deprecated", label: "Deprecated" },
] as const;

const layerFilterOptions = [
  { id: "all", label: "All layers" },
  { id: "system", label: "System" },
  { id: "advisory", label: "Advisory" },
] as const;

const scopeFilterOptions = [
  { id: "all", label: "All scopes" },
  { id: "global", label: "Global" },
  { id: "section", label: "Section" },
  { id: "region", label: "Region" },
  { id: "inline", label: "Inline" },
] as const;

const motionFilterOptions = [
  { id: "all", label: "All motion" },
  { id: "none", label: "None" },
  { id: "micro", label: "Micro" },
  { id: "reveal", label: "Reveal" },
  { id: "narrative", label: "Narrative" },
  { id: "pinned", label: "Pinned" },
] as const;

function compositionStatusTone(
  status: CompositionContract["meta"]["status"]
): PrimitiveBadgeTone {
  if (status === "stable" || status === "reviewed") return "success";
  if (status === "deprecated") return "warning";
  return "accent";
}

function getCompositionRequiredSlots(composition: CompositionContract) {
  return composition.anatomy.slots.filter(
    (slot) => slot.baseCardinality.min > 0
  );
}

function getCompositionOptionalSlots(composition: CompositionContract) {
  return composition.anatomy.slots.filter(
    (slot) => slot.baseCardinality.min === 0
  );
}

function formatCompositionFamily(composition: CompositionContract) {
  return (
    compositionFamilyDefinitions.find(
      (family) => family.id === composition.meta.displayGroup
    )?.label ?? composition.meta.displayGroup
  );
}

function getCompositionDomainRecipeCount(composition: CompositionContract) {
  return domainRecipes.filter(
    (recipe) => recipe.compositionId === composition.meta.id
  ).length;
}

function getCompositionLayoutRecipeLabels(composition: CompositionContract) {
  return composition.layout.supportedRecipeIds.map((recipeId) => {
    const recipe = layoutRecipes.find((item) => item.id === recipeId);
    return recipe?.id ?? recipeId;
  });
}

function getCompositionSearchText(composition: CompositionContract) {
  return [
    composition.meta.id,
    composition.meta.name,
    composition.meta.intent,
    composition.meta.family,
    composition.meta.displayGroup,
    composition.meta.tags.join(" "),
    composition.anatomy.slots.map((slot) => slot.id).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function getCompositionIdFromHash() {
  if (typeof window === "undefined") return "";

  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function isKnownCompositionId(compositionId: string) {
  return canonicalCompositionContracts.some(
    (composition) => composition.meta.id === compositionId
  );
}

function getInitialCompositionId() {
  const hashCompositionId = getCompositionIdFromHash();

  return isKnownCompositionId(hashCompositionId)
    ? hashCompositionId
    : canonicalCompositionContracts[0]?.meta.id ?? "";
}

function updateCompositionHash(compositionId: string) {
  window.history.replaceState(
    null,
    "",
    `#${encodeURIComponent(compositionId)}`
  );
}

const extraTokens: TokenRecord[] = [
  {
    id: "surface.sectionDarkDeep",
    scope: "surface",
    cssVariable: "--surface-section-dark-deep",
    description: "First depth step after the page base.",
    usage: "section breaks and focused dashboard bands",
    color: true,
  },
  {
    id: "surface.cardDarkHover",
    scope: "surface",
    cssVariable: "--surface-card-dark-hover",
    description: "Interactive dark card elevation.",
    usage: "hover and selected card states",
    color: true,
  },
  {
    id: "surface.paper",
    scope: "surface",
    cssVariable: "--surface-paper",
    description: "Long-form editorial surface.",
    usage: "articles, explanations, readable panels",
    color: true,
  },
  {
    id: "surface.cardLightHover",
    scope: "surface",
    cssVariable: "--surface-card-light-hover",
    description: "Interactive light card elevation.",
    usage: "hover states on editorial cards",
    color: true,
  },
  {
    id: "surface.actionSoft",
    scope: "surface",
    cssVariable: "--surface-action-soft",
    description: "Quiet supporting action surface.",
    usage: "secondary conversion blocks",
    color: true,
  },
  {
    id: "surface.actionDark",
    scope: "surface",
    cssVariable: "--surface-action-dark",
    description: "Trust-led action surface.",
    usage: "high-value CTA moments",
    color: true,
  },
  {
    id: "button.focusWidth",
    scope: "cta",
    cssVariable: "--button-focus-width",
    description: "Button component focus ring width.",
    usage: "Button focus-visible outline geometry",
    color: false,
  },
  {
    id: "button.focusOffset",
    scope: "cta",
    cssVariable: "--button-focus-offset",
    description: "Button component focus ring offset.",
    usage: "Button focus-visible outline geometry",
    color: false,
  },
  {
    id: "type.displaySize",
    scope: "typography",
    cssVariable: "--type-display-size",
    description: "Display role responsive size.",
    usage: "dominant viewport statements",
    color: false,
  },
  {
    id: "type.displayLineHeight",
    scope: "typography",
    cssVariable: "--type-display-line-height",
    description: "Display role line height.",
    usage: "dominant viewport statements",
    color: false,
  },
  {
    id: "type.displayWeight",
    scope: "typography",
    cssVariable: "--type-display-weight",
    description: "Display role weight.",
    usage: "dominant viewport statements",
    color: false,
  },
  {
    id: "type.displayLetterSpacing",
    scope: "typography",
    cssVariable: "--type-display-letter-spacing",
    description: "Display role tracking.",
    usage: "dominant viewport statements",
    color: false,
  },
  {
    id: "type.displayMeasure",
    scope: "typography",
    cssVariable: "--type-display-measure",
    description: "Display role readable measure.",
    usage: "dominant viewport statements",
    color: false,
  },
  {
    id: "type.headingSize",
    scope: "typography",
    cssVariable: "--type-heading-size",
    description: "Heading role responsive size.",
    usage: "section and card headings",
    color: false,
  },
  {
    id: "type.headingLineHeight",
    scope: "typography",
    cssVariable: "--type-heading-line-height",
    description: "Heading role line height.",
    usage: "section and card headings",
    color: false,
  },
  {
    id: "type.headingWeight",
    scope: "typography",
    cssVariable: "--type-heading-weight",
    description: "Heading role weight.",
    usage: "section and card headings",
    color: false,
  },
  {
    id: "type.headingLetterSpacing",
    scope: "typography",
    cssVariable: "--type-heading-letter-spacing",
    description: "Heading role tracking.",
    usage: "section and card headings",
    color: false,
  },
  {
    id: "type.headingMeasure",
    scope: "typography",
    cssVariable: "--type-heading-measure",
    description: "Heading role readable measure.",
    usage: "section and card headings",
    color: false,
  },
  {
    id: "type.leadSize",
    scope: "typography",
    cssVariable: "--type-lead-size",
    description: "Lead role responsive size.",
    usage: "introductory paragraphs and perex text",
    color: false,
  },
  {
    id: "type.leadLineHeight",
    scope: "typography",
    cssVariable: "--type-lead-line-height",
    description: "Lead role line height.",
    usage: "introductory paragraphs and perex text",
    color: false,
  },
  {
    id: "type.leadWeight",
    scope: "typography",
    cssVariable: "--type-lead-weight",
    description: "Lead role weight.",
    usage: "introductory paragraphs and perex text",
    color: false,
  },
  {
    id: "type.leadLetterSpacing",
    scope: "typography",
    cssVariable: "--type-lead-letter-spacing",
    description: "Lead role tracking.",
    usage: "introductory paragraphs and perex text",
    color: false,
  },
  {
    id: "type.leadMeasure",
    scope: "typography",
    cssVariable: "--type-lead-measure",
    description: "Lead role readable measure.",
    usage: "introductory paragraphs and perex text",
    color: false,
  },
  {
    id: "type.bodySize",
    scope: "typography",
    cssVariable: "--type-body-size",
    description: "Body role responsive size.",
    usage: "long-form reading and explanatory copy",
    color: false,
  },
  {
    id: "type.bodyLineHeight",
    scope: "typography",
    cssVariable: "--type-body-line-height",
    description: "Body role line height.",
    usage: "long-form reading and explanatory copy",
    color: false,
  },
  {
    id: "type.bodyWeight",
    scope: "typography",
    cssVariable: "--type-body-weight",
    description: "Body role weight.",
    usage: "long-form reading and explanatory copy",
    color: false,
  },
  {
    id: "type.bodyLetterSpacing",
    scope: "typography",
    cssVariable: "--type-body-letter-spacing",
    description: "Body role tracking.",
    usage: "long-form reading and explanatory copy",
    color: false,
  },
  {
    id: "type.bodyMeasure",
    scope: "typography",
    cssVariable: "--type-body-measure",
    description: "Body role readable measure.",
    usage: "long-form reading and explanatory copy",
    color: false,
  },
  {
    id: "type.metadataSize",
    scope: "typography",
    cssVariable: "--type-metadata-size",
    description: "Metadata role size.",
    usage: "timestamps and supporting technical context",
    color: false,
  },
  {
    id: "type.metadataLineHeight",
    scope: "typography",
    cssVariable: "--type-metadata-line-height",
    description: "Metadata role line height.",
    usage: "timestamps and supporting technical context",
    color: false,
  },
  {
    id: "type.metadataWeight",
    scope: "typography",
    cssVariable: "--type-metadata-weight",
    description: "Metadata role weight.",
    usage: "timestamps and supporting technical context",
    color: false,
  },
  {
    id: "type.metadataLetterSpacing",
    scope: "typography",
    cssVariable: "--type-metadata-letter-spacing",
    description: "Metadata role tracking.",
    usage: "timestamps and supporting technical context",
    color: false,
  },
  {
    id: "type.eyebrowSize",
    scope: "typography",
    cssVariable: "--type-eyebrow-size",
    description: "Eyebrow role size.",
    usage: "section context labels",
    color: false,
  },
  {
    id: "type.eyebrowLineHeight",
    scope: "typography",
    cssVariable: "--type-eyebrow-line-height",
    description: "Eyebrow role line height.",
    usage: "section context labels",
    color: false,
  },
  {
    id: "type.eyebrowWeight",
    scope: "typography",
    cssVariable: "--type-eyebrow-weight",
    description: "Eyebrow role weight.",
    usage: "section context labels",
    color: false,
  },
  {
    id: "type.eyebrowLetterSpacing",
    scope: "typography",
    cssVariable: "--type-eyebrow-letter-spacing",
    description: "Eyebrow role tracking.",
    usage: "section context labels",
    color: false,
  },
  {
    id: "type.eyebrowTransform",
    scope: "typography",
    cssVariable: "--type-eyebrow-transform",
    description: "Eyebrow role text transform.",
    usage: "section context labels",
    color: false,
  },
  {
    id: "text.onDarkMuted",
    scope: "text",
    cssVariable: "--text-on-dark-muted",
    description: "Muted text on dark surfaces.",
    usage: "metadata and low-priority labels",
    color: true,
  },
  {
    id: "text.onLightSecondary",
    scope: "text",
    cssVariable: "--text-on-light-secondary",
    description: "Secondary text on light surfaces.",
    usage: "paragraph support copy",
    color: true,
  },
  {
    id: "text.onLightMuted",
    scope: "text",
    cssVariable: "--text-on-light-muted",
    description: "Muted text on light surfaces.",
    usage: "captions and quiet metadata",
    color: true,
  },
  {
    id: "text.emphasisOnDark",
    scope: "text",
    cssVariable: "--text-emphasis-on-dark",
    description: "Meaningful emphasis on dark.",
    usage: "selected words, not full paragraphs",
    color: true,
  },
  {
    id: "text.emphasisOnLight",
    scope: "text",
    cssVariable: "--text-emphasis-on-light",
    description: "Meaningful emphasis on light.",
    usage: "editorial highlights",
    color: true,
  },
  {
    id: "text.accent",
    scope: "text",
    cssVariable: "--text-accent",
    description: "Surface-aware accent text.",
    usage: "short labels and contextual highlights",
    color: true,
  },
  {
    id: "accent.primaryHover",
    scope: "accent",
    cssVariable: "--accent-primary-hover",
    description: "Primary accent hover.",
    usage: "CTA hover state",
    color: true,
  },
  {
    id: "accent.primaryActive",
    scope: "accent",
    cssVariable: "--accent-primary-active",
    description: "Primary accent active.",
    usage: "pressed state",
    color: true,
  },
  {
    id: "border.onDarkMedium",
    scope: "border",
    cssVariable: "--border-on-dark-medium",
    description: "Medium structural border on dark.",
    usage: "stronger grouping",
    color: true,
  },
  {
    id: "border.onLightMedium",
    scope: "border",
    cssVariable: "--border-on-light-medium",
    description: "Medium structural border on light.",
    usage: "stronger editorial grouping",
    color: true,
  },
  {
    id: "border.accentDarkEmphasis",
    scope: "border",
    cssVariable: "--border-on-dark-emphasis",
    description: "Accent border on dark.",
    usage: "selected state or highlighted edge",
    color: true,
  },
  {
    id: "border.accentLightEmphasis",
    scope: "border",
    cssVariable: "--border-accent-on-light-emphasis",
    description: "Accent border on light.",
    usage: "selected state on editorial surfaces",
    color: true,
  },
  {
    id: "type.displaySize",
    scope: "typography",
    cssVariable: "--type-display-size",
    description: "Display text size.",
    usage: "hero statements",
    color: false,
  },
  {
    id: "type.headingSize",
    scope: "typography",
    cssVariable: "--type-heading-size",
    description: "Heading text size.",
    usage: "section and card headings",
    color: false,
  },
  {
    id: "type.bodyLineHeight",
    scope: "typography",
    cssVariable: "--type-body-line-height",
    description: "Body text line height.",
    usage: "paragraph rhythm",
    color: false,
  },
  {
    id: "nav.pillBackground",
    scope: "nav",
    cssVariable: "--nav-pill-bg",
    description: "Navigation pill background.",
    usage: "main nav items",
    color: true,
  },
  {
    id: "nav.activeText",
    scope: "nav",
    cssVariable: "--nav-active-text",
    description: "Active navigation text.",
    usage: "current page indication",
    color: true,
  },
];

const importedTokens: TokenRecord[] = THEME_TOKEN_DEFINITIONS.map((token) => ({
  id: token.id,
  scope: token.scope,
  cssVariable: token.cssVariable,
  description: token.description,
  usage: token.description,
  color: true,
}));

const importedPrimitiveTokens = DESIGN_PRIMITIVE_REGISTRY.reduce<TokenRecord[]>(
  (tokens, primitive) => {
    if (!primitive.cssVariable) return tokens;

    tokens.push({
      id: primitive.id,
      scope: primitive.category,
      cssVariable: primitive.cssVariable,
      description: primitive.description,
      usage: `${primitive.name} · ${primitive.status}`,
      color: false,
    });

    return tokens;
  },
  []
);

const importedContractTokens =
  DESIGN_PRIMITIVE_COMPONENT_CONTRACTS.reduce<TokenRecord[]>(
    (tokens, contract) => {
      Object.values(contract.primitives)
        .flatMap((value) => extractContractCssVariables(String(value)))
        .forEach((cssVariable) => {
          tokens.push({
            id: `${contract.id}.${cssVariable}`,
            scope: "component",
            cssVariable,
            description: `${contract.name} contract token.`,
            usage: `${contract.name} · ${contract.status}`,
            color: false,
          });
        });

      return tokens;
    },
    []
  );

const tokenCatalog = dedupeTokens([
  ...importedTokens,
  ...importedPrimitiveTokens,
  ...importedContractTokens,
  ...extraTokens,
]);
const colorTokenCatalog = tokenCatalog.filter((token) => token.color);

const tokenScopeLabels: Record<string, string> = {
  all: "All",
  foundation: "Foundation",
  surface: "Surface",
  text: "Text",
  accent: "Accent",
  border: "Border",
  cta: "CTA",
  container: "Containers",
  depth: "Depth",
  effect: "Effects",
  exception: "Exceptions",
  iconography: "Iconography",
  interaction: "Interaction",
  layer: "Layers",
  layout: "Layout",
  measure: "Measure",
  media: "Media",
  motion: "Motion",
  nav: "Nav",
  opacity: "Opacity",
  responsive: "Responsive",
  "section-rhythm": "Section rhythm",
  shape: "Shape",
  sizing: "Sizing",
  spacing: "Spacing",
  typography: "Typography",
  form: "Form",
  hero: "Hero",
  selection: "Selection",
  trust: "Trust",
  editorial: "Editorial",
  status: "Status",
  glow: "Glow",
};

const tokenScopes = [
  "all",
  ...Array.from(new Set(tokenCatalog.map((token) => token.scope))).sort(),
];

function dedupeTokens(tokens: TokenRecord[]) {
  const byVariable = new Map<string, TokenRecord>();

  tokens.forEach((token) => {
    if (!byVariable.has(token.cssVariable)) {
      byVariable.set(token.cssVariable, token);
    }
  });

  return Array.from(byVariable.values()).sort((a, b) =>
    a.cssVariable.localeCompare(b.cssVariable)
  );
}

function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

function cssVarRef(name: string, fallback: string) {
  return `var(${name}, ${fallback})`;
}

function normalizeDeclaredValue(value: string) {
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

function readDeclaredVar(name: string) {
  if (typeof window === "undefined") return "not available";

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value ? normalizeDeclaredValue(value) : "not defined";
}

function readDeclaredVarFromElement(element: HTMLElement, name: string) {
  const value = getComputedStyle(element).getPropertyValue(name).trim();

  return value ? normalizeDeclaredValue(value) : "not defined";
}

function colorToHex(color: string) {
  const srgbMatch = color.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/i
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

  const parsed = parseColor(color);

  if (!parsed) return color;

  if (parsed.a < 1) {
    return `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(
      parsed.b
    )}, ${Number(parsed.a.toFixed(2))})`;
  }

  return `#${[parsed.r, parsed.g, parsed.b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function readResolvedColorFromProbe(probe: HTMLElement, name: string) {
  const property = name.startsWith("--surface-")
    ? "background"
    : name.startsWith("--border-") || name.startsWith("--focus-ring")
      ? "border"
      : "color";

  if (property === "background") {
    probe.style.backgroundColor = `var(${name})`;
  } else if (property === "border") {
    probe.style.border = `1px solid var(${name})`;
  } else {
    probe.style.color = `var(${name})`;
  }

  const computed = getComputedStyle(probe);

  if (property === "background") return computed.backgroundColor.trim();
  if (property === "border") return computed.borderTopColor.trim();
  return computed.color.trim();
}

function createColorProbe() {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.pointerEvents = "none";
  probe.style.visibility = "hidden";
  return probe;
}

function readResolvedColor(name: string) {
  if (typeof window === "undefined") return "not available";

  const probe = createColorProbe();
  document.body.appendChild(probe);

  const value = readResolvedColorFromProbe(probe, name);
  probe.remove();

  return value ? colorToHex(value) : "not defined";
}

function readResolvedColorFromElement(element: HTMLElement, name: string) {
  const probe = createColorProbe();
  element.appendChild(probe);

  const value = readResolvedColorFromProbe(probe, name);
  probe.remove();

  return value ? colorToHex(value) : "not defined";
}

function readTokenRuntimeMapFromElement(element: HTMLElement) {
  return Object.fromEntries(
    tokenCatalog.map((token) => {
      const declared = readDeclaredVarFromElement(element, token.cssVariable);
      const resolved = token.color
        ? readResolvedColorFromElement(element, token.cssVariable)
        : declared;

      return [token.cssVariable, { declared, resolved }];
    })
  );
}

type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function parseRgbChannel(value: string) {
  if (value.endsWith("%")) return (Number(value.slice(0, -1)) / 100) * 255;
  return Number(value);
}

function parseAlpha(value?: string) {
  if (!value) return 1;
  if (value.endsWith("%")) return Number(value.slice(0, -1)) / 100;
  return Number(value);
}

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

  const srgbMatch = color.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/i
  );

  if (srgbMatch) {
    const [, r, g, b, alpha] = srgbMatch;

    return {
      r: Number(r) * 255,
      g: Number(g) * 255,
      b: Number(b) * 255,
      a: alpha ? Number(alpha) : 1,
    };
  }

  const rgbMatch = color.match(/^rgba?\((.+)\)$/i);

  if (!rgbMatch) return null;

  const parts = rgbMatch[1]
    .replaceAll(",", " ")
    .replaceAll("/", " ")
    .trim()
    .split(/\s+/);

  if (parts.length < 3) return null;

  return {
    r: parseRgbChannel(parts[0]),
    g: parseRgbChannel(parts[1]),
    b: parseRgbChannel(parts[2]),
    a: parseAlpha(parts[3]),
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

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: ParsedColor) {
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

function contrastGrade(ratio: number | null) {
  if (ratio === null) return "pending";
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Review";
}

function tokenRuntime(
  tokenValues: TokenRuntimeMap,
  tokenName: string
): TokenRuntimeValue {
  return (
    tokenValues[tokenName] ?? {
      declared: "not read",
      resolved: "not read",
    }
  );
}

function minimumContrastAcrossSurfaces(
  foregroundValue: string,
  surfaceTokens: `--${string}`[],
  tokenValues: TokenRuntimeMap
) {
  return surfaceTokens.reduce<{ ratio: number; token: `--${string}` } | null>(
    (minimum, token) => {
      const surfaceValue = tokenRuntime(tokenValues, token).resolved;
      const ratio = contrastRatio(foregroundValue, surfaceValue);

      if (ratio === null) return minimum;
      if (minimum !== null && minimum.ratio <= ratio) return minimum;

      return { ratio, token };
    },
    null
  );
}

function RouteNavItem({
  route,
  active,
}: {
  route: DashboardRoute;
  active: boolean;
}) {
  const Icon = route.icon;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={s.navItem}
      href={route.href}
    >
      <Icon aria-hidden="true" size={17} strokeWidth={2.1} />
      <span>{route.label}</span>
    </Link>
  );
}

function DashboardShell({
  activeRoute,
  children,
  tokenValues,
}: {
  activeRoute: DashboardRoute;
  children: ReactNode;
  tokenValues: TokenRuntimeMap;
}) {
  const PreviewIcon = previewRoute.icon;
  const readCount = Object.keys(tokenValues).length;

  return (
    <main id="main-content" className={s.page} data-surface-tone="dark">
      <div className={s.shell}>
        <aside className={s.sidebar} aria-label="Design language">
          <Link className={s.brand} href="/design-language/">
            <span className={s.brandMark}>PD</span>
            <span>
              <strong>Design Language</strong>
              <small>PokornyDavid.cz</small>
            </span>
          </Link>

          <nav className={s.navList} aria-label="Dashboard routes">
            {dashboardRoutes.map((route) => (
              <RouteNavItem
                key={route.id}
                active={activeRoute.id === route.id}
                route={route}
              />
            ))}
          </nav>

          <Link className={s.previewLink} href={previewRoute.href}>
            <PreviewIcon aria-hidden="true" size={16} strokeWidth={2.1} />
            <span>{previewRoute.label}</span>
          </Link>

          <div className={s.sidebarStatus}>
            <span>Status</span>
            <strong>{readCount > 0 ? `${readCount} tokens read` : "Reading tokens"}</strong>
          </div>
        </aside>

        <div className={s.content}>
          <header className={s.header}>
            <div>
              <p className={s.kicker}>{activeRoute.eyebrow}</p>
              <h1>{activeRoute.title}</h1>
              <p>{activeRoute.description}</p>
            </div>
            <div className={s.headerRail} aria-label="Route metadata">
              <span>{activeRoute.badge}</span>
              <span>No gradients</span>
              <span>Token first</span>
            </div>
          </header>

          {children}
        </div>
      </div>
    </main>
  );
}

function OverviewRoute({ tokenValues }: { tokenValues: TokenRuntimeMap }) {
  const missingCount = tokenCatalog.filter(
    (token) => tokenRuntime(tokenValues, token.cssVariable).declared === "not defined"
  ).length;

  return (
    <div className={s.routeStack}>
      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Dashboard map</p>
          <h2>Vlastní routy pro celý systém</h2>
          <p>
            Design language už není jedna dlouhá stránka. Každá oblast má vlastní URL,
            vlastní fokus a navázané pracovní nástroje.
          </p>
        </div>
        <div className={s.routeGrid}>
          {dashboardRoutes
            .filter((route) => route.id !== "overview")
            .map((route) => {
              const Icon = route.icon;

              return (
                <Link key={route.id} className={s.routeCard} href={route.href}>
                  <span className={s.routeIcon}>
                    <Icon aria-hidden="true" size={18} strokeWidth={2.1} />
                  </span>
                  <span>
                    <strong>{route.label}</strong>
                    <small>{route.description}</small>
                  </span>
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={2.1} />
                </Link>
              );
            })}
        </div>
      </section>

      <section className={s.dashboardMetrics} aria-label="Dashboard health">
        <article>
          <span>Token catalog</span>
          <strong>{tokenCatalog.length}</strong>
          <small>tracked variables</small>
        </article>
        <article>
          <span>Color tokens</span>
          <strong>{colorTokenCatalog.length}</strong>
          <small>resolved for tools</small>
        </article>
        <article>
          <span>Missing tokens</span>
          <strong>{missingCount}</strong>
          <small>{missingCount === 0 ? "clear" : "needs review"}</small>
        </article>
        <article>
          <span>Routes</span>
          <strong>{dashboardRoutes.length + 1}</strong>
          <small>including preview</small>
        </article>
      </section>

      <section className={s.splitBand}>
        <div>
          <p className={s.sectionEyebrow}>Operating model</p>
          <h2>Token first, component second</h2>
          <p>
            Nejdřív se kontroluje zdrojová proměnná a kontrast. Teprve potom se
            mění komponenta nebo veřejná sekce. Díky tomu veřejný web zůstává
            stabilní a design system má měřitelný stav.
          </p>
          <div className={s.inlineActions}>
            <Link className={s.primaryAction} href="/design-language/tools/">
              <SlidersHorizontal aria-hidden="true" size={16} />
              Otevřít tools
            </Link>
            <Link className={s.secondaryAction} href="/design-language/system-preview/">
              <Eye aria-hidden="true" size={16} />
              System preview
            </Link>
          </div>
        </div>
        <div className={s.workflowList}>
          {[
            "Audit tokenu",
            "Kontrastní kontrola",
            "Surface kompozice",
            "Komponentní kontrakt",
          ].map((step, index) => (
            <div key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FoundationsRoute({ tokenValues }: { tokenValues: TokenRuntimeMap }) {
  return (
    <div className={s.routeStack}>
      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Foundation palette</p>
          <h2>Čtyři zdrojové barvy</h2>
          <p>
            Paleta je úzká záměrně: jeden akcent, jedna důvěrová hloubka,
            jedna čitelná plocha a jeden cinematický základ.
          </p>
        </div>
        <div className={s.foundationGrid}>
          {foundationColors.map((color) => (
            <article key={color.token} className={s.foundationCard}>
              <div
                className={s.swatch}
                style={cssVars({
                  "--swatch-bg": cssVarRef(color.token, color.hex),
                })}
                aria-hidden="true"
              />
              <div>
                <span>{color.name}</span>
                <h3 translate="no">{color.token}</h3>
                <p>{color.role}</p>
                <dl>
                  <div>
                    <dt>Declared</dt>
                    <dd>{tokenRuntime(tokenValues, color.token).declared}</dd>
                  </div>
                  <div>
                    <dt>Resolved</dt>
                    <dd>{tokenRuntime(tokenValues, color.token).resolved}</dd>
                  </div>
                </dl>
                <small>{color.note}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <TokenTable
        copyLabel="Copy token"
        heading="Foundation aliases"
        scope="foundation"
        tokenValues={tokenValues}
      />
    </div>
  );
}

function SurfaceSpecimen({
  children,
  surface,
  tokenValues,
}: {
  children?: ReactNode;
  surface: SurfaceRecipe;
  tokenValues: TokenRuntimeMap;
}) {
  const runtime = tokenRuntime(tokenValues, surface.token);
  const resolved = runtime.resolved === "not read"
    ? surface.expectedResolved
    : runtime.resolved;

  return (
    <article
      className={s.surfaceSpecimen}
      data-surface-token={surface.token}
      data-surface-tone={surface.tone}
      style={cssVars({
        "--surface-specimen-bg": cssVarRef(
          surface.token,
          surface.expectedResolved
        ),
        "--surface-specimen-edge": cssVarRef(
          surface.edge,
          "var(--border-subtle)"
        ),
      })}
    >
      <div className={s.surfaceSpecimenHeader}>
        <span>{surface.label}</span>
        <h3 translate="no">{surface.token}</h3>
        <p>{surface.role}</p>
      </div>
      <dl className={s.surfaceSpecimenFacts}>
        <div>
          <dt>Surface role</dt>
          <dd>{surface.role}</dd>
        </div>
        <div>
          <dt>Contrast tone</dt>
          <dd translate="no">{surface.tone}</dd>
        </div>
        <div>
          <dt>Source chain</dt>
          <dd translate="no">{surface.source}</dd>
        </div>
        <div>
          <dt>Text contract</dt>
          <dd translate="no">{surface.text}</dd>
        </div>
        <div>
          <dt>Edge contract</dt>
          <dd translate="no">{surface.edge}</dd>
        </div>
        <div>
          <dt>Authored</dt>
          <dd translate="no">{runtime.declared}</dd>
        </div>
        <div>
          <dt>Resolved</dt>
          <dd data-surface-resolved={surface.token} translate="no">{resolved}</dd>
        </div>
        <div>
          <dt>Use</dt>
          <dd>{surface.usage}</dd>
        </div>
      </dl>
      {children ? <div className={s.surfaceNestedProof}>{children}</div> : null}
    </article>
  );
}

const contrastFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function SurfaceToneContractCard({ contract }: { contract: SurfaceToneContract }) {
  const contractRef = useRef<HTMLElement>(null);
  const [scopedTokenValues, setScopedTokenValues] =
    useState<TokenRuntimeMap>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!contractRef.current) return;
      setScopedTokenValues(readTokenRuntimeMapFromElement(contractRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const representativeSurface = contract.surfaceTokens[0];
  const resolvedSurfaces = contract.surfaceTokens.map((token) => ({
    token,
    resolved: tokenRuntime(scopedTokenValues, token).resolved,
  }));

  return (
    <article
      ref={contractRef}
      className={s.surfaceToneContract}
      data-tone-surfaces={contract.surfaceTokens.join(" ")}
      data-surface-tone={contract.id}
      data-tone-contract={contract.id}
      style={cssVars({
        "--tone-contract-bg": cssVarRef(
          representativeSurface,
          "var(--surface-card-dark)"
        ),
      })}
    >
      <header>
        <span>{contract.label} contract</span>
        <h3 translate="no">data-surface-tone=&quot;{contract.id}&quot;</h3>
        <p translate="no">Surfaces: {contract.surfaceTokens.join(", ")}</p>
      </header>
      <div className={s.surfaceToneRows}>
        {contract.rows.map((row) => {
          const runtime = tokenRuntime(scopedTokenValues, row.alias);
          const isResolved = runtime.resolved !== "not read";
          const ratios = isResolved
            ? resolvedSurfaces.flatMap((surface) => {
                if (surface.resolved === "not read") return [];
                const ratio = contrastRatio(runtime.resolved, surface.resolved);
                return ratio === null ? [] : [{ ...surface, ratio }];
              })
            : [];
          const minimum = ratios.reduce<(typeof ratios)[number] | null>(
            (lowest, candidate) =>
              lowest === null || candidate.ratio < lowest.ratio
                ? candidate
                : lowest,
            null
          );

          return (
            <div
              className={s.surfaceToneRow}
              data-contract-alias={row.alias}
              key={row.alias}
            >
              <strong>{row.label}</strong>
              <code translate="no">{row.alias}</code>
              <small translate="no">maps to {row.target}</small>
              <span data-contract-resolved translate="no">
                {isResolved ? runtime.resolved : "resolving…"}
              </span>
              <b data-contract-minimum>
                {minimum === null
                  ? "Minimum pending…"
                  : `Minimum ${contrastFormatter.format(minimum.ratio)}:1`}
              </b>
              <i translate="no">
                {minimum === null
                  ? `across ${contract.surfaceTokens.length} surfaces`
                  : `across ${contract.surfaceTokens.length} surfaces · ${minimum.token}`}
              </i>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SurfacesRoute({ tokenValues }: { tokenValues: TokenRuntimeMap }) {
  return (
    <div className={s.routeStack}>
      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Surface map</p>
          <h2>Surface hierarchie podle funkce</h2>
          <p>
            Každá plocha má textový kontrakt, edge kontrakt a jasné použití.
            Žádná plocha neslouží jako náhodná dekorace.
          </p>
        </div>
        <div className={s.surfaceFamilyGrid}>
          {surfaceFamilies.map((family) => {
            const familySurfaces = surfaceRecipes.filter(
              (surface) => surface.family === family.id
            );
            const [parent, child] = familySurfaces;

            return (
              <section
                className={s.surfaceFamily}
                data-surface-family={family.id}
                key={family.id}
              >
                <header className={s.surfaceFamilyHeader}>
                  <span>{family.label}</span>
                  <p>{family.description}</p>
                </header>
                {family.layout === "nested" && parent && child ? (
                  <SurfaceSpecimen surface={parent} tokenValues={tokenValues}>
                    <SurfaceSpecimen surface={child} tokenValues={tokenValues} />
                  </SurfaceSpecimen>
                ) : (
                  <div className={s.surfaceActionVariants}>
                    {familySurfaces.map((surface) => (
                      <SurfaceSpecimen
                        key={surface.token}
                        surface={surface}
                        tokenValues={tokenValues}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Surface contract</p>
          <h2>Úplné kontrakty pro Dark, Light a Action</h2>
          <p>
            Surface role určuje účel plochy. Contrast tone nezávisle mapuje
            lokální textové, edge a focus aliasy pro komponenty.
          </p>
        </div>
        <div className={s.surfaceToneGrid}>
          {surfaceToneContracts.map((contract) => (
            <SurfaceToneContractCard contract={contract} key={contract.id} />
          ))}
        </div>
        <div className={s.surfaceEdgePolicy}>
          <div>
            <span>Surface outline</span>
            <code translate="no">--surface-*-edge</code>
            <p>Own perimeter of its matching surface only. Components never consume it.</p>
          </div>
          <div>
            <span>Nested structure</span>
            <code translate="no">
              --border-subtle / --border-default / --border-emphasis
            </code>
            <p>Passive grouping and hierarchy inside the active contrast tone.</p>
          </div>
          <div>
            <span>Control and state</span>
            <code translate="no">--border-control / --border-state</code>
            <p>
              Interactive boundary or persistent state indicator with at least 3:1
              contrast across the complete tone family.
            </p>
          </div>
          <strong>
            Structural border aliases must never be the only indicator of an
            interactive control or state.
          </strong>
        </div>
      </section>
    </div>
  );
}

function getTypographySurfaceToken(tone: TypographySurfaceTone) {
  return (
    typographySurfaceOptions.find((option) => option.id === tone)?.token ??
    "--surface-card-dark"
  );
}

function TypeRoleSample({ role }: { role: TypographyRole }) {
  if (role.id === "display") {
    return (
      <h3 className={`${s.typeSample} ${s.displayExample}`} data-type-role="display">
        <span className={s.accentPhrase}>Nejdřív přehled.</span>
        {" "}
        <span className={s.followingPhrase}>Potom jasný plán.</span>
      </h3>
    );
  }

  if (role.id === "heading") {
    return (
      <h3 className={s.typeSample} data-type-role="heading">
        {role.sample}
      </h3>
    );
  }

  if (role.id === "lead") {
    return (
      <p className={`${s.typeSample} ${s.leadExample}`} data-type-role="lead">
        {role.sample}
      </p>
    );
  }

  if (role.id === "metadata") {
    const segments = role.metadataSegments;

    return (
      <div className={`${s.typeSample} ${s.metadataExample}`} data-type-role="metadata">
        <time
          className={s.metadataPrimary}
          dateTime={segments?.updatedDateTime ?? "2026-07-10T20:27:00+02:00"}
        >
          {segments?.updatedLabel ?? role.sample}
        </time>
        {" "}
        <span className={s.metadataSecondary}>
          {segments?.readingTime ?? "6 minut čtení"}
        </span>
      </div>
    );
  }

  if (role.id === "eyebrow") {
    return (
      <p
        className={`${s.typeSample} ${s.eyebrowExample}`}
        data-type-role="eyebrow"
        data-text-transform={role.textTransform}
      >
        {role.sample}
      </p>
    );
  }

  return (
    <p className={s.typeSample} data-type-role={role.id}>
      {role.sample}
    </p>
  );
}

function TypeMetricList({ role }: { role: TypographyRole }) {
  const metrics = [
    ["Size", role.metrics.size],
    ["Line height", role.metrics.lineHeight],
    ["Weight", role.metrics.weight],
    ["Tracking", role.metrics.tracking],
    role.metrics.case ? ["Case", role.metrics.case] : null,
    role.metrics.measure ? ["Measure", role.metrics.measure] : null,
  ].filter(Boolean) as Array<[string, string]>;

  return (
    <dl className={s.typeMetrics}>
      {metrics.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TypeTokenList({
  role,
  tokenValues,
}: {
  role: TypographyRole;
  tokenValues: TokenRuntimeMap;
}) {
  return (
    <div className={s.typeTokenList} aria-label={`${role.label} tokens`}>
      {role.tokens.map((token) => (
        <div key={token}>
          <code translate="no">{token}</code>
          <small>{tokenRuntime(tokenValues, token).declared}</small>
        </div>
      ))}
    </div>
  );
}

function ExampleStatus({
  state,
  children,
}: {
  state: "correct" | "incorrect";
  children: ReactNode;
}) {
  return (
    <span
      className={[
        s.exampleStatus,
        state === "correct"
          ? s.exampleStatusCorrect
          : s.exampleStatusIncorrect,
      ]
        .filter(Boolean)
        .join(" ")}
      data-state={state}
    >
      <span aria-hidden="true">{state === "correct" ? "✓" : "×"}</span>
      {children}
    </span>
  );
}

function TypePairingPreview({ pairing }: { pairing: TypePairing }) {
  if (pairing.id === "display") {
    return (
      <div className={s.pairingPreview}>
        <p className={s.pairingEyebrow}>Osobní finance</p>
        <h3 className={s.pairingDisplay}>
          <span className={s.accentPhrase}>Nejdřív přehled.</span>
          {" "}
          <span className={s.basePhrase}>Potom jasný plán.</span>
        </h3>
        <p className={s.pairingLead}>
          Získáte jasný rámec rozhodnutí bez produktového tlaku.
        </p>
        <div className={s.pairingActions} aria-label="Ukázka CTA akcí">
          <Button href="/ziskat-prehled/" size="sm" variant="primary">
            Získat přehled
          </Button>
          <Button href="/jak-pracuji/" size="sm" variant="secondary">
            Jak to probíhá
          </Button>
        </div>
      </div>
    );
  }

  if (pairing.id === "section") {
    return (
      <div className={s.pairingPreview}>
        <p className={s.pairingEyebrow}>Postup spolupráce</p>
        <h3 className={s.pairingHeading}>Rozhodnutí stojí na pořadí priorit</h3>
        <p className={s.pairingBody}>
          Nejdřív pojmenujeme, co má v rozpočtu pevné místo. Potom oddělíme
          kroky, které dávají smysl hned, od těch, které mohou počkat.
        </p>
      </div>
    );
  }

  if (pairing.id === "article") {
    return (
      <div className={s.pairingPreview}>
        <div className={`${s.pairingMeta} ${s.pairingMetadata}`}>
          <time className={s.metadataPrimary} dateTime="2026-07-10T20:27:00+02:00">
            Aktualizováno před 3 minutami
          </time>
          {" "}
          <span className={s.metadataSecondary}>6 minut čtení</span>
        </div>
        <h3 className={s.pairingHeading}>Jak číst vlastní finanční rezervu</h3>
        <p className={s.pairingLead}>
          Rezerva není jen částka na účtu. Je to čas, který získáte pro klidné
          rozhodnutí.
        </p>
        <p className={s.pairingBody}>
          V praxi sledujeme délku výpadku příjmu, pravidelné závazky a plány,
          které by nebylo dobré přerušit. Teprve z toho vzniká konkrétní cílová
          částka.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pairingPreview}>
      <p className={s.pairingMeta}>Vstupní screening</p>
      <h3 className={s.pairingHeading}>Co právě řešíte?</h3>
      <p className={s.pairingBody}>
        Krátká karta může vést na hypotéku, investice nebo pojištění, ale pořád
        musí zůstat čitelná jako podřízená část stránky.
      </p>
    </div>
  );
}

function TypographyRoute({ tokenValues }: { tokenValues: TokenRuntimeMap }) {
  const [tone, setTone] = useState<TypographySurfaceTone>("dark");
  const surfaceToken = getTypographySurfaceToken(tone);
  const activeSurface =
    typographySurfaceOptions.find((option) => option.id === tone) ??
    typographySurfaceOptions[0];
  const emphasisDemoTone: TypographySurfaceTone =
    tone === "action" ? "dark" : tone;
  const emphasisDemoSurfaceToken = getTypographySurfaceToken(emphasisDemoTone);
  const isActionSurfaceContext = tone === "action";

  return (
    <div className={s.routeStack}>
      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Type roles</p>
          <h2>Role-first typografický systém</h2>
          <p>
            Každá role má vlastní metriku, rytmus a doporučenou délku řádku.
            Přepínač mění pouze surface a sémantické foreground aliasy.
          </p>
        </div>
        <div className={s.segmentedControl} aria-label="Surface tone">
          {typographySurfaceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={tone === option.id}
              onClick={() => setTone(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={s.surfaceNote}>
          Surface: <code translate="no">{activeSurface.token}</code> ·{" "}
          {activeSurface.note}
        </p>
        <div
          className={s.typographyPreview}
          data-surface-tone={tone}
          style={cssVars({
            "--preview-bg": cssVarRef(surfaceToken, "var(--surface-card-dark)"),
          })}
        >
          {typographyRoles.map((role) => (
            <article
              className={[
                s.typeRoleCard,
                role.id === "display" ? s.displayRoleCard : "",
                role.id === "lead" ? s.leadRoleCard : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-type-role={role.id}
              key={role.label}
            >
              <div className={s.typeRoleHeader}>
                <span className={s.typeRoleLabel}>{role.label}</span>
                <code translate="no">{role.tokenPrefix}</code>
              </div>
              <div className={s.typeRoleBody}>
                <div className={s.typeRoleContent}>
                  <TypeRoleSample role={role} />
                  <div className={s.typeRoleCopy}>
                    <p className={s.roleDescription}>{role.purpose}</p>
                    <small className={s.usageGuidance}>{role.usage}</small>
                  </div>
                </div>
                <div className={s.typeRoleSpecs}>
                  <TypeMetricList role={role} />
                  <TypeTokenList role={role} tokenValues={tokenValues} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Lime emphasis rule</p>
          <h2 className={s.sectionTitle}>
            <span className={s.accent}>Lime</span>{" "}
            zvýrazní jednu významovou frázi
          </h2>
          <p>
            Accent nesmí automaticky obarvit celý display nebo heading. Slouží
            jako rozhodovací signál v konkrétním místě věty.
          </p>
          {isActionSurfaceContext ? (
            <p className={s.actionSurfaceNote}>
              Na action surface se lime nepoužívá jako textový akcent. Lime už
              tvoří samotnou plochu <code translate="no">--surface-action</code>,
              proto text používá foreground{" "}
              <code translate="no">--text-on-action-primary</code>.
            </p>
          ) : null}
        </div>
        <div className={s.limeRuleGrid}>
          <article
            className={`${s.limeRuleCard} ${s.correctCard}`}
            data-surface-tone={emphasisDemoTone}
            style={cssVars({
              "--preview-bg": cssVarRef(
                emphasisDemoSurfaceToken,
                "var(--surface-card-dark)"
              ),
            })}
          >
            <ExampleStatus state="correct">Správně</ExampleStatus>
            <h3 className={s.exampleHeading}>
              <span className={s.accentPhrase}>Nejdřív přehled.</span>
              {" "}
              <span className={s.basePhrase}>Potom jasný plán.</span>
            </h3>
            <p className={s.exampleDescription}>
              Zvýrazněná je pouze významová část, věta zůstává jeden celek.
            </p>
          </article>
          <article
            className={`${s.limeRuleCard} ${s.incorrectCard}`}
            data-surface-tone={emphasisDemoTone}
            style={cssVars({
              "--preview-bg": cssVarRef(
                emphasisDemoSurfaceToken,
                "var(--surface-card-dark)"
              ),
            })}
          >
            <ExampleStatus state="incorrect">Chybně</ExampleStatus>
            <h3 className={`${s.exampleHeading} ${s.incorrectExampleHeading}`}>
              Nejdřív přehled. Potom jasný plán.
            </h3>
            <p className={s.exampleDescription}>
              Celý nadpis v lime ztrácí hierarchii a začne soutěžit s CTA.
            </p>
          </article>
        </div>
      </section>

      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Reading context</p>
          <h2>Čtecí vrstva v reálné kompozici</h2>
          <p>
            Delší obsah ověřuje rozdíl mezi headingem, leadem, body textem,
            odkazem, zvýrazněním a metadaty.
          </p>
        </div>
        <article
          className={s.readingContext}
          data-surface-tone={tone}
          style={cssVars({
            "--preview-bg": cssVarRef(surfaceToken, "var(--surface-card-dark)"),
          })}
        >
          <div className={s.readingIntro}>
            <div className={s.readingTitleGroup}>
              <p className={s.readingEyebrow}>Osobní finanční plán</p>
              <h3 className={s.readingHeading}>
                Než vybereme produkt, musí být jasné pořadí rozhodnutí
              </h3>
            </div>
            <p className={s.readingLead}>
              Smyslem prvního rozhovoru není prodat řešení, ale pochopit, které
              části financí drží pohromadě a kde vzniká největší tlak.
            </p>
          </div>
          <div className={s.readingBodyGroup}>
            <p className={s.readingBody}>
              Začínáme příjmy, rezervou, pravidelnými závazky a časovým horizontem.
              Díky tomu vidíte, co je potřeba řešit hned a co má zůstat jen jako
              kontrolní bod pro pozdější rozhodnutí.
            </p>
            <p className={s.readingBody}>
              Teprve potom dává smysl porovnat konkrétní varianty hypotéky,
              investice nebo pojištění.{" "}
              <strong>
                Priorita není nejvýnosnější produkt, ale stabilní plán, který
                unesete i při změně příjmu.
              </strong>
            </p>
            <p className={s.readingBody}>
              Pokud si chcete ověřit, kde začít, projděte krátký{" "}
              <Link className={s.readingLink} href="/ziskat-prehled/">
                vstupní kontakt
              </Link>{" "}
              a navážeme na to konkrétním screeningem.
            </p>
          </div>
          <footer className={s.readingMetadata}>
            <time className={s.metadataPrimary} dateTime="2026-07-10T20:27:00+02:00">
              Aktualizováno před 3 minutami
            </time>
            {" "}
            <span className={s.metadataSecondary}>6 minut čtení</span>
          </footer>
        </article>
      </section>

      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Type pairings</p>
          <h2>Povolené typografické kompozice</h2>
          <p>
            Kombinace používají stejnou spacing škálu a stejnou metriku rolí.
            Liší se pouze účelem a pořadím textových úrovní.
          </p>
        </div>
        <div className={s.typePairingGrid}>
          {typePairings.map((pairing) => (
            <article
              className={s.typePairingCard}
              data-type-pairing={pairing.id}
              data-surface-tone={tone}
              key={pairing.id}
              style={cssVars({
                "--preview-bg": cssVarRef(surfaceToken, "var(--surface-card-dark)"),
              })}
            >
              <div className={s.typePairingIntro}>
                <span className={s.typeRoleLabel}>{pairing.label}</span>
                <small>{pairing.description}</small>
              </div>
              <div className={s.typePairingSpecimen}>
                <TypePairingPreview pairing={pairing} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function tokenIsMissing(runtime: TokenRuntimeValue) {
  return runtime.declared === "not read" || runtime.declared === "not defined";
}

function ContractTokenList({
  rows,
  tokenValues,
}: {
  rows: ContractTokenRow[];
  tokenValues: TokenRuntimeMap;
}) {
  return (
    <dl className={s.contractTokenList}>
      {rows.map((row) => {
        const runtime = tokenRuntime(tokenValues, row.token);
        const missing = tokenIsMissing(runtime);
        const foregroundToken = row.foregroundToken ?? "--text-primary";

        return (
          <div
            className={[
              s.contractTokenRow,
              missing ? s.contractTokenMissing : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={`${row.label}-${row.token}`}
          >
            <dt>{row.label}</dt>
            <dd>
              <span className={s.contractTokenMeta}>
                <code translate="no">{row.token}</code>
                <small>
                  {missing ? "MISSING TOKEN" : runtime.declared}
                  {!missing && runtime.resolved !== runtime.declared
                    ? ` -> ${runtime.resolved}`
                    : ""}
                </small>
              </span>
              {row.swatch ? (
                <span
                  aria-hidden="true"
                  className={s.contractSwatch}
                  data-swatch-kind={row.swatch}
                  style={cssVars({
                    "--contract-swatch-bg": cssVarRef(
                      row.token,
                      "var(--surface-card-dark)"
                    ),
                    "--contract-swatch-fg": cssVarRef(
                      foregroundToken,
                      "var(--text-primary)"
                    ),
                  })}
                >
                  {row.swatch === "fill" ? "Aa" : ""}
                </span>
              ) : null}
            </dd>
            {row.note ? <p>{row.note}</p> : null}
          </div>
        );
      })}
    </dl>
  );
}

function ActionStateCard({
  action,
  state,
  tokenValues,
}: {
  action: ActionContract;
  state: ActionStateContract;
  tokenValues: TokenRuntimeMap;
}) {
  const demoProps = state.demoState
    ? { "data-demo-state": state.demoState }
    : {};

  return (
    <article className={s.actionStateCard} data-action-state={state.id}>
      <div className={s.stateCardHeader}>
        <span className={s.stateCardLabel}>{state.label}</span>
      </div>
      <div className={s.controlSpecimen}>
        <Button
          disabled={state.disabled}
          size="sm"
          type="button"
          variant={action.variant}
          {...demoProps}
        >
          {action.specimen}
        </Button>
      </div>
      <ContractTokenList rows={state.tokens} tokenValues={tokenValues} />
      {state.note ? <p className={s.stateCardNote}>{state.note}</p> : null}
    </article>
  );
}

function SelectionChip({
  demoState,
  disabled = false,
  isStatic = false,
  onToggle,
  selected,
  testId,
}: {
  demoState?: SelectionDemoState;
  disabled?: boolean;
  isStatic?: boolean;
  onToggle?: () => void;
  selected: boolean;
  testId?: string;
}) {
  const demoProps = demoState ? { "data-demo-state": demoState } : {};

  return (
    <button
      aria-pressed={selected}
      className={[s.selectionChip, isStatic ? s.staticSelectionChip : ""]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
      disabled={disabled}
      onClick={onToggle}
      tabIndex={isStatic ? -1 : undefined}
      type="button"
      {...demoProps}
    >
      <Check
        aria-hidden="true"
        className={s.selectionIndicator}
        data-selection-indicator="checkmark"
        focusable="false"
        size={12}
        strokeWidth={2.5}
      />
      <span className={s.selectionChipLabel} data-label="Hypotéka">
        Hypotéka
      </span>
    </button>
  );
}

function SelectionStateCard({
  state,
  tokenValues,
}: {
  state: SelectionStateContract;
  tokenValues: TokenRuntimeMap;
}) {
  return (
    <article
      className={s.actionStateCard}
      data-selection-persistence={state.persistence}
      data-selection-state={state.id}
    >
      <div className={s.stateCardHeader}>
        <span className={s.stateCardLabel}>{state.label}</span>
      </div>
      <div
        className={s.selectionSpecimen}
        role="group"
        aria-label={`${state.label} selection specimen`}
      >
        <SelectionChip
          demoState={state.demoState}
          disabled={state.interaction === "disabled"}
          isStatic
          selected={state.selected}
        />
      </div>
      <ContractTokenList rows={state.tokens} tokenValues={tokenValues} />
      <p className={s.stateCardNote}>{state.note}</p>
    </article>
  );
}

function ActionsRoute({ tokenValues }: { tokenValues: TokenRuntimeMap }) {
  const [surfaceTone, setSurfaceTone] = useState<ActionSurface>("dark");
  const [liveSelectionSelected, setLiveSelectionSelected] = useState(false);
  const surfacePreviewRef = useRef<HTMLElement>(null);
  const [surfaceTokenValues, setSurfaceTokenValues] =
    useState<TokenRuntimeMap>({});
  const activeSurface = actionSurfaceConfig[surfaceTone];
  const previewTokenValues =
    Object.keys(surfaceTokenValues).length > 0 ? surfaceTokenValues : tokenValues;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!surfacePreviewRef.current) return;

      setSurfaceTokenValues(
        readTokenRuntimeMapFromElement(surfacePreviewRef.current)
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [surfaceTone, tokenValues]);

  return (
    <div className={s.routeStack}>
      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>CTA state matrix</p>
          <h2>Lime je rozhodovací signál</h2>
          <p>
            Akcent patří na rozhodnutí, aktuální stav a keyboard focus. Nepatří
            na ambientní dekorace ani velké pasivní plochy.
          </p>
        </div>
        <div className={s.segmentedControl} aria-label="Action surface">
          {actionSurfaceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={surfaceTone === option.id}
              onClick={() => setSurfaceTone(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={s.surfaceNote}>
          Surface: <code translate="no">{activeSurface.surfaceToken}</code> ·{" "}
          {activeSurface.note}
        </p>
        <section
          ref={surfacePreviewRef}
          className={s.actionSurfacePreview}
          data-surface-tone={surfaceTone}
          data-testid="action-surface-preview"
          style={cssVars({
            "--action-demo-surface": cssVarRef(
              activeSurface.surfaceToken,
              "var(--surface-card-dark)"
            ),
          })}
        >
          <div className={s.actionSectionStack}>
            <section className={s.actionSubsection} aria-labelledby="cta-states-title">
              <div className={s.actionSubsectionHeader}>
                <p className={s.actionGroupEyebrow}>CTA states</p>
                <h3 id="cta-states-title">Okamžité akce</h3>
                <p>
                  Primary a secondary CTA spouští akci. Dokumentace používá
                  skutečný Button komponent a statické demo stavy přes atribut.
                </p>
              </div>
              <div className={s.actionComparisonGrid}>
                {actionContracts.map((action) => (
                  <article className={s.actionCard} key={action.id}>
                    <div className={s.actionCardHeader}>
                      <span className={s.actionCardEyebrow}>{action.label}</span>
                      <h4 translate="no">{action.token}</h4>
                      <p>{action.purpose}</p>
                    </div>
                    <div className={s.actionStateGrid}>
                      {action.states.map((state) => (
                        <ActionStateCard
                          action={action}
                          key={`${action.id}-${state.id}`}
                          state={state}
                          tokenValues={previewTokenValues}
                        />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section
              className={s.actionSubsection}
              aria-labelledby="selection-states-title"
            >
              <div className={s.actionSubsectionHeader}>
                <p className={s.actionGroupEyebrow}>Selection states</p>
                <h3 id="selection-states-title">Přetrvávající volba</h3>
                <p>
                  Selection není CTA. Ukazuje aktuální polohu nebo vybraný filtr a
                  musí být rozpoznatelný i podle indikátoru, ne pouze barvou.
                </p>
              </div>
              <div className={s.selectionLivePreview}>
                <div className={s.selectionLiveHeader}>
                  <span className={s.actionGroupEyebrow}>Live preview</span>
                  <p>
                    Filter toggle používá nativní button a stav{" "}
                    <code translate="no">aria-pressed</code>.
                  </p>
                </div>
                <div
                  className={s.selectionLiveStage}
                  role="group"
                  aria-label="Interaktivní výběr oblasti"
                >
                  <SelectionChip
                    onToggle={() =>
                      setLiveSelectionSelected((selected) => !selected)
                    }
                    selected={liveSelectionSelected}
                    testId="selection-live-chip"
                  />
                  <span aria-live="polite" className={s.selectionLiveStatus}>
                    {liveSelectionSelected ? "Selected" : "Unselected"}
                  </span>
                </div>
              </div>
              <div className={s.selectionStateGroups}>
                {selectionStateGroups.map((group) => (
                  <section
                    aria-labelledby={`selection-${group.id}-title`}
                    className={s.selectionStateGroup}
                    key={group.id}
                  >
                    <div className={s.selectionStateGroupHeader}>
                      <h4 id={`selection-${group.id}-title`}>{group.label}</h4>
                      <span>{group.states.length} interaction states</span>
                    </div>
                    <div className={s.selectionStateGrid}>
                      {group.states.map((state) => (
                        <SelectionStateCard
                          key={state.id}
                          state={state}
                          tokenValues={previewTokenValues}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </div>
  );
}

function BorderToneContractCard({ contract }: { contract: BorderToneContract }) {
  const contractRef = useRef<HTMLElement>(null);
  const [scopedTokenValues, setScopedTokenValues] =
    useState<TokenRuntimeMap>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!contractRef.current) return;
      setScopedTokenValues(readTokenRuntimeMapFromElement(contractRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <article
      ref={contractRef}
      className={s.borderToneContract}
      data-border-tone={contract.id}
      data-surface-tone={contract.id}
      data-tone-surfaces={contract.surfaceTokens.join(" ")}
      style={cssVars({
        "--border-contract-bg": cssVarRef(
          contract.representativeSurface,
          "var(--surface-card-dark)"
        ),
      })}
    >
      <header>
        <span>{contract.label}</span>
        <h3 translate="no">data-surface-tone=&quot;{contract.id}&quot;</h3>
        <p translate="no">{contract.surfaceTokens.join(", ")}</p>
      </header>

      <div className={s.borderToneRows}>
        {borderLevels.map((level) => {
          const sourceToken = contract.sourceTokens[level.id];
          const sourceRuntime = tokenRuntime(scopedTokenValues, sourceToken);
          const aliasRuntime = tokenRuntime(scopedTokenValues, level.alias);
          const minimum = minimumContrastAcrossSurfaces(
            aliasRuntime.resolved,
            contract.surfaceTokens,
            scopedTokenValues
          );

          return (
            <div
              className={s.borderToneRow}
              data-border-level={level.id}
              key={level.id}
            >
              <div className={s.borderToneRowHeader}>
                <strong>{level.label}</strong>
                <code translate="no">{sourceToken}</code>
                <small translate="no">public alias {level.alias}</small>
              </div>
              <i
                aria-hidden="true"
                className={s.borderLineSample}
                style={cssVars({
                  "--border-sample": cssVarRef(
                    level.alias,
                    "var(--border-subtle)"
                  ),
                })}
              />
              <dl>
                <div>
                  <dt>Authored</dt>
                  <dd translate="no">{sourceRuntime.declared}</dd>
                </div>
                <div>
                  <dt>Resolved</dt>
                  <dd data-border-resolved translate="no">
                    {aliasRuntime.resolved}
                  </dd>
                </div>
                <div>
                  <dt>Family minimum</dt>
                  <dd data-border-minimum translate="no">
                    {minimum === null
                      ? "pending…"
                      : `${contrastFormatter.format(minimum.ratio)}:1 · ${minimum.token}`}
                  </dd>
                </div>
              </dl>
              <p>{level.purpose}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function FocusToneContractCard({ contract }: { contract: BorderToneContract }) {
  const contractRef = useRef<HTMLElement>(null);
  const [scopedTokenValues, setScopedTokenValues] =
    useState<TokenRuntimeMap>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!contractRef.current) return;
      setScopedTokenValues(readTokenRuntimeMapFromElement(contractRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const focusRuntime = tokenRuntime(scopedTokenValues, "--focus-ring");
  const minimum = minimumContrastAcrossSurfaces(
    focusRuntime.resolved,
    contract.surfaceTokens,
    scopedTokenValues
  );

  return (
    <article
      ref={contractRef}
      className={s.focusToneContract}
      data-focus-tone={contract.id}
      data-surface-tone={contract.id}
      data-tone-surfaces={contract.surfaceTokens.join(" ")}
      style={cssVars({
        "--focus-contract-bg": cssVarRef(
          contract.representativeSurface,
          "var(--surface-card-dark)"
        ),
      })}
    >
      <header>
        <span>{contract.label}</span>
        <code translate="no">{contract.focusToken}</code>
        <small translate="no">public alias --focus-ring</small>
      </header>

      <div className={s.focusControlStage}>
        <button className={s.focusControl} data-focus-control type="button">
          Focus-visible
        </button>
      </div>

      <dl>
        <div>
          <dt>Resolved</dt>
          <dd data-focus-resolved translate="no">
            {focusRuntime.resolved}
          </dd>
        </div>
        <div>
          <dt>Family minimum</dt>
          <dd data-focus-minimum translate="no">
            {minimum === null
              ? "pending…"
              : `${contrastFormatter.format(minimum.ratio)}:1 · ${minimum.token}`}
          </dd>
        </div>
        <div>
          <dt>Geometry</dt>
          <dd translate="no">
            {tokenRuntime(scopedTokenValues, "--focus-width-standard").declared} / {" "}
            {tokenRuntime(scopedTokenValues, "--focus-offset-standard").declared}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function BordersRoute() {
  return (
    <div className={s.routeStack}>
      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Structural borders</p>
          <h2>Oddělení bez mlhy a glow efektů</h2>
          <p>
            Pasivní okraje vytváří čitelnou hierarchii uvnitř každé surface.
            Veřejné aliasy se překládají lokálně pomocí data-surface-tone.
          </p>
        </div>
        <div className={s.borderToneGrid}>
          {borderToneContracts.map((contract) => (
            <BorderToneContractCard contract={contract} key={contract.id} />
          ))}
        </div>
      </section>

      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Edge semantics</p>
          <h2>Tři hranice, tři odpovědnosti</h2>
          <p>
            Surface perimeter, vnitřní struktura a funkční stav nesdílejí jeden
            zaměnitelný border kontrakt.
          </p>
        </div>
        <div className={s.borderSemanticGrid}>
          <article data-edge-semantic="surface">
            <span>Surface edge</span>
            <code translate="no">--surface-*-edge</code>
            <p>Vlastní obrys konkrétní surface. Komponenty jej nikdy přímo nepoužívají.</p>
          </article>
          <article data-edge-semantic="structural">
            <span>Structural border</span>
            <code translate="no">
              --border-subtle / --border-default / --border-emphasis
            </code>
            <p>
              Pasivní oddělení uvnitř surface. Emphasis může stav podporovat,
              nikdy jej nenese samo.
            </p>
          </article>
          <article data-edge-semantic="functional">
            <span>Functional boundary</span>
            <code translate="no">--border-control / --border-state</code>
            <p>
              Hranice, která sama identifikuje control nebo stav, má minimálně
              3:1 proti každé surface daného tone.
            </p>
          </article>
        </div>
        <p className={s.borderSemanticRule}>
          Žádný structural border pod 3:1 není jediným indikátorem interaktivního
          controlu nebo stavu.
        </p>
      </section>

      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Focus contract</p>
          <h2>Focus je samostatný interakční signál</h2>
          <p>
            Skutečný control používá veřejný --focus-ring, šířku 2px a vnější
            offset 3px. Kontrast se počítá přes celou tone family.
          </p>
        </div>
        <div className={s.focusToneGrid}>
          {borderToneContracts.map((contract) => (
            <FocusToneContractCard contract={contract} key={contract.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ComponentsRoute({
  componentId,
  view,
}: {
  componentId?: string;
  view: ComponentsWorkspaceView;
}) {
  return <ComponentWorkspace componentId={componentId} view={view} />;
}

function CompositionsRoute() {
  const [query, setQuery] = useState("");
  const [activeFamily, setActiveFamily] = useState<(typeof familyFilterOptions)[number]["id"]>("all");
  const [status, setStatus] = useState<(typeof statusFilterOptions)[number]["id"]>("all");
  const [layer, setLayer] = useState<(typeof layerFilterOptions)[number]["id"]>("all");
  const [scope, setScope] = useState<(typeof scopeFilterOptions)[number]["id"]>("all");
  const [motion, setMotion] = useState<(typeof motionFilterOptions)[number]["id"]>("all");
  const [selectedId, setSelectedId] = useState<string>(getInitialCompositionId);
  const [activeSpecimenId, setActiveSpecimenId] = useState("");
  const [activeVisualContextId, setActiveVisualContextId] = useState("");
  const [detailScrollTargetId, setDetailScrollTargetId] = useState("");
  const compositionDetailRef = useRef<HTMLElement | null>(null);
  const compositionDetailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const deferredQuery = useDeferredValue(query);
  const compositionFixtureById = useMemo(
    () =>
      new Map(
        compositionFixtureCatalog.map((fixture) => [String(fixture.id), fixture])
      ),
    []
  );

  const filteredCompositions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return canonicalCompositionContracts.filter((composition) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        getCompositionSearchText(composition).includes(normalizedQuery);
      const matchesFamily =
        activeFamily === "all" || composition.meta.displayGroup === activeFamily;
      const matchesStatus =
        status === "all" || composition.meta.status === status;
      const matchesLayer = layer === "all" || composition.meta.layer === layer;
      const matchesScope = scope === "all" || composition.meta.scope === scope;
      const matchesMotion =
        motion === "all" || composition.motion.defaultPolicy === motion;

      return (
        matchesQuery &&
        matchesFamily &&
        matchesStatus &&
        matchesLayer &&
        matchesScope &&
        matchesMotion
      );
    });
  }, [activeFamily, deferredQuery, layer, motion, scope, status]);

  const selectedComposition =
    canonicalCompositionContracts.find(
      (composition) => composition.meta.id === selectedId
    ) ??
    filteredCompositions[0] ??
    canonicalCompositionContracts[0];
  const selectedSpecimens = selectedComposition?.examples ?? [];
  const activeSpecimen =
    selectedSpecimens.find((example) => example.id === activeSpecimenId) ??
    selectedSpecimens[0];
  const allowedVisualContexts = selectedComposition
    ? getAllowedVisualContexts(selectedComposition)
    : [];
  const defaultVisualContextId = getDefaultVisualContextId(activeSpecimen);
  const activeVisualContext =
    allowedVisualContexts.find((context) => context.id === activeVisualContextId) ??
    allowedVisualContexts.find((context) => context.id === defaultVisualContextId) ??
    allowedVisualContexts[0];
  const activeFixture = activeSpecimen
    ? compositionFixtureById.get(String(activeSpecimen.fixtureId))
    : undefined;

  const openCompositionDetail = useCallback((compositionId: string) => {
    setSelectedId(compositionId);
    setActiveSpecimenId("");
    setActiveVisualContextId("");
    updateCompositionHash(compositionId);
    setDetailScrollTargetId(compositionId);
  }, []);

  useEffect(() => {
    const selectHashComposition = () => {
      const hashCompositionId = getCompositionIdFromHash();

      if (isKnownCompositionId(hashCompositionId)) {
        setSelectedId(hashCompositionId);
      }
    };

    selectHashComposition();
    window.addEventListener("hashchange", selectHashComposition);

    return () => {
      window.removeEventListener("hashchange", selectHashComposition);
    };
  }, []);

  useEffect(() => {
    if (
      detailScrollTargetId.length === 0 ||
      selectedComposition?.meta.id !== detailScrollTargetId
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      compositionDetailRef.current?.scrollIntoView({
        block: "start",
        inline: "nearest",
      });
      compositionDetailHeadingRef.current?.focus({ preventScroll: true });
      setDetailScrollTargetId("");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [detailScrollTargetId, selectedComposition?.meta.id]);

  const statusSummary = [
    `${compositionRegistrySummary.statusCounts.reviewed} reviewed`,
    `${compositionRegistrySummary.statusCounts.draft} draft`,
    `${compositionRegistrySummary.statusCounts.stable} stable`,
    `${compositionRegistrySummary.statusCounts.deprecated} deprecated`,
  ].join(" / ");

  return (
    <div className={s.routeStack}>
      <section className={s.band}>
        <div className={s.sectionHeader}>
          <p className={s.sectionEyebrow}>Composition system</p>
          <h2>Kompoziční registry místo draft cards</h2>
          <p>
            Compositions jsou teď oddělené od layout primitives, capability
            roles, domain recipes, templates a konkrétních route instances.
            Přehled níže čte jeden canonical registry a coverage manifest.
          </p>
        </div>

        <div className={s.compositionMetrics}>
          <article>
            <span>Compositions</span>
            <strong>{compositionRegistrySummary.totalCompositions}</strong>
            <small>{compositionRegistrySummary.totalFamilies} family groups</small>
          </article>
          <article>
            <span>Status</span>
            <strong>{compositionRegistrySummary.statusCounts.reviewed}</strong>
            <small>{statusSummary}</small>
          </article>
          <article>
            <span>Coverage</span>
            <strong>{compositionRegistrySummary.routeCoverage.mapped}</strong>
            <small>
              {compositionRegistrySummary.routeCoverage.routes} routes /{" "}
              {compositionRegistrySummary.routeCoverage.unmapped} unmapped /{" "}
              {compositionRegistrySummary.routeSourceManifests} manifests
            </small>
          </article>
          <article>
            <span>Registry layers</span>
            <strong>{compositionRegistrySummary.templates}</strong>
            <small>
              {compositionRegistrySummary.domainRecipes} recipes /{" "}
              {compositionRegistrySummary.compositionInstances} instances
            </small>
          </article>
          <article>
            <span>Specimens</span>
            <strong>{compositionRegistrySummary.specimens}</strong>
            <small>
              {compositionRegistrySummary.specimenCoverage.reviewedOrStableComplete}/
              {compositionRegistrySummary.specimenCoverage.reviewedOrStableTargets} reviewed ready /{" "}
              {compositionRegistrySummary.fixtures} fixtures
            </small>
          </article>
        </div>
      </section>

      <section className={s.band} aria-labelledby="composition-filters-title">
        <div className={s.toolHeaderCompact}>
          <div>
            <p className={s.sectionEyebrow}>Family navigation</p>
            <h2 id="composition-filters-title">Filtrovat registry</h2>
          </div>
          <div className={s.searchBox}>
            <Search aria-hidden="true" size={16} />
            <label>
              <span>Search compositions</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, ID, intent or slot"
              />
            </label>
          </div>
        </div>

        <div className={s.compositionFamilyNav} aria-label="Composition families">
          {familyFilterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={activeFamily === option.id}
              onClick={() => setActiveFamily(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={s.compositionFilterGrid}>
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              {statusFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Layer</span>
            <select
              value={layer}
              onChange={(event) => setLayer(event.target.value as typeof layer)}
            >
              {layerFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Scope</span>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as typeof scope)}
            >
              {scopeFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Motion</span>
            <select
              value={motion}
              onChange={(event) =>
                setMotion(event.target.value as typeof motion)
              }
            >
              {motionFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={s.band}>
        <div className={s.toolHeaderCompact}>
          <div>
            <p className={s.sectionEyebrow}>Canonical overview</p>
            <h2>{filteredCompositions.length} matching compositions</h2>
          </div>
        </div>

        <div className={s.compositionRegistryGrid}>
          {filteredCompositions.map((composition) => {
            const requiredSlots = getCompositionRequiredSlots(composition);
            const optionalSlots = getCompositionOptionalSlots(composition);
            const routeUsage = getRouteUsageCount(composition.meta.id);
            const layoutRecipeLabels = getCompositionLayoutRecipeLabels(composition);

            return (
            <PrimitiveCard
              key={composition.meta.id}
              className={s.compositionOverviewCard}
              elevation="base"
              data-testid="composition-card"
              data-composition-id={composition.meta.id}
            >
              <header className={s.compositionHeader}>
                <div>
                  <h3>{composition.meta.name}</h3>
                  <p>{composition.meta.intent}</p>
                </div>
                <PrimitiveBadge
                  data-status={composition.meta.status}
                  tone={compositionStatusTone(composition.meta.status)}
                >
                  {composition.meta.status}
                </PrimitiveBadge>
              </header>

              <div className={s.compositionIdLine}>
                <code translate="no">{composition.meta.id}</code>
                <span>
                  {formatCompositionFamily(composition)} / {composition.meta.scope}
                </span>
              </div>

              <dl className={s.compositionOverviewFacts}>
                <div>
                  <dt>Slots</dt>
                  <dd>
                    {requiredSlots.length} required / {optionalSlots.length} optional
                  </dd>
                </div>
                <div>
                  <dt>Variants</dt>
                  <dd>{composition.structuralVariants.options.length}</dd>
                </div>
                <div>
                  <dt>Layout recipes</dt>
                  <dd>{layoutRecipeLabels.length}</dd>
                </div>
                <div>
                  <dt>Domain recipes</dt>
                  <dd>{getCompositionDomainRecipeCount(composition)}</dd>
                </div>
                <div>
                  <dt>Modes</dt>
                  <dd>{Object.keys(composition.responsive.modes).join(", ")}</dd>
                </div>
                <div>
                  <dt>Surfaces</dt>
                  <dd>{composition.surfaces.allowed.join(", ")}</dd>
                </div>
                <div>
                  <dt>Route usage</dt>
                  <dd>{routeUsage}</dd>
                </div>
                <div>
                  <dt>Specimens</dt>
                  <dd>{composition.examples.length}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{composition.meta.version}</dd>
                </div>
              </dl>

              <button
                type="button"
                className={s.compositionDetailButton}
                data-testid="composition-detail-button"
                data-composition-id={composition.meta.id}
                aria-controls="composition-detail-panel"
                aria-current={
                  selectedComposition?.meta.id === composition.meta.id
                    ? "true"
                    : undefined
                }
                onClick={() => openCompositionDetail(composition.meta.id)}
              >
                Detail contractu
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            </PrimitiveCard>
            );
          })}
        </div>
      </section>

      {selectedComposition ? (
        <section
          ref={compositionDetailRef}
          className={s.band}
          id={selectedComposition.meta.id}
          aria-labelledby="composition-detail-heading"
          data-testid="composition-detail-panel"
        >
          <div className={s.compositionDetailPanel} id="composition-detail-panel">
            <div className={s.compositionDetailIntro}>
              <p className={s.sectionEyebrow}>Composition detail</p>
              <h2
                id="composition-detail-heading"
                ref={compositionDetailHeadingRef}
                tabIndex={-1}
              >
                {selectedComposition.meta.name}
              </h2>
              <p>{selectedComposition.meta.intent}</p>
              <code translate="no">{selectedComposition.meta.id}</code>
            </div>
            <div className={s.compositionDetailGrid}>
              <article>
                <span>Intent / use</span>
                <ul>
                  {selectedComposition.meta.useWhen.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article>
                <span>Anatomy</span>
                <ol>
                  {selectedComposition.anatomy.sourceOrder.map((slotId) => (
                    <li key={slotId}>{slotId}</li>
                  ))}
                </ol>
              </article>
              <article>
                <span>Slots and roles</span>
                <dl>
                  {selectedComposition.anatomy.slots.map((slot) => (
                    <div key={slot.id}>
                      <dt>{slot.id}</dt>
                      <dd>{slot.acceptsCapabilityRoles.join(", ")}</dd>
                    </div>
                  ))}
                </dl>
              </article>
              <article>
                <span>Motion / accessibility</span>
                <p>
                  {selectedComposition.motion.defaultPolicy} /{" "}
                  {selectedComposition.motion.reducedMotionFallback}
                </p>
                <p>
                  Focus order:{" "}
                  {selectedComposition.accessibility.focusOrder.join(", ")}
                </p>
              </article>
              <article>
                <span>Responsive modes</span>
                <dl>
                  {Object.entries(selectedComposition.responsive.modes).map(
                    ([mode, modeContract]) => (
                      <div key={mode}>
                        <dt>{mode}</dt>
                        <dd>{modeContract.layoutRecipeId}</dd>
                      </div>
                    )
                  )}
                </dl>
              </article>
              <article>
                <span>Nesting</span>
                <p>
                  Max depth {selectedComposition.nesting.maxCompositionDepth};
                  forbidden ancestors{" "}
                  {selectedComposition.nesting.forbiddenAncestors.length}
                </p>
              </article>
              <article className={s.compositionSpecimenArticle}>
                <span>Live specimens</span>
                {selectedComposition.examples.length > 0 ? (
                  <div className={s.compositionSpecimenList}>
                    {selectedComposition.examples.map((example) => (
                      <div key={example.id}>
                        <strong>{example.specimenKind}</strong>
                        <code translate="no">{example.fixtureId}</code>
                        <small>
                          {example.layoutMode} / {example.contentProfile} /{" "}
                          {example.motionPreference} motion /{" "}
                          {example.assertionIds.length} assertions
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Draft kompozice zatím nemá povinný specimen contract.</p>
                )}
              </article>
            </div>
          </div>
        </section>
      ) : null}

      {selectedComposition && activeSpecimen && activeVisualContext ? (
        <section className={s.band} aria-labelledby="composition-specimen-preview-title">
          <div className={s.toolHeaderCompact}>
            <div>
              <p className={s.sectionEyebrow}>Live specimen renderer</p>
              <h2 id="composition-specimen-preview-title">
                Compact, medium, wide a surface contexts
              </h2>
            </div>
            <code className={s.specimenActiveId} translate="no">
              {activeSpecimen.id}
            </code>
          </div>

          <div className={s.specimenWorkbench}>
            <aside
              className={s.specimenControlPanel}
              aria-label="Specimen selection"
            >
              <div>
                <span>Specimens</span>
                <div className={s.specimenButtonList}>
                  {selectedSpecimens.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      aria-pressed={example.id === activeSpecimen.id}
                      data-testid="composition-specimen-button"
                      data-specimen-kind={example.specimenKind}
                      onClick={() => setActiveSpecimenId(example.id)}
                    >
                      <strong>{example.specimenKind}</strong>
                      <small>
                        {example.layoutMode} / {example.contentProfile} /{" "}
                        {example.motionPreference}
                      </small>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span>Surface context</span>
                <div className={s.specimenButtonList}>
                  {allowedVisualContexts.map((context) => (
                    <button
                      key={context.id}
                      type="button"
                      aria-pressed={context.id === activeVisualContext.id}
                      data-testid="composition-visual-context-button"
                      data-visual-context-id={context.id}
                      onClick={() => setActiveVisualContextId(context.id)}
                    >
                      <strong>{context.label}</strong>
                      <small>{context.description}</small>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div
              className={s.specimenPreviewShell}
              data-testid="composition-specimen-preview-shell"
              data-composition-id={selectedComposition.meta.id}
              data-specimen-context={activeVisualContext.id}
              data-specimen-mode={activeSpecimen.layoutMode}
              data-surface-tone={activeVisualContext.tone}
            >
              <CompositionSpecimenPreview
                composition={selectedComposition}
                example={activeSpecimen}
                fixture={activeFixture}
                context={activeVisualContext}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className={s.band}>
        <div className={s.toolHeaderCompact}>
          <div>
            <p className={s.sectionEyebrow}>Page templates</p>
            <h2>{pageTemplates.length} template contracts</h2>
          </div>
        </div>
        <div className={s.templateGrid}>
          {pageTemplates.map((template) => (
            <article key={template.id}>
              <h3>{template.name}</h3>
              <code translate="no">{template.id}</code>
              <small>{template.orderedRegions.length} ordered regions</small>
            </article>
          ))}
        </div>
      </section>

      <section className={s.band}>
        <div className={s.toolHeaderCompact}>
          <div>
            <p className={s.sectionEyebrow}>Route coverage</p>
            <h2>
              {compositionRegistrySummary.routeCoverage.routes} routes /{" "}
              {compositionRegistrySummary.routeCoverage.unmapped} unmapped
            </h2>
          </div>
        </div>
        <div className={s.coverageTable}>
          {routeCompositionCoverage.map((route) => (
            <article
              key={route.routePattern}
              data-testid="composition-coverage-row"
            >
              <div>
                <strong>{route.routePattern}</strong>
                <small>{route.templateId}</small>
              </div>
              <span>{route.sections.length} sections</span>
              <code data-testid="composition-coverage-source" translate="no">
                {route.sourceManifest}
              </code>
              <span>
                {
                  route.sections.filter((section) => section.status === "mapped")
                    .length
                }{" "}
                mapped
              </span>
              <span>
                {
                  route.sections.filter(
                    (section) => section.status === "exception"
                  ).length
                }{" "}
                exceptions
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className={s.band}>
        <div className={s.toolHeaderCompact}>
          <div>
            <p className={s.sectionEyebrow}>Migration map</p>
            <h2>{candidateClassifications.length} candidate classifications</h2>
          </div>
        </div>
        <div className={s.migrationRows}>
          {candidateClassifications.map((classification) => (
            <article key={classification.candidateId}>
              <strong>{classification.candidateId}</strong>
              <span>{classification.decision}</span>
              <code translate="no">
                {classification.targetCompositionId ??
                  classification.targetDomainRecipeId ??
                  classification.targetLayoutRecipeId}
              </code>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TokenTable({
  heading,
  scope,
  tokenValues,
  copyLabel,
}: {
  heading: string;
  scope: string;
  tokenValues: TokenRuntimeMap;
  copyLabel: string;
}) {
  const tokens = tokenCatalog.filter((token) => token.scope === scope);

  return (
    <section className={s.band}>
      <div className={s.sectionHeader}>
        <p className={s.sectionEyebrow}>Token table</p>
        <h2>{heading}</h2>
      </div>
      <div className={s.tokenRows}>
        {tokens.map((token) => {
          const runtime = tokenRuntime(tokenValues, token.cssVariable);

          return (
            <article key={token.cssVariable} className={s.tokenRow}>
              <div>
                <code translate="no">{token.cssVariable}</code>
                <p>{token.description}</p>
              </div>
              <span>{runtime.declared}</span>
              <span>{runtime.resolved}</span>
              <small>{copyLabel}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ToolsRoute({
  tokenValues,
  copiedValue,
  onCopy,
}: {
  tokenValues: TokenRuntimeMap;
  copiedValue: string;
  onCopy: CopyHandler;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [foreground, setForeground] = useState("--text-on-dark-primary");
  const [background, setBackground] = useState("--surface-card-dark");
  const [surfaceTone, setSurfaceTone] = useState<"dark" | "light" | "action">(
    "dark"
  );
  const deferredQuery = useDeferredValue(query);

  const visibleTokens = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return tokenCatalog.filter((token) => {
      const matchesScope = scope === "all" || token.scope === scope;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        token.cssVariable.toLowerCase().includes(normalizedQuery) ||
        token.description.toLowerCase().includes(normalizedQuery) ||
        token.usage.toLowerCase().includes(normalizedQuery);

      return matchesScope && matchesQuery;
    });
  }, [deferredQuery, scope]);

  const foregroundValue = tokenRuntime(tokenValues, foreground).resolved;
  const backgroundValue = tokenRuntime(tokenValues, background).resolved;
  const ratio = contrastRatio(foregroundValue, backgroundValue);
  const surfaceToken =
    surfaceTone === "light"
      ? "--surface-card-light"
      : surfaceTone === "action"
        ? "--surface-action"
        : "--surface-card-dark";
  const surfaceText =
    surfaceTone === "light"
      ? "--text-on-light-primary"
      : surfaceTone === "action"
        ? "--text-on-action-primary"
        : "--text-on-dark-primary";

  return (
    <div className={s.routeStack}>
      <section className={s.toolsHeader}>
        <div>
          <p className={s.sectionEyebrow}>Tools</p>
          <h2>Pracovní nástroje design systému</h2>
          <p>
            Tokeny se čtou z reálného CSS runtime. Výsledek proto ukazuje stav
            aktuálně načtené aplikace, ne ručně přepsanou dokumentaci.
          </p>
        </div>
        <Gauge aria-hidden="true" size={42} strokeWidth={1.8} />
      </section>

      <section className={s.toolBand}>
        <div className={s.toolHeader}>
          <div>
            <p className={s.sectionEyebrow}>Token explorer</p>
            <h2>Najít, ověřit, zkopírovat</h2>
          </div>
          <div className={s.searchBox}>
            <Search aria-hidden="true" size={16} />
            <label>
              <span>Search tokens</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                name="token-search"
                placeholder="--surface, cta, border…"
                spellCheck={false}
              />
            </label>
          </div>
        </div>
        <div className={s.scopeFilters} aria-label="Token scopes">
          {tokenScopes.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={scope === item}
              onClick={() => setScope(item)}
            >
              {tokenScopeLabels[item] ?? item}
            </button>
          ))}
        </div>
        <div className={s.tokenExplorer}>
          {visibleTokens.map((token) => {
            const runtime = tokenRuntime(tokenValues, token.cssVariable);
            const copyValue = `var(${token.cssVariable})`;

            return (
              <article key={token.cssVariable} className={s.explorerRow}>
                <div>
                  <code translate="no">{token.cssVariable}</code>
                  <p>{token.usage}</p>
                </div>
                <span>{runtime.declared}</span>
                <span>{runtime.resolved}</span>
                <button
                  type="button"
                  aria-live="polite"
                  onClick={() => onCopy(copyValue)}
                >
                  <Copy aria-hidden="true" size={15} />
                  {copiedValue === copyValue ? "Copied" : "Copy"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={s.toolGrid}>
        <div className={s.toolPanel}>
          <div className={s.toolHeaderCompact}>
            <p className={s.sectionEyebrow}>Contrast lab</p>
            <h2>{ratio === null ? "Pending" : `${ratio.toFixed(2)}:1`}</h2>
            <span>{contrastGrade(ratio)}</span>
          </div>
          <div className={s.selectGrid}>
            <label>
              <span>Foreground</span>
              <select
                name="contrast-foreground"
                value={foreground}
                onChange={(event) => setForeground(event.target.value)}
              >
                {colorTokenCatalog.map((token) => (
                  <option key={token.cssVariable} value={token.cssVariable}>
                    {token.cssVariable}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Background</span>
              <select
                name="contrast-background"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
              >
                {colorTokenCatalog.map((token) => (
                  <option key={token.cssVariable} value={token.cssVariable}>
                    {token.cssVariable}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className={s.contrastPreview}
            style={cssVars({
              "--contrast-fg": cssVarRef(foreground, "var(--text-on-dark-primary)"),
              "--contrast-bg": cssVarRef(background, "var(--surface-card-dark)"),
            })}
          >
            <strong>Nejdřív přehled.</strong>
            <p>Potom jasný plán a čitelný další krok.</p>
          </div>
        </div>

        <div className={s.toolPanel}>
          <div className={s.toolHeaderCompact}>
            <p className={s.sectionEyebrow}>Surface composer</p>
            <h2>{surfaceTone}</h2>
            <span>{surfaceToken}</span>
          </div>
          <div className={s.segmentedControl}>
            {(["dark", "light", "action"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={surfaceTone === option}
                onClick={() => setSurfaceTone(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div
            className={s.composerPreview}
            data-surface-tone={surfaceTone}
            style={cssVars({
              "--preview-bg": cssVarRef(surfaceToken, "var(--surface-card-dark)"),
              "--preview-fg": cssVarRef(surfaceText, "var(--text-on-dark-primary)"),
            })}
          >
            <span>Surface</span>
            <h3>Osobní plán místo dojmů</h3>
            <p>
              Plocha drží text, okraj a CTA kontrakt ve stejném kontextu.
            </p>
            <button
              type="button"
              aria-live="polite"
              onClick={() => onCopy(`data-surface-tone="${surfaceTone}"`)}
            >
              <Clipboard aria-hidden="true" size={15} />
              {copiedValue === `data-surface-tone="${surfaceTone}"`
                ? "Copied"
                : "Copy contract"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DesignLanguageApp({
  activeRouteId,
  componentDetailId,
  componentsView = "overview",
}: {
  activeRouteId: DesignLanguageRouteId;
  componentDetailId?: string;
  componentsView?: ComponentsWorkspaceView;
}) {
  const activeRoute =
    dashboardRoutes.find((route) => route.id === activeRouteId) ??
    dashboardRoutes[0];
  const [tokenValues, setTokenValues] = useState<TokenRuntimeMap>({});
  const [copiedValue, setCopiedValue] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextValues = Object.fromEntries(
        tokenCatalog.map((token) => {
          const declared = readDeclaredVar(token.cssVariable);
          const resolved = token.color
            ? readResolvedColor(token.cssVariable)
            : declared;

          return [token.cssVariable, { declared, resolved }];
        })
      );

      setTokenValues(nextValues);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleCopy = useCallback(async (value: string) => {
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.inset = "0 auto auto 0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    };

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }

    setCopiedValue(value);
    window.setTimeout(() => setCopiedValue(""), 1400);
  }, []);

  return (
    <DashboardShell activeRoute={activeRoute} tokenValues={tokenValues}>
      {activeRoute.id === "overview" ? (
        <OverviewRoute tokenValues={tokenValues} />
      ) : null}
      {activeRoute.id === "foundations" ? (
        <FoundationsRoute tokenValues={tokenValues} />
      ) : null}
      {activeRoute.id === "surfaces" ? (
        <SurfacesRoute tokenValues={tokenValues} />
      ) : null}
      {activeRoute.id === "typography" ? (
        <TypographyRoute tokenValues={tokenValues} />
      ) : null}
      {activeRoute.id === "actions" ? (
        <ActionsRoute tokenValues={tokenValues} />
      ) : null}
      {activeRoute.id === "borders" ? (
        <BordersRoute />
      ) : null}
      {activeRoute.id === "components" ? (
        <ComponentsRoute componentId={componentDetailId} view={componentsView} />
      ) : null}
      {activeRoute.id === "compositions" ? <CompositionsRoute /> : null}
      {activeRoute.id === "tools" ? (
        <ToolsRoute
          copiedValue={copiedValue}
          tokenValues={tokenValues}
          onCopy={handleCopy}
        />
      ) : null}
    </DashboardShell>
  );
}
