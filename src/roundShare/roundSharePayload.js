/**
 * @typedef {import('../game/types.js').GamePlayer} GamePlayer
 * @typedef {import('../game/types.js').HoleRecord} HoleRecord
 */

/**
 * Public round snapshot (Share Round) — v1, JSON-serializable, no images/blobs.
 * @typedef {{
 *   v: 1
 *   id: string
 *   courseName: string
 *   selectedTee: string
 *   gamePlayers: GamePlayer[]
 *   holeRecords: HoleRecord[]
 *   currentHole: number
 *   roundStatus: 'idle' | 'playing' | 'complete'
 *   wolfOrder: string[] | null
 *   selectedWolfOverride: { hole: number, playerId: string } | null
 *   savedAt: number
 * }} RoundSharePayloadV1
 */

/**
 * @param {Omit<RoundSharePayloadV1, 'v' | 'savedAt' | 'id'> & { id: string }} p
 * @returns {RoundSharePayloadV1}
 */
export function buildRoundShareSnapshot(p) {
  return {
    v: 1,
    id: p.id,
    courseName: p.courseName,
    selectedTee: p.selectedTee,
    gamePlayers: p.gamePlayers,
    holeRecords: p.holeRecords,
    currentHole: p.currentHole,
    roundStatus: p.roundStatus,
    wolfOrder: p.wolfOrder,
    selectedWolfOverride: p.selectedWolfOverride,
    savedAt: Date.now(),
  };
}

/**
 * @param {unknown} p
 * @returns {p is RoundSharePayloadV1}
 */
export function isValidRoundSharePayload(p) {
  if (!p || typeof p !== "object") return false;
  const o = /** @type {Record<string, unknown>} */ (p);
  if (o.v !== 1) return false;
  if (typeof o.id !== "string" || o.id.length < 8) return false;
  if (typeof o.courseName !== "string" || typeof o.selectedTee !== "string") return false;
  if (!Array.isArray(o.gamePlayers) || o.gamePlayers.length !== 4) return false;
  for (const pl of o.gamePlayers) {
    if (!pl || typeof pl !== "object") return false;
    const g = /** @type {{ id?: unknown, name?: unknown, slotIndex?: unknown }} */ (pl);
    if (typeof g.id !== "string" || typeof g.name !== "string" || typeof g.slotIndex !== "number") return false;
  }
  if (!Array.isArray(o.holeRecords)) return false;
  if (typeof o.currentHole !== "number" || o.currentHole < 1) return false;
  if (o.roundStatus !== "idle" && o.roundStatus !== "playing" && o.roundStatus !== "complete") return false;
  if (o.wolfOrder != null && !Array.isArray(o.wolfOrder)) return false;
  if (o.selectedWolfOverride != null) {
    const t = o.selectedWolfOverride;
    if (typeof t !== "object" || t === null) return false;
    if (typeof /** @type {{ hole: unknown, playerId: unknown }} */ (t).hole !== "number") return false;
    if (typeof /** @type {{ playerId: unknown }} */ (t).playerId !== "string") return false;
  }
  return true;
}
