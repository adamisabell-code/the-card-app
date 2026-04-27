/**
 * In-round: ~1.2s toast only — not a full receipt, no share prompt.
 * @param {import('./types.js').HoleRecord} record
 * @param {import('./types.js').GamePlayer[]} players
 * @returns {{ line1: string, line2: string }}
 */
export function buildHoleQuickConfirm(record, players) {
  void players;
  if (record.winningSide === "tie") {
    return { line1: "Push. No blood.", line2: "" };
  }
  if (record.holeMode === "blind") {
    if (record.winningSide === "wolf_side") {
      return { line1: "Blind Wolf cashed.", line2: "+3" };
    }
    return { line1: "Wolf got hunted (Blind).", line2: "Field +1 each" };
  }
  if (record.holeMode === "lone") {
    if (record.winningSide === "wolf_side") {
      return { line1: "Lone Wolf cashed.", line2: "+2" };
    }
    return { line1: "Lone Wolf got run down.", line2: "Field +1 each" };
  }
  if (record.winningSide === "wolf_side") {
    return { line1: "Wolf team cashed.", line2: "+1 each" };
  }
  return { line1: "Wolf got hunted.", line2: "Field +1 each" };
}

/**
 * Recap + receipt copy — deterministic, no AI (optional flavor is separate for home card).
 * @param {import('./types.js').HoleRecord} record
 * @param {import('./types.js').GamePlayer[]} players
 * @returns {{
 *   playerName: string
 *   amountLabel: string
 *   stamp: string
 *   badges: string[]
 *   portraitDisplayMode: import('../portrait/types.js').PortraitMode
 *   aiFlavorText: string | null
 * }}
 */
export function buildHoleReceiptPreview(record, players) {
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const wolfName = names[record.wolfPlayerId] || "Wolf";
  const pts = record.pointsAwardedByPlayerId?.[record.wolfPlayerId] ?? 0;

  let amountLabel = "+0";
  if (record.winningSide === "tie") amountLabel = "—";
  else if (pts > 0) amountLabel = `+${pts}`;

  /** @type {import('../portrait/types.js').PortraitMode} */
  let portraitDisplayMode = "neutral";
  let stamp = "POSTED";
  /** @type {string | null} */
  let aiFlavorText = null;

  const modePill =
    record.holeMode === "blind" ? "Blind Wolf" : record.holeMode === "lone" ? "Lone Wolf" : "Normal Wolf";

  if (record.winningSide === "tie") {
    stamp = "PUSH — NO BLOOD";
    portraitDisplayMode = "neutral";
    aiFlavorText = "No blood on the card.";
  } else if (record.holeMode === "blind") {
    if (record.winningSide === "wolf_side") {
      stamp = "BLIND WOLF CASHED";
      portraitDisplayMode = "winner";
      aiFlavorText = "Went alone and made everyone watch.";
    } else {
      stamp = "THE GROUP GOT PAID";
      portraitDisplayMode = "loser";
      aiFlavorText = "Blind risk didn’t clear.";
    }
  } else if (record.holeMode === "lone") {
    if (record.winningSide === "wolf_side") {
      stamp = "LONE WOLF SURVIVED";
      portraitDisplayMode = "winner";
      aiFlavorText = "Solo bag — two on the board.";
    } else {
      stamp = "THE GROUP GOT PAID";
      portraitDisplayMode = "loser";
      aiFlavorText = "The field answered.";
    }
  } else {
    if (record.winningSide === "wolf_side") {
      stamp = "PARTNER PICK PAID";
      portraitDisplayMode = "winner";
      aiFlavorText = "Wolf side cashed the hole.";
    } else {
      stamp = "THE GROUP GOT PAID";
      portraitDisplayMode = "loser";
      aiFlavorText = "Hunters split the table.";
    }
  }

  const badges = [modePill, record.winningSide === "tie" ? "Push" : record.winningSide === "wolf_side" ? "Wolf side" : "Field"].filter(
    Boolean,
  );

  return {
    playerName: wolfName,
    amountLabel,
    stamp,
    badges,
    portraitDisplayMode,
    aiFlavorText,
  };
}

/**
 * One row in round history (end-of-round recap, optional session save).
 * @param {import('./types.js').HoleRecord} record
 * @param {import('./types.js').GamePlayer[]} players
 */
export function buildRoundHistoryEntry(record, players) {
  const preview = buildHoleReceiptPreview(record, players);
  return {
    holeNumber: record.holeNumber,
    mode: record.holeMode,
    winningSide: record.winningSide,
    pointsAwardedByPlayerId: { ...record.pointsAwardedByPlayerId },
    stamp: preview.stamp,
    flavor: preview.aiFlavorText,
    involvedPlayerIds: players.map((p) => p.id),
    wolfPlayerId: record.wolfPlayerId,
    partnerPlayerId: record.partnerPlayerId,
  };
}
