/**
 * Fixed Wolf order (first pick + shuffled remainder) and holes 17–18 “lowest Wolf points” override.
 * Scoring rules unchanged — only who is Wolf per hole.
 */

import { aggregateWolfRoundStats } from "./scoring.js";

/**
 * Fisher–Yates shuffle (in-place).
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/**
 * @param {string} firstWolfPlayerId
 * @param {string[]} allPlayerIds four unique ids
 * @returns {string[]} length 4 — first is fixed, remaining three shuffled
 */
export function buildWolfOrderAfterFirstPick(firstWolfPlayerId, allPlayerIds) {
  const rest = allPlayerIds.filter((id) => id !== firstWolfPlayerId);
  shuffleInPlace(rest);
  return [firstWolfPlayerId, ...rest];
}

/**
 * All player ids tied for the minimum cumulative Wolf points (holes completed so far).
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 * @returns {string[]}
 */
export function getTiedLowestWolfPointPlayerIds(holeRecords, allPlayerIds) {
  if (!allPlayerIds.length) return [];
  const stats = aggregateWolfRoundStats(holeRecords, allPlayerIds);
  const wp = stats.wolfPointsByPlayerId;
  const min = Math.min(...allPlayerIds.map((id) => wp[id] ?? 0));
  return allPlayerIds.filter((id) => (wp[id] ?? 0) === min);
}

/**
 * @param {{
 *   holeNumber: number
 *   wolfOrder: string[] | null
 *   holeRecords: import('./types.js').HoleRecord[]
 *   allPlayerIds: string[]
 *   resolvedLowWolfPlayerId?: string | null
 * }} ctx
 * @returns {string | null}
 */
export function getAssignedWolfPlayerId(ctx) {
  const { holeNumber, wolfOrder, holeRecords, allPlayerIds, resolvedLowWolfPlayerId = null } = ctx;
  if (!wolfOrder?.length) return null;
  if (holeNumber === 17 || holeNumber === 18) {
    return resolvedLowWolfPlayerId ?? null;
  }
  const idx = (holeNumber - 1) % 4;
  return wolfOrder[idx] ?? null;
}
