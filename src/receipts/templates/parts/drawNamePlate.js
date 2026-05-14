/**
 * Angular plate + hero name + subline on accent chamfer stripe.
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ playerName: string; nameSubline: string }} t
 */
export function drawNamePlate(dctx, t) {
  const { ctx, theme, layout: L, fonts } = dctx;
  const np = L.namePlate;
  const plateStroke = typeof theme.panelStroke === "string" ? theme.panelStroke : theme.accent;
  const dCh = Math.min(24, Math.hypot(np.x3 - np.x4, np.y3 - np.y4) * 0.11);

  const pinTR = pointBack(np.x1, np.y1, np.x2, np.y2, dCh);
  const poutTR = pointBack(np.x3, np.y3, np.x2, np.y2, dCh);
  const pinBR = pointBack(np.x2, np.y2, np.x3, np.y3, dCh);
  const poutBR = pointBack(np.x4, np.y4, np.x3, np.y3, dCh);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(np.x4, np.y4);
  ctx.lineTo(np.x1, np.y1);
  ctx.lineTo(pinTR.x, pinTR.y);
  ctx.lineTo(poutTR.x, poutTR.y);
  ctx.lineTo(pinBR.x, pinBR.y);
  ctx.lineTo(poutBR.x, poutBR.y);
  ctx.closePath();

  const ng = ctx.createLinearGradient(np.x4, np.y4, np.x3, np.y3);
  ng.addColorStop(0, "rgba(28,22,18,0.96)");
  ng.addColorStop(0.62, typeof theme.bgBaseMid === "string" ? theme.bgBaseMid : "rgba(20,46,44,0.96)");
  ng.addColorStop(1, typeof theme.panelFill === "string" ? theme.panelFill : "rgba(18, 13, 10, 0.96)");
  ctx.fillStyle = ng;
  ctx.fill();
  ctx.strokeStyle = plateStroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = `italic 900 110px Impact, "Arial Black", Inter, system-ui, sans-serif`;
  ctx.fillStyle = theme.textCream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 10;
  ctx.fillText(t.playerName.toUpperCase(), L.nameText.x, L.nameText.y);
  ctx.shadowBlur = 0;

  const sub = t.nameSubline.toUpperCase();
  ctx.font = fonts.nameSubline;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const slot = /** @type {{ x: number; y: number; maxW?: number }} */ (/** @type {unknown} */ (L.nameSubline));

  const sw = ctx.measureText(sub).width;
  const bx = slot.x;
  const by = slot.y;
  const maxW = slot.maxW ?? 900;

  const padX = 20;
  const padY = 10;
  const bw = Math.min(maxW + 10, Math.ceil(sw + padX * 2));
  const bh = 38;

  strokeChamferSubPlate(ctx, bx - padX + 8, by - padY / 2, bw, bh, Math.min(10, bh * 0.42), plateStroke, 2.5);

  ctx.fillStyle = theme.accent;
  ctx.fillText(sub, bx + 8, by);

  ctx.restore();
}

/**
 * @param {number} ax target toward
 * @param {number} ay
 * @param {number} bx vertex
 * @param {number} by
 * @param {number} dist
 */
function pointBack(ax, ay, bx, by, dist) {
  const vx = ax - bx;
  const vy = ay - by;
  const len = Math.hypot(vx, vy) || 1;
  const t = Math.min(dist, len * 0.46) / len;
  return { x: bx + vx * t, y: by + vy * t };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} ch
 * @param {string} stroke
 * @param {number} [lw]
 */
function strokeChamferSubPlate(ctx, x, y, w, h, ch, stroke, lw = 2.5) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x + ch, y);
  ctx.lineTo(x + w - ch, y);
  ctx.lineTo(x + w, y + ch);
  ctx.lineTo(x + w, y + h - ch);
  ctx.lineTo(x + w - ch, y + h);
  ctx.lineTo(x + ch, y + h);
  ctx.lineTo(x, y + h - ch);
  ctx.lineTo(x, y + ch);
  ctx.closePath();
  ctx.stroke();
}
