import { playerOnSide, pressAffectedPlayerIds } from "../src/game/scoring.js";
import type { ReceiptHoleRecord, ReceiptPressEvent, ReceiptRoundResult, ReceiptType } from "./receiptTypes.js";

function allPlayerIds(round: ReceiptRoundResult): string[] {
  return round.gamePlayerIds?.length ? round.gamePlayerIds : ["p-0", "p-1", "p-2", "p-3"];
}

/** Bridge to JS `scoring.js` typings (runtime fields are sufficient). */
function holeForScoring(h: ReceiptHoleRecord): import("../src/game/types.js").HoleRecord {
  return { ...h, holeMode: h.holeMode ?? "normal" } as unknown as import("../src/game/types.js").HoleRecord;
}

function pressForScoring(pr: ReceiptPressEvent): import("../src/game/types.js").PressEvent {
  return pr as unknown as import("../src/game/types.js").PressEvent;
}

export function heroPressOutcomeSequence(
  round: ReceiptRoundResult,
  heroPlayerId: string,
): ("W" | "L" | "T")[] {
  const ids = allPlayerIds(round);
  const holes = [...round.holeRecords].sort((a, b) => a.holeNumber - b.holeNumber);
  const out: ("W" | "L" | "T")[] = [];
  for (const h of holes) {
    for (const pr of h.presses ?? []) {
      if (!pressAffectedPlayerIds(pressForScoring(pr)).includes(heroPlayerId)) continue;
      if (pr.pressWinningSide === "tie") {
        out.push("T");
        continue;
      }
      const won = playerOnSide(holeForScoring(h), heroPlayerId, pr.pressWinningSide, ids);
      out.push(won ? "W" : "L");
    }
  }
  return out;
}

function pressMerchantPlayerId(round: ReceiptRoundResult): string | null {
  const { byPlayerId } = round.pressStats;
  let best: { id: string; initiated: number } | null = null;
  for (const [id, s] of Object.entries(byPlayerId)) {
    if (!best || s.initiated > best.initiated) best = { id, initiated: s.initiated };
  }
  return best && best.initiated >= 2 ? best.id : null;
}

function primaryRival(round: ReceiptRoundResult, heroPlayerId: string): string | null {
  const counts = new Map<string, number>();
  for (const h of round.holeRecords) {
    for (const pr of h.presses ?? []) {
      const aff = pressAffectedPlayerIds(pressForScoring(pr));
      if (!aff.includes(heroPlayerId)) continue;
      for (const p of aff) {
        if (p === heroPlayerId) continue;
        counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  return bestN >= 2 ? best : null;
}

function headToHeadPressNet(round: ReceiptRoundResult, hero: string, rival: string): number {
  const ids = allPlayerIds(round);
  let net = 0;
  for (const h of round.holeRecords) {
    for (const pr of h.presses ?? []) {
      const aff = new Set(pressAffectedPlayerIds(pressForScoring(pr)));
      if (!aff.has(hero) || !aff.has(rival)) continue;
      if (pr.pressWinningSide === "tie") continue;
      const heroWon = playerOnSide(holeForScoring(h), hero, pr.pressWinningSide, ids);
      net += heroWon ? 1 : -1;
    }
  }
  return net;
}

function stripT(seq: ("W" | "L" | "T")[]): ("W" | "L")[] {
  return seq.filter((x): x is "W" | "L" => x !== "T");
}

function hasComebackPattern(seq: ("W" | "L" | "T")[]): boolean {
  const noT = stripT(seq);
  if (noT.length < 4) return false;
  const half = Math.floor(noT.length / 2);
  const early = noT.slice(0, half);
  const earlyL = early.filter((x) => x === "L").length;
  const earlyW = early.filter((x) => x === "W").length;
  if (earlyL < 1 || earlyL <= earlyW) return false;
  const tail = noT.slice(-2);
  return tail[0] === "W" && tail[1] === "W";
}

function hasCollapsePattern(seq: ("W" | "L" | "T")[]): boolean {
  const noT = stripT(seq);
  if (noT.length < 4) return false;
  const half = Math.floor(noT.length / 2);
  const early = noT.slice(0, half);
  const earlyW = early.filter((x) => x === "W").length;
  const earlyL = early.filter((x) => x === "L").length;
  if (earlyW < 1 || earlyW <= earlyL) return false;
  const tail = noT.slice(-2);
  return tail[0] === "L" && tail[1] === "L";
}

/**
 * Deterministic classifier — single source of truth for `ReceiptType`.
 */
export function classifyReceiptType(round: ReceiptRoundResult, heroPlayerId: string): ReceiptType {
  if (!round.holeCount) return "default";

  const { totalPresses } = round.pressStats;
  const s = round.pressStats.byPlayerId[heroPlayerId];
  if (!s) return "default";

  if (totalPresses < 1) return "default";

  const seq = heroPressOutcomeSequence(round, heroPlayerId);
  const merchant = pressMerchantPlayerId(round);
  if (merchant === heroPlayerId) return "press_merchant";

  if (hasComebackPattern(seq)) return "comeback";
  if (hasCollapsePattern(seq)) return "collapse";

  const rival = primaryRival(round, heroPlayerId);
  if (rival) {
    const net = headToHeadPressNet(round, heroPlayerId, rival);
    if (net >= 2) return "rivalry_win";
    if (net <= -2) return "rivalry_loss";
  }

  if (s.lost === 0 && s.won >= 3) return "domination";
  if (s.lost === 0 && s.won >= 2) return "clean_sweep";
  if (s.lost >= 3 && s.won === 0) return "brutal_loss";
  if (s.won >= 2 && s.won > s.lost) return "domination";
  if (s.lost >= 2 && s.lost > s.won) return "brutal_loss";

  return "normal_result";
}
