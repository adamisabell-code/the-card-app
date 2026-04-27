/**
 * Deterministic receipt archetypes — chosen only by `receiptRules.ts`, never by the LLM.
 */
export type ReceiptType =
  | "domination"
  | "rivalry_win"
  | "comeback"
  | "clean_sweep"
  | "press_merchant"
  | "default"
  | "normal_result"
  | "brutal_loss"
  | "collapse"
  | "rivalry_loss";

/** Shared round snapshot shape (matches app `RoundResult` fields we read). */
export type ReceiptRoundResult = {
  holeCount: number;
  gamePlayerIds: string[];
  holeRecords: ReceiptHoleRecord[];
  pressStats: {
    byPlayerId: Record<string, { initiated: number; won: number; lost: number; holesWithPress: number }>;
    totalPresses: number;
  };
};

export type HoleWinningSide = "wolf_side" | "opponent_side" | "tie";

export type ReceiptHoleRecord = {
  holeNumber: number;
  wolfPlayerId: string;
  partnerPlayerId: string | null;
  /** Defaults to `normal` when omitted (receipt classification only). */
  holeMode?: "normal" | "lone" | "blind";
  winningSide: HoleWinningSide;
  presses?: ReceiptPressEvent[];
};

export type ReceiptPressEvent = {
  initiatorPlayerId: string;
  counterpartyPlayerIds: string[];
  pressWinningSide: HoleWinningSide;
};
