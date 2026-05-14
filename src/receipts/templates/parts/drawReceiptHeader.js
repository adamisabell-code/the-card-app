import { getCardWordmark } from "../../assets/brandAssets.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} ch
 */
function strokeChamferedTicket(ctx, x, y, w, h, ch) {
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
}

/**
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ topLabel: string; receiptNumber: string }} t
 */
export function drawReceiptHeader(dctx, t) {
  const { ctx, W, theme, layout: L, fonts } = dctx;

  const hdr = /** @type {{ cardMark?: { x: number; y: number; width: number } }} */ (L.header);
  /** @type {{ x: number; y: number; width: number }} */
  const cardMark = hdr.cardMark ?? { x: 44, y: 36, width: 240 };

  const tc = L.header.topCenter;
  const br = L.header.brandRight;

  ctx.save();
  ctx.textBaseline = "top";

  const wordmark = getCardWordmark();
  if (wordmark && wordmark.naturalWidth > 0 && wordmark.naturalHeight > 0) {
    const targetW = cardMark.width;
    const aspect = wordmark.naturalHeight / wordmark.naturalWidth;
    const targetH = targetW * aspect;
    ctx.drawImage(wordmark, cardMark.x, cardMark.y, targetW, targetH);
  }

  const cx = W / 2;
  const lab = t.topLabel.toUpperCase();
  ctx.font = fonts.topCenterLabel;
  ctx.textAlign = "center";
  ctx.fillStyle = theme.accent;
  const tw = ctx.measureText(lab).width;
  const labelY = tc.y + tc.labelLift;
  ctx.fillText(lab, cx, labelY);

  const dash = 30;
  const gap = 22;
  ctx.strokeStyle = theme.mutedText;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const ey = labelY + 9;
  ctx.moveTo(cx - tw / 2 - gap - dash, ey);
  ctx.lineTo(cx - tw / 2 - gap, ey);
  ctx.moveTo(cx + tw / 2 + gap, ey);
  ctx.lineTo(cx + tw / 2 + gap + dash, ey);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.font = `900 22px Inter, system-ui, sans-serif`;
  ctx.fillStyle = theme.textCream;
  ctx.letterSpacing = "2px";
  ctx.fillText("THE RECEIPT", br.labelX, br.labelY);
  ctx.letterSpacing = "normal";

  const num = String(t.receiptNumber).trim();
  ctx.font = fonts.receiptNumberBadge;
  const nw = ctx.measureText(num).width + br.receiptNumberPadX * 2;
  const nh = 26 + br.receiptNumberPadY * 2;
  const nx = br.receiptNumberX;
  const ny = br.receiptNumberY;
  ctx.strokeStyle = theme.panelStroke ?? theme.accent;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.lineWidth = 2;
  strokeChamferedTicket(ctx, nx, ny, nw, nh, Math.min(12, nh * 0.35));
  ctx.stroke();
  ctx.fillStyle = theme.textCream;
  ctx.shadowBlur = 0;
  ctx.fillText(num, nx + br.receiptNumberPadX, ny + br.receiptNumberPadY + 11);

  ctx.restore();
}
