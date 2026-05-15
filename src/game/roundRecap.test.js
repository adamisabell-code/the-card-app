import { describe, expect, it } from "vitest";
import { buildRecapShareCards, enrichFullRoundHistory } from "./roundRecap.js";
import { buildHoleQuickConfirm } from "./holeReceiptPreview.js";
import { computePointsAwarded, winningPlayerIdsForRecord } from "./scoring.js";
import { buildStrokeHoleRecord } from "./strokeScoring.js";

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

  it("maps winner/neutral/loser modes at round end", () => {
    const holes = [hole({ holeNumber: 1, holeMode: "normal", winningSide: "wolf_side", wolfPlayerId: "p-0" })];
    const { finalStandings, worstBeat, groupRecap } = buildRecapShareCards(holes, players, {});
    expect(finalStandings.portraitDisplayMode).toBe("winner");
    expect(worstBeat.portraitDisplayMode).toBe("loser");
    expect(groupRecap.portraitDisplayMode).toBe("neutral");
  });

  it("does not trigger network/AI work when building end-of-round receipts", () => {
    const prevFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error("Should not fetch during recap");
    };
    try {
      const holes = [hole({ holeNumber: 1, holeMode: "blind", partnerPlayerId: null, winningSide: "wolf_side" })];
      const cards = buildRecapShareCards(holes, players, {});
      expect(cards.finalStandings.stamp).toBe("FINAL STANDINGS");
      expect(calls).toBe(0);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it("still renders recap when avatar bundles are missing", () => {
    const holes = [hole({ holeNumber: 1, holeMode: "normal", winningSide: "opponent_side" })];
    const cards = buildRecapShareCards(holes, players, { "p-0": null });
    expect(cards.finalStandings).toBeTruthy();
    expect(cards.worstBeat).toBeTruthy();
    expect(cards.groupRecap).toBeTruthy();
  });

  it("buildHoleQuickConfirm is one short line for speed", () => {
    const q = buildHoleQuickConfirm(
      hole({ holeMode: "blind", partnerPlayerId: null, winningSide: "opponent_side" }),
      players,
    );
    expect(q.line1.length).toBeLessThan(40);
  });

  it("buildRecapShareCards stroke recap uses gross totals", () => {
    const strokeHoles = [];
    for (let i = 1; i <= 18; i++) {
      strokeHoles.push(buildStrokeHoleRecord(i, { "p-0": 5, "p-1": 4, "p-2": 5, "p-3": 6 }, 4, IDS));
    }
    const { finalStandings, groupRecap } = buildRecapShareCards(strokeHoles, players, {}, undefined, "stroke");
    expect(finalStandings.stamp).toBe("FINAL STANDINGS");
    expect(finalStandings.playerName).toContain("B");
    expect(finalStandings.playerName).toContain("72");
    expect(groupRecap.badges[0]).toBe("FORMAT: STROKE PLAY");
  });

  it("stroke group recap does not label a co-leader as runner-up", () => {
    const strokeHoles = [];
    for (let i = 1; i <= 18; i++) {
      strokeHoles.push(buildStrokeHoleRecord(i, { "p-0": 4, "p-1": 4, "p-2": 5, "p-3": 6 }, 4, IDS));
    }
    const { groupRecap } = buildRecapShareCards(strokeHoles, players, {}, undefined, "stroke");
    expect(groupRecap.badges.some((b) => b === "Runner-up · C (90)")).toBe(true);
    expect(groupRecap.badges.some((b) => b.includes("Runner-up · B"))).toBe(false);
  });

  it("stroke group recap when all tied gross shows no runner-up line", () => {
    const strokeHoles = [];
    for (let i = 1; i <= 18; i++) {
      strokeHoles.push(buildStrokeHoleRecord(i, { "p-0": 5, "p-1": 5, "p-2": 5, "p-3": 5 }, 4, IDS));
    }
    const { groupRecap } = buildRecapShareCards(strokeHoles, players, {}, undefined, "stroke");
    expect(groupRecap.badges.some((b) => b.includes("No runner-up"))).toBe(true);
  });

  it("stroke group recap uses Next when two players tie for second place gross", () => {
    const strokeHoles = [];
    for (let i = 1; i <= 18; i++) {
      strokeHoles.push(buildStrokeHoleRecord(i, { "p-0": 4, "p-1": 5, "p-2": 5, "p-3": 7 }, 4, IDS));
    }
    const { groupRecap } = buildRecapShareCards(strokeHoles, players, {}, undefined, "stroke");
    expect(groupRecap.badges.some((b) => b === "Next · B · C (90)")).toBe(true);
  });
});
