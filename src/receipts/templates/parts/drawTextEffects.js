/**
 * @typedef {import('../../theme/receiptThemes.js').ReceiptThemeTokens} ReceiptThemeTokens
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} font
 * @param {string} fill
 * @param {string} glowRgb
 * @param {number} blur
 * @param {number} [passes]
 */
export function drawGlowText(ctx, text, x, y, font, fill, glowRgb, blur, passes = 3) {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = fill;
  ctx.shadowColor = glowRgb;
  for (let i = passes; i >= 1; i--) {
    ctx.shadowBlur = blur * (i / passes);
    ctx.fillText(text, x, y);
  }
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Subtle print-worn echo behind block lettering.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} font
 * @param {string} fill
 * @param {ReceiptThemeTokens} theme
 * @param {{ offsets: [number, number][]; alpha: number }} opts
 */
export function drawDistressedTextEffect(ctx, text, x, y, font, fill, theme, opts) {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const [ox, oy] of opts.offsets) {
    ctx.fillStyle = `rgba(8,10,10,${opts.alpha})`;
    ctx.fillText(text, x + ox, y + oy);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.strokeStyle = "rgba(0,0,0,0.48)";
  ctx.lineWidth = 1.35;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = theme.textCream;
  ctx.fillText(text, x, y);
  ctx.restore();
}
