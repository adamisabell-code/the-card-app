import { describe, expect, it } from "vitest";
import {
  aggregateStrokeGrossTotals,
  buildStrokeHoleRecord,
  DEFAULT_STROKE_PAR,
  pickStrokeReceiptHeadline,
  rankStrokeGrossAscending,
  strokeVictoryMargin,
} from "./strokeScoring.js";

const IDS = ["p-0", "p-1", "p-2", "p-3"];
const players = [
  { id: "p-0", name: "A", slotIndex: 0 },
  { id: "p-1", name: "B", slotIndex: 1 },
  { id: "p-2", name: "C", slotIndex: 2 },
  { id: "p-3", name: "D", slotIndex: 3 },
];

describe("strokeScoring", () => {
  it("buildStrokeHoleRecord stores gross and par", () => {
    const h = buildStrokeHoleRecord(3, { "p-0": 4, "p-1": 5, "p-2": 3, "p-3": 6 }, DEFAULT_STROKE_PAR, IDS);
    expect(h.holeNumber).toBe(3);
    expect(h.strokePar).toBe(4);
    expect(h.strokeGrossByPlayerId?.["p-2"]).toBe(3);
    expect(h.winningSide).toBe("tie");
  });

  it("aggregateStrokeGrossTotals sums 18 holes", () => {
    const holes = [];
    for (let i = 1; i <= 18; i++) {
      holes.push(buildStrokeHoleRecord(i, { "p-0": 4, "p-1": 4, "p-2": 5, "p-3": 6 }, 4, IDS));
    }
    const t = aggregateStrokeGrossTotals(holes);
    expect(t["p-0"]).toBe(72);
    expect(t["p-3"]).toBe(108);
  });

  it("rankStrokeGrossAscending orders low to high", () => {
    const totals = { "p-0": 80, "p-1": 75, "p-2": 90, "p-3": 75 };
    const r = rankStrokeGrossAscending(players, totals);
    expect(r[0].id).toBe("p-1");
    expect(r[1].id).toBe("p-3");
    expect(r[0].gross).toBe(75);
  });

  it("strokeVictoryMargin uses next score above leader", () => {
    const totals = { "p-0": 72, "p-1": 75, "p-2": 76, "p-3": 80 };
    const r = rankStrokeGrossAscending(players, totals);
    expect(strokeVictoryMargin(r)).toBe(3);
  });

  it("strokeVictoryMargin is 0 when everyone ties", () => {
    const totals = { "p-0": 80, "p-1": 80, "p-2": 80, "p-3": 80 };
    const r = rankStrokeGrossAscending(players, totals);
    expect(strokeVictoryMargin(r)).toBe(0);
  });

  it("pickStrokeReceiptHeadline returns one of three lines", () => {
    const line = pickStrokeReceiptHeadline("p-0", 77);
    expect(
      [
        "LOWEST NUMBER. LOUDEST RECEIPT.",
        "SHOT 77. MADE THEM SIGN THE CARD.",
        "NO MATCHES. NO EXCUSES. JUST SCORE.",
      ].includes(line),
    ).toBe(true);
  });
});
