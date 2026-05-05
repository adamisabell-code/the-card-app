/** @typedef {Record<string, unknown> | null} ServerDebug */

export const RECEIPT_FLAVOR_DEBUG_EVENT = "the-card-receipt-flavor-debug";

/**
 * @typedef {{
 *   lastAttemptAt: string | null
 *   requestSent: boolean
 *   responseReceived: boolean
 *   httpStatus: number | null
 *   error: string | null
 *   rawOpenAiResponse: string | null
 *   flavorText: string | null
 *   skippedReason: string | null
 *   viteAiReceiptFlavor: string | undefined
 *   openAiConnected: boolean | null
 *   serverDebug: ServerDebug
 * }} ReceiptFlavorDebugState
 */

/** @type {ReceiptFlavorDebugState} */
let state = {
  lastAttemptAt: null,
  requestSent: false,
  responseReceived: false,
  httpStatus: null,
  error: null,
  rawOpenAiResponse: null,
  flavorText: null,
  skippedReason: null,
  viteAiReceiptFlavor: typeof import.meta !== "undefined" ? import.meta.env?.VITE_AI_RECEIPT_FLAVOR : undefined,
  openAiConnected: null,
  serverDebug: null,
};

/**
 * @param {Partial<ReceiptFlavorDebugState>} patch
 */
export function pushReceiptFlavorDebug(patch) {
  state = { ...state, ...patch };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(RECEIPT_FLAVOR_DEBUG_EVENT));
  }
}

/** @returns {ReceiptFlavorDebugState} */
export function getReceiptFlavorDebug() {
  return { ...state };
}
