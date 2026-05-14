/**
 * Chamfer right corners + star-flanked ribbon label + subtle metallic fill.
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ roleLabel: string }} t
 */
export function drawRoleRibbon(dctx, t) {
  const { ctx, theme, layout: L, fonts } = dctx;
  const r = L.roleRibbon;
  const left = r.centerX - r.w / 2;
  /** Tucks ribbon under name plate (~12px overlap vs. previous ~8px) without editing layout literals. */
  const yTuck = 4;

  ctx.save();
  ctx.translate(left + r.w / 2, r.y + yTuck + r.h / 2);
  ctx.rotate((r.skewDeg * Math.PI) / 180);
  ctx.translate(-r.w / 2, -r.h / 2);

  const Ax = 0;
  const Ay = 0;
  const Bx = r.w;
  const By = 0;
  const Cx = r.w - r.notch;
  const Cy = r.h;
  const Dx = r.notch;
  const Dy = r.h;

  const dCh = Math.min(16, Math.min(r.w, r.h) * 0.26);
  const pinB = pointBack(Ax, Ay, Bx, By, dCh);
  const poutB = pointBack(Cx, Cy, Bx, By, dCh);
  const pinC = pointBack(Bx, By, Cx, Cy, dCh);
  const poutC = pointBack(Dx, Dy, Cx, Cy, dCh);

  ctx.beginPath();
  ctx.moveTo(Ax, Ay);
  ctx.lineTo(pinB.x, pinB.y);
  ctx.lineTo(poutB.x, poutB.y);
  ctx.lineTo(pinC.x, pinC.y);
  ctx.lineTo(poutC.x, poutC.y);
  ctx.lineTo(Dx, Dy);
  ctx.closePath();

  const ribbonEnd =
    typeof /** @type {{ ribbonGradientEnd?: string }} */ (theme).ribbonGradientEnd === "string"
      ? /** @type {{ ribbonGradientEnd?: string }} */ (theme).ribbonGradientEnd
      : "rgba(18, 14, 11, 0.92)";
  const rg = ctx.createLinearGradient(0, 0, r.w * 1.08, r.h);
  rg.addColorStop(0, theme.accentGlow);
  rg.addColorStop(0.52, typeof theme.panelFill === "string" ? theme.panelFill : "rgba(20,22,26,0.88)");
  rg.addColorStop(1, ribbonEnd);

  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = typeof theme.panelStroke === "string" ? theme.panelStroke : theme.accent;
  ctx.lineWidth = 2.35;
  ctx.stroke();

  const lab = t.roleLabel.toUpperCase();
  const star = "★";
  ctx.font = fonts.roleRibbon;
  ctx.textBaseline = "middle";

  const wStar = ctx.measureText(star).width;
  const wLab = ctx.measureText(lab).width;
  const gap = 12;
  const total = wStar * 2 + wLab + gap * 2;
  const bx0 = (r.w - total) / 2;
  let cx = bx0;

  ctx.textAlign = "left";
  ctx.fillStyle = theme.accent;
  ctx.fillText(star, cx, r.h / 2);
  cx += wStar + gap;
  ctx.fillStyle = theme.textCream;
  ctx.fillText(lab, cx, r.h / 2);
  cx += wLab + gap;
  ctx.fillStyle = theme.accent;
  ctx.fillText(star, cx, r.h / 2);

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
