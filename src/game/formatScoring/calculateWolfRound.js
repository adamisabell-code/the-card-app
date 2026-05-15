import { aggregateWolfRoundStats } from "../scoring.js";

/**
 * Wolf round scoring — wraps existing `aggregateWolfRoundStats`.
 *
 * @param {import('../types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 */
export function calculateWolfRound(holeRecords, allPlayerIds) {
  const stats = aggregateWolfRoundStats(holeRecords, allPlayerIds);
  return {
    formatId: /** @type {const} */ ("wolf"),
    stats,
    /** True once hole-by-hole Wolf UI is the source of truth (not a placeholder shell). */
    isLiveWolfScoring: true,
  };
}
