import { roundRectPath } from "./canvasUtils.js";

/**
 * @typedef {{
 *   iconRenderer: (
 *     ctx: CanvasRenderingContext2D,
 *     cx: number,
 *     cy: number,
 *     scale: number,
 *     theme: import('./types.js').DownBadDrawContext['theme']
 *   ) => void
 * }} BadgeCardOptions
 */

/**
 * Shared badge card scaffold (panel, title, status, icon slot).
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ badgeTitle: string; badgeStatus: string }} t
 * @param {BadgeCardOptions} options
 */
export function drawBadgeCard(dctx, t, options) {
  const { ctx, theme, layout: L, fonts } = dctx;
  const b = L.badgeCard;
  ctx.save();
  ctx.fillStyle = theme.badgePanelFill;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRectPath(ctx, b.x, b.y, b.w, b.h, b.radius);
  ctx.fill();
  ctx.stroke();

  const hi = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 52);
  hi.addColorStop(0, "rgba(255, 210, 170, 0.09)");
  hi.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hi;
  ctx.beginPath();
  roundRectPath(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, Math.max(0, b.radius - 1));
  ctx.fill();

  ctx.fillStyle = theme.textCreamDistressed;
  ctx.font = fonts.badgeCardTitle;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(t.badgeTitle.toUpperCase(), b.x + b.pad, b.y + b.pad);

  const iconCx = b.x + b.w - 66;
  const iconCy = b.y + b.pad + 54;
  options.iconRenderer(ctx, iconCx, iconCy, 0.41, theme);

  ctx.font = fonts.badgeCardStatusLabel;
  ctx.fillStyle = theme.mutedText;
  ctx.fillText("STATUS", b.x + b.pad, b.y + b.pad + 56);

  ctx.font = fonts.badgeCardStatus;
  ctx.fillStyle = theme.accentBright;
  ctx.fillText(t.badgeStatus.toUpperCase(), b.x + b.pad, b.y + b.pad + 74);

  ctx.restore();
}
