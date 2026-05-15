import { normalizeRoundFormat } from "../gameFormats.js";
import { calculateStrokeRound } from "./calculateStrokeRound.js";
import { calculateMatchRound } from "./calculateMatchRound.js";
import { calculateSkinsRound } from "./calculateSkinsRound.js";
import { calculateNassauRound } from "./calculateNassauRound.js";
import { calculateWolfRound } from "./calculateWolfRound.js";

/**
 * Route hole records to the correct format calculator (Wolf + Stroke live; other formats placeholder).
 *
 * @param {unknown} formatId
 * @param {import('../types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 */
export function calculateRoundForFormat(formatId, holeRecords, allPlayerIds) {
  const id = normalizeRoundFormat(formatId);
  switch (id) {
    case "stroke":
      return calculateStrokeRound(holeRecords, allPlayerIds);
    case "match":
      return calculateMatchRound(holeRecords, allPlayerIds);
    case "skins":
      return calculateSkinsRound(holeRecords, allPlayerIds);
    case "nassau":
      return calculateNassauRound(holeRecords, allPlayerIds);
    case "wolf":
    default:
      return calculateWolfRound(holeRecords, allPlayerIds);
  }
}
