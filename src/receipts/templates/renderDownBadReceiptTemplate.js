/**
 * DOWN BAD coded receipt — deterministic 1024×1536 canvas.
 * Orchestrates theme + layout spec + reusable `parts/*` drawers.
 * Only image slots: optional portrait, optional pre-rendered QR bitmap.
 */

import { DEFAULT_DOWN_BAD_TEMPLATE, DOWN_BAD_RECEIPT_LAYOUT } from "./downBadReceiptLayoutSpec.js";
import { loadCardWordmark } from "../assets/brandAssets.js";
import { getReceiptTheme } from "../theme/receiptThemes.js";
import { drawReceiptBackgroundAtmosphere } from "./parts/drawReceiptBackgroundAtmosphere.js";
import { drawStadiumLights } from "./parts/drawStadiumLights.js";
import { drawGrainAndSpeckles } from "./parts/drawGrainAndSpeckles.js";
import { drawLowerStageAccentGlow } from "./parts/drawLowerStageAccentGlow.js";
import { drawReceiptTradingCardFrame } from "./parts/drawReceiptTradingCardFrame.js";
import { drawReceiptHeader } from "./parts/drawReceiptHeader.js";
import { drawHeadlineBlock } from "./parts/drawHeadlineBlock.js";
import { drawPortraitSlot } from "./parts/drawPortraitSlot.js";
import { drawLowerPanelBackdrop } from "./parts/drawLowerPanelBackdrop.js";
import { drawWolfBadgeCard } from "./parts/drawWolfBadgeCard.js";
import { drawRoleRibbon } from "./parts/drawRoleRibbon.js";
import { drawNamePlate } from "./parts/drawNamePlate.js";
import { drawBadgeRow } from "./parts/drawBadgeRow.js";
import { drawStatsStrip } from "./parts/drawStatsStrip.js";
import { drawReceiptFooter } from "./parts/drawReceiptFooter.js";

const L = DOWN_BAD_RECEIPT_LAYOUT;
const { width: W, height: H } = L.canvas;

/**
 * @typedef {typeof DEFAULT_DOWN_BAD_TEMPLATE & Record<string, string>} DownBadTemplate
 */

/**
 * @typedef {{
 *   portraitImage?: CanvasImageSource | null
 *   qrImage?: CanvasImageSource | null
 * }} DownBadReceiptAssets
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @returns {import('./parts/types.js').DownBadDrawContext}
 */
export function createDownBadDrawContext(ctx) {
  const layout = DOWN_BAD_RECEIPT_LAYOUT;
  const theme = getReceiptTheme(layout.themeId);
  return {
    ctx,
    W: layout.canvas.width,
    H: layout.canvas.height,
    theme,
    layout,
    fonts: layout.fonts,
    effects: layout.effects,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Partial<DownBadTemplate>} template
 * @param {DownBadReceiptAssets} assets
 */
export function renderDownBadReceiptTemplate(ctx, template, assets) {
  const t = /** @type {DownBadTemplate} */ ({ ...DEFAULT_DOWN_BAD_TEMPLATE, ...template });
  const dctx = createDownBadDrawContext(ctx);

  drawReceiptBackgroundAtmosphere(dctx);
  drawStadiumLights(dctx);
  drawReceiptHeader(dctx, t);
  drawHeadlineBlock(dctx, t);
  drawPortraitSlot(dctx, assets?.portraitImage ?? null);
  drawLowerPanelBackdrop(dctx);
  drawWolfBadgeCard(dctx, t);
  drawRoleRibbon(dctx, t);
  drawNamePlate(dctx, t);
  drawBadgeRow(dctx, t);
  drawStatsStrip(dctx, t, assets?.qrImage ?? null);
  drawReceiptFooter(dctx, t);
  drawLowerStageAccentGlow(dctx);
  drawGrainAndSpeckles(dctx);
  drawReceiptTradingCardFrame(dctx);
}

/**
 * @param {string | null | undefined} url
 * @returns {Promise<HTMLImageElement | null>}
 */
export async function loadImageUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return null;
  return new Promise((resolve) => {
    const img = new Image();
    if (!s.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = s;
  });
}

/**
 * @param {Partial<DownBadTemplate>} [templatePartial]
 * @param {string | null | undefined} portraitUrl
 * @returns {Promise<string>}
 */
export async function renderDownBadReceiptToDataUrl(templatePartial = {}, portraitUrl = null) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const t = /** @type {DownBadTemplate} */ ({ ...DEFAULT_DOWN_BAD_TEMPLATE, ...templatePartial });

  let qrImage = null;
  try {
    const QR = await import("qrcode");
    const dataUrl = await QR.toDataURL(String(t.qrUrl || "").trim() || `${window.location.origin}/receipt-lab`, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: "L",
      color: { dark: "#141814", light: "#f4ecd8" },
    });
    qrImage = await loadImageUrl(dataUrl);
  } catch {
    /* deterministic without QR if library fails */
  }

  await loadCardWordmark();
  const portraitImage = portraitUrl ? await loadImageUrl(portraitUrl) : null;
  renderDownBadReceiptTemplate(ctx, t, { portraitImage, qrImage });
  return canvas.toDataURL("image/png");
}
