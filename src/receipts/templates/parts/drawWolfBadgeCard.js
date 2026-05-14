import { drawBadgeCard } from "./drawBadgeCard.js";
import { drawWolfHeadAccentStroke, drawWolfHeadWithCrownFill } from "./wolfBadgePaths.js";

/**
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ badgeTitle: string; badgeStatus: string }} t
 */
export function drawWolfBadgeCard(dctx, t) {
  drawBadgeCard(dctx, t, {
    iconRenderer: (ctx, cx, cy, scale, theme) => {
      drawWolfHeadWithCrownFill(ctx, cx, cy, scale, theme.accent);
      drawWolfHeadAccentStroke(ctx, cx, cy, scale, theme.accentBright);
    },
  });
}
