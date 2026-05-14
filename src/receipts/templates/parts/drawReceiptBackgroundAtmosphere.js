/**
 * Base gradient, portrait-column warmth, headline wash, vignette (no perimeter frame — chrome is `drawReceiptTradingCardFrame`).
 * @param {import('./types.js').DownBadDrawContext} dctx
 */
export function drawReceiptBackgroundAtmosphere(dctx) {
  const { ctx, W, H, theme, layout: L } = dctx;
  const p = L.portrait;
  const hg = L.headline.columnGlow;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.bgBaseTop);
  g.addColorStop(0.52, theme.bgBaseMid);
  g.addColorStop(1, theme.bgBaseBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const cx = p.x + p.w * 0.42;
  const cy = p.y + p.h * 0.38;
  const rg = ctx.createRadialGradient(cx, cy, 30, cx, cy, p.h * 0.92);
  rg.addColorStop(0, theme.glowColor);
  rg.addColorStop(0.42, theme.redSmolder);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(p.x - p.rimPad * 0.5, p.y - 28, p.w + p.rimPad, p.h + 96);
  ctx.globalAlpha = 1;

  const lg = ctx.createRadialGradient(hg.x + hg.w * 0.35, hg.y + hg.h * 0.35, 10, hg.x + hg.w * 0.35, hg.y + hg.h * 0.35, hg.w * 0.85);
  lg.addColorStop(0, theme.moneyGlow);
  lg.addColorStop(0.45, "rgba(255,60,30,0.08)");
  lg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = lg;
  ctx.fillRect(hg.x, hg.y, hg.w, hg.h);

  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.82);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(0,0,0,${L.effects.vignetteInnerAlpha})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
