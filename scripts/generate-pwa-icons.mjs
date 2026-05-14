/**
 * Rasterize `public/assets/the-card-logo.png` into square PWA / touch icons
 * with letterboxing on #071f13 (manifest background) so the mark stays centered
 * and never clipped.
 *
 * Run: npm run generate:pwa-icons
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public/assets/the-card-logo.png");
const bg = "#071f13";

async function emitSquare(size, outName) {
  await sharp(src)
    .resize(size, size, {
      fit: "contain",
      background: bg,
      position: "centre",
    })
    .png()
    .toFile(path.join(root, "public", outName));
  console.log(`Wrote public/${outName} (${size}×${size})`);
}

await emitSquare(192, "icon-192.png");
await emitSquare(512, "icon-512.png");
/** iOS home screen (recommended minimum). */
await emitSquare(180, "apple-touch-icon.png");
/** Small tab favicon. */
await emitSquare(32, "icon-32.png");
