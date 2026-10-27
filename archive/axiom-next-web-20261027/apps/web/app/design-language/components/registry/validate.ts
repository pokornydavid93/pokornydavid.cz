import {
  componentRegistry,
  componentRegistryEntries,
  runtimeRegistryGroups,
} from "./index";
import type { ComponentRegistryEntry, MaturityStage } from "./types";

type ValidationInput = {
  sourceFiles: string[];
};

type ValidationFinding = {
  code: string;
  entryId?: string;
  message: string;
};

const maturityRank: Record<MaturityStage, number> = {
  specified: 0,
  implemented: 1,
  verified: 2,
  live: 3,
};

function addFinding(
  findings: ValidationFinding[],
  code: string,
  message: string,
  entryId?: string
) {
  findings.push({ code, entryId, message });
}

function validateContractShape(
  entry: ComponentRegistryEntry,
  findings: ValidationFinding[]
) {
  if (!entry.responsibility.trim()) {
    addFinding(findings, "missing-responsibility", "Responsibility is empty.", entry.id);
  }
  if (entry.antiUse.length === 0) {
    addFinding(findings, "missing-anti-use", "At least one anti-use rule is required.", entry.id);
  }
  if (entry.anatomy.length === 0) {
    addFinding(findings, "missing-anatomy", "Anatomy or slots cannot be empty.", entry.id);
  }
  if (entry.props.length === 0) {
    addFinding(findings, "missing-api", "At least one public API prop is required.", entry.id);
  }
  if (
    !entry.responsive.invariant.trim() ||
    !entry.responsive.narrow.trim() ||
    !entry.responsive.wide.trim()
  ) {
    addFinding(findings, "missing-responsive", "Responsive contract is incomplete.", entry.id);
  }
  if (entry.supportedTones.length === 0) {
    addFinding(findings, "missing-tones", "At least one supported tone is required.", entry.id);
  }
  if (maturityRank[entry.maturity] >= maturityRank.implemented && !entry.codeRef) {
    addFinding(
      findings,
      "maturity-without-code",
      `${entry.maturity} requires a codeRef.`,
      entry.id
    );
  }
  if (maturityRank[entry.maturity] >= maturityRank.verified) {
    const incompleteFacets = Object.entries(entry.verification)
      .filter(([, status]) => status !== "not-applicable" && status !== "passing")
      .map(([facet]) => facet);
    if (incompleteFacets.length > 0) {
      addFinding(
        findings,
        "verified-without-facets",
        `${entry.maturity} requires every relevant verification facet to pass; incomplete: ${incompleteFacets.join(", ")}.`,
        entry.id
      );
    }
  }
  if (entry.maturity === "live" && entry.routes.length === 0) {
    addFinding(findings, "live-without-route", "Live requires route families.", entry.id);
  }
  if (entry.maturity === "live" && entry.usageEvidence.length === 0) {
    addFinding(
      findings,
      "live-without-usage-evidence",
      "Live requires source-level route usage evidence.",
      entry.id
    );
  }
}

export function validateComponentRegistry({ sourceFiles }: ValidationInput) {
  const findings: ValidationFinding[] = [];
  const sourceFileSet = new Set(sourceFiles);
  const routeIds = new Set(componentRegistry.routeFamilies.map((route) => route.id));
  const entryIds = new Set<string>();

  for (const entry of componentRegistryEntries) {
    if (entryIds.has(entry.id)) {
      addFinding(findings, "duplicate-id", `Duplicate registry ID ${entry.id}.`, entry.id);
    }
    entryIds.add(entry.id);
    validateContractShape(entry, findings);

    if (entry.codeRef && !sourceFileSet.has(entry.codeRef)) {
      addFinding(
        findings,
        "missing-code-ref",
        `Code reference ${entry.codeRef} does not exist.`,
        entry.id
      );
    }
    for (const usageRef of entry.usageEvidence) {
      if (!sourceFileSet.has(usageRef)) {
        addFinding(
          findings,
          "missing-usage-evidence",
          `Usage evidence ${usageRef} does not exist.`,
          entry.id
        );
      }
    }
    if (maturityRank[entry.maturity] >= maturityRank.verified) {
      if (entry.tests.evidence.length === 0) {
        addFinding(
          findings,
          "verified-without-evidence",
          `${entry.maturity} requires at least one test evidence reference.`,
          entry.id
        );
      }
      for (const evidenceRef of entry.tests.evidence) {
        if (!sourceFileSet.has(evidenceRef)) {
          addFinding(
            findings,
            "missing-test-evidence",
            `Test evidence ${evidenceRef} does not exist.`,
            entry.id
          );
        }
      }
    }
    for (const routeId of entry.routes) {
      if (!routeIds.has(routeId)) {
        addFinding(findings, "unknown-route", `Unknown route ${routeId}.`, entry.id);
      }
    }
  }

  for (const entry of componentRegistryEntries) {
    for (const dependency of entry.dependencies) {
      if (!entryIds.has(dependency)) {
        addFinding(
          findings,
          "unknown-dependency",
          `Unknown dependency ${dependency}.`,
          entry.id
        );
      }
    }
  }

  const kindCounts = Object.fromEntries(
    runtimeRegistryGroups.map((group) => [
      group.id,
      componentRegistry.runtime.filter((entry) => entry.layer === group.id).length,
    ])
  );

  for (const group of runtimeRegistryGroups) {
    if (kindCounts[group.id] !== group.expectedCount) {
      addFinding(
        findings,
        "invalid-layer-count",
        `${group.id} must contain ${group.expectedCount}; found ${kindCounts[group.id]}.`
      );
    }
  }
  if (componentRegistry.runtime.length !== 42) {
    addFinding(
      findings,
      "invalid-runtime-count",
      `Runtime registry must contain 42 entries; found ${componentRegistry.runtime.length}.`
    );
  }
  if (componentRegistry.patterns.length !== 9) {
    addFinding(
      findings,
      "invalid-pattern-count",
      `Pattern registry must contain 9 entries; found ${componentRegistry.patterns.length}.`
    );
  }
  if (componentRegistry.templates.length !== 7) {
    addFinding(
      findings,
      "invalid-template-count",
      `Template registry must contain 7 entries; found ${componentRegistry.templates.length}.`
    );
  }
  if (componentRegistry.routeFamilies.length !== 10) {
    addFinding(
      findings,
      "invalid-route-count",
      `Route registry must contain 10 families; found ${componentRegistry.routeFamilies.length}.`
    );
  }

  const templateIds = new Set(componentRegistry.templates.map((entry) => entry.id));
  const patternIds = new Set(componentRegistry.patterns.map((entry) => entry.id));
  for (const route of componentRegistry.routeFamilies) {
    if (!templateIds.has(route.templateId)) {
      addFinding(
        findings,
        "unknown-route-template",
        `Route ${route.id} references unknown template ${route.templateId}.`
      );
    }
    for (const patternId of [
      ...route.requiredPatternIds,
      ...route.optionalPatternIds,
    ]) {
      if (!patternIds.has(patternId)) {
        addFinding(
          findings,
          "unknown-route-pattern",
          `Route ${route.id} references unknown pattern ${patternId}.`
        );
      }
    }
    if (route.status === "current" && route.sourceFiles.length === 0) {
      addFinding(
        findings,
        "current-route-without-source",
        `Current route ${route.id} requires source evidence.`
      );
    }
    for (const sourceFile of route.sourceFiles) {
      if (!sourceFileSet.has(sourceFile)) {
        addFinding(
          findings,
          "missing-route-source",
          `Route ${route.id} source ${sourceFile} does not exist.`
        );
      }
    }
  }

  const forbiddenPublicEntries = new Set([
    "component.button.primary",
    "component.card",
    "component.input",
    "component.navigationItem",
  ]);
  for (const id of forbiddenPublicEntries) {
    if (entryIds.has(id)) {
      addFinding(findings, "legacy-public-entry", `${id} must not remain public.`);
    }
  }
  if (entryIds.has("layout.split")) {
    addFinding(findings, "duplicate-layout-algorithm", "layout.split is not a core primitive.");
  }

  return {
    valid: findings.length === 0,
    findings,
    summary: {
      runtime: componentRegistry.runtime.length,
      patterns: componentRegistry.patterns.length,
      templates: componentRegistry.templates.length,
      routeFamilies: componentRegistry.routeFamilies.length,
      kinds: kindCounts,
      maturity: Object.fromEntries(
        (["specified", "implemented", "verified", "live"] as const).map(
          (stage) => [
            stage,
            componentRegistryEntries.filter((entry) => entry.maturity === stage)
              .length,
          ]
        )
      ),
    },
  };
}
