/**
 * Nassau aggregate (placeholder).
 *
 * @param {import('../types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 */
export function calculateNassauRound(holeRecords, allPlayerIds) {
  return {
    formatId: /** @type {const} */ ("nassau"),
    placeholder: true,
    holeCount: holeRecords.length,
    playerIds: [...allPlayerIds],
    summary: "Front / back / total splits will be calculated here.",
  };
}
