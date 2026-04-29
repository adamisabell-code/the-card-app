import { describe, expect, it } from "vitest";
import { computeHolePayout, computeRoundPayout } from "./stakes.js";

const players = [
  { id: "p-0", name: "A", slotIndex: 0 },
  { id: "p-1", name: "B", slotIndex: 1 },
  { id: "p-2", name: "C", slotIndex: 2 },
  { id: "p-3", name: "D", slotIndex: 3 },
];

const cfg = {
  preset: 2,
  customValue: "",
  loneWolf2x: true,
  blindWolf3x: true,
  hideDollarAmounts: false,
};

describe("stakes payouts", () => {
  it("normal wolf side win splits base between teams", () => {
    const out = computeHolePayout(
      { holeMode: "normal", wolfPlayerId: "p-0", partnerPlayerId: "p-1", winningSide: "wolf_side" },
      players.map((p) => p.id),
      cfg,
    );
    expect(out["p-0"]).toBe(2);
    expect(out["p-1"]).toBe(2);
    expect(out["p-2"]).toBe(-2);
    expect(out["p-3"]).toBe(-2);
  });

  it("blind wolf win pays 3x vs each opponent", () => {
    const out = computeHolePayout(
      { holeMode: "blind", wolfPlayerId: "p-0", partnerPlayerId: null, winningSide: "wolf_side" },
      players.map((p) => p.id),
      cfg,
    );
    expect(out["p-0"]).toBe(18);
    expect(out["p-1"]).toBe(-6);
    expect(out["p-2"]).toBe(-6);
    expect(out["p-3"]).toBe(-6);
  });

  it("round payout accumulates per player", () => {
    const totals = computeRoundPayout(
      [
        { holeMode: "normal", wolfPlayerId: "p-0", partnerPlayerId: "p-1", winningSide: "wolf_side" },
        { holeMode: "lone", wolfPlayerId: "p-2", partnerPlayerId: null, winningSide: "opponent_side" },
      ],
      players,
      cfg,
    );
    expect(Object.values(totals).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

