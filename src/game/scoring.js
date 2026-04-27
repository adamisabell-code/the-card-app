import { SLOT_COUNT, SLOT_PLAYER_IDS } from "./types.js";

/**
 * @param {import('./types.js').GamePlayer[]} players
 * @returns {Record<string, string>}
 */
export function nameByPlayerId(players) {
  return Object.fromEntries(players.map((p) => [p.id, p.name]));
}

/**
 * Players on the Wolf side (Wolf + optional partner).
 * @param {import('./types.js').HoleRecord} hole
 * @param {string[]} allIds
 * @returns {string[]}
 */
export function wolfSidePlayerIds(hole) {
  if (hole.holeMode === "normal" && hole.partnerPlayerId) {
    return [hole.wolfPlayerId, hole.partnerPlayerId].filter(Boolean);
  }
  return [hole.wolfPlayerId];
}

/**
 * Hunters / field: everyone not on the Wolf side for this hole.
 * @param {import('./types.js').HoleRecord} hole
 * @param {string[]} allIds
 */
export function opponentSidePlayerIds(hole, allIds) {
  const wolfSide = new Set(wolfSidePlayerIds(hole));
  return allIds.filter((id) => !wolfSide.has(id));
}

/**
 * @param {import('./types.js').HoleRecord} record
 * @param {string[]} allPlayerIds
 * @returns {Record<string, number>}
 */
export function computePointsAwarded(record, allPlayerIds) {
  const { wolfPlayerId, partnerPlayerId, holeMode, winningSide } = record;
  const base = Object.fromEntries(allPlayerIds.map((id) => [id, 0]));
  if (winningSide === "tie") return { ...base };

  const hunters = allPlayerIds.filter((id) => id !== wolfPlayerId && id !== partnerPlayerId);

  if (holeMode === "normal") {
    if (winningSide === "wolf_side") {
      const pts = { ...base };
      pts[wolfPlayerId] = 1;
      if (partnerPlayerId) pts[partnerPlayerId] = 1;
      return pts;
    }
    const pts = { ...base };
    for (const id of hunters) pts[id] = 1;
    return pts;
  }

  if (holeMode === "lone") {
    if (winningSide === "wolf_side") {
      return { ...base, [wolfPlayerId]: 2 };
    }
    const pts = { ...base };
    for (const id of hunters) pts[id] = 1;
    return pts;
  }

  if (holeMode === "blind") {
    if (winningSide === "wolf_side") {
      return { ...base, [wolfPlayerId]: 3 };
    }
    const pts = { ...base };
    for (const id of hunters) pts[id] = 1;
    return pts;
  }

  return { ...base };
}

/**
 * @param {import('./types.js').HoleRecord} record
 * @param {string[]} allPlayerIds
 * @returns {string[]}
 */
export function winningPlayerIdsForRecord(record, allPlayerIds = [...SLOT_PLAYER_IDS]) {
  const pts = record.pointsAwardedByPlayerId ?? computePointsAwarded(record, allPlayerIds);
  return allPlayerIds.filter((id) => (pts[id] ?? 0) > 0);
}

/**
 * Side members for a hole (presses / receipts — not Elo).
 * @param {import('./types.js').HoleRecord} hole
 * @param {import('./types.js').HoleWinningSide} side
 * @param {string[]} allIds
 * @returns {string[]}
 */
export function sideMemberIds(hole, side, allIds) {
  if (side === "tie") return [];
  if (side === "wolf_side") return wolfSidePlayerIds(hole);
  return opponentSidePlayerIds(hole, allIds);
}

/**
 * @param {import('./types.js').HoleRecord} hole
 * @param {string} playerId
 * @param {import('./types.js').HoleWinningSide} side
 * @param {string[]} allIds
 */
export function playerOnSide(hole, playerId, side, allIds) {
  return sideMemberIds(hole, side, allIds).includes(playerId);
}

/**
 * @param {import('./types.js').PressEvent} press
 * @returns {string[]}
 */
export function pressAffectedPlayerIds(press) {
  return Array.from(new Set([press.initiatorPlayerId, ...press.counterpartyPlayerIds]));
}

/**
 * @param {import('./types.js').HoleRecord} record
 * @param {Record<string, string>} names
 */
export function buildHoleOutcomeLabel(record, names) {
  const wolf = names[record.wolfPlayerId] || "Wolf";
  if (record.winningSide === "tie") {
    if (record.holeMode === "blind") return `Blind Wolf — ${wolf}: halved, no points.`;
    if (record.holeMode === "lone") return `Lone Wolf — ${wolf}: halved, no points.`;
    return `Halved (no points).`;
  }

  const winners = winningPlayerIdsForRecord(record).map((id) => names[id] || id);

  if (record.holeMode === "blind") {
    if (record.winningSide === "wolf_side") return `Blind Wolf — ${wolf} took the hole (3 pts).`;
    return `Blind Wolf — Field took the hole vs ${wolf}.`;
  }
  if (record.holeMode === "lone") {
    if (record.winningSide === "wolf_side") return `${wolf} took the hole (Lone Wolf, 2 pts).`;
    return `Field took the hole vs ${wolf} (Lone Wolf).`;
  }
  if (record.winningSide === "wolf_side") {
    return `Wolf team took the hole (${winners.join(" + ")}).`;
  }
  return `Hunters took the hole (${winners.join(" + ")}).`;
}

/**
 * @param {import('./types.js').HoleRecord[]} records
 * @param {import('./types.js').GamePlayer[]} players
 * @returns {{ playerId: string, name: string, holesWon: number, slotIndex: number }[]}
 */
export function computeStandings(records, players) {
  const wins = Object.fromEntries(players.map((p) => [p.id, 0]));
  for (const r of records) {
    const ids = r.winningPlayerIds?.length
      ? r.winningPlayerIds
      : winningPlayerIdsForRecord(r, players.map((p) => p.id));
    for (const id of ids) {
      if (wins[id] !== undefined) wins[id] += 1;
    }
  }
  return players
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      slotIndex: p.slotIndex,
      holesWon: wins[p.id] ?? 0,
    }))
    .sort((a, b) => b.holesWon - a.holesWon || a.slotIndex - b.slotIndex);
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {string[]} allPlayerIds
 * @returns {import('./types.js').WolfRoundStats}
 */
export function aggregateWolfRoundStats(holeRecords, allPlayerIds) {
  const wolfPointsByPlayerId = Object.fromEntries(allPlayerIds.map((id) => [id, 0]));
  const holesWonByPlayerId = Object.fromEntries(allPlayerIds.map((id) => [id, 0]));

  let blindWolfAttempts = 0;
  let blindWolfWins = 0;
  let loneWolfAttempts = 0;
  let loneWolfWins = 0;
  let partnerSelections = 0;

  for (const h of holeRecords) {
    const pts = h.pointsAwardedByPlayerId ?? computePointsAwarded(h, allPlayerIds);
    for (const id of allPlayerIds) {
      const p = pts[id] ?? 0;
      wolfPointsByPlayerId[id] = (wolfPointsByPlayerId[id] ?? 0) + p;
      if (p > 0) holesWonByPlayerId[id] = (holesWonByPlayerId[id] ?? 0) + 1;
    }

    if (h.holeMode === "blind") {
      blindWolfAttempts += 1;
      if (h.winningSide === "wolf_side") blindWolfWins += 1;
    }
    if (h.holeMode === "lone") {
      loneWolfAttempts += 1;
      if (h.winningSide === "wolf_side") loneWolfWins += 1;
    }
    if (h.holeMode === "normal" && h.partnerPlayerId) partnerSelections += 1;
  }

  return {
    wolfPointsByPlayerId,
    holesWonByPlayerId,
    blindWolfAttempts,
    blindWolfWins,
    loneWolfAttempts,
    loneWolfWins,
    partnerSelections,
  };
}

/**
 * Asserts data rules for tests / invariants.
 * @param {import('./types.js').HoleRecord} h
 * @param {string[]} allPlayerIds
 * @returns {string[]} error messages (empty if valid)
 */
export function validateHoleRecord(h, allPlayerIds = [...SLOT_PLAYER_IDS]) {
  const err = [];
  if ((h.holeMode === "lone" || h.holeMode === "blind") && h.partnerPlayerId != null) {
    err.push("lone/blind must have null partnerPlayerId");
  }
  if (h.holeMode === "normal" && !h.partnerPlayerId) {
    err.push("normal mode requires a partner (use lone if no partner)");
  }
  const expected = computePointsAwarded(h, allPlayerIds);
  for (const id of allPlayerIds) {
    const got = h.pointsAwardedByPlayerId?.[id] ?? 0;
    const exp = expected[id] ?? 0;
    if (got !== exp) err.push(`points mismatch ${id}: got ${got} expected ${exp}`);
  }
  return err;
}

/**
 * Default wolf for the next hole: rotate from this hole's confirmed wolf.
 * @param {import('./types.js').HoleRecord | null} lastRecord
 * @param {import('./types.js').GamePlayer[]} players
 */
export function nextDefaultWolfPlayerId(lastRecord, players) {
  if (!lastRecord) return players[0]?.id ?? "p-0";
  const idx = players.findIndex((p) => p.id === lastRecord.wolfPlayerId);
  const base = idx >= 0 ? idx : 0;
  return players[(base + 1) % SLOT_COUNT]?.id ?? "p-0";
}
