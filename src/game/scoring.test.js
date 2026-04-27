import { describe, expect, it } from "vitest";
import {
  aggregateWolfRoundStats,
  computePointsAwarded,
  nextDefaultWolfPlayerId,
  validateHoleRecord,
  winningPlayerIdsForRecord,
} from "./scoring.js";

const IDS = ["p-0", "p-1", "p-2", "p-3"];

/**
 * @param {Partial<import('./types.js').HoleRecord>} partial
 */
function record(partial) {
  /** @type {import('./types.js').HoleRecord} */
  const r = {
    holeNumber: 1,
    wolfPlayerId: "p-0",
    holeMode: "normal",
    partnerPlayerId: null,
    winningSide: "tie",
    pointsAwardedByPlayerId: {},
    winningPlayerIds: [],
    presses: [],
    ...partial,
  };
  r.pointsAwardedByPlayerId = computePointsAwarded(r, IDS);
  r.winningPlayerIds = winningPlayerIdsForRecord(r, IDS);
  return r;
}

describe("Wolf scoring points", () => {
  it("1. normal 2v2 wolf_side — Wolf and partner 1 pt each", () => {
    const r = record({
      holeMode: "normal",
      partnerPlayerId: "p-1",
      winningSide: "wolf_side",
    });
    expect(r.pointsAwardedByPlayerId).toEqual({ "p-0": 1, "p-1": 1, "p-2": 0, "p-3": 0 });
    expect(r.winningPlayerIds.sort()).toEqual(["p-0", "p-1"]);
    expect(validateHoleRecord(r, IDS)).toEqual([]);
  });

  it("2. normal 2v2 opponent_side — each hunter 1 pt", () => {
    const r = record({
      holeMode: "normal",
      partnerPlayerId: "p-1",
      winningSide: "opponent_side",
    });
    expect(r.pointsAwardedByPlayerId).toEqual({ "p-0": 0, "p-1": 0, "p-2": 1, "p-3": 1 });
    expect(r.winningPlayerIds.sort()).toEqual(["p-2", "p-3"]);
    expect(validateHoleRecord(r, IDS)).toEqual([]);
  });

  it("3. lone wolf_side — Wolf 2 pts", () => {
    const r = record({
      holeMode: "lone",
      partnerPlayerId: null,
      winningSide: "wolf_side",
    });
    expect(r.pointsAwardedByPlayerId).toEqual({ "p-0": 2, "p-1": 0, "p-2": 0, "p-3": 0 });
    expect(r.winningPlayerIds).toEqual(["p-0"]);
    expect(validateHoleRecord(r, IDS)).toEqual([]);
  });

  it("4. lone opponent_side — 1 pt each to other three", () => {
    const r = record({
      holeMode: "lone",
      partnerPlayerId: null,
      winningSide: "opponent_side",
    });
    expect(r.pointsAwardedByPlayerId).toEqual({ "p-0": 0, "p-1": 1, "p-2": 1, "p-3": 1 });
    expect(r.winningPlayerIds.sort()).toEqual(["p-1", "p-2", "p-3"]);
    expect(validateHoleRecord(r, IDS)).toEqual([]);
  });

  it("5. blind wolf_side — Wolf 3 pts", () => {
    const r = record({
      holeMode: "blind",
      partnerPlayerId: null,
      winningSide: "wolf_side",
    });
    expect(r.pointsAwardedByPlayerId).toEqual({ "p-0": 3, "p-1": 0, "p-2": 0, "p-3": 0 });
    expect(r.winningPlayerIds).toEqual(["p-0"]);
    expect(validateHoleRecord(r, IDS)).toEqual([]);
  });

  it("6. blind opponent_side — 1 pt each to field", () => {
    const r = record({
      holeMode: "blind",
      partnerPlayerId: null,
      winningSide: "opponent_side",
    });
    expect(r.pointsAwardedByPlayerId).toEqual({ "p-0": 0, "p-1": 1, "p-2": 1, "p-3": 1 });
    expect(validateHoleRecord(r, IDS)).toEqual([]);
  });

  it("7. tie in each mode — zero for everyone", () => {
    for (const holeMode of /** @type {const} */ (["normal", "lone", "blind"])) {
      const r = record({
        holeMode,
        partnerPlayerId: holeMode === "normal" ? "p-1" : null,
        winningSide: "tie",
      });
      expect(r.pointsAwardedByPlayerId).toEqual({ "p-0": 0, "p-1": 0, "p-2": 0, "p-3": 0 });
      expect(r.winningPlayerIds).toEqual([]);
      expect(validateHoleRecord(r, IDS)).toEqual([]);
    }
  });

  it("8. blind wolf path stores null partner (invariants)", () => {
    const r = record({
      holeMode: "blind",
      partnerPlayerId: null,
      winningSide: "wolf_side",
    });
    expect(r.partnerPlayerId).toBeNull();
    expect(validateHoleRecord(r, IDS)).toEqual([]);
  });

  it("9. lone and blind always null partnerPlayerId", () => {
    const badLone = record({
      holeMode: "lone",
      partnerPlayerId: "p-1",
      winningSide: "wolf_side",
    });
    expect(validateHoleRecord(badLone, IDS).length).toBeGreaterThan(0);

    const badBlind = record({
      holeMode: "blind",
      partnerPlayerId: "p-2",
      winningSide: "opponent_side",
    });
    expect(validateHoleRecord(badBlind, IDS).length).toBeGreaterThan(0);
  });

  it("normal without partner fails validation", () => {
    const bad = record({
      holeMode: "normal",
      partnerPlayerId: null,
      winningSide: "opponent_side",
    });
    expect(validateHoleRecord(bad, IDS).some((m) => m.includes("normal mode requires"))).toBe(true);
  });
});

const PLAYERS = IDS.map((id, i) => ({ id, slotIndex: i, name: `Player ${i}` }));

describe("nextDefaultWolfPlayerId", () => {
  it("rotates to the next seat after each hole", () => {
    expect(nextDefaultWolfPlayerId(null, PLAYERS)).toBe("p-0");
    const h0 = record({ holeNumber: 1, wolfPlayerId: "p-0", holeMode: "lone", winningSide: "wolf_side" });
    expect(nextDefaultWolfPlayerId(h0, PLAYERS)).toBe("p-1");
    const h1 = record({ holeNumber: 2, wolfPlayerId: "p-1", holeMode: "lone", winningSide: "opponent_side" });
    expect(nextDefaultWolfPlayerId(h1, PLAYERS)).toBe("p-2");
    const h3 = record({ holeNumber: 4, wolfPlayerId: "p-3", holeMode: "blind", winningSide: "tie" });
    expect(nextDefaultWolfPlayerId(h3, PLAYERS)).toBe("p-0");
  });
});

describe("aggregateWolfRoundStats", () => {
  it("counts blind attempts/wins and partner picks", () => {
    const holes = [
      record({ holeNumber: 1, holeMode: "blind", winningSide: "wolf_side" }),
      record({ holeNumber: 2, holeMode: "blind", winningSide: "opponent_side" }),
      record({
        holeNumber: 3,
        holeMode: "normal",
        partnerPlayerId: "p-1",
        winningSide: "wolf_side",
      }),
      record({ holeNumber: 4, holeMode: "lone", winningSide: "wolf_side" }),
    ];
    const s = aggregateWolfRoundStats(holes, IDS);
    expect(s.blindWolfAttempts).toBe(2);
    expect(s.blindWolfWins).toBe(1);
    expect(s.loneWolfAttempts).toBe(1);
    expect(s.loneWolfWins).toBe(1);
    expect(s.partnerSelections).toBe(1);
    expect(s.wolfPointsByPlayerId["p-0"]).toBe(3 + 0 + 1 + 2);
  });
});
