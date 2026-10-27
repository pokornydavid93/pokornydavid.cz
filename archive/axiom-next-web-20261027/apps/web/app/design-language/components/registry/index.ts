import { patternRegistryEntries } from "./patterns";
import { registryMigrations, routeFamilyContracts } from "./routes";
import { runtimeRegistryEntries } from "./runtime";
import { templateRegistryEntries } from "./templates";
import type {
  ComponentRegistry,
  MaturityStage,
  RuntimeRegistryLayer,
} from "./types";

export type * from "./types";

export const COMPONENT_REGISTRY_SCHEMA_VERSION = "1.2";

export const runtimeRegistryGroups = [
  { id: "layout", label: "Layout primitives", expectedCount: 9 },
  { id: "ui", label: "UI/content primitives", expectedCount: 11 },
  { id: "form", label: "Form components", expectedCount: 7 },
  { id: "navigation", label: "Site shell / navigation", expectedCount: 6 },
  { id: "domain", label: "Domain components", expectedCount: 9 },
] as const satisfies ReadonlyArray<{
  id: RuntimeRegistryLayer;
  label: string;
  expectedCount: number;
}>;

export const componentRegistry: ComponentRegistry = {
  schemaVersion: COMPONENT_REGISTRY_SCHEMA_VERSION,
  runtime: runtimeRegistryEntries,
  patterns: patternRegistryEntries,
  templates: templateRegistryEntries,
  routeFamilies: routeFamilyContracts,
  migrations: registryMigrations,
};

export const componentRegistryEntries = [
  ...componentRegistry.runtime,
  ...componentRegistry.patterns,
  ...componentRegistry.templates,
];

export const componentRegistrySummary = {
  runtimeContracts: componentRegistry.runtime.length,
  patterns: componentRegistry.patterns.length,
  templates: componentRegistry.templates.length,
  routeFamilies: componentRegistry.routeFamilies.length,
  maturity: (["specified", "implemented", "verified", "live"] as const).map(
    (stage: MaturityStage) => ({
      stage,
      count: componentRegistryEntries.filter((entry) => entry.maturity === stage)
        .length,
    })
  ),
};

export function getRuntimeEntriesByLayer(layer: RuntimeRegistryLayer) {
  return componentRegistry.runtime.filter((entry) => entry.layer === layer);
}
