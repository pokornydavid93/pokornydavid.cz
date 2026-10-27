import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Build-time derivatives only. The authored 256px avatars and original photos
// stay unchanged; standalone hosting does not require an image optimizer.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const directory = fileURLToPath(new URL("../public/images/testimonials/", import.meta.url));
for (const name of ["denisa-reznickova", "stanislav-dvorak", "pavla-kucerova"]) {
  for (const width of [64, 96, 144]) {
    const output = path.join(directory, `${name}-avatar-${width}.webp`);
    const result = await sharp(path.join(directory, `${name}-avatar.webp`))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 })
      .toFile(output);
    console.log(`${path.basename(output)}: ${result.width}x${result.height}, ${result.size} bytes`);
  }
}
