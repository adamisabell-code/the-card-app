import { normalizeRoundFormat } from "../game/gameFormats.js";

/**
 * Persist completed Wolf rounds for Rounds tab + recap replay (localStorage only).
 * @module
 */

const ROUNDS_KEY = "the-card-completed-rounds-v1";

/**
 * @typedef {{
 *   id: string
 *   savedAt: number
 *   players: import('../game/types.js').GamePlayer[]
 *   holeRecords: import('../game/types.js').HoleRecord[]
 *   roundFormat?: import('../game/gameFormats.js').RoundFormatId
 * }} StoredCompletedRound
 */

/**
 * @returns {StoredCompletedRound[]}
 */
export function loadCompletedRounds() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROUNDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && typeof r.id === "string" && Array.isArray(r.holeRecords) && Array.isArray(r.players))
      .map((r) => ({
        id: r.id,
        savedAt: typeof r.savedAt === "number" ? r.savedAt : 0,
        players: r.players,
        holeRecords: r.holeRecords,
        roundFormat: normalizeRoundFormat(r.roundFormat),
      }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/**
 * @param {import('../game/types.js').GamePlayer[]} gamePlayers
 * @param {import('../game/types.js').HoleRecord[]} holeRecords
 * @param {import('../game/gameFormats.js').RoundFormatId} [roundFormat]
 */
export function appendCompletedRound(gamePlayers, holeRecords, roundFormat = "wolf") {
  if (typeof localStorage === "undefined") return;
  if (gamePlayers.length !== 4 || holeRecords.length === 0) return;
  try {
    const prev = loadCompletedRounds();
    const entry = {
      id: `round-${Date.now()}`,
      savedAt: Date.now(),
      players: gamePlayers.map((p) => ({ id: p.id, name: p.name, slotIndex: p.slotIndex })),
      holeRecords: JSON.parse(JSON.stringify(holeRecords)),
      roundFormat: normalizeRoundFormat(roundFormat),
    };
    const next = [entry, ...prev].slice(0, 24);
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
