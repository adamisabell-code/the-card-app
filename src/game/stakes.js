/**
 * Stakes setup and payout math for Wolf rounds.
 * Uses existing hole outcomes; no gameplay-side prompts during a hole.
 */

/**
 * @typedef {{
 *   preset: 1 | 2 | 5 | "custom"
 *   customValue: string
 *   loneWolf2x: boolean
 *   blindWolf3x: boolean
 *   hideDollarAmounts: boolean
 * }} StakesConfig
 */

/**
 * @param {StakesConfig} config
 */
export function resolveBaseStake(config) {
  if (config.preset !== "custom") return config.preset;
  const parsed = Number.parseFloat(config.customValue || "");
  if (!Number.isFinite(parsed) || parsed <= 0) return 2;
  return Math.min(999, Math.max(0.25, parsed));
}

/**
 * @param {import('./types.js').HoleRecord} hole
 * @param {string[]} allPlayerIds
 * @param {StakesConfig} config
 * @returns {Record<string, number>}
 */
export function computeHolePayout(hole, allPlayerIds, config) {
  const payout = Object.fromEntries(allPlayerIds.map((id) => [id, 0]));
  if (hole.winningSide === "tie") return payout;

  const base = resolveBaseStake(config);
  let perOpponent = base;
  if (hole.holeMode === "lone" && config.loneWolf2x) perOpponent = base * 2;
  if (hole.holeMode === "blind" && config.blindWolf3x) perOpponent = base * 3;

  const wolf = hole.wolfPlayerId;
  const wolfSide = new Set([wolf]);
  if (hole.holeMode === "normal" && hole.partnerPlayerId) wolfSide.add(hole.partnerPlayerId);
  const hunters = allPlayerIds.filter((id) => !wolfSide.has(id));
  const wolfTeam = Array.from(wolfSide);

  if (hole.holeMode === "normal") {
    if (hole.winningSide === "wolf_side") {
      for (const id of wolfTeam) payout[id] += perOpponent;
      for (const id of hunters) payout[id] -= perOpponent;
      return payout;
    }
    for (const id of wolfTeam) payout[id] -= perOpponent;
    for (const id of hunters) payout[id] += perOpponent;
    return payout;
  }

  // lone/blind => Wolf vs each opponent
  const total = perOpponent * hunters.length;
  if (hole.winningSide === "wolf_side") {
    payout[wolf] += total;
    for (const id of hunters) payout[id] -= perOpponent;
    return payout;
  }
  payout[wolf] -= total;
  for (const id of hunters) payout[id] += perOpponent;
  return payout;
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {import('./types.js').GamePlayer[]} gamePlayers
 * @param {StakesConfig} config
 */
export function computeRoundPayout(holeRecords, gamePlayers, config) {
  const ids = gamePlayers.map((p) => p.id);
  const totals = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const h of holeRecords) {
    const onHole = computeHolePayout(h, ids, config);
    for (const id of ids) totals[id] += onHole[id] ?? 0;
  }
  return totals;
}

/**
 * @param {number} amount
 */
export function formatStakeAmount(amount) {
  const abs = Math.abs(amount);
  const core = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.00$/, "");
  return `${amount >= 0 ? "+" : "-"}$${core}`;
}

/**
 * @param {import('./types.js').HoleRecord[]} holeRecords
 * @param {import('./types.js').GamePlayer[]} players
 * @param {StakesConfig} config
 * @returns {string[]}
 */
export function buildStakeCallouts(holeRecords, players, config) {
  if (!holeRecords.length || !players.length) return [];
  const ids = players.map((p) => p.id);
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));

  let biggest = { playerId: ids[0], amount: 0, hole: 1 };
  for (const h of holeRecords) {
    const by = computeHolePayout(h, ids, config);
    for (const id of ids) {
      const v = by[id] ?? 0;
      if (v > biggest.amount) biggest = { playerId: id, amount: v, hole: h.holeNumber };
    }
  }

  const failedLoneOrBlind = [...holeRecords]
    .reverse()
    .find((h) => (h.holeMode === "lone" || h.holeMode === "blind") && h.winningSide === "opponent_side");

  const callouts = [];
  if (biggest.amount > 0) {
    callouts.push(`Biggest bag: ${names[biggest.playerId] ?? "Player"} ${formatStakeAmount(biggest.amount)} on H${biggest.hole}`);
  }
  if (failedLoneOrBlind) {
    const label = failedLoneOrBlind.holeMode === "blind" ? "Blind Wolf" : "Lone Wolf";
    callouts.push(`${label} failed: ${names[failedLoneOrBlind.wolfPlayerId] ?? "Wolf"} got clipped on H${failedLoneOrBlind.holeNumber}`);
  }
  return callouts.slice(0, 2);
}

