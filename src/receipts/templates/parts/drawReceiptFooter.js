/**
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ footerLeft: string; footerRight: string }} t
 */
export function drawReceiptFooter(dctx, t) {
  const { ctx, W, theme, layout: L } = dctx;
  const f = L.footer;
  ctx.save();
  const cy = f.y;
  const r = f.atpRadius;

  ctx.beginPath();
  ctx.arc(f.leftX + r, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `900 17px Inter, system-ui, sans-serif`;
  ctx.fillStyle = theme.textCream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ATP", f.leftX + r, cy);

  ctx.textAlign = "left";
  ctx.font = `900 28px Inter, Arial Narrow, system-ui, sans-serif`;
  ctx.letterSpacing = "1.5px";
  ctx.fillStyle = theme.textCream;
  ctx.fillText(t.footerLeft.toUpperCase(), f.leftX + r * 2 + f.brandGap, cy);

  ctx.font = `italic 500 20px Inter, ui-serif, Georgia, serif`;
  ctx.letterSpacing = "normal";
  ctx.fillStyle = theme.mutedText;
  ctx.textAlign = "right";
  ctx.fillText(t.footerRight.toUpperCase(), W - f.rightMargin, cy);
  ctx.restore();
}
