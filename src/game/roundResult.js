/**
 * Round outcomes for **receipts, money, and badges** — never used by Elo.
 *
 * @module
 */

import { playerOnSide, pressAffectedPlayerIds } from "./scoring.js";

const emptyStats = () => ({ initiated: 0, won: 0, lost: 0, holesWithPress: 0 });

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 * @returns {{ byPlayerId: Record<string, import('./types.js').PressPlayerStats>, totalPresses: number }}
 */
export function aggregatePressStatsForBadges(holeRecords, allPlayerIds) {
  /** @type {Record<string, import('./types.js').PressPlayerStats>} */
  const byPlayerId = Object.fromEntries(allPlayerIds.map((id) => [id, emptyStats()]));
  let totalPresses = 0;

  for (const h of holeRecords) {
    const onHole = new Set();
    for (const pr of h.presses ?? []) {
      totalPresses += 1;
      if (byPlayerId[pr.initiatorPlayerId]) {
        byPlayerId[pr.initiatorPlayerId].initiated += 1;
      }
      for (const pid of pressAffectedPlayerIds(pr)) {
        if (!byPlayerId[pid]) continue;
        onHole.add(pid);
        if (pr.pressWinningSide === "tie") continue;
        const w = playerOnSide(h, pid, pr.pressWinningSide, allPlayerIds);
        if (w) byPlayerId[pid].won += 1;
        else byPlayerId[pid].lost += 1;
      }
    }
    for (const pid of onHole) {
      if (byPlayerId[pid]) byPlayerId[pid].holesWithPress += 1;
    }
  }

  return { byPlayerId, totalPresses };
}

/**
 * @param {import('./types.js').GamePlayer[]} players
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {{ roundId?: string, moneyByPlayerId?: Record<string, number> | null }} [opts]
 * @returns {import('./types.js').RoundResult}
 */
export function buildRoundResult(players, holeRecords, opts = {}) {
  const allIds = players.map((p) => p.id);
  return {
    roundId: opts.roundId ?? "local",
    gamePlayerIds: allIds,
    holeCount: holeRecords.length,
    holeRecords,
    pressStats: aggregatePressStatsForBadges(holeRecords, allIds),
    moneyByPlayerId: opts.moneyByPlayerId ?? null,
  };
}

/**
 * Lightweight tag hints for share/receipt — **not** persisted here.
 * @param {import('./types.js').RoundResult} round
 * @returns {{ id: string, playerId?: string, label: string }[]}
 */
export function suggestPressBadgeHints(round) {
  const { byPlayerId, totalPresses } = round.pressStats;
  const { holeCount } = round;
  const hints = [];

  if (totalPresses < 1) return hints;

  const entries = Object.entries(byPlayerId);
  let mostInit = /** @type {{ id: string, s: import('./types.js').PressPlayerStats } | null} */ (null);
  for (const [id, s] of entries) {
    if (!mostInit || s.initiated > mostInit.s.initiated) mostInit = { id, s };
  }
  if (mostInit && mostInit.s.initiated >= 2) {
    hints.push({ id: "press-merchant", playerId: mostInit.id, label: "Press merchant" });
  }

  for (const [pid, s] of entries) {
    if (holeCount > 0 && s.holesWithPress === holeCount) {
      hints.push({ id: "pressed-every-hole", playerId: pid, label: "Pressed every hole" });
    }
    if (s.lost >= 2 && s.lost > s.won) {
      hints.push({ id: "down-bad", playerId: pid, label: "Down bad (presses)" });
    }
  }

  return hints;
}
