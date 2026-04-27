import { describe, expect, it } from "vitest";
import { buildHoleReceiptPreview } from "./holeReceiptPreview.js";

const players = [
  { id: "p-0", slotIndex: 0, name: "Alex" },
  { id: "p-1", slotIndex: 1, name: "Blake" },
  { id: "p-2", slotIndex: 2, name: "Casey" },
  { id: "p-3", slotIndex: 3, name: "Drew" },
];

describe("buildHoleReceiptPreview", () => {
  it("blind wolf win stamp", () => {
    const slip = buildHoleReceiptPreview(
      {
        holeNumber: 1,
        wolfPlayerId: "p-0",
        holeMode: "blind",
        partnerPlayerId: null,
        winningSide: "wolf_side",
        pointsAwardedByPlayerId: { "p-0": 3, "p-1": 0, "p-2": 0, "p-3": 0 },
        winningPlayerIds: ["p-0"],
        presses: [],
      },
      players,
    );
    expect(slip.stamp).toBe("BLIND WOLF CASHED");
    expect(slip.amountLabel).toBe("+3");
    expect(slip.portraitDisplayMode).toBe("winner");
  });

  it("push stamp", () => {
    const slip = buildHoleReceiptPreview(
      {
        holeNumber: 2,
        wolfPlayerId: "p-1",
        holeMode: "lone",
        partnerPlayerId: null,
        winningSide: "tie",
        pointsAwardedByPlayerId: { "p-0": 0, "p-1": 0, "p-2": 0, "p-3": 0 },
        winningPlayerIds: [],
        presses: [],
      },
      players,
    );
    expect(slip.stamp).toBe("PUSH — NO BLOOD");
    expect(slip.amountLabel).toBe("—");
  });
});
