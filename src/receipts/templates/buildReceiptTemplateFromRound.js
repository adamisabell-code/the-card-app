/**
 * Maps live round + player into coded receipt template objects (DOWN BAD / WIN shapes).
 * All copy is deterministic from `receiptType` + computed stats — no AI text.
 */

import { SLOT_PLAYER_IDS } from "../../game/types.js";
import { aggregateWolfRoundStats, computePointsAwarded, winningPlayerIdsForRecord } from "../../game/scoring.js";
import { computeRoundPayout } from "../../game/stakes.js";
import { DEFAULT_DOWN_BAD_TEMPLATE } from "./downBadReceiptLayoutSpec.js";
import { DEFAULT_WIN_TEMPLATE } from "./winReceiptLayoutSpec.js";

/**
 * @typedef {import('../../game/types.js').GamePlayer} GamePlayer
 * @typedef {import('../../game/types.js').HoleRecord} HoleRecord
 * @typedef {import('../../game/stakes.js').StakesConfig} StakesConfig
 */

/**
 * @typedef {{
 *   receiptNumber?: string
 *   scoreVsPar?: string
 *   money?: number
 *   holesWon?: number
 *   record?: string
 * }} ReceiptLineOverride
 */

/**
 * @typedef {{
 *   holeRecords: HoleRecord[]
 *   gamePlayers: GamePlayer[]
 *   stakesConfig: StakesConfig
 *   qrUrl?: string | null
 *   receiptByPlayerId?: Record<string, ReceiptLineOverride>
 *   scoreVsParByPlayerId?: Record<string, string>
 *   receiptNumberByPlayerId?: Record<string, string>
 * }} RoundForReceipt
 */

const IDS = [...SLOT_PLAYER_IDS];

/** @type {StakesConfig} */
const EMPTY_STAKES = {
  preset: 5,
  customValue: "",
  loneWolf2x: true,
  blindWolf3x: true,
  hideDollarAmounts: false,
};

function wolfAt(holeNumber) {
  return IDS[(holeNumber - 1) % 4];
}

function nextPartnerId(wolfId) {
  const i = IDS.indexOf(wolfId);
  return IDS[(i + 1) % 4];
}

/**
 * @param {number} holeNumber
 * @returns {HoleRecord}
 */
function sealTieHole(holeNumber) {
  const w = wolfAt(holeNumber);
  const p = nextPartnerId(w);
  const raw = {
    holeNumber,
    wolfPlayerId: w,
    holeMode: /** @type {const} */ ("normal"),
    partnerPlayerId: p,
    winningSide: /** @type {const} */ ("tie"),
  };
  const pointsAwardedByPlayerId = computePointsAwarded(raw, IDS);
  const winningPlayerIds = winningPlayerIdsForRecord({ ...raw, pointsAwardedByPlayerId }, IDS);
  return {
    ...raw,
    pointsAwardedByPlayerId,
    winningPlayerIds,
    holeOutcomeLabel: null,
  };
}

/**
 * Lab / tests: neutral 18-hole round with per-player receipt lines overridden (Marcus win / Lexi loss lab numbers).
 * @type {RoundForReceipt}
 */
export const FAKE_DYNAMIC_ROUND_FOR_RECEIPT_LAB = {
  holeRecords: Array.from({ length: 18 }, (_, i) => sealTieHole(i + 1)),
  gamePlayers: [
    { id: "p-0", slotIndex: 0, name: "Marcus T." },
    { id: "p-1", slotIndex: 1, name: "Lexi R." },
    { id: "p-2", slotIndex: 2, name: "Jordan T." },
    { id: "p-3", slotIndex: 3, name: "Mia R." },
  ],
  stakesConfig: EMPTY_STAKES,
  qrUrl: typeof window !== "undefined" ? `${window.location.origin}/receipt-lab` : "https://thecard.local/receipt-lab",
  receiptByPlayerId: {
    "p-0": { receiptNumber: "#019", scoreVsPar: "-2", money: 340, holesWon: 7, record: "5-1" },
    "p-1": { receiptNumber: "#018", scoreVsPar: "+6", money: -210, holesWon: 3, record: "1-5" },
  },
};

/**
 * @param {unknown} round
 * @returns {RoundForReceipt}
 */
function normalizeRound(round) {
  const r = /** @type {Partial<RoundForReceipt> | null | undefined} */ (round);
  const holeRecords = Array.isArray(r?.holeRecords) ? /** @type {HoleRecord[]} */ (r.holeRecords) : [];
  const gamePlayers = Array.isArray(r?.gamePlayers) && r.gamePlayers.length ? /** @type {GamePlayer[]} */ (r.gamePlayers) : [];
  const stakesConfig = r?.stakesConfig && typeof r.stakesConfig === "object" ? /** @type {StakesConfig} */ (r.stakesConfig) : EMPTY_STAKES;
  return {
    holeRecords,
    gamePlayers,
    stakesConfig,
    qrUrl: r?.qrUrl ?? null,
    receiptByPlayerId: r?.receiptByPlayerId && typeof r.receiptByPlayerId === "object" ? r.receiptByPlayerId : undefined,
    scoreVsParByPlayerId: r?.scoreVsParByPlayerId && typeof r.scoreVsParByPlayerId === "object" ? r.scoreVsParByPlayerId : undefined,
    receiptNumberByPlayerId: r?.receiptNumberByPlayerId && typeof r.receiptNumberByPlayerId === "object" ? r.receiptNumberByPlayerId : undefined,
  };
}

/**
 * @param {RoundForReceipt} round
 * @param {GamePlayer | null | undefined} player
 */
function resolvePlayer(round, player) {
  const list = round.gamePlayers;
  if (!list.length) return /** @type {GamePlayer} */ ({ id: "p-0", name: "PLAYER", slotIndex: 0 });
  if (player && list.some((p) => p.id === player.id)) return player;
  return list[0];
}

/**
 * @param {string} name
 */
function displayNameUpper(name) {
  const s = String(name ?? "").trim();
  return (s || "PLAYER").toUpperCase();
}

/**
 * @param {number} raw
 * @param {boolean} hide
 */
function formatMoney(raw, hide) {
  if (hide) return "—";
  const v = Math.round(Number(raw));
  if (!Number.isFinite(v)) return "$0";
  if (v === 0) return "$0";
  if (v > 0) return `+$${v}`;
  return `-$${Math.abs(v)}`;
}

/**
 * @param {RoundForReceipt} round
 * @param {string} playerId
 */
function resolveReceiptCore(round, playerId) {
  const allIds = round.gamePlayers.map((p) => p.id).filter(Boolean);
  const stats = allIds.length ? aggregateWolfRoundStats(round.holeRecords, allIds) : null;
  let moneyBy = /** @type {Record<string, number>} */ ({});
  try {
    if (round.gamePlayers.length && round.holeRecords.length) {
      moneyBy = computeRoundPayout(round.holeRecords, round.gamePlayers, round.stakesConfig);
    }
  } catch {
    moneyBy = Object.fromEntries(allIds.map((id) => [id, 0]));
  }

  const ov = round.receiptByPlayerId?.[playerId] ?? {};
  const moneyRaw =
    ov.money != null && Number.isFinite(Number(ov.money)) ? Number(ov.money) : Number(moneyBy[playerId] ?? 0) || 0;

  const holesFromStats = stats?.holesWonByPlayerId?.[playerId];
  const holesWon =
    ov.holesWon != null && Number.isFinite(Number(ov.holesWon)) ? Math.max(0, Math.round(Number(ov.holesWon))) : Math.max(0, Number(holesFromStats ?? 0) || 0);

  const nHoles = round.holeRecords.length || 18;
  let record = typeof ov.record === "string" && ov.record.trim() ? ov.record.trim() : "";
  if (!record) {
    const losses = Math.max(0, nHoles - holesWon);
    record = `${holesWon}-${losses}`;
  }

  const scoreVsPar =
    (typeof ov.scoreVsPar === "string" && ov.scoreVsPar.trim() && ov.scoreVsPar.trim()) ||
    (typeof round.scoreVsParByPlayerId?.[playerId] === "string" && String(round.scoreVsParByPlayerId[playerId]).trim()) ||
    "N/A";

  let receiptNumber =
    (typeof ov.receiptNumber === "string" && ov.receiptNumber.trim() && ov.receiptNumber.trim()) ||
    (typeof round.receiptNumberByPlayerId?.[playerId] === "string" && String(round.receiptNumberByPlayerId[playerId]).trim()) ||
    "";
  if (!receiptNumber) {
    const idx = round.gamePlayers.find((p) => p.id === playerId)?.slotIndex ?? 0;
    receiptNumber = `#${String(idx + 1).padStart(3, "0")}`;
  }

  const wolfPoints = stats?.wolfPointsByPlayerId?.[playerId] ?? 0;
  const maxWolfPts = allIds.length && stats ? Math.max(...allIds.map((id) => Number(stats.wolfPointsByPlayerId[id] ?? 0))) : 0;

  return {
    moneyRaw,
    holesWon,
    record,
    scoreVsPar,
    receiptNumber,
    wolfPoints,
    maxWolfPts,
    stats,
    hideDollar: Boolean(round.stakesConfig?.hideDollarAmounts),
  };
}

/**
 * @param {{
 *   moneyRaw: number
 *   holesWon: number
 *   wolfPoints: number
 *   maxWolfPts: number
 * }} core
 */
function pickWinCopy(core) {
  if (core.moneyRaw >= 280 && core.holesWon >= 6) {
    return {
      headlineTop: "BUILT",
      headlineBottom: "DIFFERENT",
      subheadline: "CASHED EVERYBODY OUT.",
      nameSubline: "LEFT WITH THE MONEY.",
      badge1: "BUILT DIFFERENT",
      badge2: "CASHED OUT",
      badge3: "NO FREE HOLES",
      badgeTitle: "WOLF KING",
      badgeStatus: "PAID",
    };
  }
  if (core.moneyRaw >= 150 || core.holesWon >= 5) {
    return {
      headlineTop: "FULL",
      headlineBottom: "SEND",
      subheadline: "THE TABLE PAID.",
      nameSubline: "MONEY ON REPEAT.",
      badge1: "MONEY TEAM",
      badge2: "HOLE HUNTER",
      badge3: "NO CHARITY",
      badgeTitle: core.wolfPoints >= core.maxWolfPts && core.maxWolfPts > 0 ? "WOLF KING" : "ROUND BOSS",
      badgeStatus: "PAID",
    };
  }
  if (core.moneyRaw > 0 || core.holesWon >= 3) {
    return {
      headlineTop: "CASHED",
      headlineBottom: "OUT",
      subheadline: "PAID IN FULL.",
      nameSubline: "WALKED WITH BAGS.",
      badge1: "GREEN LIGHT",
      badge2: "SILENT HUNTER",
      badge3: "FINISHED",
      badgeTitle: "WOLF KING",
      badgeStatus: "PAID",
    };
  }
  return {
    headlineTop: "STEADY",
    headlineBottom: "PAID",
    subheadline: "NO DRAMA. JUST PLUS.",
    nameSubline: "BOOKED THE W.",
    badge1: "EVEN KEEL",
    badge2: "NO MISTAKES",
    badge3: "CLOSED",
    badgeTitle: "TABLE LEGEND",
    badgeStatus: "PAID",
  };
}

/**
 * @param {{
 *   moneyRaw: number
 *   holesWon: number
 * }} core
 */
function pickLossCopy(core) {
  if (core.moneyRaw <= -200) {
    return {
      headlineTop: "DOWN",
      headlineBottom: "BAD",
      subheadline: "COULDN'T HANG.",
      nameSubline: "NEVER HAD A CHANCE.",
      badge1: "OUTPLAYED OUTWORKED",
      badge2: "DOWN BAD ALL ROUND",
      badge3: "PRESS MERCHANT",
      badgeTitle: "WOLF QUEEN",
      badgeStatus: "OUTPLAYED",
    };
  }
  if (core.moneyRaw <= -120) {
    return {
      headlineTop: "BLEW",
      headlineBottom: "OUT",
      subheadline: "THE MATH DID NOT MISS.",
      nameSubline: "PAID TUITION TODAY.",
      badge1: "FADED LATE",
      badge2: "NO ANSWERS",
      badge3: "QUIET CART",
      badgeTitle: "MARKED",
      badgeStatus: "OUTPLAYED",
    };
  }
  if (core.moneyRaw < 0 || core.holesWon <= 4) {
    return {
      headlineTop: "SHORT",
      headlineBottom: "PAID",
      subheadline: "THE ROOM REMEMBERS.",
      nameSubline: "LEFT ON READ.",
      badge1: "OUTWORKED",
      badge2: "NO COVER",
      badge3: "TAGGED",
      badgeTitle: "ROUND MARK",
      badgeStatus: "OUTPLAYED",
    };
  }
  return {
    headlineTop: "FLAT",
    headlineBottom: "ROUND",
    subheadline: "NEVER GOT HOT.",
    nameSubline: "NEUTRAL DAMAGE.",
    badge1: "MID OFF",
    badge2: "NO SPARK",
    badge3: "RESET",
    badgeTitle: "FIELD PLAYER",
    badgeStatus: "HELD",
  };
}

/**
 * @param {RoundForReceipt} round
 * @param {GamePlayer | null | undefined} player
 * @param {"loss" | "win"} receiptType
 * @returns {Record<string, string>}
 */
export function buildReceiptTemplateFromRound(round, player, receiptType) {
  const R = normalizeRound(round);
  const p = resolvePlayer(R, player);
  const kind = receiptType === "win" ? "win" : "loss";
  const core = resolveReceiptCore(R, p.id);
  const moneyStr = formatMoney(core.moneyRaw, core.hideDollar);
  const qrUrl =
    (typeof R.qrUrl === "string" && R.qrUrl.trim()) ||
    (typeof window !== "undefined" ? `${window.location.origin}/receipt-lab` : "https://thecard.local/receipt-lab");

  if (kind === "win") {
    const voice = pickWinCopy(core);
    return {
      ...DEFAULT_WIN_TEMPLATE,
      ...voice,
      playerName: displayNameUpper(p.name),
      receiptNumber: core.receiptNumber,
      topLabel: "ROUND HERO",
      roleLabel: "ROUND HERO",
      money: moneyStr,
      scoreVsPar: core.scoreVsPar,
      holesWon: String(core.holesWon),
      record: core.record,
      qrUrl,
    };
  }

  const voice = pickLossCopy(core);
  return {
    ...DEFAULT_DOWN_BAD_TEMPLATE,
    ...voice,
    playerName: displayNameUpper(p.name),
    receiptNumber: core.receiptNumber,
    topLabel: "ROUND VILLAIN",
    roleLabel: "ROUND VILLAIN",
    money: moneyStr,
    scoreVsPar: core.scoreVsPar,
    holesWon: String(core.holesWon),
    record: core.record,
    qrUrl,
  };
}
