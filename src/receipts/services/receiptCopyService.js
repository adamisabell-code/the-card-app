const FALLBACK_COPY = {
  MVP: {
    headline: "TOOK EVERYTHING",
    subheadline: "CLEAN ROUND. TOTAL CONTROL.",
    savageCallout: "Everybody got receipts tonight.",
    groupChatText: "MVP card posted. Who wants next?",
    shareCaption: "If it's not on the receipt, it didn't happen.",
  },
  Winner: {
    headline: "ROUND WINNER",
    subheadline: "CONTROLLED CHAOS. CASHED OUT.",
    savageCallout: "Scorecard did the talking.",
    groupChatText: "Winner receipt live.",
    shareCaption: "Run it back.",
  },
  callout: {
    headline: "GROUP CHALLENGED",
    subheadline: "SHOW UP OR STAY QUIET.",
    savageCallout: "I joined. You better show up.",
    groupChatText: "New callout receipt is up.",
    shareCaption: "I just joined The Card. Prove me wrong.",
  },
};

function fallback(receiptType) {
  return FALLBACK_COPY[receiptType] ?? FALLBACK_COPY.Winner;
}

/**
 * @param {{ receiptType: string, playerName: string, roundStats?: Record<string, unknown> }} params
 */
export async function generateReceiptCopy(params) {
  const body = {
    receiptType: params.receiptType,
    playerName: params.playerName,
    roundStats: params.roundStats ?? {},
  };
  if (import.meta.env.VITE_RECEIPT_COPY_AI !== "true") {
    console.log("[receipt-copy] fallback used; VITE_RECEIPT_COPY_AI disabled", body);
    return { ...fallback(params.receiptType), source: "fallback" };
  }

  try {
    const res = await fetch("/api/generate-receipt-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn("[receipt-copy] API error", res.status);
      return { ...fallback(params.receiptType), source: "fallback" };
    }
    const data = await res.json();
    const base = fallback(params.receiptType);
    return {
      headline: typeof data.headline === "string" && data.headline.trim() ? data.headline.trim() : base.headline,
      subheadline: typeof data.subheadline === "string" && data.subheadline.trim() ? data.subheadline.trim() : base.subheadline,
      savageCallout: typeof data.savageCallout === "string" && data.savageCallout.trim() ? data.savageCallout.trim() : base.savageCallout,
      groupChatText: typeof data.groupChatText === "string" && data.groupChatText.trim() ? data.groupChatText.trim() : base.groupChatText,
      shareCaption: typeof data.shareCaption === "string" && data.shareCaption.trim() ? data.shareCaption.trim() : base.shareCaption,
      source: data.source === "ai" ? "ai" : "fallback",
    };
  } catch (error) {
    console.error("[receipt-copy] API request failed", error);
    return { ...fallback(params.receiptType), source: "fallback" };
  }
}
