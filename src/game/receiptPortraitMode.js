/**
 * Pick which **cached** receipt portrait variant to show for a player after a round.
 * No image generation — only maps round signals → `winner` | `neutral` | `loser`.
 *
 * @param {import('./types.js').RoundResult | null | undefined} roundResult
 * @param {string} playerId
 * @returns {import('../portrait/types.js').PortraitMode | null} null → caller should use profile `preferredMode`
 */
export function portraitDisplayModeFromRoundResult(roundResult, playerId) {
  if (!roundResult?.holeCount) return null;
  const s = roundResult.pressStats?.byPlayerId?.[playerId];
  if (!s) return null;
  if (s.won >= 2 && s.won > s.lost) return "winner";
  if (s.lost >= 2 && s.lost > s.won) return "loser";
  return "neutral";
}
