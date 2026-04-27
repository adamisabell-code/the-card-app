import { describe, expect, it } from "vitest";
import { classifyReceiptType } from "./receiptRules.js";
import type { ReceiptRoundResult } from "./receiptTypes.js";

const emptyBy = () => ({
  "p-0": { initiated: 0, won: 0, lost: 0, holesWithPress: 0 },
  "p-1": { initiated: 0, won: 0, lost: 0, holesWithPress: 0 },
  "p-2": { initiated: 0, won: 0, lost: 0, holesWithPress: 0 },
  "p-3": { initiated: 0, won: 0, lost: 0, holesWithPress: 0 },
});

describe("classifyReceiptType", () => {
  it("returns default when no holes", () => {
    const rr: ReceiptRoundResult = {
      holeCount: 0,
      gamePlayerIds: ["p-0", "p-1", "p-2", "p-3"],
      holeRecords: [],
      pressStats: { byPlayerId: emptyBy(), totalPresses: 0 },
    };
    expect(classifyReceiptType(rr, "p-0")).toBe("default");
  });

  it("returns press_merchant when hero leads initiations", () => {
    const by = emptyBy();
    by["p-0"] = { initiated: 2, won: 0, lost: 0, holesWithPress: 0 };
    const rr: ReceiptRoundResult = {
      holeCount: 2,
      gamePlayerIds: ["p-0", "p-1", "p-2", "p-3"],
      holeRecords: [
        {
          holeNumber: 1,
          wolfPlayerId: "p-0",
          partnerPlayerId: null,
          winningSide: "wolf_side",
          presses: [],
        },
      ],
      pressStats: { byPlayerId: by, totalPresses: 2 },
    };
    expect(classifyReceiptType(rr, "p-0")).toBe("press_merchant");
  });

  it("returns brutal_loss on heavy press losses", () => {
    const by = emptyBy();
    by["p-0"] = { initiated: 0, won: 0, lost: 3, holesWithPress: 3 };
    const rr: ReceiptRoundResult = {
      holeCount: 3,
      gamePlayerIds: ["p-0", "p-1", "p-2", "p-3"],
      holeRecords: [
        {
          holeNumber: 1,
          wolfPlayerId: "p-0",
          partnerPlayerId: null,
          winningSide: "wolf_side",
          presses: [],
        },
      ],
      pressStats: { byPlayerId: by, totalPresses: 3 },
    };
    expect(classifyReceiptType(rr, "p-0")).toBe("brutal_loss");
  });
});
