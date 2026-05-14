import { receiptLog } from "./receiptDebugLogger.js";

/** Optional static fallback if no URLs load (same path as typical SPA avatar). */
const PORTRAIT_FALLBACK_URL = "/default-avatar.png";
const DESIGN = {
  colors: {
    black: "#050605",
    deepGreen: "#071F18",
    forest: "#0B3A2E",
    teal: "#00BFA6",
    tealGlow: "#19FFE0",
    cream: "#E8D7B0",
    agedWhite: "#D8C59B",
    gold: "#B77A2A",
    orange: "#D87A1F",
    rust: "#7A3518",
    border: "#9B7A45",
  },
  fonts: {
    block: "Impact, Anton, 'Bebas Neue', 'Arial Black', sans-serif",
    condensed: "'Bebas Neue', Oswald, Impact, sans-serif",
    brush: "Bangers, 'Permanent Marker', Impact, sans-serif",
    body: "Oswald, 'Arial Narrow', sans-serif",
  },
};

const SAMPLE_RECEIPT = {
  receiptType: "comeback",
  archetypeLabel: "COMEBACK KID",
  receiptNumber: "#005",
  headline: "BACK / FROM / THE DEAD!",
  moneyResult: "+$156",
  subheadline: "CAME BACK. TOOK OVER.",
  playerName: "JORDAN T.",
  badge: "COMEBACK KING",
  statusLabel: "PHOENIX",
  statusText: "COULDN'T KEEP HIM DOWN.",
  statusCardSubtitle: "RISEN",
  badges: ["PHOENIX MODE", "CLUTCH COMEBACK", "PRESS MERCHANT"],
  scoreVsPar: "-2",
  holesWon: "10",
  record: "4-2",
  courseName: "AUSTIN TEE PARTY",
};

/**
 * Load a single URL; never throws. Logs failed URL for debugging.
 * @param {string | null | undefined} url
 * @param {string} context
 * @returns {Promise<HTMLImageElement | null>}
 */
async function tryLoadImageUrl(url, context) {
  if (url == null || url === "") {
    receiptLog("image load skipped", { context, reason: "empty_url" });
    return null;
  }
  const attempts = [
    () => loadImageWithCrossMode(url, "anonymous"),
    () => loadImageWithCrossMode(url, ""),
  ];
  let lastError = "";
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      const img = await attempts[i]();
      receiptLog("image load ok", { context, url, attempt: i + 1 });
      return /** @type {HTMLImageElement} */ (img);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  receiptLog("image load failed", { context, url, error: lastError });
  console.warn(`[receipt-pipeline] image load failed [${context}]`, url, lastError);
  return null;
}

function loadImageWithCrossMode(url, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = url;
  });
}

/**
 * Large dark silhouette — poster placeholder (never wolf / never framed “card”).
 * @param {number} w
 * @param {number} h
 * @returns {HTMLCanvasElement}
 */
function createSilhouetteHero(w = 560, h = 760) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return c;
  const bg = g.createRadialGradient(w * 0.55, h * 0.25, 10, w * 0.52, h * 0.38, w * 0.55);
  bg.addColorStop(0, "#122428");
  bg.addColorStop(0.65, "#060809");
  bg.addColorStop(1, "#020303");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#040608";
  g.beginPath();
  g.ellipse(w * 0.52, h * 0.3, w * 0.13, h * 0.17, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(w * 0.22, h * 0.98);
  g.quadraticCurveTo(w * 0.5, h * 0.46, w * 0.78, h * 0.98);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(34,215,207,0.06)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(w * 0.35, h * 0.2);
  g.quadraticCurveTo(w * 0.52, h * 0.05, w * 0.7, h * 0.22);
  g.stroke();
  return c;
}

/**
 * Portrait for hero: uploaded first, then layer URL, then optional static fallback, then silhouette canvas.
 * Does not change who generates URLs — only load order and safe fallbacks.
 * @param {string | null | undefined} layerUrl
 * @param {string | null | undefined} uploadedUrl
 * @returns {Promise<CanvasImageSource>}
 */
async function loadPortraitForReceipt(layerUrl, uploadedUrl) {
  /** @type {string[]} */
  const tried = [];
  /** Block legacy mascot / brand portrait URLs (not in-round wolf tile `wolf-logo.png`). */
  const isWolfLike = (value) =>
    /the-card-logo\.(png|webp)|wolf-mark\.(png|svg|webp)|wolf-head\.(png|svg|webp)|mascot|logo-head|tee-party-logo/i.test(
      String(value ?? ""),
    );
  const candidates = [uploadedUrl, layerUrl].filter((u) => u != null && u !== "" && !isWolfLike(u));
  for (const u of candidates) {
    const s = String(u);
    if (tried.includes(s)) continue;
    tried.push(s);
    const img = await tryLoadImageUrl(s, "portrait-try");
    if (img) return img;
  }
  const fb = await tryLoadImageUrl(PORTRAIT_FALLBACK_URL, "portrait-fallback-asset");
  if (fb) return fb;
  receiptLog("portrait using silhouette placeholder", { tried });
  return createSilhouetteHero(600, 820);
}

function chooseColors(template) {
  const loser = /DOWN BAD|VILLAIN|ICE COLD|LOSER/i.test(template.badge || "") || /^-/.test(template.moneyLabel || "");
  return loser
    ? { top: "#140807", bottom: "#2a1109", accent: "#ff8c42", gold: "#e4b35a" }
    : { top: "#05110f", bottom: "#0a221d", accent: "#30d5c8", gold: "#e4b35a" };
}

function seededHash(input) {
  const raw = String(input ?? "0");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function drawRoundedRect(ctx, x, y, w, h, r, fillStyle, strokeStyle, lineWidth = 1) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function drawTextFit(ctx, text, options) {
  const {
    x,
    y,
    maxWidth,
    maxFontSize = 72,
    minFontSize = 18,
    fontFamily = "Impact, Anton, 'Arial Narrow', sans-serif",
    weight = 800,
    color = "#f4ecd8",
    align = "left",
    baseline = "alphabetic",
    strokeStyle = "",
    strokeWidth = 0,
  } = options;
  let fontSize = maxFontSize;
  const safeText = String(text ?? "");
  while (fontSize > minFontSize) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(safeText).width <= maxWidth) break;
    fontSize -= 2;
  }
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (strokeStyle && strokeWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(safeText, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(safeText, x, y);
  return fontSize;
}

export function drawGlowText(ctx, text, x, y, options) {
  const {
    color = "#20d7cf",
    glowColor = "rgba(32,215,207,0.55)",
    blur = 14,
    weight = 900,
    size = 102,
    fontFamily = "Impact, Anton, 'Arial Narrow', sans-serif",
    strokeStyle = "rgba(0,0,0,0.65)",
    strokeWidth = 4,
  } = options || {};
  ctx.save();
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = blur;
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function normalizeReceiptType(receiptData) {
  const explicit = String(receiptData.receiptType ?? "").toLowerCase();
  if (["winner", "loser", "comeback", "callout", "neutral"].includes(explicit)) return explicit;
  if (explicit === "down bad" || explicit === "round villain" || explicit === "ice cold") return "loser";
  if (explicit === "wolf king" || explicit === "mvp" || explicit === "winner") return "winner";
  const badge = String(receiptData.badge ?? "").toLowerCase();
  if (/down bad|villain|loser/.test(badge)) return "loser";
  if (/comeback|phoenix/.test(badge)) return "comeback";
  const money = String(receiptData.moneyResult ?? receiptData.moneyLabel ?? "");
  if (money.startsWith("-")) return "loser";
  if (money.startsWith("+")) return "winner";
  return "neutral";
}

export function getReceiptTheme(receiptData) {
  const type = normalizeReceiptType(receiptData);
  const seed = seededHash(receiptData.receiptNumber ?? receiptData.playerName ?? "0");
  const rand = seededRandom(seed);
  /** @type {Record<string, object>} */
  const themeByType = {
    comeback: {
      id: "comeback",
      archetypeLabel: "COMEBACK KID",
      headlineLines: ["BACK", "FROM THE DEAD"],
      headline: "BACK FROM THE DEAD",
      ribbonBanner: "★ COMEBACK KING ★",
      subtitle: "COULDN'T KEEP HIM DOWN.",
      moneySubLines: ["CAME BACK.", "TOOK OVER."],
      statusCardTitle: "PHOENIX",
      statusCardSubtitle: "RISEN",
      accentPrimary: "#22d7cf",
      accentSecondary: "#c99238",
      moneyColor: "#22d7cf",
      moneyGlow: "rgba(34,215,207,0.75)",
      moneyNegative: "#ff6b35",
      negativeGlow: "rgba(255,107,53,0.65)",
      borderGold: "#c99238",
      defaultBadges: ["PHOENIX MODE", "CLUTCH COMEBACK", "PRESS MERCHANT"],
      textureAlpha: 0.09,
      bgTeal: { x: 690, y: 380, r: 520 },
      bgWarm: { x: 180, y: 1180, r: 420 },
    },
    winner: {
      id: "winner",
      archetypeLabel: "WOLF KING",
      headlineLines: ["TOOK", "EVERYTHING"],
      headline: "TOOK EVERYTHING",
      ribbonBanner: "★ WOLF KING ★",
      subtitle: "CLEAN ROUND. TOTAL CONTROL.",
      moneySubLines: ["CONTROLLED", "CHAOS."],
      statusCardTitle: "WOLF",
      statusCardSubtitle: "PAID",
      accentPrimary: "#22d7cf",
      accentSecondary: "#c99238",
      moneyColor: "#22d7cf",
      moneyGlow: "rgba(34,215,207,0.72)",
      moneyNegative: "#ff6b35",
      negativeGlow: "rgba(255,107,53,0.65)",
      borderGold: "#c99238",
      defaultBadges: ["BAG SECURED", "PRESS MERCHANT", "WOLF KING"],
      textureAlpha: 0.085,
      bgTeal: { x: 690, y: 380, r: 520 },
      bgWarm: { x: 180, y: 1180, r: 420 },
    },
    loser: {
      id: "loser",
      archetypeLabel: "EXPOSED",
      headlineLines: ["BRUTAL", "L."],
      headline: "BRUTAL L.",
      ribbonBanner: "★ COOKED ★",
      subtitle: "TALKED ALL WEEK. VANISHED.",
      moneySubLines: ["DONATION", "MODE."],
      statusCardTitle: "EXPOSED",
      statusCardSubtitle: "COOKED",
      accentPrimary: "#ff6b35",
      accentSecondary: "#c99238",
      moneyColor: "#ff6b35",
      moneyGlow: "rgba(255,107,53,0.7)",
      moneyNegative: "#ff6b35",
      negativeGlow: "rgba(255,107,53,0.65)",
      borderGold: "#c99238",
      defaultBadges: ["NO SHOW", "DONATION MODE", "LAST PLACE"],
      textureAlpha: 0.095,
      bgTeal: { x: 690, y: 380, r: 520 },
      bgWarm: { x: 180, y: 1180, r: 460 },
    },
    callout: {
      id: "callout",
      archetypeLabel: "FOUNDER CALL OUT",
      headlineLines: ["GROUP", "CHALLENGED"],
      headline: "GROUP CHALLENGED",
      ribbonBanner: "★ PROVE IT ★",
      subtitle: "SHOW UP OR STAY QUIET.",
      moneySubLines: ["STEP UP", "OR TAP OUT."],
      statusCardTitle: "CALLED OUT",
      statusCardSubtitle: "ACTIVE",
      accentPrimary: "#22d7cf",
      accentSecondary: "#ff8c42",
      moneyColor: "#f2e5c8",
      moneyGlow: "rgba(201,146,56,0.5)",
      moneyNegative: "#ff6b35",
      negativeGlow: "rgba(255,107,53,0.6)",
      borderGold: "#c99238",
      defaultBadges: ["FOUNDING MEMBER", "PRESSURE PLAYER", "PROVE IT"],
      textureAlpha: 0.088,
      bgTeal: { x: 690, y: 380, r: 520 },
      bgWarm: { x: 180, y: 1180, r: 420 },
    },
    neutral: {
      id: "neutral",
      archetypeLabel: "ROUND POSTED",
      headlineLines: ["THE", "RECEIPT", "LOCKED"],
      headline: "ROUND POSTED",
      ribbonBanner: "★ POSTED ★",
      subtitle: "IF IT'S NOT ON THE RECEIPT, IT DIDN'T HAPPEN.",
      moneySubLines: ["LOCKED", "IN."],
      statusCardTitle: "LOGGED",
      statusCardSubtitle: "OFFICIAL",
      accentPrimary: "#22d7cf",
      accentSecondary: "#c99238",
      moneyColor: "#22d7cf",
      moneyGlow: "rgba(34,215,207,0.55)",
      moneyNegative: "#ff6b35",
      negativeGlow: "rgba(255,107,53,0.6)",
      borderGold: "#c99238",
      defaultBadges: ["WOLF GOLF", "ROUND LOGGED", "TEE PARTY"],
      textureAlpha: 0.08,
      bgTeal: { x: 690, y: 380, r: 520 },
      bgWarm: { x: 180, y: 1180, r: 420 },
    },
  };
  const base = themeByType[type] ?? themeByType.neutral;
  return {
    ...base,
    titleRibbon: base.ribbonBanner,
    topLabel: base.archetypeLabel,
    borderColor: `rgba(201,146,56,0.92)`,
    textureAlpha: Math.max(0.06, Math.min(0.12, base.textureAlpha + (rand() - 0.5) * 0.02)),
  };
}

export function resolveHeadlineLines(headline) {
  const raw = String(headline ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return ["ROUND", "POSTED"];
  const splitSlash = raw.split("/").map((v) => v.trim()).filter(Boolean);
  if (splitSlash.length > 1) return splitSlash.slice(0, 3).map((s) => s.toUpperCase());
  const words = raw.toUpperCase().split(" ");
  if (words.length <= 2) return [raw.toUpperCase()];
  if (words.length <= 4) return [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
  return [words.slice(0, 2).join(" "), words.slice(2, 4).join(" "), words.slice(4).join(" ")].filter(Boolean);
}

/** Sports-card stack: prefer 2 lines (e.g. TOOK / EVERYTHING). */
export function formatHeadlineStack(headline) {
  const raw = String(headline ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return ["THE", "RECEIPT"];
  const words = raw.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 1) return [words[0]];
  if (words.length === 2) return [words[0], words[1]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function drawBackgroundEffects(ctx, theme, W, H, seed) {
  const t = theme.bgTeal ?? { x: 720, y: 420, r: 560 };
  const w = theme.bgWarm ?? { x: 180, y: 1180, r: 420 };
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, "#030504");
  base.addColorStop(0.45, "#050706");
  base.addColorStop(1, "#020203");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const tealBehindHero = ctx.createRadialGradient(710, 420, 0, 710, 420, 520);
  tealBehindHero.addColorStop(0, "rgba(34,215,207,0.38)");
  tealBehindHero.addColorStop(0.42, "rgba(34,215,207,0.12)");
  tealBehindHero.addColorStop(1, "rgba(34,215,207,0)");
  ctx.fillStyle = tealBehindHero;
  ctx.fillRect(0, 0, W, H);
  const teal2 = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
  teal2.addColorStop(0, "rgba(31,214,204,0.22)");
  teal2.addColorStop(1, "rgba(31,214,204,0)");
  ctx.fillStyle = teal2;
  ctx.fillRect(0, 0, W, H);
  const warm = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
  warm.addColorStop(0, "rgba(255,120,48,0.18)");
  warm.addColorStop(0.5, "rgba(201,146,56,0.1)");
  warm.addColorStop(1, "rgba(255,120,48,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  const moneyGlow = ctx.createRadialGradient(220, 540, 10, 260, 560, 280);
  moneyGlow.addColorStop(0, "rgba(255,130,60,0.42)");
  moneyGlow.addColorStop(0.45, "rgba(255,90,40,0.14)");
  moneyGlow.addColorStop(1, "rgba(255,130,60,0)");
  ctx.fillStyle = moneyGlow;
  ctx.fillRect(0, 420, 520, 380);
  const flood = ctx.createRadialGradient(920, 100, 8, 960, 200, 340);
  flood.addColorStop(0, "rgba(255,255,255,0.1)");
  flood.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = flood;
  ctx.beginPath();
  ctx.arc(940, 200, 300, 0, Math.PI * 2);
  ctx.fill();
  const random = seededRandom(seed);
  ctx.save();
  ctx.globalAlpha = 0.14;
  for (let i = -H; i < W + H; i += 14) {
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + random() * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - H * 1.02, H);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.085;
  for (let i = 0; i < W; i += 9) {
    ctx.strokeStyle = `rgba(201,146,56,${0.12 + random() * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(i + random() * 6, 0);
    ctx.lineTo(i + H * 0.95 + random() * 10, H);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = theme.textureAlpha ?? 0.12;
  for (let i = 0; i < 3200; i += 1) {
    const x = random() * W;
    const y = random() * H;
    const c = Math.floor(70 + random() * 110);
    ctx.fillStyle = `rgba(${c},${c},${c},${0.15 + random() * 0.12})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
  for (let pass = 0; pass < 2; pass += 1) {
    ctx.save();
    ctx.globalAlpha = pass === 0 ? 0.35 : 0.22;
    for (let i = 0; i < 180; i += 1) {
      const x = random() * W;
      const y = random() * H;
      ctx.fillStyle =
        random() > 0.45 ? `rgba(201,146,56,${0.15 + random() * 0.25})` : `rgba(34,215,207,${0.1 + random() * 0.2})`;
      ctx.fillRect(x, y, 1 + random() * 2, 1 + random());
    }
    ctx.restore();
  }
  // Fine scratches + card wear for premium printed-card finish.
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 95; i += 1) {
    const x = random() * W;
    const y = random() * H;
    const len = 8 + random() * 36;
    ctx.strokeStyle = random() > 0.5 ? "rgba(216,197,155,0.28)" : "rgba(120,160,150,0.2)";
    ctx.lineWidth = 0.5 + random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y - len * 0.24);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  const wear = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.12, W * 0.5, H * 0.5, H * 0.9);
  wear.addColorStop(0, "rgba(255,255,255,0)");
  wear.addColorStop(0.72, "rgba(12,8,4,0.18)");
  wear.addColorStop(1, "rgba(8,5,3,0.45)");
  ctx.fillStyle = wear;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const corner = ctx.createRadialGradient(W * 0.5, H * 0.55, H * 0.15, W * 0.5, H * 0.55, H * 0.92);
  corner.addColorStop(0, "rgba(0,0,0,0)");
  corner.addColorStop(0.65, "rgba(0,0,0,0.28)");
  corner.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = corner;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.07;
  const beam = ctx.createLinearGradient(W * 0.2, 0, W * 0.95, H * 0.45);
  beam.addColorStop(0, "rgba(255,255,255,0)");
  beam.addColorStop(0.5, "rgba(200,230,255,0.35)");
  beam.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(W * 0.85, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H * 0.55);
  ctx.lineTo(W * 0.35, H * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Collectible outer edge only — thin teal whisper inside, no heavy chrome. */
export function drawCardBorder(ctx, theme) {
  const gold = theme.borderGold ?? "#c99238";
  ctx.save();
  ctx.shadowColor = "rgba(201,146,56,0.35)";
  ctx.shadowBlur = 22;
  drawRoundedRect(ctx, 16, 16, 992, 1504, 28, "", gold, 2.2);
  ctx.restore();
  drawRoundedRect(ctx, 28, 28, 968, 1480, 24, "", "rgba(31,214,204,0.22)", 1);
}

/** Left-to-bottom wash so headline + portrait read as one poster plane. */
function drawDiagonalPosterOverlay(ctx, W, H) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W * 0.88, H * 0.68);
  g.addColorStop(0, "rgba(0,0,0,0.82)");
  g.addColorStop(0.35, "rgba(0,0,0,0.42)");
  g.addColorStop(0.68, "rgba(0,0,0,0.14)");
  g.addColorStop(1, "rgba(0,0,0,0.03)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/**
 * Paint hero portrait: cover crop, no frame — rim light, rake blend, crush, vignette, warm accent.
 * @param {CanvasImageSource} portrait
 */
function paintCinematicPortrait(ctx, portrait, px, py, pw, ph) {
  const pwImg =
    portrait instanceof HTMLCanvasElement
      ? portrait.width
      : Math.max(
          /** @type {HTMLImageElement} */ (portrait).naturalWidth || 0,
          /** @type {HTMLImageElement} */ (portrait).width || 0,
        ) || 1;
  const phImg =
    portrait instanceof HTMLCanvasElement
      ? portrait.height
      : Math.max(
          /** @type {HTMLImageElement} */ (portrait).naturalHeight || 0,
          /** @type {HTMLImageElement} */ (portrait).height || 0,
        ) || 1;
  const scale = Math.max(pw / pwImg, ph / phImg);
  const drawW = pwImg * scale;
  const drawH = phImg * scale;
  const dx = px + (pw - drawW) / 2;
  const dy = py + (ph - drawH) / 2 - drawH * 0.08;

  const rcx = px + pw * 0.48;
  const rcy = py + ph * 0.3;
  const rim = ctx.createRadialGradient(rcx, rcy, 30, rcx, rcy, Math.max(pw, ph) * 0.62);
  rim.addColorStop(0, "rgba(40, 230, 215, 0.42)");
  rim.addColorStop(0.45, "rgba(15, 60, 58, 0.15)");
  rim.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rim;
  ctx.fillRect(px - 100, py - 80, pw + 200, ph + 160);

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.drawImage(portrait, dx, dy, drawW, drawH);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const rake = ctx.createLinearGradient(px, 0, px + pw * 0.72, 0);
  rake.addColorStop(0, "rgba(0,0,0,0.88)");
  rake.addColorStop(0.42, "rgba(0,0,0,0.35)");
  rake.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rake;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();

  const bot = ctx.createLinearGradient(px, py + ph * 0.22, px, py + ph);
  bot.addColorStop(0, "rgba(0,0,0,0)");
  bot.addColorStop(0.55, "rgba(0,0,0,0.5)");
  bot.addColorStop(1, "rgba(0,0,0,0.96)");
  ctx.fillStyle = bot;
  ctx.fillRect(px, py, pw, ph);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const vx = px + pw * 0.5;
  const vy = py + ph * 0.38;
  const vig = ctx.createRadialGradient(vx, vy, pw * 0.14, vx, vy, pw * 0.85);
  vig.addColorStop(0, "rgba(255,255,255,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = vig;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.14;
  const warm = ctx.createRadialGradient(px + pw * 0.82, py + ph * 0.18, 0, px + pw * 0.88, py + ph * 0.22, ph * 0.55);
  warm.addColorStop(0, "rgba(255, 210, 140, 0.5)");
  warm.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
}

/**
 * Poster headline stack — overlaps composition, no layout box.
 * Line 1: 128px cream, line 2+: 112px teal, max width 430, Impact.
 */
function drawPosterHeadlineStack(ctx, lines, theme) {
  const clean = lines.map((l) => String(l ?? "").trim()).filter(Boolean);
  if (clean.length === 0) return;
  const maxW = 432;
  const x0 = 50;
  let y = 162;
  const targets = [122, 104, 92];
  ctx.save();
  ctx.translate(4, 0);
  ctx.rotate((-2.5 * Math.PI) / 180);
  clean.forEach((line, i) => {
    const cream = i === 0;
    const upper = line.toUpperCase();
    let fontSize = targets[i] ?? 96;
    ctx.font = `900 ${fontSize}px Impact, Anton, sans-serif`;
    while (fontSize > 52 && ctx.measureText(upper).width > maxW) {
      fontSize -= 2;
      ctx.font = `900 ${fontSize}px Impact, Anton, sans-serif`;
    }
    drawGlowText(ctx, upper, x0, y, {
      size: fontSize,
      color: cream ? "#f2e5c8" : theme.accentPrimary ?? "#22d7cf",
      glowColor: cream ? "rgba(0,0,0,0.5)" : "rgba(34,215,207,0.5)",
      blur: cream ? 12 : 18,
      strokeStyle: "rgba(0,0,0,0.92)",
      strokeWidth: cream ? 6 : 5,
      weight: 900,
      fontFamily: "Impact, Anton, sans-serif",
    });
    y += fontSize * 0.84 + 1;
  });
  ctx.restore();
}

function drawTrapezoidPath(ctx, x, y, w, h, inset) {
  ctx.beginPath();
  ctx.moveTo(x + inset, y);
  ctx.lineTo(x + w - inset, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

export function drawPanel(ctx, x, y, w, h, options = {}) {
  const {
    radius = 10,
    fill = "rgba(2,4,5,0.9)",
    stroke = "rgba(155,122,69,0.45)",
    lineWidth = 1,
  } = options;
  drawRoundedRect(ctx, x, y, w, h, radius, fill, stroke, lineWidth);
}

export function drawAngledPanel(ctx, x, y, w, h, options = {}) {
  const { inset = 12, fill = "rgba(2,4,5,0.92)", stroke = "rgba(0,191,166,0.35)", lineWidth = 1 } = options;
  drawTrapezoidPath(ctx, x, y, w, h, inset);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function drawDistressedBorder(ctx, W, H) {
  drawCardBorder(ctx, { borderGold: DESIGN.colors.border });
  const r = seededRandom(90210);
  ctx.save();
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = `rgba(183,122,42,${0.08 + r() * 0.16})`;
    const x = r() * W;
    const y = r() * H;
    if (x < 50 || x > W - 50 || y < 50 || y > H - 50) ctx.fillRect(x, y, 1 + r() * 2, 1);
  }
  ctx.restore();
}

export function drawStatBlock(ctx, label, value, x, y, w, color) {
  ctx.fillStyle = DESIGN.colors.agedWhite;
  ctx.font = `700 22px ${DESIGN.fonts.body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(String(label), x, y);
  drawTextFit(ctx, String(value), {
    x,
    y: y + 76,
    maxWidth: w,
    maxFontSize: 50,
    minFontSize: 28,
    fontFamily: DESIGN.fonts.block,
    color,
  });
}

export function drawRibbon(ctx, x, y, w, h, text, theme) {
  drawPosterRibbon(ctx, x, y, w, h, text, theme);
}

function drawLeftStatusPlate(ctx, theme, receiptData = {}) {
  const x = 48;
  const y = 752;
  const w = 218;
  const h = 268;
  const inset = 14;
  ctx.save();
  ctx.translate(0, 6);
  drawTrapezoidPath(ctx, x, y, w, h, inset);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "rgba(2,4,5,0.88)");
  g.addColorStop(1, "rgba(0,1,2,0.86)");
  ctx.fillStyle = g;
  ctx.fill();
  drawTrapezoidPath(ctx, x, y, w, h, inset);
  ctx.strokeStyle = "rgba(201,146,56,0.32)";
  ctx.lineWidth = 1;
  ctx.stroke();
  drawTrapezoidPath(ctx, x + 2, y + 2, w - 4, h - 4, inset - 1);
  ctx.strokeStyle = "rgba(31,214,204,0.16)";
  ctx.stroke();
  ctx.restore();
  drawTextFit(ctx, String(receiptData.statusLabel ?? theme.statusCardTitle ?? "").toUpperCase(), {
    x: x + w / 2,
    y: y + 118,
    maxWidth: w - 36,
    maxFontSize: 28,
    minFontSize: 18,
    fontFamily: "Impact, Anton, sans-serif",
    weight: 800,
    color: theme.accentPrimary ?? "#22d7cf",
    align: "center",
    baseline: "middle",
  });
  drawTextFit(ctx, String(theme.statusCardSubtitle ?? "").toUpperCase(), {
    x: x + w / 2,
    y: y + 218,
    maxWidth: w - 36,
    maxFontSize: 24,
    minFontSize: 16,
    fontFamily: "Impact, Anton, sans-serif",
    weight: 800,
    color: "#c9bc9d",
    align: "center",
    baseline: "middle",
  });
}

export function drawBadge(ctx, badge, x, y, w, h, theme) {
  const inset = 10 + (y % 7) * 0.15;
  drawTrapezoidPath(ctx, x, y, w, h, inset);
  ctx.fillStyle = "rgba(2,4,5,0.96)";
  ctx.fill();
  drawTrapezoidPath(ctx, x, y, w, h, inset);
  ctx.strokeStyle = "rgba(34,215,207,0.36)";
  ctx.lineWidth = 1.05;
  ctx.stroke();
  drawTextFit(ctx, badge, {
    x: x + w * 0.52,
    y: y + h * 0.58,
    maxWidth: w - 22,
    maxFontSize: 34,
    minFontSize: 20,
    fontFamily: "Impact, Anton, sans-serif",
    weight: 900,
    color: "#ebe2cc",
    align: "center",
    baseline: "middle",
  });
}

export function drawStatBar(ctx, receiptData, theme, barTop = 1245) {
  const barW = 915;
  const barH = 150;
  const barLeft = 55;
  const g = ctx.createLinearGradient(barLeft, barTop, barLeft, barTop + barH);
  g.addColorStop(0, "rgba(8,12,14,0.72)");
  g.addColorStop(1, "rgba(2,4,6,0.92)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(barLeft + 6, barTop + 4);
  ctx.lineTo(barLeft + barW - 6, barTop);
  ctx.lineTo(barLeft + barW, barTop + barH);
  ctx.lineTo(barLeft, barTop + barH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(201,146,56,0.45)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(barLeft + 8, barTop + 2);
  ctx.lineTo(barLeft + barW - 8, barTop - 1);
  ctx.stroke();
  ctx.strokeStyle = "rgba(31,214,204,0.22)";
  ctx.lineWidth = 1.2;
  const divTop = barTop + 16;
  const divBot = barTop + barH - 14;
  const colW = barW / 4;
  for (let c = 1; c <= 3; c += 1) {
    const vx = barLeft + colW * c;
    ctx.beginPath();
    ctx.moveTo(vx, divTop);
    ctx.lineTo(vx, divBot);
    ctx.stroke();
  }
  const money = receiptData.moneyResult ?? receiptData.moneyLabel ?? "$—";
  const entries = [
    { label: "SCORE VS PAR", value: receiptData.scoreVsPar ?? "—" },
    { label: "MONEY", value: money },
    { label: "HOLES WON", value: receiptData.holesWon ?? "—" },
    { label: "RECORD", value: receiptData.record ?? "—" },
  ];
  entries.forEach((entry, index) => {
    const colLeft = barLeft + 18 + index * colW;
    const neg = String(entry.value).trim().startsWith("-");
    drawStatBlock(
      ctx,
      entry.label,
      entry.value ?? "—",
      colLeft,
      barTop + 20,
      colW - 36,
      neg ? (theme.moneyNegative ?? DESIGN.colors.orange) : (theme.accentPrimary ?? DESIGN.colors.teal),
    );
  });
}

function shouldSuppressPremiumQr(receiptData, options) {
  if (options.hidePremiumQr === true) return true;
  if (receiptData?.suppressQr === true) return true;
  const id = String(receiptData?.receiptNumber ?? receiptData?.receiptId ?? "");
  if (/\bDEMO\b|DEMO-|TEST|demo|sample/i.test(id)) return true;
  return false;
}

function drawPosterRibbon(ctx, rx, ry, rw, rh, text, theme) {
  const skew = 16;
  ctx.beginPath();
  ctx.moveTo(rx + skew, ry);
  ctx.lineTo(rx + rw - skew * 0.4, ry - 5);
  ctx.lineTo(rx + rw + 4, ry + rh);
  ctx.lineTo(rx - 6, ry + rh + 3);
  ctx.closePath();
  const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
  g.addColorStop(0, "rgba(3,6,7,0.9)");
  g.addColorStop(1, "rgba(2,3,4,0.85)");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(201,146,56,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  drawTextFit(ctx, String(text), {
    x: rx + rw * 0.5 + 4,
    y: ry + rh * 0.56,
    maxWidth: rw - 40,
    maxFontSize: 34,
    minFontSize: 20,
    fontFamily: "Impact, Anton, sans-serif",
    weight: 800,
    color: theme.accentPrimary ?? "#22d7cf",
    align: "center",
    baseline: "middle",
  });
}

export async function drawReceipt(ctx, receiptData, options = {}) {
  const W = options.width ?? 1024;
  const H = options.height ?? 1536;
  const data = { ...receiptData, ...SAMPLE_RECEIPT };
  console.debug("[receipt] canvas size", { width: W, height: H });
  const seed = seededHash(data.receiptNumber ?? data.playerName ?? "0");
  const theme = getReceiptTheme(data);
  const portraitPrimary = options.portraitLayerUrl ?? data.portraitImage;
  const portraitAlt = data.portraitAlternateUrl ?? options.alternatePortraitUrl;

  drawBackgroundEffects(ctx, theme, W, H, seed);

  const portraitX = 356;
  const portraitY = 62;
  const portraitW = 656;
  const portraitH = 884;
  const portrait = await loadPortraitForReceipt(portraitPrimary, portraitAlt);
  console.debug("[receipt] image loaded", { hasPortrait: Boolean(portrait) });
  paintCinematicPortrait(ctx, portrait, portraitX, portraitY, portraitW, portraitH);

  drawDiagonalPosterOverlay(ctx, W, H);
  drawDistressedBorder(ctx, W, H);

  ctx.fillStyle = "#22d7cf";
  ctx.font = "700 28px Impact, Anton, 'Arial Narrow', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.fillText("THE", 52, 78);
  ctx.shadowBlur = 0;
  drawTextFit(ctx, "CARD", {
    x: 52,
    y: 172,
    maxWidth: 340,
    maxFontSize: 86,
    minFontSize: 56,
    fontFamily: "Impact, Anton, 'Arial Narrow', sans-serif",
    weight: 900,
    color: "#f2e5c8",
    strokeStyle: "rgba(0,0,0,0.55)",
    strokeWidth: 4,
    baseline: "alphabetic",
  });

  const archetype = String(theme.topLabel ?? "").toUpperCase();
  ctx.font = "800 30px 'Arial Narrow', Inter, sans-serif";
  const aw = ctx.measureText(archetype).width;
  const midY = 78;
  const gap = 18;
  const leftLineEnd = 512 - aw / 2 - gap;
  const rightLineStart = 512 + aw / 2 + gap;
  ctx.strokeStyle = "rgba(31,214,204,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, midY);
  ctx.lineTo(leftLineEnd, midY);
  ctx.moveTo(rightLineStart, midY);
  ctx.lineTo(824, midY);
  ctx.stroke();
  ctx.fillStyle = "#f2e5c8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(archetype, 512, midY + 2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e0d5b8";
  ctx.font = "700 16px 'Arial Narrow', Inter, sans-serif";
  ctx.fillText("THE RECEIPT", 808, 70);
  ctx.save();
  ctx.shadowColor = "rgba(34,215,207,0.45)";
  ctx.shadowBlur = 16;
  drawTextFit(ctx, String(data.receiptNumber ?? "#000"), {
    x: 898,
    y: 116,
    maxWidth: 130,
    maxFontSize: 30,
    minFontSize: 18,
    fontFamily: "Impact, Anton, sans-serif",
    weight: 900,
    color: "#2ae8df",
    align: "center",
    baseline: "middle",
  });
  ctx.restore();

  const headlineFromTemplate = String(data.headline ?? "").trim();
  const stackedHead = headlineFromTemplate.length
    ? resolveHeadlineLines(data.headline).slice(0, 4)
    : Array.isArray(theme.headlineLines)
      ? theme.headlineLines.map((l) => String(l ?? "").trim()).filter(Boolean)
      : formatHeadlineStack(theme.headline).slice(0, 3);
  drawPosterHeadlineStack(ctx, stackedHead, theme);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const headGlow = ctx.createRadialGradient(218, 355, 20, 238, 392, 280);
  headGlow.addColorStop(0, "rgba(25,255,224,0.22)");
  headGlow.addColorStop(1, "rgba(25,255,224,0)");
  ctx.fillStyle = headGlow;
  ctx.fillRect(0, 140, 500, 460);
  ctx.restore();

  const moneyRaw = String(data.moneyResult ?? data.moneyLabel ?? "$—");
  const negMoney = moneyRaw.trim().startsWith("-");
  let moneySize = 142;
  ctx.font = `900 ${moneySize}px Impact, sans-serif`;
  while (moneySize > 72 && ctx.measureText(moneyRaw).width > 430) {
    moneySize -= 2;
    ctx.font = `900 ${moneySize}px Impact, sans-serif`;
  }
  drawGlowText(ctx, moneyRaw, 50, 512, {
    color: negMoney ? "#ff6b35" : "#22d7cf",
    glowColor: negMoney ? (theme.negativeGlow ?? "rgba(255,107,53,0.75)") : (theme.moneyGlow ?? "rgba(34,215,207,0.8)"),
    blur: 36,
    size: moneySize,
    strokeStyle: negMoney ? "rgba(25,8,0,0.88)" : "rgba(0,0,0,0.88)",
    strokeWidth: 7,
    weight: 900,
    fontFamily: "Impact, sans-serif",
  });

  const mSub = Array.isArray(theme.moneySubLines) ? theme.moneySubLines : [];
  ctx.save();
  ctx.translate(56, 664);
  ctx.rotate((-1.2 * Math.PI) / 180);
  if (mSub[0]) {
    drawTextFit(ctx, String(mSub[0]).toUpperCase(), {
      x: 0,
      y: 0,
      maxWidth: 400,
      maxFontSize: 32,
      minFontSize: 20,
      fontFamily: "Impact, Anton, sans-serif",
      weight: 800,
      color: "#dccfb8",
    });
  }
  if (mSub[1]) {
    drawTextFit(ctx, String(mSub[1]).toUpperCase(), {
      x: 0,
      y: 38,
      maxWidth: 400,
      maxFontSize: 32,
      minFontSize: 20,
      fontFamily: "Impact, Anton, sans-serif",
      weight: 800,
      color: "#dccfb8",
    });
  }
  ctx.restore();

  drawLeftStatusPlate(ctx, theme, data);

  const ribbonText = String(data.badge ?? "").trim() || String(theme.ribbonBanner ?? theme.titleRibbon ?? "");
  drawRibbon(ctx, 258, 736, 706, 84, ribbonText, theme);

  // Premium metallic nameplate with layered borders/bevel.
  const plateX = 232;
  const plateY = 812;
  const plateW = 742;
  const plateH = 170;
  drawAngledPanel(ctx, plateX, plateY, plateW, plateH, {
    inset: 22,
    fill: "rgba(10,10,10,0.72)",
    stroke: "rgba(155,122,69,0.62)",
    lineWidth: 1.8,
  });
  drawAngledPanel(ctx, plateX + 8, plateY + 8, plateW - 16, plateH - 16, {
    inset: 20,
    fill: "rgba(0,0,0,0.32)",
    stroke: "rgba(25,255,224,0.22)",
    lineWidth: 1.2,
  });
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const plateBevel = ctx.createLinearGradient(plateX, plateY, plateX, plateY + plateH);
  plateBevel.addColorStop(0, "rgba(232,215,176,0.16)");
  plateBevel.addColorStop(0.28, "rgba(232,215,176,0.03)");
  plateBevel.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = plateBevel;
  drawTrapezoidPath(ctx, plateX + 5, plateY + 5, plateW - 10, plateH - 10, 21);
  ctx.fill();
  ctx.restore();

  const playerUpper = String(data.playerName ?? "PLAYER").toUpperCase();
  let nameSize = 142;
  ctx.font = `900 ${nameSize}px Impact, sans-serif`;
  while (nameSize > 54 && ctx.measureText(playerUpper).width > 760) {
    nameSize -= 2;
    ctx.font = `900 ${nameSize}px Impact, sans-serif`;
  }
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.95)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 10;
  ctx.font = `900 ${nameSize}px Impact, sans-serif`;
  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.lineWidth = 5;
  ctx.strokeText(playerUpper, 512, 946);
  ctx.fillStyle = "#f4ecd8";
  ctx.fillText(playerUpper, 512, 946);
  ctx.restore();

  const sub = String(data.subheadline ?? data.statusText ?? theme.subtitle ?? "").toUpperCase();
  ctx.save();
  ctx.font = "800 30px Impact, 'Arial Narrow', sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(sub, 308, 1012);
  ctx.fillStyle = String(theme.accentPrimary ?? "#22d7cf");
  ctx.fillText(sub, 305, 1009);
  ctx.restore();

  const badges = Array.isArray(data.badges) && data.badges.length > 0 ? data.badges : theme.defaultBadges;
  const paddedBadges = [badges[0] ?? theme.defaultBadges[0], badges[1] ?? theme.defaultBadges[1], badges[2] ?? theme.defaultBadges[2]];
  drawBadge(ctx, String(paddedBadges[0]).toUpperCase(), 55, 1095, 275, 105, theme);
  drawBadge(ctx, String(paddedBadges[1]).toUpperCase(), 375, 1095, 275, 105, theme);
  drawBadge(ctx, String(paddedBadges[2]).toUpperCase(), 695, 1095, 275, 105, theme);

  drawStatBar(ctx, data, theme, 1238);

  ctx.fillStyle = "rgba(8,10,10,0.92)";
  ctx.beginPath();
  ctx.arc(82, 1448, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(201,146,56,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#f2e5c8";
  ctx.font = "800 15px Impact, Anton, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ATP", 82, 1449);
  ctx.textAlign = "left";
  ctx.font = "700 20px 'Arial Narrow', Inter, sans-serif";
  ctx.fillStyle = "#f2e5c8";
  ctx.fillText(String(data.courseName ?? "AUSTIN TEE PARTY").toUpperCase(), 118, 1454);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(232,213,163,0.9)";
  ctx.font = "italic 600 15px 'Arial Narrow', Inter, sans-serif";
  ctx.fillText("IF IT'S NOT ON THE RECEIPT, IT DIDN'T HAPPEN", 968, 1454);

  const qrTarget = data.qrCodeUrl ?? data.qrUrl;
  if (qrTarget && !shouldSuppressPremiumQr(data, options) && options.premiumReceiptQr !== false) {
    try {
      const QR = await import("qrcode");
      const tiny = 44;
      const qrData = await QR.toDataURL(qrTarget, { width: tiny, margin: 0, errorCorrectionLevel: "L" });
      const qrImg = await tryLoadImageUrl(qrData, "qr");
      if (qrImg) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.drawImage(qrImg, W - tiny - 22, H - tiny - 20, tiny, tiny);
        ctx.restore();
      }
    } catch (error) {
      receiptLog("qr render skipped", {
        qrTarget,
        error: error instanceof Error ? error.message : String(error),
      });
      console.warn("[receipt-pipeline] qr render skipped", qrTarget, error);
    }
  }
  console.debug("[receipt] render complete", { receiptNumber: data.receiptNumber });
}

export async function renderPremiumReceiptCard(ctx, receiptData, options = {}) {
  await drawReceipt(ctx, receiptData, options);
}

/**
 * @param {{
 *  portraitLayerUrl: string,
 *  template: {
 *   receiptNumber: string,
 *   playerName: string,
 *   headline: string,
 *   subheadline: string,
 *   moneyLabel: string,
 *   scoreVsPar: string,
 *   holesWon: string,
 *   record: string,
 *   badge: string,
 *   wolfStats: string,
 *   shareCta: string,
 *   qrUrl: string,
 *   branding: string,
 *  }
 * }} params
 */
export async function renderReceiptOverlay(params) {
  const W = 1024;
  const H = 1536;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const useLegacy = import.meta.env.VITE_LEGACY_RECEIPT_RENDERER === "true";
  if (useLegacy) {
    const colors = chooseColors(params.template);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, colors.top);
    grad.addColorStop(1, colors.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    const portrait = await loadPortraitForReceipt(params.portraitLayerUrl, params.template?.portraitAlternateUrl);
    ctx.drawImage(portrait, 0, 0, W, H);
    return canvas;
  }

  await renderPremiumReceiptCard(
    ctx,
    {
      receiptType: params.template.receiptType,
      playerName: params.template.playerName,
      headline: params.template.headline,
      subheadline: params.template.subheadline,
      moneyResult: params.template.moneyLabel,
      scoreVsPar: params.template.scoreVsPar,
      holesWon: params.template.holesWon,
      record: params.template.record,
      badges: params.template.badges,
      statusLabel: params.template.statusLabel,
      statusText: params.template.shareCta,
      receiptNumber: params.template.receiptNumber,
      courseName: params.template.courseName,
      qrCodeUrl: params.template.qrUrl,
      portraitImage: params.portraitLayerUrl,
      accentTheme: params.template.accentTheme,
      badge: params.template.badge,
      portraitAlternateUrl: params.template.portraitAlternateUrl,
    },
    {
      width: W,
      height: H,
      portraitLayerUrl: params.portraitLayerUrl,
      alternatePortraitUrl: params.template.portraitAlternateUrl,
    },
  );

  console.debug("[receipt] export complete", { width: W, height: H });
  return canvas;
}
