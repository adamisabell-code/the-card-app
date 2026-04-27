import { describe, expect, it } from "vitest";
import { buildRecapShareCards, enrichFullRoundHistory } from "./roundRecap.js";
import { buildHoleQuickConfirm } from "./holeReceiptPreview.js";
import { computePointsAwarded, winningPlayerIdsForRecord } from "./scoring.js";

const IDS = ["p-0", "p-1", "p-2", "p-3"];
const players = [
  { id: "p-0", name: "A", slotIndex: 0 },
  { id: "p-1", name: "B", slotIndex: 1 },
  { id: "p-2", name: "C", slotIndex: 2 },
  { id: "p-3", name: "D", slotIndex: 3 },
];

function hole(partial) {
  const d = {
    holeNumber: 1,
    wolfPlayerId: "p-0",
    holeMode: "normal",
    partnerPlayerId: "p-1",
    winningSide: "tie",
    pointsAwardedByPlayerId: {},
    winningPlayerIds: [],
    holeOutcomeLabel: "",
    presses: [],
    ...partial,
  };
  d.pointsAwardedByPlayerId = computePointsAwarded(d, IDS);
  d.winningPlayerIds = winningPlayerIdsForRecord(d, IDS);
  return d;
}

describe("roundRecap", () => {
  it("enrichFullRoundHistory has stamp, flavor, involved", () => {
    const h = hole({ holeNumber: 2, holeMode: "blind", partnerPlayerId: null, winningSide: "wolf_side" });
    const [row] = enrichFullRoundHistory([h], players);
    expect(row.holeNumber).toBe(2);
    expect(row.mode).toBe("blind");
    expect(row.stamp).toBeTruthy();
    expect(row.flavor).toBeTruthy();
    expect(row.involvedPlayerIds).toEqual(IDS);
  });

  it("buildRecapShareCards returns four share blocks", () => {
    const holes = [
      hole({ holeNumber: 1, holeMode: "blind", partnerPlayerId: null, winningSide: "wolf_side" }),
    ];
    const { finalStandings, bestMoment, worstBeat, groupRecap } = buildRecapShareCards(holes, players, {});
    expect(finalStandings.stamp).toBe("FINAL STANDINGS");
    expect(bestMoment.stamp).toBe("BEST MOMENT");
    expect(worstBeat.stamp).toMatch(/WORST BEAT|COLD SEAT/);
    expect(groupRecap.stamp).toBe("GROUP RECAP");
  });

  it("buildHoleQuickConfirm is one short line for speed", () => {
    const q = buildHoleQuickConfirm(
      hole({ holeMode: "blind", partnerPlayerId: null, winningSide: "opponent_side" }),
      players,
    );
    expect(q.line1.length).toBeLessThan(40);
  });
});
