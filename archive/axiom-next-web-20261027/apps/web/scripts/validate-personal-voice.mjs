import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = path.resolve(webRoot, "../..");
const scannedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mdx",
  ".mjs",
  ".ts",
  ".tsx",
]);
const scanTargets = [
  path.join(webRoot, "app"),
  path.join(webRoot, "content"),
  path.join(webRoot, "lib"),
  path.join(webRoot, "src"),
  path.join(
    repositoryRoot,
    "packages/surface-engine/src/presets/funnels/mortgageIncomeDropCheck",
  ),
];
const ignoredDirectoryNames = new Set([
  ".next",
  "__tests__",
  "artifacts",
  "coverage",
  "node_modules",
  "test",
  "tests",
]);
const ignoredFilePattern = /\.(?:spec|test)\.[^.]+$/iu;
const authenticReviewSourcePattern =
  /(?:^|\/)content\/(?:testimonials?|reviews?)\.[^/]+$/iu;
// Standalone legal documents use formal third-person wording.
const formalLegalDocumentPaths = new Set([
  path.join(webRoot, "app/pravni-informace/page.tsx"),
  path.join(webRoot, "app/zasady-zpracovani-osobnich-udaju/page.tsx"),
  path.join(webRoot, "app/cookies-a-mereni/page.tsx"),
]);
const articleDocumentSuffix = ".article.json";
const articlePublicRootKeys = [
  "hero",
  "sections",
  "conclusion",
  "relatedTopics",
];
const wordStart = String.raw`(?<![\p{L}\p{N}_])`;
const wordEnd = String.raw`(?![\p{L}\p{N}_])`;
const articleThirdPersonPattern = new RegExp(
  `${wordStart}(?:david|pokorn|poradc)[\\p{L}]*${wordEnd}`,
  "giu",
);

const thirdPersonVerbs = [
  "doporučuje",
  "doporučí",
  "hledá",
  "kontroluje",
  "nabízí",
  "ozve(?:\\s+se)?",
  "pomáhá",
  "pomůže",
  "porovná",
  "poskytuje",
  "pošle",
  "pracuje",
  "propojuje",
  "provede",
  "připraví",
  "řeší",
  "vede",
  "vysvětluje",
  "vytáhne",
  "zavolá",
  "zkontroluje",
  "zjišťuje",
  "ukáže",
].join("|");

const corporatePluralVerbs = [
  "doporučujeme",
  "doporučíme",
  "evidujeme",
  "kontrolujeme",
  "nabízíme",
  "navrhujeme",
  "navrhneme",
  "ověřujeme",
  "ověříme",
  "pomáháme",
  "pomůžeme",
  "poradíme",
  "porovnáváme",
  "porovnáme",
  "poskytujeme",
  "používáme",
  "předáváme",
  "připravujeme",
  "připravíme",
  "provádíme",
  "provedeme",
  "sdílíme",
  "shromažďujeme",
  "spustíme",
  "specializujeme\\s+se",
  "uchováváme",
  "ukazujeme",
  "ukážeme",
  "ukládáme",
  "uložíme",
  "vyřešíme",
  "využíváme",
  "vysvětlujeme",
  "vysvětlíme",
  "věnujeme\\s+se",
  "zajišťujeme",
  "zajistíme",
  "zpracováváme",
  "zpracujeme",
  "zkontrolujeme",
  "měříme",
  "nastavujeme",
  "neděláme",
  "nepoužíváme",
  "nepředáváme",
  "pokusíme\\s+se",
].join("|");

const rules = [
  {
    id: "indirect-client-address",
    message: "David should address the visitor directly instead of speaking about 'people'.",
    pattern: new RegExp(
      `${wordStart}(?:pomáhám|pomohu)\\s+lidem${wordEnd}`,
      "giu",
    ),
  },
  {
    id: "david-third-person",
    message: "David must address the client in first person.",
    pattern: new RegExp(
      `${wordStart}David(?:\\s+Pokorný)?\\s+(?:${thirdPersonVerbs})${wordEnd}`,
      "giu",
    ),
  },
  {
    id: "david-third-person-action",
    message: "Address David directly instead of referring to him as a third party.",
    pattern: new RegExp(
      `${wordStart}(?:kontaktovat|napsat|poznat|volat|zavolat|zeptat\\s+se)\\s+David(?:a|ovi)?${wordEnd}`,
      "giu",
    ),
  },
  {
    id: "david-third-person-collaboration",
    message: "Use first-person collaboration copy instead of 'with David'.",
    pattern: new RegExp(
      `${wordStart}(?:domluvit|konzultovat|ověřit|probrat|projít|řešit|zkontrolovat)[^.!?\\n]{0,48}${wordStart}s\\s+Davidem${wordEnd}`,
      "giu",
    ),
  },
  {
    id: "advisor-third-person",
    message: "The advisor is David; rewrite this passage in his first-person voice.",
    pattern: new RegExp(
      `${wordStart}(?:hodnota\\s+(?:finančního\\s+)?poradce|(?:finanční\\s+)?poradce(?:,\\s+který|\\s+(?:${thirdPersonVerbs})))${wordEnd}`,
      "giu",
    ),
  },
  {
    id: "advisor-third-person-action",
    message: "Use direct first-person collaboration instead of 'with an advisor'.",
    pattern: new RegExp(
      `${wordStart}s\\s+(?:finančním\\s+)?poradcem${wordEnd}`,
      "giu",
    ),
  },
  {
    id: "corporate-plural-action",
    message: "Use David's singular voice, or make a genuinely shared action explicit.",
    pattern: new RegExp(
      `${wordStart}(?:${corporatePluralVerbs})${wordEnd}`,
      "giu",
    ),
    allowWhen: ({ context }) =>
      /(?<![\p{L}\p{N}_])(?:spolu|společně)(?![\p{L}\p{N}_])/iu.test(
        context,
      ),
  },
  {
    id: "corporate-plural-follow-up",
    message: "Use a singular follow-up such as 'ozvu se'.",
    pattern: new RegExp(
      `${wordStart}(?:budeme\\s+vás\\s+kontaktovat|ozveme\\s+se|vaši\\s+žádost\\s+jsme\\s+(?:obdrželi|přijali|zpracovali))${wordEnd}`,
      "giu",
    ),
  },
  {
    id: "corporate-plural-pronoun",
    message: "Replace the company-style plural with David's personal voice.",
    pattern: new RegExp(
      `${wordStart}(?:kontaktujte\\s+nás|naše\\s+(?:řešení|služby|společnost|zkušenosti)|naši\\s+(?:poradci|specialisté)|naším\\s+cílem|napište\\s+nám|náš\\s+(?:přístup|tým|web)|obraťte\\s+se\\s+na\\s+nás|u\\s+nás|zavolejte\\s+nám)${wordEnd}`,
      "giu",
    ),
  },
];

function relativePath(file) {
  return path.relative(repositoryRoot, file).split(path.sep).join("/");
}

function collectFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    if (ignoredDirectoryNames.has(entry)) return [];

    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) return collectFiles(absolutePath);
    if (!stats.isFile()) return [];

    const normalizedPath = relativePath(absolutePath);
    if (!scannedExtensions.has(path.extname(absolutePath))) return [];
    if (ignoredFilePattern.test(normalizedPath)) return [];
    if (authenticReviewSourcePattern.test(normalizedPath)) return [];
    if (formalLegalDocumentPaths.has(absolutePath)) return [];

    return [absolutePath];
  });
}

function maskPreservingLines(value) {
  return value.replace(/[^\r\n]/gu, " ");
}

function maskAuthenticQuotes(source, extension) {
  let masked = source;

  if (extension === ".md" || extension === ".mdx") {
    masked = masked.replace(
      /^(?:[ \t]*>.*(?:\r?\n|$))+/gmu,
      maskPreservingLines,
    );
  }

  masked = masked
    .replace(/<blockquote\b[\s\S]*?<\/blockquote>/giu, maskPreservingLines)
    .replace(
      /\{\s*type\s*:\s*["']quote["'][\s\S]*?\n\s*\},?/giu,
      maskPreservingLines,
    )
    .replace(/\bquote\s*=\s*["'][^"']*["']/giu, maskPreservingLines)
    .replace(
      /\bquote\s*=\s*\{\s*["'][\s\S]*?["']\s*\}/giu,
      maskPreservingLines,
    );

  return masked;
}

function getLineNumber(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function getSentenceContext(source, offset, length) {
  const boundaryPattern = /[.!?\n]/u;
  let start = offset;
  let end = offset + length;

  while (start > 0 && !boundaryPattern.test(source[start - 1])) start -= 1;
  while (end < source.length && !boundaryPattern.test(source[end])) end += 1;

  return source.slice(start, end).replace(/\s+/gu, " ").trim();
}

function collectFindings() {
  const findings = new Map();
  const files = scanTargets.flatMap(collectFiles);

  files.forEach((file) => {
    const source = readFileSync(file, "utf8");
    const maskedSource = maskAuthenticQuotes(source, path.extname(file));
    const lines = source.split(/\r?\n/u);

    rules.forEach((rule) => {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match = pattern.exec(maskedSource);

      while (match) {
        const line = getLineNumber(maskedSource, match.index);
        const context = getSentenceContext(
          source,
          match.index,
          match[0].length,
        );

        if (!rule.allowWhen?.({ context, file, match })) {
          const finding = {
            file: relativePath(file),
            line,
            message: rule.message,
            preview: lines[line - 1]?.trim().replace(/\s+/gu, " ") ?? "",
            rule: rule.id,
          };
          findings.set(
            `${finding.file}:${finding.line}:${finding.rule}`,
            finding,
          );
        }

        match = pattern.exec(maskedSource);
      }
    });
  });

  return Array.from(findings.values()).sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule),
  );
}

function visitStrings(value, jsonPath, visit) {
  if (typeof value === "string") {
    visit(value, jsonPath);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      visitStrings(item, `${jsonPath}.${index}`, visit),
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  Object.entries(value).forEach(([key, item]) =>
    visitStrings(item, `${jsonPath}.${key}`, visit),
  );
}

function collectArticleDocumentFindings() {
  const blogDirectory = path.join(webRoot, "content/blog");

  return collectFiles(blogDirectory)
    .filter((file) => file.endsWith(articleDocumentSuffix))
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const document = JSON.parse(source);
      const findings = [];

      articlePublicRootKeys.forEach((rootKey) => {
        visitStrings(document[rootKey], rootKey, (value, jsonPath) => {
          const match = articleThirdPersonPattern.exec(value);
          articleThirdPersonPattern.lastIndex = 0;
          if (!match) return;

          const serializedValue = JSON.stringify(value);
          const offset = Math.max(0, source.indexOf(serializedValue));

          findings.push({
            file: relativePath(file),
            line: getLineNumber(source, offset),
            message:
              "Article copy must use David's first-person voice and address the client directly.",
            preview: `${jsonPath}: ${value}`,
            rule: "article-author-third-person",
          });
        });
      });

      return findings;
    });
}

const findings = [...collectFindings(), ...collectArticleDocumentFindings()].sort(
  (left, right) =>
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.rule.localeCompare(right.rule),
);

if (findings.length > 0) {
  console.error(
    `Personal voice validation failed with ${findings.length} finding(s):\n`,
  );
  findings.forEach((finding) => {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`,
    );
    console.error(`  ${finding.preview}`);
  });
  process.exitCode = 1;
} else {
  console.log("Personal voice validation passed.");
  console.log(
    "David speaks directly in first person; formal legal documents are excluded and no company-style plural was found.",
  );
}
