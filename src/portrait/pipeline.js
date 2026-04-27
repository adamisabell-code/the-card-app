import { MAX_PORTRAIT_REGENERATES } from "./types.js";
import {
  PORTRAIT_ENCODE_CORNER_RADIUS,
  PORTRAIT_OUTPUT,
  computeChestUpCropRect,
} from "./receiptPortraitSpec.js";

const MAX_BYTES = 15 * 1024 * 1024;
const MIN_EDGE = 256;

/** Revoke blob URLs when replacing or discarding a bundle (e.g. new upload). */
export function revokePortraitBundle(bundle) {
  revokeBundleUrls(bundle);
}

function revokeBundleUrls(bundle) {
  if (!bundle) return;
  const urls = [
    bundle.rawImageUrl,
    bundle.basePortraitUrl,
    bundle.styledPortraits?.neutral,
    bundle.styledPortraits?.winner,
    bundle.styledPortraits?.loser,
  ].filter(Boolean);
  for (const u of urls) {
    if (u.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateImageFile(file) {
  if (!file || !file.size) {
    return { ok: false, message: "Choose a photo to continue." };
  }
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    return { ok: false, message: "Use a JPG, PNG, or WebP photo." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Photo must be under 15 MB." };
  }
  return { ok: true };
}

/**
 * @param {number} w
 * @param {number} h
 * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
 */
export function validateImageDimensions(w, h) {
  if (w < MIN_EDGE || h < MIN_EDGE) {
    return Promise.resolve({
      ok: false,
      message: `Photo should be at least ${MIN_EDGE}px wide and tall for a clear receipt portrait.`,
    });
  }
  return Promise.resolve({ ok: true });
}

/**
 * Load image from file; read natural dimensions.
 * @param {File} file
 */
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ img, url, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    img.src = url;
  });
}

/** 4:5 chest-up crop → canonical `PORTRAIT_OUTPUT` pixels (identity anchor). */
function canvasToBasePortrait(img) {
  const { sx, sy, sw, sh } = computeChestUpCropRect(img.naturalWidth, img.naturalHeight);
  const outW = PORTRAIT_OUTPUT.width;
  const outH = PORTRAIT_OUTPUT.height;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode portrait."));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      "image/webp",
      0.92,
    );
  });
}

/**
 * Center-crop **cover** into the canonical receipt hero pixel frame (`PORTRAIT_OUTPUT`, 4:5 vertical)
 * so every provider returns the same raster dimensions as the local pipeline.
 * If the image is already exact size, returns the same URL. Otherwise creates a new
 * WebP blob URL and revokes `imageObjectUrl` when it was a `blob:` URL.
 *
 * @param {string} imageObjectUrl
 * @returns {Promise<string>}
 */
export function normalizePortraitRasterToReceiptHero(imageObjectUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const tw = PORTRAIT_OUTPUT.width;
      const th = PORTRAIT_OUTPUT.height;
      if (iw === tw && ih === th) {
        resolve(imageObjectUrl);
        return;
      }
      const scale = Math.max(tw / iw, th / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (tw - dw) / 2;
      const dy = (th - dh) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported."));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#080a0e";
      ctx.fillRect(0, 0, tw, th);
      ctx.drawImage(img, dx, dy, dw, dh);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not normalize portrait to receipt hero size."));
            return;
          }
          const out = URL.createObjectURL(blob);
          if (typeof imageObjectUrl === "string" && imageObjectUrl.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(imageObjectUrl);
            } catch {
              /* ignore */
            }
          }
          resolve(out);
        },
        "image/webp",
        0.92,
      );
    };
    img.onerror = () => reject(new Error("Could not load portrait for normalization."));
    img.src = imageObjectUrl;
  });
}

function pathRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rr);
  } else {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

/** Tunnel the subject like a broadcast intro — heavier falloff than a social portrait. */
function drawVignette(ctx, w, h, mode) {
  const edge = mode === "loser" ? 0.72 : mode === "winner" ? 0.56 : 0.6;
  const g = ctx.createRadialGradient(w * 0.5, h * 0.38, h * 0.06, w * 0.52, h * 0.5, h * 0.82);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, `rgba(0,0,0,${0.1 * edge})`);
  g.addColorStop(1, `rgba(0,0,0,${0.62 * edge})`);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Top wash — night stadium / depth (no literal scenery). */
function drawNightWash(ctx, w, h, mode) {
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.85);
  if (mode === "winner") {
    g.addColorStop(0, "rgba(8,35,48,0.35)");
    g.addColorStop(0.35, "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.12)");
  } else if (mode === "loser") {
    g.addColorStop(0, "rgba(45,12,0,0.42)");
    g.addColorStop(0.4, "rgba(0,0,0,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0.22)");
  } else {
    g.addColorStop(0, "rgba(12,22,42,0.38)");
    g.addColorStop(0.38, "rgba(0,0,0,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0.14)");
  }
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawStadiumGlow(ctx, w, h, mode) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const a1 = mode === "winner" ? 0.26 : mode === "loser" ? 0.12 : 0.15;
  const a2 = mode === "winner" ? 0.21 : mode === "loser" ? 0.1 : 0.11;
  const g1 = ctx.createRadialGradient(w * 0.12, -h * 0.02, 0, w * 0.2, h * 0.1, w * 0.55);
  g1.addColorStop(0, mode === "loser" ? `rgba(255,200,140,${a1})` : `rgba(140,230,255,${a1})`);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);
  const g2 = ctx.createRadialGradient(w * 0.94, -h * 0.02, 0, w * 0.8, h * 0.08, w * 0.48);
  g2.addColorStop(0, mode === "loser" ? `rgba(255,150,90,${a2})` : `rgba(100,220,255,${a2})`);
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Asymmetric key / fill read — title-card intro, not even ring light. */
function _drawBroadcastKeyLight(ctx, w, h, mode) {
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  let x0;
  let x1;
  if (mode === "loser") {
    x0 = w * 0.88;
    x1 = w * 0.18;
  } else if (mode === "winner") {
    x0 = w * 0.1;
    x1 = w * 0.82;
  } else {
    x0 = w * 0.14;
    x1 = w * 0.86;
  }
  const g = ctx.createLinearGradient(x0, -h * 0.04, x1, h * 1.02);
  if (mode === "winner") {
    g.addColorStop(0, "rgba(210,255,255,0.22)");
    g.addColorStop(0.42, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,35,48,0.28)");
  } else if (mode === "loser") {
    g.addColorStop(0, "rgba(255,130,70,0.1)");
    g.addColorStop(0.48, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(12,4,0,0.38)");
  } else {
    g.addColorStop(0, "rgba(215,225,245,0.14)");
    g.addColorStop(0.52, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(6,10,24,0.32)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyModeGrade(ctx, w, h, mode) {
  ctx.save();
  if (mode === "winner") {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(235,252,255,0.1)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(0,130,155,0.1)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(0,25,35,0.06)";
    ctx.fillRect(0, 0, w, h);
  } else if (mode === "loser") {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(38,12,6,0.26)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(130,35,8,0.08)";
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(16,22,38,0.16)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.52);
    g.addColorStop(0, "rgba(248,250,255,0.035)");
    g.addColorStop(0.42, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/** Teal/cyan (winner) or orange (loser) rim; neutral: cool silver micro-rim. */
function drawCinematicRim(ctx, w, h, r, mode) {
  const inset = 2.25;
  const rr = Math.max(4, r - inset * 0.45);
  ctx.save();
  pathRoundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, rr);
  ctx.globalCompositeOperation = "screen";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = mode === "winner" ? 2.85 : mode === "loser" ? 2.65 : 1.85;
  if (mode === "winner") {
    const grd = ctx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "rgba(0,255,250,0.55)");
    grd.addColorStop(0.45, "rgba(120,230,255,0.22)");
    grd.addColorStop(1, "rgba(0,200,230,0.48)");
    ctx.strokeStyle = grd;
  } else if (mode === "loser") {
    const grd = ctx.createLinearGradient(w, 0, 0, h);
    grd.addColorStop(0, "rgba(255,170,90,0.55)");
    grd.addColorStop(0.5, "rgba(255,100,40,0.22)");
    grd.addColorStop(1, "rgba(200,50,20,0.4)");
    ctx.strokeStyle = grd;
  } else {
    ctx.strokeStyle = "rgba(200,218,240,0.18)";
  }
  ctx.stroke();
  ctx.restore();
}

/** Premium inset panel — no white border. */
function drawInsetInnerHighlight(ctx, w, h, r) {
  ctx.save();
  pathRoundRect(ctx, 1, 1, w - 2, h - 2, r - 0.5);
  ctx.globalCompositeOperation = "soft-light";
  ctx.strokeStyle = "rgba(255,255,255,0.055)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/**
 * Rivalry-match intro look from base (same 4:5 geometry). Local pass for receipt brand; swap for API output later.
 * @param {string} baseObjectUrl
 * @param {'neutral' | 'winner' | 'loser'} mode
 */
export function applyReceiptStyleLocalPass(baseObjectUrl, mode) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const r = PORTRAIT_ENCODE_CORNER_RADIUS;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported."));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.save();
      pathRoundRect(ctx, 0, 0, w, h, r);
      ctx.clip();

      ctx.drawImage(img, 0, 0, w, h);
      drawVignette(ctx, w, h, mode);
      drawNightWash(ctx, w, h, mode);
      drawStadiumGlow(ctx, w, h, mode);
      applyModeGrade(ctx, w, h, mode);

      ctx.restore();

      drawInsetInnerHighlight(ctx, w, h, r);
      drawCinematicRim(ctx, w, h, r, mode);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not encode styled portrait."));
            return;
          }
          resolve(URL.createObjectURL(blob));
        },
        "image/webp",
        0.9,
      );
    };
    img.onerror = () => reject(new Error("Could not load base portrait."));
    img.src = baseObjectUrl;
  });
}

/**
 * Validate → raw blob URL + 4:5 base portrait (identity anchor for generation).
 * @param {File} file
 * @param {{ previousBundle?: import('./types.js').PortraitBundle | null }} [opts]
 * @returns {Promise<{ rawImageUrl: string, basePortraitUrl: string, naturalWidth: number, naturalHeight: number }>}
 */
export async function prepareBasePortraitFromFile(file, opts = {}) {
  const v = validateImageFile(file);
  if (!v.ok) throw new Error(v.message);

  const { img, url: rawTempUrl, w, h } = await loadImageFile(file);
  const dim = await validateImageDimensions(w, h);
  if (!dim.ok) {
    URL.revokeObjectURL(rawTempUrl);
    throw new Error(dim.message);
  }

  if (opts.previousBundle) {
    revokeBundleUrls(opts.previousBundle);
  }

  const rawImageUrl = URL.createObjectURL(file);
  URL.revokeObjectURL(rawTempUrl);

  const basePortraitUrl = await canvasToBasePortrait(img);
  return { rawImageUrl, basePortraitUrl, naturalWidth: w, naturalHeight: h };
}

/**
 * Full client-side pipeline: validate → preprocess (base) → local stylize (3 modes).
 * **Prefer** `generateReceiptPortraitBundle` in `generationService.js` so HTTP / placeholder providers apply.
 *
 * @param {File} file
 * @param {{ previousBundle?: import('./types.js').PortraitBundle | null }} [opts]
 * @returns {Promise<import('./types.js').PortraitBundle>}
 */
export async function runPortraitPipeline(file, opts = {}) {
  const { rawImageUrl, basePortraitUrl } = await prepareBasePortraitFromFile(file, opts);

  const [neutral, winner, loser] = await Promise.all([
    applyReceiptStyleLocalPass(basePortraitUrl, "neutral"),
    applyReceiptStyleLocalPass(basePortraitUrl, "winner"),
    applyReceiptStyleLocalPass(basePortraitUrl, "loser"),
  ]);

  return {
    rawImageUrl,
    basePortraitUrl,
    styledPortraits: { neutral, winner, loser },
    preferredMode: "neutral",
    regenerateCount: 0,
  };
}

/**
 * Re-run stylization from existing base only (same identity anchor), local canvas only.
 * Prefer `regeneratePortraitBundle` from `generationService.js` so the active image provider applies.
 * @param {import('./types.js').PortraitBundle} bundle
 */
export async function regenerateStyledPortraits(bundle) {
  if (bundle.regenerateCount >= MAX_PORTRAIT_REGENERATES) {
    throw new Error(`You can regenerate up to ${MAX_PORTRAIT_REGENERATES} times.`);
  }
  const prev = { ...bundle.styledPortraits };
  const [neutral, winner, loser] = await Promise.all([
    applyReceiptStyleLocalPass(bundle.basePortraitUrl, "neutral"),
    applyReceiptStyleLocalPass(bundle.basePortraitUrl, "winner"),
    applyReceiptStyleLocalPass(bundle.basePortraitUrl, "loser"),
  ]);
  for (const u of Object.values(prev)) {
    if (typeof u === "string" && u.startsWith("blob:")) URL.revokeObjectURL(u);
  }
  return {
    ...bundle,
    styledPortraits: { neutral, winner, loser },
    regenerateCount: bundle.regenerateCount + 1,
  };
}
