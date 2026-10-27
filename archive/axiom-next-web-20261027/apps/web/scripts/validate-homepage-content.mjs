import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const moduleCache = new Map();

function resolveTsModule(specifier, parentFile) {
  if (specifier === "server-only") return { external: false, noop: true };
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
    // Workspace contracts export TypeScript, while article-editorial exposes
    // an import-only ESM entry. Resolve their public exports, then use the same
    // transpiler as app modules instead of asking Node to parse raw TS as JS.
    if (specifier.startsWith("@axiom-dp/") || specifier.startsWith("@axiom/")) {
      const resolved = fileURLToPath(import.meta.resolve(specifier));
      return { external: !/\.(?:ts|tsx|mts)$/u.test(resolved), value: resolved };
    }
    return { external: true, value: specifier };
  }

  const base = specifier.startsWith("@/")
    ? path.join(rootDir, specifier.slice(2))
    : path.resolve(path.dirname(parentFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
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

  const output = ts.transpileModule(readFileSync(resolvedPath, "utf8"), {
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
    if (target.noop) return {};
    return target.external ? require(target.value) : loadTsModule(target.value);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(
    localRequire,
    cjsModule,
    cjsModule.exports,
    resolvedPath,
    path.dirname(resolvedPath),
  );

  return cjsModule.exports;
}

const { validateHomepageContent } = loadTsModule(
  path.join(rootDir, "lib/homepage/validate.ts"),
);
const requireLaunchReady = process.env.HOMEPAGE_REQUIRE_LAUNCH_READY === "1";
const result = validateHomepageContent({ requireLaunchReady });
const structurallyValid = !result.findings.some((finding) => finding.severity === "error");

console.log("Homepage content validation");
console.log(`Structural validity: ${structurallyValid ? "pass" : "fail"}`);
console.log(`Launch readiness: ${result.releaseReady ? "ready" : "blocked"}`);
console.log(`Requested gate: ${result.valid ? "pass" : "fail"}`);

result.findings.forEach((finding) => {
  const output = finding.severity === "error" ? console.error : console.warn;
  output(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
});

if (!result.valid) process.exitCode = 1;
