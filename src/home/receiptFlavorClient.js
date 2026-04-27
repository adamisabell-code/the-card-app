/**
 * Optional receipt flavor line — server decides null via ENABLE_AI_RECEIPT_FLAVOR.
 * Client only POSTs deterministic context; never sends secrets.
 */

/**
 * @param {{ playerName: string, stamp: string, badges: string[], receiptType?: string | null }} snapshot
 * @returns {Promise<string | null>}
 */
export async function fetchReceiptFlavorIfEnabled(snapshot) {
  if (import.meta.env.VITE_AI_RECEIPT_FLAVOR !== "true") return null;
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
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j.aiFlavorText === "string" && j.aiFlavorText.trim() ? j.aiFlavorText.trim() : null;
  } catch {
    return null;
  }
}
