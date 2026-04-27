import { describe, expect, it } from "vitest";
import { decodeSnapshotFromHash, encodeSnapshotForHash } from "./roundShareCodec.js";

const minimalPlayers = [
  { id: "p-0", name: "A", slotIndex: 0 },
  { id: "p-1", name: "B", slotIndex: 1 },
  { id: "p-2", name: "C", slotIndex: 2 },
  { id: "p-3", name: "D", slotIndex: 3 },
];

function minimalSnapshot() {
  return {
    v: 1,
    id: "00000000-0000-4000-8000-000000000001",
    courseName: "Test",
    selectedTee: "White",
    gamePlayers: minimalPlayers,
    holeRecords: [],
    currentHole: 1,
    roundStatus: "playing",
    wolfOrder: null,
    selectedWolfOverride: null,
    savedAt: 1_700_000_000_000,
  };
}

describe("roundShareCodec", () => {
  it("round-trips hash payload (server-off fallback path)", async () => {
    const snap = minimalSnapshot();
    const frag = await encodeSnapshotForHash(snap);
    const hash = `#${frag}`;
    const out = await decodeSnapshotFromHash(hash);
    expect(out).not.toBeNull();
    expect(out?.v).toBe(1);
    expect(out?.id).toBe(snap.id);
    expect(out?.gamePlayers).toHaveLength(4);
  });

  it("returns null for garbage hash", async () => {
    const out = await decodeSnapshotFromHash("#p=not-valid");
    expect(out).toBeNull();
  });
});
