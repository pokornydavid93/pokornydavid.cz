import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const appDir = path.join(rootDir, "app");
const strict = process.argv.includes("--strict");
const maxSamples = 8;
const scannedExtensions = new Set([".css", ".ts", ".tsx"]);
const ignoredPathFragments = [
  `${path.sep}app${path.sep}theme${path.sep}design-primitives.css`,
  `${path.sep}app${path.sep}theme${path.sep}design-primitives.ts`,
];

const validationRules = new Map([
  [
    "layer-escalation",
    "Move the component to an owned layer or fix the stacking context.",
  ],
  [
    "raw-reduced-motion-query",
    "Read DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion instead.",
  ],
  [
    "motion-drift",
    "Map the value to a motion role or approved cinematic exception.",
  ],
]);

const legacyLayerValues = ["99999", "222222", "300000", "400000", "2147483647"];
const localDurationValues = [
  "duration: 0.88",
  "duration: 0.9",
  "duration: 0.92",
  "duration: 0.95",
];

const rules = [
  {
    id: "layer-escalation",
    severity: "error",
    extensions: new Set([".css", ".ts", ".tsx"]),
    pattern: new RegExp(`\\b(${legacyLayerValues.join("|")})\\b`),
  },
  {
    id: "raw-reduced-motion-query",
    severity: "warning",
    extensions: new Set([".ts", ".tsx"]),
    pattern: /prefers-reduced-motion:\s*reduce/,
  },
  {
    id: "motion-drift",
    severity: "warning",
    extensions: new Set([".ts", ".tsx"]),
    pattern: new RegExp(
      localDurationValues
        .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")
    ),
  },
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const file = path.join(dir, entry);
    const stat = statSync(file);

    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") return [];
      return walk(file);
    }

    return [file];
  });
}

function shouldScan(file) {
  if (!scannedExtensions.has(path.extname(file))) return false;
  return !ignoredPathFragments.some((fragment) => file.endsWith(fragment));
}

function collectFindings() {
  const findings = [];

  walk(appDir)
    .filter(shouldScan)
    .forEach((file) => {
      const extension = path.extname(file);
      const source = readFileSync(file, "utf8");

      source.split(/\r?\n/).forEach((lineText, index) => {
        rules.forEach((rule) => {
          if (!rule.extensions.has(extension)) return;
          if (!rule.pattern.test(lineText)) return;

          findings.push({
            file: path.relative(rootDir, file),
            line: index + 1,
            preview: lineText.trim(),
            rule: rule.id,
            severity: rule.severity,
          });
        });
      });
    });

  return findings;
}

function summarize(findings) {
  const byRule = new Map();

  findings.forEach((finding) => {
    const group = byRule.get(finding.rule) ?? [];
    group.push(finding);
    byRule.set(finding.rule, group);
  });

  console.log("Design primitive audit");
  console.log(`Scanned: ${path.relative(rootDir, appDir) || "app"}`);
  console.log(`Findings: ${findings.length}`);
  console.log("");

  rules.forEach((rule) => {
    const group = byRule.get(rule.id) ?? [];
    const recommendation = validationRules.get(rule.id);
    console.log(`[${rule.severity}] ${rule.id}: ${group.length}`);
    if (recommendation) {
      console.log(`  ${recommendation}`);
    }

    group.slice(0, maxSamples).forEach((finding) => {
      console.log(`  - ${finding.file}:${finding.line} ${finding.preview}`);
    });

    if (group.length > maxSamples) {
      console.log(`  ... ${group.length - maxSamples} more`);
    }
    console.log("");
  });
}

const findings = collectFindings();
summarize(findings);

if (strict && findings.some((finding) => finding.severity === "error")) {
  process.exitCode = 1;
}
