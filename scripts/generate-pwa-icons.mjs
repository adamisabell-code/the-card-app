/**
 * Copy the hand-authored master app icon into all PWA / favicon raster sizes.
 *
 * Source of truth: `public/assets/the-card-app-icon.png` (square master, opaque).
 * Outputs (overwritten each run):
 *   - public/icon-192.png
 *   - public/icon-512.png
 *   - public/apple-touch-icon.png (180×180)
 *   - public/icon-32.png
 *
 * Run: npm run generate:pwa-icons
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public/assets/the-card-app-icon.png");

async function emitScaled(size, outName) {
  await sharp(src)
    .resize(size, size, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toFile(path.join(root, "public", outName));
  console.log(`Wrote public/${outName} (${size}×${size}) from the-card-app-icon.png`);
}

await emitScaled(192, "icon-192.png");
await emitScaled(512, "icon-512.png");
await emitScaled(180, "apple-touch-icon.png");
await emitScaled(32, "icon-32.png");
