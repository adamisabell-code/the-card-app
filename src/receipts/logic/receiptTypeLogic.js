/**
 * @param {{ money: number, wolfPoints: number, holesWon: number, blindWolfWins: number, loneWolfWins: number, pressInitiated: number, pressLost: number }} stats
 */
export function determineReceiptType(stats) {
  if (stats.holesWon >= 10 && stats.money > 0) return "MVP";
  if (stats.blindWolfWins >= 2) return "Wolf King";
  if (stats.loneWolfWins >= 2) return "Pressure King";
  if (stats.pressInitiated >= 3 && stats.money > 0) return "Press Merchant";
  if (stats.money <= -120 || stats.pressLost >= 3) return "Down Bad";
  if (stats.money < 0) return "Round Villain";
  if (stats.money >= 0) return "Winner";
  return "Ice Cold";
}
