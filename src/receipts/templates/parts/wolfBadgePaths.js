/**
 * Explicit geometric wolf-head + 3-peaked crown (unit space ~72×110, centered).
 * Readable at badge scale; not authored from ambiguous freehand curves.
 *
 * Anatomy (literally specified):
 * - Outer head: pentagon with rounded chin — ear tips → cheeks (~30% down) → chin.
 * - Inner ear wedges (darker pigment).
 * - Snout: trapezoid ~40% of head width.
 * - Eyes: inward-angled slit notches (~45% of face height).
 * - Crown: 3 peaks (center taller) + jewel dots at tips.
 */

/**
 * Pentagon shell + quadratic chin.
 * @param {CanvasRenderingContext2D} ctx
 */
function appendWolfHeadShell(ctx) {
  ctx.moveTo(-34, -36);
  ctx.lineTo(34, -36);
  ctx.lineTo(31, -8);
  ctx.quadraticCurveTo(34, 22, 0, 42);
  ctx.quadraticCurveTo(-34, 22, -31, -8);
  ctx.closePath();
}

/** @param {CanvasRenderingContext2D} ctx */
function appendInnerEarLeft(ctx) {
  ctx.moveTo(-34, -36);
  ctx.lineTo(-22, -35);
  ctx.lineTo(-28, -21);
  ctx.closePath();
}

/** @param {CanvasRenderingContext2D} ctx */
function appendInnerEarRight(ctx) {
  ctx.moveTo(34, -36);
  ctx.lineTo(22, -35);
  ctx.lineTo(28, -21);
  ctx.closePath();
}

/** Snout trapezoid ~40% of ~70px face width → ~28px top, ~18px base. */
/** @param {CanvasRenderingContext2D} ctx */
function appendSnoutTrap(ctx) {
  ctx.moveTo(-14, 6);
  ctx.lineTo(14, 6);
  ctx.lineTo(9, 30);
  ctx.lineTo(-9, 30);
  ctx.closePath();
}

/** @param {CanvasRenderingContext2D} ctx */
function appendEyeSlitLeft(ctx) {
  ctx.moveTo(-26, -6);
  ctx.lineTo(-15, -2);
  ctx.lineTo(-15, 3);
  ctx.lineTo(-27, -1);
  ctx.closePath();
}

/** @param {CanvasRenderingContext2D} ctx */
function appendEyeSlitRight(ctx) {
  ctx.moveTo(26, -6);
  ctx.lineTo(15, -2);
  ctx.lineTo(15, 3);
  ctx.lineTo(27, -1);
  ctx.closePath();
}

/**
 * Crown: 3 visible peaks; jewels drawn separately.
 * @param {CanvasRenderingContext2D} ctx
 */
function appendCrownBadge(ctx) {
  ctx.moveTo(-22, -40);
  ctx.lineTo(-12, -53);
  ctx.lineTo(0, -60);
  ctx.lineTo(12, -53);
  ctx.lineTo(22, -40);
  ctx.lineTo(0, -44);
  ctx.closePath();
}

/** @param {CanvasRenderingContext2D} ctx */
function fillCrownJewels(ctx, fill) {
  ctx.fillStyle = fill;
  const tips = /** @type {const} */ ([
    [-12, -52],
    [0, -59],
    [12, -52],
  ]);
  for (const [jx, jy] of tips) {
    ctx.beginPath();
    ctx.arc(jx, jy, 2.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} scale
 * @param {string} accentFill
 */
export function drawWolfHeadWithCrownFill(ctx, cx, cy, scale, accentFill) {
  const earInk = "rgba(40,26,14,0.92)";
  const snoutInk = "rgba(255,200,154,0.22)";
  const eyeInk = "rgba(14,11,10,0.92)";
  const jewelRgb = "rgba(255,244,226,0.55)";

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.fillStyle = accentFill;
  ctx.beginPath();
  appendWolfHeadShell(ctx);
  ctx.fill();

  ctx.fillStyle = earInk;
  ctx.beginPath();
  appendInnerEarLeft(ctx);
  ctx.fill();
  ctx.beginPath();
  appendInnerEarRight(ctx);
  ctx.fill();

  ctx.fillStyle = snoutInk;
  ctx.beginPath();
  appendSnoutTrap(ctx);
  ctx.fill();

  ctx.fillStyle = eyeInk;
  ctx.beginPath();
  appendEyeSlitLeft(ctx);
  ctx.fill();
  ctx.beginPath();
  appendEyeSlitRight(ctx);
  ctx.fill();

  ctx.fillStyle = accentFill;
  ctx.beginPath();
  appendCrownBadge(ctx);
  ctx.fill();

  ctx.beginPath();
  appendCrownBadge(ctx);
  ctx.strokeStyle = "rgba(42,26,14,0.35)";
  ctx.lineWidth = 1.05 / Math.max(scale, 0.001);
  ctx.stroke();

  fillCrownJewels(ctx, jewelRgb);

  ctx.restore();
}

/**
 * Outline-only polish: snout + brow tension.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} scale
 * @param {string} accentBright
 */
export function drawWolfHeadAccentStroke(ctx, cx, cy, scale, accentBright) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = accentBright;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.5 / Math.max(scale, 0.001);
  ctx.lineJoin = "miter";
  ctx.beginPath();
  appendSnoutTrap(ctx);
  ctx.stroke();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {boolean} [withJewels]
 */
export function drawMiniCrown(ctx, cx, cy, s, withJewels = true) {
  ctx.save();
  const fill = ctx.fillStyle;
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = fill;
  ctx.beginPath();
  appendCrownBadge(ctx);
  ctx.fill();
  ctx.beginPath();
  appendCrownBadge(ctx);
  ctx.strokeStyle = "rgba(32,26,22,0.45)";
  ctx.lineWidth = 1.05;
  ctx.stroke();
  if (withJewels) fillCrownJewels(ctx, "rgba(255,230,206,0.38)");
  ctx.restore();
}

export function strokeWolfHeadOutline(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = 2.25 / Math.max(scale, 0.008);
  ctx.beginPath();
  appendWolfHeadShell(ctx);
  ctx.stroke();
  ctx.restore();
}

/** Icon row: head shell + crown silhouette. */
export function strokeWolfWithCrownOutline(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = 2.25 / Math.max(scale, 0.008);
  ctx.beginPath();
  appendWolfHeadShell(ctx);
  appendCrownBadge(ctx);
  ctx.stroke();
  ctx.restore();
}

/**
 * 6-armed snowflake with center hexagon and side branches.
 * Stroke only, no fill.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} scale
 * @param {{ accent: string }} theme
 */
export function drawSnowflakeIcon(ctx, cx, cy, scale, theme) {
  const armLength = 34;
  const branchStart = 15;
  const branchSize = 8;
  const branchSpread = Math.PI / 6;
  const hexRadius = 8;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2 / Math.max(scale, 0.001);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const startX = hexRadius * cosA;
    const startY = hexRadius * sinA;
    const endX = armLength * cosA;
    const endY = armLength * sinA;

    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    const bx = branchStart * cosA;
    const by = branchStart * sinA;
    const left = a + Math.PI - branchSpread;
    const right = a + Math.PI + branchSpread;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + branchSize * Math.cos(left), by + branchSize * Math.sin(left));
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + branchSize * Math.cos(right), by + branchSize * Math.sin(right));
  }

  for (let i = 0; i < 6; i += 1) {
    const a0 = (Math.PI * 2 * i) / 6;
    const a1 = (Math.PI * 2 * (i + 1)) / 6;
    ctx.moveTo(hexRadius * Math.cos(a0), hexRadius * Math.sin(a0));
    ctx.lineTo(hexRadius * Math.cos(a1), hexRadius * Math.sin(a1));
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Geometric thumbs-down (stroke).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 */
export function strokeThumbsDownIcon(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.25 / Math.max(s, 0.008);
  ctx.rotate((8 * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(-2, -16);
  ctx.lineTo(-2, -2);
  ctx.lineTo(-10, -2);
  ctx.quadraticCurveTo(-22, -2, -22, 6);
  ctx.lineTo(-20, 20);
  ctx.lineTo(-6, 20);
  ctx.lineTo(-2, 26);
  ctx.lineTo(-2, 36);
  ctx.lineTo(6, 36);
  ctx.lineTo(6, 26);
  ctx.quadraticCurveTo(18, 18, 20, -4);
  ctx.lineTo(18, -12);
  ctx.lineTo(-2, -16);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Stroked dollar in circle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 */
export function strokeDollarCircleIcon(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(1.85, radius * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `900 ${radius * 1.35}px Inter, Impact, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText("$", 0, 1.5);
  ctx.restore();
}
