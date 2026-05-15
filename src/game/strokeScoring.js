/**
 * Stroke play: gross per hole on `HoleRecord` (optional `strokeGrossByPlayerId` / `strokePar`).
 * Wolf-shaped fields stay neutral (ties, zero points) so Wolf-only pipelines stay safe.
 * @module
 */

import { computePointsAwarded, winningPlayerIdsForRecord } from "./scoring.js";

/** Default par when no course data (Season One). */
export const DEFAULT_STROKE_PAR = 4;

/**
 * @param {number} holeNumber
 * @param {Record<string, number>} strokeGrossByPlayerId
 * @param {number} strokePar
 * @param {string[]} allIds
 * @returns {import('./types.js').HoleRecord}
 */
export function buildStrokeHoleRecord(holeNumber, strokeGrossByPlayerId, strokePar, allIds) {
  const gross = /** @type {Record<string, number>} */ ({});
  for (const id of allIds) {
    const v = strokeGrossByPlayerId[id];
    gross[id] = Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  }
  const anchor = allIds[0] ?? "p-0";
  const shell = {
    holeNumber,
    wolfPlayerId: anchor,
    holeMode: /** @type {const} */ ("lone"),
    partnerPlayerId: null,
    winningSide: /** @type {const} */ ("tie"),
    pointsAwardedByPlayerId: {},
    winningPlayerIds: /** @type {string[]} */ ([]),
    strokeGrossByPlayerId: gross,
    strokePar,
    holeOutcomeLabel: `Stroke · H${holeNumber}`,
  };
  const pointsAwardedByPlayerId = computePointsAwarded(shell, allIds);
  const winningPlayerIds = winningPlayerIdsForRecord({ ...shell, pointsAwardedByPlayerId }, allIds);
  return { ...shell, pointsAwardedByPlayerId, winningPlayerIds };
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @returns {Record<string, number>}
 */
export function aggregateStrokeGrossTotals(holeRecords) {
  /** @type {Record<string, number>} */
  const totals = {};
  for (const h of holeRecords) {
    if (!h.strokeGrossByPlayerId) continue;
    for (const [id, raw] of Object.entries(h.strokeGrossByPlayerId)) {
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      totals[id] = (totals[id] ?? 0) + v;
    }
  }
  return totals;
}

/**
 * @param {import('./types.js').GamePlayer[]} gamePlayers
 * @param {Record<string, number>} totals
 */
export function rankStrokeGrossAscending(gamePlayers, totals) {
  return [...gamePlayers]
    .map((p) => ({ ...p, gross: totals[p.id] ?? 0 }))
    .sort((a, b) => a.gross - b.gross || a.slotIndex - b.slotIndex);
}

/**
 * Strokes between winner (lowest gross) and next unique score; 0 if tied for first.
 * @param {{ gross: number }[]} sortedAsc from `rankStrokeGrossAscending`
 */
export function strokeVictoryMargin(sortedAsc) {
  if (sortedAsc.length < 2) return 0;
  const best = sortedAsc[0].gross;
  const runner = sortedAsc.find((p) => p.gross > best);
  return runner ? runner.gross - best : 0;
}

/**
 * Rotates three licensed stroke headlines; `SHOT n` uses the hero player's gross.
 * @param {string} playerId
 * @param {number} gross
 */
export function pickStrokeReceiptHeadline(playerId, gross) {
  const lines = [
    "LOWEST NUMBER. LOUDEST RECEIPT.",
    `SHOT ${gross}. MADE THEM SIGN THE CARD.`,
    "NO MATCHES. NO EXCUSES. JUST SCORE.",
  ];
  let h = 0;
  const s = String(playerId ?? "p-0");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return lines[h % lines.length];
}
