import { drawGlowText } from "./drawTextEffects.js";

const HEAD_PT = 240;
/** Scratched-paint erosion: lowered so orange “BAD” keeps saturation */
const HEADLINE_EROSION_ALPHA = 0.1;

/**
 * Glyph-only distress: offscreen layers, seeded destination-out erosion, composites at (x,y).
 * Extra base passes add pigment before erosion (used for accented “BAD”).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} font
 * @param {string} letterSpacingCss
 * @param {string} baseFill
 * @param {string} highlightFill
 * @param {number} seed
 * @param {{ baseLayers?: number }} [opts]
 */
function drawErodedWord(ctx, text, x, y, font, letterSpacingCss, baseFill, highlightFill, seed, opts) {
  const baseLayers = Math.max(1, Math.min(3, opts?.baseLayers ?? 1));

  ctx.save();
  ctx.font = font;
  ctx.letterSpacing = letterSpacingCss;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const tw = Math.ceil(ctx.measureText(text).width);
  ctx.restore();

  const pad = 20;
  const doc = typeof document !== "undefined" ? document : null;
  if (!doc) {
    ctx.save();
    ctx.font = font;
    ctx.letterSpacing = letterSpacingCss;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = baseFill;
    for (let b = 0; b < baseLayers; b++) ctx.fillText(text, x, y);
    ctx.fillStyle = highlightFill;
    ctx.globalAlpha = 0.5;
    ctx.fillText(text, x + 1, y);
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  const c = doc.createElement("canvas");
  c.width = tw + pad * 2;
  c.height = Math.ceil(HEAD_PT + pad * 2);
  const ox = /** @type {CanvasRenderingContext2D} */ (c.getContext("2d"));
  ox.font = font;
  ox.letterSpacing = letterSpacingCss;
  ox.textBaseline = "top";
  ox.textAlign = "left";
  ox.fillStyle = baseFill;
  for (let b = 0; b < baseLayers; b++) ox.fillText(text, pad, pad);
  ox.fillStyle = highlightFill;
  ox.globalAlpha = 0.5;
  ox.fillText(text, pad + 1, pad);
  ox.globalAlpha = 1;

  ox.globalCompositeOperation = "destination-out";
  ox.globalAlpha = HEADLINE_EROSION_ALPHA;
  let s = (seed >>> 0) ^ (tw * 131);
  const gw = c.width;
  const gh = c.height;
  for (let i = 0; i < 780; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const px = (s >>> 8) % gw;
    const py = (s >>> 20) % gh;
    const rw = 1 + (s & 3);
    const rh = 1 + ((s >>> 2) & 3);
    ox.fillStyle = "#f4ead8";
    ox.fillRect(px, py, rw, rh);
  }
  ox.globalAlpha = 1;
  ox.globalCompositeOperation = "source-over";

  ctx.drawImage(c, x - pad, y - pad);
}

/**
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ headlineTop: string; headlineBottom: string; money: string; subheadline: string }} t
 */
export function drawHeadlineBlock(dctx, t) {
  const { ctx, theme, layout: L, fonts, effects } = dctx;
  const h = L.headline;
  const spacing = "-3px";
  const fallbackLineConfigs = [
    { color: "textCream", italic: false },
    { color: "accent", italic: true },
  ];
  const lineConfigs = Array.isArray(theme.headline?.lines) ? theme.headline.lines : fallbackLineConfigs;
  const lineSpecs = [
    { text: t.headlineTop, x: h.down.x, y: h.down.y, seed: (h.down.x << 16) ^ h.down.y },
    { text: t.headlineBottom, x: h.bad.x, y: h.bad.y, seed: (h.bad.x << 15) ^ h.bad.y },
  ];

  lineSpecs.forEach((line, idx) => {
    const cfg = lineConfigs[idx] ?? fallbackLineConfigs[idx];
    const colorToken = cfg?.color === "textCream" ? "textCream" : "accent";
    const baseFill = colorToken === "textCream" ? theme.textCream : theme.accent;
    const highlightFill = colorToken === "accent" ? theme.accentBright : "rgba(255,246,226,0.85)";
    const fontStyle = cfg?.italic ? "italic " : "";
    const font = `${fontStyle}900 ${HEAD_PT}px Impact, Arial Black, sans-serif`;
    const baseLayers = colorToken === "accent" ? 2 : 1;

    drawErodedWord(ctx, line.text, line.x, line.y, font, spacing, baseFill, highlightFill, line.seed, {
      baseLayers,
    });
  });

  const moneyText = t.money;
  ctx.save();
  ctx.font = fonts.money;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const mx = h.money.x;
  const my = h.money.y;
  const mw = ctx.measureText(moneyText).width;
  const mcx = mx + mw * 0.48;
  const mcy = my + Math.min(100, effects.headlineMoneyGlowBlur * 0.52);

  ctx.filter = "blur(40px)";
  const rg = ctx.createRadialGradient(mcx, mcy, 4, mcx, mcy, 120);
  rg.addColorStop(0, theme.moneyGlow);
  rg.addColorStop(0.45, "rgba(232,115,44,0.28)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.globalAlpha = 0.95;
  ctx.fillRect(mx - 140, my - 20, mw + 280, 220);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.restore();

  drawGlowText(ctx, moneyText, mx, my, fonts.money, theme.accentBright, theme.moneyGlowRgb, 40, Math.min(4, effects.moneyGlowPasses));

  ctx.save();
  ctx.font = fonts.money;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(10, 4, 2, 0.58)";
  ctx.strokeText(moneyText, mx, my);
  ctx.restore();

  ctx.save();
  const subUpper = t.subheadline.toUpperCase();
  ctx.font = fonts.money;
  const mm = ctx.measureText(moneyText);
  const moneyAsc = mm.actualBoundingBoxAscent ?? 102;
  const moneyDesc = mm.actualBoundingBoxDescent ?? 34;
  const moneyEm = moneyAsc + moneyDesc;
  /** Tight punchline under money (layout `sub.y` was too low for reference). */
  const subTop = my + moneyEm + 30;
  ctx.font = `800 28px Inter, system-ui, sans-serif`;
  const subW = ctx.measureText(subUpper).width;
  const dashLen = 40;
  const gap = 16;
  const bx = h.sub.x;
  const midY = subTop + 18;
  ctx.strokeStyle = theme.accent;
  ctx.fillStyle = theme.accent;
  ctx.lineWidth = 2.25;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx, midY);
  ctx.lineTo(bx + dashLen, midY);
  const textX = bx + dashLen + gap;
  ctx.moveTo(textX + subW + gap, midY);
  ctx.lineTo(textX + subW + gap + dashLen, midY);
  ctx.stroke();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.shadowBlur = 0;
  ctx.fillText(subUpper, textX, subTop);
  ctx.restore();
}
