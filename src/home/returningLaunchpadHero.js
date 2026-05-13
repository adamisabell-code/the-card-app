import { buildStakeCallouts } from "../game/stakes.js";
import { aggregateWolfRoundStats } from "../game/scoring.js";

/**
 * @param {string} amountLabel e.g. "+$120", "-$75", "+$—"
 * @returns {number | null} signed dollars, or null if money hidden / unparsable
 */
function parseSignedMoneyFromAmountLabel(amountLabel) {
  const s = String(amountLabel ?? "").trim();
  if (!s) return null;
  if (/[—–]/.test(s)) return null;
  const normalized = s.replace(/[^0-9.+-]/g, "");
  if (!normalized || normalized === "+" || normalized === "-") return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Emotional hero for returning-user launchpad (copy only — no scoring changes).
 *
 * @param {{
 *   snap: import('./homeReceipt.js').LastReceiptSnapshot
 *   lastRound: import('./completedRounds.js').StoredCompletedRound | null
 *   stakesConfig: import('../game/stakes.js').StakesConfig
 * }} p
 * @returns {{ headline: string, amountLine: string, subline: string, variant: 'win' | 'loss' | 'neutral' }}
 */
export function buildReturningLaunchpadHero({ snap, lastRound, stakesConfig }) {
  const amountLabel = snap?.amountLabel ?? "+$0";
  const money = parseSignedMoneyFromAmountLabel(amountLabel);
  const hasRound = Boolean(lastRound?.holeRecords?.length && lastRound?.players?.length === 4);
  const callouts =
    hasRound && stakesConfig
      ? buildStakeCallouts(lastRound.holeRecords, lastRound.players, stakesConfig)
      : [];

  const subFromData = callouts[0] ?? snap?.badges?.[0] ?? snap?.stamp ?? "";

  if (money === null && hasRound) {
    const ids = lastRound.players.map((p) => p.id);
    const stats = aggregateWolfRoundStats(lastRound.holeRecords, ids);
    const p0 = lastRound.players.find((p) => p.slotIndex === 0) ?? lastRound.players[0];
    const wpts = stats.wolfPointsByPlayerId[p0?.id] ?? 0;
    const headline =
      wpts > 0 ? "FIELD GOT SMOKED" : wpts < 0 ? "YOU GOT WORKED" : "DEAD HEAT";
    const amountLine = `${wpts > 0 ? "+" : ""}${wpts} WOLF PTS`;
    const variant = wpts > 0 ? "win" : wpts < 0 ? "loss" : "neutral";
    return { headline, amountLine, subline: subFromData || "Points only — money off the slip.", variant };
  }

  if (money === null) {
    return {
      headline: "ROUND LOGGED",
      amountLine: snap?.stamp ?? "POSTED",
      subline: subFromData || "Same crew? Run it back.",
      variant: "neutral",
    };
  }

  if (money > 0) {
    return {
      headline: "TOOK THEIR MONEY",
      amountLine: amountLabel,
      subline: subFromData || "Run it back.",
      variant: "win",
    };
  }

  if (money < 0) {
    return {
      headline: "YOU GOT CLIPPED",
      amountLine: amountLabel,
      subline: subFromData || "Settle it next round.",
      variant: "loss",
    };
  }

  return {
    headline: "DEAD HEAT",
    amountLine: amountLabel,
    subline: subFromData || "Run it back.",
    variant: "neutral",
  };
}
