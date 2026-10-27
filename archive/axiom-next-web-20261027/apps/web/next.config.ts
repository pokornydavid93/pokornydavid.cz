import type { NextConfig } from "next";
import { resolve } from "node:path";
import { readdirSync, lstatSync } from "node:fs";

const workspaceRoot = resolve(__dirname, "../..");
const virtualStore = resolve(workspaceRoot, "node_modules/.pnpm");
const runtimePayloads = ["react", "semver", "styled-jsx"].flatMap((name) => {
  const variants = readdirSync(virtualStore, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${name}@`))
    .map((entry) => entry.name).sort();
  if (!variants.length) throw new Error(`Missing web standalone dependency: ${name}`);
  return variants.map((variant) => {
    if (!/^[A-Za-z0-9@._+-]+$/u.test(variant) || !lstatSync(resolve(virtualStore, variant, "node_modules", name)).isDirectory()) {
      throw new Error(`Invalid web standalone dependency: ${name}`);
    }
    return `../../node_modules/.pnpm/${variant}/node_modules/${name}/**/*`;
  });
});

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  outputFileTracingIncludes: { "/*": runtimePayloads },
  transpilePackages: [
    "@axiom/web-core",
    "@axiom-dp/contracts",
    "@axiom-dp/surface-engine",
    "@axiom-dp/publication-runtime",
  ],
  devIndicators: false,
  experimental: {
    // Keep article/editor tooling styles out of unrelated public routes. The
    // default Turbopack grouping merged both into the homepage's blocking CSS.
    cssChunking: "graph",
    serverActions: {
      bodySizeLimit: "64kb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  images: {
    // Standalone self-hosting does not currently ship the image optimizer/sharp
    // runtime. Public image assets are pre-compressed AVIF/SVG, so keep passthrough.
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
