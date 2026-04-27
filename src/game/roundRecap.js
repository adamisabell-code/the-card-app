/**
 * End-of-round shareable cards + round history (derived from `HoleRecord` list).
 * Play stays fast; recap is for after the last hole.
 */

import { buildHoleReceiptPreview, buildRoundHistoryEntry } from "./holeReceiptPreview.js";
import { aggregateWolfRoundStats, computePointsAwarded, winningPlayerIdsForRecord } from "./scoring.js";

const HISTORY_KEY = "the-card-round-history-v1";

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {import('./types.js').GamePlayer[]} gamePlayers
 * @returns {ReturnType<typeof buildRoundHistoryEntry>[]}
 */
export function enrichFullRoundHistory(holeRecords, gamePlayers) {
  return holeRecords.map((h) => buildRoundHistoryEntry(h, gamePlayers));
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {string[]} allIds
 * @returns {{ record: import('./types.js').HoleRecord, playerId: string, pts: number } | null}
 */
function pickBestMoment(holeRecords, allIds) {
  const blindWins = holeRecords.filter((h) => h.holeMode === "blind" && h.winningSide === "wolf_side");
  if (blindWins.length) {
    const h = blindWins.sort((a, b) => b.holeNumber - a.holeNumber)[0];
    const pts = h.pointsAwardedByPlayerId?.[h.wolfPlayerId] ?? 3;
    return { record: h, playerId: h.wolfPlayerId, pts };
  }
  const loneWins = holeRecords.filter((h) => h.holeMode === "lone" && h.winningSide === "wolf_side");
  if (loneWins.length) {
    const h = loneWins.sort((a, b) => b.holeNumber - a.holeNumber)[0];
    const pts = h.pointsAwardedByPlayerId?.[h.wolfPlayerId] ?? 2;
    return { record: h, playerId: h.wolfPlayerId, pts };
  }
  /** @type {{ record: import('./types.js').HoleRecord, playerId: string, pts: number } | null} */
  let best = null;
  for (const h of holeRecords) {
    const ptsBy = h.pointsAwardedByPlayerId ?? computePointsAwarded(h, allIds);
    for (const id of allIds) {
      const pts = ptsBy[id] ?? 0;
      if (!best || pts > best.pts) {
        best = { record: h, playerId: id, pts };
      }
    }
  }
  return best;
}

/**
 * Wolf / Wolf+partner lost the hole (opponent_side).
 * @param {import('./types.js').HoleRecord} h
 */
function isWolfSideLoss(h) {
  return h.winningSide === "opponent_side";
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {string[]} allIds
 * @returns {import('./types.js').HoleRecord | null}
 */
function pickWorstBeatHole(holeRecords, allIds) {
  let worstPick = null;
  let maxPain = -1;
  for (const h of holeRecords) {
    if (!isWolfSideLoss(h)) continue;
    const pain = h.holeMode === "blind" ? 4 : h.holeMode === "lone" ? 3 : 2;
    if (pain > maxPain) {
      maxPain = pain;
      worstPick = h;
    } else if (pain === maxPain && worstPick && h.holeNumber > worstPick.holeNumber) {
      worstPick = h;
    }
  }
  if (worstPick) return worstPick;

  /** Biggest single-hole points swing (winner side total). */
  let bestSwing = -1;
  /** @type {import('./types.js').HoleRecord | null} */
  let swingHole = null;
  for (const h of holeRecords) {
    if (h.winningSide === "tie") continue;
    const pts = h.pointsAwardedByPlayerId ?? computePointsAwarded(h, allIds);
    const winners = h.winningPlayerIds?.length ? h.winningPlayerIds : winningPlayerIdsForRecord(h, allIds);
    const swing = winners.reduce((s, id) => s + (pts[id] ?? 0), 0);
    if (swing > bestSwing) {
      bestSwing = swing;
      swingHole = h;
    }
  }
  return swingHole;
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {import('./types.js').GamePlayer[]} gamePlayers
 * @param {Record<string, import('../portrait/types.js').PortraitBundle | null | undefined>} portraitByPlayerId
 */
export function buildRecapShareCards(holeRecords, gamePlayers, portraitByPlayerId = {}) {
  const allIds = gamePlayers.map((p) => p.id);
  const history = enrichFullRoundHistory(holeRecords, gamePlayers);
  const names = Object.fromEntries(gamePlayers.map((p) => [p.id, p.name]));
  const stats = aggregateWolfRoundStats(holeRecords, allIds);
  const wolfPts = stats.wolfPointsByPlayerId;

  const sortedByPts = [...gamePlayers]
    .map((p) => ({ ...p, wpts: wolfPts[p.id] ?? 0, holes: stats.holesWonByPlayerId[p.id] ?? 0 }))
    .sort((a, b) => b.wpts - a.wpts || b.holes - a.holes || a.slotIndex - b.slotIndex);

  const top = sortedByPts[0];
  const bottom = sortedByPts[sortedByPts.length - 1];
  const spread = top.wpts - bottom.wpts;

  const standingsBadges = sortedByPts.map((p, i) => `#${i + 1} ${p.name} · +${p.wpts} pts`);

  const finalStandings = {
    playerName: `${top.name} — round winner`,
    amountLabel: `+${top.wpts} Wolf pts · spread +${spread}`,
    stamp: "FINAL STANDINGS",
    badges: standingsBadges,
    portraitBundle: portraitByPlayerId[top.id] ?? null,
    portraitDisplayMode: "winner",
    layout: "default",
    aiFlavorText: "Final table when the last putt dropped.",
  };

  const bestPick = pickBestMoment(holeRecords, allIds);
  const bestPreview = bestPick ? buildHoleReceiptPreview(bestPick.record, gamePlayers) : null;
  const bestMoment = {
    playerName: bestPick ? names[bestPick.playerId] || "—" : "—",
    amountLabel: bestPick && bestPick.pts > 0 ? `+${bestPick.pts} on H${bestPick.record.holeNumber}` : "—",
    stamp: "BEST MOMENT",
    badges: bestPick
      ? [
          bestPick.record.holeMode === "blind"
            ? "Blind Wolf W"
            : bestPick.record.holeMode === "lone"
              ? "Lone Wolf W"
              : "Normal",
          `H${bestPick.record.holeNumber}`,
        ]
      : ["—"],
    portraitBundle: bestPick ? portraitByPlayerId[bestPick.playerId] ?? null : null,
    portraitDisplayMode: "winner",
    layout: "default",
    aiFlavorText: bestPreview?.aiFlavorText || "Biggest single-hole swing on the card.",
  };

  const worstPick = pickWorstBeatHole(holeRecords, allIds);

  let worstBeat;
  if (worstPick && isWolfSideLoss(worstPick)) {
    const wprev = buildHoleReceiptPreview(worstPick, gamePlayers);
    const wn = names[worstPick.wolfPlayerId] || "Wolf";
    worstBeat = {
      playerName: wn,
      amountLabel:
        worstPick.holeMode === "blind" ? "Blind Wolf L" : worstPick.holeMode === "lone" ? "Lone Wolf L" : "Hunters W",
      stamp: "WORST BEAT",
      badges: [`H${worstPick.holeNumber}`, worstPick.holeMode],
      portraitBundle: portraitByPlayerId[worstPick.wolfPlayerId] ?? null,
      portraitDisplayMode: "loser",
      layout: "default",
      aiFlavorText: wprev.aiFlavorText || "That one left a mark.",
    };
  } else if (worstPick) {
    const wprev = buildHoleReceiptPreview(worstPick, gamePlayers);
    const pts = worstPick.pointsAwardedByPlayerId ?? computePointsAwarded(worstPick, allIds);
    const winners = worstPick.winningPlayerIds?.length
      ? worstPick.winningPlayerIds
      : winningPlayerIdsForRecord(worstPick, allIds);
    const loserIds = allIds.filter((id) => !winners.includes(id));
    const victim =
      loserIds.find((id) => id === worstPick.wolfPlayerId) ||
      [...loserIds].sort((a, b) => (pts[a] ?? 0) - (pts[b] ?? 0))[0] ||
      allIds[0];
    worstBeat = {
      playerName: names[victim] || "—",
      amountLabel: `H${worstPick.holeNumber} · ${(pts[victim] ?? 0) > 0 ? `+${pts[victim]} pts` : "blanked on the swing"}`,
      stamp: "WORST BEAT",
      badges: [`H${worstPick.holeNumber}`, "Big swing"],
      portraitBundle: portraitByPlayerId[victim] ?? null,
      portraitDisplayMode: "loser",
      layout: "default",
      aiFlavorText: wprev.aiFlavorText || "Biggest payout hole of the round.",
    };
  } else {
    const lo = sortedByPts[sortedByPts.length - 1];
    worstBeat = {
      playerName: lo.name,
      amountLabel: `+${lo.wpts} Wolf pts`,
      stamp: "CHOKE",
      badges: ["Bottom of the table"],
      portraitBundle: portraitByPlayerId[lo.id] ?? null,
      portraitDisplayMode: "loser",
      layout: "default",
      aiFlavorText: "Quiet round on the number.",
    };
  }

  let pushCount = 0;
  for (const h of holeRecords) {
    if (h.winningSide === "tie") pushCount += 1;
  }

  const nHoles = holeRecords.length;
  const groupRecap = {
    playerName: "Austin Tee Party",
    amountLabel: `${nHoles} hole${nHoles === 1 ? "" : "s"} · spread +${spread}`,
    stamp: "GROUP RECAP",
    badges: [
      `Winner · ${top.name}`,
      `Blind ${stats.blindWolfAttempts} · ${stats.blindWolfWins}W`,
      `Lone ${stats.loneWolfAttempts} · ${stats.loneWolfWins}W`,
      `Push ${pushCount}`,
      "ROUND CLOSED",
      "RECEIPTS POSTED",
      "NO MORE TALK",
    ],
    portraitBundle: portraitByPlayerId["p-0"] ?? null,
    portraitDisplayMode: "neutral",
    layout: "default",
    aiFlavorText: "Run it back anytime.",
  };

  return { finalStandings, bestMoment, worstBeat, groupRecap, history };
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {import('./types.js').GamePlayer[]} gamePlayers
 * @param {string} [roundId]
 */
export function sessionRoundHistoryPayload(holeRecords, gamePlayers, roundId = "local") {
  return {
    version: 1,
    roundId,
    savedAt: Date.now(),
    players: gamePlayers.map((p) => ({ id: p.id, name: p.name, slotIndex: p.slotIndex })),
    holes: enrichFullRoundHistory(holeRecords, gamePlayers),
  };
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {import('./types.js').GamePlayer[]} gamePlayers
 */
export function persistRoundHistoryToSession(holeRecords, gamePlayers) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (gamePlayers.length !== 4) return;
    if (holeRecords.length === 0) {
      sessionStorage.removeItem(HISTORY_KEY);
      return;
    }
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(sessionRoundHistoryPayload(holeRecords, gamePlayers)));
  } catch {
    /* ignore quota / privacy mode */
  }
}
