/**
 * TypeScript surface for JSDoc-defined types in `types.js` (receipt engine imports).
 */
export type HoleWinningSide = "wolf_side" | "opponent_side" | "tie";

export type PressEvent = {
  id: string;
  initiatorPlayerId: string;
  counterpartyPlayerIds: string[];
  units: 1 | 2 | 3;
  backedSide: HoleWinningSide;
  pressWinningSide: HoleWinningSide;
};

export type HoleRecord = {
  holeNumber: number;
  wolfPlayerId: string;
  holeMode: "normal" | "lone" | "blind";
  partnerPlayerId: string | null;
  winningSide: HoleWinningSide;
  pointsAwardedByPlayerId: Record<string, number>;
  winningPlayerIds: string[];
  holeOutcomeLabel?: string;
  presses?: PressEvent[];
};
