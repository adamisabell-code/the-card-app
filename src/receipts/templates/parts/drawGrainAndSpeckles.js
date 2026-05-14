/**
 * Film print grain + pigment specks + micro-scratches (post-content, beneath trading-card chrome).
 * @param {import('./types.js').DownBadDrawContext} dctx
 */
export function drawGrainAndSpeckles(dctx) {
  const { ctx, W, H, theme } = dctx;
  const accent = typeof theme.accent === "string" ? theme.accent : "#FE7A3F";
  const baseInk = typeof theme.bgBase === "string" ? theme.bgBase : theme.bgBaseMid;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  let seed = (W * 7919 + H * 1103) >>> 0;
  const cell = 2;
  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const g = 60 + (seed % 121);
      ctx.fillStyle = `rgba(${g},${g},${g},0.04)`;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  for (let i = 0; i < 40; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const px = seed % W;
    const py = (seed >>> 12) % H;
    const rs = (seed >>> 22) % 2 ? 1.35 : 0.95;
    ctx.fillStyle = withAlphaRgb(accent, 0.15);
    ctx.beginPath();
    ctx.arc(px + 0.5, py + 0.5, rs, 0, Math.PI * 2);
    ctx.fill();
  }

  const rgbBase = inkRgb(baseInk);
  ctx.strokeStyle = `rgba(${rgbBase.r},${rgbBase.g},${rgbBase.b},0.3)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 15; i++) {
    seed = (seed * 16807 + 123) >>> 0;
    const sx = seed % W;
    const sy = (seed >>> 11) % H;
    const len = 2 + (seed >>> 21) % 7;
    const ang = (((seed >>> 17) % 360) * Math.PI) / 180;
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx, sy + dy);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * @param {string} c
 * @param {number} a
 */
function withAlphaRgb(c, a) {
  const rgb = inkRgb(c);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

/**
 * @param {string} hexlike
 */
function inkRgb(hexlike) {
  const h = String(hexlike).trim();
  if (h.startsWith("#") && (h.length === 7 || h.length === 4)) {
    if (h.length === 7) {
      const r = parseInt(h.slice(1, 3), 16);
      const g = parseInt(h.slice(3, 5), 16);
      const b = parseInt(h.slice(5, 7), 16);
      return { r, g, b };
    }
  }
  return { r: 14, g: 11, b: 10 };
}
