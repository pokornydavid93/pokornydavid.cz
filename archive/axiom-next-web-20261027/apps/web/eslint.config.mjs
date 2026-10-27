import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Browser evidence and compiled Playwright caches are generated output.
    ".tmp/**",
    "artifacts/**",
    "test-artifacts/**",
    "test-results/**",
    "playwright-report/**",
    // Generated runtime assets are not source.
    "public/assets/**",
    "public/bird/**",
    "public/birdos/**",
    "public/rootfs/**",
    "public/wasm/**",
    "public/workers/**",
  ]),
]);

export default eslintConfig;
