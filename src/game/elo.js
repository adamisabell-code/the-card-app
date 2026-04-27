/**
 * Elo (skill) — competitive performance only.
 *
 * Excluded: money, press count, bet sizing, and badges. See `roundResult.js` for social/receipt data.
 *
 * - Round = multi-way contest; we use **pairwise** outcomes (hole-by-hole: beat / lose / same side).
 * - `S_ij` in [0,1] = (wins + 0.5×ties) / holes.
 * - Standard Elo: `E_ij = 1 / (1 + 10^((R_j - R_i)/400))` per pair; one symmetric update per unordered pair.
 * - **Lone Wolf** small nudge (capped) for designated wolf only; no press inputs.
 *
 * @module
 */

import { winningPlayerIdsForRecord } from "./scoring.js";

export const DEFAULT_ELO = 1500;

export const DEFAULT_K_PER_PAIR = 5.5;

export const LONE_WOLF_WIN_ELO = 0.2;
export const LONE_WOLF_LOSS_ELO = -0.16;
const LONE_ELO_MAX_MAG = 0.85;

/**
 * @param {number} ra
 * @param {number} rb
 */
function expected(ra, rb) {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/**
 * @param {import('./types.js').HoleRecord} hole
 * @param {string} playerId
 * @param {string[]} allIds
 */
function onWinningSide(hole, playerId, allIds) {
  return winningPlayerIdsForRecord(hole, allIds).includes(playerId);
}

/**
 * S_ij: i's share of outcomes vs j across the round, in [0,1].
 * @param {string} i
 * @param {string} j
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {string[]} allIds
 */
export function pairwiseOutcomeScore(i, j, holeRecords, allIds) {
  if (i === j) return 0.5;
  let aBeatsB = 0;
  let same = 0;
  for (const h of holeRecords) {
    const aWon = onWinningSide(h, i, allIds);
    const bWon = onWinningSide(h, j, allIds);
    if (aWon && !bWon) aBeatsB += 1;
    else if (!aWon && bWon) { /* b beat a on this hole */ }
    else same += 1;
  }
  const H = holeRecords.length;
  if (H === 0) return 0.5;
  return (aBeatsB + 0.5 * same) / H;
}

/**
 * Cumulative small Lone Wolf seats-only adjustment (capped in magnitude per player for the round).
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {string[]} allIds
 * @returns {Record<string, number>}
 */
function loneWolfDeltas(holeRecords, allIds) {
  /** @type {Record<string, number>} */
  const raw = Object.fromEntries(allIds.map((id) => [id, 0]));
  for (const h of holeRecords) {
    if (h.holeMode !== "lone" && h.holeMode !== "blind") continue;
    if (h.winningSide === "tie") continue;
    if (h.winningSide === "wolf_side") {
      raw[h.wolfPlayerId] += LONE_WOLF_WIN_ELO;
    } else if (h.winningSide === "opponent_side") {
      raw[h.wolfPlayerId] += LONE_WOLF_LOSS_ELO;
    }
  }
  for (const id of allIds) {
    raw[id] = Math.max(-LONE_ELO_MAX_MAG, Math.min(LONE_ELO_MAX_MAG, raw[id] ?? 0));
  }
  return raw;
}

/**
 * @param {import('./types.js').GamePlayer[]} players
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {{ preRoundEloByPlayerId?: Record<string, number>, kPerPair?: number }} [options]
 * @returns {import('./types.js').RoundEloUpdate}
 */
export function computeRoundEloUpdate(players, holeRecords, options = {}) {
  const allIds = players.map((p) => p.id);
  const k = options.kPerPair ?? DEFAULT_K_PER_PAIR;
  const rating = {};
  for (const p of players) {
    rating[p.id] = options.preRoundEloByPlayerId?.[p.id] ?? DEFAULT_ELO;
  }

  const assumptions = [
    "Elo uses pairwise hole results vs standard expected score; money and presses never enter this module.",
    "Lone Wolf and Blind Wolf add a small capped nudge to the designated wolf for 1v3 holes only; partner Wolf uses pairwise outcomes only.",
    "Press count, bet size, and badges are excluded — see roundResult.aggregatePressStatsForBadges.",
  ];

  /** @type {Record<string, number>} */
  const deltaP = Object.fromEntries(allIds.map((id) => [id, 0]));

  if (holeRecords.length > 0) {
    for (let a = 0; a < allIds.length; a++) {
      for (let b = a + 1; b < allIds.length; b++) {
        const i = allIds[a];
        const j = allIds[b];
        const Ri = rating[i];
        const Rj = rating[j];
        const sIJ = pairwiseOutcomeScore(i, j, holeRecords, allIds);
        const sJI = 1 - sIJ;
        const eIJ = expected(Ri, Rj);
        const eJI = expected(Rj, Ri);
        const diffI = sIJ - eIJ;
        const diffJ = sJI - eJI;
        deltaP[i] += k * diffI;
        deltaP[j] += k * diffJ;
      }
    }
  }

  const loneD = loneWolfDeltas(holeRecords, allIds);

  /** @type {Record<string, { playerId: string, ratingBefore: number, ratingAfter: number, deltaTotal: number, deltaPairwise: number, deltaLoneWolf: number }>} */
  const byPlayerId = {};
  for (const id of allIds) {
    const dP = deltaP[id] ?? 0;
    const dL = holeRecords.length > 0 ? loneD[id] ?? 0 : 0;
    const rb = rating[id];
    const dTot = dP + dL;
    const ra = Math.round((rb + dTot) * 10) / 10;
    byPlayerId[id] = {
      playerId: id,
      ratingBefore: Math.round(rb * 10) / 10,
      ratingAfter: ra,
      deltaTotal: Math.round(dTot * 10) / 10,
      deltaPairwise: Math.round(dP * 10) / 10,
      deltaLoneWolf: Math.round(dL * 10) / 10,
    };
  }

  return { byPlayerId, meta: { assumptions } };
}
