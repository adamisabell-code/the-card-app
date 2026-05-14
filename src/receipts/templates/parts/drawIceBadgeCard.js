import { drawBadgeCard } from "./drawBadgeCard.js";
import { drawSnowflakeIcon } from "./wolfBadgePaths.js";

/**
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ badgeTitle: string; badgeStatus: string }} t
 */
export function drawIceBadgeCard(dctx, t) {
  drawBadgeCard(dctx, t, {
    iconRenderer: (ctx, cx, cy, scale, theme) => {
      drawSnowflakeIcon(ctx, cx, cy, scale, theme);
    },
  });
}
