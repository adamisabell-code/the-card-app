/**
 * Subtle warm radial wash over the lower card so the stage ties to the hero column.
 * @param {import('./types.js').DownBadDrawContext} dctx
 */
export function drawLowerStageAccentGlow(dctx) {
  const { ctx, W, H, theme, layout: L } = dctx;
  const b = L.badgeCard;
  const lp = L.lowerPanel;
  const rgb = accentRgb(theme.accent);
  const cx = b.x + b.w * 0.5;
  const cy = b.y + b.h * 0.52;
  const top = Math.max(0, lp.yStart - 100);
  const rg = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(W, H) * 0.52);
  rg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`);
  rg.addColorStop(0.45, `rgba(${rgb.r},${rgb.g},${rgb.b},0.018)`);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = rg;
  ctx.fillRect(0, top, W, H - top);
  ctx.restore();
}

/**
 * @param {string} c
 */
function accentRgb(c) {
  const h = String(c).trim();
  if (h.startsWith("#") && h.length === 7) {
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }
  return { r: 254, g: 122, b: 63 };
}
