/**
 * WIN coded receipt — same 1024×1536 parts pipeline as DOWN BAD, `WIN_RECEIPT_LAYOUT` + `win` theme.
 * Portrait is painted before the headline block so the hero column reads first while type stays legible on overlap.
 */

import { DEFAULT_WIN_TEMPLATE, WIN_RECEIPT_LAYOUT } from "./winReceiptLayoutSpec.js";
import { loadCardWordmark } from "../assets/brandAssets.js";
import { getReceiptTheme } from "../theme/receiptThemes.js";
import { loadImageUrl } from "./renderDownBadReceiptTemplate.js";
import { drawReceiptBackgroundAtmosphere } from "./parts/drawReceiptBackgroundAtmosphere.js";
import { drawStadiumLights } from "./parts/drawStadiumLights.js";
import { drawGrainAndSpeckles } from "./parts/drawGrainAndSpeckles.js";
import { drawLowerStageAccentGlow } from "./parts/drawLowerStageAccentGlow.js";
import { drawReceiptTradingCardFrame } from "./parts/drawReceiptTradingCardFrame.js";
import { drawReceiptHeader } from "./parts/drawReceiptHeader.js";
import { drawHeadlineBlock } from "./parts/drawHeadlineBlock.js";
import { drawPortraitSlot } from "./parts/drawPortraitSlot.js";
import { drawLowerPanelBackdrop } from "./parts/drawLowerPanelBackdrop.js";
import { drawIceBadgeCard } from "./parts/drawIceBadgeCard.js";
import { drawRoleRibbon } from "./parts/drawRoleRibbon.js";
import { drawNamePlate } from "./parts/drawNamePlate.js";
import { drawBadgeRow } from "./parts/drawBadgeRow.js";
import { drawStatsStrip } from "./parts/drawStatsStrip.js";
import { drawReceiptFooter } from "./parts/drawReceiptFooter.js";

const L = WIN_RECEIPT_LAYOUT;
const { width: W, height: H } = L.canvas;

/**
 * @typedef {typeof DEFAULT_WIN_TEMPLATE & Record<string, string>} WinReceiptTemplate
 */

/**
 * @typedef {{
 *   portraitImage?: CanvasImageSource | null
 *   qrImage?: CanvasImageSource | null
 * }} WinReceiptAssets
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @returns {import('./parts/types.js').DownBadDrawContext}
 */
function createWinDrawContext(ctx) {
  const layout = WIN_RECEIPT_LAYOUT;
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
 * @param {Partial<WinReceiptTemplate>} template
 * @param {WinReceiptAssets} assets
 */
export function renderWinReceiptTemplate(ctx, template, assets) {
  const t = /** @type {WinReceiptTemplate} */ ({ ...DEFAULT_WIN_TEMPLATE, ...template });
  const dctx = createWinDrawContext(ctx);

  drawReceiptBackgroundAtmosphere(dctx);
  drawStadiumLights(dctx);
  drawReceiptHeader(dctx, t);
  drawPortraitSlot(dctx, assets?.portraitImage ?? null);
  drawHeadlineBlock(dctx, t);
  drawLowerPanelBackdrop(dctx);
  drawIceBadgeCard(dctx, t);
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
 * @param {Partial<WinReceiptTemplate>} [templatePartial]
 * @param {string | null | undefined} portraitUrl
 * @returns {Promise<string>}
 */
export async function renderWinReceiptToDataUrl(templatePartial = {}, portraitUrl = null) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const t = /** @type {WinReceiptTemplate} */ ({ ...DEFAULT_WIN_TEMPLATE, ...templatePartial });

  let qrImage = null;
  try {
    const QR = await import("qrcode");
    const dataUrl = await QR.toDataURL(String(t.qrUrl || "").trim() || `${window.location.origin}/receipt-lab`, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: "L",
      color: { dark: "#0a1814", light: "#e8f4ec" },
    });
    qrImage = await loadImageUrl(dataUrl);
  } catch {
    /* deterministic without QR if library fails */
  }

  await loadCardWordmark();
  const portraitImage = portraitUrl ? await loadImageUrl(portraitUrl) : null;
  renderWinReceiptTemplate(ctx, t, { portraitImage, qrImage });
  return canvas.toDataURL("image/png");
}
