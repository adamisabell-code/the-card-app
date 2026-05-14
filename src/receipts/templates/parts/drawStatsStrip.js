import { roundRectPath } from "./canvasUtils.js";

/**
 * @param {string} fill
 */
function accentRgbFromHex(fill) {
  const h = String(fill).trim();
  if (h.startsWith("#") && h.length === 7) {
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }
  return { r: 254, g: 122, b: 63 };
}

/**
 * @param {import('./types.js').DownBadDrawContext} dctx
 * @param {{ scoreVsPar: string; money: string; holesWon: string | number; record: string }} t
 * @param {CanvasImageSource | null | undefined} qrImage
 */
export function drawStatsStrip(dctx, t, qrImage) {
  const { ctx, theme, layout: L, fonts } = dctx;
  const s = L.stats;
  const q = L.qr;
  const ar = accentRgbFromHex(theme.accent);

  ctx.save();

  const bodyGrad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
  bodyGrad.addColorStop(0, `rgba(${ar.r},${ar.g},${ar.b},0.09)`);
  bodyGrad.addColorStop(0.35, theme.statsPanelFill);
  bodyGrad.addColorStop(1, "rgba(4, 3, 2, 0.55)");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  roundRectPath(ctx, s.x, s.y, s.w, s.h, s.radius);
  ctx.fill();

  const innerWarm = ctx.createRadialGradient(s.x + s.w * 0.38, s.y + s.h * 0.35, 8, s.x + s.w * 0.38, s.y + s.h * 0.35, s.w * 0.85);
  innerWarm.addColorStop(0, `rgba(${ar.r},${ar.g},${ar.b},0.07)`);
  innerWarm.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = innerWarm;
  ctx.globalCompositeOperation = "screen";
  ctx.beginPath();
  roundRectPath(ctx, s.x + 2, s.y + 2, s.w - 4, s.h - 4, Math.max(0, s.radius - 2));
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  const gloss = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(52, s.h * 0.45));
  gloss.addColorStop(0, "rgba(255, 210, 180, 0.1)");
  gloss.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gloss;
  ctx.beginPath();
  roundRectPath(ctx, s.x + 2, s.y + 2, s.w - 4, s.h - 4, Math.max(0, s.radius - 2));
  ctx.fill();

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.35;
  ctx.beginPath();
  roundRectPath(ctx, s.x, s.y, s.w, s.h, s.radius);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${ar.r},${ar.g},${ar.b},0.35)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRectPath(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 8, Math.max(0, s.radius - 4));
  ctx.stroke();

  const cols = [
    { label: "SCORE VS PAR", value: t.scoreVsPar },
    { label: "MONEY", value: t.money },
    { label: "HOLES WON", value: String(t.holesWon) },
    { label: "RECORD", value: t.record },
  ];
  const innerW = s.w - s.padX * 2;
  const qs = qrImage && /** @type {{ width?: number }} */ (qrImage).width ? q.size + q.marginRight + 10 : 0;
  const statsContentW = innerW - qs;
  const colW = statsContentW / 4;
  const baseX = s.x + s.padX;
  const labelY = s.y + s.padY + 10;
  const valY = s.y + s.padY + 52;

  ctx.textAlign = "left";
  for (let i = 0; i < 4; i++) {
    const cx = baseX + i * colW;
    ctx.font = fonts.statsLabel;
    ctx.fillStyle = theme.textCream;
    ctx.fillText(cols[i].label, cx, labelY);
    ctx.font = fonts.statsValue;
    ctx.fillStyle = theme.statValueColor;
    ctx.fillText(String(cols[i].value), cx, valY);
  }

  if (qrImage && /** @type {{ width?: number }} */ (qrImage).width) {
    const qx = s.x + s.w - q.size - q.marginRight;
    const qy = s.y + q.marginTop;
    ctx.fillStyle = "rgba(244,236,216,0.08)";
    ctx.fillRect(qx - 5, qy - 5, q.size + 10, q.size + 10);
    ctx.strokeStyle = theme.borderInner;
    ctx.lineWidth = 1.75;
    ctx.strokeRect(qx - 5, qy - 5, q.size + 10, q.size + 10);
    ctx.drawImage(qrImage, qx, qy, q.size, q.size);
  }
  ctx.restore();
}
