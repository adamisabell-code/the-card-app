/**
 * Chamfered trading-card perimeter + bronze double stroke (drawn LAST, over content + grain).
 * @param {import('./types.js').DownBadDrawContext} dctx
 */
export function drawReceiptTradingCardFrame(dctx) {
  const { ctx, W, H, theme } = dctx;
  const bronzeOuter =
    /** @type {string | undefined} */ (/** @type {{ frameBronzeOuter?: string }} */ (theme).frameBronzeOuter) ?? "#6B4423";
  const bronzeInner =
    /** @type {string | undefined} */ (/** @type {{ frameBronzeInner?: string }} */ (theme).frameBronzeInner) ?? "#8B5A2B";
  const innerGlow =
    /** @type {string | undefined} */ (/** @type {{ innerFrameGlow?: string }} */ (theme).innerFrameGlow) ??
    "rgba(12, 6, 4, 0.45)";
  const chamfer = 24;
  /** Centerline inset so 14px stroke has outer edge ~8px from canvas */
  const o = 8 + 7;
  /** Inner bronze line inset from canvas edge */
  const i = 18 + 1;
  const innerChamfer = Math.max(10, chamfer - 10);

  function chamferPath(inset, ch) {
    ctx.beginPath();
    ctx.moveTo(inset + ch, inset);
    ctx.lineTo(W - inset - ch, inset);
    ctx.lineTo(W - inset, inset + ch);
    ctx.lineTo(W - inset, H - inset - ch);
    ctx.lineTo(W - inset - ch, H - inset);
    ctx.lineTo(inset + ch, H - inset);
    ctx.lineTo(inset, H - inset - ch);
    ctx.lineTo(inset, inset + ch);
    ctx.closePath();
  }

  ctx.save();
  chamferPath(o, chamfer);

  ctx.save();
  ctx.clip();
  const g = 30;
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55;
  let gr = ctx.createLinearGradient(0, 0, g, 0);
  gr.addColorStop(0, innerGlow);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, g, H);
  gr = ctx.createLinearGradient(W, 0, W - g, 0);
  gr.addColorStop(0, innerGlow);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gr;
  ctx.fillRect(W - g, 0, g, H);
  gr = ctx.createLinearGradient(0, 0, 0, g);
  gr.addColorStop(0, innerGlow);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, g);
  gr = ctx.createLinearGradient(0, H, 0, H - g);
  gr.addColorStop(0, innerGlow);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, H - g, W, g);
  ctx.restore();

  chamferPath(o, chamfer);
  ctx.strokeStyle = bronzeOuter;
  ctx.lineWidth = 14;
  ctx.lineJoin = "miter";
  ctx.stroke();

  chamferPath(i, innerChamfer);
  ctx.strokeStyle = bronzeInner;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
