/**
 * Dark stage wash + separator so portrait tucks under lower UI.
 * @param {import('./types.js').DownBadDrawContext} dctx
 */
function hexToRgba(hex, a) {
  const h = String(hex ?? "").trim();
  if (!h.startsWith("#") || h.length !== 7) return `rgba(10,8,6,${a})`;
  const r = Number.parseInt(h.slice(1, 3), 16);
  const g = Number.parseInt(h.slice(3, 5), 16);
  const b = Number.parseInt(h.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * @param {import('./types.js').DownBadDrawContext} dctx
 */
export function drawLowerPanelBackdrop(dctx) {
  const { ctx, W, H, theme, layout: L } = dctx;
  const lp = L.lowerPanel;
  const stage = /** @type {string} */ (
    typeof /** @type {{ stageMid?: string }} */ (theme).stageMid === "string"
      ? /** @type {{ stageMid?: string }} */ (theme).stageMid
      : theme.panelFill
  );
  const topInk =
    typeof theme.bgBaseTop === "string"
      ? theme.bgBaseTop
      : typeof /** @type {{ bgBase?: string }} */ (theme).bgBase === "string"
        ? /** @type {{ bgBase?: string }} */ (theme).bgBase
        : "#0a0806";

  const botInk = typeof theme.bgBaseBottom === "string" ? theme.bgBaseBottom : topInk;
  const grad = ctx.createLinearGradient(0, lp.yStart, 0, H);
  grad.addColorStop(0, hexToRgba(topInk, 0));
  grad.addColorStop(0.1, stage);
  grad.addColorStop(1, hexToRgba(botInk, 0.99));
  ctx.fillStyle = grad;
  ctx.fillRect(0, lp.yStart, W, H - lp.yStart);

  const sepGlow = ctx.createLinearGradient(0, lp.separatorY - 10, 0, lp.separatorY + 28);
  sepGlow.addColorStop(0, "rgba(0,0,0,0)");
  sepGlow.addColorStop(0.45, "rgba(255, 95, 48, 0.12)");
  sepGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sepGlow;
  ctx.fillRect(0, lp.separatorY - 10, W, 38);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 160, 100, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, lp.separatorY - 0.5);
  ctx.lineTo(W - 32, lp.separatorY - 0.5);
  ctx.stroke();
  ctx.strokeStyle = theme.panelStroke;
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.moveTo(32, lp.separatorY + 1.5);
  ctx.lineTo(W - 32, lp.separatorY + 1.5);
  ctx.stroke();
  ctx.restore();
}
