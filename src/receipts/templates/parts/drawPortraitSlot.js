/**
 * Portrait region: image cover + bottom vignette, or solid void silhouette with rim light.
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {CanvasImageSource | null | undefined} portraitImage
 */
export function drawPortraitSlot(dctx, portraitImage) {
  const { ctx, theme, layout: L } = dctx;
  const p = L.portrait;
  const bgBase = /** @type {string} */ (typeof theme.bgBase === "string" ? theme.bgBase : theme.bgBaseMid);

  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x, p.y, p.w, p.h);
  ctx.clip();

  let usePortrait = false;
  if (portraitImage) {
    const img = /** @type {{ naturalWidth?: number; naturalHeight?: number; width: number; height: number }} */ (
      portraitImage
    );
    const pw = img.naturalWidth || img.width || 0;
    const ph = img.naturalHeight || img.height || 0;
    usePortrait = pw > 0 && ph > 0;
  }
  if (usePortrait && portraitImage) {
    coverDraw(ctx, portraitImage, p.x, p.y, p.w, p.h);

    ctx.save();
    const fadeH = Math.max(92, Math.min(p.h * 0.34, p.bottomFeather));
    const vg = ctx.createLinearGradient(p.x, p.y + p.h - fadeH, p.x, p.y + p.h);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.58, hexToRgba(bgBase, 0.38));
    vg.addColorStop(1, hexToRgba(bgBase, 0.95));
    ctx.fillStyle = vg;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(p.x, p.y + p.h - fadeH - 8, p.w, fadeH + 12);
    ctx.restore();
  } else {
    drawOrganicSilhouette(ctx, p.x, p.y, p.w, p.h, theme, bgBase);
  }

  ctx.restore();

  ctx.save();
  const feather = ctx.createLinearGradient(0, p.y + p.h - p.bottomFeather, 0, p.y + p.h);
  feather.addColorStop(0, hexToRgba(bgBase, 0));
  feather.addColorStop(0.55, hexToRgba(bgBase, 0.38));
  feather.addColorStop(1, hexToRgba(bgBase, 0.84));
  ctx.fillStyle = feather;
  ctx.fillRect(p.x, p.y + p.h - p.bottomFeather, p.w, p.bottomFeather);
  ctx.restore();
}

/**
 * @param {string} hex
 * @param {number} a
 */
function hexToRgba(hex, a) {
  const h = String(hex).trim();
  if (h.startsWith("#") && h.length === 7) {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return `rgba(14,22,14,${a})`;
}

function coverDraw(ctx, img, dx, dy, dw, dh) {
  const iw = /** @type {{ naturalWidth?: number; width: number }} */ (img).naturalWidth || img.width;
  const ih = /** @type {{ naturalHeight?: number; height: number }} */ (img).naturalHeight || img.height;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = Math.max(0, (iw - sw) / 2);
  const sy = Math.max(0, (ih - sh) / 2);
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Head + neck + torso with ~3× head-width shoulder line (outward kick) before waist taper.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {import('../../theme/receiptThemes.js').ReceiptThemeTokens} theme
 * @param {string} baseFill
 */
function drawOrganicSilhouette(ctx, x, y, w, h, theme, baseFill) {
  const cx = x + w * 0.56;
  const headCy = y + h * 0.17;
  const rx = w * 0.12;
  const ry = rx * 1.15;
  const headW = rx * 2;
  const shoulderHalf = headW * 1.55;

  ctx.fillStyle = baseFill;

  ctx.beginPath();
  ctx.ellipse(cx, headCy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  const neckTopY = headCy + ry - 6;
  const neckBotY = headCy + ry + h * 0.1;
  const topW = rx * 0.65;
  const botW = rx * 1.05;
  const shift = w * 0.03;
  const nlx = cx - botW + shift * 2;
  const nrx = cx + botW + shift * 2;

  ctx.beginPath();
  ctx.moveTo(cx - topW + shift, neckTopY);
  ctx.lineTo(cx + topW + shift, neckTopY);
  ctx.lineTo(nrx, neckBotY);
  ctx.lineTo(nlx, neckBotY);
  ctx.closePath();
  ctx.fill();

  const shoulderY = neckBotY + h * 0.052;
  const lsx = cx - shoulderHalf;
  const rsx = cx + shoulderHalf;

  ctx.beginPath();
  ctx.moveTo(nlx, neckBotY);
  ctx.lineTo(lsx, shoulderY);
  ctx.quadraticCurveTo(x + w * 0.12, neckBotY + h * 0.38, x + w * 0.2, y + h * 0.88);
  ctx.quadraticCurveTo(x + w * 0.42, y + h * 0.95, x + w * 0.62, y + h * 0.93);
  ctx.quadraticCurveTo(x + w * 0.82, y + h * 0.88, x + w * 0.9, neckBotY + h * 0.36);
  ctx.lineTo(rsx, shoulderY);
  ctx.lineTo(nrx, neckBotY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = theme.accentBright;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rsx - w * 0.02, shoulderY + h * 0.04);
  ctx.quadraticCurveTo(x + w * 0.91, neckBotY + h * 0.34, x + w * 0.84, neckBotY + h * 0.52);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
