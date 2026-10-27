import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";

const rootDir = process.cwd();
const designPrimitivesPath = path.join(
  rootDir,
  "app/theme/design-primitives.css",
);
const globalsPath = path.join(rootDir, "app/globals.css");
const compact = (value) => value.replace(/\s+/g, " ").trim();

async function parseCss(file) {
  const source = await readFile(file, "utf8");
  return postcss.parse(source, { from: file });
}

function collectDeclarations(root) {
  const declarations = new Map();
  root.walkDecls(/^--/, (declaration) => {
    declarations.set(declaration.prop, compact(declaration.value));
  });
  return declarations;
}

const [designRoot, globalsRoot] = await Promise.all([
  parseCss(designPrimitivesPath),
  parseCss(globalsPath),
]);
const designDeclarations = collectDeclarations(designRoot);
const globalDeclarations = collectDeclarations(globalsRoot);
const findings = [];

const canonicalContracts = new Map([
  ["--radius-primary", "16px"],
  ["--radius-control", "var(--radius-primary)"],
  ["--radius-input", "var(--radius-primary)"],
  ["--radius-card-compact", "var(--radius-primary)"],
  ["--radius-card", "var(--radius-primary)"],
  ["--radius-panel", "var(--radius-primary)"],
  ["--radius-modal", "var(--radius-primary)"],
  [
    "--radius-sheet",
    "var(--radius-primary) var(--radius-primary) 0 0",
  ],
  ["--radius-media", "var(--radius-primary)"],
  ["--button-primary-radius", "var(--radius-control)"],
  ["--button-cta-radius", "var(--radius-cta)"],
  ["--card-radius", "var(--radius-card)"],
  ["--input-radius", "var(--radius-input)"],
  ["--nav-item-radius", "var(--radius-control)"],
  ["--media-frame-radius", "var(--radius-media)"],
  ["--popover-radius", "var(--radius-card)"],
  ["--toast-radius", "var(--radius-card)"],
]);

const exceptionContracts = new Map([
  ["--radius-none", "0"],
  ["--radius-checkbox", "4px"],
  ["--radius-cinematic-inner", "30px"],
  ["--radius-cinematic-outer", "39px"],
  ["--radius-pill", "999px"],
  ["--radius-cta", "var(--radius-pill)"],
  ["--radius-circle", "50%"],
]);

for (const [token, expected] of [
  ...canonicalContracts,
  ...exceptionContracts,
]) {
  const actual = designDeclarations.get(token);
  if (actual !== expected) {
    findings.push(
      `${token} must be ${expected}; received ${actual ?? "missing"}.`,
    );
  }
}

for (const token of [
  "--radius",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
  "--radius-2xl",
  "--radius-3xl",
  "--radius-4xl",
]) {
  const actual = globalDeclarations.get(token);
  if (actual !== "var(--radius-primary)") {
    findings.push(
      `${token} must alias --radius-primary; received ${actual ?? "missing"}.`,
    );
  }
}

const homepageStylePaths = [
  "app/globals.css",
  "app/homepage.module.css",
  "app/ui/site/site.module.css",
  "app/ui/cta/button.module.css",
  "app/ui/card/primitiveCard.module.css",
  "app/ui/media/mediaFrame.module.css",
  "app/ui/form/primitiveField.module.css",
  "app/ui/badge/primitiveBadge.module.css",
  "app/ui/forms/forms.module.css",
  "app/ui/primitives/primitives.module.css",
  "app/components/devSettings/devSettings.module.css",
  "src/app/ui/privacy/CookieBanner.module.css",
  "src/app/ui/privacy/CookieSettingsButton.module.css",
];

const homepageComponentDir = path.join(rootDir, "app/_components/homepage");
const homepageComponentFiles = (await readdir(homepageComponentDir))
  .filter((file) => file.endsWith(".module.css"))
  .map((file) => path.join("app/_components/homepage", file));

for (const relativePath of [
  ...homepageStylePaths,
  ...homepageComponentFiles,
]) {
  const file = path.join(rootDir, relativePath);
  const root = await parseCss(file);

  root.walkDecls((declaration) => {
    if (!declaration.prop.startsWith("border-")) return;
    if (!declaration.prop.endsWith("radius")) return;

    const value = compact(declaration.value);
    const isTokenized = value.includes("var(");
    const isInherited = value === "inherit";
    const isCalculated = /\b(?:calc|clamp)\(/.test(value);

    if ((!isTokenized && !isInherited) || isCalculated) {
      findings.push(
        `${relativePath}:${declaration.source?.start?.line ?? "?"} ` +
          `${declaration.prop} must use a named radius token; received ${value}.`,
      );
    }
  });
}

if (findings.length > 0) {
  console.error("Radius contract validation failed:\n");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log("Radius contract validation passed.");
  console.log("Primary radius: 16px");
  console.log(`Standard aliases: ${canonicalContracts.size - 1}`);
  console.log(`Documented shape exceptions: ${exceptionContracts.size}`);
  console.log(
    `Homepage style sources without raw radius drift: ${
      homepageStylePaths.length + homepageComponentFiles.length
    }`,
  );
}
