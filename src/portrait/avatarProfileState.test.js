import { beforeEach, describe, expect, it } from "vitest";
import {
  loadPlayerAvatarProfileState,
  upsertPlayerAvatarProfileState,
} from "./avatarProfileState.js";

describe("avatarProfileState", () => {
  beforeEach(() => {
    const mem = new Map();
    globalThis.localStorage = /** @type {any} */ ({
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
      clear: () => mem.clear(),
    });
    localStorage.clear();
  });

  it("creates required player avatar fields with stable paths", () => {
    const row = upsertPlayerAvatarProfileState("p-0", "pending");
    expect(row.profileImageUrl).toBe("players/p-0/profile_clean.webp");
    expect(row.avatarHappyUrl).toBe("players/p-0/avatar_happy.png");
    expect(row.avatarNeutralUrl).toBe("players/p-0/avatar_neutral.png");
    expect(row.avatarSadUrl).toBe("players/p-0/avatar_sad.png");
    expect(row.avatarStatus).toBe("pending");
    expect(typeof row.updatedAt).toBe("number");
  });

  it("updates status while keeping paths stable", () => {
    upsertPlayerAvatarProfileState("p-0", "pending");
    const ready = upsertPlayerAvatarProfileState("p-0", "ready");
    expect(ready.avatarStatus).toBe("ready");
    const loaded = loadPlayerAvatarProfileState("p-0");
    expect(loaded?.avatarHappyUrl).toBe("players/p-0/avatar_happy.png");
    expect(loaded?.avatarStatus).toBe("ready");
  });
});

