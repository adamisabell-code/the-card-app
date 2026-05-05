import { renderReceiptOverlay } from "./receiptOverlayRenderer.js";
import { receiptLog } from "./receiptDebugLogger.js";

/**
 * @param {{ portraitLayerUrl: string, template: Record<string, unknown> }} params
 */
export async function exportReceiptPng(params) {
  const canvas = await renderReceiptOverlay({
    portraitLayerUrl: params.portraitLayerUrl,
    template: params.template,
  });
  const receiptImageUrl = canvas.toDataURL("image/png");
  receiptLog("PNG rendered", { bytesApprox: receiptImageUrl.length, size: "1024x1536" });
  return { canvas, receiptImageUrl };
}
