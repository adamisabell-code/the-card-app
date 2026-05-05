/**
 * @param {{ money: number, receiptType: string }} input
 */
export function determineFaceMood(input) {
  if (input.receiptType === "MVP" || input.money > 0) return "winner";
  if (Math.abs(input.money) <= 5) return "neutral";
  return "loser";
}
