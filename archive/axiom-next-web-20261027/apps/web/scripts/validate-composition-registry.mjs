import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const moduleCache = new Map();

function collectFiles(dir) {
  const entries = readdirSync(dir);

  return entries.flatMap((entry) => {
    const absolutePath = path.join(dir, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) return collectFiles(absolutePath);
    if (!stats.isFile()) return [];

    return [path.relative(rootDir, absolutePath).split(path.sep).join("/")];
  });
}

function isRouteSourceFile(filePath) {
  return /(^|\/)(page|not-found)\.(ts|tsx)$/.test(filePath);
}

function resolveTsModule(specifier, parentFile) {
  if (!specifier.startsWith(".")) {
    return { external: true, value: specifier };
  }

  const base = path.resolve(path.dirname(parentFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
  ];
  const resolved = candidates.find((candidate) => {
    try {
      readFileSync(candidate);
      return true;
    } catch {
      return false;
    }
  });

  if (!resolved) {
    throw new Error(`Cannot resolve ${specifier} from ${parentFile}`);
  }

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
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: resolvedPath,
  }).outputText;
  const cjsModule = { exports: {} };
  moduleCache.set(resolvedPath, cjsModule);

  const localRequire = (specifier) => {
    const target = resolveTsModule(specifier, resolvedPath);
    return target.external ? require(target.value) : loadTsModule(target.value);
  };
  const fn = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    output
  );
  fn(
    localRequire,
    cjsModule,
    cjsModule.exports,
    resolvedPath,
    path.dirname(resolvedPath)
  );

  return cjsModule.exports;
}

const validationModule = loadTsModule(
  path.join(rootDir, "app/design-language/compositions/validation/validate-registry.ts")
);
const appSourceFiles = collectFiles(path.join(rootDir, "app"));
const result = validationModule.validateCompositionRegistry({
  appSourceFiles,
  appRouteSourceFiles: appSourceFiles.filter(isRouteSourceFile),
});

console.log("Composition registry validation");
console.log(`Compositions: ${result.summary.compositions}`);
console.log(`Layout recipes: ${result.summary.layoutRecipes}`);
console.log(`Domain recipes: ${result.summary.domainRecipes}`);
console.log(`Templates: ${result.summary.templates}`);
console.log(`Instances: ${result.summary.instances}`);
console.log(`Routes: ${result.summary.routes}`);
console.log(`Mapped sections: ${result.summary.mappedSections}`);
console.log(`Explicit exceptions: ${result.summary.exceptions}`);
console.log(`Unmapped sections: ${result.summary.unmapped}`);
console.log(`Fixture profiles: ${result.summary.fixtures}`);
console.log(`Specimens: ${result.summary.specimens}`);
console.log(
  `Reviewed specimen coverage: ${result.summary.reviewedSpecimenComplete}/${result.summary.reviewedSpecimenTargets}`
);
console.log(`Route source manifests: ${result.summary.routeSourceManifests}`);
console.log(`Route inventory files: ${result.summary.routeSourceInventoryFiles}`);

if (result.warnings.length > 0) {
  console.log("");
  console.log(`Warnings: ${result.warnings.length}`);
  result.warnings.slice(0, 12).forEach((warning) => {
    console.log(`  - ${warning}`);
  });
}

if (result.errors.length > 0) {
  console.log("");
  console.log(`Errors: ${result.errors.length}`);
  result.errors.slice(0, 30).forEach((error) => {
    console.log(`  - ${error}`);
  });
  process.exitCode = 1;
}
