import { computePointsAwarded, winningPlayerIdsForRecord } from "./scoring.js";

/**
 * Valid `HoleRecord` list used only for **non-Wolf** placeholder rounds so payouts,
 * receipts, and recap stay on the existing pipeline until true format scoring exists.
 * Every hole is a halved Lone Wolf (0 pts) with rotating wolf for bookkeeping symmetry.
 *
 * @param {import('./types.js').GamePlayer[]} gamePlayers
 * @param {number} [holeCount]
 * @returns {import('./types.js').HoleRecord[]}
 */
export function buildFormatPlaceholderHoleRecords(gamePlayers, holeCount = 18) {
  const ids = gamePlayers.map((p) => p.id).filter(Boolean);
  if (ids.length !== 4) return [];

  const out = [];
  for (let i = 0; i < holeCount; i++) {
    const holeNumber = i + 1;
    const wolfPlayerId = ids[i % 4];
    const raw = {
      holeNumber,
      wolfPlayerId,
      holeMode: /** @type {const} */ ("lone"),
      partnerPlayerId: null,
      winningSide: /** @type {const} */ ("tie"),
    };
    const pointsAwardedByPlayerId = computePointsAwarded(raw, ids);
    const winningPlayerIds = winningPlayerIdsForRecord({ ...raw, pointsAwardedByPlayerId }, ids);
    out.push({
      ...raw,
      pointsAwardedByPlayerId,
      winningPlayerIds,
      holeOutcomeLabel: `Placeholder shell · H${holeNumber}`,
    });
  }
  return out;
}
