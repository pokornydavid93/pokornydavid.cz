import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const moduleCache = new Map();

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) return collectFiles(absolutePath);
    if (!stats.isFile()) return [];

    return [path.relative(rootDir, absolutePath).split(path.sep).join("/")];
  });
}

function resolveTsModule(specifier, parentFile) {
  if (!specifier.startsWith(".")) return { external: true, value: specifier };

  const base = path.resolve(path.dirname(parentFile), specifier);
  const candidates = [base, `${base}.ts`, path.join(base, "index.ts")];
  const resolved = candidates.find((candidate) => {
    try {
      readFileSync(candidate);
      return true;
    } catch {
      return false;
    }
  });

  if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${parentFile}`);
  return { external: false, value: resolved };
}

function loadTsModule(filePath) {
  const resolvedPath = path.resolve(filePath);
  const cached = moduleCache.get(resolvedPath);
  if (cached) return cached.exports;

  const source = readFileSync(resolvedPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: resolvedPath,
  }).outputText;
  const cjsModule = { exports: {} };
  moduleCache.set(resolvedPath, cjsModule);

  const localRequire = (specifier) => {
    const target = resolveTsModule(specifier, resolvedPath);
    return target.external ? require(target.value) : loadTsModule(target.value);
  };
  const execute = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    output
  );
  execute(
    localRequire,
    cjsModule,
    cjsModule.exports,
    resolvedPath,
    path.dirname(resolvedPath)
  );

  return cjsModule.exports;
}

const validationModule = loadTsModule(
  path.join(
    rootDir,
    "app/design-language/components/registry/validate.ts"
  )
);
const sourceFiles = ["app", "src", "tests"].flatMap((directory) =>
  collectFiles(path.join(rootDir, directory))
);
const result = validationModule.validateComponentRegistry({ sourceFiles });

console.log("Component & layout registry validation");
console.log(`Runtime contracts: ${result.summary.runtime}`);
console.log(`Layout / UI / Form / Navigation / Domain: ${Object.values(result.summary.kinds).join(" / ")}`);
console.log(`Composition patterns: ${result.summary.patterns}`);
console.log(`Page templates: ${result.summary.templates}`);
console.log(`Route families: ${result.summary.routeFamilies}`);
console.log(
  `Maturity specified / implemented / verified / live: ${Object.values(result.summary.maturity).join(" / ")}`
);

if (!result.valid) {
  console.error(`\nRegistry validation failed with ${result.findings.length} finding(s):`);
  result.findings.forEach((finding) => {
    const entry = finding.entryId ? ` [${finding.entryId}]` : "";
    console.error(`- ${finding.code}${entry}: ${finding.message}`);
  });
  process.exitCode = 1;
} else {
  console.log("Registry validation passed.");
}
