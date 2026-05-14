/**
 * Build square PWA / touch icons from `public/assets/the-card-logo.png`.
 *
 * Renders an opaque #071f13 canvas, then composites the logo scaled to fit
 * inside a padded inner box (aspect preserved). Avoids `resize(..., contain)`
 * edge cases that can leave transparent/white bands on wide marks.
 *
 * Run: npm run generate:pwa-icons
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public/assets/the-card-logo.png");
const BG = { r: 7, g: 31, b: 19 };

/** ~18% inset each side → logo uses ~64% of the edge (generous padding). */
const INNER_RATIO = 0.64;

async function emitSquare(size, outName) {
  const inner = Math.max(8, Math.round(size * INNER_RATIO));

  const logoBuf = await sharp(src)
    .resize(inner, inner, {
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const meta = await sharp(logoBuf).metadata();
  const w = meta.width ?? inner;
  const h = meta.height ?? inner;
  const left = Math.round((size - w) / 2);
  const top = Math.round((size - h) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: logoBuf, left, top }])
    .png()
    .toFile(path.join(root, "public", outName));

  console.log(`Wrote public/${outName} (${size}×${size}, inner≈${inner}px)`);
}

await emitSquare(192, "icon-192.png");
await emitSquare(512, "icon-512.png");
/** iOS home screen (recommended minimum). */
await emitSquare(180, "apple-touch-icon.png");
/** Small tab favicon. */
await emitSquare(32, "icon-32.png");
