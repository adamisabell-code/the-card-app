/**
 * Optional receipt flavor line — server decides null via ENABLE_AI_RECEIPT_FLAVOR.
 * Client only POSTs deterministic context; never sends secrets.
 */

import { pushReceiptFlavorDebug } from "./receiptFlavorDebug.js";

/**
 * @param {{ playerName: string, stamp: string, badges: string[], receiptType?: string | null }} snapshot
 * @returns {Promise<string | null>}
 */
export async function fetchReceiptFlavorIfEnabled(snapshot) {
  const viteFlag = import.meta.env.VITE_AI_RECEIPT_FLAVOR;
  pushReceiptFlavorDebug({
    lastAttemptAt: new Date().toISOString(),
    requestSent: false,
    responseReceived: false,
    httpStatus: null,
    error: null,
    rawOpenAiResponse: null,
    flavorText: null,
    skippedReason: null,
    openAiConnected: null,
    serverDebug: null,
    viteAiReceiptFlavor: viteFlag,
  });

  if (viteFlag !== "true") {
    const reason = `VITE_AI_RECEIPT_FLAVOR is not "true" (got ${String(viteFlag)})`;
    console.warn("[receipt-flavor] skip — client gate off:", reason);
    pushReceiptFlavorDebug({ skippedReason: reason, openAiConnected: false });
    return null;
  }

  console.log("[receipt-flavor] start fetch", {
    receiptType: snapshot.receiptType ?? "normal_result",
    playerName: snapshot.playerName,
    stamp: snapshot.stamp,
    badges: snapshot.badges,
  });
  pushReceiptFlavorDebug({ requestSent: true, skippedReason: null });

  try {
    const res = await fetch("/api/receipt-flavor", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        receiptType: snapshot.receiptType ?? "normal_result",
        playerName: snapshot.playerName,
        badges: snapshot.badges,
        stamp: snapshot.stamp,
      }),
    });
    const httpStatus = res.status;
    pushReceiptFlavorDebug({ responseReceived: true, httpStatus });
    const rawText = await res.text();
    let j;
    try {
      j = JSON.parse(rawText);
    } catch {
      console.error("[receipt-flavor] non-JSON response", rawText.slice(0, 500));
      pushReceiptFlavorDebug({ error: "Response was not JSON", flavorText: null, openAiConnected: false });
      return null;
    }
    console.log("[receipt-flavor] response JSON", j);
    const flavor =
      typeof j.aiFlavorText === "string" && j.aiFlavorText.trim() ? j.aiFlavorText.trim() : null;
    const serverDebug = j.debug && typeof j.debug === "object" ? j.debug : null;
    const rawModel =
      serverDebug && typeof serverDebug.rawModelContent === "string" ? serverDebug.rawModelContent : null;
    const keyOk = !!(serverDebug && serverDebug.openaiKeyPresent === true);
    const flavorEnabled = !!(serverDebug && serverDebug.enableAiReceiptFlavor === true);
    const openAiConnected = serverDebug != null ? keyOk && flavorEnabled : flavor != null ? null : false;
    pushReceiptFlavorDebug({
      flavorText: flavor,
      rawOpenAiResponse: rawModel,
      serverDebug,
      openAiConnected,
      error: !res.ok ? `HTTP ${httpStatus}` : serverDebug && typeof serverDebug.error === "string" ? serverDebug.error : null,
    });
    if (!res.ok) {
      console.warn("[receipt-flavor] HTTP error", httpStatus, j);
      return null;
    }
    return flavor;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[receipt-flavor] fetch error", e);
    pushReceiptFlavorDebug({ error: msg, responseReceived: true, openAiConnected: false });
    return null;
  }
}
