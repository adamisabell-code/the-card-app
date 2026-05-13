import { formatStakeAmount } from "../../game/stakes.js";

export function buildCalloutReceiptTemplate(params) {
  return {
    kind: "callout",
    receiptType: "callout",
    receiptNumber: params.receiptNumber ?? `CALLOUT #${Date.now().toString().slice(-6)}`,
    playerName: params.playerName,
    headline: params.receiptCopy.headline,
    subheadline: params.receiptCopy.subheadline,
    moneyLabel: "$—",
    scoreVsPar: "—",
    holesWon: "—",
    record: "—",
    badge: "FOUNDER CALL OUT",
    badges: ["FOUNDING MEMBER", "PRESSURE PLAYER", "PROVE IT"],
    statusLabel: "CALLED OUT",
    wolfStats: "Blind — | Lone —",
    shareCta: "Invite your group. Let them prove they belong.",
    qrUrl: `${window.location.origin}/league-invite`,
    branding: "THE CARD · AUSTIN TEE PARTY",
    courseName: "AUSTIN TEE PARTY",
    accentTheme: "callout",
    groupChatText: params.receiptCopy.groupChatText,
    shareCaption: params.receiptCopy.shareCaption,
  };
}

export function buildEndRoundReceiptTemplate(params) {
  const money = typeof params.roundStats.moneyRaw === "number"
    ? formatStakeAmount(params.roundStats.moneyRaw)
    : String(params.roundStats.money ?? "$0");

  return {
    kind: "end_round",
    receiptType: String(params.receiptType ?? "neutral").toLowerCase(),
    receiptNumber: params.receiptNumber ?? `RECEIPT #${Date.now().toString().slice(-6)}`,
    playerName: params.playerName,
    headline: params.receiptCopy.headline,
    subheadline: params.receiptCopy.subheadline,
    moneyLabel: money,
    scoreVsPar: String(params.roundStats.scoreVsPar ?? "N/A"),
    holesWon: String(params.roundStats.holesWon ?? "0"),
    record: String(params.roundStats.record ?? "0-0"),
    badge: String(params.roundStats.badge ?? params.receiptType),
    badges: [],
    statusLabel: money.startsWith("-") ? "EXPOSED" : "PAID",
    wolfStats: `Blind ${params.roundStats.blindWolf ?? "0/0"} · Lone ${params.roundStats.loneWolf ?? "0/0"}`,
    shareCta: "If it's not on the receipt, it didn't happen.",
    qrUrl: params.qrUrl ?? window.location.origin,
    branding: "THE CARD · AUSTIN TEE PARTY",
    courseName: "AUSTIN TEE PARTY",
    accentTheme: undefined,
    groupChatText: params.receiptCopy.groupChatText,
    shareCaption: params.receiptCopy.shareCaption,
  };
}
