/**
 * Client-side receipt / viral-loop events. Swap implementation later for real analytics sinks.
 */

/** Canonical event ids for dashboards / future wiring */
export const ReceiptAnalyticsEvent = /** @type {const} */ ({
  PREVIEW_RENDERED: "receipt_preview_rendered",
  PLAYER_SELECTED: "receipt_player_selected",
  PACK_SAVE_CLICKED: "receipt_pack_save_clicked",
  PACK_SHARE_IMAGE_CLICKED: "receipt_pack_share_image_clicked",
  PACK_COPY_CHAT_CLICKED: "receipt_pack_copy_chat_clicked",
  PACK_SHARE_IMAGE_SUCCESS: "receipt_pack_share_image_success",
  PACK_SHARE_IMAGE_FALLBACK_USED: "receipt_pack_share_image_fallback_used",
  PACK_COPY_CHAT_SUCCESS: "receipt_pack_copy_chat_success",
  RENDER_ERROR: "receipt_render_error",
});

/**
 * @typedef {{
 *   selectedPlayerId: string | null
 *   playerName: string | null
 *   receiptType: string | null
 *   moneyValue: number | null
 *   hideDollarAmounts: boolean
 *   roundId: string | null
 *   timestamp: string
 * }} ReceiptAnalyticsEnvelope
 */

/**
 * @param {string} eventName
 * @param {Record<string, unknown> & Partial<ReceiptAnalyticsEnvelope>} payload
 */
export function logReceiptEvent(eventName, payload) {
  try {
    const ts = typeof payload.timestamp === "string" && payload.timestamp.trim() ? payload.timestamp : new Date().toISOString();
    const body = {
      event: eventName,
      ...payload,
      timestamp: ts,
    };
    if (typeof console !== "undefined" && typeof console.info === "function") {
      console.info(`[receipt-analytics] ${eventName}`, body);
    }
  } catch {
    /* never block UI */
  }
}
