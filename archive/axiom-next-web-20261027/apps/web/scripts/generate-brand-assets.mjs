import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Use Next's pinned image processor and the same geometry/palette as the site.
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = require("sharp");
const logo = await readFile(path.join(app, "app/svgr/LogoMark.tsx"), "utf8");
const palette = await readFile(path.join(app, "app/theme/color-palette.css"), "utf8");
const geometry = logo.match(/export const LOGO_MARK_PATH = "([^"]+)";/)?.[1];
const viewBox = logo.match(/export const LOGO_MARK_VIEWBOX = "([^"]+)";/)?.[1];
const verdant = palette.match(/:root\[data-color-theme="verdant"\]\s*\{([^}]+)/)?.[1];
const lime = verdant?.match(/--brand-lime:\s*(#[\da-f]+)/i)?.[1];
const green = verdant?.match(/--brand-jet:\s*(#[\da-f]+)/i)?.[1];
if (!geometry || !viewBox || !lime || !green) {
  throw new Error("The canonical logo geometry and Verdant palette are required");
}

const markWidth = 175.60001;
const markHeight = 186.3;
const mark = (height, x, y) =>
  `<svg x="${x}" y="${y}" width="${height * markWidth / markHeight}" height="${height}" viewBox="${viewBox}"><path fill="${lime}" d="${geometry}"/></svg>`;
const iconHeight = 320;
const favicon = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="${green}"/>${mark(iconHeight, (512 - iconHeight * markWidth / markHeight) / 2, (512 - iconHeight) / 2)}</svg>\n`,
);
await writeFile(path.join(app, "public/favicon.svg"), favicon);
for (const [name, size] of [["favicon-96x96.png", 96], ["apple-touch-icon.png", 180]]) {
  const image = sharp(favicon).resize(size, size);
  // iOS applies its own corner mask; give its icon an opaque background.
  await (size === 180 ? image.flatten({ background: green }) : image)
    .png().toFile(path.join(app, "public", name));
}

// ICO embeds PNG frames so legacy clients and direct /favicon.ico requests
// share the full-resolution mark, including a >48px frame for search results.
const sizes = [16, 32, 48, 64, 128, 256];
const frames = await Promise.all(sizes.map(size => sharp(favicon).resize(size, size).png().toBuffer()));
const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + 16 * index;
  directory[entry] = sizes[index] % 256;
  directory[entry + 1] = sizes[index] % 256;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(path.join(app, "app/favicon.ico"), Buffer.concat([directory, ...frames]));

const socialHeight = 300;
const overlay = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${mark(socialHeight, (1200 - socialHeight * markWidth / markHeight) / 2, (630 - socialHeight) / 2)}</svg>`,
);
const social = await sharp(path.join(app, "public/hero-silk-home-frame-zero.avif"))
  .resize(1200, 630, { fit: "cover" })
  .composite([{ input: overlay }])
  .jpeg({ quality: 94, mozjpeg: true })
  .toBuffer();
// A new URL refreshes social crawlers; the old URL remains a valid fallback.
await writeFile(path.join(app, "public/og-logo-silk.jpg"), social);
await writeFile(path.join(app, "public/og.jpg"), social);
console.log("Generated lime monogram favicons, Apple icon and 1200x630 silk sharing image.");
