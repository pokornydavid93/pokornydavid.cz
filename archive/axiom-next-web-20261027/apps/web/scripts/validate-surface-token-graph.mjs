import { readdir, readFile } from "node:fs/promises";
import postcss from "postcss";

const cssUrl = new URL("../app/theme/color-palette.css", import.meta.url);
const css = await readFile(cssUrl, "utf8");
const root = postcss.parse(css, { from: cssUrl.pathname });

const sourcePrimitives = new Map([
  ["--brand-lime", "#B0E454"],
  ["--brand-forest", "#224F10"],
  ["--brand-ivory", "#EAFFD0"],
  ["--brand-jet", "#0D0D0D"],
]);
const primitiveRgbAliases = new Set(
  Array.from(sourcePrimitives.keys(), (token) => `${token}-rgb`)
);
const canonicalSurfaces = new Map([
  ["--surface-page", "var(--brand-jet)"],
  [
    "--surface-card-dark",
    "color-mix(in srgb, var(--brand-jet) 82%, var(--brand-forest))",
  ],
  [
    "--surface-paper",
    "color-mix(in srgb, var(--brand-ivory) 96%, var(--brand-forest))",
  ],
  ["--surface-card-light", "var(--brand-ivory)"],
  ["--surface-action", "var(--brand-lime)"],
  ["--surface-action-dark", "var(--brand-forest)"],
]);
const expectedResolved = new Map([
  ["--surface-page", "#0D0D0D"],
  ["--surface-card-dark", "#11190E"],
  ["--surface-paper", "#E2F8C8"],
  ["--surface-card-light", "#EAFFD0"],
  ["--surface-action", "#B0E454"],
  ["--surface-action-dark", "#224F10"],
]);
const canonicalSurfaceEdges = new Map([
  ["--surface-page-edge", "var(--border-on-dark-subtle)"],
  ["--surface-card-dark-edge", "var(--border-on-dark-subtle)"],
  ["--surface-paper-edge", "var(--border-on-light-subtle)"],
  ["--surface-card-light-edge", "var(--border-on-light-subtle)"],
  ["--surface-action-edge", "var(--border-on-action-subtle)"],
  ["--surface-action-dark-edge", "rgba(var(--brand-lime-rgb), 0.22)"],
]);
const authoredContracts = new Map([
  ["--border-on-dark-subtle", "rgb(234 255 208 / 8%)"],
  ["--border-on-dark-default", "rgb(234 255 208 / 14%)"],
  ["--border-on-dark-emphasis", "rgb(176 228 84 / 32%)"],
  ["--border-on-light-subtle", "rgb(13 13 13 / 10%)"],
  ["--border-on-light-default", "rgb(13 13 13 / 16%)"],
  ["--border-on-light-emphasis", "rgb(34 79 16 / 32%)"],
  ["--border-on-action-subtle", "rgb(13 13 13 / 10%)"],
  ["--border-on-action-default", "rgb(13 13 13 / 16%)"],
  ["--border-on-action-emphasis", "rgb(13 13 13 / 32%)"],
  ["--text-on-dark-muted", "rgba(var(--brand-ivory-rgb), 0.64)"],
  ["--focus-ring-on-dark", "rgba(var(--brand-lime-rgb), 0.56)"],
  ["--focus-ring-on-light", "rgba(var(--brand-forest-rgb), 0.64)"],
  ["--focus-ring-on-action", "rgba(var(--brand-jet-rgb), 0.72)"],
  ["--border-control-on-dark", "var(--focus-ring-on-dark)"],
  ["--border-state-on-dark", "var(--brand-lime)"],
  ["--border-control-on-light", "var(--focus-ring-on-light)"],
  ["--border-state-on-light", "var(--brand-forest)"],
  ["--border-control-on-action", "var(--focus-ring-on-action)"],
  ["--border-state-on-action", "var(--brand-jet)"],
]);
const toneAliasContracts = {
  dark: {
    "--border-subtle": "var(--border-on-dark-subtle)",
    "--border-default": "var(--border-on-dark-default)",
    "--border-emphasis": "var(--border-on-dark-emphasis)",
    "--border-control": "var(--border-control-on-dark)",
    "--border-state": "var(--border-state-on-dark)",
    "--focus-ring": "var(--focus-ring-on-dark)",
  },
  light: {
    "--border-subtle": "var(--border-on-light-subtle)",
    "--border-default": "var(--border-on-light-default)",
    "--border-emphasis": "var(--border-on-light-emphasis)",
    "--border-control": "var(--border-control-on-light)",
    "--border-state": "var(--border-state-on-light)",
    "--focus-ring": "var(--focus-ring-on-light)",
  },
  action: {
    "--border-subtle": "var(--border-on-action-subtle)",
    "--border-default": "var(--border-on-action-default)",
    "--border-emphasis": "var(--border-on-action-emphasis)",
    "--border-control": "var(--border-control-on-action)",
    "--border-state": "var(--border-state-on-action)",
    "--focus-ring": "var(--focus-ring-on-action)",
  },
};
const removedTokens = ["--border-accent-on-dark-emphasis", "--focus-ring-accent"];

const declarations = new Map();
root.walkRules(":root", (rule) => {
  rule.walkDecls(/^--/, (declaration) => {
    declarations.set(declaration.prop, declaration.value.trim());
  });
});

const findings = [];
const compact = (value) => value.replace(/\s+/g, " ").trim();
const variableReferences = (value) =>
  Array.from(value.matchAll(/var\((--[\w-]+)/g), (match) => match[1]);

for (const [token, expected] of sourcePrimitives) {
  const actual = declarations.get(token);
  if (actual?.toUpperCase() !== expected) {
    findings.push(`${token} must remain ${expected}; received ${actual ?? "missing"}.`);
  }
}

for (const [token, expected] of canonicalSurfaces) {
  const actual = declarations.get(token);
  if (compact(actual ?? "") !== compact(expected)) {
    findings.push(`${token} must be authored as ${expected}; received ${actual ?? "missing"}.`);
  }
}

for (const [token, expected] of [...canonicalSurfaceEdges, ...authoredContracts]) {
  const actual = declarations.get(token);
  if (compact(actual ?? "") !== compact(expected)) {
    findings.push(`${token} must be authored as ${expected}; received ${actual ?? "missing"}.`);
  }
}

for (const [tone, aliases] of Object.entries(toneAliasContracts)) {
  const scopedDeclarations = new Map();
  root.walkRules(`[data-surface-tone="${tone}"]`, (rule) => {
    rule.walkDecls(/^--/, (declaration) => {
      scopedDeclarations.set(declaration.prop, declaration.value.trim());
    });
  });

  for (const [alias, expected] of Object.entries(aliases)) {
    const actual = scopedDeclarations.get(alias);
    if (compact(actual ?? "") !== compact(expected)) {
      findings.push(
        `${tone} ${alias} must be authored as ${expected}; found ${actual ?? "missing"}.`
      );
    }
  }
}

for (const token of removedTokens) {
  if (declarations.has(token)) {
    findings.push(`${token} is removed and must not be declared.`);
  }
}

const surfaceDeclarations = Array.from(declarations).filter(
  ([token]) => token.startsWith("--surface-") && !token.endsWith("-edge")
);

for (const [token, value] of surfaceDeclarations) {
  if (/\b(?:white|black)\b/i.test(value)) {
    findings.push(`${token} uses a raw white/black endpoint: ${value}.`);
  }
  if (/#[\da-f]{3,8}\b/i.test(value)) {
    findings.push(`${token} uses an unregistered raw hex: ${value}.`);
  }

  const references = variableReferences(value);
  if (value.includes("color-mix(")) {
    const invalidMixReference = references.find(
      (reference) => !sourcePrimitives.has(reference)
    );
    if (invalidMixReference) {
      findings.push(
        `${token} color-mix must reference source primitives; received ${invalidMixReference}.`
      );
    }
  }
}

function traceSurface(token, trail = []) {
  if (sourcePrimitives.has(token) || primitiveRgbAliases.has(token)) return;
  if (trail.includes(token)) {
    findings.push(`Surface graph cycle: ${[...trail, token].join(" -> ")}.`);
    return;
  }

  const value = declarations.get(token);
  if (!value) {
    findings.push(`Surface graph references an unregistered token: ${token}.`);
    return;
  }

  const references = variableReferences(value);
  if (references.length === 0) {
    findings.push(`${token} does not terminate at a foundation primitive.`);
    return;
  }

  for (const reference of references) {
    if (
      !reference.startsWith("--surface-") &&
      !sourcePrimitives.has(reference) &&
      !primitiveRgbAliases.has(reference)
    ) {
      findings.push(`${token} escapes the four-color source graph through ${reference}.`);
      continue;
    }
    traceSurface(reference, [...trail, token]);
  }
}

for (const [token] of surfaceDeclarations) traceSurface(token);

function hexToRgb(hex) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function luminance(rgb) {
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function composite(foreground, background, alpha) {
  return foreground.map(
    (channel, index) => channel * alpha + background[index] * (1 - alpha)
  );
}

const lime = hexToRgb("#B0E454");
const forest = hexToRgb("#224F10");
const ivory = hexToRgb("#EAFFD0");
const jet = hexToRgb("#0D0D0D");
const toneFamilies = [
  {
    tone: "dark",
    surfaces: ["--surface-page", "--surface-card-dark", "--surface-action-dark"],
    contracts: [
      { token: "--text-primary", color: ivory, alpha: 1, minimum: 4.5 },
      { token: "--text-secondary", color: ivory, alpha: 0.72, minimum: 4.5 },
      { token: "--text-muted", color: ivory, alpha: 0.64, minimum: 4.5 },
      { token: "--border-subtle", color: ivory, alpha: 0.08, minimum: 1 },
      { token: "--border-default", color: ivory, alpha: 0.14, minimum: 1 },
      { token: "--border-emphasis", color: lime, alpha: 0.32, minimum: 1 },
      { token: "--border-control", color: lime, alpha: 0.56, minimum: 3 },
      { token: "--border-state", color: lime, alpha: 1, minimum: 3 },
      { token: "--focus-ring", color: lime, alpha: 0.56, minimum: 3 },
    ],
  },
  {
    tone: "light",
    surfaces: ["--surface-paper", "--surface-card-light"],
    contracts: [
      { token: "--text-primary", color: jet, alpha: 1, minimum: 4.5 },
      { token: "--text-secondary", color: jet, alpha: 0.68, minimum: 4.5 },
      { token: "--text-muted", color: jet, alpha: 0.58, minimum: 4.5 },
      { token: "--border-subtle", color: jet, alpha: 0.1, minimum: 1 },
      { token: "--border-default", color: jet, alpha: 0.16, minimum: 1 },
      { token: "--border-emphasis", color: forest, alpha: 0.32, minimum: 1 },
      { token: "--border-control", color: forest, alpha: 0.64, minimum: 3 },
      { token: "--border-state", color: forest, alpha: 1, minimum: 3 },
      { token: "--focus-ring", color: forest, alpha: 0.64, minimum: 3 },
    ],
  },
  {
    tone: "action",
    surfaces: ["--surface-action"],
    contracts: [
      { token: "--text-primary", color: jet, alpha: 1, minimum: 4.5 },
      { token: "--text-secondary", color: jet, alpha: 0.72, minimum: 4.5 },
      { token: "--text-muted", color: jet, alpha: 0.62, minimum: 4.5 },
      { token: "--border-subtle", color: jet, alpha: 0.1, minimum: 1 },
      { token: "--border-default", color: jet, alpha: 0.16, minimum: 1 },
      { token: "--border-emphasis", color: jet, alpha: 0.32, minimum: 1 },
      { token: "--border-control", color: jet, alpha: 0.72, minimum: 3 },
      { token: "--border-state", color: jet, alpha: 1, minimum: 3 },
      { token: "--focus-ring", color: jet, alpha: 0.72, minimum: 3 },
    ],
  },
];

const toneMinimums = [];
let contrastPairCount = 0;
for (const family of toneFamilies) {
  for (const contract of family.contracts) {
    let minimumResult = null;
    for (const surface of family.surfaces) {
      const background = hexToRgb(expectedResolved.get(surface));
      const foreground = composite(contract.color, background, contract.alpha);
      const ratio = contrast(foreground, background);
      contrastPairCount += 1;
      if (minimumResult === null || ratio < minimumResult.ratio) {
        minimumResult = { ratio, surface };
      }
      if (ratio < contract.minimum) {
        findings.push(
          `${family.tone} ${contract.token} is ${ratio.toFixed(2)}:1 on ${surface}; minimum is ${contract.minimum}:1.`
        );
      }
    }
    toneMinimums.push({
      tone: family.tone,
      token: contract.token,
      ...minimumResult,
    });
  }
}

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) return listSourceFiles(url);
      return /\.(?:css|tsx?|mjs)$/.test(entry.name) ? [url] : [];
    })
  );
  return nested.flat();
}

const appFiles = await listSourceFiles(new URL("../app/", import.meta.url));
for (const file of appFiles) {
  if (file.pathname.endsWith("/theme/color-palette.css")) continue;
  const source = await readFile(file, "utf8");
  for (const edgeToken of canonicalSurfaceEdges.keys()) {
    if (source.includes(`var(${edgeToken})`)) {
      findings.push(
        `${file.pathname} directly consumes ${edgeToken}; components must use contextual border aliases.`
      );
    }
  }
  for (const removedToken of removedTokens) {
    if (source.includes(removedToken)) {
      findings.push(
        `${file.pathname} references removed token ${removedToken}.`
      );
    }
  }
}

if (findings.length > 0) {
  console.error("Surface token graph validation failed:\n");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log("Surface token graph validation passed.");
  console.log(`Source primitives: ${sourcePrimitives.size}`);
  console.log(`Surface aliases traced: ${surfaceDeclarations.length}`);
  console.log(`Canonical surfaces: ${canonicalSurfaces.size}`);
  console.log(`Surface edge contracts: ${canonicalSurfaceEdges.size}`);
  console.log(`Tone/surface contrast pairs: ${contrastPairCount}`);
  for (const result of toneMinimums) {
    console.log(
      `${result.tone} ${result.token}: ${result.ratio.toFixed(2)}:1 minimum on ${result.surface}`
    );
  }
}
