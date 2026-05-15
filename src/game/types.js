/**
 * @typedef {`p-${0|1|2|3}`} PlayerId
 */

/**
 * @typedef {'stroke' | 'match' | 'skins' | 'nassau' | 'wolf'} RoundFormatId
 */

/** @typedef {'normal' | 'lone' | 'blind'} HoleMode */

/**
 * Which side won the hole (Wolf scoring).
 * @typedef {'wolf_side' | 'opponent_side' | 'tie'} HoleWinningSide
 */

/**
 * Press = drama / **money** / receipt layer — not Elo, not a separate “match” for skill rating.
 * `units` may mirror stake steps for the Receipt; it must never be read by `elo.js`.
 *
 * @typedef {{
 *   id: string
 *   initiatorPlayerId: string
 *   counterpartyPlayerIds: string[]
 *   units: 1 | 2 | 3
 *   backedSide: HoleWinningSide
 *   pressWinningSide: HoleWinningSide
 * }} PressEvent
 */

/**
 * @typedef {{
 *   playerId: string
 *   rating: number
 *   gamesPlayed?: number
 * }} PlayerEloState
 */

/**
 * Snapshot after one round (skill only) — for persistence / sync.
 * @typedef {{
 *   byPlayerId: Record<string, { playerId: string, ratingBefore: number, ratingAfter: number, deltaTotal: number, deltaPairwise: number, deltaLoneWolf: number }>
 *   meta: { assumptions: string[] }
 * }} RoundEloUpdate
 */

/**
 * Per-player press patterns for **badges / narrative** (not Elo).
 * @typedef {{
 *   initiated: number
 *   won: number
 *   lost: number
 *   holesWithPress: number
 * }} PressPlayerStats
 */

/**
 * Bundles competitive history + **social** stats for receipts (money optional, never used in Elo).
 * @typedef {{
 *   roundId: string
 *   gamePlayerIds: string[]
 *   holeCount: number
 *   holeRecords: HoleRecord[]
 *   pressStats: { byPlayerId: Record<string, PressPlayerStats>, totalPresses: number }
 *   moneyByPlayerId?: Record<string, number> | null
 *   roundFormat?: RoundFormatId
 * }} RoundResult
 */

/**
 * Immutable record for one hole — receipts, standings, optional presses (never Elo inputs for presses).
 * - `holeMode === "blind" | "lone"` ⇒ `partnerPlayerId` must be null.
 * - `holeMode === "normal"` with no partner should not be submitted (convert to lone first).
 *
 * @typedef {{
 *   holeNumber: number
 *   wolfPlayerId: string
 *   holeMode: HoleMode
 *   partnerPlayerId: string | null
 *   winningSide: HoleWinningSide
 *   pointsAwardedByPlayerId: Record<string, number>
 *   winningPlayerIds: string[]
 *   holeOutcomeLabel?: string
 *   presses?: PressEvent[]
 *   strokeGrossByPlayerId?: Record<string, number>
 *   strokePar?: number
 * }} HoleRecord
 */

/**
 * @typedef {{
 *   id: string
 *   slotIndex: number
 *   name: string
 * }} GamePlayer
 */

/**
 * @typedef {{
 *   wolfPointsByPlayerId: Record<string, number>
 *   holesWonByPlayerId: Record<string, number>
 *   blindWolfAttempts: number
 *   blindWolfWins: number
 *   loneWolfAttempts: number
 *   loneWolfWins: number
 *   partnerSelections: number
 * }} WolfRoundStats
 */

export const SLOT_COUNT = 4;

/** Stable slot ids for a 4-player Wolf game. */
export const SLOT_PLAYER_IDS = /** @type {const} */ (["p-0", "p-1", "p-2", "p-3"]);

/** Last playable hole (Season One). Rounds must not advance beyond this. */
export const MAX_PLAYABLE_HOLE = 18;
