/**
 * Skins aggregate (placeholder).
 *
 * @param {import('../types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 */
export function calculateSkinsRound(holeRecords, allPlayerIds) {
  return {
    formatId: /** @type {const} */ ("skins"),
    placeholder: true,
    holeCount: holeRecords.length,
    playerIds: [...allPlayerIds],
    summary: "Carryovers and skin ledger will land in a future update.",
  };
}
