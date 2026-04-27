import { describe, expect, it, vi } from "vitest";
import {
  buildWolfOrderAfterFirstPick,
  getAssignedWolfPlayerId,
  getTiedLowestWolfPointPlayerIds,
} from "./wolfRotation.js";
import { aggregateWolfRoundStats, computePointsAwarded, winningPlayerIdsForRecord } from "./scoring.js";

const IDS = ["p-0", "p-1", "p-2", "p-3"];

function hole(partial) {
  const d = {
    holeNumber: 1,
    wolfPlayerId: "p-0",
    holeMode: "normal",
    partnerPlayerId: "p-1",
    winningSide: "tie",
    pointsAwardedByPlayerId: {},
    winningPlayerIds: [],
    presses: [],
    ...partial,
  };
  d.pointsAwardedByPlayerId = computePointsAwarded(d, IDS);
  d.winningPlayerIds = winningPlayerIdsForRecord(d, IDS);
  return d;
}

describe("buildWolfOrderAfterFirstPick", () => {
  it("keeps first Wolf first and permutes the other three", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const order = buildWolfOrderAfterFirstPick("p-2", IDS);
    expect(order[0]).toBe("p-2");
    expect(new Set(order).size).toBe(4);
    expect(order.sort()).toEqual([...IDS].sort());
    vi.restoreAllMocks();
  });
});

describe("getTiedLowestWolfPointPlayerIds", () => {
  it("ties all players at zero when no holes played", () => {
    expect(getTiedLowestWolfPointPlayerIds([], IDS).sort()).toEqual([...IDS].sort());
  });

  it("matches aggregate minimum wolf points", () => {
    const records = [
      hole({ holeNumber: 1, wolfPlayerId: "p-0", winningSide: "wolf_side", holeMode: "lone", partnerPlayerId: null }),
    ];
    const stats = aggregateWolfRoundStats(records, IDS);
    const min = Math.min(...IDS.map((id) => stats.wolfPointsByPlayerId[id] ?? 0));
    const tied = getTiedLowestWolfPointPlayerIds(records, IDS);
    expect(tied.every((id) => (stats.wolfPointsByPlayerId[id] ?? 0) === min)).toBe(true);
  });
});

describe("getAssignedWolfPlayerId", () => {
  const order = ["p-0", "p-1", "p-2", "p-3"];

  it("rotates holes 1–16 with modulo 4", () => {
    expect(getAssignedWolfPlayerId({ holeNumber: 1, wolfOrder: order, holeRecords: [], allPlayerIds: IDS })).toBe("p-0");
    expect(getAssignedWolfPlayerId({ holeNumber: 2, wolfOrder: order, holeRecords: [], allPlayerIds: IDS })).toBe("p-1");
    expect(getAssignedWolfPlayerId({ holeNumber: 5, wolfOrder: order, holeRecords: [], allPlayerIds: IDS })).toBe("p-0");
    expect(getAssignedWolfPlayerId({ holeNumber: 16, wolfOrder: order, holeRecords: [], allPlayerIds: IDS })).toBe(
      "p-3",
    );
  });

  it("uses caller-resolved Wolf on hole 17", () => {
    const records = [
      hole({ holeNumber: 1, wolfPlayerId: "p-0", winningSide: "wolf_side", holeMode: "lone", partnerPlayerId: null }),
    ];
    const tied = getTiedLowestWolfPointPlayerIds(records, IDS);
    const resolved = tied.includes("p-2") ? "p-2" : tied[0];
    const w = getAssignedWolfPlayerId({
      holeNumber: 17,
      wolfOrder: order,
      holeRecords: records,
      allPlayerIds: IDS,
      resolvedLowWolfPlayerId: resolved,
    });
    expect(w).toBe(resolved);
  });
});
