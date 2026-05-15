/**
 * Match play aggregate (placeholder).
 *
 * @param {import('../types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 */
export function calculateMatchRound(holeRecords, allPlayerIds) {
  return {
    formatId: /** @type {const} */ ("match"),
    placeholder: true,
    holeCount: holeRecords.length,
    playerIds: [...allPlayerIds],
    summary: "Match status (dormie, closed holes) will plug in here.",
  };
}
