import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postcss from "postcss";

const cssPath = path.resolve(process.cwd(), "app/theme/color-palette.css");
const root = postcss.parse(fs.readFileSync(cssPath, "utf8"), {
  from: cssPath,
});

const declarations = new Map();

root.walkRules(':root[data-color-theme="verdant"]', (rule) => {
  rule.walkDecls((declaration) => {
    declarations.set(declaration.prop, declaration.value.trim().toLowerCase());
  });
});

const requiredValues = new Map([
  ["--brand-lime", "#cbec10"],
  ["--brand-forest", "#116e1c"],
  ["--brand-ivory", "#f6f4e8"],
  ["--brand-jet", "#022c12"],
  ["--surface-card-light", "#fff"],
  ["--text-on-dark-secondary", "#ffffffd9"],
  ["--text-on-dark-muted", "#ffffffa6"],
  ["--text-on-light-secondary", "#39463e"],
  ["--border-on-dark-subtle", "#fff3"],
  ["--border-on-light-subtle", "#022c121a"],
  ["--status-info-indicator", "#007cdc"],
  ["--theme-transparent", "#0000"],
]);

const failures = [];

for (const [property, expected] of requiredValues) {
  const actual = declarations.get(property);
  if (actual !== expected) {
    failures.push(`${property}: expected ${expected}, received ${actual ?? "missing"}`);
  }
}

const hexToRgb = (hex) => {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((character) => character.repeat(2)).join("")
    : normalized.slice(0, 6);
  const numeric = Number.parseInt(expanded, 16);

  return [numeric >> 16, (numeric >> 8) & 255, numeric & 255];
};

const relativeLuminance = (hex) => {
  const channels = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrast = (foreground, background) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const contrastContracts = [
  ["deep ink / paper", "#022c12", "#f6f4e8", 7],
  ["secondary copy / paper", "#39463e", "#f6f4e8", 7],
  ["trust green / paper", "#116e1c", "#f6f4e8", 4.5],
  ["lime action / deep ink", "#cbec10", "#022c12", 7],
  ["white / deep ink", "#ffffff", "#022c12", 7],
  ["white / trust green", "#ffffff", "#116e1c", 4.5],
  ["trust green / lime", "#116e1c", "#cbec10", 4.5],
];

for (const [label, foreground, background, minimum] of contrastContracts) {
  const ratio = contrast(foreground, background);
  if (ratio < minimum) {
    failures.push(
      `${label}: ${ratio.toFixed(2)}:1 is below the ${minimum}:1 contract`,
    );
  }
}

for (const [property, value] of declarations) {
  if (property.startsWith("--text-") && value.includes("#007cdc")) {
    failures.push(`${property}: informational blue must not be used as body text`);
  }
}

if (failures.length > 0) {
  console.error("Site theme validation failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Site theme validation passed (${requiredValues.size} role mappings, ${contrastContracts.length} contrast contracts).`,
);
