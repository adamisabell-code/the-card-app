/**
 * Home receipt: demo data for new users + persisted last receipt for returning users.
 * @module
 */

import { buildRoundResult, suggestPressBadgeHints } from "../game/roundResult.js";
import { computeReceiptPresentation } from "../../receipts/receiptEngine.ts";
import { buildStakeCallouts, computeRoundPayout, formatStakeAmount } from "../game/stakes.js";
import { formatReceiptLine, normalizeRoundFormat } from "../game/gameFormats.js";

const HAS_RECEIPT_KEY = "the-card-has-receipt-v1";
const SNAPSHOT_KEY = "the-card-last-receipt-snapshot-v1";
/** Set only after a real completed round (recap). Used for first-launch / post-splash routing — not demo receipts. */
const LIVE_ROUND_COMPLETE_KEY = "the-card-completed-live-round-v1";

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

/**
 * True after the scorekeeper finishes a real round (recap). Drives post-splash / hub routing.
 * Demo / Settings "Generate Test Receipt" must not set this (see `snapshotSource: 'settings-demo'`).
 * @returns {boolean}
 */
export function hasCompletedLiveRound() {
  try {
    if (localStorage.getItem(LIVE_ROUND_COMPLETE_KEY) === "1") return true;
    const legacy = localStorage.getItem(HAS_RECEIPT_KEY) === "1";
    if (!legacy) return false;
    const snap = loadLastReceiptSnapshot();
    if (snap?.snapshotSource === "settings-demo") return false;
    return true;
  } catch {
    return false;
  }
}

export function markLiveRoundCompleted() {
  try {
    localStorage.setItem(LIVE_ROUND_COMPLETE_KEY, "1");
  } catch {
    /* ignore */
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
 * One-shot debug bundle for routing / receipt keys (DEV-friendly).
 * @returns {Record<string, unknown>}
 */
export function getReturningReceiptRoutingDebug() {
  let hasReceiptRaw = null;
  let liveRoundRaw = null;
  let snapshotRawLen = 0;
  let snapshotSource = null;
  try {
    hasReceiptRaw = localStorage.getItem(HAS_RECEIPT_KEY);
    liveRoundRaw = localStorage.getItem(LIVE_ROUND_COMPLETE_KEY);
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    snapshotRawLen = raw?.length ?? 0;
    if (raw) {
      const o = JSON.parse(raw);
      snapshotSource = o?.snapshotSource ?? null;
    }
  } catch {
    /* ignore */
  }
  return {
    hasReceiptKey: HAS_RECEIPT_KEY,
    hasReceiptRaw,
    liveRoundCompleteKey: LIVE_ROUND_COMPLETE_KEY,
    liveRoundRaw,
    snapshotKey: SNAPSHOT_KEY,
    snapshotRawLen,
    snapshotSource,
    hasReturningUserReceipt: hasReceiptRaw === "1",
    hasCompletedLiveRound: hasCompletedLiveRound(),
    demoReceiptPlayerName: DEMO_RECEIPT_HOME.playerName,
  };
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
 *   snapshotSource?: 'live-round' | 'settings-demo'
 *   formatReceiptLabel?: string | null
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
    const snapshotSource =
      o.snapshotSource === "live-round" || o.snapshotSource === "settings-demo" ? o.snapshotSource : undefined;
    return {
      playerName: o.playerName,
      amountLabel: o.amountLabel ?? "+$0",
      stamp: o.stamp ?? "POSTED",
      badges: Array.isArray(o.badges) ? o.badges : [],
      portraitHeroMode: typeof o.portraitHeroMode === "string" ? o.portraitHeroMode : null,
      receiptType: typeof o.receiptType === "string" ? o.receiptType : null,
      aiFlavorText: typeof o.aiFlavorText === "string" ? o.aiFlavorText : null,
      formatReceiptLabel: typeof o.formatReceiptLabel === "string" ? o.formatReceiptLabel : null,
      ...(snapshotSource ? { snapshotSource } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * @param {import('../game/types.js').GamePlayer[]} gamePlayers
 * @param {import('../game/types.js').HoleRecord[]} holeRecords
 * @param {import('../game/stakes.js').StakesConfig} [stakesConfig]
 * @param {import('../game/gameFormats.js').RoundFormatId} [roundFormat]
 * @returns {LastReceiptSnapshot}
 */
export function buildLastReceiptSnapshot(gamePlayers, holeRecords, stakesConfig, roundFormat = "wolf") {
  const p0 = gamePlayers.find((p) => p.id === "p-0") ?? gamePlayers[0];
  const playerName = p0?.name?.trim() || "Player 1";
  const fmt = normalizeRoundFormat(roundFormat);

  const stakes = stakesConfig ?? {
    preset: 2,
    customValue: "",
    loneWolf2x: true,
    blindWolf3x: true,
    hideDollarAmounts: false,
  };
  const moneyByPlayerId = computeRoundPayout(holeRecords, gamePlayers, stakes);
  const rr = buildRoundResult(gamePlayers, holeRecords, { moneyByPlayerId, roundFormat: fmt });
  const pres = computeReceiptPresentation(rr, p0.id);
  const hints = suggestPressBadgeHints(rr);
  const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  let badges = hints.slice(0, 3).map((h) => titleCase(h.label));
  badges = badges.concat(buildStakeCallouts(holeRecords, gamePlayers, stakes));
  if (badges.length < 2) {
    badges = ["Press Merchant", "Wolf Killer"];
  }

  const amount = moneyByPlayerId[p0.id] ?? 0;
  const amountLabel = stakes.hideDollarAmounts ? "+$—" : formatStakeAmount(amount);

  return {
    playerName,
    amountLabel,
    stamp: pres.stamp,
    badges,
    portraitHeroMode: pres.portraitHeroMode,
    receiptType: pres.receiptType,
    aiFlavorText: null,
    formatReceiptLabel: formatReceiptLine(fmt),
  };
}
