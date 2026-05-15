import { aggregateStrokeGrossTotals } from "../strokeScoring.js";

/**
 * Stroke play totals from gross scorecard holes.
 *
 * @param {import('../types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 */
export function calculateStrokeRound(holeRecords, allPlayerIds) {
  const totals = aggregateStrokeGrossTotals(holeRecords);
  const sorted = [...allPlayerIds].sort((a, b) => (totals[a] ?? 9999) - (totals[b] ?? 9999));
  const bestId = sorted[0];
  const secondId = sorted[1];
  const margin =
    secondId != null && bestId != null && (totals[secondId] ?? 0) > (totals[bestId] ?? 0)
      ? (totals[secondId] ?? 0) - (totals[bestId] ?? 0)
      : 0;
  return {
    formatId: /** @type {const} */ ("stroke"),
    placeholder: false,
    holeCount: holeRecords.length,
    playerIds: [...allPlayerIds],
    totalsByPlayerId: totals,
    leaderPlayerId: bestId ?? null,
    victoryMargin: margin,
    summary: "Gross stroke play — lowest total wins.",
  };
}
