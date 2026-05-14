import { drawCutCornerPanel } from "./drawCutCornerPanel.js";
import { strokeDollarCircleIcon, strokeThumbsDownIcon, strokeWolfWithCrownOutline } from "./wolfBadgePaths.js";

/**
 * Cut-corner pills + stroke icons + labels (icons above text, visibly stroked inside each pill).
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ badge1: string; badge2: string; badge3: string }} t
 */
export function drawBadgeRow(dctx, t) {
  const { ctx, theme, layout: L, fonts } = dctx;
  const row = L.badgeRow;
  const labels = [t.badge1, t.badge2, t.badge3];
  const totalGap = row.gap * 2;
  const bw = (row.right - row.left - totalGap) / 3;

  for (let i = 0; i < 3; i++) {
    const x = row.left + i * (bw + row.gap);
    drawCutCornerPanel(ctx, x, row.y, bw, row.h, row.cut, theme.badgePanelFill, theme.accent, 2.05);
  }

  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.fillStyle = theme.textCreamDistressed ?? theme.textCream;

  /** Scale chosen so strokes stay ~2px on screen despite scale()/s transforms inside icon drawers. */
  const wolfScale = 0.33;
  const thumbScale = 0.62;
  const dollarR = 12.5;

  for (let i = 0; i < 3; i++) {
    const x = row.left + i * (bw + row.gap);
    const cx = x + bw / 2;
    const iconY = row.y + row.h * 0.36;

    if (i === 0) strokeWolfWithCrownOutline(ctx, cx, iconY, wolfScale);
    else if (i === 1) strokeThumbsDownIcon(ctx, cx, iconY + 8, thumbScale);
    else strokeDollarCircleIcon(ctx, cx, iconY, dollarR);

    ctx.font = fonts.cutBadge;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(labels[i]).toUpperCase(), x + bw / 2, row.y + row.h * 0.76);
  }
  ctx.restore();
}
