/**
 * Home receipt: demo data for new users + persisted last receipt for returning users.
 * @module
 */

import { buildRoundResult, suggestPressBadgeHints } from "../game/roundResult.js";
import { computeReceiptPresentation } from "../../receipts/receiptEngine.ts";

const HAS_RECEIPT_KEY = "the-card-has-receipt-v1";
const SNAPSHOT_KEY = "the-card-last-receipt-snapshot-v1";

/** Full-size demo receipt — same shape as a real slip (new users). */
export const DEMO_RECEIPT_HOME = Object.freeze({
  playerName: "Player 1",
  amountLabel: "+$84",
  stamp: "ABSOLUTE TAKEOVER",
  badges: ["Press Merchant", "Wolf Killer"],
});

/**
 * @returns {boolean}
 */
export function hasReturningUserReceipt() {
  try {
    return localStorage.getItem(HAS_RECEIPT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markReturningUserReceipt() {
  try {
    localStorage.setItem(HAS_RECEIPT_KEY, "1");
  } catch {
    /* ignore quota */
  }
}

/**
 * @typedef {{
 *   playerName: string
 *   amountLabel: string
 *   stamp: string
 *   badges: string[]
 *   portraitHeroMode: string | null
 *   receiptType?: string | null
 *   aiFlavorText?: string | null
 * }} LastReceiptSnapshot
 */

/**
 * @param {LastReceiptSnapshot} snapshot
 */
export function saveLastReceiptSnapshot(snapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {LastReceiptSnapshot | null}
 */
export function loadLastReceiptSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.playerName !== "string") return null;
    return {
      playerName: o.playerName,
      amountLabel: o.amountLabel ?? "+$0",
      stamp: o.stamp ?? "POSTED",
      badges: Array.isArray(o.badges) ? o.badges : [],
      portraitHeroMode: typeof o.portraitHeroMode === "string" ? o.portraitHeroMode : null,
      receiptType: typeof o.receiptType === "string" ? o.receiptType : null,
      aiFlavorText: typeof o.aiFlavorText === "string" ? o.aiFlavorText : null,
    };
  } catch {
    return null;
  }
}

/**
 * @param {import('../game/types.js').GamePlayer[]} gamePlayers
 * @param {import('../game/types.js').HoleRecord[]} holeRecords
 * @returns {LastReceiptSnapshot}
 */
export function buildLastReceiptSnapshot(gamePlayers, holeRecords) {
  const p0 = gamePlayers.find((p) => p.id === "p-0") ?? gamePlayers[0];
  const playerName = p0?.name?.trim() || "Player 1";

  const rr = buildRoundResult(gamePlayers, holeRecords);
  const pres = computeReceiptPresentation(rr, p0.id);
  const hints = suggestPressBadgeHints(rr);
  const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  let badges = hints.slice(0, 3).map((h) => titleCase(h.label));
  if (badges.length < 2) {
    badges = ["Press Merchant", "Wolf Killer"];
  }

  const presses = rr.pressStats.totalPresses;
  const holes = rr.holeCount;
  const n = Math.min(999, Math.max(12, presses * 14 + holes * 6));
  const amountLabel = `+$${n}`;

  return {
    playerName,
    amountLabel,
    stamp: pres.stamp,
    badges,
    portraitHeroMode: pres.portraitHeroMode,
    receiptType: pres.receiptType,
    aiFlavorText: null,
  };
}
