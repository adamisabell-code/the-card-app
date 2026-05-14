/**
 * Upper-right stadium wash + bulb pinpoints (screen composite).
 * @param {import('./types.js').DownBadDrawContext} dctx
 */
export function drawStadiumLights(dctx) {
  const { ctx, W, H, theme } = dctx;
  const flareCore = typeof theme.stadiumFlareCore === "string" ? theme.stadiumFlareCore : "rgba(255, 180, 100, 0.85)";
  const flareMid = typeof theme.stadiumFlareMid === "string" ? theme.stadiumFlareMid : "rgba(255, 180, 100, 0.22)";
  const pin = typeof theme.stadiumPinpoint === "string" ? theme.stadiumPinpoint : "rgba(255, 200, 120, 0.9)";

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const c1x = W * 0.82;
  const c1y = H * 0.18;
  let g = ctx.createRadialGradient(c1x, c1y, 0, c1x, c1y, 280);
  g.addColorStop(0, flareCore);
  g.addColorStop(0.35, flareMid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(c1x - 300, c1y - 300, 600, 600);

  const c2x = W * 0.95;
  const c2y = H * 0.25;
  g = ctx.createRadialGradient(c2x, c2y, 0, c2x, c2y, 180);
  g.addColorStop(0, flareCore);
  g.addColorStop(0.4, flareMid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(c2x - 220, c2y - 220, 440, 440);

  const seeds1 = [1, 3, 5, 7, 9, 11, 13];
  const seeds2 = [2, 4, 6, 8, 10, 12];
  ctx.fillStyle = pin;
  for (const k of seeds1) {
    const dx = ((k * 133) % 140) - 70;
    const dy = ((k * 97) % 120) - 55;
    const rr = 4 + (k % 5);
    ctx.beginPath();
    ctx.arc(c1x + dx, c1y + dy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const k of seeds2) {
    const dx = ((k * 157) % 110) - 52;
    const dy = ((k * 89) % 100) - 48;
    const rr = 4 + (k % 4);
    ctx.beginPath();
    ctx.arc(c2x + dx, c2y + dy, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
